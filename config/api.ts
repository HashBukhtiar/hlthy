// API Configuration
// Set EXPO_PUBLIC_API_URL in .env file to configure the API endpoint

const getApiUrl = () => {
  // Always use environment variable if set
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Fallback URLs (only used if environment variable is not set)
  if (__DEV__) {
    // Development fallback - localhost
    return 'http://localhost:5001';
  } else {
    // Production fallback - should not be reached if .env is properly configured
    throw new Error('EXPO_PUBLIC_API_URL environment variable is required in production');
  }
};

export const API_BASE_URL = getApiUrl();
