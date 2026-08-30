import { supabase } from '@/lib/supabase';
import { ControlCommand, CommandStatus } from '@/types';

function mapCommand(row: any): ControlCommand {
  return {
    id: String(row.id),
    roomId: row.room_id,
    commandType: row.command,
    status: row.status as CommandStatus,
    issuedBy: row.created_by,
    issuedByName: row.issuer_name ?? 'Người dùng',
    targetDevice: row.device_id,
    payload: {},
    createdAt: row.created_at,
    completedAt: row.acknowledged_at ?? undefined,
  };
}

/** Gửi lệnh điều khiển thiết bị */
export async function sendCommand(
  roomId: string,
  deviceId: string,
  command: string,
  userId: string
): Promise<ControlCommand> {
  const { data, error } = await supabase
    .from('control_commands')
    .insert({
      room_id: roomId,
      device_id: deviceId,
      command,
      status: CommandStatus.PENDING,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return mapCommand(data);
}

/** Lấy lịch sử lệnh điều khiển */
export async function getCommandHistory(
  roomId: string,
  limit = 20
): Promise<ControlCommand[]> {
  const { data, error } = await supabase
    .from('control_commands')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(mapCommand);
}

/** Lấy lịch sử lệnh của tất cả phòng (landlord) */
export async function getAllCommandHistory(limit = 50): Promise<ControlCommand[]> {
  const { data, error } = await supabase
    .from('control_commands')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(mapCommand);
}
