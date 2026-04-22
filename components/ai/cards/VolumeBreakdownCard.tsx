/**
 * VolumeBreakdownCard — animated horizontal bars for weekly volume by muscle group.
 * Design: hero total with count-up, delta chip vs prior period, staggered bar entry,
 * accent glow on the tallest bar.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, LayoutChangeEvent, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GradientSurface } from '../atoms/GradientSurface';
import { Colors, Layout, Typography } from '@/theme/ai';
import {
  prepareVolumeBreakdown,
  formatCompactNumber,
  type PreparedEntry,
} from '@/logic/volumeUtils';
import type { VolumeBreakdownData } from '@/features/ai/domain/VolumeBreakdown';
import { ChartRangeControl } from '@/components/insights/ChartRangeControl';
import type { TimeRangeDays } from '@/components/insights/TimeRangeSelector';

interface VolumeBreakdownCardProps {
  data: VolumeBreakdownData;
  range?: TimeRangeDays;
  onRangeChange?: (r: TimeRangeDays) => void;
}

export const VolumeBreakdownCard: React.FC<VolumeBreakdownCardProps> = ({
  data,
  range,
  onRangeChange,
}) => {
  const showRangeControl = range !== undefined && !!onRangeChange;
  const prepared = useMemo(() => prepareVolumeBreakdown(data), [data]);
  const [trackWidth, setTrackWidth] = useState(0);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== trackWidth) setTrackWidth(w);
  };

  return (
    <GradientSurface
      gradient={['rgba(18, 14, 24, 0.96)', 'rgba(10, 10, 18, 0.98)']}
      borderGradient={['rgba(255, 122, 0, 0.45)', 'rgba(157, 78, 221, 0.18)']}
      style={{ marginVertical: 8 }}
    >
      <View style={{ padding: Layout.spacing.lg }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{data.title}</Text>
            {data.period_label ? <Text style={styles.subtitle}>{data.period_label}</Text> : null}
          </View>
          {prepared.deltaDirection && prepared.deltaPercent !== null ? (
            <DeltaChip direction={prepared.deltaDirection} percent={prepared.deltaPercent} />
          ) : null}
        </View>
        {showRangeControl ? (
          <View style={styles.rangeRow}>
            <ChartRangeControl value={range!} onChange={onRangeChange!} />
          </View>
        ) : null}

        {/* Hero total */}
        {prepared.total !== null ? (
          <View style={styles.heroRow}>
            <AnimatedCount value={prepared.total} />
            <Text style={styles.unit}>{data.unit}</Text>
          </View>
        ) : null}

        {/* Bars */}
        <View style={styles.barsContainer} onLayout={onTrackLayout}>
          {prepared.entries.map((entry, idx) => (
            <BarRow
              key={`${entry.label}-${idx}`}
              entry={entry}
              index={idx}
              trackWidth={trackWidth}
              isMax={idx === 0 && entry.ratio > 0}
              active={activeIdx === idx}
              unit={data.unit}
              onToggle={() => setActiveIdx((cur) => (cur === idx ? null : idx))}
            />
          ))}
        </View>

        {data.summary ? <Text style={styles.summary}>{data.summary}</Text> : null}
      </View>
    </GradientSurface>
  );
};

// ── Bar row ────────────────────────────────────────────────────────────────

interface BarRowProps {
  entry: PreparedEntry;
  index: number;
  trackWidth: number;
  isMax: boolean;
  active: boolean;
  unit: string;
  onToggle: () => void;
}

const BarRow: React.FC<BarRowProps> = ({
  entry,
  index,
  trackWidth,
  isMax,
  active,
  unit,
  onToggle,
}) => {
  const progress = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      80 * index + 120,
      withTiming(entry.ratio, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
    if (isMax) {
      // Subtle pulse loop on the largest bar to cue "this is the hotspot".
      pulse.value = withDelay(
        900,
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        ),
      );
    }
  }, [entry.ratio, index, isMax, progress, pulse]);

  const fillStyle = useAnimatedStyle(() => {
    const w = Math.max(0, Math.min(1, progress.value)) * trackWidth;
    return { width: w };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + pulse.value * 0.4,
    transform: [{ scaleY: 1 + pulse.value * 0.15 }],
  }));

  return (
    <Pressable onPress={onToggle} style={styles.barRow}>
      <View style={styles.barLabelRow}>
        <Text style={styles.barLabel}>{entry.label}</Text>
        <Text style={styles.barValue}>
          {active
            ? `${formatCompactNumber(entry.value)} ${unit} · ${Math.round(entry.percent * 100)}%`
            : `${formatCompactNumber(entry.value)} ${unit}`}
        </Text>
      </View>

      <View style={styles.track}>
        {isMax ? (
          <Animated.View style={[styles.glow, { backgroundColor: entry.color }, glowStyle]} />
        ) : null}
        <Animated.View style={[styles.fillContainer, fillStyle]}>
          <LinearGradient
            colors={[entry.color, `${entry.color}80`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fill}
          />
        </Animated.View>
      </View>
    </Pressable>
  );
};

// ── Delta chip ─────────────────────────────────────────────────────────────

const DeltaChip: React.FC<{ direction: 'up' | 'down' | 'flat'; percent: number }> = ({
  direction,
  percent,
}) => {
  const color =
    direction === 'up' ? Colors.success : direction === 'down' ? Colors.accent : Colors.subtext;
  const icon =
    direction === 'up' ? 'trending-up' : direction === 'down' ? 'trending-down' : 'remove';
  const sign = direction === 'up' ? '+' : direction === 'down' ? '' : '';
  return (
    <View
      style={[
        styles.chip,
        { borderColor: `${color}55`, backgroundColor: `${color}14` },
      ]}
    >
      <Ionicons name={icon} size={13} color={color} />
      <Text style={[styles.chipText, { color }]}>
        {sign}
        {percent.toFixed(0)}%
      </Text>
    </View>
  );
};

// ── Animated count-up ──────────────────────────────────────────────────────

const AnimatedCount: React.FC<{ value: number }> = ({ value }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // Defense in depth: upstream validators already strip non-finite values,
    // but formatCompactNumber returns '—' for NaN/Infinity so guard here too.
    if (!Number.isFinite(value)) {
      setDisplay(0);
      return;
    }
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - start) / 900;
      if (elapsed >= 1) {
        setDisplay(value);
        clearInterval(interval);
        return;
      }
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setDisplay(value * eased);
    }, 16);
    return () => clearInterval(interval);
  }, [value]);

  return <Text style={styles.heroNumber}>{formatCompactNumber(display)}</Text>;
};

const styles = {
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Layout.gap.sm,
  },
  rangeRow: {
    marginTop: Layout.spacing.sm,
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
  heroRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    marginTop: Layout.spacing.sm,
    marginBottom: Layout.spacing.lg,
    gap: Layout.gap.xs,
  },
  heroNumber: {
    color: Colors.text,
    fontSize: 34,
    fontWeight: Typography.weights.bold,
    letterSpacing: -0.5,
  },
  unit: {
    color: Colors.subtext,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
  },
  barsContainer: {
    gap: Layout.gap.md,
  },
  barRow: {
    gap: 6,
  },
  barLabelRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  barLabel: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  barValue: {
    color: Colors.subtext,
    fontSize: Typography.sizes.sm,
    fontVariant: ['tabular-nums' as const],
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  glow: {
    position: 'absolute' as const,
    top: -4,
    left: 0,
    right: 0,
    bottom: -4,
    opacity: 0.25,
    borderRadius: 9,
    // iOS-only soft halo; on Android falls back to flat tint (acceptable).
  },
  fillContainer: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden' as const,
  },
  fill: {
    flex: 1,
    borderRadius: 5,
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
    marginTop: Layout.spacing.lg,
    fontStyle: 'italic' as const,
  },
};
