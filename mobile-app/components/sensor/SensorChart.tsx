import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { GlassCard } from '@/components/ui/GlassCard';
import { Colors, FontSize } from '@/constants/theme';
import { SensorReading } from '@/types';

interface SensorChartProps {
  readings: SensorReading[];
  title?: string;
}

const MAX_CHART_POINTS = 48;

function sampleReadings(readings: SensorReading[]) {
  if (readings.length <= MAX_CHART_POINTS) return readings;
  const step = (readings.length - 1) / (MAX_CHART_POINTS - 1);
  return Array.from({ length: MAX_CHART_POINTS }, (_, index) =>
    readings[Math.round(index * step)]
  );
}

function timeLabel(timestamp: string) {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes()
  ).padStart(2, '0')}`;
}

export function SensorChart({ readings, title = 'Biểu đồ cảm biến 24h' }: SensorChartProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const points = useMemo(() => sampleReadings(readings), [readings]);

  const onLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(Math.floor(event.nativeEvent.layout.width));
  };

  const chartWidth = Math.max(280, containerWidth - 16);

  return (
    <GlassCard noPadding>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{points.length} điểm hiển thị • tự cập nhật</Text>
      </View>
      <View style={styles.charts} onLayout={onLayout}>
        {containerWidth > 0 && (
          <>
            <MetricChart title="Nhiệt độ (°C)" color={Colors.warningLight}
              times={points.map((reading) => timeLabel(reading.timestamp))}
              values={points.map((reading) => Number(reading.temperature) || 0)} width={chartWidth} decimals={1} />
            <MetricChart title="Độ ẩm (%)" color={Colors.primaryLight}
              times={points.map((reading) => timeLabel(reading.timestamp))}
              values={points.map((reading) => Number(reading.humidity) || 0)} width={chartWidth} decimals={1} />
            <MetricChart title="Khí gas MQ-2 (ADC)" color={Colors.success}
              times={points.map((reading) => timeLabel(reading.timestamp))}
              values={points.map((reading) => Number(reading.gasRaw) || 0)} width={chartWidth} decimals={0} />
          </>
        )}
      </View>
    </GlassCard>
  );
}

interface MetricChartProps {
  title: string;
  color: string;
  times: string[];
  values: number[];
  width: number;
  decimals: number;
}

function MetricChart({ title, color, times, values, width, decimals }: MetricChartProps) {
  const safeValues = values.length > 0 ? values : [0];
  const latestValue = safeValues[safeValues.length - 1];
  const minValue = Math.min(...safeValues);
  const maxValue = Math.max(...safeValues);
  const formatValue = (value: number) => value.toFixed(decimals);
  const chartHeight = 150;
  const chartPadding = 8;
  const drawableWidth = Math.max(1, width - chartPadding * 2);
  const drawableHeight = chartHeight - chartPadding * 2;
  const valueRange = Math.max(1, maxValue - minValue);
  const coordinates = safeValues.map((value, index) => {
    const x = chartPadding + (safeValues.length === 1 ? drawableWidth / 2 : (index / (safeValues.length - 1)) * drawableWidth);
    const y = chartPadding + ((maxValue - value) / valueRange) * drawableHeight;
    return { x, y };
  });
  const pointString = coordinates.map(({ x, y }) => `${x},${y}`).join(' ');
  const firstTime = times[0] ?? '';
  const middleTime = times[Math.floor(times.length / 2)] ?? '';
  const lastTime = times[times.length - 1] ?? '';

  return (
    <View style={styles.metric}>
      <View style={styles.metricHeader}>
        <Text style={[styles.metricTitle, { color }]}>{title}</Text>
        <Text style={[styles.latestValue, { color }]}>{formatValue(latestValue)}</Text>
      </View>
      <View style={styles.rangeRow}>
        <Text style={styles.rangeText}>Thấp nhất: {formatValue(minValue)}</Text>
        <Text style={styles.rangeText}>Cao nhất: {formatValue(maxValue)}</Text>
      </View>
      <View style={[styles.chart, { width, height: chartHeight }]}>
        <Svg width={width} height={chartHeight}>
          {[0, 1, 2, 3, 4].map((row) => {
            const y = chartPadding + (row / 4) * drawableHeight;
            return <Line key={row} x1={chartPadding} y1={y} x2={width - chartPadding} y2={y} stroke={Colors.borderLight} strokeWidth={1} />;
          })}
          <Polyline points={pointString} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {coordinates.map(({ x, y }, index) => (
            <Circle key={index} cx={x} cy={y} r={2.5} fill={color} />
          ))}
        </Svg>
      </View>
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{firstTime}</Text>
        <Text style={styles.timeText}>{middleTime}</Text>
        <Text style={styles.timeText}>{lastTime}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, paddingBottom: 6 },
  title: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  subtitle: { marginTop: 3, fontSize: FontSize.xs, color: Colors.textTertiary },
  charts: { width: '100%', paddingHorizontal: 8, paddingBottom: 12 },
  metric: { marginTop: 8 },
  metricHeader: { marginHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricTitle: { fontSize: FontSize.sm, fontWeight: '600' },
  latestValue: { fontSize: FontSize.lg, fontWeight: '700' },
  rangeRow: { marginHorizontal: 12, marginTop: 2, flexDirection: 'row', gap: 16 },
  rangeText: { fontSize: FontSize.xs, color: Colors.textTertiary },
  chart: { marginTop: 6, borderRadius: 14, overflow: 'hidden', backgroundColor: Colors.surface },
  timeRow: { marginHorizontal: 8, marginTop: 2, flexDirection: 'row', justifyContent: 'space-between' },
  timeText: { fontSize: FontSize.xs, color: Colors.textTertiary },
});
