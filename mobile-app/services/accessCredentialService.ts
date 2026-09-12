const API_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:5000'
).replace(/\/$/, '');

export type CredentialType = 'rfid' | 'pin';

export interface AccessCredentialItem {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  type: CredentialType;
  isActive: boolean;
  createdAt?: string;
}

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? 'Không thể quản lý quyền truy cập');
  return data;
}

export async function getAccessCredentials(roomId: string, actorId: string) {
  const response = await fetch(
    `${API_URL}/api/rooms/${encodeURIComponent(roomId)}/credentials?actor_id=${encodeURIComponent(actorId)}`
  );
  const data = await parseResponse(response);
  return data.credentials as AccessCredentialItem[];
}

export async function createAccessCredential(params: {
  roomId: string;
  actorId: string;
  userId: string;
  type: CredentialType;
  value: string;
}) {
  const response = await fetch(
    `${API_URL}/api/rooms/${encodeURIComponent(params.roomId)}/credentials`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actor_id: params.actorId,
        user_id: params.userId,
        credential_type: params.type,
        credential_value: params.value,
      }),
    }
  );
  return parseResponse(response);
}

export async function setAccessCredentialActive(
  credentialId: string,
  actorId: string,
  isActive: boolean
) {
  const response = await fetch(`${API_URL}/api/credentials/${credentialId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: actorId, is_active: isActive }),
  });
  return parseResponse(response);
}

export async function deleteAccessCredential(credentialId: string, actorId: string) {
  const response = await fetch(
    `${API_URL}/api/credentials/${credentialId}?actor_id=${encodeURIComponent(actorId)}`,
    { method: 'DELETE' }
  );
  return parseResponse(response);
}
