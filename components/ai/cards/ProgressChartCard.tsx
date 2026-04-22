/**
 * ProgressChartCard — visualizes strength/volume trends from the AI coach.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, LayoutChangeEvent, Pressable } from 'react-native';
import { CartesianChart, Line, Scatter, useChartPressState } from 'victory-native';
import { Circle as SkCircle } from '@shopify/react-native-skia';
import { GradientSurface } from '../atoms/GradientSurface';
import { Colors, Layout, Typography } from '@/theme/ai';
import { ACCENT_COLOR } from '@/constants/Colors';
import { logger } from '@/shared/utils/logger';
import type { ProgressChartData } from '@/features/ai/domain/ProgressChart';
import {
  buildChartInputs,
  formatDateRange,
  formatMetric,
  formatShortDate,
} from '@/logic/chartUtils';
import { useDerivedValue } from 'react-native-reanimated';
import { ChartRangeControl } from '@/components/insights/ChartRangeControl';
import type { TimeRangeDays } from '@/components/insights/TimeRangeSelector';

interface ProgressChartCardProps {
  data: ProgressChartData;
  /** Enable legend-toggle and tap-for-tooltip. Default false (chat cards stay quiet). */
  interactive?: boolean;
  /** Optional per-chart time range. When both are provided, a compact range
   *  selector renders in the card header. */
  range?: TimeRangeDays;
  onRangeChange?: (r: TimeRangeDays) => void;
}

const FALLBACK_COLORS = [ACCENT_COLOR, '#9D4EDD', '#45B7D1', '#3EE68C'];
const CHART_HEIGHT = 220;

export const ProgressChartCard: React.FC<ProgressChartCardProps> = ({
  data,
  interactive = false,
  range,
  onRangeChange,
}) => {
  const showRangeControl = range !== undefined && !!onRangeChange;
  const { mergedData, yKeys, seriesMeta, duplicateDateCount } = useMemo(
    () => buildChartInputs(data),
    [data],
  );

  const [chartWidth, setChartWidth] = useState<number | null>(null);
  const [soloKey, setSoloKey] = useState<string | null>(null);
  const onContainerLayout = (e: LayoutChangeEvent) => {
    const next = Math.floor(e.nativeEvent.layout.width);
    if (next > 0 && next !== chartWidth) setChartWidth(next);
  };

  // Chart press — shared values that track user tap position across the chart.
  // Initialized to 0 (values are replaced by the first press). The library's
  // generic is narrow; cast through `any` since our yKeys are dynamic.
  const initialY: Record<string, number> = {};
  yKeys.forEach((k) => {
    initialY[k] = 0;
  });
  const { state: pressState, isActive } = useChartPressState({ x: 0, y: initialY } as AnyPressState);

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
  const toggleSolo = (key: string) =>
    setSoloKey((cur) => (cur === key ? null : key));

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
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{data.title}</Text>
            <Text style={styles.subtitle}>{metricLabel}</Text>
          </View>
          {showRangeControl ? (
            <ChartRangeControl value={range!} onChange={onRangeChange!} />
          ) : null}
        </View>

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
                  chartPressState={interactive ? pressState : undefined}
                >
                  {({ points }) => (
                    <>
                      {yKeys.map((key, idx) => {
                        const color = resolveColor(idx);
                        const seriesPoints = points[key] ?? [];
                        const safePoints = seriesPoints.filter(
                          (p: { y: number | null | undefined }) =>
                            typeof p.y === 'number' && Number.isFinite(p.y),
                        );
                        if (safePoints.length === 0) return null;
                        const isDimmed = soloKey !== null && soloKey !== key;
                        const strokeWidth = isDimmed ? 1.25 : soloKey === key ? 3 : 2.5;
                        return (
                          <React.Fragment key={key}>
                            <Line
                              points={safePoints}
                              color={color}
                              strokeWidth={strokeWidth}
                              curveType="natural"
                              animate={{ type: 'timing', duration: 400 }}
                              opacity={isDimmed ? 0.2 : 1}
                            />
                            <Scatter
                              points={safePoints}
                              radius={3.5}
                              color={color}
                              animate={{ type: 'timing', duration: 400 }}
                              opacity={isDimmed ? 0.2 : 1}
                            />
                          </React.Fragment>
                        );
                      })}
                      {/* Active touch indicator — a ring follows the user's finger
                          along the x-axis of the first series (or the soloed one). */}
                      {interactive ? (
                        <ActiveCursor
                          pressState={pressState}
                          isActive={isActive}
                          keyName={soloKey ?? yKeys[0]}
                          color={resolveColor(
                            Math.max(
                              0,
                              yKeys.findIndex((k) => k === (soloKey ?? yKeys[0])),
                            ),
                          )}
                        />
                      ) : null}
                    </>
                  )}
                </CartesianChart>
              )}

              {/* Tooltip above the chart when press is active */}
              {interactive && isActive ? (
                <PressTooltip
                  pressState={pressState}
                  keyName={soloKey ?? yKeys[0]}
                  unit={data.unit}
                />
              ) : null}
            </View>

            {seriesMeta.length > 1 && (
              <View style={styles.legendRow}>
                {seriesMeta.map((s, idx) => {
                  const isSoloed = soloKey === s.key;
                  const isDimmed = soloKey !== null && !isSoloed;
                  const color = resolveColor(idx);
                  const Body = (
                    <View
                      style={[
                        styles.legendItem,
                        interactive && styles.legendItemInteractive,
                        interactive && isSoloed && styles.legendItemActive,
                        isDimmed && styles.legendItemDimmed,
                      ]}
                    >
                      <View
                        style={[styles.legendSwatch, { backgroundColor: color }]}
                      />
                      <Text style={styles.legendLabel}>{s.label}</Text>
                    </View>
                  );
                  if (!interactive) return <View key={s.key}>{Body}</View>;
                  return (
                    <Pressable key={s.key} onPress={() => toggleSolo(s.key)} hitSlop={6}>
                      {Body}
                    </Pressable>
                  );
                })}
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

// ── Active cursor + press tooltip ─────────────────────────────────────────

// victory-native's ChartPressState generic is strict about known keys. Since
// we pass dynamic yKeys (one per series), we fall back to `any` at these
// helper boundaries — the SharedValues we read are still runtime-correct.
type AnyPressState = any;

const ActiveCursor: React.FC<{
  pressState: AnyPressState;
  isActive: boolean;
  keyName: string;
  color: string;
}> = ({ pressState, isActive, keyName, color }) => {
  const cx = useDerivedValue(() => pressState.x.position.value);
  const cy = useDerivedValue(() => pressState.y[keyName]?.position?.value ?? 0);
  if (!isActive) return null;
  return (
    <>
      <SkCircle cx={cx} cy={cy} r={8} color={`${color}55`} />
      <SkCircle cx={cx} cy={cy} r={4} color={color} />
    </>
  );
};

const PressTooltip: React.FC<{
  pressState: AnyPressState;
  keyName: string;
  unit: string;
}> = ({ pressState, keyName, unit }) => {
  // Sample shared values via useDerivedValue → read .value inside render.
  const xVal = useDerivedValue(() => pressState.x.value.value);
  const yVal = useDerivedValue(() => pressState.y[keyName]?.value?.value ?? 0);
  const [snap, setSnap] = useState<{ date: string; val: number } | null>(null);
  // Poll ~20fps while active (Reanimated values don't trigger React re-renders).
  React.useEffect(() => {
    const id = setInterval(() => {
      const ts = xVal.value;
      const v = yVal.value;
      if (typeof ts !== 'number' || !Number.isFinite(ts)) return;
      setSnap({ date: formatShortDate(ts), val: Math.round(v) });
    }, 50);
    return () => clearInterval(id);
  }, [xVal, yVal]);
  if (!snap) return null;
  return (
    <View style={tooltipStyles.wrap} pointerEvents="none">
      <Text style={tooltipStyles.date}>{snap.date}</Text>
      <Text style={tooltipStyles.value}>
        {snap.val} <Text style={tooltipStyles.unit}>{unit}</Text>
      </Text>
    </View>
  );
};

const tooltipStyles = {
  wrap: {
    position: 'absolute' as const,
    top: Layout.spacing.md,
    right: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.radius.chip,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'flex-end' as const,
  },
  date: {
    color: Colors.subtext,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  value: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
    fontVariant: ['tabular-nums' as const],
  },
  unit: {
    color: Colors.subtext,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
};

const styles = {
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: Layout.gap.md,
    marginBottom: 2,
  },
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
  legendItemInteractive: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.radius.chip,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  legendItemActive: {
    borderColor: 'rgba(255, 255, 255, 0.25)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  legendItemDimmed: {
    opacity: 0.45,
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
