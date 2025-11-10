import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import CustomSpinner from '@/components/CustomSpinner';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  size?: number;
}

export default function LoadingOverlay({ 
  visible, 
  message = 'Loading...', 
  size = 48 
}: LoadingOverlayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = React.useState(visible);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setShouldRender(false));
    }
  }, [visible, fadeAnim]);

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      <Animated.View 
        style={[styles.blocker, { opacity: fadeAnim }]} 
        pointerEvents={visible ? "auto" : "none"}
      />
      <Animated.View 
        style={[styles.overlay, { opacity: fadeAnim }]} 
        pointerEvents={visible ? "auto" : "none"}
      >
        <CustomSpinner size={size} />
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  blocker: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
  overlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 180,
    height: 180,
    marginLeft: -90,
    marginTop: -90,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  text: {
    color: '#FFFFFF',
    marginTop: 24,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});
