export enum AlertSeverity {
  CRITICAL = 'critical',
  WARNING = 'warning',
  INFO = 'info',
}

export enum AlertType {
  GAS_LEAK = 'gas_leak',
  HIGH_TEMPERATURE = 'high_temperature',
  DOOR_OPEN_TOO_LONG = 'door_open_too_long',
  DOOR_FORCED = 'door_forced',
  NODE_OFFLINE = 'node_offline',
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

export interface Alert {
  id: string;
  roomId: string;
  roomName: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  data: Record<string, unknown>;
  createdAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}
