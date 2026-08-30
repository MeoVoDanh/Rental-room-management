import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '@/components/ui/GlassCard';
import { Colors, FontSize } from '@/constants/theme';

interface EnvironmentCardProps {
  temperature: number;
  humidity: number;
  gasRaw: number;
  gasThreshold: number;
  isGasDanger: boolean;
}

export function EnvironmentCard({ temperature, humidity, gasRaw, gasThreshold, isGasDanger }: EnvironmentCardProps) {
  return (
    <GlassCard>
      <Text style={styles.title}>Môi trường</Text>
      <View style={styles.grid}>
        <MetricBox
          icon="thermometer"
          label="Nhiệt độ"
          value={`${temperature}°C`}
          color={temperature > 35 ? Colors.danger : temperature > 30 ? Colors.warning : Colors.primaryLight}
        />
        <MetricBox
          icon="water"
          label="Độ ẩm"
          value={`${humidity}%`}
          color={Colors.accent}
        />
        <MetricBox
          icon="flame"
          label="Gas"
          value={`${gasRaw}`}
          subtitle={`/${gasThreshold}`}
          color={isGasDanger ? Colors.danger : Colors.success}
        />
      </View>
    </GlassCard>
  );
}

function MetricBox({
  icon,
  label,
  value,
  subtitle,
  color,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  subtitle?: string;
  color: string;
}) {
  return (
    <View style={styles.metricBox}>
      <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  metricValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  metricSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
});
