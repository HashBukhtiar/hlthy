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
    
    // Complex Y-axis wave movements with different timings and ranges
    const animateY1 = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY1, {
          toValue: height * 0.15,
          duration: 18000 / speed,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true
        }),
        Animated.timing(translateY1, {
          toValue: -height * 0.05,
          duration: 16000 / speed,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true
        })
      ])
    );
    
    const animateY2 = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY2, {
          toValue: height * 0.1,
          duration: 22000 / speed,
          easing: Easing.bezier(0.12, 0.6, 0.38, 0.9),
          useNativeDriver: true
        }),
        Animated.timing(translateY2, {
          toValue: -height * 0.08,
          duration: 20000 / speed,
          easing: Easing.bezier(0.45, 0.05, 0.55, 0.95),
          useNativeDriver: true
        })
      ])
    );
    
    // Add X-axis movement for more complex wave patterns
    const animateX1 = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX1, {
          toValue: width * 0.1,
          duration: 24000 / speed,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true
        }),
        Animated.timing(translateX1, {
          toValue: -width * 0.1,
          duration: 24000 / speed,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true
        })
      ])
    );
    
    const animateX2 = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX2, {
          toValue: -width * 0.08,
          duration: 30000 / speed,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true
        }),
        Animated.timing(translateX2, {
          toValue: width * 0.08,
          duration: 30000 / speed,
          easing: Easing.bezier(0.42, 0, 0.58, 1),
          useNativeDriver: true
        })
      ])
    );

    // Additional wave layers with different timing
    const animateY3 = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY3, {
          toValue: height * 0.12,
          duration: 15000 / speed,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true
        }),
        Animated.timing(translateY3, {
          toValue: -height * 0.06,
          duration: 14000 / speed,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          useNativeDriver: true
        })
      ])
    );
    
    const animateY4 = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY4, {
          toValue: height * 0.07,
          duration: 27000 / speed,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true
        }),
        Animated.timing(translateY4, {
          toValue: -height * 0.03,
          duration: 25000 / speed,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true
        })
      ])
    );
    
    // Opacity pulsing animations with different timings
    const animateOpacity1 = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity1, {
          toValue: 0.75 * intensity,
          duration: 9000 / speed,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true
        }),
        Animated.timing(opacity1, {
          toValue: 0.5 * intensity,
          duration: 8000 / speed,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true
        })
      ])
    );
    
    const animateOpacity2 = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity2, {
          toValue: 0.65 * intensity,
          duration: 11000 / speed,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true
        }),
        Animated.timing(opacity2, {
          toValue: 0.35 * intensity,
          duration: 10000 / speed,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true
        })
      ])
    );
    
    const animateOpacity3 = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity3, {
          toValue: 0.5 * intensity,
          duration: 13000 / speed,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true
        }),
        Animated.timing(opacity3, {
          toValue: 0.25 * intensity,
          duration: 12000 / speed,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true
        })
      ])
    );
    
    const animateOpacity4 = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity4, {
          toValue: 0.45 * intensity,
          duration: 17000 / speed,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true
        }),
        Animated.timing(opacity4, {
          toValue: 0.2 * intensity,
          duration: 15000 / speed,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true
        })
      ])
    );
    
    // Scale animations for breathing effect
    const animateScale1 = Animated.loop(
      Animated.sequence([
        Animated.timing(scale1, {
          toValue: 1.05,
          duration: 19000 / speed,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true
        }),
        Animated.timing(scale1, {
          toValue: 0.95,
          duration: 18000 / speed,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true
        })
      ])
    );
    
    const animateScale2 = Animated.loop(
      Animated.sequence([
        Animated.timing(scale2, {
          toValue: 1.08,
          duration: 23000 / speed,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true
        }),
        Animated.timing(scale2, {
          toValue: 0.98,
          duration: 21000 / speed,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: true
        })
      ])
    );
    
    // Start all animations with slight delays
    setTimeout(() => animateY1.start(), 0);
    setTimeout(() => animateY2.start(), 200);
    setTimeout(() => animateY3.start(), 400);
    setTimeout(() => animateY4.start(), 600);
    setTimeout(() => animateX1.start(), 100);
    setTimeout(() => animateX2.start(), 300);
    setTimeout(() => animateOpacity1.start(), 0);
    setTimeout(() => animateOpacity2.start(), 250);
    setTimeout(() => animateOpacity3.start(), 500);
    setTimeout(() => animateOpacity4.start(), 750);
    setTimeout(() => animateScale1.start(), 150);
    setTimeout(() => animateScale2.start(), 350);
    
    return () => {
      // Clean up animations
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
