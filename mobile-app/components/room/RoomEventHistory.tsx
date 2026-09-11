import { GlassCard } from '@/components/ui/GlassCard';
import { Colors, FontSize } from '@/constants/theme';
import { useRoomEvents } from '@/hooks/useRoomEvents';
import { RoomEventType } from '@/services/roomEventService';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const EVENT_UI: Record<RoomEventType, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  gas_alert: { label: 'Cảnh báo khí gas', icon: 'warning', color: Colors.danger },
  high_temperature: { label: 'Cảnh báo nhiệt độ cao', icon: 'thermometer', color: Colors.danger },
  door_opened: { label: 'Mở cửa', icon: 'enter-outline', color: Colors.warning },
  door_closed: { label: 'Đóng cửa', icon: 'exit-outline', color: Colors.success },
  door_unlocked: { label: 'Mở khóa cửa', icon: 'lock-open-outline', color: Colors.warning },
  door_locked: { label: 'Khóa cửa', icon: 'lock-closed-outline', color: Colors.success },
  light_on: { label: 'Bật đèn', icon: 'bulb', color: Colors.warning },
  light_off: { label: 'Tắt đèn', icon: 'bulb-outline', color: Colors.textTertiary },
};

export function RoomEventHistory({ roomId, limit = 20, title = 'Lịch sử sự kiện phòng', showRoom = false }: { roomId?: string; limit?: number; title?: string; showRoom?: boolean }) {
  const { events, isLoading, error } = useRoomEvents(roomId, limit);
  return <GlassCard>
    <Text style={styles.title}>{title}</Text>
    {isLoading ? <ActivityIndicator color={Colors.primary} /> : error ? <Text style={styles.error}>{error}</Text> : events.length === 0 ? <Text style={styles.empty}>Chưa có sự kiện mới</Text> : events.map((event) => {
      const ui = EVENT_UI[event.type] ?? { label: event.type, icon: 'information-circle-outline' as const, color: Colors.primary };
      const threshold = event.metadata?.threshold;
      return <View key={event.id} style={styles.row}>
        <View style={[styles.icon, { backgroundColor: `${ui.color}20` }]}><Ionicons name={ui.icon} size={20} color={ui.color} /></View>
        <View style={styles.content}>
          <Text style={styles.eventName}>{ui.label}</Text>
          <Text style={styles.meta}>{showRoom ? `Phòng ${event.roomId} • ` : ''}{event.actorName} • {formatTime(event.createdAt)}</Text>
          {event.description ? <Text style={styles.description}>{event.description}</Text> : null}
          {event.measuredValue !== undefined && <Text style={styles.value}>Giá trị: {event.measuredValue}{threshold !== undefined ? ` • Ngưỡng: ${String(threshold)}` : ''}</Text>}
        </View>
      </View>;
    })}
  </GlassCard>;
}

function formatTime(value: string) {
  const date = new Date(value);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

const styles = StyleSheet.create({
  title: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, content: { flex: 1 },
  eventName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' }, meta: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },
  value: { color: Colors.warning, fontSize: FontSize.xs, marginTop: 3 }, empty: { color: Colors.textTertiary, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: 12 },
  description: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 3 },
  error: { color: Colors.danger, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: 12 },
});
