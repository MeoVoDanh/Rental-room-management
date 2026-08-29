export enum CommandType {
  TOGGLE_LIGHT = 'toggle_light',
  LOCK_DOOR = 'lock_door',
  UNLOCK_DOOR = 'unlock_door',
}

export enum CommandStatus {
  PENDING = 'pending',
  SENT = 'sent',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMEOUT = 'timeout',
}

export interface ControlCommand {
  id: string;
  roomId: string;
  commandType: CommandType;
  status: CommandStatus;
  issuedBy: string;
  issuedByName: string;
  targetDevice: string;
  payload: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
}
