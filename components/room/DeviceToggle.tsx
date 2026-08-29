import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, FontSize } from '@/constants/theme';

interface DeviceToggleProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  isOn: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function DeviceToggle({ icon, label, isOn, onToggle, disabled }: DeviceToggleProps) {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    setLoading(true);
    // Simulate command delay
    setTimeout(() => {
      onToggle();
      setLoading(false);
    }, 800);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isOn && styles.containerActive,
        disabled && styles.containerDisabled,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator size={28} color={isOn ? Colors.primary : Colors.textTertiary} />
      ) : (
        <Ionicons
          name={icon}
          size={28}
          color={isOn ? Colors.primary : Colors.textTertiary}
        />
      )}
      <Text style={[styles.label, isOn && styles.labelActive]}>{label}</Text>
      <View style={[styles.statusDot, isOn && styles.statusDotActive]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: Radius.lg,
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    minWidth: 90,
    flex: 1,
  },
  containerActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary + '40',
  },
  containerDisabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  labelActive: {
    color: Colors.primary,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textTertiary,
  },
  statusDotActive: {
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
});
