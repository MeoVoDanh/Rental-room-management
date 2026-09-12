import { supabase } from '@/lib/supabase';
import { Room, RoomState } from '@/types';
import { getIoTNodes, IoTNode } from '@/services/iotNodeService';

type DeviceRow = {
  room_id: string;
  device_type: string;
  relay_on?: boolean | null;
  door_contact?: string | null;
  lock_state?: string | null;
  created_last_online?: string | null;
};

function isRecent(timestamp?: string | null): boolean {
  if (!timestamp) return false;
  const value = new Date(timestamp).getTime();
  return Number.isFinite(value) && Date.now() - value < 60_000;
}

async function loadIoTNodes(): Promise<IoTNode[] | null> {
  try {
    return await getIoTNodes();
  } catch {
    // null nghĩa là backend tạm không truy cập được; khi đó dùng devices dự phòng.
    return null;
  }
}

// Map Supabase row → Room type
function mapRoom(
  row: any,
  profile?: any,
  devices: DeviceRow[] = [],
  nodes: IoTNode[] | null = null
): Room {
  const lightDevice =
    devices?.find((device) => device.device_type === 'light') ??
    devices?.find((device) => device.device_type === 'sensor');
  const doorDevice = devices?.find(
    (device) => device.device_type === 'door_lock'
  );
  const nodeOnline = nodes !== null
    ? nodes.some((node) => node.roomId === String(row.id) && node.isOnline)
    : devices.some((device) => isRecent(device.created_last_online));

  const state: RoomState = {
    // MC-38: OPEN nghĩa là cánh cửa đang mở
    doorOpen: doorDevice?.door_contact === 'OPEN',

    // Servo: UNLOCKED nghĩa là khóa đang mở
    lockOpen: doorDevice?.lock_state === 'UNLOCKED',

    // Trạng thái thật do node cảm biến gửi về, không gán cứng false.
    lightOn: lightDevice?.relay_on === true,
    buzzerOn: false,

    nodeOnline,
  };

  return {
    id: row.id,
    name: row.display_name || `Phòng ${row.id}`,
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
    .is('archived_at', null)
    .order('id');

  if (error) throw error;
  if (!rooms) return [];
  if (rooms.length === 0) return [];

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
  const { data: devices, error: devicesError } = await supabase
    .from('devices')
    .select('*')
    .in('room_id', roomIds);

  if (devicesError) throw devicesError;

  const deviceMap: Record<string, any[]> = {};
  devices?.forEach((d) => {
    if (!deviceMap[d.room_id]) deviceMap[d.room_id] = [];
    deviceMap[d.room_id].push(d);
  });

  const nodes = await loadIoTNodes();

  return rooms.map((r) =>
    mapRoom(r, profileMap[r.tenant_id], deviceMap[r.id], nodes)
  );
}

/** Lấy chi tiết 1 phòng */
export async function getRoomById(roomId: string): Promise<Room | null> {
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .is('archived_at', null)
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

  const nodes = await loadIoTNodes();

  return mapRoom(room, profile, devices ?? [], nodes);
}

/** Lấy phòng mà tenant đang thuê */
export async function getTenantRoom(tenantId: string): Promise<Room | null> {
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('archived_at', null)
    .single();

  if (error || !room) return null;

  const { data: devices } = await supabase
    .from('devices')
    .select('*')
    .eq('room_id', room.id);

  const nodes = await loadIoTNodes();

  return mapRoom(room, null, devices ?? [], nodes);
}

/**
 * Tạo phòng mới cho chủ trọ
 */
const API_URL = (process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');

async function roomApi(path: string, options: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `Backend trả về HTTP ${response.status}`);
  return body;
}

export async function createRoom(landlordId: string, roomId: string, displayName?: string): Promise<void> {
  const cleanId = roomId.trim();
  if (!cleanId) throw new Error('Mã phòng không được để trống');

  await roomApi('/api/rooms', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: landlordId, room_id: cleanId, display_name: displayName?.trim() || `Phòng ${cleanId}` }),
  });
}

export async function updateRoom(landlordId: string, roomId: string, displayName: string): Promise<void> {
  await roomApi(`/api/rooms/${encodeURIComponent(roomId)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: landlordId, display_name: displayName.trim() }),
  });
}

export async function deleteRoom(landlordId: string, roomId: string): Promise<void> {
  await roomApi(`/api/rooms/${encodeURIComponent(roomId)}?actor_id=${encodeURIComponent(landlordId)}`, { method: 'DELETE' });
}

export interface RoomDeletionStatus {
  canDelete: boolean;
  hasTenant: boolean;
  hasNodes: boolean;
  message?: string;
}

export async function getRoomDeletionStatus(
  landlordId: string,
  roomId: string
): Promise<RoomDeletionStatus> {
  const data = await roomApi(
    `/api/rooms/${encodeURIComponent(roomId)}?actor_id=${encodeURIComponent(landlordId)}`,
    { method: 'GET' }
  );
  return {
    canDelete: data.can_delete === true,
    hasTenant: data.has_tenant === true,
    hasNodes: data.has_nodes === true,
    message: data.message ?? undefined,
  };
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
