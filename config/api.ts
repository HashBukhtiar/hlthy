// API Configuration
// Automatically uses local API in development, production in release builds

import { logger } from '@/shared/utils/logger';

const getApiUrl = () => {
  // Check if we're in development mode
  const isDevelopment = __DEV__;

  // Use environment variable if explicitly set (overrides everything)
  if (process.env.EXPO_PUBLIC_API_URL) {
    logger.debug('ApiConfig', 'Using custom API URL from environment', process.env.EXPO_PUBLIC_API_URL);
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Development mode: use local server
  if (isDevelopment) {
    // For React Native: use your computer's IP (not localhost)
    // The IP will be detected automatically from Expo's environment
    // Or set EXPO_PUBLIC_DEV_API_IP in .env to override
    const devIP = process.env.EXPO_PUBLIC_DEV_API_IP || 'localhost';
    const localUrl = `http://${devIP}:8080`;
    logger.debug('ApiConfig', 'DEV MODE: using local API server', localUrl);
    logger.debug('ApiConfig', 'Make sure to run: cd ai && python api_server.py');
    if (devIP === 'localhost') {
      logger.warn('ApiConfig', 'Using localhost — may not work on a physical device; set EXPO_PUBLIC_DEV_API_IP=<your-ip> in .env');
    }
    return localUrl;
  }

  // Production mode: use Cloud Run
  return 'https://hlthy-ai-service-s4rm2uw5oa-pd.a.run.app';
};

export const API_BASE_URL = getApiUrl();

// Diagnostic only — debug() is a no-op in production builds.
logger.debug('ApiConfig', 'API configuration loaded', {
  api: API_BASE_URL,
  mode: __DEV__ ? 'DEVELOPMENT' : 'PRODUCTION',
});
