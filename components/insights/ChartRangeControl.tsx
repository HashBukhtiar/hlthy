/**
 * ChartRangeControl — compact pill selector for a single chart's time range.
 * Designed to sit in a card header. Uses the same sliding-indicator pattern
 * as the global TimeRangeSelector but at a smaller scale.
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
import {
  TIME_RANGE_OPTIONS,
  type TimeRangeDays,
} from '@/components/insights/TimeRangeSelector';

interface Props {
  value: TimeRangeDays;
  onChange: (range: TimeRangeDays) => void;
}

export const ChartRangeControl: React.FC<Props> = ({ value, onChange }) => {
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
      stiffness: 220,
      mass: 0.5,
    });
  }, [idx, segWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: segWidth,
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.floor(e.nativeEvent.layout.width);
    if (w > 0 && w !== trackWidth) setTrackWidth(w);
  };

  return (
    <View style={styles.track} onLayout={onLayout}>
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

      {TIME_RANGE_OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={styles.segment}
            hitSlop={4}
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
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 2,
    position: 'relative',
    alignSelf: 'flex-start',
    minWidth: 160,
  },
  indicatorWrap: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 2,
    borderRadius: 11,
    overflow: 'hidden',
  },
  indicator: {
    flex: 1,
    borderRadius: 11,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  label: {
    color: Colors.subtext,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: Colors.white,
  },
});
