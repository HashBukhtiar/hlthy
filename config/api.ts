// API Configuration
// Set EXPO_PUBLIC_API_URL in .env file to configure the API endpoint

const getApiUrl = () => {
  // Always use environment variable if set
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Default to production Google Cloud Run service
  return 'https://hlthy-ai-service-s4rm2uw5oa-pd.a.run.app';
};

export const API_BASE_URL = getApiUrl();
