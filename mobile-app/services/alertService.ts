import { supabase } from '@/lib/supabase';
import { Alert, AlertStatus, AlertType, AlertSeverity } from '@/types';

function mapAlert(row: any): Alert {
  // Xác định severity dựa theo alert_type
  const severityMap: Record<string, AlertSeverity> = {
    gas_leak: AlertSeverity.CRITICAL,
    high_temperature: AlertSeverity.WARNING,
    door_forced: AlertSeverity.CRITICAL,
    node_offline: AlertSeverity.WARNING,
  };

  const messageMap: Record<string, string> = {
    gas_leak: `Phát hiện rò rỉ khí gas (giá trị: ${row.gas_value})`,
    high_temperature: 'Nhiệt độ vượt ngưỡng an toàn',
    door_forced: 'Cửa bị mở cưỡng bức',
    node_offline: 'Thiết bị mất kết nối',
  };

  return {
    id: String(row.id),
    roomId: row.room_id,
    roomName: `Phòng ${row.room_id}`,
    type: row.alert_type as AlertType,
    severity: severityMap[row.alert_type] ?? AlertSeverity.INFO,
    status: row.status as AlertStatus,
    message: messageMap[row.alert_type] ?? row.alert_type,
    data: { gasValue: row.gas_value, threshold: row.threshold },
    createdAt: row.created_at,
    acknowledgedBy: row.resolved_by ?? undefined,
  };
}

/** Lấy danh sách alerts (optionally filter theo roomId) */
export async function getAlerts(roomId?: string): Promise<Alert[]> {
  let query = supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (roomId) {
    query = query.eq('room_id', roomId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapAlert);
}

/** Xác nhận (acknowledge) một alert */
export async function acknowledgeAlert(
  alertId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('alerts')
    .update({
      status: AlertStatus.ACKNOWLEDGED,
      resolved_by: userId,
    })
    .eq('id', alertId);

  if (error) throw error;
}

/** Subscribe realtime alerts */
export function subscribeToAlerts(
  callback: (alert: Alert) => void,
  roomId?: string
) {
  const filter = roomId ? `room_id=eq.${roomId}` : undefined;

  const channelName = `alerts_${roomId ?? 'all'}_${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts',
        ...(filter ? { filter } : {}),
      },
      (payload) => {
        callback(mapAlert(payload.new));
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'alerts',
        ...(filter ? { filter } : {}),
      },
      (payload) => {
        callback(mapAlert(payload.new));
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
