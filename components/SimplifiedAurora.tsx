import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Animated, Dimensions, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface SimplifiedAuroraProps {
  colorStops?: string[];
  speed?: number;
  intensity?: number;
}

export default function SimplifiedAurora({ 
  colorStops = ['#FF2D55', '#a434eb', '#5227FF'],
  speed = 1.0,
  intensity = 1.0
}: SimplifiedAuroraProps) {
  const { width, height } = Dimensions.get('window');
  const [isReady, setIsReady] = useState(false);
  
  // Animation values - multiple wave layers for complexity
  const translateY1 = useRef(new Animated.Value(0)).current;
  const translateY2 = useRef(new Animated.Value(0)).current;
  const translateY3 = useRef(new Animated.Value(0)).current;
  const translateY4 = useRef(new Animated.Value(0)).current;
  const translateX1 = useRef(new Animated.Value(0)).current;
  const translateX2 = useRef(new Animated.Value(0)).current;
  const opacity1 = useRef(new Animated.Value(0.5)).current;
  const opacity2 = useRef(new Animated.Value(0.4)).current;
  const opacity3 = useRef(new Animated.Value(0.3)).current;
  const opacity4 = useRef(new Animated.Value(0.2)).current;
  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    // Add a slight delay for smoother startup
    setTimeout(() => setIsReady(true), 100);
    
    // Create continuous animation drivers for smooth, non-glitchy movement
    // We'll use a single continuous animation value for each animation
    // and interpolate the values to create smooth sinusoidal waves
    
    // Helper function to create perfectly continuous time-based animations
    const createContinuousDriver = (baseTime = 10000) => {
      // Create an animated value that cycles from 0 to 1
      const animDriver = new Animated.Value(0);
      
      // Use loop with timing for continuous movement without jumps
      const anim = Animated.loop(
        Animated.timing(animDriver, {
          toValue: 1,
          duration: baseTime / speed,
          easing: Easing.linear, // Linear easing for smoothest interpolation
          useNativeDriver: true
        })
      );
      
      return { driver: animDriver, animation: anim };
    };
    
    // Create prime-based timings to avoid synchronization patterns
    // This helps make the movement look more organic and less repetitive
    const getUniqueTime = (baseTime: number): number => {
      const primes = [97, 101, 103, 107, 109, 113, 127, 131, 137];
      const randomPrime = primes[Math.floor(Math.random() * primes.length)];
      return baseTime * (randomPrime / 100);
    };
    
    // Create smooth continuous sine wave interpolators
    // Instead of sequence-based animations (which cause jumps),
    // we'll use continuous drivers with sine wave interpolation
    
    // Y-axis continuous wave drivers
    const y1Driver = createContinuousDriver(getUniqueTime(12000));
    const y2Driver = createContinuousDriver(getUniqueTime(15000));
    const y3Driver = createContinuousDriver(getUniqueTime(13000));
    const y4Driver = createContinuousDriver(getUniqueTime(16000));
    
    // X-axis continuous wave drivers
    const x1Driver = createContinuousDriver(getUniqueTime(18000));
    const x2Driver = createContinuousDriver(getUniqueTime(20000));
    
    // Scale and opacity continuous drivers
    const opacity1Driver = createContinuousDriver(getUniqueTime(9000));
    const opacity2Driver = createContinuousDriver(getUniqueTime(11000));
    const opacity3Driver = createContinuousDriver(getUniqueTime(13000));
    const opacity4Driver = createContinuousDriver(getUniqueTime(15000));
    const scale1Driver = createContinuousDriver(getUniqueTime(19000));
    const scale2Driver = createContinuousDriver(getUniqueTime(21000));
    
    // Set up interpolations for Y movements - smooth sine waves
    translateY1.setValue(0);
    // Use direct connection to driver values via interpolate
    // This creates a smooth sinusoidal movement with no jumps
    translateY1.addListener(() => {});
    Animated.timing(translateY1, { 
      toValue: 0, 
      duration: 1, 
      useNativeDriver: true 
    }).start();
    
    // Connect the driver to the animation value
    y1Driver.driver.addListener(({ value }) => {
      // Map the 0-1 driver to a sine wave movement pattern
      const mappedValue = Math.sin(value * Math.PI * 2) * height * 0.08;
      translateY1.setValue(mappedValue);
    });
    
    translateY2.setValue(0);
    translateY2.addListener(() => {});
    Animated.timing(translateY2, { 
      toValue: 0, 
      duration: 1, 
      useNativeDriver: true 
    }).start();
    
    y2Driver.driver.addListener(({ value }) => {
      // Offset phase for more natural movement
      const mappedValue = Math.sin((value + 0.2) * Math.PI * 2) * height * 0.06 * -1;
      translateY2.setValue(mappedValue);
    });
    
    translateY3.setValue(0);
    translateY3.addListener(() => {});
    Animated.timing(translateY3, { 
      toValue: 0, 
      duration: 1, 
      useNativeDriver: true 
    }).start();
    
    y3Driver.driver.addListener(({ value }) => {
      // Different phase and amplitude
      const mappedValue = Math.sin((value + 0.4) * Math.PI * 2) * height * 0.07;
      translateY3.setValue(mappedValue);
    });
    
    translateY4.setValue(0);
    translateY4.addListener(() => {});
    Animated.timing(translateY4, { 
      toValue: 0, 
      duration: 1, 
      useNativeDriver: true 
    }).start();
    
    y4Driver.driver.addListener(({ value }) => {
      // Use cosine for phase variety
      const mappedValue = Math.cos(value * Math.PI * 2) * height * 0.05 * -1;
      translateY4.setValue(mappedValue);
    });
    
    // X movement with continuous waves
    translateX1.setValue(0);
    translateX1.addListener(() => {});
    Animated.timing(translateX1, { 
      toValue: 0, 
      duration: 1, 
      useNativeDriver: true 
    }).start();
    
    x1Driver.driver.addListener(({ value }) => {
      // Horizontal movement with sine
      const mappedValue = Math.sin(value * Math.PI * 2) * width * 0.04;
      translateX1.setValue(mappedValue);
    });
    
    translateX2.setValue(0);
    translateX2.addListener(() => {});
    Animated.timing(translateX2, { 
      toValue: 0, 
      duration: 1, 
      useNativeDriver: true 
    }).start();
    
    x2Driver.driver.addListener(({ value }) => {
      // Horizontal movement with cosine for variety
      const mappedValue = Math.cos((value + 0.25) * Math.PI * 2) * width * 0.05 * -1;
      translateX2.setValue(mappedValue);
    });
    
    // Opacity with smooth sine waves
    opacity1.setValue(0.5 * intensity);
    opacity1.addListener(() => {});
    Animated.timing(opacity1, { 
      toValue: 0.5 * intensity, 
      duration: 1, 
      useNativeDriver: true 
    }).start();
    
    opacity1Driver.driver.addListener(({ value }) => {
      // Oscillate opacity with sine
      const baseValue = 0.5 * intensity;
      const amplitude = 0.15 * intensity;
      const mappedValue = baseValue + Math.sin(value * Math.PI * 2) * amplitude;
      opacity1.setValue(mappedValue);
    });
    
    opacity2.setValue(0.4 * intensity);
    opacity2.addListener(() => {});
    Animated.timing(opacity2, { 
      toValue: 0.4 * intensity, 
      duration: 1, 
      useNativeDriver: true 
    }).start();
    
    opacity2Driver.driver.addListener(({ value }) => {
      // Different phase for opacity
      const baseValue = 0.4 * intensity;
      const amplitude = 0.12 * intensity;
      const mappedValue = baseValue + Math.sin((value + 0.3) * Math.PI * 2) * amplitude;
      opacity2.setValue(mappedValue);
    });
    
    opacity3.setValue(0.3 * intensity);
    opacity3.addListener(() => {});
    Animated.timing(opacity3, { 
      toValue: 0.3 * intensity, 
      duration: 1, 
      useNativeDriver: true 
    }).start();
    
    opacity3Driver.driver.addListener(({ value }) => {
      // Yet another phase
      const baseValue = 0.3 * intensity;
      const amplitude = 0.1 * intensity;
      const mappedValue = baseValue + Math.sin((value + 0.6) * Math.PI * 2) * amplitude;
      opacity3.setValue(mappedValue);
    });
    
    opacity4.setValue(0.25 * intensity);
    opacity4.addListener(() => {});
    Animated.timing(opacity4, { 
      toValue: 0.25 * intensity, 
      duration: 1, 
      useNativeDriver: true 
    }).start();
    
    opacity4Driver.driver.addListener(({ value }) => {
      // Different frequency for variety
      const baseValue = 0.25 * intensity;
      const amplitude = 0.08 * intensity;
      const mappedValue = baseValue + Math.sin((value + 0.9) * Math.PI * 2) * amplitude;
      opacity4.setValue(mappedValue);
    });
    
    // Scale animations with continuous waves
    scale1.setValue(1);
    scale1.addListener(() => {});
    Animated.timing(scale1, { 
      toValue: 1, 
      duration: 1, 
      useNativeDriver: true 
    }).start();
    
    scale1Driver.driver.addListener(({ value }) => {
      // Breathing effect
      const baseValue = 1;
      const amplitude = 0.05;
      const mappedValue = baseValue + Math.sin(value * Math.PI * 2) * amplitude;
      scale1.setValue(mappedValue);
    });
    
    scale2.setValue(1);
    scale2.addListener(() => {});
    Animated.timing(scale2, { 
      toValue: 1, 
      duration: 1, 
      useNativeDriver: true 
    }).start();
    
    scale2Driver.driver.addListener(({ value }) => {
      // Different phase for scale
      const baseValue = 1;
      const amplitude = 0.08;
      const mappedValue = baseValue + Math.sin((value + 0.5) * Math.PI * 2) * amplitude;
      scale2.setValue(mappedValue);
    });
    
    // Start all animations with slight phase shifts for more organic movement
    const startAllAnimations = () => {
      // Group all animations
      const allAnimations = [
        y1Driver.animation, y2Driver.animation, y3Driver.animation, y4Driver.animation,
        x1Driver.animation, x2Driver.animation,
        opacity1Driver.animation, opacity2Driver.animation, opacity3Driver.animation, opacity4Driver.animation,
        scale1Driver.animation, scale2Driver.animation
      ];
      
      // Start each with a slight delay for phase difference
      allAnimations.forEach((anim, index) => {
        // Add a small random offset to make movement even more organic
        const phaseOffset = index * 80 + Math.random() * 40;
        setTimeout(() => anim.start(), phaseOffset);
      });
    };
    
    // Start all animations
    startAllAnimations();
    
    return () => {
      // Clean up animations and listeners
      const allDrivers = [
        y1Driver, y2Driver, y3Driver, y4Driver,
        x1Driver, x2Driver,
        opacity1Driver, opacity2Driver, opacity3Driver, opacity4Driver,
        scale1Driver, scale2Driver
      ];
      
      allDrivers.forEach(driver => {
        driver.animation.stop();
        driver.driver.removeAllListeners();
      });
      
      // Clean up animation values
      [translateY1, translateY2, translateY3, translateY4, 
       translateX1, translateX2, 
       opacity1, opacity2, opacity3, opacity4,
       scale1, scale2].forEach(anim => anim.stopAnimation());
    };
  }, [speed, height, width, intensity]);
  
  // Don't render until ready
  if (!isReady) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Base glow layer */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0)', 
          `rgba(${parseInt(colorStops[1].slice(1, 3), 16)},${parseInt(colorStops[1].slice(3, 5), 16)},${parseInt(colorStops[1].slice(5, 7), 16)},0.05)`, 
          'rgba(0,0,0,0)'
        ]}
        style={[styles.baseGlow, { top: height * 0.25 }]}
      />
      
      {/* First aurora wave - bottom most */}
      <Animated.View 
        style={[
          styles.auroraWave,
          { 
            transform: [
              { translateY: translateY1 },
              { translateX: translateX1 },
              { scale: scale1 }
            ],
            opacity: opacity1,
            height: height * 1.0,
            top: height * 0.3,
            borderTopLeftRadius: width * 0.8,
            borderTopRightRadius: width * 0.7,
          }
        ]}
      >
        <LinearGradient
          colors={[
            'transparent', 
            colorStops[0] + '70', // Semi-transparent
            colorStops[1] + '60',
            colorStops[2] + '70'
          ]}
          locations={[0, 0.3, 0.6, 0.9]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.8 }}
          style={styles.gradient}
        />
      </Animated.View>
      
      {/* Second aurora wave - with different shape and timing */}
      <Animated.View 
        style={[
          styles.auroraWave,
          { 
            transform: [
              { translateY: translateY2 },
              { translateX: translateX2 },
              { scale: scale2 }
            ],
            opacity: opacity2,
            height: height * 0.95,
            top: height * 0.15,
            left: '-35%',
            width: '170%',
            borderTopLeftRadius: width * 0.5,
            borderTopRightRadius: width * 1.0,
          }
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            colorStops[2] + '50', 
            colorStops[1] + '60',
            colorStops[0] + '50'
          ]}
          locations={[0, 0.4, 0.7, 0.9]}
          start={{ x: 1, y: 0.2 }}
          end={{ x: 0, y: 0.9 }}
          style={styles.gradient}
        />
      </Animated.View>
      
      {/* Third aurora wave with different shape */}
      <Animated.View 
        style={[
          styles.auroraWave,
          { 
            transform: [
              { translateY: translateY3 },
              { scale: 1.05 }
            ],
            opacity: opacity3,
            height: height * 0.9,
            top: height * 0.2,
            borderTopLeftRadius: width * 0.9,
            borderTopRightRadius: width * 0.6,
          }
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            colorStops[0] + '30', 
            colorStops[2] + '40',
            colorStops[1] + '30'
          ]}
          locations={[0, 0.25, 0.6, 0.85]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 0.85 }}
          style={styles.gradient}
        />
      </Animated.View>
      
      {/* Fourth aurora wave - adds more complexity */}
      <Animated.View 
        style={[
          styles.auroraWave,
          { 
            transform: [
              { translateY: translateY4 }
            ],
            opacity: opacity4,
            height: height * 0.85,
            top: height * 0.25,
            left: '-20%',
            width: '140%',
            borderTopLeftRadius: width * 0.7,
            borderTopRightRadius: width * 0.8,
          }
        ]}
      >
        <LinearGradient
          colors={[
            'transparent',
            colorStops[1] + '35', 
            colorStops[0] + '40',
            colorStops[2] + '35'
          ]}
          locations={[0, 0.3, 0.65, 0.9]}
          start={{ x: 0.5, y: 0.2 }}
          end={{ x: 0.5, y: 0.9 }}
          style={styles.gradient}
        />
      </Animated.View>
      
      {/* Additional glow layer */}
      <View style={styles.overlayGlow}>
        <LinearGradient
          colors={[
            'rgba(0,0,0,0)',
            `rgba(${parseInt(colorStops[0].slice(1, 3), 16)},${parseInt(colorStops[0].slice(3, 5), 16)},${parseInt(colorStops[0].slice(5, 7), 16)},0.12)`,
            `rgba(${parseInt(colorStops[1].slice(1, 3), 16)},${parseInt(colorStops[1].slice(3, 5), 16)},${parseInt(colorStops[1].slice(5, 7), 16)},0.15)`,
            `rgba(${parseInt(colorStops[2].slice(1, 3), 16)},${parseInt(colorStops[2].slice(3, 5), 16)},${parseInt(colorStops[2].slice(5, 7), 16)},0.12)`,
            'rgba(0,0,0,0)'
          ]}
          locations={[0, 0.25, 0.5, 0.75, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>
      
      <LinearGradient
        colors={[
          'rgba(0,0,0,0)',
          colorStops[1] + '30',
          colorStops[2] + '40'
        ]}
        style={styles.floorLayer}
      />
      
      {/* Blur layer for better blending on iOS */}
      {Platform.OS === 'ios' && (
        <BlurView intensity={15} style={styles.blurLayer} tint="dark" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 2,
    overflow: 'hidden',
    paddingBottom: 100, // Extra padding to cover the bottom notch area
  },
  auroraWave: {
    position: 'absolute',
    width: '150%',
    left: '-25%',
    borderRadius: 300,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
  overlayGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 3,
  },
  baseGlow: {
    position: 'absolute',
    width: '100%',
    height: '70%',
    zIndex: 1,
  },
  blurLayer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 4,
    opacity: 0.5,
  },
  floorLayer: {
    position: 'absolute',
    width: '100%',
    height: 150,
    bottom: -50,
    zIndex: 3,
  }
});
