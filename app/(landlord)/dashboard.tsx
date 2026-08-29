import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/components/layout/LayoutComponents';
import { RoomCard } from '@/components/room/RoomCard';
import { AlertBanner } from '@/components/alert/AlertComponents';
import { useAuth } from '@/hooks/useAuth';
import { MOCK_ROOMS } from '@/mocks/rooms';
import { MOCK_ALERTS } from '@/mocks/alerts';
import { AlertStatus } from '@/types';
import { Colors, Spacing } from '@/constants/theme';

export default function LandlordDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const activeAlerts = MOCK_ALERTS.filter((a) => a.status === AlertStatus.ACTIVE);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as any);
  };

  return (
    <View style={styles.container}>
      <Header
        title={`Xin chào, ${user?.fullName?.split(' ').pop()}`}
        subtitle="Chủ nhà trọ • 2 phòng"
        onLogout={handleLogout}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Active Alerts */}
        {activeAlerts.map((alert) => (
          <AlertBanner
            key={alert.id}
            alert={alert}
            onPress={() => router.push('/(landlord)/alerts')}
          />
        ))}

        {/* Rooms */}
        {MOCK_ROOMS.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            onPress={() => router.push(`/(landlord)/rooms/${room.id}`)}
          />
        ))}
      </ScrollView>
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
});
