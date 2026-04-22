/**
 * MuscleHeatmapCard — anatomical body diagram tinted by training volume.
 * Rendering is delegated to `react-native-body-highlighter`; this component
 * adapts our MuscleId / intensity data shape to the library's slug/color API
 * and layers on the app's styling (aurora ramp, front/back toggle, detail row).
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import Body, {
  type ExtendedBodyPart,
  type Slug as BodySlug,
} from 'react-native-body-highlighter';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GradientSurface } from '@/components/ai/atoms/GradientSurface';
import { Colors, Layout, Typography } from '@/theme/ai';
import { intensityColor } from '@/logic/muscleHeatmapUtils';
import type {
  MuscleHeatmapData,
  MuscleId,
  MuscleView,
} from '@/features/insights/domain/MuscleHeatmap';
import { ChartRangeControl } from '@/components/insights/ChartRangeControl';
import type { TimeRangeDays } from '@/components/insights/TimeRangeSelector';

interface Props {
  data: MuscleHeatmapData;
  range?: TimeRangeDays;
  onRangeChange?: (r: TimeRangeDays) => void;
}

/**
 * Map our semantic MuscleId to the library's Slug union. The library doesn't
 * distinguish front/rear delts (both are `deltoids`) so we resolve per view
 * in the data-builder below.
 */
const LIB_SLUG: Record<MuscleId, BodySlug> = {
  chest: 'chest',
  shoulders_front: 'deltoids',
  shoulders_rear: 'deltoids',
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'forearm',
  abs: 'abs',
  obliques: 'obliques',
  quads: 'quadriceps',
  hamstrings: 'hamstring',
  glutes: 'gluteal',
  lats: 'upper-back',
  traps: 'trapezius',
  lower_back: 'lower-back',
  calves: 'calves',
};

const LABEL: Record<MuscleId, string> = {
  chest: 'Chest',
  shoulders_front: 'Front delts',
  shoulders_rear: 'Rear delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  lats: 'Lats',
  traps: 'Traps',
  lower_back: 'Lower back',
  calves: 'Calves',
};

/** Which MuscleIds are relevant to each view. Used both to filter what's
 *  highlighted and to resolve the deltoids case (front vs rear) cleanly. */
const FRONT_IDS: MuscleId[] = [
  'chest',
  'shoulders_front',
  'biceps',
  'forearms',
  'abs',
  'obliques',
  'quads',
];
const BACK_IDS: MuscleId[] = [
  'traps',
  'shoulders_rear',
  'triceps',
  'lats',
  'lower_back',
  'glutes',
  'hamstrings',
  'calves',
];

export const MuscleHeatmapCard: React.FC<Props> = ({
  data,
  range,
  onRangeChange,
}) => {
  const [view, setView] = useState<MuscleView>('front');
  const [selected, setSelected] = useState<MuscleId | null>(null);
  const [bodyAreaWidth, setBodyAreaWidth] = useState(0);
  const showRangeControl = range !== undefined && !!onRangeChange;

  // Build the library's `data` array for the current view. Each entry has
  // intensity=1 (we're using explicit `color` rather than the colors-by-index
  // mechanism) and an aurora-ramp color derived from our 0-1 intensity.
  const bodyData: ExtendedBodyPart[] = useMemo(() => {
    const ids = view === 'front' ? FRONT_IDS : BACK_IDS;
    const parts: ExtendedBodyPart[] = [];
    for (const id of ids) {
      const entry = data.entries[id];
      if (!entry || entry.intensity <= 0) continue;
      parts.push({
        slug: LIB_SLUG[id],
        intensity: 1,
        color: intensityColor(entry.intensity),
      });
    }
    return parts;
  }, [view, data]);

  const selectedEntry = selected ? (data.entries[selected] ?? null) : null;
  const selectedLabel = selected ? LABEL[selected] : null;

  // When user taps a muscle in the library's SVG, resolve back to our MuscleId.
  const onPartPress = (part: ExtendedBodyPart) => {
    if (!part.slug) return;
    // Prefer a match that has data in the current view; fall back to any ID.
    const viewIds = view === 'front' ? FRONT_IDS : BACK_IDS;
    const match =
      viewIds.find((id) => LIB_SLUG[id] === part.slug && !!data.entries[id]) ??
      viewIds.find((id) => LIB_SLUG[id] === part.slug) ??
      null;
    if (!match) return;
    setSelected((cur) => (cur === match ? null : match));
  };

  const onBodyLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== bodyAreaWidth) setBodyAreaWidth(w);
  };

  // The library's SVG is around 180pt wide at scale=1; scale up to fill width.
  const bodyScale = bodyAreaWidth > 0 ? Math.max(1, bodyAreaWidth / 180) : 1.6;

  return (
    <GradientSurface
      gradient={['rgba(18, 14, 24, 0.96)', 'rgba(10, 10, 18, 0.98)']}
      borderGradient={['rgba(255, 122, 0, 0.35)', 'rgba(157, 78, 221, 0.18)']}
      style={{ marginVertical: 8 }}
    >
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Muscle heatmap</Text>
            {data.period_label ? (
              <Text style={styles.subtitle}>{data.period_label}</Text>
            ) : null}
          </View>
          <FrontBackToggle view={view} onChange={setView} />
        </View>
        {showRangeControl ? (
          <View style={styles.rangeRow}>
            <ChartRangeControl value={range!} onChange={onRangeChange!} />
          </View>
        ) : null}

        <View style={styles.bodyArea} onLayout={onBodyLayout}>
          <Body
            data={bodyData}
            side={view}
            gender="male"
            scale={bodyScale}
            border="#2a2a33"
            defaultFill="#1c1c22"
            defaultStroke="rgba(255, 255, 255, 0.1)"
            onBodyPartPress={onPartPress}
          />
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <Text style={styles.legendLabel}>Low</Text>
          <View style={styles.legendBar}>
            <LinearGradient
              colors={['#3A3B4A', '#FF7A00', '#FF2D55', '#9D4EDD']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.legendGradient}
            />
          </View>
          <Text style={styles.legendLabel}>High</Text>
        </View>

        {/* Detail row */}
        {selectedEntry && selectedLabel ? (
          <View style={styles.detailRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>{selectedLabel}</Text>
              <Text style={styles.detailSub}>
                {selectedEntry.volume.toLocaleString()} {data.unit} ·{' '}
                {selectedEntry.sessions} session{selectedEntry.sessions === 1 ? '' : 's'}
                {selectedEntry.lastTrained ? ` · last ${selectedEntry.lastTrained}` : ''}
              </Text>
            </View>
            <View
              style={[
                styles.intensityChip,
                { backgroundColor: `${intensityColor(selectedEntry.intensity)}33` },
              ]}
            >
              <Text
                style={[
                  styles.intensityChipText,
                  { color: intensityColor(selectedEntry.intensity) },
                ]}
              >
                {Math.round(selectedEntry.intensity * 100)}%
              </Text>
            </View>
          </View>
        ) : selected && selectedLabel && !selectedEntry ? (
          <View style={styles.detailRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.detailLabel}>{selectedLabel}</Text>
              <Text style={styles.detailSub}>
                No sessions in this window — could use some attention.
              </Text>
            </View>
            <Ionicons name="snow-outline" size={22} color={Colors.subtext} />
          </View>
        ) : (
          <Text style={styles.hint}>Tap a muscle to see details</Text>
        )}
      </View>
    </GradientSurface>
  );
};

// ── Front/back toggle ──────────────────────────────────────────────────────

const FrontBackToggle: React.FC<{
  view: MuscleView;
  onChange: (v: MuscleView) => void;
}> = ({ view, onChange }) => {
  const indicatorX = useSharedValue(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const segWidth = trackWidth > 0 ? trackWidth / 2 : 0;

  useEffect(() => {
    indicatorX.value = withSpring(view === 'front' ? 0 : segWidth, {
      damping: 18,
      stiffness: 220,
      mass: 0.5,
    });
  }, [view, segWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: segWidth,
  }));

  return (
    <View
      style={toggleStyles.track}
      onLayout={(e) => {
        const w = Math.floor(e.nativeEvent.layout.width);
        if (w > 0 && w !== trackWidth) setTrackWidth(w);
      }}
    >
      {segWidth > 0 ? (
        <Animated.View style={[toggleStyles.indicatorWrap, indicatorStyle]}>
          <LinearGradient
            colors={['rgba(255, 122, 0, 0.85)', 'rgba(255, 45, 85, 0.85)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={toggleStyles.indicator}
          />
        </Animated.View>
      ) : null}
      <Pressable onPress={() => onChange('front')} style={toggleStyles.segment} hitSlop={4}>
        <Text style={[toggleStyles.label, view === 'front' && toggleStyles.labelActive]}>
          Front
        </Text>
      </Pressable>
      <Pressable onPress={() => onChange('back')} style={toggleStyles.segment} hitSlop={4}>
        <Text style={[toggleStyles.label, view === 'back' && toggleStyles.labelActive]}>
          Back
        </Text>
      </Pressable>
    </View>
  );
};

const toggleStyles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 2,
    position: 'relative',
    minWidth: 120,
  },
  indicatorWrap: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  indicator: { flex: 1, borderRadius: 12 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  label: {
    color: Colors.subtext,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  labelActive: { color: Colors.white },
});

const styles = StyleSheet.create({
  container: { padding: Layout.spacing.lg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  rangeRow: { marginTop: Layout.spacing.sm, marginBottom: 2 },
  bodyArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Layout.spacing.md,
    minHeight: 340,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Layout.spacing.md,
  },
  legendBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  legendGradient: { flex: 1, borderRadius: 4 },
  legendLabel: {
    color: Colors.subtext,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.gap.md,
    marginTop: Layout.spacing.md,
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.button,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  detailLabel: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  detailSub: {
    color: Colors.subtext,
    fontSize: Typography.sizes.sm,
    marginTop: 2,
  },
  intensityChip: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.radius.chip,
  },
  intensityChipText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    color: Colors.subtext,
    fontSize: Typography.sizes.sm,
    marginTop: Layout.spacing.md,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
