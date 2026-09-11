import { Badge } from '@/components/ui/Badge';
import { GlassCard } from '@/components/ui/GlassCard';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useIoTNodes } from '@/hooks/useIoTNodes';
import { IoTNode, IoTNodeType } from '@/services/iotNodeService';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export function NodeManagementCard({ roomId }: { roomId: string }) {
  const { user } = useAuth();
  const { assignedNodes, isLoading, isAssigning, error, create, update, remove } = useIoTNodes(roomId);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNode, setEditingNode] = useState<IoTNode | null>(null);
  const [macAddress, setMacAddress] = useState('');
  const [nodeType, setNodeType] = useState<IoTNodeType>('door');
  const [formError, setFormError] = useState('');

  const openCreate = () => {
    setEditingNode(null); setMacAddress(''); setNodeType('door'); setFormError(''); setModalVisible(true);
  };
  const openEdit = (node: IoTNode) => {
    setEditingNode(node); setMacAddress(node.macAddress); setNodeType(node.nodeType); setFormError(''); setModalVisible(true);
  };
  const save = async () => {
    if (!user?.id) return;
    const cleanMac = macAddress.replace(/[:\-\s]/g, '').toUpperCase();
    if (!/^[0-9A-F]{12}$/.test(cleanMac)) {
      setFormError('MAC phải gồm đúng 12 ký tự, ví dụ B8D61AB8A228.'); return;
    }
    try {
      if (editingNode) await update(editingNode.id, user.id, cleanMac, nodeType);
      else await create(user.id, cleanMac, nodeType);
      setModalVisible(false);
    } catch (e: any) { setFormError(e.message ?? 'Không lưu được node'); }
  };

  const confirm = async (title: string, message: string) => Platform.OS === 'web'
    ? globalThis.confirm(`${title}\n\n${message}`)
    : await new Promise<boolean>((resolve) => Alert.alert(title, message, [
        { text: 'Hủy', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Xác nhận', style: 'destructive', onPress: () => resolve(true) },
      ], { cancelable: true, onDismiss: () => resolve(false) }));

  const handleRemove = async (node: IoTNode, permanent: boolean) => {
    if (!user?.id) return;
    const ok = await confirm(
      permanent ? 'Xóa node vĩnh viễn?' : 'Tháo node khỏi phòng?',
      permanent
        ? `${node.deviceId} sẽ bị xóa khỏi hệ thống. Nếu ESP32 vẫn bật, firmware có thể đăng ký lại node.`
        : `${node.deviceId} sẽ trở về danh sách node chưa gán.`
    );
    if (!ok) return;
    try { await remove(node.id, user.id, permanent); }
    catch (e: any) { Alert.alert('Lỗi', e.message ?? 'Không xử lý được node'); }
  };

  return <>
    <GlassCard>
      <View style={styles.headerRow}>
        <View style={styles.flex}><Text style={styles.title}>Node IoT của phòng</Text><Text style={styles.subtitle}>Nhập MAC để tạo door-MAC hoặc sensor-MAC</Text></View>
        <TouchableOpacity style={styles.primaryButton} onPress={openCreate}><Ionicons name="add-circle-outline" size={18} color="#fff" /><Text style={styles.primaryText}>Thêm node</Text></TouchableOpacity>
      </View>
      {isLoading ? <ActivityIndicator color={Colors.primary} /> : assignedNodes.length === 0
        ? <Text style={styles.empty}>Phòng chưa có node ESP32 nào.</Text>
        : assignedNodes.map((node) => <NodeRow key={node.id} node={node} onEdit={() => openEdit(node)} onUnassign={() => handleRemove(node, false)} onDelete={() => handleRemove(node, true)} />)}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </GlassCard>

    <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
      <View style={styles.overlay}><View style={styles.modal}>
        <View style={styles.headerRow}><Text style={styles.modalTitle}>{editingNode ? 'Sửa node' : 'Thêm node thủ công'}</Text><TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color={Colors.textSecondary} /></TouchableOpacity></View>
        <Text style={styles.label}>Loại node</Text>
        <View style={styles.typeRow}>
          {(['door', 'sensor'] as IoTNodeType[]).map((type) => <TouchableOpacity key={type} style={[styles.typeButton, nodeType === type && styles.typeActive]} onPress={() => setNodeType(type)}><Text style={[styles.typeText, nodeType === type && styles.typeTextActive]}>{type === 'door' ? 'Node cửa (door)' : 'Node cảm biến (sensor)'}</Text></TouchableOpacity>)}
        </View>
        <Text style={styles.label}>Địa chỉ MAC</Text>
        <TextInput style={styles.input} value={macAddress} onChangeText={setMacAddress} placeholder="B8D61AB8A228" placeholderTextColor={Colors.textTertiary} autoCapitalize="characters" maxLength={17} />
        <Text style={styles.preview}>Device ID: {nodeType}-{macAddress.replace(/[:\-\s]/g, '').toUpperCase() || 'DIACHIMAC'}</Text>
        {formError ? <Text style={styles.error}>{formError}</Text> : null}
        <TouchableOpacity style={[styles.saveButton, isAssigning && styles.disabled]} disabled={isAssigning} onPress={save}>{isAssigning ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{editingNode ? 'Lưu thay đổi' : 'Thêm và gán vào phòng'}</Text>}</TouchableOpacity>
      </View></View>
    </Modal>
  </>;
}

function NodeRow({ node, onEdit, onUnassign, onDelete }: { node: IoTNode; onEdit: () => void; onUnassign: () => void; onDelete: () => void }) {
  return <View style={styles.nodeRow}>
    <View style={styles.icon}><Ionicons name={node.nodeType === 'door' ? 'lock-closed-outline' : 'hardware-chip-outline'} size={21} color={Colors.primary} /></View>
    <View style={styles.flex}><Text style={styles.nodeName}>{node.deviceId}</Text><Text style={styles.mac}>MAC: {node.macAddress}</Text></View>
    <Badge label={node.isOnline ? 'Online' : 'Offline'} variant={node.isOnline ? 'success' : 'neutral'} />
    <View style={styles.actions}><TouchableOpacity onPress={onEdit}><Ionicons name="create-outline" size={20} color={Colors.primaryLight} /></TouchableOpacity><TouchableOpacity onPress={onUnassign}><Ionicons name="unlink-outline" size={20} color={Colors.warning} /></TouchableOpacity><TouchableOpacity onPress={onDelete}><Ionicons name="trash-outline" size={20} color={Colors.danger} /></TouchableOpacity></View>
  </View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: Colors.text, fontSize: FontSize.md, fontWeight: '700' }, subtitle: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 3 },
  primaryButton: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6 }, primaryText: { color: '#fff', fontSize: FontSize.sm, fontWeight: '600' },
  nodeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight, marginTop: 12, paddingTop: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center' }, nodeName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' }, mac: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 13, marginLeft: 4 }, empty: { color: Colors.textTertiary, textAlign: 'center', marginTop: 16 }, error: { color: Colors.danger, fontSize: FontSize.sm, marginTop: 10 },
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' }, modal: { backgroundColor: Colors.backgroundSecondary, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, gap: 12 }, modalTitle: { flex: 1, color: Colors.text, fontSize: FontSize.xl, fontWeight: '700' }, label: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginTop: 4 },
  typeRow: { flexDirection: 'row', gap: 10 }, typeButton: { flex: 1, padding: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' }, typeActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryMuted }, typeText: { color: Colors.textSecondary, fontSize: FontSize.sm }, typeTextActive: { color: Colors.primaryLight, fontWeight: '700' },
  input: { height: 48, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.backgroundTertiary, color: Colors.text, paddingHorizontal: 14 }, preview: { color: Colors.textTertiary, fontSize: FontSize.xs }, saveButton: { height: 48, backgroundColor: Colors.primary, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 6 }, saveText: { color: '#fff', fontWeight: '700' }, disabled: { opacity: 0.6 },
});
