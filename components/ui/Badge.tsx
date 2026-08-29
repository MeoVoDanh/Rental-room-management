import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, FontSize } from '@/constants/theme';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: Colors.successMuted, text: Colors.success },
  warning: { bg: Colors.warningMuted, text: Colors.warning },
  danger: { bg: Colors.dangerMuted, text: Colors.danger },
  info: { bg: Colors.primaryMuted, text: Colors.primary },
  neutral: { bg: Colors.backgroundTertiary, text: Colors.textSecondary },
};

export function Badge({ label, variant = 'neutral', size = 'sm' }: BadgeProps) {
  const c = VARIANT_COLORS[variant];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, size === 'md' && styles.md]}>
      <Text style={[styles.label, { color: c.text }, size === 'md' && styles.mdText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  md: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mdText: {
    fontSize: FontSize.sm,
  },
});
