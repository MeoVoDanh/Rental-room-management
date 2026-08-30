import { useState, useEffect, useRef, useCallback } from 'react';
import { getAlerts, acknowledgeAlert, subscribeToAlerts } from '@/services/alertService';
import { Alert as AlertType } from '@/types';

export function useAlerts(roomId?: string) {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getAlerts(roomId);
      setAlerts(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetch();

    // Realtime: alert mới hoặc update
    unsubRef.current = subscribeToAlerts((updated) => {
      setAlerts((prev) => {
        const idx = prev.findIndex((a) => a.id === updated.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [updated, ...prev];
      });
    }, roomId);

    return () => {
      unsubRef.current?.();
    };
  }, [fetch, roomId]);

  const acknowledge = useCallback(
    async (alertId: string, userId: string) => {
      await acknowledgeAlert(alertId, userId);
      // Realtime sẽ tự cập nhật — không cần refetch thủ công
    },
    []
  );

  return { alerts, isLoading, error, acknowledge, refetch: fetch };
}
