import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/layout/LayoutComponents';
import { DeviceToggle } from '@/components/room/DeviceToggle';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useRoom } from '@/hooks/useRoom';
import { useCommands } from '@/hooks/useCommands';
import { Colors, Spacing, FontSize } from '@/constants/theme';

export default function TenantControls() {
  const { user } = useAuth();
  const roomId = user?.assignedRoomId;

  const { room, isLoading: roomLoading } = useRoom(roomId);
  const { isSending, send } = useCommands(roomId);

  const [lightOptimistic, setLightOptimistic] = useState<boolean | null>(null);
  const [lockOptimistic, setLockOptimistic] = useState<boolean | null>(null);

  const lightOn = lightOptimistic ?? room?.state.lightOn ?? false;
  const lockOpen = lockOptimistic ?? room?.state.lockOpen ?? false;

  const handleToggleLight = async () => {
    if (!roomId || !user) return;
    const next = !lightOn;
    setLightOptimistic(next);
    try {
      await send('light_01', next ? 'toggle_light_on' : 'toggle_light_off', user.id);
    } catch {
      setLightOptimistic(!next);
    }
  };

  const handleToggleLock = async () => {
    if (!roomId || !user) return;
    const next = !lockOpen;
    setLockOptimistic(next);
    try {
      await send('door_lock_01', next ? 'unlock_door' : 'lock_door', user.id);
    } catch {
      setLockOptimistic(!next);
    }
  };

  if (roomLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!room) return null;

  return (
    <View style={styles.container}>
      <Header title="Điều khiển" subtitle={room.name} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Info note */}
        <GlassCard accent={Colors.primary}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={20} color={Colors.primary} />
            <Text style={styles.infoText}>
              Trạng thái cập nhật sau khi nhận xác nhận từ thiết bị IoT qua Supabase.
            </Text>
          </View>
        </GlassCard>

        {/* Controls */}
        <Text style={styles.sectionTitle}>Thiết bị trong phòng</Text>
        <View style={styles.controlGrid}>
          <DeviceToggle
            icon="bulb"
            label="Đèn"
            isOn={lightOn}
            onToggle={handleToggleLight}
            disabled={isSending}
          />
          <DeviceToggle
            icon={lockOpen ? 'lock-open' : 'lock-closed'}
            label={lockOpen ? 'Mở khóa' : 'Đã khóa'}
            isOn={lockOpen}
            onToggle={handleToggleLock}
            disabled={isSending}
          />
        </View>

        {isSending && (
          <View style={styles.sendingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.sendingText}>Đang gửi lệnh tới thiết bị...</Text>
          </View>
        )}

        {/* Door status */}
        <GlassCard>
          <Text style={styles.sectionTitle}>Trạng thái cửa</Text>
          <View style={styles.doorRow}>
            <View style={styles.doorItem}>
              <View style={[styles.doorIcon, { backgroundColor: Colors.successMuted }]}>
                <Ionicons name={lockOpen ? 'lock-open' : 'lock-closed'} size={28} color={Colors.success} />
              </View>
              <Text style={styles.doorLabel}>Khóa cửa</Text>
              <Badge label={lockOpen ? 'Đang mở' : 'Đã khóa'} variant={lockOpen ? 'warning' : 'success'} />
            </View>
            <View style={styles.doorItem}>
              <View style={[styles.doorIcon, { backgroundColor: Colors.primaryMuted }]}>
                <Ionicons name={room.state.doorOpen ? 'enter' : 'exit'} size={28} color={Colors.primary} />
              </View>
              <Text style={styles.doorLabel}>Cánh cửa</Text>
              <Badge label={room.state.doorOpen ? 'Đang mở' : 'Đã đóng'} variant={room.state.doorOpen ? 'info' : 'neutral'} />
            </View>
          </View>
        </GlassCard>

        {/* Command Status Legend */}
        <GlassCard>
          <Text style={styles.sectionTitle}>Trạng thái lệnh</Text>
          <View style={styles.legendGrid}>
            <LegendItem color={Colors.warning} label="Đang gửi" />
            <LegendItem color={Colors.primary} label="Đã gửi" />
            <LegendItem color={Colors.success} label="Hoàn thành" />
            <LegendItem color={Colors.danger} label="Thất bại" />
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: 12,
  },
  infoRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  controlGrid: { flexDirection: 'row', gap: 12 },
  sendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sendingText: { fontSize: FontSize.xs, color: Colors.textTertiary },
  doorRow: { flexDirection: 'row', gap: 12 },
  doorItem: { flex: 1, alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: Colors.backgroundTertiary },
  doorIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  doorLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  legendGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
