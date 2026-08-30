import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { GlassCard } from '@/components/ui/GlassCard';
import { Colors, FontSize } from '@/constants/theme';
import { SensorReading } from '@/types';

interface SensorChartProps {
  readings: SensorReading[];
  title?: string;
}

export function SensorChart({ readings, title = 'Biểu đồ cảm biến 24h' }: SensorChartProps) {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 64; // padding

  // Take every 3rd reading for cleaner labels
  const labels = readings
    .filter((_, i) => i % 3 === 0)
    .map((r) => {
      const d = new Date(r.timestamp);
      return `${d.getHours()}h`;
    });

  const tempData = readings.map((r) => r.temperature);
  const humidData = readings.map((r) => r.humidity);

  return (
    <GlassCard noPadding>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <LineChart
        data={{
          labels,
          datasets: [
            {
              data: tempData,
              color: () => Colors.warningLight,
              strokeWidth: 2,
            },
            {
              data: humidData,
              color: () => Colors.primaryLight,
              strokeWidth: 2,
            },
          ],
          legend: ['Nhiệt độ (°C)', 'Độ ẩm (%)'],
        }}
        width={chartWidth}
        height={200}
        chartConfig={{
          backgroundColor: 'transparent',
          backgroundGradientFrom: Colors.surface,
          backgroundGradientTo: Colors.surface,
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
          labelColor: () => Colors.textTertiary,
          propsForDots: {
            r: '3',
          },
          propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: Colors.borderLight,
          },
        }}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={false}
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 16,
    paddingBottom: 4,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  chart: {
    borderRadius: 16,
    paddingRight: 16,
  },
});
