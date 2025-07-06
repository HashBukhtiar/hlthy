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
  
  // Create continuous rotation and movement values
  const rotation1 = useRef(new Animated.Value(0)).current;
  const rotation2 = useRef(new Animated.Value(0)).current;
  const translateX1 = useRef(new Animated.Value(0)).current;
  const translateX2 = useRef(new Animated.Value(0)).current;
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  
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

    // Start continuous rotations with different speeds to avoid sync
    const rotationAnim1 = createContinuousAnimation(rotation1, 20000);
    const rotationAnim2 = createContinuousAnimation(rotation2, 25000);
    
    // Continuous horizontal movement
    const translateAnim1 = createContinuousAnimation(translateX1, 15000);
    const translateAnim2 = createContinuousAnimation(translateX2, 18000);
    
    // Continuous scale pulsing
    const scaleAnim1 = createContinuousAnimation(scale1, 12000);
    const scaleAnim2 = createContinuousAnimation(scale2, 14000);

    // Start all animations
    rotationAnim1.start();
    rotationAnim2.start();
    translateAnim1.start();
    translateAnim2.start();
    scaleAnim1.start();
    scaleAnim2.start();

    return () => {
      rotationAnim1.stop();
      rotationAnim2.stop();
      translateAnim1.stop();
      translateAnim2.stop();
      scaleAnim1.stop();
      scaleAnim2.stop();
    };
  }, [speed, rotation1, rotation2, translateX1, translateX2, scale1, scale2]);

  // Create interpolations for smooth continuous motion
  const rotation1Interpolated = rotation1.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const rotation2Interpolated = rotation2.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'], // Opposite direction
  });

  const translateX1Interpolated = translateX1.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.3, width * 0.3],
  });

  const translateX2Interpolated = translateX2.interpolate({
    inputRange: [0, 1],
    outputRange: [width * 0.2, -width * 0.2],
  });

  const scale1Interpolated = scale1.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.3, 1],
  });

  const scale2Interpolated = scale2.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1.2, 0.8, 1.2],
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
