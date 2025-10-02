import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OfflineIndicatorProps {
  isFullScreen?: boolean;
  onRetry?: () => void;
  message?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isFullScreen = false,
  onRetry,
  message = "No internet connection"
}) => {
  if (isFullScreen) {
    return (
      <View style={styles.fullScreenContainer}>
        <View style={styles.fullScreenContent}>
          <Ionicons name="cloud-offline" size={80} color="#FF3B30" />
          <Text style={styles.fullScreenTitle}>You're Offline</Text>
          <Text style={styles.fullScreenMessage}>
            {message}. Please check your connection and try again.
          </Text>
          {onRetry && (
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.bannerContent}>
        <Ionicons name="cloud-offline" size={20} color="#FF3B30" />
        <Text style={styles.bannerText}>{message}</Text>
      </View>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.bannerRetry}>
          <Ionicons name="refresh" size={16} color="#FF3B30" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Full Screen Styles
  fullScreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: 20,
  },
  fullScreenContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  fullScreenTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },
  fullScreenMessage: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Banner Styles
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bannerText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  bannerRetry: {
    padding: 4,
    marginLeft: 8,
  },
});