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
  /** Phòng đang được chọn trên giao diện người thuê. */
  assignedRoomId?: string;
  /** Toàn bộ phòng mà tài khoản người thuê đang thuê. */
  assignedRoomIds?: string[];
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}
