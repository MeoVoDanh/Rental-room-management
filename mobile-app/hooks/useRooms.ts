import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { getRooms } from '@/services/roomService';
import { Room } from '@/types';
import { supabase } from '@/lib/supabase';

let roomsChannelSequence = 0;

export function useRooms(landlordId: string | undefined) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hiddenRoomIds = useRef(new Set<string>());
  const mutationVersion = useRef(0);

  const removeRoomOptimistically = useCallback((roomId: string) => {
    mutationVersion.current += 1;
    hiddenRoomIds.current.add(roomId);
    setRooms((current) => current.filter((room) => room.id !== roomId));
  }, []);

  const restoreRoomOptimistically = useCallback((room: Room) => {
    mutationVersion.current += 1;
    hiddenRoomIds.current.delete(room.id);
    setRooms((current) => {
      if (current.some((item) => item.id === room.id)) return current;
      return [...current, room].sort((a, b) =>
        a.id.localeCompare(b.id, undefined, { numeric: true })
      );
    });
  }, []);

  const finishRoomRemoval = useCallback((roomId: string) => {
    // Vô hiệu hóa các lượt polling đã bắt đầu trong lúc backend đang xóa.
    mutationVersion.current += 1;
    hiddenRoomIds.current.delete(roomId);
  }, []);

  const fetch = useCallback(async (showLoading = true) => {
    if (!landlordId) {
      setRooms([]);
      setIsLoading(false);
      return;
    }
    const versionAtStart = mutationVersion.current;
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const data = await getRooms(landlordId);
      if (versionAtStart === mutationVersion.current) {
        setRooms(data.filter((room) => !hiddenRoomIds.current.has(room.id)));
      }
    } catch (e: any) {
      setError(e.message ?? 'Lỗi tải danh sách phòng');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [landlordId]);

  useEffect(() => {
    if (!landlordId) {
      setRooms([]);
      setIsLoading(false);
      return;
    }
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
    const interval = setInterval(() => fetch(false), 15_000);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetch(false);
    });

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
      supabase.removeChannel(channel);
    };
  }, [fetch, landlordId]);

  return {
    rooms,
    isLoading,
    error,
    refetch: fetch,
    removeRoomOptimistically,
    restoreRoomOptimistically,
    finishRoomRemoval,
  };
}
