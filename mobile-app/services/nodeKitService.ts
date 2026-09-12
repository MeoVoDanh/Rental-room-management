import { IoTNode } from './iotNodeService';
import { apiRequest } from './apiClient';

export interface NodeKit {
  id: string;
  name: string;
  roomId?: string;
  door: IoTNode;
  sensor: IoTNode;
}

function mapNode(row: any): IoTNode {
  const lastSeen = row.last_seen ?? undefined;
  return {
    id: String(row.id), macAddress: row.mac_address, deviceId: row.device_id,
    nodeType: row.node_type, roomId: row.room_id ?? undefined,
    isOnline: Boolean(row.is_online) && Boolean(lastSeen) && Date.now() - new Date(lastSeen).getTime() < 60_000,
    lastSeen,
  };
}

function mapKit(row: any): NodeKit {
  const nodes = (row.nodes ?? []).map(mapNode);
  return {
    id: String(row.id), name: row.name, roomId: row.room_id ?? undefined,
    door: nodes.find((node: IoTNode) => node.nodeType === 'door'),
    sensor: nodes.find((node: IoTNode) => node.nodeType === 'sensor'),
  } as NodeKit;
}

export async function getNodeKits(actorId: string): Promise<NodeKit[]> {
  const body = await apiRequest(`/api/node-kits?actor_id=${encodeURIComponent(actorId)}`);
  return (body.kits ?? []).map(mapKit);
}

export async function saveNodeKit(params: { actorId: string; id?: string; name: string; doorMac: string; sensorMac: string }) {
  const path = params.id ? `/api/node-kits/${encodeURIComponent(params.id)}` : '/api/node-kits';
  const body = await apiRequest(path, {
    method: params.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: params.actorId, name: params.name, door_mac: params.doorMac, sensor_mac: params.sensorMac }),
  });
  return mapKit(body.kit);
}

export async function deleteNodeKit(actorId: string, kitId: string) {
  await apiRequest(`/api/node-kits/${encodeURIComponent(kitId)}?actor_id=${encodeURIComponent(actorId)}`, { method: 'DELETE' });
}

export async function assignNodeKit(actorId: string, kitId: string, roomId: string) {
  await apiRequest(`/api/node-kits/${encodeURIComponent(kitId)}/room`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: actorId, room_id: roomId }),
  });
}

export async function unassignNodeKit(actorId: string, kitId: string) {
  await apiRequest(`/api/node-kits/${encodeURIComponent(kitId)}/room?actor_id=${encodeURIComponent(actorId)}`, { method: 'DELETE' });
}
