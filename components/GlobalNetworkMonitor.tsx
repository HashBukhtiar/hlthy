import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const GlobalNetworkMonitor: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [previousOnlineState, setPreviousOnlineState] = useState(true);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    console.log('GlobalNetworkMonitor mounted');
    
    const unsubscribe = NetInfo.addEventListener(state => {
      const isNowOnline = state.isConnected ?? false;
      
      console.log('Network state changed:', {
        isConnected: state.isConnected,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
      });

      // Only animate if state actually changed
      if (previousOnlineState !== isNowOnline) {
        setPreviousOnlineState(isNowOnline);
        setIsOnline(isNowOnline);

        if (!isNowOnline) {
          // Going offline - slide banner in
          console.log('📴 Going offline - showing banner');
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        } else {
          // Coming back online - show briefly then hide
          console.log('📶 Coming back online');
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();

          // Hide after 2 seconds
          setTimeout(() => {
            Animated.timing(slideAnim, {
              toValue: -100,
              duration: 300,
              useNativeDriver: true,
            }).start();
          }, 2000);
        }
      }
    });

    return () => {
      console.log('GlobalNetworkMonitor unmounting');
      unsubscribe();
    };
  }, [previousOnlineState]);

  // Don't render anything if we're online and haven't shown the banner yet
  if (isOnline && previousOnlineState) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          top: insets.top,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={[
        styles.banner,
        isOnline ? styles.onlineBanner : styles.offlineBanner
      ]}>
        <Ionicons
          name={isOnline ? "checkmark-circle" : "cloud-offline"}
          size={18}
          color="#fff"
          style={styles.icon}
        />
        <Text style={styles.bannerText}>
          {isOnline ? "Back Online" : "No Internet Connection"}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 99999,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  offlineBanner: {
    backgroundColor: '#FF3B30',
  },
  onlineBanner: {
    backgroundColor: '#34C759',
  },
  icon: {
    marginRight: 8,
  },
  bannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});