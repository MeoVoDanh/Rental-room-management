import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getAllRoomEvents, getRoomEvents, RoomEventItem } from '@/services/roomEventService';
import { useCallback, useEffect, useState } from 'react';

let eventChannelSequence = 0;

export function useRoomEvents(roomId?: string, limit = 100) {
  const { user } = useAuth();
  const [events, setEvents] = useState<RoomEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (showLoading = false) => {
    if (!user?.id) { setEvents([]); setIsLoading(false); return; }
    if (showLoading) setIsLoading(true);
    try {
      setEvents(roomId
        ? await getRoomEvents(roomId, user.id, limit)
        : await getAllRoomEvents(user.id, limit));
      setError(null);
    }
    catch (err: any) { setError(err.message ?? 'Không tải được lịch sử phòng'); }
    finally { if (showLoading) setIsLoading(false); }
  }, [roomId, limit, user?.id]);

  useEffect(() => {
    load(true);
    eventChannelSequence += 1;
    const channel = supabase.channel(`room-events-${roomId ?? 'all'}-${eventChannelSequence}`)
      .on('postgres_changes', roomId
        ? { event: 'INSERT', schema: 'public', table: 'room_events', filter: `room_id=eq.${roomId}` }
        : { event: 'INSERT', schema: 'public', table: 'room_events' }, () => load(false))
      .subscribe();
    const interval = setInterval(() => load(false), 15_000);
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [load, roomId]);
  return { events, isLoading, error, refetch: () => load(false) };
}
