import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  noPadding?: boolean;
  accent?: string;
}

export function GlassCard({ children, style, noPadding, accent, ...props }: GlassCardProps) {
  return (
    <View
      style={[
        styles.card,
        accent && { borderLeftWidth: 3, borderLeftColor: accent },
        noPadding && { padding: 0 },
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glass,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 16,
  },
});
