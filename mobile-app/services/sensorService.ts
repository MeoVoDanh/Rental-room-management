import { supabase } from '@/lib/supabase';
import { SensorReading, TelemetrySnapshot } from '@/types';

const GAS_THRESHOLD = 1800;

function mapReading(row: any): SensorReading {
  return {
    id: String(row.id),
    roomId: row.room_id,
    temperature: row.temperature,
    humidity: row.humidity,
    gasRaw: row.gas_raw,
    timestamp: row.created_at,
  };
}

/** Lấy bản đọc cảm biến mới nhất của phòng */
export async function getLatestSensorReading(
  roomId: string
): Promise<TelemetrySnapshot | null> {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    roomId: data.room_id,
    temperature: data.temperature,
    humidity: data.humidity,
    gasRaw: data.gas_raw,
    gasThreshold: GAS_THRESHOLD,
    isGasDanger: data.gas_raw > GAS_THRESHOLD,
    timestamp: data.created_at,
  };
}

/** Lấy lịch sử cảm biến */
export async function getSensorHistory(
  roomId: string,
  limit = 288
): Promise<SensorReading[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('room_id', roomId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(mapReading).reverse();
}

/** Subscribe realtime sensor readings */
export function subscribeToSensorReadings(
  roomId: string,
  callback: (reading: TelemetrySnapshot) => void
) {
  const channel = supabase
    .channel(`sensor_${roomId}_${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sensor_readings',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        const d = payload.new as any;
        callback({
          roomId: d.room_id,
          temperature: d.temperature,
          humidity: d.humidity,
          gasRaw: d.gas_raw,
          gasThreshold: GAS_THRESHOLD,
          isGasDanger: d.gas_raw > GAS_THRESHOLD,
          timestamp: d.created_at,
        });
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
