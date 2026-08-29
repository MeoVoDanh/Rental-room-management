import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

interface StatusDotProps {
  active: boolean;
  color?: string;
  size?: number;
}

export function StatusDot({ active, color, size = 8 }: StatusDotProps) {
  const dotColor = color ?? (active ? Colors.success : Colors.textTertiary);
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: dotColor,
        },
        active && { shadowColor: dotColor, shadowOpacity: 0.6, shadowRadius: 4, elevation: 3 },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    shadowOffset: { width: 0, height: 0 },
  },
});
