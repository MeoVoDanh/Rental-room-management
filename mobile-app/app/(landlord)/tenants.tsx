import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header, EmptyState } from '@/components/layout/LayoutComponents';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { useTenants } from '@/hooks/useTenants';
import { Colors, Spacing, FontSize, Radius } from '@/constants/theme';

export default function LandlordTenantsScreen() {
  const { tenants, isLoading, error, refetch, createTenant } = useTenants();

  const [modalVisible, setModalVisible] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('123456');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleOpenModal = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setPassword('123456');
    setCreateError('');
    setModalVisible(true);
  };

  const handleConfirmCreate = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setCreateError('Vui lòng nhập đầy đủ tên, email và mật khẩu');
      return;
    }
    if (password.length < 6) {
      setCreateError('Mật khẩu tối thiểu 6 ký tự');
      return;
    }

    setCreateError('');
    setIsCreating(true);
    try {
      await createTenant({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phone.trim(),
      });

      setModalVisible(false);
      Alert.alert(
        'Tạo người thuê thành công!',
        `Thông tin tài khoản:\n- Người thuê: ${fullName.trim()}\n- Email: ${email.trim()}\n- Mật khẩu: ${password}\n\nBạn có thể vào tab "Phòng" để gán phòng cho người thuê này bất kỳ lúc nào.`,
        [{ text: 'Đã hiểu' }]
      );
    } catch (e: any) {
      setCreateError(e.message ?? 'Không thể tạo tài khoản người thuê');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Người thuê"
        subtitle={isLoading ? 'Đang tải...' : `${tenants.length} người thuê`}
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleOpenModal}
            activeOpacity={0.8}>
            <Ionicons name="person-add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Thêm người thuê</Text>
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
            <Text style={styles.loadingText}>Đang tải danh sách người thuê...</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : tenants.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="people-outline"
              title="Chưa có người thuê nào"
              message="Tạo tài khoản người thuê trước, sau đó bạn có thể gán họ vào phòng bất kỳ lúc nào."
            />
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={handleOpenModal}
              activeOpacity={0.85}>
              <Ionicons name="person-add-outline" size={20} color="#fff" />
              <Text style={styles.emptyActionBtnText}>Tạo người thuê đầu tiên</Text>
            </TouchableOpacity>
          </View>
        ) : (
          tenants.map((tenant) => (
            <GlassCard key={tenant.id}>
              <View style={styles.tenantRow}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={22} color={Colors.primary} />
                </View>
                <View style={styles.tenantInfo}>
                  <Text style={styles.tenantName}>{tenant.fullName}</Text>
                  <Text style={styles.tenantMeta}>
                    {tenant.phone ? `SĐT: ${tenant.phone}` : 'Chưa có số điện thoại'}
                  </Text>
                </View>
                <Badge
                  label={tenant.assignedRoomId ? `Phòng ${tenant.assignedRoomId}` : 'Chưa gán phòng'}
                  variant={tenant.assignedRoomId ? 'success' : 'warning'}
                />
              </View>
            </GlassCard>
          ))
        )}
      </ScrollView>

      {/* Modal Tạo Người thuê mới */}
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
              <View>
                <Text style={styles.modalTitle}>Tạo tài khoản người thuê</Text>
                <Text style={styles.modalSubtitle}>Tạo tài khoản trước, gán phòng sau</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled">
              {/* Họ tên */}
              <View>
                <Text style={styles.inputLabel}>Họ và tên người thuê *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ví dụ: Nguyễn Văn B"
                  placeholderTextColor={Colors.textTertiary}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              {/* Email */}
              <View>
                <Text style={styles.inputLabel}>Email đăng nhập *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="nguoithue@example.com"
                  placeholderTextColor={Colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Phone */}
              <View>
                <Text style={styles.inputLabel}>Số điện thoại</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="09xx xxx xxx"
                  placeholderTextColor={Colors.textTertiary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Mật khẩu */}
              <View>
                <Text style={styles.inputLabel}>Mật khẩu đăng nhập ban đầu *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Tối thiểu 6 ký tự"
                  placeholderTextColor={Colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                />
                <Text style={styles.hintText}>
                  Người thuê dùng Email & Mật khẩu này để đăng nhập vào ứng dụng.
                </Text>
              </View>

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
                  onPress={handleConfirmCreate}
                  disabled={isCreating}>
                  {isCreating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.confirmBtnText}>Tạo tài khoản</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    gap: 10,
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.md,
    gap: 6,
  },
  addBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#fff',
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenantInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  tenantMeta: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
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
    maxHeight: '90%',
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
