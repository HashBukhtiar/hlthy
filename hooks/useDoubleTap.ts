import { useRef, useCallback, useEffect } from 'react';
import { Haptics } from 'expo-haptics';
import { Platform } from 'react-native';

interface DoubleTapConfig {
  onDoubleTap: () => void;
  delay?: number;
  onSingleTap?: () => void;
  enableHaptics?: boolean;
  debounceTime?: number; // Prevent rapid multiple taps
}

interface DoubleTapHandlers {
  onPress: () => void;
}

export const useDoubleTap = (config: DoubleTapConfig): DoubleTapHandlers => {
  const {
    onDoubleTap,
    delay = Platform.OS === 'ios' ? 300 : 350, // Slightly longer delay for Android
    onSingleTap,
    enableHaptics = true,
    debounceTime = 100 // Prevent rapid multiple taps
  } = config;

  const lastTapRef = useRef<number>(0);
  const tapCountRef = useRef<number>(0);
  const singleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDoubleTapRef = useRef<number>(0);

  const handlePress = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    // Clear any pending single tap timeout
    if (singleTapTimeoutRef.current) {
      clearTimeout(singleTapTimeoutRef.current);
      singleTapTimeoutRef.current = null;
    }

    if (timeSinceLastTap < delay) {
      // Check if we're within debounce time to prevent rapid multiple double-taps
      const timeSinceLastDoubleTap = now - lastDoubleTapRef.current;
      if (timeSinceLastDoubleTap < debounceTime) {
        return; // Ignore this tap if it's too soon after the last double-tap
      }

      // This is a double tap
      tapCountRef.current = 0;
      lastTapRef.current = 0;
      lastDoubleTapRef.current = now;
      
      // Trigger haptic feedback if enabled
      if (enableHaptics) {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
          // Haptics might not be available on all devices or simulators
          if (__DEV__) {
            console.log('Haptics not available:', error);
          }
        }
      }
      
      // Execute double tap callback with error handling
      try {
        onDoubleTap();
      } catch (error) {
        if (__DEV__) {
          console.error('Error in double tap handler:', error);
        }
      }
    } else {
      // This might be a single tap, wait to see if another tap comes
      tapCountRef.current = 1;
      lastTapRef.current = now;

      if (onSingleTap) {
        singleTapTimeoutRef.current = setTimeout(() => {
          if (tapCountRef.current === 1) {
            onSingleTap();
          }
          tapCountRef.current = 0;
          singleTapTimeoutRef.current = null;
        }, delay);
      }
    }
  }, [onDoubleTap, onSingleTap, delay, enableHaptics]);

  // Cleanup function to clear timeouts
  const cleanup = useCallback(() => {
    if (singleTapTimeoutRef.current) {
      clearTimeout(singleTapTimeoutRef.current);
      singleTapTimeoutRef.current = null;
    }
    tapCountRef.current = 0;
    lastTapRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Return handlers
  return {
    onPress: handlePress,
  };
};

// Export cleanup utility for components that need manual cleanup
export const useDoubleTapCleanup = () => {
  const cleanupRef = useRef<(() => void) | null>(null);

  const setCleanup = useCallback((cleanupFn: () => void) => {
    cleanupRef.current = cleanupFn;
  }, []);

  const performCleanup = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
    }
  }, []);

  return { setCleanup, performCleanup };
};