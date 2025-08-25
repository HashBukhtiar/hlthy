/**
 * RPE Gauge - Simple arc showing RPE level
 */
import React, { useEffect, useState } from 'react';
import { View, ViewStyle, Text } from 'react-native';
import { Colors, Typography } from '@/theme/ai';

interface RPEGaugeProps {
  value: number; // 0-10
  size?: number;
  style?: ViewStyle;
  showLabel?: boolean;
}

export const RPEGauge: React.FC<RPEGaugeProps> = ({
  value,
  size = 40,
  style,
  showLabel = true,
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  // Animate to target value
  useEffect(() => {
    const animationDuration = 500;
    const steps = 20;
    const stepValue = value / steps;
    const stepDuration = animationDuration / steps;

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      setDisplayValue(Math.min(stepValue * currentStep, value));
      
      if (currentStep >= steps) {
        setDisplayValue(value);
        clearInterval(interval);
      }
    }, stepDuration);

    return () => clearInterval(interval);
  }, [value]);

  // Color based on RPE level
  const getColor = (rpe: number) => {
    if (rpe <= 3) return Colors.success;
    if (rpe <= 6) return '#FFB020'; // warn
    if (rpe <= 8) return '#FF7A00'; // orange
    return Colors.accent; // red for 9-10
  };

  const progress = Math.min(displayValue / 10, 1);

  return (
    <View style={[{ alignItems: 'center' }, style]}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          position: 'relative',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Progress indicator */}
        <View
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            right: 2,
            bottom: 2,
            borderRadius: (size - 4) / 2,
            backgroundColor: getColor(displayValue),
            opacity: progress,
          }}
        />
        <Text
          style={{
            color: Colors.text,
            fontSize: Typography.sizes.xs,
            fontWeight: Typography.weights.bold,
            zIndex: 1,
          }}
        >
          {Math.round(displayValue * 10) / 10}
        </Text>
      </View>
      {showLabel && (
        <Text
          style={{
            color: Colors.subtext,
            fontSize: Typography.sizes.xs,
            marginTop: 2,
          }}
        >
          RPE
        </Text>
      )}
    </View>
  );
};
