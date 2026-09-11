import { useState, useEffect, useCallback } from 'react';
import {
  getCommandHistory,
  getAllCommandHistory,
  sendCommand,
} from '@/services/commandService';
import { ControlCommand } from '@/types';

export function useCommands(roomId?: string) {
  const [commands, setCommands] = useState<ControlCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    try {
      const data = roomId
        ? await getCommandHistory(roomId)
        : await getAllCommandHistory();
      setCommands(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetch(true);

    // Tự lấy trạng thái ACK (pending -> completed) sau khi ESP32 xử lý lệnh.
    const interval = setInterval(() => fetch(false), 2000);
    return () => clearInterval(interval);
  }, [fetch]);

  const send = useCallback(
    async (deviceId: string, command: string, userId: string) => {
      if (!roomId) return;
      setIsSending(true);
      try {
        const newCmd = await sendCommand(roomId, deviceId, command, userId);
        setCommands((prev) => [newCmd, ...prev]);
      } catch (e: any) {
        setError(e.message);
        throw e;
      } finally {
        setIsSending(false);
      }
    },
    [roomId]
  );

  return { commands, isLoading, isSending, error, send, refetch: fetch };
}
