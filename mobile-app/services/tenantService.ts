import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types';

export interface TenantItem {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  assignedRoomId?: string;
  createdAt: string;
}

/**
 * Lấy danh sách tất cả người thuê trong hệ thống
 */
export async function getTenants(): Promise<TenantItem[]> {
  // 1. Lấy tất cả profiles có role = tenant
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', UserRole.TENANT)
    .order('created_at', { ascending: false });

  if (profileError) throw profileError;
  if (!profiles) return [];

  // 2. Lấy thông tin phòng đang thuê từ bảng rooms
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, tenant_id')
    .not('tenant_id', 'is', null);

  const roomMap: Record<string, string> = {};
  rooms?.forEach((r) => {
    if (r.tenant_id) {
      roomMap[r.tenant_id] = r.id;
    }
  });

  return profiles.map((p) => ({
    id: p.id,
    fullName: p.full_name ?? 'Chưa đặt tên',
    phone: p.phone ?? '',
    assignedRoomId: roomMap[p.id],
    createdAt: p.created_at,
  }));
}

/**
 * Chỉ tạo tài khoản Người thuê (tách biệt, không cần chọn phòng)
 */
export async function createTenantOnly(params: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
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
  });

  if (profileError) {
    throw new Error(`Lỗi tạo hồ sơ người thuê: ${profileError.message}`);
  }

  return { tenantId };
}

/**
 * Gán người thuê đã có sẵn vào phòng
 */
export async function assignTenantToRoom(
  roomId: string,
  tenantId: string,
  landlordId?: string
): Promise<void> {
  const payload: any = {
    tenant_id: tenantId,
    status: 'occupied',
  };
  if (landlordId) {
    payload.landlord_id = landlordId;
  }

  const { error } = await supabase
    .from('rooms')
    .update(payload)
    .eq('id', roomId);

  if (error) throw new Error(`Lỗi khi gán người thuê vào phòng: ${error.message}`);
}

/**
 * Gỡ người thuê khỏi phòng (khi trả phòng)
 */
export async function removeTenantFromRoom(roomId: string): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .update({
      tenant_id: null,
      status: 'vacant',
    })
    .eq('id', roomId);

  if (error) throw new Error(`Lỗi khi gỡ người thuê khỏi phòng: ${error.message}`);
}
