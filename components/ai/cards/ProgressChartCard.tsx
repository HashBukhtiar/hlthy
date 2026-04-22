/**
 * ProgressChartCard — visualizes strength/volume trends from the AI coach.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, LayoutChangeEvent } from 'react-native';
import { CartesianChart, Line, Scatter } from 'victory-native';
import { GradientSurface } from '../atoms/GradientSurface';
import { Colors, Layout, Typography } from '@/theme/ai';
import { ACCENT_COLOR } from '@/constants/Colors';
import { logger } from '@/shared/utils/logger';
import type { ProgressChartData } from '@/features/ai/domain/ProgressChart';
import {
  buildChartInputs,
  formatDateRange,
  formatMetric,
} from '@/logic/chartUtils';

interface ProgressChartCardProps {
  data: ProgressChartData;
}

const FALLBACK_COLORS = [ACCENT_COLOR, '#9D4EDD', '#45B7D1', '#3EE68C'];
const CHART_HEIGHT = 220;

export const ProgressChartCard: React.FC<ProgressChartCardProps> = ({ data }) => {
  const { mergedData, yKeys, seriesMeta, duplicateDateCount } = useMemo(
    () => buildChartInputs(data),
    [data],
  );

  const [chartWidth, setChartWidth] = useState<number | null>(null);
  const onContainerLayout = (e: LayoutChangeEvent) => {
    const next = Math.floor(e.nativeEvent.layout.width);
    if (next > 0 && next !== chartWidth) setChartWidth(next);
  };

  if (duplicateDateCount > 0) {
    logger.debug(
      'ProgressChartCard',
      `dropped ${duplicateDateCount} duplicate-timestamp point(s) (last-wins)`,
    );
  }

  const metricLabel = formatMetric(data.metric, data.unit);
  const resolveColor = (idx: number) =>
    seriesMeta[idx]?.color ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];

  const notEnoughData = mergedData.length < 2;

  return (
    <GradientSurface
      gradient={['rgba(16, 17, 20, 0.95)', 'rgba(12, 12, 17, 0.98)']}
      borderGradient={['rgba(255, 45, 85, 0.35)', 'rgba(157, 78, 221, 0.15)']}
      style={{ marginVertical: 8 }}
    >
      <View
        style={{ padding: Layout.spacing.lg }}
        onLayout={onContainerLayout}
      >
        <Text style={styles.title}>{data.title}</Text>
        <Text style={styles.subtitle}>{metricLabel}</Text>

        {notEnoughData ? (
          <Text style={styles.emptyMessage}>
            Not enough data yet — log a few more sessions.
          </Text>
        ) : (
          <>
            <View
              style={{
                height: CHART_HEIGHT,
                width: chartWidth ?? '100%',
                marginTop: Layout.spacing.md,
              }}
            >
              {chartWidth !== null && (
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
                        const color = resolveColor(idx);
                        const seriesPoints = points[key] ?? [];
                        // P0: victory-native <Line> does not handle undefined/NaN y
                        // gracefully. Filter to finite pixel coords only so sparse
                        // multi-series rows don't connect across gaps or crash Skia.
                        const safePoints = seriesPoints.filter(
                          (p: { y: number | null | undefined }) =>
                            typeof p.y === 'number' && Number.isFinite(p.y),
                        );
                        if (safePoints.length === 0) return null;
                        return (
                          <React.Fragment key={key}>
                            <Line
                              points={safePoints}
                              color={color}
                              strokeWidth={2.5}
                              curveType="natural"
                              animate={{ type: 'timing', duration: 400 }}
                            />
                            <Scatter
                              points={safePoints}
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
              )}
            </View>

            {seriesMeta.length > 1 && (
              <View style={styles.legendRow}>
                {seriesMeta.map((s, idx) => (
                  <View key={s.key} style={styles.legendItem}>
                    <View
                      style={[styles.legendSwatch, { backgroundColor: resolveColor(idx) }]}
                    />
                    <Text style={styles.legendLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.axisRow}>
              <Text style={styles.axisLabel}>
                {data.x_axis_label ?? formatDateRange(mergedData)}
              </Text>
              <Text style={styles.axisLabel}>{data.y_axis_label ?? metricLabel}</Text>
            </View>
          </>
        )}

        {data.summary ? <Text style={styles.summary}>{data.summary}</Text> : null}
      </View>
    </GradientSurface>
  );
};

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
  emptyMessage: {
    color: Colors.subtext,
    fontSize: Typography.sizes.sm,
    marginTop: Layout.spacing.md,
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
