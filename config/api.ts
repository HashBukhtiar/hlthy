// API Configuration
// Set EXPO_PUBLIC_API_URL in .env file to configure the API endpoint

const getApiUrl = () => {
  // Always use environment variable if set
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Default to production Google Cloud Run service (updated to northamerica-northeast2)
  return 'https://hlthy-ai-service-375457000023.northamerica-northeast2.run.app';
};

export const API_BASE_URL = getApiUrl();
