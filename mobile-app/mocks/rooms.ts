import { Room, DeviceType, DeviceStatus } from '@/types';

export const MOCK_ROOMS: Room[] = [
  {
    id: 'room-101',
    name: 'Phòng 101',
    roomNumber: '101',
    landlordId: 'user-landlord-001',
    tenantId: 'user-tenant-101',
    tenantName: 'Trần Thị Bình',
    state: {
      doorOpen: false,
      lockOpen: false,
      lightOn: true,
      buzzerOn: false,
      nodeOnline: true,
    },
    devices: [
      {
        id: 'dev-101-light',
        type: DeviceType.LIGHT,
        name: 'Đèn phòng 101',
        status: DeviceStatus.ON,
        lastUpdated: '2026-08-29T10:30:00+07:00',
      },

      {
        id: 'dev-101-lock',
        type: DeviceType.DOOR_LOCK,
        name: 'Khóa cửa phòng 101',
        status: DeviceStatus.OFF,
        lastUpdated: '2026-08-29T10:25:00+07:00',
      },
      {
        id: 'dev-101-buzzer',
        type: DeviceType.BUZZER,
        name: 'Còi phòng 101',
        status: DeviceStatus.OFF,
        lastUpdated: '2026-08-29T10:00:00+07:00',
      },
    ],
    lastActivity: '2026-08-29T10:30:00+07:00',
  },
  {
    id: 'room-102',
    name: 'Phòng 102',
    roomNumber: '102',
    landlordId: 'user-landlord-001',
    tenantId: 'user-tenant-102',
    tenantName: 'Lê Hoàng Cường',
    state: {
      doorOpen: false,
      lockOpen: false,
      lightOn: false,
      buzzerOn: false,
      nodeOnline: true,
    },
    devices: [
      {
        id: 'dev-102-light',
        type: DeviceType.LIGHT,
        name: 'Đèn phòng 102',
        status: DeviceStatus.OFF,
        lastUpdated: '2026-08-29T09:15:00+07:00',
      },

      {
        id: 'dev-102-lock',
        type: DeviceType.DOOR_LOCK,
        name: 'Khóa cửa phòng 102',
        status: DeviceStatus.OFF,
        lastUpdated: '2026-08-29T09:00:00+07:00',
      },
      {
        id: 'dev-102-buzzer',
        type: DeviceType.BUZZER,
        name: 'Còi phòng 102',
        status: DeviceStatus.OFF,
        lastUpdated: '2026-08-29T09:00:00+07:00',
      },
    ],
    lastActivity: '2026-08-29T09:15:00+07:00',
  },
];
