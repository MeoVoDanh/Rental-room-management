import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (role: UserRole) => {
    await login(role);
    if (role === UserRole.LANDLORD) {
      router.replace('/(landlord)/dashboard' as any);
    } else {
      router.replace('/(tenant)/dashboard' as any);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo & Title */}
      <View style={styles.logoSection}>
        <View style={styles.logoCircle}>
          <Ionicons name="home" size={48} color={Colors.primary} />
        </View>
        <Text style={styles.appTitle}>Smart Room</Text>
        <Text style={styles.appSubtitle}>Hệ thống quản lý phòng trọ thông minh</Text>
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark" size={18} color={Colors.success} />
          <Text style={styles.infoText}>Giám sát & điều khiển từ xa</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="notifications" size={18} color={Colors.warning} />
          <Text style={styles.infoText}>Cảnh báo an toàn thời gian thực</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="lock-closed" size={18} color={Colors.primary} />
          <Text style={styles.infoText}>Phân quyền chủ trọ / người thuê</Text>
        </View>
      </View>

      {/* Login Buttons */}
      <View style={styles.buttonSection}>
        <Text style={styles.loginLabel}>Chọn vai trò để đăng nhập (Demo)</Text>
        <Button
          title="Đăng nhập Chủ nhà trọ"
          onPress={() => handleLogin(UserRole.LANDLORD)}
          icon={<Ionicons name="business" size={20} color="#fff" />}
          fullWidth
        />
        <Button
          title="Đăng nhập Người thuê"
          onPress={() => handleLogin(UserRole.TENANT)}
          variant="secondary"
          icon={<Ionicons name="person" size={20} color={Colors.primary} />}
          fullWidth
        />
      </View>

      {/* Footer */}
      <Text style={styles.footer}>Smart Room Portal v1.0 • IoT Project Demo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing['2xl'],
    justifyContent: 'center',
    gap: 32,
  },
  logoSection: {
    alignItems: 'center',
    gap: 12,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary + '40',
  },
  appTitle: {
    fontSize: FontSize['3xl'],
    fontWeight: '800',
    color: Colors.text,
  },
  appSubtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: Colors.glass,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 20,
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  buttonSection: {
    gap: 12,
  },
  loginLabel: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginBottom: 4,
  },
  footer: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
  },
});
