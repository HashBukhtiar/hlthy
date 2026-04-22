/**
 * ProgressChartCard — visualizes strength/volume trends from the AI coach.
 */
import React, { useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { CartesianChart, Line, Scatter } from 'victory-native';
import { GradientSurface } from '../atoms/GradientSurface';
import { Colors, Layout, Typography } from '@/theme/ai';
import { ACCENT_COLOR } from '@/constants/Colors';
import type { ProgressChartData, ProgressChartPoint } from '@/utils/aiMessage';

interface ProgressChartCardProps {
  data: ProgressChartData;
}

const FALLBACK_COLORS = [ACCENT_COLOR, '#9D4EDD', '#45B7D1', '#3EE68C'];
const CHART_HEIGHT = 220;

type MergedRow = { x: number } & Record<string, number | undefined>;

export const ProgressChartCard: React.FC<ProgressChartCardProps> = ({ data }) => {
  const { mergedData, yKeys, xFormatter } = useMemo(() => buildChartInputs(data), [data]);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.max(240, screenWidth - 48);

  const metricLabel = formatMetric(data.metric, data.unit);

  if (mergedData.length < 2) {
    return (
      <GradientSurface
        gradient={['rgba(16, 17, 20, 0.95)', 'rgba(12, 12, 17, 0.98)']}
        borderGradient={['rgba(255, 45, 85, 0.35)', 'rgba(157, 78, 221, 0.15)']}
        style={{ marginVertical: 8 }}
      >
        <View style={{ padding: Layout.spacing.lg }}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.subtitle}>Not enough data yet — log a few more sessions.</Text>
        </View>
      </GradientSurface>
    );
  }

  return (
    <GradientSurface
      gradient={['rgba(16, 17, 20, 0.95)', 'rgba(12, 12, 17, 0.98)']}
      borderGradient={['rgba(255, 45, 85, 0.35)', 'rgba(157, 78, 221, 0.15)']}
      style={{ marginVertical: 8 }}
    >
      <View style={{ padding: Layout.spacing.lg }}>
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.subtitle}>{metricLabel}</Text>

        <View style={{ height: CHART_HEIGHT, width: chartWidth, marginTop: Layout.spacing.md }}>
          <CartesianChart
            data={mergedData}
            xKey="x"
            yKeys={yKeys}
            padding={{ left: 8, right: 8, top: 12, bottom: 8 }}
            domainPadding={{ left: 12, right: 12, top: 16, bottom: 16 }}
          >
            {({ points }) => (
              <>
                {yKeys.map((key, idx) => {
                  const color =
                    data.series[idx]?.color ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
                  const seriesPoints = points[key];
                  if (!seriesPoints || seriesPoints.length === 0) return null;
                  return (
                    <React.Fragment key={key}>
                      <Line
                        points={seriesPoints}
                        color={color}
                        strokeWidth={2.5}
                        curveType="natural"
                        animate={{ type: 'timing', duration: 400 }}
                      />
                      <Scatter
                        points={seriesPoints}
                        radius={3.5}
                        color={color}
                        animate={{ type: 'timing', duration: 400 }}
                      />
                    </React.Fragment>
                  );
                })}
              </>
            )}
          </CartesianChart>
        </View>

        {/* Legend */}
        {data.series.length > 1 && (
          <View style={styles.legendRow}>
            {data.series.map((s, idx) => (
              <View key={`${s.label}-${idx}`} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendSwatch,
                    { backgroundColor: s.color ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length] },
                  ]}
                />
                <Text style={styles.legendLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Axis labels */}
        <View style={styles.axisRow}>
          <Text style={styles.axisLabel}>
            {data.x_axis_label ?? formatDateRange(mergedData, xFormatter)}
          </Text>
          <Text style={styles.axisLabel}>{data.y_axis_label ?? metricLabel}</Text>
        </View>

        {data.summary ? <Text style={styles.summary}>{data.summary}</Text> : null}
      </View>
    </GradientSurface>
  );
};

function buildChartInputs(data: ProgressChartData): {
  mergedData: MergedRow[];
  yKeys: string[];
  xFormatter: (xValue: number) => string;
} {
  // Sanitize series: drop invalid points, sort by timestamp ascending.
  const sanitized = data.series.slice(0, 4).map((s, idx) => {
    const points = (s.points ?? [])
      .filter((p): p is ProgressChartPoint => !!p && typeof p.value === 'number' && !!p.date)
      .map((p) => ({ ts: parseDateToTs(p.date), value: p.value }))
      .filter((p) => p.ts !== null) as { ts: number; value: number }[];
    points.sort((a, b) => a.ts - b.ts);
    return { key: `s${idx}`, points };
  });

  // Union of all x (date) values across series.
  const xSet = new Set<number>();
  sanitized.forEach((s) => s.points.forEach((p) => xSet.add(p.ts)));
  const xValues = Array.from(xSet).sort((a, b) => a - b);

  const mergedData: MergedRow[] = xValues.map((x) => {
    const row: MergedRow = { x };
    sanitized.forEach((s) => {
      const hit = s.points.find((p) => p.ts === x);
      row[s.key] = hit?.value;
    });
    return row;
  });

  const yKeys = sanitized.map((s) => s.key);

  const xFormatter = (xValue: number) => {
    const date = new Date(xValue);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return { mergedData, yKeys, xFormatter };
}

function parseDateToTs(date: string): number | null {
  // Accept ISO (YYYY-MM-DD) or full ISO datetime.
  const ts = Date.parse(date);
  return Number.isFinite(ts) ? ts : null;
}

function formatMetric(metric: ProgressChartData['metric'], unit: string): string {
  switch (metric) {
    case 'weight':
      return `Weight (${unit})`;
    case 'volume':
      return `Volume (${unit})`;
    case 'reps':
      return 'Reps';
    case 'one_rep_max':
      return `Estimated 1RM (${unit})`;
    default:
      return unit;
  }
}

function formatDateRange(rows: MergedRow[], fmt: (x: number) => string): string {
  if (rows.length === 0) return '';
  const first = fmt(rows[0].x);
  const last = fmt(rows[rows.length - 1].x);
  return first === last ? first : `${first} → ${last}`;
}

const styles = {
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  subtitle: {
    color: Colors.subtext,
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: Layout.gap.md,
    marginTop: Layout.spacing.md,
  },
  legendItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Layout.gap.xs,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
  },
  axisRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginTop: Layout.spacing.sm,
  },
  axisLabel: {
    color: Colors.subtext,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  summary: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    marginTop: Layout.spacing.md,
    fontStyle: 'italic' as const,
  },
};
