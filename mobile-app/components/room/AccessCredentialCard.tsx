import { GlassCard } from '@/components/ui/GlassCard';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
  AccessCredentialItem,
  createAccessCredential,
  deleteAccessCredential,
  getAccessCredentials,
  setAccessCredentialActive,
  type CredentialType,
} from '@/services/accessCredentialService';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Props {
  roomId: string;
  tenantId?: string;
  tenantName?: string;
}

export function AccessCredentialCard({ roomId, tenantId, tenantName }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<AccessCredentialItem[]>([]);
  const [type, setType] = useState<CredentialType>('rfid');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      setItems(await getAccessCredentials(roomId, user.id));
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    } finally {
      setLoading(false);
    }
  }, [roomId, user?.id]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!user?.id || !tenantId) return;
    const cleanValue = type === 'rfid'
      ? value.replace(/[:\-\s]/g, '').toUpperCase()
      : value.trim();
    if (!cleanValue) {
      Alert.alert('Thiếu thông tin', `Vui lòng nhập ${type === 'rfid' ? 'UID thẻ RFID' : 'mã PIN'}.`);
      return;
    }
    if (type === 'pin' && !/^\d{4,8}$/.test(cleanValue)) {
      Alert.alert('PIN không hợp lệ', 'PIN phải gồm từ 4 đến 8 chữ số.');
      return;
    }
    if (type === 'rfid' && !/^[0-9A-F]+$/.test(cleanValue)) {
      Alert.alert('RFID không hợp lệ', 'UID RFID chỉ được gồm các ký tự 0–9 và A–F.');
      return;
    }
    setSaving(true);
    try {
      await createAccessCredential({ roomId, actorId: user.id, userId: tenantId, type, value: cleanValue });
      setValue('');
      await load();
      Alert.alert('Thành công', `Đã gán ${type.toUpperCase()} cho ${tenantName ?? 'người thuê'}.`);
    } catch (error: any) {
      Alert.alert('Không thể gán quyền', error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (item: AccessCredentialItem) => {
    if (!user?.id) return;
    try {
      await setAccessCredentialActive(item.id, user.id, !item.isActive);
      await load();
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    }
  };

  const remove = async (item: AccessCredentialItem) => {
    if (!user?.id) return;

    const message = `Bạn có chắc muốn xóa ${item.type.toUpperCase()} của ${item.userName}?`;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(message);
      if (!confirmed) return;

      try {
        await deleteAccessCredential(item.id, user.id);
        await load();
      } catch (error: any) {
        Alert.alert('Lỗi', error.message);
      }

      return;
    }

    Alert.alert('Xóa quyền truy cập', message, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccessCredential(item.id, user.id);
            await load();
          } catch (error: any) {
            Alert.alert('Lỗi', error.message);
          }
        },
      },
    ]);
  };

  return (
    <GlassCard>
      <Text style={styles.title}>Quản lý quyền truy cập</Text>
      {!tenantId ? (
        <Text style={styles.empty}>Hãy gán người thuê vào phòng trước khi tạo RFID hoặc PIN.</Text>
      ) : (
        <>
          <Text style={styles.owner}>Gán cho: {tenantName ?? 'Người thuê hiện tại'}</Text>
          <View style={styles.typeRow}>
            {(['rfid', 'pin'] as CredentialType[]).map((itemType) => (
              <TouchableOpacity
                key={itemType}
                style={[styles.typeButton, type === itemType && styles.typeButtonActive]}
                onPress={() => { setType(itemType); setValue(''); }}>
                <Text style={[styles.typeText, type === itemType && styles.typeTextActive]}>
                  {itemType.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.formRow}>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={setValue}
              autoCapitalize={type === 'rfid' ? 'characters' : 'none'}
              keyboardType={type === 'pin' ? 'number-pad' : 'default'}
              secureTextEntry={type === 'pin'}
              placeholder={type === 'rfid' ? 'UID, ví dụ A1B2C3D4' : 'PIN từ 4–8 số'}
              placeholderTextColor={Colors.textTertiary}
            />
            <TouchableOpacity style={styles.addButton} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.addText}>Gán quyền</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}

      {loading ? <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} /> : items.map((item) => (
        <View key={item.id} style={styles.itemRow}>
          <Ionicons name={item.type === 'rfid' ? 'card-outline' : 'keypad-outline'} size={20} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{item.type.toUpperCase()} • {item.userName}</Text>
            <Text style={styles.itemState}>{item.isActive ? 'Đang hoạt động' : 'Đã khóa'}</Text>
          </View>
          <TouchableOpacity style={styles.smallButton} onPress={() => toggle(item)}>
            <Text style={styles.smallButtonText}>{item.isActive ? 'Khóa' : 'Mở lại'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={() => remove(item)}>
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          </TouchableOpacity>
        </View>
      ))}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  owner: { color: Colors.textSecondary, fontSize: FontSize.sm, marginBottom: 10 },
  empty: { color: Colors.textTertiary, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: 10 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeButton: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  typeButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeText: { color: Colors.textSecondary, fontWeight: '700', fontSize: FontSize.xs },
  typeTextActive: { color: '#fff' },
  formRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, minHeight: 44, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.text, backgroundColor: Colors.backgroundTertiary, paddingHorizontal: 12 },
  addButton: { minWidth: 100, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  addText: { color: '#fff', fontWeight: '700', fontSize: FontSize.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: Spacing.md, marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  itemName: { color: Colors.text, fontSize: FontSize.sm, fontWeight: '600' },
  itemState: { color: Colors.textTertiary, fontSize: FontSize.xs, marginTop: 2 },
  smallButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  smallButtonText: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },
  deleteButton: { padding: 6 },
});
