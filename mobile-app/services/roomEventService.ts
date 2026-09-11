export type RoomEventType = 'gas_alert' | 'high_temperature' | 'door_opened' | 'door_closed' | 'door_unlocked' | 'door_locked' | 'light_on' | 'light_off';

export interface RoomEventItem {
  id: string; roomId: string; type: RoomEventType; source: string; actorName: string;
  description?: string; measuredValue?: number; metadata: Record<string, unknown>; createdAt: string;
}

const API_URL = (process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:5000').replace(/\/$/, '');

function mapRows(rows: any[]): RoomEventItem[] {
  return rows.map((row) => ({
    id: row.id, roomId: row.room_id, type: row.event_type, source: row.source,
    actorName: row.actor_name ?? 'Hệ thống', description: row.description ?? undefined,
    measuredValue: row.measured_value ?? undefined, metadata: row.metadata ?? {}, createdAt: row.created_at,
  }));
}

async function requestEvents(path: string): Promise<RoomEventItem[]> {
  const response = await fetch(`${API_URL}${path}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `Backend trả về HTTP ${response.status}`);
  return mapRows(body.events ?? []);
}

export function getRoomEvents(roomId: string, userId: string, limit = 100) {
  return requestEvents(`/api/rooms/${encodeURIComponent(roomId)}/events?user_id=${encodeURIComponent(userId)}&limit=${limit}`);
}

export function getAllRoomEvents(userId: string, limit = 100) {
  return requestEvents(`/api/events?user_id=${encodeURIComponent(userId)}&limit=${limit}`);
}
