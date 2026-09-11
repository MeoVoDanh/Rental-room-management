import { EmptyState, Header } from '@/components/layout/LayoutComponents';
import { RoomCard } from '@/components/room/RoomCard';
import { Colors, FontSize, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useRooms } from '@/hooks/useRooms';
import { createRoom, deleteRoom, updateRoom } from '@/services/roomService';
import { Room } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RoomsIndex() {
  const { user } = useAuth();
  const router = useRouter();
  const {
    rooms,
    isLoading,
    error,
    refetch,
    removeRoomOptimistically,
    restoreRoomOptimistically,
    finishRoomRemoval,
  } = useRooms(user?.id);

  const [modalVisible, setModalVisible] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleOpenCreateModal = () => {
    setNewRoomId('');
    setDisplayName('');
    setEditingRoom(null);
    setCreateError('');
    setModalVisible(true);
  };

  const handleConfirmCreateRoom = async () => {
    if (!newRoomId.trim()) {
      setCreateError('Vui lòng nhập số / tên phòng');
      return;
    }
    if (!user?.id) return;

    setCreateError('');
    setIsCreating(true);
    try {
      if (editingRoom) {
        await updateRoom(user.id, editingRoom.id, displayName);
      } else {
        await createRoom(user.id, newRoomId.trim(), displayName);
      }
      setModalVisible(false);
      await refetch(false);
      Alert.alert('Thành công', editingRoom ? 'Đã cập nhật tên phòng.' : `Đã tạo Phòng ${newRoomId.trim()} thành công!`);
    } catch (e: any) {
      setCreateError(e.message ?? 'Không thể tạo phòng.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEditModal = (room: Room) => {
    setEditingRoom(room);
    setNewRoomId(room.id);
    setDisplayName(room.name);
    setCreateError('');
    setModalVisible(true);
  };

  const handleArchiveRoom = async (room: Room) => {
    const message = `${room.name} và toàn bộ lịch sử, dữ liệu cảm biến, cảnh báo, quyền RFID/PIN và thiết bị của phòng sẽ bị xóa vĩnh viễn. Node IoT chỉ được tháo gán để dùng lại.`;
    const confirmed = Platform.OS === 'web'
      ? globalThis.confirm(`Xóa phòng?\n\n${message}`)
      : await new Promise<boolean>((resolve) => Alert.alert('Xóa phòng?', message, [
          { text: 'Hủy', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Xóa phòng', style: 'destructive', onPress: () => resolve(true) },
        ], { cancelable: true, onDismiss: () => resolve(false) }));
    if (!confirmed || !user?.id) return;
    removeRoomOptimistically(room.id);
    try {
      await deleteRoom(user.id, room.id);
      finishRoomRemoval(room.id);
      // Đồng bộ nền bằng một request mới; không bật loading toàn trang.
      await refetch(false);
    } catch (e: any) {
      restoreRoomOptimistically(room);
      Alert.alert('Không thể xóa phòng', e.message ?? 'Vui lòng thử lại.');
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Quản lý phòng"
        subtitle={isLoading ? 'Đang tải...' : `${rooms.length} phòng`}
        rightElement={
          <TouchableOpacity
            style={styles.addRoomBtn}
            onPress={handleOpenCreateModal}
            activeOpacity={0.8}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addRoomBtnText}>Thêm phòng</Text>
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>Đang tải danh sách phòng...</Text>
          </View>
        ) : error && rooms.length === 0 ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : rooms.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="business-outline"
              title="Chưa có phòng nào"
              message="Bạn chưa tạo phòng trọ nào trong hệ thống. Hãy tạo phòng để bắt đầu gán người thuê và quản lý thiết bị."
            />
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={handleOpenCreateModal}
              activeOpacity={0.85}>
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.emptyActionBtnText}>Tạo phòng đầu tiên</Text>
            </TouchableOpacity>
          </View>
        ) : (
          rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onPress={() => router.push(`/rooms/${room.id}` as Href)}
              onEdit={() => handleOpenEditModal(room)}
              onDelete={() => handleArchiveRoom(room)}
            />
          ))
        )}
      </ScrollView>

      {/* Modal Thêm phòng mới */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingRoom ? 'Cập nhật phòng' : 'Thêm phòng trọ mới'}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Mã số phòng (Ví dụ: 101, 102, 201) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="101"
                placeholderTextColor={Colors.textTertiary}
                value={newRoomId}
                onChangeText={setNewRoomId}
                editable={!editingRoom}
                autoFocus={true}
                keyboardType="numeric"
              />
              <Text style={styles.inputLabel}>Tên hiển thị *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={newRoomId ? `Phòng ${newRoomId}` : 'Ví dụ: Phòng 101'}
                placeholderTextColor={Colors.textTertiary}
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={80}
              />
              <Text style={styles.hintText}>
                Hệ thống sẽ tự động khởi tạo thiết bị điều khiển (đèn, khóa cửa) cho phòng này.
              </Text>

              {createError ? (
                <View style={styles.modalErrorRow}>
                  <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                  <Text style={styles.modalErrorText}>{createError}</Text>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                  disabled={isCreating}>
                  <Text style={styles.cancelBtnText}>Đóng</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmBtn, isCreating && styles.btnDisabled]}
                  onPress={handleConfirmCreateRoom}
                  disabled={isCreating}>
                  {isCreating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.confirmBtnText}>{editingRoom ? 'Lưu thay đổi' : 'Tạo phòng'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.danger,
    textAlign: 'center',
    marginTop: 32,
  },
  addRoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    gap: 4,
  },
  addRoomBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#fff',
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 8,
  },
  emptyActionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyActionBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Spacing['2xl'],
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  closeBtn: {
    padding: 6,
  },
  modalBody: {
    padding: Spacing.lg,
    gap: 14,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    height: 48,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  hintText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    lineHeight: 16,
  },
  modalErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.danger + '15',
    padding: 10,
    borderRadius: Radius.sm,
  },
  modalErrorText: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmBtnText: {
    fontSize: FontSize.sm,
    color: '#fff',
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
