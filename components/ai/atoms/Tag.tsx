/**
 * Tag - Small colored tag component for intents/categories
 */
import React from 'react';
import { View, Text, TextStyle, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Layout, Typography } from '@/theme/ai';

interface TagProps {
  text: string;
  gradient?: [string, string, ...string[]];
  textColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'small' | 'medium' | 'large';
}

export const Tag: React.FC<TagProps> = ({
  text,
  gradient = [Colors.accent, Colors.accent],
  textColor = Colors.white,
  style,
  textStyle,
  size = 'medium',
}) => {
  const sizeStyles = {
    small: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: Layout.radius.chip - 2,
      fontSize: Typography.sizes.xs,
    },
    medium: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: Layout.radius.chip,
      fontSize: Typography.sizes.sm,
    },
    large: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: Layout.radius.chip + 2,
      fontSize: Typography.sizes.base,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        {
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
          borderRadius: currentSize.borderRadius,
        },
        style,
      ]}
    >
      <Text
        style={[
          {
            color: textColor,
            fontSize: currentSize.fontSize,
            fontWeight: Typography.weights.semibold,
            textAlign: 'center',
          },
          textStyle,
        ]}
      >
        {text}
      </Text>
    </LinearGradient>
  );
};
