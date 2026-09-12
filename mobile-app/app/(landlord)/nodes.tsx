import { Header } from '@/components/layout/LayoutComponents';
import { GlassCard } from '@/components/ui/GlassCard';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useNodeKits } from '@/hooks/useNodeKits';
import { NodeKit } from '@/services/nodeKitService';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const cleanMac = (value: string) => value.replace(/[:\-\s]/g, '').toUpperCase();

export default function NodesScreen() {
  const { user } = useAuth();
  const { kits, isLoading, isSaving, error, save, remove } = useNodeKits(user?.id);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<NodeKit | null>(null);
  const [name, setName] = useState('');
  const [doorMac, setDoorMac] = useState('');
  const [sensorMac, setSensorMac] = useState('');
  const [formError, setFormError] = useState('');

  const open = (kit?: NodeKit) => {
    setEditing(kit ?? null); setName(kit?.name ?? ''); setDoorMac(kit?.door?.macAddress ?? ''); setSensorMac(kit?.sensor?.macAddress ?? ''); setFormError(''); setVisible(true);
  };
  const submit = async () => {
    const door = cleanMac(doorMac); const sensor = cleanMac(sensorMac);
    if (!name.trim() || !/^[0-9A-F]{12}$/.test(door) || !/^[0-9A-F]{12}$/.test(sensor)) { setFormError('Nhập tên và hai MAC hợp lệ gồm 12 ký tự.'); return; }
    try { await save({ id: editing?.id, name: name.trim(), doorMac: door, sensorMac: sensor }); setVisible(false); }
    catch (e: any) { setFormError(e.message ?? 'Không lưu được bộ node'); }
  };
  const erase = async (kit: NodeKit) => {
    const message = `${kit.name} và hai MAC door/sensor sẽ bị xóa khỏi hệ thống.`;
    const ok = Platform.OS === 'web' ? globalThis.confirm(`Xóa bộ node?\n\n${message}`) : await new Promise<boolean>((resolve) => Alert.alert('Xóa bộ node?', message, [{ text: 'Hủy', onPress: () => resolve(false) }, { text: 'Xóa', style: 'destructive', onPress: () => resolve(true) }], { onDismiss: () => resolve(false) }));
    if (!ok) return;
    try { await remove(kit.id); } catch (e: any) { Alert.alert('Lỗi', e.message ?? 'Không xóa được bộ node'); }
  };

  return <View style={styles.container}>
    <Header title="Quản lý node" subtitle={`${kits.length} bộ node`} rightElement={<TouchableOpacity style={styles.add} onPress={() => open()}><Ionicons name="add" size={20} color="#fff" /><Text style={styles.addText}>Tạo bộ</Text></TouchableOpacity>} />
    <ScrollView contentContainerStyle={styles.content}>
      {isLoading ? <ActivityIndicator color={Colors.primary} /> : kits.length === 0 ? <Text style={styles.empty}>Chưa có bộ node. Tạo một bộ gồm door và sensor để gán cho phòng.</Text> : kits.map((kit) =>
        <GlassCard key={kit.id}>
          <View style={styles.row}><View style={styles.icon}><Ionicons name="hardware-chip" size={23} color={Colors.primary} /></View><View style={styles.flex}><Text style={styles.name}>{kit.name}</Text><Text style={styles.status}>{kit.roomId ? `Đang dùng tại Phòng ${kit.roomId}` : 'Sẵn sàng gán phòng'}</Text></View><TouchableOpacity onPress={() => open(kit)}><Ionicons name="create-outline" size={21} color={Colors.primaryLight} /></TouchableOpacity><TouchableOpacity onPress={() => erase(kit)}><Ionicons name="trash-outline" size={21} color={Colors.danger} /></TouchableOpacity></View>
          <View style={styles.nodes}><Text style={styles.mac}>Door: {kit.door?.deviceId ?? 'Thiếu node cửa'}</Text><Text style={styles.mac}>Sensor: {kit.sensor?.deviceId ?? 'Thiếu node cảm biến'}</Text></View>
        </GlassCard>)}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}><View style={styles.overlay}><View style={styles.modal}>
      <View style={styles.row}><Text style={styles.modalTitle}>{editing ? 'Cập nhật bộ node' : 'Tạo bộ node'}</Text><TouchableOpacity onPress={() => setVisible(false)}><Ionicons name="close" size={24} color={Colors.textSecondary} /></TouchableOpacity></View>
      <Text style={styles.label}>Tên bộ node</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ví dụ: Bộ node tầng 1" placeholderTextColor={Colors.textTertiary} />
      <Text style={styles.label}>MAC node cửa</Text><TextInput style={styles.input} value={doorMac} onChangeText={setDoorMac} autoCapitalize="characters" placeholder="C4DEE220965C" placeholderTextColor={Colors.textTertiary} />
      <Text style={styles.label}>MAC node cảm biến</Text><TextInput style={styles.input} value={sensorMac} onChangeText={setSensorMac} autoCapitalize="characters" placeholder="B8D61AB8A228" placeholderTextColor={Colors.textTertiary} />
      <Text style={styles.hint}>MAC đã đăng ký nhưng chưa gán phòng sẽ được đưa vào bộ này, không bị báo trùng.</Text>{formError ? <Text style={styles.error}>{formError}</Text> : null}
      <TouchableOpacity style={[styles.save, isSaving && { opacity: .6 }]} disabled={isSaving} onPress={submit}>{isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Lưu bộ node</Text>}</TouchableOpacity>
    </View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background }, content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'], gap: 12 }, flex: { flex: 1 },
  add: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 13, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 5 }, addText: { color: '#fff', fontWeight: '700' }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, icon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryMuted }, name: { color: Colors.text, fontSize: FontSize.lg, fontWeight: '700' }, status: { color: Colors.success, fontSize: FontSize.sm, marginTop: 4 }, nodes: { borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 12, gap: 5 }, mac: { color: Colors.textSecondary, fontSize: FontSize.sm }, empty: { color: Colors.textTertiary, textAlign: 'center', marginTop: 50 }, error: { color: Colors.danger, marginTop: 8 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: Colors.overlay }, modal: { backgroundColor: Colors.backgroundSecondary, padding: Spacing.xl, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, gap: 10 }, modalTitle: { flex: 1, color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' }, label: { color: Colors.textSecondary, fontWeight: '600', marginTop: 5 }, input: { height: 48, borderRadius: Radius.md, backgroundColor: Colors.backgroundTertiary, borderWidth: 1, borderColor: Colors.border, color: Colors.text, paddingHorizontal: 14 }, hint: { color: Colors.textTertiary, fontSize: FontSize.xs }, save: { height: 48, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, saveText: { color: '#fff', fontWeight: '700' },
});
