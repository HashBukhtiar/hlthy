/**
 * GradientSurface - Base component for glass-like surfaces with gradient borders
 */
import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Layout, Effects } from '@/theme/ai';

interface GradientSurfaceProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gradient?: [string, string, ...string[]];
  borderGradient?: [string, string, ...string[]];
  glowIntensity?: number;
}

export const GradientSurface: React.FC<GradientSurfaceProps> = ({
  children,
  style,
  gradient = [Colors.surface, Colors.surface],
  borderGradient = ['rgba(255, 45, 85, 0.3)', 'rgba(157, 78, 221, 0.1)'],
  glowIntensity = 0.12,
}) => {
  return (
    <View style={[{ padding: 1, borderRadius: Layout.radius.card }, style]}>
      <LinearGradient
        colors={borderGradient}
        style={{
          borderRadius: Layout.radius.card,
          padding: 1,
        }}
      >
        <LinearGradient
          colors={gradient}
          style={[
            {
              borderRadius: Layout.radius.card - 1,
              overflow: 'hidden',
            },
            Effects.cardShadow,
          ]}
        >
          {children}
        </LinearGradient>
      </LinearGradient>
    </View>
  );
};
