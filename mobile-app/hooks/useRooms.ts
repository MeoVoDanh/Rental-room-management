import { useState, useEffect, useCallback } from 'react';
import { getRooms } from '@/services/roomService';
import { Room } from '@/types';

export function useRooms(landlordId: string | undefined) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!landlordId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getRooms(landlordId);
      setRooms(data);
    } catch (e: any) {
      setError(e.message ?? 'Lỗi tải danh sách phòng');
    } finally {
      setIsLoading(false);
    }
  }, [landlordId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { rooms, isLoading, error, refetch: fetch };
}
