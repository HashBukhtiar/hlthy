import { ExpoConfig, ConfigContext } from 'expo/config';

// Environment helper function
const getEnvironmentVariable = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    // For non-critical variables, you might want to return a default instead of throwing
    return '';
  }
  return value;
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'hlthy',
  slug: 'hlthy',
  // Your existing configuration from app.json
  extra: {
    ...config.extra,
    // You can add references to environment variables here if needed
    // for values that don't use EXPO_PUBLIC prefix
    // These would be accessible via Constants.expoConfig.extra
  },
});