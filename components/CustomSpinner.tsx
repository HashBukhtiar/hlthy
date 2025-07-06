import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface CustomSpinnerProps {
  size?: number;
  duration?: number;
}

export default function CustomSpinner({ size = 80, duration = 1700 }: CustomSpinnerProps) {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: duration,
        useNativeDriver: true,
      })
    );

    spinAnimation.start();

    return () => spinAnimation.stop();
  }, [spinValue, duration]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background blur effect */}
      <View 
        style={[
          styles.backgroundBlur, 
          { 
            width: size, 
            height: size, 
            borderRadius: size / 2 
          }
        ]} 
      />
      
      {/* Animated spinning gradient */}
      <Animated.View
        style={[
          styles.spinnerContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ rotate: spin }],
          },
        ]}
      >
        <LinearGradient
          colors={['#BA42FF', '#00E1FF']} // Purple to cyan gradient matching the landing page
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradient,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />
      </Animated.View>
      
      {/* Inner circle */}
      <View
        style={[
          styles.innerCircle,
          {
            width: size * 0.7,
            height: size * 0.7,
            borderRadius: (size * 0.7) / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backgroundBlur: {
    position: 'absolute',
    backgroundColor: 'rgba(186, 66, 255, 0.3)',
    shadowColor: '#BA42FF',
    shadowOffset: {
      width: 0,
      height: -5,
    },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 20,
  },
  spinnerContainer: {
    position: 'absolute',
    shadowColor: '#00E1FF',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 20,
  },
  gradient: {
    // The LinearGradient will fill this container
  },
  innerCircle: {
    position: 'absolute',
    backgroundColor: '#242424', // Dark background matching the theme
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 15,
  },
});
