/**
 * StrengthCurveCard — line chart for a single exercise's progression,
 * with PR markers (flame badge) and optional projected-next-PR marker.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, LayoutChangeEvent } from 'react-native';
import { CartesianChart, Line, Scatter } from 'victory-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientSurface } from '../atoms/GradientSurface';
import { Colors, Layout, Typography } from '@/theme/ai';
import { ACCENT_COLOR } from '@/constants/Colors';
import { prepareStrengthCurve } from '@/logic/strengthCurveUtils';
import type { StrengthCurveData } from '@/features/ai/domain/StrengthCurve';

interface StrengthCurveCardProps {
  data: StrengthCurveData;
}

const CHART_HEIGHT = 220;

export const StrengthCurveCard: React.FC<StrengthCurveCardProps> = ({ data }) => {
  const prepared = useMemo(() => prepareStrengthCurve(data), [data]);
  const [chartWidth, setChartWidth] = useState<number | null>(null);
  const onContainerLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== chartWidth) setChartWidth(w);
  };

  const prChartRows = prepared.prIndices.map((i) => prepared.chartRows[i]);
  const isImproving = prepared.deltaAbsolute > 0;
  const trendColor = isImproving ? Colors.success : Colors.accent;
  const derivedTrend =
    prepared.trendLabel ??
    (prepared.deltaAbsolute === 0
      ? 'Holding steady'
      : `${prepared.deltaAbsolute > 0 ? '+' : ''}${prepared.deltaAbsolute.toFixed(0)} ${data.unit}`);

  return (
    <GradientSurface
      gradient={['rgba(18, 14, 24, 0.96)', 'rgba(10, 10, 18, 0.98)']}
      borderGradient={['rgba(62, 230, 140, 0.35)', 'rgba(255, 45, 85, 0.2)']}
      style={{ marginVertical: 8 }}
    >
      <View style={{ padding: Layout.spacing.lg }} onLayout={onContainerLayout}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{data.exercise_name}</Text>
            <Text style={styles.subtitle}>{prepared.metricLabel}</Text>
          </View>
          <View style={[styles.chip, { borderColor: `${trendColor}55`, backgroundColor: `${trendColor}14` }]}>
            <Ionicons
              name={isImproving ? 'trending-up' : prepared.deltaAbsolute < 0 ? 'trending-down' : 'remove'}
              size={13}
              color={trendColor}
            />
            <Text style={[styles.chipText, { color: trendColor }]}>{derivedTrend}</Text>
          </View>
        </View>

        {/* PR summary strip */}
        {prepared.prIndices.length > 0 ? (
          <View style={styles.prStrip}>
            <Ionicons name="flame" size={14} color="#FF7A00" />
            <Text style={styles.prStripText}>
              {prepared.prIndices.length} PR{prepared.prIndices.length === 1 ? '' : 's'} logged ·
              peak {prepared.maxValue.toFixed(0)} {data.unit}
            </Text>
          </View>
        ) : null}

        {/* Chart */}
        <View
          style={{
            height: CHART_HEIGHT,
            width: chartWidth ?? '100%',
            marginTop: Layout.spacing.md,
          }}
        >
          {chartWidth !== null && prepared.chartRows.length >= 2 ? (
            <CartesianChart
              data={prepared.chartRows}
              xKey="x"
              yKeys={['y']}
              padding={{ left: 8, right: 8, top: 12, bottom: 8 }}
              domainPadding={{ left: 12, right: 12, top: 24, bottom: 16 }}
            >
              {({ points }) => {
                // victory-native hands back one point per chartRow. Self-align
                // PR markers against prepared.points so a future defensive
                // filter (or a row with undefined y) can't desync indices.
                const line = points.y ?? [];
                type Pt = (typeof line)[number];
                const safe: Pt[] = [];
                const prPoints: Pt[] = [];
                line.forEach((p, i) => {
                  if (typeof p.y !== 'number' || !Number.isFinite(p.y)) return;
                  safe.push(p);
                  if (prepared.points[i]?.isPR) prPoints.push(p);
                });
                if (safe.length === 0) return null;
                return (
                  <>
                    <Line
                      points={safe}
                      color={ACCENT_COLOR}
                      strokeWidth={2.5}
                      curveType="natural"
                      animate={{ type: 'timing', duration: 500 }}
                    />
                    <Scatter
                      points={safe}
                      radius={3}
                      color={ACCENT_COLOR}
                      animate={{ type: 'timing', duration: 500 }}
                    />
                    {prPoints.length > 0 ? (
                      <Scatter
                        points={prPoints}
                        radius={6}
                        color="#FF7A00"
                        animate={{ type: 'timing', duration: 500 }}
                      />
                    ) : null}
                  </>
                );
              }}
            </CartesianChart>
          ) : null}
        </View>

        {/* Footer row: start / peak / projected */}
        <View style={styles.footerRow}>
          <StatCell label="Start" value={`${prepared.firstValue.toFixed(0)}`} unit={data.unit} />
          <StatCell
            label="Current"
            value={`${prepared.lastValue.toFixed(0)}`}
            unit={data.unit}
            accent
          />
          {prepared.projectedNext !== null ? (
            <StatCell
              label="Next PR?"
              value={`${prepared.projectedNext.toFixed(0)}`}
              unit={data.unit}
              ghost
            />
          ) : (
            <StatCell label="Peak" value={`${prepared.maxValue.toFixed(0)}`} unit={data.unit} />
          )}
        </View>

        {data.summary ? <Text style={styles.summary}>{data.summary}</Text> : null}
      </View>
    </GradientSurface>
  );
};

const StatCell: React.FC<{
  label: string;
  value: string;
  unit: string;
  accent?: boolean;
  ghost?: boolean;
}> = ({ label, value, unit, accent, ghost }) => (
  <View style={styles.statCell}>
    <Text style={styles.statLabel}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
      <Text
        style={[
          styles.statValue,
          accent ? { color: ACCENT_COLOR } : null,
          ghost ? { color: Colors.subtext } : null,
        ]}
      >
        {value}
      </Text>
      <Text style={styles.statUnit}>{unit}</Text>
    </View>
  </View>
);

const styles = {
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Layout.gap.sm,
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
  chip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.radius.chip,
    borderWidth: 1,
  },
  chipText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    fontVariant: ['tabular-nums' as const],
  },
  prStrip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: Layout.spacing.sm,
    padding: Layout.spacing.sm,
    borderRadius: Layout.radius.button,
    backgroundColor: 'rgba(255, 122, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 0, 0.22)',
  },
  prStripText: {
    color: '#FFB380',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  footerRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginTop: Layout.spacing.md,
    paddingTop: Layout.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  statCell: {
    flex: 1,
    alignItems: 'center' as const,
  },
  statLabel: {
    color: Colors.subtext,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  statValue: {
    color: Colors.text,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    fontVariant: ['tabular-nums' as const],
  },
  statUnit: {
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
