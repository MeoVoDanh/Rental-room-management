import { GlassCard } from '@/components/ui/GlassCard';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useNodeKits } from '@/hooks/useNodeKits';
import { NodeKit } from '@/services/nodeKitService';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function NodeManagementCard({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const { kits, availableKits, isLoading, isSaving, error, assign, unassign } = useNodeKits(user?.id);
  const [visible, setVisible] = useState(false);
  const assigned = kits.find((kit) => kit.roomId === roomId);

  const confirm = async (title: string, message: string) => Platform.OS === 'web'
    ? globalThis.confirm(`${title}\n\n${message}`)
    : await new Promise<boolean>((resolve) => Alert.alert(title, message, [
        { text: 'Hủy', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Xác nhận', style: 'destructive', onPress: () => resolve(true) },
      ], { cancelable: true, onDismiss: () => resolve(false) }));

  const select = async (kit: NodeKit) => {
    try { await assign(kit.id, roomId); setVisible(false); }
    catch (e: any) { Alert.alert('Không thể gán', e.message ?? 'Vui lòng thử lại'); }
  };

  const detach = async () => {
    if (!assigned || !(await confirm('Tháo bộ node?', `${assigned.name} sẽ trở về kho node để gán cho phòng khác.`))) return;
    try { await unassign(assigned.id); }
    catch (e: any) { Alert.alert('Không thể tháo', e.message ?? 'Vui lòng thử lại'); }
  };

  return <>
    <GlassCard>
      <View style={styles.header}>
        <View style={styles.flex}><Text style={styles.title}>Bộ node của phòng</Text><Text style={styles.subtitle}>Một bộ gồm node cửa và node cảm biến</Text></View>
        {!assigned && <TouchableOpacity style={styles.button} onPress={() => setVisible(true)}><Ionicons name="link-outline" size={18} color="#fff" /><Text style={styles.buttonText}>Gán bộ node</Text></TouchableOpacity>}
      </View>
      {isLoading ? <ActivityIndicator color={Colors.primary} /> : assigned ? <View style={styles.kit}>
        <View style={styles.flex}><Text style={styles.kitName}>{assigned.name}</Text><Text style={styles.mac}>Door: {assigned.door?.macAddress ?? 'Thiếu'}</Text><Text style={styles.mac}>Sensor: {assigned.sensor?.macAddress ?? 'Thiếu'}</Text></View>
        <TouchableOpacity disabled={isSaving} onPress={detach}><Ionicons name="unlink-outline" size={22} color={Colors.warning} /></TouchableOpacity>
      </View> : <Text style={styles.empty}>Phòng chưa được gán bộ node.</Text>}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </GlassCard>

    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
      <View style={styles.overlay}><View style={styles.modal}>
        <View style={styles.header}><Text style={styles.modalTitle}>Chọn bộ node</Text><TouchableOpacity onPress={() => setVisible(false)}><Ionicons name="close" size={24} color={Colors.textSecondary} /></TouchableOpacity></View>
        {availableKits.length === 0 ? <Text style={styles.empty}>Chưa có bộ node sẵn sàng. Hãy tạo tại trang Node.</Text> : availableKits.map((kit) =>
          <TouchableOpacity key={kit.id} style={styles.option} disabled={isSaving} onPress={() => select(kit)}><View style={styles.flex}><Text style={styles.kitName}>{kit.name}</Text><Text style={styles.mac}>Door {kit.door?.macAddress} • Sensor {kit.sensor?.macAddress}</Text></View><Ionicons name="chevron-forward" size={20} color={Colors.primary} /></TouchableOpacity>)}
      </View></View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', gap: 12 }, title: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' }, subtitle: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 3 },
  button: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', gap: 6, alignItems: 'center' }, buttonText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  kit: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: Colors.borderLight, flexDirection: 'row', alignItems: 'center' }, kitName: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' }, mac: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 4 }, empty: { color: Colors.textTertiary, textAlign: 'center', marginTop: 16 }, error: { color: Colors.danger, marginTop: 10 },
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' }, modal: { backgroundColor: Colors.backgroundSecondary, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: 12 }, modalTitle: { flex: 1, color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' }, option: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: Radius.md, backgroundColor: Colors.backgroundTertiary },
});
