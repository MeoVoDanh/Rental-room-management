import { ControlCommand, CommandType, CommandStatus } from '@/types';

export interface AccessEvent {
  id: string;
  roomId: string;
  roomName: string;
  method: 'rfid' | 'pin';
  result: 'granted' | 'denied';
  userName: string;
  timestamp: string;
}

export const MOCK_ACCESS_EVENTS: AccessEvent[] = [
  {
    id: 'acc-001',
    roomId: 'room-101',
    roomName: 'Phòng 101',
    method: 'rfid',
    result: 'granted',
    userName: 'Trần Thị Bình',
    timestamp: '2026-08-29T10:25:00+07:00',
  },
  {
    id: 'acc-002',
    roomId: 'room-101',
    roomName: 'Phòng 101',
    method: 'pin',
    result: 'denied',
    userName: 'Unknown',
    timestamp: '2026-08-29T09:50:00+07:00',
  },
  {
    id: 'acc-003',
    roomId: 'room-102',
    roomName: 'Phòng 102',
    method: 'rfid',
    result: 'granted',
    userName: 'Lê Hoàng Cường',
    timestamp: '2026-08-29T08:30:00+07:00',
  },
  {
    id: 'acc-004',
    roomId: 'room-101',
    roomName: 'Phòng 101',
    method: 'rfid',
    result: 'granted',
    userName: 'Trần Thị Bình',
    timestamp: '2026-08-28T22:00:00+07:00',
  },
  {
    id: 'acc-005',
    roomId: 'room-102',
    roomName: 'Phòng 102',
    method: 'pin',
    result: 'granted',
    userName: 'Lê Hoàng Cường',
    timestamp: '2026-08-28T18:15:00+07:00',
  },
];

export const MOCK_COMMANDS: ControlCommand[] = [
  {
    id: 'cmd-001',
    roomId: 'room-101',
    commandType: CommandType.TOGGLE_LIGHT,
    status: CommandStatus.COMPLETED,
    issuedBy: 'user-tenant-101',
    issuedByName: 'Trần Thị Bình',
    targetDevice: 'dev-101-light',
    payload: { action: 'on' },
    createdAt: '2026-08-29T10:30:00+07:00',
    completedAt: '2026-08-29T10:30:02+07:00',
  },

  {
    id: 'cmd-003',
    roomId: 'room-102',
    commandType: CommandType.LOCK_DOOR,
    status: CommandStatus.COMPLETED,
    issuedBy: 'user-landlord-001',
    issuedByName: 'Nguyễn Văn An',
    targetDevice: 'dev-102-lock',
    payload: { action: 'lock' },
    createdAt: '2026-08-29T09:00:00+07:00',
    completedAt: '2026-08-29T09:00:03+07:00',
  },
  {
    id: 'cmd-004',
    roomId: 'room-101',
    commandType: CommandType.TOGGLE_LIGHT,
    status: CommandStatus.FAILED,
    issuedBy: 'user-landlord-001',
    issuedByName: 'Nguyễn Văn An',
    targetDevice: 'dev-101-light',
    payload: { action: 'off' },
    createdAt: '2026-08-28T23:00:00+07:00',
  },
];
