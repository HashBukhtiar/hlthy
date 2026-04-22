/**
 * TimeRangeSelector — segmented pill control with an animated indicator
 * that slides between options. Controlled; parent owns the range state.
 */
import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography } from '@/theme/ai';

export type TimeRangeDays = 7 | 30 | 90 | 365;

export const TIME_RANGE_OPTIONS: Array<{ value: TimeRangeDays; label: string }> = [
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
  { value: 90, label: '90d' },
  { value: 365, label: '1y' },
];

interface Props {
  value: TimeRangeDays;
  onChange: (range: TimeRangeDays) => void;
}

export const TimeRangeSelector: React.FC<Props> = ({ value, onChange }) => {
  const [trackWidth, setTrackWidth] = useState(0);
  const indicatorX = useSharedValue(0);

  const idx = Math.max(
    0,
    TIME_RANGE_OPTIONS.findIndex((o) => o.value === value),
  );
  const segCount = TIME_RANGE_OPTIONS.length;
  const segWidth = trackWidth > 0 ? trackWidth / segCount : 0;

  useEffect(() => {
    indicatorX.value = withSpring(idx * segWidth, {
      damping: 18,
      stiffness: 180,
      mass: 0.6,
    });
  }, [idx, segWidth, indicatorX]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== trackWidth) setTrackWidth(w);
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: segWidth,
  }));

  return (
    <View style={styles.track} onLayout={onLayout}>
      {/* Sliding indicator */}
      {segWidth > 0 ? (
        <Animated.View style={[styles.indicatorWrap, indicatorStyle]}>
          <LinearGradient
            colors={['rgba(255, 122, 0, 0.85)', 'rgba(255, 45, 85, 0.85)', 'rgba(157, 78, 221, 0.85)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.indicator}
          />
        </Animated.View>
      ) : null}

      {/* Segments */}
      {TIME_RANGE_OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={styles.segment}
            hitSlop={8}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 3,
    position: 'relative',
  },
  indicatorWrap: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: 15,
    overflow: 'hidden',
  },
  indicator: {
    flex: 1,
    borderRadius: 15,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: Colors.subtext,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: Colors.white,
  },
});
