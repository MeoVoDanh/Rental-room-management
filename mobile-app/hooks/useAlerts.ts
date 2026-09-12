import { useState, useEffect, useRef, useCallback } from 'react';
import { getAlerts, acknowledgeAlert, subscribeToAlerts } from '@/services/alertService';
import { Alert as AlertType, AlertStatus } from '@/types';

export function useAlerts(roomId?: string) {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const fetch = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const data = await getAlerts(roomId);
      setAlerts(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetch(true);

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

    // Polling dự phòng nếu Supabase Realtime chưa được bật hoặc bị gián đoạn.
    const timer = setInterval(() => fetch(false), 15_000);

    return () => {
      clearInterval(timer);
      unsubRef.current?.();
    };
  }, [fetch, roomId]);

  const acknowledge = useCallback(
    async (alertId: string, userId: string) => {
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId
            ? { ...alert, status: AlertStatus.ACKNOWLEDGED, acknowledgedBy: userId }
            : alert
        )
      );
      await acknowledgeAlert(alertId, userId);
      await fetch(false);
    },
    [fetch]
  );

  return { alerts, isLoading, error, acknowledge, refetch: fetch };
}
