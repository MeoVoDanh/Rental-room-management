export enum DeviceType {
  LIGHT = 'light',
  DOOR_LOCK = 'door_lock',
  BUZZER = 'buzzer',
}

export enum DeviceStatus {
  ON = 'on',
  OFF = 'off',
  UNKNOWN = 'unknown',
}

export interface Device {
  id: string;
  type: DeviceType;
  name: string;
  status: DeviceStatus;
  lastUpdated: string;
}

export interface RoomState {
  doorOpen: boolean;
  lockOpen: boolean;
  lightOn: boolean;
  buzzerOn: boolean;
  nodeOnline: boolean;
}

export interface Room {
  id: string;
  name: string;        // "Phòng 101"
  roomNumber: string;   // "101"
  landlordId: string;
  tenantId?: string;
  tenantName?: string;
  state: RoomState;
  devices: Device[];
  lastActivity: string;
}
