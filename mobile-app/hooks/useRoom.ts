import { getRoomById, getTenantRoom } from '@/services/roomService';
import { Room } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

let roomChannelSequence = 0;

export function useRoom(roomId: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (showLoading = true) => {
    if (!roomId) {
      setIsLoading(false);
      return;
    }
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const data = await getRoomById(roomId);
      setRoom(data);
    } catch (e: any) {
      setError(e.message ?? 'Lỗi tải phòng');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetch(true);

    // Mỗi hook/màn hình phải có một tên riêng. Dashboard và Điều khiển có thể
    // cùng theo dõi một phòng, và React Strict Mode cũng có thể mount lại effect.
    roomChannelSequence += 1;
    const channel = supabase
      .channel(`room-device-state-${roomId}-${roomChannelSequence}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'devices',
          filter: `room_id=eq.${roomId}`,
        },
        () => fetch(false)
      )
      .subscribe();

    const interval = setInterval(async () => {
      await fetch(false);
    }, 2000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [fetch, roomId]);

  return { room, isLoading, error, refetch: fetch };
}

/** Dùng cho tenant: tìm phòng theo tenantId */
export function useTenantRoom(tenantId: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await getTenantRoom(tenantId);
        setRoom(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [tenantId]);

  return { room, isLoading, error };
}
