import React from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Header } from '@/components/layout/LayoutComponents';
import { AlertItem } from '@/components/alert/AlertComponents';
import { useAlerts } from '@/hooks/useAlerts';
import { useAuth } from '@/hooks/useAuth';
import { AlertStatus } from '@/types';
import { Colors, Spacing, FontSize } from '@/constants/theme';

export default function LandlordAlerts() {
  const { user } = useAuth();
  const { alerts, isLoading, acknowledge } = useAlerts();

  const handleAcknowledge = async (alertId: string) => {
    if (!user) return;
    await acknowledge(alertId, user.id);
  };

  const active = alerts.filter((a) => a.status === AlertStatus.ACTIVE);
  const resolved = alerts.filter((a) => a.status !== AlertStatus.ACTIVE);

  return (
    <View style={styles.container}>
      <Header
        title="Cảnh báo"
        subtitle={isLoading ? '...' : `${active.length} chưa xử lý`}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>Đang tải cảnh báo...</Text>
          </View>
        ) : (
          <>
            {active.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onAcknowledge={() => handleAcknowledge(alert.id)}
              />
            ))}
            {resolved.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </>
        )}
      </ScrollView>
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
});
