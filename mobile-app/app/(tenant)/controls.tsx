import React, { useEffect, useState } from 'react';
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

  useEffect(() => setLightOptimistic(null), [room?.state.lightOn]);
  useEffect(() => setLockOptimistic(null), [room?.state.lockOpen]);

  const handleToggleLight = async () => {
    if (!roomId || !user) return;
    const next = !lightOn;
    setLightOptimistic(next);
    try {
      await send(`light_${roomId}`, next ? 'toggle_light_on' : 'toggle_light_off', user.id);
    } catch {
      setLightOptimistic(!next);
    }
  };

  const handleToggleLock = async () => {
    if (!roomId || !user) return;
    const next = !lockOpen;
    setLockOptimistic(next);
    try {
      await send(`door_lock_${roomId}`, next ? 'unlock_door' : 'lock_door', user.id);
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

  if (!room) {
    return (
      <View style={styles.container}>
        <Header title="Điều khiển" subtitle="Chưa được gán phòng" />
        <View style={[styles.centered, { flex: 1, padding: Spacing.lg }]}>
          <Ionicons name="home-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.noRoomText}>
            Chủ trọ cần gán tài khoản của bạn vào một phòng trước khi điều khiển thiết bị.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Điều khiển" subtitle={room.name} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

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

      </ScrollView>
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
  sectionTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  controlGrid: { flexDirection: 'row', gap: 12 },
  sendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sendingText: { fontSize: FontSize.xs, color: Colors.textTertiary },
  doorRow: { flexDirection: 'row', gap: 12 },
  doorItem: { flex: 1, alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: Colors.backgroundTertiary },
  doorIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  doorLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  noRoomText: { marginTop: 12, color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
});
