import React from 'react';
import { ScrollView, View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/components/layout/LayoutComponents';
import { RoomCard } from '@/components/room/RoomCard';
import { MOCK_ROOMS } from '@/mocks/rooms';
import { Colors, Spacing, FontSize } from '@/constants/theme';

export default function RoomsIndex() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Header title="Quản lý phòng" subtitle={`${MOCK_ROOMS.length} phòng`} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
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
