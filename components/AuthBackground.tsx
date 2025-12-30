import React from 'react';
import { View, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Aurora from '@/components/Aurora';
import { useScreenIsFocused } from '@/hooks/useScreenIsFocused';

interface AuthBackgroundProps {
  children: React.ReactNode;
}

export default function AuthBackground({ children }: AuthBackgroundProps) {
  const { height } = Dimensions.get('window');
  const isFocused = useScreenIsFocused();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Base background gradient */}
      <LinearGradient
        colors={['#000000', '#121212']}
        style={[styles.gradient, { height: height + 100 }]}
      />
      
      <View style={styles.auroraContainer}>
        {isFocused && (
          <Aurora 
            colorStops={['#FF2D55', '#a434eb', '#5227FF']}
            speed={0.8}
            intensity={1.2}
          />
        )}
      </View>
      
      {/* Content */}
      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  auroraContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    zIndex: 2,
  },
  contentContainer: {
    flex: 1,
    zIndex: 10,
  },
});
