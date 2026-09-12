import { useState, useEffect, useRef } from 'react';
import {
  getLatestSensorReading,
  getSensorHistory,
  subscribeToSensorReadings,
} from '@/services/sensorService';
import { SensorReading, TelemetrySnapshot } from '@/types';

export function useSensor(roomId: string | undefined) {
  const [telemetry, setTelemetry] = useState<TelemetrySnapshot | null>(null);
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!roomId) {
      setIsLoading(false);
      return;
    }

    // Fetch lần đầu
    Promise.all([
      getLatestSensorReading(roomId),
      getSensorHistory(roomId),
    ]).then(([latest, hist]) => {
      setTelemetry(latest);
      setHistory(hist);
      setIsLoading(false);
    });

    // Subscribe realtime
    unsubRef.current = subscribeToSensorReadings(roomId, (newReading) => {
      setTelemetry(newReading);
      setHistory((prev) => {
        const updated = [
          ...prev,
          {
            id: Date.now().toString(),
            roomId: newReading.roomId,
            temperature: newReading.temperature,
            humidity: newReading.humidity,
            gasRaw: newReading.gasRaw,
            timestamp: newReading.timestamp,
          },
        ];
        return updated.slice(-288); // Giữ tối đa 288 bản ghi trong cửa sổ 24 giờ
      });
    });

    // Polling dự phòng nếu Supabase Realtime chưa bật cho sensor_readings.
    const interval = setInterval(async () => {
      const [latest, hist] = await Promise.all([
        getLatestSensorReading(roomId),
        getSensorHistory(roomId),
      ]);
      setTelemetry(latest);
      setHistory(hist);
    }, 15_000);

    return () => {
      clearInterval(interval);
      unsubRef.current?.();
    };
  }, [roomId]);

  return { telemetry, history, isLoading };
}
