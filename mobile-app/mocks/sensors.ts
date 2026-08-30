import { SensorReading, TelemetrySnapshot } from '@/types';

// Generate 24h of sensor data (1 reading per hour)
function generateSensorHistory(roomId: string, baseTemp: number, baseHumidity: number, baseGas: number): SensorReading[] {
  const readings: SensorReading[] = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    readings.push({
      id: `sr-${roomId}-${i}`,
      roomId,
      temperature: +(baseTemp + (Math.random() * 4 - 2)).toFixed(1),
      humidity: +(baseHumidity + (Math.random() * 10 - 5)).toFixed(1),
      gasRaw: Math.round(baseGas + (Math.random() * 100 - 50)),
      timestamp: time.toISOString(),
    });
  }
  return readings;
}

export const MOCK_SENSOR_HISTORY_101 = generateSensorHistory('room-101', 28, 65, 250);
export const MOCK_SENSOR_HISTORY_102 = generateSensorHistory('room-102', 27, 60, 200);

export const MOCK_TELEMETRY: Record<string, TelemetrySnapshot> = {
  'room-101': {
    roomId: 'room-101',
    temperature: 29.2,
    humidity: 67,
    gasRaw: 280,
    gasThreshold: 700,
    isGasDanger: false,
    timestamp: '2026-08-29T10:35:00+07:00',
  },
  'room-102': {
    roomId: 'room-102',
    temperature: 26.8,
    humidity: 58,
    gasRaw: 190,
    gasThreshold: 700,
    isGasDanger: false,
    timestamp: '2026-08-29T10:35:00+07:00',
  },
};

export function getSensorHistory(roomId: string): SensorReading[] {
  if (roomId === 'room-101') return MOCK_SENSOR_HISTORY_101;
  if (roomId === 'room-102') return MOCK_SENSOR_HISTORY_102;
  return [];
}
