import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function TenantRoomSelector() {
  const { user, selectAssignedRoom } = useAuth();
  const roomIds = user?.assignedRoomIds ?? [];

  if (roomIds.length <= 1) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Chọn phòng đang xem</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {roomIds.map((roomId) => {
          const selected = roomId === user?.assignedRoomId;
          return (
            <TouchableOpacity
              key={roomId}
              style={[styles.button, selected && styles.buttonSelected]}
              onPress={() => selectAssignedRoom(roomId)}>
              <Text style={[styles.text, selected && styles.textSelected]}>Phòng {roomId}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.lg, marginBottom: 10 },
  label: { color: Colors.textSecondary, fontSize: FontSize.xs, marginBottom: 6 },
  row: { gap: 8 },
  button: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.backgroundSecondary,
  },
  buttonSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  text: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  textSelected: { color: '#fff' },
});
