import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DeviceToggle } from '@/components/room/DeviceToggle';
import { EnvironmentCard } from '@/components/sensor/EnvironmentCard';
import { SensorChart } from '@/components/sensor/SensorChart';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusDot } from '@/components/ui/StatusDot';
import { Badge } from '@/components/ui/Badge';
import { useRoom } from '@/hooks/useRoom';
import { useSensor } from '@/hooks/useSensor';
import { useCommands } from '@/hooks/useCommands';
import { useAccessEvents } from '@/hooks/useAccessEvents';
import { useTenants } from '@/hooks/useTenants';
import { useAuth } from '@/hooks/useAuth';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { CommandStatus } from '@/types';

export default function RoomDetailScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { room, isLoading: roomLoading, refetch: refetchRoom } = useRoom(roomId);
  const { telemetry, history: sensorHistory } = useSensor(roomId);
  const { commands, isSending, send } = useCommands(roomId);
  const { events: accessEvents } = useAccessEvents(roomId, 5);
  const { tenants, assignToRoom, removeFromRoom, refetch: refetchTenants } = useTenants();

  const [lightOptimistic, setLightOptimistic] = useState<boolean | null>(null);
  const [lockOptimistic, setLockOptimistic] = useState<boolean | null>(null);

  // Modal chọn người thuê để gán vào phòng
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const lightOn = lightOptimistic ?? room?.state.lightOn ?? false;
  const lockOpen = lockOptimistic ?? room?.state.lockOpen ?? false;

  const handleToggleLight = async () => {
    if (!roomId || !user) return;
    const next = !lightOn;
    setLightOptimistic(next);
    try {
      await send('light_01', next ? 'toggle_light_on' : 'toggle_light_off', user.id);
    } catch {
      setLightOptimistic(!next); // rollback
    }
  };

  const handleToggleLock = async () => {
    if (!roomId || !user) return;
    const next = !lockOpen;
    setLockOptimistic(next);
    try {
      await send('door_lock_01', next ? 'unlock_door' : 'lock_door', user.id);
    } catch {
      setLockOptimistic(!next); // rollback
    }
  };

  const handleOpenAssignModal = async () => {
    setSelectedTenantId(null);
    await refetchTenants();
    setAssignModalVisible(true);
  };

  const handleConfirmAssign = async () => {
    if (!selectedTenantId || !roomId) {
      Alert.alert('Thông báo', 'Vui lòng chọn một người thuê để gán vào phòng.');
      return;
    }

    setIsAssigning(true);
    try {
      await assignToRoom(roomId, selectedTenantId, user?.id);
      await refetchRoom();
      setAssignModalVisible(false);
      Alert.alert('Thành công', 'Đã gán người thuê vào phòng thành công!');
    } catch (e: any) {
      Alert.alert('Lỗi', e.message ?? 'Không thể gán người thuê vào phòng.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveTenant = () => {
    if (!roomId) return;
    Alert.alert(
      'Xác nhận trả phòng',
      `Bạn có chắc muốn gỡ ${room?.tenantName ?? 'người thuê'} khỏi ${room?.name ?? `Phòng ${roomId}`}? (Tài khoản người thuê vẫn được giữ trong hệ thống)`,
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Gỡ khỏi phòng',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromRoom(roomId);
              await refetchRoom();
              Alert.alert('Thành công', 'Phòng đã được chuyển về trạng thái trống.');
            } catch (e: any) {
              Alert.alert('Lỗi', e.message ?? 'Không thể gỡ người thuê.');
            }
          },
        },
      ]
    );
  };

  if (roomLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!room) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Không tìm thấy phòng</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.roomTitle}>{room.name}</Text>
          <View style={styles.headerMeta}>
            <StatusDot active={room.state.nodeOnline} />
            <Text style={styles.onlineText}>
              {room.state.nodeOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Tenant Section: Đã có người thuê HOẶC nút Gán người thuê */}
        {room.tenantName ? (
          <GlassCard accent={Colors.primary}>
            <View style={styles.tenantRow}>
              <View style={styles.tenantAvatar}>
                <Ionicons name="person" size={22} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tenantName}>{room.tenantName}</Text>
                <Text style={styles.tenantLabel}>Người thuê hiện tại • Đang ở</Text>
              </View>
              <TouchableOpacity
                style={styles.removeTenantBtn}
                onPress={handleRemoveTenant}>
                <Ionicons name="exit-outline" size={16} color={Colors.danger} />
                <Text style={styles.removeTenantText}>Trả phòng</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        ) : (
          <GlassCard accent={Colors.warning}>
            <View style={styles.vacantRow}>
              <View style={styles.vacantIconCircle}>
                <Ionicons name="person-outline" size={24} color={Colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vacantTitle}>Phòng đang trống</Text>
                <Text style={styles.vacantSubtitle}>
                  Chưa có người thuê gán vào phòng này.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.assignBtn}
              onPress={handleOpenAssignModal}
              activeOpacity={0.85}>
              <Ionicons name="person-add" size={18} color="#fff" />
              <Text style={styles.assignBtnText}>Gán người thuê vào phòng</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* Environment */}
        {telemetry && (
          <EnvironmentCard
            temperature={telemetry.temperature}
            humidity={telemetry.humidity}
            gasRaw={telemetry.gasRaw}
            gasThreshold={telemetry.gasThreshold}
            isGasDanger={telemetry.isGasDanger}
          />
        )}

        {/* Device Controls */}
        <GlassCard>
          <Text style={styles.sectionTitle}>Điều khiển thiết bị</Text>
          <View style={styles.deviceGrid}>
            <DeviceToggle
              icon="bulb"
              label="Đèn"
              isOn={lightOn}
              onToggle={handleToggleLight}
              disabled={isSending}
            />
            <DeviceToggle
              icon={lockOpen ? 'lock-open' : 'lock-closed'}
              label={lockOpen ? 'Mở khóa' : 'Đã khóa'}
              isOn={lockOpen}
              onToggle={handleToggleLock}
              disabled={isSending}
            />
          </View>
          {isSending && (
            <View style={styles.sendingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.sendingText}>Đang gửi lệnh...</Text>
            </View>
          )}
        </GlassCard>

        {/* Sensor Chart */}
        {sensorHistory.length > 0 && <SensorChart readings={sensorHistory} />}

        {/* Recent Access Events */}
        <GlassCard>
          <Text style={styles.sectionTitle}>Truy cập gần đây</Text>
          {accessEvents.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có lịch sử</Text>
          ) : (
            accessEvents.map((evt) => (
              <View key={evt.id} style={styles.eventRow}>
                <Ionicons
                  name={evt.result === 'granted' ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={evt.result === 'granted' ? Colors.success : Colors.danger}
                />
                <View style={styles.eventContent}>
                  <Text style={styles.eventUser}>{evt.userName}</Text>
                  <Text style={styles.eventMeta}>
                    {evt.method.toUpperCase()} • {formatTime(evt.timestamp)}
                  </Text>
                </View>
                <Badge
                  label={evt.result === 'granted' ? 'Cho phép' : 'Từ chối'}
                  variant={evt.result === 'granted' ? 'success' : 'danger'}
                />
              </View>
            ))
          )}
        </GlassCard>

        {/* Recent Commands */}
        <GlassCard>
          <Text style={styles.sectionTitle}>Lệnh điều khiển gần đây</Text>
          {commands.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có lệnh</Text>
          ) : (
            commands.slice(0, 5).map((cmd) => (
              <View key={cmd.id} style={styles.eventRow}>
                <Ionicons
                  name={cmd.status === CommandStatus.COMPLETED ? 'checkmark-done' : 'hourglass'}
                  size={18}
                  color={
                    cmd.status === CommandStatus.COMPLETED
                      ? Colors.success
                      : cmd.status === CommandStatus.FAILED
                      ? Colors.danger
                      : Colors.warning
                  }
                />
                <View style={styles.eventContent}>
                  <Text style={styles.eventUser}>{cmd.issuedByName}</Text>
                  <Text style={styles.eventMeta}>
                    {cmd.commandType.replace(/_/g, ' ')} • {formatTime(cmd.createdAt)}
                  </Text>
                </View>
                <Badge
                  label={cmd.status}
                  variant={
                    cmd.status === CommandStatus.COMPLETED
                      ? 'success'
                      : cmd.status === CommandStatus.FAILED
                      ? 'danger'
                      : 'warning'
                  }
                />
              </View>
            ))
          )}
        </GlassCard>
      </ScrollView>

      {/* Modal Chọn Người thuê để gán vào phòng */}
      <Modal
        visible={assignModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAssignModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Gán người thuê vào phòng</Text>
                <Text style={styles.modalSubtitle}>{room.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setAssignModalVisible(false)}
                style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              showsVerticalScrollIndicator={false}>
              <Text style={styles.selectHint}>
                Chọn một người thuê từ danh sách bên dưới để gán vào phòng này:
              </Text>

              {tenants.length === 0 ? (
                <View style={styles.emptyTenantsBox}>
                  <Ionicons name="people-outline" size={36} color={Colors.textTertiary} />
                  <Text style={styles.emptyTenantsTitle}>Chưa có người thuê nào trong hệ thống</Text>
                  <Text style={styles.emptyTenantsText}>
                    Vui lòng vào tab "Người thuê" để tạo tài khoản người thuê trước.
                  </Text>
                </View>
              ) : (
                tenants.map((t) => {
                  const isSelected = selectedTenantId === t.id;
                  const isCurrent = t.assignedRoomId === roomId;
                  const isOther = t.assignedRoomId && t.assignedRoomId !== roomId;

                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[
                        styles.tenantSelectItem,
                        isSelected && styles.tenantSelectItemSelected,
                      ]}
                      onPress={() => setSelectedTenantId(t.id)}
                      activeOpacity={0.7}>
                      <View style={styles.radioCircle}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.selectName}>{t.fullName}</Text>
                        <Text style={styles.selectMeta}>
                          {t.phone ? `SĐT: ${t.phone}` : 'Chưa có SĐT'}
                        </Text>
                      </View>
                      <Badge
                        label={
                          isCurrent
                            ? 'Đang ở phòng này'
                            : isOther
                            ? `Phòng ${t.assignedRoomId}`
                            : 'Chưa có phòng'
                        }
                        variant={isCurrent ? 'info' : isOther ? 'neutral' : 'success'}
                      />
                    </TouchableOpacity>
                  );
                })
              )}

              {/* Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setAssignModalVisible(false)}
                  disabled={isAssigning}>
                  <Text style={styles.cancelBtnText}>Đóng</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    (!selectedTenantId || isAssigning) && styles.btnDisabled,
                  ]}
                  onPress={handleConfirmAssign}
                  disabled={!selectedTenantId || isAssigning}>
                  {isAssigning ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.confirmBtnText}>Xác nhận gán</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()}/${d.getMonth() + 1}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    alignItems: 'center',
    gap: 4,
  },
  roomTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: 12,
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tenantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenantName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  tenantLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  removeTenantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    backgroundColor: Colors.danger + '15',
    borderWidth: 1,
    borderColor: Colors.danger + '30',
  },
  removeTenantText: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    fontWeight: '600',
  },
  vacantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  vacantIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacantTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  vacantSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
  },
  assignBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  assignBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  deviceGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  sendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  sendingText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  eventContent: {
    flex: 1,
  },
  eventUser: {
    fontSize: FontSize.sm,
    color: Colors.text,
    fontWeight: '500',
  },
  eventMeta: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    paddingVertical: 12,
  },
  errorText: {
    fontSize: FontSize.lg,
    color: Colors.danger,
    textAlign: 'center',
    marginTop: 100,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '80%',
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
  modalSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  modalBody: {
    padding: Spacing.lg,
    gap: 10,
  },
  selectHint: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  emptyTenantsBox: {
    alignItems: 'center',
    padding: 30,
    gap: 8,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: Radius.md,
  },
  emptyTenantsTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyTenantsText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
  tenantSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  tenantSelectItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  selectName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text,
  },
  selectMeta: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
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
    opacity: 0.5,
  },
});
