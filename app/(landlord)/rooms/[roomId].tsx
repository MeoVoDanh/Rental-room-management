import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DeviceToggle } from '@/components/room/DeviceToggle';
import { EnvironmentCard } from '@/components/sensor/EnvironmentCard';
import { SensorChart } from '@/components/sensor/SensorChart';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusDot } from '@/components/ui/StatusDot';
import { Badge } from '@/components/ui/Badge';
import { MOCK_ROOMS } from '@/mocks/rooms';
import { MOCK_TELEMETRY, getSensorHistory } from '@/mocks/sensors';
import { MOCK_ACCESS_EVENTS, MOCK_COMMANDS } from '@/mocks/history';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { CommandStatus } from '@/types';

export default function RoomDetailScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const room = MOCK_ROOMS.find((r) => r.id === roomId);
  const telemetry = roomId ? MOCK_TELEMETRY[roomId] : null;
  const sensorHistory = roomId ? getSensorHistory(roomId) : [];
  const accessEvents = MOCK_ACCESS_EVENTS.filter((e) => e.roomId === roomId).slice(0, 5);
  const commands = MOCK_COMMANDS.filter((c) => c.roomId === roomId).slice(0, 5);

  // Local state for toggles (mock)
  const [lightOn, setLightOn] = useState(room?.state.lightOn ?? false);
  const [lockOpen, setLockOpen] = useState(room?.state.lockOpen ?? false);

  if (!room) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Không tìm thấy phòng</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.roomTitle}>{room.name}</Text>
          <View style={styles.headerMeta}>
            <StatusDot active={room.state.nodeOnline} />
            <Text style={styles.onlineText}>
              {room.state.nodeOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Tenant Info */}
        {room.tenantName && (
          <GlassCard>
            <View style={styles.tenantRow}>
              <View style={styles.tenantAvatar}>
                <Ionicons name="person" size={20} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.tenantName}>{room.tenantName}</Text>
                <Text style={styles.tenantLabel}>Người thuê hiện tại</Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Environment */}
        {telemetry && (
          <EnvironmentCard
            temperature={telemetry.temperature}
            humidity={telemetry.humidity}
            gasRaw={telemetry.gasRaw}
            gasThreshold={telemetry.gasThreshold}
            isGasDanger={telemetry.isGasDanger}
          />
        )}

        {/* Device Controls */}
        <GlassCard>
          <Text style={styles.sectionTitle}>Điều khiển thiết bị</Text>
          <View style={styles.deviceGrid}>
            <DeviceToggle icon="bulb" label="Đèn" isOn={lightOn} onToggle={() => setLightOn(!lightOn)} />
            <DeviceToggle
              icon={lockOpen ? 'lock-open' : 'lock-closed'}
              label={lockOpen ? 'Mở khóa' : 'Đã khóa'}
              isOn={lockOpen}
              onToggle={() => setLockOpen(!lockOpen)}
            />
          </View>
        </GlassCard>

        {/* Sensor Chart */}
        {sensorHistory.length > 0 && <SensorChart readings={sensorHistory} />}

        {/* Recent Access Events */}
        <GlassCard>
          <Text style={styles.sectionTitle}>Truy cập gần đây</Text>
          {accessEvents.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có lịch sử</Text>
          ) : (
            accessEvents.map((evt) => (
              <View key={evt.id} style={styles.eventRow}>
                <Ionicons
                  name={evt.result === 'granted' ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={evt.result === 'granted' ? Colors.success : Colors.danger}
                />
                <View style={styles.eventContent}>
                  <Text style={styles.eventUser}>{evt.userName}</Text>
                  <Text style={styles.eventMeta}>
                    {evt.method.toUpperCase()} • {formatTime(evt.timestamp)}
                  </Text>
                </View>
                <Badge
                  label={evt.result === 'granted' ? 'Cho phép' : 'Từ chối'}
                  variant={evt.result === 'granted' ? 'success' : 'danger'}
                />
              </View>
            ))
          )}
        </GlassCard>

        {/* Recent Commands */}
        <GlassCard>
          <Text style={styles.sectionTitle}>Lệnh điều khiển gần đây</Text>
          {commands.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có lệnh</Text>
          ) : (
            commands.map((cmd) => (
              <View key={cmd.id} style={styles.eventRow}>
                <Ionicons
                  name={cmd.status === CommandStatus.COMPLETED ? 'checkmark-done' : 'hourglass'}
                  size={18}
                  color={cmd.status === CommandStatus.COMPLETED ? Colors.success : cmd.status === CommandStatus.FAILED ? Colors.danger : Colors.warning}
                />
                <View style={styles.eventContent}>
                  <Text style={styles.eventUser}>{cmd.issuedByName}</Text>
                  <Text style={styles.eventMeta}>
                    {cmd.commandType.replace('_', ' ')} • {formatTime(cmd.createdAt)}
                  </Text>
                </View>
                <Badge
                  label={cmd.status}
                  variant={cmd.status === CommandStatus.COMPLETED ? 'success' : cmd.status === CommandStatus.FAILED ? 'danger' : 'warning'}
                />
              </View>
            ))
          )}
        </GlassCard>
      </ScrollView>
    </View>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()}/${d.getMonth() + 1}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    alignItems: 'center',
    gap: 4,
  },
  roomTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: 12,
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tenantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenantName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  tenantLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  deviceGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  eventContent: {
    flex: 1,
  },
  eventUser: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  eventMeta: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 12,
  },
  errorText: {
    fontSize: FontSize.lg,
    color: Colors.danger,
    textAlign: 'center',
    marginTop: 100,
  },
});
