import { useState, useEffect, useCallback } from 'react';
import { getAccessEvents, AccessEvent } from '@/services/accessEventService';

export function useAccessEvents(roomId?: string, limit = 30) {
  const [events, setEvents] = useState<AccessEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAccessEvents(roomId, limit);
      setEvents(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { events, isLoading, error, refetch: fetch };
}
