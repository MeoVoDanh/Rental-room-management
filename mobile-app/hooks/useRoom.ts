import { useState, useEffect, useCallback } from 'react';
import { getRoomById, getTenantRoom } from '@/services/roomService';
import { Room } from '@/types';

export function useRoom(roomId: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!roomId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRoomById(roomId);
      setRoom(data);
    } catch (e: any) {
      setError(e.message ?? 'Lỗi tải phòng');
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

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
