import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Alert as AlertType, AlertSeverity, AlertStatus, AlertType as AlertTypeEnum } from '@/types';
import { Colors, Radius, FontSize, Spacing } from '@/constants/theme';
import { Badge } from '@/components/ui/Badge';

interface AlertBannerProps {
  alert: AlertType;
  onPress?: () => void;
}

const SEVERITY_CONFIG = {
  [AlertSeverity.CRITICAL]: { color: Colors.danger, icon: 'alert-circle' as const, bg: Colors.dangerMuted },
  [AlertSeverity.WARNING]: { color: Colors.warning, icon: 'warning' as const, bg: Colors.warningMuted },
  [AlertSeverity.INFO]: { color: Colors.primary, icon: 'information-circle' as const, bg: Colors.primaryMuted },
};

const ALERT_TYPE_LABELS: Record<AlertTypeEnum, string> = {
  [AlertTypeEnum.GAS_LEAK]: 'Rò rỉ gas',
  [AlertTypeEnum.HIGH_TEMPERATURE]: 'Nhiệt độ cao',
  [AlertTypeEnum.DOOR_OPEN_TOO_LONG]: 'Cửa mở quá lâu',
  [AlertTypeEnum.DOOR_FORCED]: 'Cửa bị cưỡng bức',
  [AlertTypeEnum.NODE_OFFLINE]: 'Node mất kết nối',
};

export function AlertBanner({ alert, onPress }: AlertBannerProps) {
  const config = SEVERITY_CONFIG[alert.severity];

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: config.bg, borderLeftColor: config.color }]}
      onPress={onPress}
      activeOpacity={0.8}>
      <Ionicons name={config.icon} size={24} color={config.color} />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: config.color }]}>
            {ALERT_TYPE_LABELS[alert.type]}
          </Text>
          <Badge
            label={alert.status === AlertStatus.ACTIVE ? 'Đang hoạt động' : 'Đã xử lý'}
            variant={alert.status === AlertStatus.ACTIVE ? 'danger' : 'success'}
          />
        </View>
        <Text style={styles.room}>{alert.roomName}</Text>
        <Text style={styles.message} numberOfLines={2}>{alert.message}</Text>
      </View>
    </TouchableOpacity>
  );
}

interface AlertItemProps {
  alert: AlertType;
  onAcknowledge?: () => void;
}

export function AlertItem({ alert, onAcknowledge }: AlertItemProps) {
  const config = SEVERITY_CONFIG[alert.severity];
  const timeAgo = getTimeAgo(alert.createdAt);

  return (
    <View style={[styles.itemContainer, { borderLeftColor: config.color }]}>
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleRow}>
          <Ionicons name={config.icon} size={18} color={config.color} />
          <Text style={[styles.itemTitle, { color: config.color }]}>
            {ALERT_TYPE_LABELS[alert.type]}
          </Text>
        </View>
        <Badge
          label={
            alert.status === AlertStatus.ACTIVE
              ? 'Chưa xử lý'
              : alert.status === AlertStatus.ACKNOWLEDGED
              ? 'Đã xác nhận'
              : 'Đã giải quyết'
          }
          variant={
            alert.status === AlertStatus.ACTIVE
              ? 'danger'
              : alert.status === AlertStatus.ACKNOWLEDGED
              ? 'warning'
              : 'success'
          }
        />
      </View>

      <Text style={styles.itemRoom}>{alert.roomName}</Text>
      <Text style={styles.itemMessage}>{alert.message}</Text>
      <View style={styles.itemFooter}>
        <Text style={styles.timeText}>{timeAgo}</Text>
        {alert.status === AlertStatus.ACTIVE && onAcknowledge && (
          <TouchableOpacity style={styles.ackButton} onPress={onAcknowledge}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
            <Text style={styles.ackText}>Xác nhận</Text>
          </TouchableOpacity>
        )}
        {alert.acknowledgedBy && (
          <Text style={styles.ackByText}>Xác nhận bởi: {alert.acknowledgedBy}</Text>
        )}
      </View>
    </View>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

const styles = StyleSheet.create({
  // AlertBanner styles
  container: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: Radius.md,
    borderLeftWidth: 4,
    gap: 12,
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  room: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  message: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // AlertItem styles
  itemContainer: {
    backgroundColor: Colors.glass,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: 14,
    gap: 6,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  itemRoom: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  itemMessage: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    lineHeight: 18,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  ackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.successMuted,
  },
  ackText: {
    fontSize: FontSize.xs,
    color: Colors.success,
    fontWeight: '600',
  },
  ackByText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
});
