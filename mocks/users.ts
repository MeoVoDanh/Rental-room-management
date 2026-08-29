import { User, UserRole } from '@/types';

export const MOCK_USERS: User[] = [
  {
    id: 'user-landlord-001',
    email: 'chutro@smartroom.vn',
    fullName: 'Nguyễn Văn An',
    phone: '0901234567',
    role: UserRole.LANDLORD,
  },
  {
    id: 'user-tenant-101',
    email: 'tenant101@smartroom.vn',
    fullName: 'Trần Thị Bình',
    phone: '0912345678',
    role: UserRole.TENANT,
    assignedRoomId: 'room-101',
  },
  {
    id: 'user-tenant-102',
    email: 'tenant102@smartroom.vn',
    fullName: 'Lê Hoàng Cường',
    phone: '0923456789',
    role: UserRole.TENANT,
    assignedRoomId: 'room-102',
  },
];

export const MOCK_LANDLORD = MOCK_USERS[0];
export const MOCK_TENANT_101 = MOCK_USERS[1];
export const MOCK_TENANT_102 = MOCK_USERS[2];
