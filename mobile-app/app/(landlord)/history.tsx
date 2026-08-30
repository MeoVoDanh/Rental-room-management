import React from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/layout/LayoutComponents';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { useAccessEvents } from '@/hooks/useAccessEvents';
import { useCommands } from '@/hooks/useCommands';
import { CommandStatus } from '@/types';
import { Colors, FontSize, Spacing } from '@/constants/theme';

export default function LandlordHistory() {
  const { events, isLoading: eventsLoading } = useAccessEvents(undefined, 30);
  const { commands, isLoading: commandsLoading } = useCommands();

  return (
    <View style={styles.container}>
      <Header title="Lịch sử" subtitle="Truy cập & điều khiển" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Access Events */}
        <Text style={styles.sectionTitle}>Lịch sử truy cập</Text>
        {eventsLoading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : (
          events.map((evt) => (
            <GlassCard key={evt.id} accent={evt.result === 'granted' ? Colors.success : Colors.danger}>
              <View style={styles.row}>
                <Ionicons
                  name={evt.result === 'granted' ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={evt.result === 'granted' ? Colors.success : Colors.danger}
                />
                <View style={styles.content}>
                  <Text style={styles.userName}>{evt.userName}</Text>
                  <Text style={styles.meta}>
                    {evt.roomName} • {evt.method.toUpperCase()} • {formatDateTime(evt.timestamp)}
                  </Text>
                </View>
                <Badge
                  label={evt.result === 'granted' ? 'Cho phép' : 'Từ chối'}
                  variant={evt.result === 'granted' ? 'success' : 'danger'}
                />
              </View>
            </GlassCard>
          ))
        )}

        {/* Control Commands */}
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Lệnh điều khiển</Text>
        {commandsLoading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : (
          commands.map((cmd) => (
            <GlassCard
              key={cmd.id}
              accent={
                cmd.status === CommandStatus.COMPLETED
                  ? Colors.success
                  : cmd.status === CommandStatus.FAILED
                  ? Colors.danger
                  : Colors.warning
              }>
              <View style={styles.row}>
                <Ionicons
                  name={
                    cmd.status === CommandStatus.COMPLETED
                      ? 'checkmark-done'
                      : cmd.status === CommandStatus.FAILED
                      ? 'close'
                      : 'hourglass'
                  }
                  size={20}
                  color={
                    cmd.status === CommandStatus.COMPLETED
                      ? Colors.success
                      : cmd.status === CommandStatus.FAILED
                      ? Colors.danger
                      : Colors.warning
                  }
                />
                <View style={styles.content}>
                  <Text style={styles.userName}>{cmd.issuedByName}</Text>
                  <Text style={styles.meta}>
                    {cmd.commandType.replace(/_/g, ' ')} • {formatDateTime(cmd.createdAt)}
                  </Text>
                </View>
                <Badge
                  label={
                    cmd.status === CommandStatus.COMPLETED
                      ? 'Hoàn thành'
                      : cmd.status === CommandStatus.FAILED
                      ? 'Thất bại'
                      : 'Đang chờ'
                  }
                  variant={
                    cmd.status === CommandStatus.COMPLETED
                      ? 'success'
                      : cmd.status === CommandStatus.FAILED
                      ? 'danger'
                      : 'warning'
                  }
                />
              </View>
            </GlassCard>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()}/${d.getMonth() + 1}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: 8,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  loader: {
    marginVertical: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  content: { flex: 1 },
  userName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});
