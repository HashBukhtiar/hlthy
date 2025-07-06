import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface OptimizedAuroraProps {
  colorStops?: string[];
  speed?: number;
  intensity?: number;
}

export default function OptimizedAurora({ 
  colorStops = ['#FF2D55', '#a434eb', '#5227FF'],
  speed = 1.0,
  intensity = 1.0
}: OptimizedAuroraProps) {
  const { width, height } = Dimensions.get('window');
  
  // Create continuous rotation values - all other animations derive from these
  const rotation1 = useRef(new Animated.Value(0)).current;
  const rotation2 = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Create truly continuous animations that never reset
    const createContinuousAnimation = (animValue: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.timing(animValue, {
          toValue: 1,
          duration: duration / speed,
          easing: Easing.linear, // Linear for smooth continuous motion
          useNativeDriver: true,
        }),
        { iterations: -1 } // Infinite loop
      );
    };

    // Only create rotation animations - we'll derive all other movements from these
    const rotationAnim1 = createContinuousAnimation(rotation1, 20000);
    const rotationAnim2 = createContinuousAnimation(rotation2, 30000);

    // Start all animations
    rotationAnim1.start();
    rotationAnim2.start();

    return () => {
      rotationAnim1.stop();
      rotationAnim2.stop();
    };
  }, [speed, rotation1, rotation2]);

  // Create interpolations for smooth continuous motion using sine waves
  const rotation1Interpolated = rotation1.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotation2Interpolated = rotation2.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'], // Opposite direction
  });

  // Use sine wave patterns for smooth continuous translation
  const translateX1Interpolated = rotation1.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, width * 0.2, 0, -width * 0.2, 0],
  });

  const translateX2Interpolated = rotation2.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -width * 0.15, 0, width * 0.15, 0],
  });

  // Add gentle vertical movement for more organic motion
  const translateY1Interpolated = rotation1.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -height * 0.05, 0],
  });

  const translateY2Interpolated = rotation2.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, height * 0.03, 0],
  });

  // Smooth sine wave scaling that loops perfectly - derived from rotation
  const scale1Interpolated = rotation1.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 1.2, 1, 0.9, 1],
  });

  const scale2Interpolated = rotation2.interpolate({
    inputRange: [0, 0.33, 0.66, 1],
    outputRange: [1.1, 0.9, 1.3, 1.1],
  });

  return (
    <View style={[styles.container, { width, height }]}>
      {/* First gradient layer - larger and more visible */}
      <Animated.View
        style={[
          styles.gradientLayer,
          {
            transform: [
              { translateX: translateX1Interpolated },
              { translateY: translateY1Interpolated },
              { rotate: rotation1Interpolated },
              { scale: scale1Interpolated },
            ],
            opacity: 0.8 * intensity,
          },
        ]}
      >
        <LinearGradient
          colors={[`${colorStops[0]}60`, `${colorStops[1]}80`, `${colorStops[2]}60`]}
          style={[styles.gradient, { width: width * 2, height: height * 0.9 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Second gradient layer */}
      <Animated.View
        style={[
          styles.gradientLayer,
          {
            transform: [
              { translateX: translateX2Interpolated },
              { translateY: translateY2Interpolated },
              { rotate: rotation2Interpolated },
              { scale: scale2Interpolated },
            ],
            opacity: 0.6 * intensity,
          },
        ]}
      >
        <LinearGradient
          colors={[`${colorStops[2]}40`, `${colorStops[0]}70`, `${colorStops[1]}50`]}
          style={[styles.gradient, { width: width * 1.8, height: height * 0.8 }]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </Animated.View>

      {/* Enhanced fade to black mask with more dramatic gradient */}
      <LinearGradient
        colors={['#00000000', '#00000040', '#00000090', '#000000']}
        style={styles.fadeOverlay}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0.2 }}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  gradientLayer: {
    position: 'absolute',
    bottom: -400,
    left: -200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    borderRadius: 300,
  },
  fadeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    width: '100%',
  },
});
