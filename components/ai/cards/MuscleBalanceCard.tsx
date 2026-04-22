/**
 * MuscleBalanceCard — radar chart for training-balance across muscle groups.
 * Built with react-native-skia primitives (no native radar in victory-native).
 * Design: 4-ring grid, dashed "target" polygon behind, filled "user" polygon
 * in front with aurora gradient, labeled spokes, asymmetry warning chips below.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, LayoutChangeEvent } from 'react-native';
import {
  Canvas,
  Circle,
  DashPathEffect,
  Line as SkLine,
  Path as SkPath,
  Skia,
  LinearGradient as SkLinearGradient,
  vec,
} from '@shopify/react-native-skia';
import { Ionicons } from '@expo/vector-icons';
import { GradientSurface } from '../atoms/GradientSurface';
import { Colors, Layout, Typography } from '@/theme/ai';
import { ACCENT_COLOR } from '@/constants/Colors';
import {
  prepareMuscleBalance,
  polarXY,
  buildPolygonPath,
  type PreparedAxis,
} from '@/logic/muscleBalanceUtils';
import type { MuscleBalanceData } from '@/features/ai/domain/MuscleBalance';

interface MuscleBalanceCardProps {
  data: MuscleBalanceData;
}

const CARD_MIN_HEIGHT = 320;
const PADDING_RING = 32; // pixels between canvas edge and outermost ring
const RING_COUNT = 4;

export const MuscleBalanceCard: React.FC<MuscleBalanceCardProps> = ({ data }) => {
  const prepared = useMemo(() => prepareMuscleBalance(data), [data]);
  const [size, setSize] = useState<number | null>(null);

  const onCanvasLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== size) setSize(w);
  };

  if (prepared.axes.length === 0) {
    return (
      <GradientSurface
        gradient={['rgba(18, 14, 24, 0.96)', 'rgba(10, 10, 18, 0.98)']}
        borderGradient={['rgba(157, 78, 221, 0.35)', 'rgba(255, 45, 85, 0.2)']}
        style={{ marginVertical: 8 }}
      >
        <View style={{ padding: Layout.spacing.lg }}>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.subtitle}>
            Not enough data to plot your balance yet — log more sessions.
          </Text>
        </View>
      </GradientSurface>
    );
  }

  return (
    <GradientSurface
      gradient={['rgba(18, 14, 24, 0.96)', 'rgba(10, 10, 18, 0.98)']}
      borderGradient={['rgba(157, 78, 221, 0.45)', 'rgba(255, 45, 85, 0.22)']}
      style={{ marginVertical: 8 }}
    >
      <View style={{ padding: Layout.spacing.lg }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{data.title}</Text>
            {data.period_label ? (
              <Text style={styles.subtitle}>{data.period_label}</Text>
            ) : null}
          </View>
          <View style={styles.headerChip}>
            <Text style={styles.headerChipText}>
              {prepared.asymmetryCount === 0
                ? 'Balanced ✓'
                : `${prepared.asymmetryCount} off-target`}
            </Text>
          </View>
        </View>

        {/* Radar canvas */}
        <View style={styles.canvasWrap} onLayout={onCanvasLayout}>
          {size !== null ? (
            <RadarCanvas size={size} axes={prepared.axes} unit={data.unit} />
          ) : null}
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <LegendSwatch color={ACCENT_COLOR} label="You" solid />
          <LegendSwatch color={Colors.subtext} label="Target" dashed />
        </View>

        {/* Asymmetry chips */}
        {prepared.asymmetryCount > 0 ? (
          <View style={styles.chipsRow}>
            {prepared.axes
              .filter((a) => a.flag !== 'balanced')
              .map((a) => (
                <AsymmetryChip key={a.label} axis={a} unit={data.unit} />
              ))}
          </View>
        ) : null}

        {data.summary ? <Text style={styles.summary}>{data.summary}</Text> : null}
      </View>
    </GradientSurface>
  );
};

// ── Radar canvas ───────────────────────────────────────────────────────────

const RadarCanvas: React.FC<{ size: number; axes: PreparedAxis[]; unit: string }> = ({
  size,
  axes,
  unit,
}) => {
  const cx = size / 2;
  const cy = size / 2 + 10; // slightly down to leave room for top label
  const radius = size / 2 - PADDING_RING;

  // Memoize derived geometry so Skia paths don't re-allocate every render.
  const { userPoints, ringPaths, userPath, targetPath } = useMemo(() => {
    const userPts = axes.map((a) => polarXY(cx, cy, radius, a.angle, a.userRatio));
    const targetPts = axes.map((a) => polarXY(cx, cy, radius, a.angle, a.targetRatio));
    const rings = Array.from({ length: RING_COUNT }, (_, i) => {
      const ratio = (i + 1) / RING_COUNT;
      const pts = axes.map((a) => polarXY(cx, cy, radius, a.angle, ratio));
      return Skia.Path.MakeFromSVGString(buildPolygonPath(pts));
    });
    return {
      userPoints: userPts,
      ringPaths: rings,
      userPath: Skia.Path.MakeFromSVGString(buildPolygonPath(userPts)),
      targetPath: Skia.Path.MakeFromSVGString(buildPolygonPath(targetPts)),
    };
  }, [axes, cx, cy, radius]);

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={{ width: size, height: size }}>
        {/* Concentric rings */}
        {ringPaths.map((path, i) =>
          path ? (
            <SkPath
              key={`ring-${i}`}
              path={path}
              color={`rgba(255,255,255,${0.04 + i * 0.02})`}
              style="stroke"
              strokeWidth={1}
            />
          ) : null,
        )}
        {/* Spokes */}
        {axes.map((a, i) => {
          const tip = polarXY(cx, cy, radius, a.angle, 1);
          return (
            <SkLine
              key={`spoke-${i}`}
              p1={vec(cx, cy)}
              p2={vec(tip.x, tip.y)}
              color="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          );
        })}
        {/* Target polygon — dashed outline (ghost) */}
        {targetPath ? (
          <SkPath
            path={targetPath}
            color="rgba(163, 166, 173, 0.75)"
            style="stroke"
            strokeWidth={1.25}
          >
            <DashPathEffect intervals={[5, 4]} />
          </SkPath>
        ) : null}
        {/* User polygon — aurora gradient fill + bright stroke */}
        {userPath ? (
          <>
            <SkPath path={userPath} style="fill" opacity={0.45}>
              <SkLinearGradient
                start={vec(cx, cy - radius)}
                end={vec(cx, cy + radius)}
                colors={['#FF7A0055', '#FF2D5555', '#9D4EDD55']}
              />
            </SkPath>
            <SkPath
              path={userPath}
              style="stroke"
              strokeWidth={2}
              color={ACCENT_COLOR}
            />
          </>
        ) : null}
        {/* User vertex dots */}
        {userPoints.map((p, i) => (
          <Circle key={`dot-${i}`} cx={p.x} cy={p.y} r={3.5} color={ACCENT_COLOR} />
        ))}
      </Canvas>

      {/* Axis labels — RN Text over the canvas, positioned via trig so top
          labels sit above the ring and bottom labels below, with alignment
          driven by the axis angle. */}
      {axes.map((a, i) => {
        const cosA = Math.cos(a.angle);
        const sinA = Math.sin(a.angle);
        // Push label further out on the axis, plus a small sin-based vertical
        // nudge so top/bottom labels don't overlap the polygon.
        const labelPt = polarXY(cx, cy, radius + 18, a.angle, 1);
        const align: 'flex-start' | 'flex-end' | 'center' =
          cosA > 0.15 ? 'flex-start' : cosA < -0.15 ? 'flex-end' : 'center';
        const verticalNudge = sinA < -0.5 ? -4 : sinA > 0.5 ? 4 : 0;
        return (
          <View
            key={`label-${i}`}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: labelPt.x - 50,
              top: labelPt.y - 14 + verticalNudge,
              width: 100,
              alignItems: align,
            }}
          >
            <Text style={styles.axisLabel}>{a.label}</Text>
            <Text style={styles.axisSubLabel}>
              {a.userValue.toFixed(0)}/{a.targetValue.toFixed(0)} {unit}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

// ── Legend + chip helpers ──────────────────────────────────────────────────

const LegendSwatch: React.FC<{
  color: string;
  label: string;
  solid?: boolean;
  dashed?: boolean;
}> = ({ color, label, solid, dashed }) => (
  <View style={styles.legendItem}>
    <View
      style={[
        styles.legendSwatch,
        {
          backgroundColor: solid ? color : 'transparent',
          borderColor: color,
          borderStyle: dashed ? 'dashed' : 'solid',
          borderWidth: dashed ? 1 : 0,
        },
      ]}
    />
    <Text style={styles.legendLabel}>{label}</Text>
  </View>
);

const AsymmetryChip: React.FC<{ axis: PreparedAxis; unit: string }> = ({ axis, unit }) => {
  const isUnder = axis.flag === 'under';
  const color = isUnder ? Colors.accent : Colors.warn;
  const delta = axis.userValue - axis.targetValue;
  const icon: React.ComponentProps<typeof Ionicons>['name'] =
    isUnder ? 'arrow-down' : 'arrow-up';
  return (
    <View
      style={[styles.chip, { borderColor: `${color}55`, backgroundColor: `${color}14` }]}
    >
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.chipText, { color }]}>
        {axis.label}: {delta > 0 ? '+' : ''}
        {delta.toFixed(0)} {unit}
      </Text>
    </View>
  );
};

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
  headerChip: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.radius.chip,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerChipText: {
    color: Colors.text,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  canvasWrap: {
    aspectRatio: 1 as const,
    width: '100%' as const,
    marginTop: Layout.spacing.md,
    minHeight: CARD_MIN_HEIGHT,
    position: 'relative' as const,
  },
  axisLabel: {
    color: Colors.text,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center' as const,
  },
  axisSubLabel: {
    color: Colors.subtext,
    fontSize: 10,
    marginTop: 1,
    fontVariant: ['tabular-nums' as const],
  },
  legendRow: {
    flexDirection: 'row' as const,
    gap: Layout.gap.md,
    marginTop: Layout.spacing.sm,
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
    color: Colors.subtext,
    fontSize: Typography.sizes.sm,
  },
  chipsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: Layout.gap.sm,
    marginTop: Layout.spacing.md,
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
  summary: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    marginTop: Layout.spacing.md,
    fontStyle: 'italic' as const,
  },
};
