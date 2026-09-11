import { supabase } from '@/lib/supabase';

export interface AccessEvent {
  id: string;
  roomId: string;
  roomName: string;
  method: string;
  result: 'granted' | 'denied';
  userName: string;
  timestamp: string;
}

function mapEvent(row: any): AccessEvent {
  return {
    id: String(row.id),
    roomId: row.room_id,
    roomName: `Phòng ${row.room_id}`,
    method: row.method,
    result: row.is_success ? 'granted' : 'denied',
    userName:
      row.user_name ??
      (row.is_success ? 'Người dùng chưa được gán' : 'Không xác định'),
    timestamp: row.created_at,
  };
}

/** Lấy lịch sử truy cập (optionally filter theo roomId) */
export async function getAccessEvents(
  roomId?: string,
  limit = 30
): Promise<AccessEvent[]> {
  let query = supabase
    .from('access_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (roomId) {
    query = query.eq('room_id', roomId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapEvent);
}
