/**
 * ExerciseSwitcher — horizontal chip row for choosing which exercise's
 * strength curve to display. The active chip fills with the aurora gradient.
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Layout, Typography } from '@/theme/ai';
import type { StrengthCurveOption } from '@/logic/insightsDerivation';

interface Props {
  options: StrengthCurveOption[];
  activeId: string | null;
  onChange: (id: string) => void;
}

export const ExerciseSwitcher: React.FC<Props> = ({ options, activeId, onChange }) => {
  if (options.length <= 1) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Exercise</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {options.map((opt) => {
          const active = opt.exerciseId === activeId;
          return (
            <Pressable
              key={opt.exerciseId}
              onPress={() => onChange(opt.exerciseId)}
              style={styles.chipWrap}
              hitSlop={6}
            >
              {active ? (
                <LinearGradient
                  colors={['rgba(255, 122, 0, 0.9)', 'rgba(255, 45, 85, 0.9)', 'rgba(157, 78, 221, 0.9)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.chip, styles.chipActive]}
                >
                  <Text style={styles.labelActive} numberOfLines={1}>
                    {opt.exerciseName}
                  </Text>
                  <Text style={styles.countActive}>{opt.sessionCount}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.chip}>
                  <Text style={styles.label} numberOfLines={1}>
                    {opt.exerciseName}
                  </Text>
                  <Text style={styles.count}>{opt.sessionCount}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginVertical: 8,
  },
  heading: {
    color: Colors.subtext,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginLeft: Layout.spacing.xs,
    marginBottom: 6,
  },
  row: {
    gap: Layout.gap.sm,
    paddingHorizontal: 2,
  },
  chipWrap: {
    borderRadius: Layout.radius.chip,
    overflow: 'hidden',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Layout.radius.chip,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  chipActive: {
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  label: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  labelActive: {
    color: '#fff',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
  },
  count: {
    color: Colors.subtext,
    fontSize: Typography.sizes.xs,
    fontVariant: ['tabular-nums'],
  },
  countActive: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    fontVariant: ['tabular-nums'],
  },
});
