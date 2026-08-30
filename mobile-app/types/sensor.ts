export interface SensorReading {
  id: string;
  roomId: string;
  temperature: number;   // °C
  humidity: number;      // %
  gasRaw: number;        // analog value
  timestamp: string;
}

export interface TelemetrySnapshot {
  roomId: string;
  temperature: number;
  humidity: number;
  gasRaw: number;
  gasThreshold: number;
  isGasDanger: boolean;
  timestamp: string;
}
