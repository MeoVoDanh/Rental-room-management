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
      getSensorHistory(roomId, 20),
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
        return updated.slice(-20); // Giữ tối đa 20 bản ghi
      });
    });

    return () => {
      unsubRef.current?.();
    };
  }, [roomId]);

  return { telemetry, history, isLoading };
}
