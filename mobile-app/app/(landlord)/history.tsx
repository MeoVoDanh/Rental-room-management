import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Header } from '@/components/layout/LayoutComponents';
import { RoomEventHistory } from '@/components/room/RoomEventHistory';
import { Colors, Spacing } from '@/constants/theme';

export default function LandlordHistory() {
  return (
    <View style={styles.container}>
      <Header title="Lịch sử" subtitle="Sự kiện của tất cả phòng" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        <RoomEventHistory limit={100} title="Lịch sử hệ thống" showRoom />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: 8,
  },
});
