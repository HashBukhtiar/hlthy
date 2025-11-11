const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Add support for CJS files
defaultConfig.resolver.sourceExts.push('cjs');

// Fix for "Component auth has not been registered yet" error
defaultConfig.resolver.unstable_enablePackageExports = false;

// Add web-specific configuration
defaultConfig.resolver.resolverMainFields = [
  'browser',
  'module',
  'main',
];

// Fix for metro-runtime resolution on web
defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle metro-runtime issues on web
  if (platform === 'web') {
    // Return a mock module instead of empty for HMR-related imports
    if (moduleName.includes('metro-runtime') || 
        moduleName.includes('HMRClient') ||
        moduleName.includes('@expo/metro-runtime')) {
      return {
        type: 'sourceFile',
        filePath: require.resolve('./metro-hmr-mock.js'),
      };
    }
  }
  
  // Use default resolver for everything else
  return context.resolveRequest(context, moduleName, platform);
};

// Disable minification for web debugging
if (process.env.EXPO_WEB_DEBUG) {
  defaultConfig.transformer = {
    ...defaultConfig.transformer,
    minifierConfig: {
      ...defaultConfig.transformer?.minifierConfig,
      compress: false,
      mangle: false,
    },
  };
}

module.exports = defaultConfig;