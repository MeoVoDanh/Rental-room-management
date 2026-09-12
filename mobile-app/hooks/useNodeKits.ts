import { useCallback, useEffect, useState } from 'react';
import { assignNodeKit, deleteNodeKit, getNodeKits, NodeKit, saveNodeKit, unassignNodeKit } from '@/services/nodeKitService';

export function useNodeKits(actorId?: string) {
  const [kits, setKits] = useState<NodeKit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!actorId) { setKits([]); setIsLoading(false); return; }
    try { setError(null); setKits(await getNodeKits(actorId)); }
    catch (e: any) { setError(e.message ?? 'Không tải được bộ node'); }
    finally { setIsLoading(false); }
  }, [actorId]);

  useEffect(() => { refetch(); const timer = setInterval(refetch, 15_000); return () => clearInterval(timer); }, [refetch]);

  const run = async (operation: () => Promise<unknown>) => {
    setIsSaving(true);
    try { await operation(); await refetch(); }
    finally { setIsSaving(false); }
  };

  return {
    kits, availableKits: kits.filter((kit) => !kit.roomId), isLoading, isSaving, error, refetch,
    save: (params: { id?: string; name: string; doorMac: string; sensorMac: string }) => actorId && run(() => saveNodeKit({ actorId, ...params })),
    remove: (kitId: string) => actorId && run(() => deleteNodeKit(actorId, kitId)),
    assign: (kitId: string, roomId: string) => actorId && run(() => assignNodeKit(actorId, kitId, roomId)),
    unassign: (kitId: string) => actorId && run(() => unassignNodeKit(actorId, kitId)),
  };
}
