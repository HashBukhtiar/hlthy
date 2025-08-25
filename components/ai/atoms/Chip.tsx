/**
 * Chip - Interactive chip component for exercises/selections
 */
import React from 'react';
import { TouchableOpacity, Text, View, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Layout, Typography } from '@/theme/ai';

interface ChipProps {
  text: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  gradient?: [string, string, ...string[]];
  selectedGradient?: [string, string, ...string[]];
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export const Chip: React.FC<ChipProps> = ({
  text,
  icon,
  onPress,
  selected = false,
  gradient = ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'],
  selectedGradient = [Colors.accent, Colors.accent],
  style,
  textStyle,
  disabled = false,
}) => {
  const currentGradient = selected ? selectedGradient : gradient;
  const textColor = selected ? Colors.white : Colors.subtext;

  const content = (
    <LinearGradient
      colors={currentGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[
        {
          paddingHorizontal: Layout.spacing.md,
          paddingVertical: Layout.spacing.sm,
          borderRadius: Layout.radius.chip,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Layout.gap.xs,
          borderWidth: selected ? 0 : 1,
          borderColor: 'rgba(255, 255, 255, 0.2)',
        },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {icon && <View>{icon}</View>}
      <Text
        style={[
          {
            color: textColor,
            fontSize: Typography.sizes.sm,
            fontWeight: selected ? Typography.weights.semibold : Typography.weights.medium,
          },
          textStyle,
        ]}
      >
        {text}
      </Text>
    </LinearGradient>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={{ borderRadius: Layout.radius.chip }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};
