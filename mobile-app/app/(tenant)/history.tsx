import { Header } from '@/components/layout/LayoutComponents';
import { RoomEventHistory } from '@/components/room/RoomEventHistory';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TenantRoomSelector } from '@/components/room/TenantRoomSelector';

export default function TenantHistory() {
  const { user } = useAuth();
  const roomId = user?.assignedRoomId;
  return <View style={styles.container}>
    <Header title="Lịch sử" subtitle={roomId ? `Phòng ${roomId}` : 'Chưa được gán phòng'} />
    <TenantRoomSelector />
    {roomId ? <ScrollView contentContainerStyle={styles.content}>
      <RoomEventHistory roomId={roomId} limit={100} />
    </ScrollView> : <View style={styles.emptyBox}>
      <Text style={styles.empty}>Chủ trọ chưa gán phòng cho tài khoản này.</Text>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'] },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  empty: { color: Colors.textSecondary, textAlign: 'center' },
});
