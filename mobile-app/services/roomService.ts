import { supabase } from '@/lib/supabase';
import { Room, RoomState } from '@/types';

// Map Supabase row → Room type
function mapRoom(row: any, profile?: any, devices?: any[]): Room {
  const hasLight = devices?.some((d) => d.device_type === 'light');
  const hasDoor = devices?.some((d) => d.device_type === 'door_lock');

  const state: RoomState = {
    doorOpen: false,
    lockOpen: false,
    lightOn: false,
    buzzerOn: false,
    nodeOnline: devices?.some((d) => {
      if (!d.created_last_online) return false;
      const diff = Date.now() - new Date(d.created_last_online).getTime();
      return diff < 5 * 60 * 1000; // online nếu heartbeat < 5 phút
    }) ?? false,
  };

  return {
    id: row.id,
    name: `Phòng ${row.id}`,
    roomNumber: row.id,
    landlordId: row.landlord_id,
    tenantId: row.tenant_id ?? undefined,
    tenantName: profile?.full_name ?? undefined,
    state,
    devices: [],
    lastActivity: row.created_at,
  };
}

/** Lấy tất cả phòng của landlord */
export async function getRooms(landlordId: string): Promise<Room[]> {
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('landlord_id', landlordId)
    .order('id');

  if (error) throw error;
  if (!rooms) return [];

  // Fetch tenant profiles
  const tenantIds = rooms.map((r) => r.tenant_id).filter(Boolean);
  const profileMap: Record<string, any> = {};

  if (tenantIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', tenantIds);

    profiles?.forEach((p) => {
      profileMap[p.id] = p;
    });
  }

  // Fetch devices
  const roomIds = rooms.map((r) => r.id);
  const { data: devices } = await supabase
    .from('devices')
    .select('*')
    .in('room_id', roomIds);

  const deviceMap: Record<string, any[]> = {};
  devices?.forEach((d) => {
    if (!deviceMap[d.room_id]) deviceMap[d.room_id] = [];
    deviceMap[d.room_id].push(d);
  });

  return rooms.map((r) =>
    mapRoom(r, profileMap[r.tenant_id], deviceMap[r.id])
  );
}

/** Lấy chi tiết 1 phòng */
export async function getRoomById(roomId: string): Promise<Room | null> {
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (error) return null;

  let profile: any = null;
  if (room.tenant_id) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('id', room.tenant_id)
      .single();
    profile = data;
  }

  const { data: devices } = await supabase
    .from('devices')
    .select('*')
    .eq('room_id', roomId);

  return mapRoom(room, profile, devices ?? []);
}

/** Lấy phòng mà tenant đang thuê */
export async function getTenantRoom(tenantId: string): Promise<Room | null> {
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error || !room) return null;

  const { data: devices } = await supabase
    .from('devices')
    .select('*')
    .eq('room_id', room.id);

  return mapRoom(room, null, devices ?? []);
}

/**
 * Tạo phòng mới cho chủ trọ
 */
export async function createRoom(landlordId: string, roomId: string): Promise<void> {
  const cleanId = roomId.trim();
  if (!cleanId) throw new Error('Mã phòng không được để trống');

  // 1. Kiểm tra phòng đã tồn tại chưa
  const { data: existing } = await supabase
    .from('rooms')
    .select('id')
    .eq('id', cleanId)
    .maybeSingle();

  if (existing) {
    throw new Error(`Phòng ${cleanId} đã tồn tại trong hệ thống`);
  }

  // 2. Thêm phòng vào bảng rooms
  const { error: roomError } = await supabase.from('rooms').insert({
    id: cleanId,
    landlord_id: landlordId,
    status: 'vacant',
  });

  if (roomError) throw new Error(`Lỗi tạo phòng: ${roomError.message}`);

  // 3. Tạo thiết bị mặc định cho phòng (đèn và khóa cửa)
  const defaultDevices = [
    { id: `light_${cleanId}`, room_id: cleanId, device_type: 'light' },
    { id: `door_lock_${cleanId}`, room_id: cleanId, device_type: 'door_lock' },
  ];

  await supabase.from('devices').upsert(defaultDevices, { onConflict: 'id' });
}

/**
 * Chỉ Chủ trọ mới có quyền tạo tài khoản cho người thuê.
 * Sử dụng instance client riêng không lưu session để không logout Chủ trọ hiện tại.
 */
export async function createTenantAccount(params: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  roomId: string;
  landlordId: string;
}): Promise<{ tenantId: string }> {
  const { createClient } = await import('@supabase/supabase-js');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  // Client tạm thời không ghi đè session hiện tại của Chủ trọ
  const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // 1. Đăng ký tài khoản Auth cho người thuê
  const { data: authData, error: authError } = await tempAuthClient.auth.signUp({
    email: params.email.trim(),
    password: params.password,
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      throw new Error('Email này đã được sử dụng. Vui lòng chọn email khác.');
    }
    throw new Error(`Lỗi tạo tài khoản Auth: ${authError.message}`);
  }

  if (!authData.user) {
    throw new Error('Không tạo được thông tin xác thực cho người thuê');
  }

  const tenantId = authData.user.id;

  // 2. Tạo hồ sơ người thuê trong bảng profiles với role = 'tenant'
  const { error: profileError } = await supabase.from('profiles').insert({
    id: tenantId,
    full_name: params.fullName.trim(),
    phone: params.phone.trim(),
    role: 'tenant',
  });

  if (profileError) {
    throw new Error(`Lỗi tạo hồ sơ người thuê: ${profileError.message}`);
  }

  // 3. Gán người thuê vào phòng đã chọn
  const { error: roomError } = await supabase
    .from('rooms')
    .update({
      tenant_id: tenantId,
      status: 'occupied',
      landlord_id: params.landlordId,
    })
    .eq('id', params.roomId);

  if (roomError) {
    throw new Error(`Lỗi cập nhật phòng: ${roomError.message}`);
  }

  return { tenantId };
}

/**
 * Huỷ gán người thuê khỏi phòng (khi người thuê trả phòng)
 */
export async function removeTenantFromRoom(roomId: string): Promise<void> {
  const { error } = await supabase
    .from('rooms')
    .update({
      tenant_id: null,
      status: 'vacant',
    })
    .eq('id', roomId);

  if (error) throw new Error(`Lỗi khi xoá người thuê khỏi phòng: ${error.message}`);
}
