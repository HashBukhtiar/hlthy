import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ErrorBoundaryProps } from 'expo-router';
import { ACCENT_COLOR } from '@/constants/Colors';
import { logger } from '@/shared/utils/logger';
import { Sentry } from '@/shared/utils/sentry';

/**
 * Top-level fallback rendered by Expo Router's ErrorBoundary when a route
 * subtree throws during render. Without this, an uncaught render error shows a
 * blank white screen with no way to recover. `retry()` re-mounts the segment.
 *
 * When Sentry is wired up, report the error from here (see TODO below).
 */
export default function AppErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  React.useEffect(() => {
    logger.error('AppErrorBoundary', 'Uncaught render error', error);
    // No-op until a Sentry DSN is configured (see shared/utils/sentry.ts).
    Sentry.captureException(error);
  }, [error]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="warning-outline" size={56} color={ACCENT_COLOR} />
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          The app hit an unexpected error. You can try again, and if it keeps
          happening, please let us know.
        </Text>
        {__DEV__ && !!error?.message && (
          <Text style={styles.devDetail} numberOfLines={6}>
            {error.message}
          </Text>
        )}
        <TouchableOpacity style={styles.button} onPress={retry} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  message: {
    color: '#8E8E93',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  devDetail: {
    color: '#FF453A',
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    textAlign: 'center',
    marginTop: 4,
  },
  button: {
    backgroundColor: ACCENT_COLOR,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
