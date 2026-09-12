import { useCallback, useEffect, useState } from 'react';
import {
  assignIoTNode,
  createIoTNode,
  getIoTNodes,
  IoTNode,
  IoTNodeType,
  removeIoTNode,
  updateIoTNode,
} from '@/services/iotNodeService';

export function useIoTNodes(roomId?: string) {
  const [nodes, setNodes] = useState<IoTNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    try {
      setNodes(await getIoTNodes());
    } catch (e: any) {
      setError(e.message ?? 'Không tải được danh sách node');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const timer = setInterval(refetch, 15_000);
    return () => clearInterval(timer);
  }, [refetch]);

  const assign = useCallback(async (macAddress: string) => {
    if (!roomId) return;
    setIsAssigning(true);
    setError(null);
    try {
      await assignIoTNode(macAddress, roomId);
      await refetch();
    } catch (e: any) {
      const message = e.message ?? 'Không thể gán node';
      setError(message);
      throw new Error(message);
    } finally {
      setIsAssigning(false);
    }
  }, [roomId, refetch]);

  const create = useCallback(async (actorId: string, macAddress: string, nodeType: IoTNodeType) => {
    if (!roomId) return;
    setIsAssigning(true);
    try { await createIoTNode({ actorId, roomId, macAddress, nodeType }); await refetch(); }
    finally { setIsAssigning(false); }
  }, [roomId, refetch]);

  const update = useCallback(async (nodeId: string, actorId: string, macAddress: string, nodeType: IoTNodeType) => {
    setIsAssigning(true);
    try { await updateIoTNode(nodeId, actorId, macAddress, nodeType); await refetch(); }
    finally { setIsAssigning(false); }
  }, [refetch]);

  const remove = useCallback(async (nodeId: string, actorId: string, permanent: boolean) => {
    setIsAssigning(true);
    try { await removeIoTNode(nodeId, actorId, permanent); await refetch(); }
    finally { setIsAssigning(false); }
  }, [refetch]);

  return {
    assignedNodes: nodes.filter((node) => node.roomId === roomId),
    availableNodes: nodes.filter((node) => !node.roomId),
    isLoading,
    isAssigning,
    error,
    assign,
    create,
    update,
    remove,
    refetch,
  };
}
