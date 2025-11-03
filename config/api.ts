// API Configuration
// Automatically uses local API in development, production in release builds

const getApiUrl = () => {
  // Check if we're in development mode
  const isDevelopment = __DEV__;
  
  // Use environment variable if explicitly set (overrides everything)
  if (process.env.EXPO_PUBLIC_API_URL) {
    console.log('🔧 Using custom API URL from environment:', process.env.EXPO_PUBLIC_API_URL);
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // Development mode: use local server
  if (isDevelopment) {
    // For React Native: use your computer's IP (not localhost)
    // The IP will be detected automatically from Expo's environment
    // Or set EXPO_PUBLIC_DEV_API_IP in .env to override
    const devIP = process.env.EXPO_PUBLIC_DEV_API_IP || 'localhost';
    const localUrl = `http://${devIP}:8080`;
    console.log('🔥 DEV MODE: Using local API server:', localUrl);
    console.log('💡 Make sure to run: cd ai && python api_server.py');
    if (devIP === 'localhost') {
      console.warn('⚠️  Using localhost - may not work on physical device!');
      console.warn('💡 Set EXPO_PUBLIC_DEV_API_IP=<your-ip> in .env');
    }
    return localUrl;
  }
  
  // Production mode: use Cloud Run
  const prodUrl = 'https://hlthy-ai-service-s4rm2uw5oa-pd.a.run.app';
  console.log('🚀 PRODUCTION MODE: Using Cloud Run API:', prodUrl);
  return prodUrl;
};

export const API_BASE_URL = getApiUrl();

// Log on module load
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔧 API CONFIGURATION LOADED');
console.log(`📍 Current API: ${API_BASE_URL}`);
console.log(`🏷️  Mode: ${__DEV__ ? 'DEVELOPMENT' : 'PRODUCTION'}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
