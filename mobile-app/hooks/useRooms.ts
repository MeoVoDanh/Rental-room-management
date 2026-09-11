import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { getRooms } from '@/services/roomService';
import { Room } from '@/types';
import { supabase } from '@/lib/supabase';

let roomsChannelSequence = 0;

export function useRooms(landlordId: string | undefined) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (showLoading = true) => {
    if (!landlordId) return;
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const data = await getRooms(landlordId);
      setRooms(data);
    } catch (e: any) {
      setError(e.message ?? 'Lỗi tải danh sách phòng');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [landlordId]);

  useEffect(() => {
    fetch(true);

    roomsChannelSequence += 1;
    const channel = supabase
      .channel(`rooms-live-state-${landlordId}-${roomsChannelSequence}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, () => fetch(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'iot_nodes' }, () => fetch(false))
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `landlord_id=eq.${landlordId}` },
        () => fetch(false)
      )
      .subscribe();

    // Polling dự phòng khi Realtime chưa bật publication hoặc mạng điện thoại vừa nối lại.
    const interval = setInterval(() => fetch(false), 3000);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetch(false);
    });

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
      supabase.removeChannel(channel);
    };
  }, [fetch, landlordId]);

  return { rooms, isLoading, error, refetch: fetch };
}
