import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { borderRadius, spacing } from '../../theme';

export interface TrendPoint {
  label: string; // x-axis label (e.g. day / date)
  value: number | null; // null = no data for this slot
}

interface TrendChartProps {
  data: TrendPoint[];
  /** Fixed max for the y-axis; defaults to the largest value in `data`. */
  maxValue?: number;
  /** Color for the bars; defaults to theme primary. */
  color?: string;
  height?: number;
  /** Suffix shown on the highest bar's value (e.g. '%', 'h'). */
  unit?: string;
  /** Render as a connected line/sparkline instead of bars. */
  variant?: 'bar' | 'line';
}

/**
 * Lightweight, dependency-free trend chart built from plain Views. Renders a
 * row of bars (or a stepped line) sized to each point's value. Used across the
 * athlete-monitoring screens for wellness / workload / fitness trends.
 */
export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  maxValue,
  color,
  height = 120,
  unit = '',
  variant = 'bar',
}) => {
  const theme = useTheme();
  const barColor = color ?? theme.colors.primary;

  const values = data.map((d) => (d.value == null ? 0 : d.value));
  const computedMax = maxValue ?? Math.max(1, ...values);

  if (data.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>No data yet</Text>
      </View>
    );
  }

  return (
    <View>
      <View style={[styles.chart, { height }]}>
        {data.map((point, i) => {
          const hasValue = point.value != null;
          const ratio = hasValue ? Math.min(1, (point.value as number) / computedMax) : 0;
          const barHeight = Math.max(hasValue ? 4 : 0, ratio * (height - 4));
          const isPeak = hasValue && point.value === Math.max(...values);
          return (
            <View key={i} style={styles.column}>
              {isPeak && (
                <Text style={[styles.peakLabel, { color: theme.colors.onSurfaceVariant }]}>
                  {Math.round(point.value as number)}
                  {unit}
                </Text>
              )}
              <View
                style={[
                  variant === 'line' ? styles.dot : styles.bar,
                  {
                    height: variant === 'line' ? 6 : barHeight,
                    marginTop: variant === 'line' ? (height - 6) - barHeight : 0,
                    backgroundColor: hasValue ? barColor : theme.colors.outlineVariant,
                    width: variant === 'line' ? 6 : undefined,
                    borderRadius: variant === 'line' ? 3 : borderRadius.xs,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((point, i) => (
          <View key={i} style={styles.column}>
            {/* Only show a few labels to avoid crowding */}
            {(i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2)) && (
              <Text style={[styles.axisLabel, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
                {point.label}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '80%',
    minHeight: 2,
  },
  dot: {},
  peakLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 2,
  },
  labels: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  axisLabel: {
    fontSize: 9,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
