/**
 * ProgressDots - Indicator showing progress through segments
 */
import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Colors, Layout } from '@/theme/ai';

interface ProgressDotsProps {
  total: number;
  active?: number;
  style?: ViewStyle;
  dotColor?: string;
  activeDotColor?: string;
}

export const ProgressDots: React.FC<ProgressDotsProps> = ({
  total,
  active = 0,
  style,
  dotColor = 'rgba(255, 255, 255, 0.3)',
  activeDotColor = Colors.accent,
}) => {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.gap.xs,
        },
        style,
      ]}
    >
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: index <= active ? activeDotColor : dotColor,
          }}
        />
      ))}
    </View>
  );
};
