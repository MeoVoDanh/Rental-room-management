export enum UserRole {
  LANDLORD = 'landlord',
  TENANT = 'tenant',
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  assignedRoomId?: string; // chỉ tenant mới có
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}
