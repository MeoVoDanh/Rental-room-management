import React from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/components/layout/LayoutComponents';
import { RoomCard } from '@/components/room/RoomCard';
import { AlertBanner } from '@/components/alert/AlertComponents';
import { useAuth } from '@/hooks/useAuth';
import { useRooms } from '@/hooks/useRooms';
import { useAlerts } from '@/hooks/useAlerts';
import { AlertStatus } from '@/types';
import { Colors, Spacing, FontSize } from '@/constants/theme';

export default function LandlordDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const { rooms, isLoading: roomsLoading } = useRooms(user?.id);
  const { alerts, acknowledge } = useAlerts();

  const activeAlerts = alerts.filter((a) => a.status === AlertStatus.ACTIVE);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login' as any);
  };

  return (
    <View style={styles.container}>
      <Header
        title={`Xin chào, ${user?.fullName?.split(' ').pop()}`}
        subtitle={`Chủ nhà trọ • ${rooms.length} phòng`}
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
        {roomsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>Đang tải danh sách phòng...</Text>
          </View>
        ) : (
          rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onPress={() => router.push(`/(landlord)/rooms/${room.id}`)}
            />
          ))
        )}
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
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
});
