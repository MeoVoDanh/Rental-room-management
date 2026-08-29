import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Room } from '@/types';
import { MOCK_TELEMETRY } from '@/mocks/sensors';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusDot } from '@/components/ui/StatusDot';
import { Badge } from '@/components/ui/Badge';
import { Colors, FontSize, Spacing } from '@/constants/theme';

interface RoomCardProps {
  room: Room;
  onPress: () => void;
}

export function RoomCard({ room, onPress }: RoomCardProps) {
  const telemetry = MOCK_TELEMETRY[room.id];

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <GlassCard style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="home" size={20} color={Colors.primary} />
            <Text style={styles.roomName}>{room.name}</Text>
            <StatusDot active={room.state.nodeOnline} />
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </View>

        {/* Tenant */}
        {room.tenantName && (
          <View style={styles.tenantRow}>
            <Ionicons name="person" size={14} color={Colors.textTertiary} />
            <Text style={styles.tenantText}>{room.tenantName}</Text>
          </View>
        )}

        {/* Device Status */}
        <View style={styles.deviceRow}>
          <DeviceChip icon="bulb" label="Đèn" active={room.state.lightOn} />
          <DeviceChip
            icon={room.state.lockOpen ? 'lock-open' : 'lock-closed'}
            label="Khóa"
            active={room.state.lockOpen}
          />
          <DeviceChip
            icon={room.state.doorOpen ? 'enter' : 'exit'}
            label="Cửa"
            active={room.state.doorOpen}
            danger={room.state.doorOpen && !room.state.lockOpen}
          />
        </View>

        {/* Telemetry */}
        {telemetry && (
          <View style={styles.telemetryRow}>
            <TelemetryItem icon="thermometer" value={`${telemetry.temperature}°C`} color={Colors.warningLight} />
            <TelemetryItem icon="water" value={`${telemetry.humidity}%`} color={Colors.primaryLight} />
            <TelemetryItem
              icon="flame"
              value={`${telemetry.gasRaw}`}
              color={telemetry.isGasDanger ? Colors.danger : Colors.success}
            />
          </View>
        )}
      </GlassCard>
    </TouchableOpacity>
  );
}

function DeviceChip({
  icon,
  label,
  active,
  danger,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  active: boolean;
  danger?: boolean;
}) {
  const color = danger ? Colors.danger : active ? Colors.primary : Colors.textTertiary;
  return (
    <View style={[styles.chip, active && { backgroundColor: Colors.primaryMuted }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function TelemetryItem({
  icon,
  value,
  color,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  color: string;
}) {
  return (
    <View style={styles.telemetryItem}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.telemetryValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roomName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tenantText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  deviceRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: Colors.backgroundTertiary,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  telemetryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  telemetryValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
