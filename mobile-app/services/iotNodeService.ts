import { apiRequest } from './apiClient';

export type IoTNodeType = 'door' | 'sensor';

export interface IoTNode {
  id: string;
  macAddress: string;
  deviceId: string;
  nodeType: IoTNodeType;
  roomId?: string;
  isOnline: boolean;
  lastSeen?: string;
}

function mapNode(row: any): IoTNode {
  const lastSeen = row.last_seen ?? undefined;
  const isRecent = lastSeen
    ? Date.now() - new Date(lastSeen).getTime() < 60_000
    : false;

  return {
    id: String(row.id),
    macAddress: row.mac_address,
    deviceId: row.device_id,
    nodeType: row.node_type,
    roomId: row.room_id ?? undefined,
    isOnline: Boolean(row.is_online) && isRecent,
    lastSeen,
  };
}

export async function getIoTNodes(): Promise<IoTNode[]> {
  const body = await apiRequest('/api/nodes');
  return (body.nodes ?? []).map(mapNode);
}

export async function assignIoTNode(
  macAddress: string,
  roomId: string
): Promise<IoTNode> {
  const body = await apiRequest('/api/nodes/assign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mac_address: macAddress, room_id: roomId }),
  });
  return mapNode(body.node);
}

export async function createIoTNode(params: {
  actorId: string; roomId: string; macAddress: string; nodeType: IoTNodeType;
}): Promise<IoTNode> {
  const body = await apiRequest('/api/nodes', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: params.actorId, room_id: params.roomId, mac_address: params.macAddress, node_type: params.nodeType }),
  });
  return mapNode(body.node);
}

export async function updateIoTNode(nodeId: string, actorId: string, macAddress: string, nodeType: IoTNodeType): Promise<IoTNode> {
  const body = await apiRequest(`/api/nodes/${encodeURIComponent(nodeId)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: actorId, mac_address: macAddress, node_type: nodeType }),
  });
  return mapNode(body.node);
}

export async function removeIoTNode(nodeId: string, actorId: string, permanent = false): Promise<void> {
  await apiRequest(`/api/nodes/${encodeURIComponent(nodeId)}?actor_id=${encodeURIComponent(actorId)}&permanent=${permanent}`, { method: 'DELETE' });
}
