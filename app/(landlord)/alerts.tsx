import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Header } from '@/components/layout/LayoutComponents';
import { AlertItem } from '@/components/alert/AlertComponents';
import { MOCK_ALERTS } from '@/mocks/alerts';
import { Alert as AlertType, AlertStatus } from '@/types';
import { Colors, Spacing } from '@/constants/theme';

export default function LandlordAlerts() {
  const [alerts, setAlerts] = useState<AlertType[]>(MOCK_ALERTS);

  const handleAcknowledge = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? { ...a, status: AlertStatus.ACKNOWLEDGED, acknowledgedBy: 'Nguyễn Văn An', acknowledgedAt: new Date().toISOString() }
          : a
      )
    );
  };

  const active = alerts.filter((a) => a.status === AlertStatus.ACTIVE);
  const resolved = alerts.filter((a) => a.status !== AlertStatus.ACTIVE);

  return (
    <View style={styles.container}>
      <Header
        title="Cảnh báo"
        subtitle={`${active.length} chưa xử lý`}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Active alerts first */}
        {active.map((alert) => (
          <AlertItem key={alert.id} alert={alert} onAcknowledge={() => handleAcknowledge(alert.id)} />
        ))}
        {/* Resolved */}
        {resolved.map((alert) => (
          <AlertItem key={alert.id} alert={alert} />
        ))}
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
});
