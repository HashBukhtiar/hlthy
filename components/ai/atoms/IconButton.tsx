/**
 * IconButton - Circular button with icon for actions
 */
import React from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Layout, Effects } from '@/theme/ai';

interface IconButtonProps {
  icon: React.ReactNode;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  gradient?: [string, string, ...string[]];
  style?: ViewStyle;
  disabled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 'medium',
  gradient = ['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)'],
  style,
  disabled = false,
}) => {
  const sizeMap = {
    small: 32,
    medium: 40,
    large: 48,
  };

  const buttonSize = sizeMap[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        {
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
        },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <LinearGradient
        colors={gradient}
        style={[
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
          },
          Effects.cardShadow,
        ]}
      >
        {icon}
      </LinearGradient>
    </TouchableOpacity>
  );
};
