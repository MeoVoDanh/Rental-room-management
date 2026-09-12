import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types';

export interface TenantItem {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  assignedRoomId?: string;
  assignedRoomIds: string[];
  createdAt: string;
}

/**
 * Lấy danh sách tất cả người thuê trong hệ thống
 */
const API_URL = (process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');

async function tenantApi(path: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `Backend trả về HTTP ${response.status}`);
  return body;
}

export async function getTenants(landlordId: string): Promise<TenantItem[]> {
  const body = await tenantApi(`/api/tenants?actor_id=${encodeURIComponent(landlordId)}`);
  return (body.tenants ?? []).map((tenant: any) => {
    const assignedRoomIds = tenant.assigned_room_ids?.length
      ? tenant.assigned_room_ids.map(String)
      : tenant.assigned_room_id ? [String(tenant.assigned_room_id)] : [];
    return {
      id: String(tenant.id),
      fullName: tenant.full_name ?? 'Chưa đặt tên',
      phone: tenant.phone ?? '',
      email: tenant.email ?? '',
      assignedRoomId: assignedRoomIds[0],
      assignedRoomIds,
      createdAt: tenant.created_at,
    };
  });
}

/**
 * Chỉ tạo tài khoản Người thuê (tách biệt, không cần chọn phòng)
 */
export async function createTenantOnly(params: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  landlordId: string;
}): Promise<{ tenantId: string }> {
  const { createClient } = await import('@supabase/supabase-js');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  // Dùng client tạm thời để không ghi đè session của Chủ trọ đang đăng nhập
  const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // 1. Tạo user trong Auth
  const { data: authData, error: authError } = await tempAuthClient.auth.signUp({
    email: params.email.trim(),
    password: params.password,
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      throw new Error('Email này đã được sử dụng cho một tài khoản khác.');
    }
    throw new Error(`Lỗi tạo tài khoản: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error('Không tạo được tài khoản xác thực cho người thuê.');
  }

  const tenantId = authData.user.id;

  // 2. Lưu thông tin hồ sơ vào bảng profiles
  const { error: profileError } = await supabase.from('profiles').insert({
    id: tenantId,
    full_name: params.fullName.trim(),
    phone: params.phone.trim(),
    role: UserRole.TENANT,
    landlord_id: params.landlordId,
    email: params.email.trim().toLowerCase(),
  });

  if (profileError) {
    throw new Error(`Lỗi tạo hồ sơ người thuê: ${profileError.message}`);
  }

  return { tenantId };
}

export async function updateTenant(params: { actorId: string; tenantId: string; fullName: string; phone: string; email: string }): Promise<void> {
  await tenantApi(`/api/tenants/${encodeURIComponent(params.tenantId)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: params.actorId, full_name: params.fullName, phone: params.phone, email: params.email }),
  });
}

export async function deleteTenant(actorId: string, tenantId: string): Promise<void> {
  await tenantApi(`/api/tenants/${encodeURIComponent(tenantId)}?actor_id=${encodeURIComponent(actorId)}`, { method: 'DELETE' });
}

/**
 * Gán người thuê đã có sẵn vào phòng
 */
export async function assignTenantToRoom(
  roomId: string,
  tenantId: string,
  landlordId: string
): Promise<void> {
  await tenantApi(`/api/rooms/${encodeURIComponent(roomId)}/tenant`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: landlordId, tenant_id: tenantId }),
  });
}

/**
 * Gỡ người thuê khỏi phòng (khi trả phòng)
 */
export async function removeTenantFromRoom(roomId: string, landlordId: string): Promise<void> {
  await tenantApi(`/api/rooms/${encodeURIComponent(roomId)}/tenant`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: landlordId, action: 'remove' }),
  });
}
