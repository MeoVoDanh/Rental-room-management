import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/components/layout/LayoutComponents';
import { EnvironmentCard } from '@/components/sensor/EnvironmentCard';
import { SensorChart } from '@/components/sensor/SensorChart';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusDot } from '@/components/ui/StatusDot';
import { AlertBanner } from '@/components/alert/AlertComponents';
import { useAuth } from '@/hooks/useAuth';
import { MOCK_ROOMS } from '@/mocks/rooms';
import { MOCK_TELEMETRY, getSensorHistory } from '@/mocks/sensors';
import { MOCK_ALERTS } from '@/mocks/alerts';
import { AlertStatus } from '@/types';
import { Colors, Spacing, FontSize } from '@/constants/theme';
import { View as RNView, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TenantDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as any);
  };

  // Tenant only sees their assigned room
  const room = MOCK_ROOMS.find((r) => r.id === user?.assignedRoomId);
  const telemetry = room ? MOCK_TELEMETRY[room.id] : null;
  const sensorHistory = room ? getSensorHistory(room.id) : [];
  const activeAlerts = MOCK_ALERTS.filter(
    (a) => a.roomId === room?.id && a.status === AlertStatus.ACTIVE
  );

  if (!room) {
    return (
      <View style={styles.container}>
        <Header title="Phòng của tôi" onLogout={handleLogout} />
        <View style={styles.noRoom}>
          <Ionicons name="alert-circle" size={48} color={Colors.textTertiary} />
          <Text style={styles.noRoomText}>Chưa được gán phòng</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={room.name}
        subtitle={`Xin chào, ${user?.fullName?.split(' ').pop()}`}
        onLogout={handleLogout}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Active Alerts */}
        {activeAlerts.map((alert) => (
          <AlertBanner key={alert.id} alert={alert} />
        ))}

        {/* Room Status */}
        <GlassCard>
          <View style={styles.statusRow}>
            <StatusItem
              icon="lock-closed"
              label="Khóa cửa"
              value={room.state.lockOpen ? 'Đang mở' : 'Đã khóa'}
              color={room.state.lockOpen ? Colors.warning : Colors.success}
            />
            <StatusItem
              icon={room.state.doorOpen ? 'enter' : 'exit'}
              label="Cửa"
              value={room.state.doorOpen ? 'Đang mở' : 'Đóng'}
              color={room.state.doorOpen ? Colors.warning : Colors.success}
            />
            <StatusItem
              icon="wifi"
              label="Node"
              value={room.state.nodeOnline ? 'Online' : 'Offline'}
              color={room.state.nodeOnline ? Colors.success : Colors.danger}
            />
          </View>
        </GlassCard>

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

        {/* Chart */}
        {sensorHistory.length > 0 && <SensorChart readings={sensorHistory} />}
      </ScrollView>
    </View>
  );
}

function StatusItem({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.statusItem}>
      <View style={[styles.statusIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: 12,
  },
  noRoom: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  noRoomText: {
    fontSize: FontSize.lg,
    color: Colors.textTertiary,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    gap: 6,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  statusValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
