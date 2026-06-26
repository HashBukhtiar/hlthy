import * as Sentry from '@sentry/react-native';

/**
 * Initialize Sentry crash/error reporting.
 *
 * No-op until EXPO_PUBLIC_SENTRY_DSN is set, so the app runs unchanged until a
 * DSN is provided. Once set, rebuild (the native Sentry module is configured by
 * the `@sentry/react-native` Expo config plugin in app.json).
 *
 * For source-map symbolication in release builds, also configure SENTRY_ORG /
 * SENTRY_PROJECT / SENTRY_AUTH_TOKEN at EAS build time.
 */
export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    // Lower trace sampling in production to control cost; full in dev.
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Don't spam Sentry with errors while developing.
    enabled: !__DEV__,
  });
}

export { Sentry };
