import { AlertBanner } from '@/components/alert/AlertComponents';
import { Header } from '@/components/layout/LayoutComponents';
import { GlassCard } from '@/components/ui/GlassCard';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { useAlerts } from '@/hooks/useAlerts';
import { useAuth } from '@/hooks/useAuth';
import { useRooms } from '@/hooks/useRooms';
import { AlertStatus } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function LandlordDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { rooms, isLoading: roomsLoading } = useRooms(user?.id);
  const { alerts } = useAlerts();
  const activeAlerts = alerts.filter((alert) => alert.status === AlertStatus.ACTIVE);
  const occupiedRooms = rooms.filter((room) => Boolean(room.tenantId)).length;
  const onlineRooms = rooms.filter((room) => room.state.nodeOnline).length;

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as any);
  };

  return (
    <View style={styles.container}>
      <Header title={`Xin chào, ${user?.fullName?.split(' ').pop()}`} subtitle="Tổng quan hệ thống nhà trọ" onLogout={handleLogout} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {roomsLoading ? <ActivityIndicator color={Colors.primary} size="large" /> : (
          <View style={styles.metrics}>
            <MetricCard icon="business" label="Tổng số phòng" value={rooms.length} color={Colors.primary} />
            <MetricCard icon="people" label="Đang có người thuê" value={occupiedRooms} color={Colors.accent} />
            <MetricCard icon="wifi" label="Phòng trực tuyến" value={onlineRooms} color={Colors.success} />
            <MetricCard icon="warning" label="Cảnh báo đang mở" value={activeAlerts.length} color={activeAlerts.length ? Colors.danger : Colors.textTertiary} />
          </View>
        )}

        {activeAlerts.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cảnh báo cần chú ý</Text>
            {activeAlerts.slice(0, 3).map((alert) => (
              <AlertBanner key={alert.id} alert={alert} onPress={() => router.push('/(landlord)/alerts')} />
            ))}
          </View>
        ) : (
          <GlassCard style={styles.safeCard}>
            <Ionicons name="shield-checkmark" size={24} color={Colors.success} />
            <View style={styles.safeText}>
              <Text style={styles.safeTitle}>Hệ thống ổn định</Text>
              <Text style={styles.safeSubtitle}>Hiện không có cảnh báo nào đang mở.</Text>
            </View>
          </GlassCard>
        )}
      </ScrollView>
    </View>
  );
}

function MetricCard({ icon, label, value, color }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: number; color: string }) {
  return (
    <GlassCard style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}20` }]}><Ionicons name={icon} size={22} color={color} /></View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'], gap: 16 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { flexGrow: 1, flexBasis: 180, minWidth: 150 },
  metricIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  metricValue: { color: Colors.text, fontSize: FontSize['2xl'], fontWeight: '800' },
  metricLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 3 },
  section: { gap: 10 },
  sectionTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' },
  safeCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  safeText: { flex: 1 },
  safeTitle: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' },
  safeSubtitle: { color: Colors.textSecondary, fontSize: FontSize.sm, marginTop: 2 },
});
