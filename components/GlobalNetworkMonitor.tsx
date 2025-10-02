import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NetworkInfo {
  isOnline: boolean;
  type: string | null;
  isInternetReachable: boolean | null;
}

export const GlobalNetworkMonitor: React.FC = () => {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    isOnline: true,
    type: null,
    isInternetReachable: null,
  });
  const [slideAnim] = useState(new Animated.Value(-100));
  const [showDetails, setShowDetails] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = networkInfo.isOnline;
      const isNowOnline = state.isConnected ?? false;
      
      setNetworkInfo({
        isOnline: isNowOnline,
        type: state.type,
        isInternetReachable: state.isInternetReachable,
      });

      // Animate banner in when going offline
      if (wasOnline && !isNowOnline) {
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }).start();
      }

      // Animate banner out when coming back online
      if (!wasOnline && isNowOnline) {
        setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }).start();
          setShowDetails(false);
        }, 2000);
      }
    });

    return () => unsubscribe();
  }, [networkInfo.isOnline]);

  const getConnectionMessage = () => {
    if (networkInfo.isOnline) {
      return "Back Online";
    }
    
    if (networkInfo.isInternetReachable === false && networkInfo.type !== 'none') {
      return `Connected to ${networkInfo.type?.toUpperCase()} but no internet`;
    }
    
    return "No Internet Connection";
  };

  const getConnectionIcon = () => {
    if (networkInfo.isOnline) return "checkmark-circle";
    if (networkInfo.isInternetReachable === false) return "warning";
    return "cloud-offline";
  };

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          top: insets.top,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents={networkInfo.isOnline ? "none" : "box-none"}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setShowDetails(!showDetails)}
        disabled={networkInfo.isOnline}
      >
        <View style={[
          styles.banner,
          networkInfo.isOnline ? styles.onlineBanner : styles.offlineBanner
        ]}>
          <Ionicons
            name={getConnectionIcon()}
            size={18}
            color="#fff"
            style={styles.icon}
          />
          <Text style={styles.bannerText} numberOfLines={1}>
            {getConnectionMessage()}
          </Text>
          {!networkInfo.isOnline && (
            <Ionicons
              name={showDetails ? "chevron-up" : "chevron-down"}
              size={16}
              color="#fff"
              style={styles.chevron}
            />
          )}
        </View>
      </TouchableOpacity>

      {/* Details Panel */}
      {showDetails && !networkInfo.isOnline && (
        <View style={styles.detailsPanel}>
          <View style={styles.detailRow}>
            <Ionicons name="information-circle-outline" size={14} color="#fff" />
            <Text style={styles.detailText}>
              Connection Type: {networkInfo.type?.toUpperCase() || 'Unknown'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="globe-outline" size={14} color="#fff" />
            <Text style={styles.detailText}>
              Internet: {networkInfo.isInternetReachable === false ? 'Not reachable' : 'Checking...'}
            </Text>
          </View>
          <Text style={styles.helpText}>
            • Check your WiFi or mobile data
          </Text>
          <Text style={styles.helpText}>
            • Try turning airplane mode on/off
          </Text>
        </View>
      )}
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
    flex: 1,
  },
  chevron: {
    marginLeft: 4,
  },
  detailsPanel: {
    backgroundColor: 'rgba(255, 59, 48, 0.95)',
    marginTop: 4,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
  helpText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
});