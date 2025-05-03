// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Add support for CJS files
defaultConfig.resolver.sourceExts.push('cjs');

// Fix for "Component auth has not been registered yet" error
// https://stackoverflow.com/questions/79602687/react-native-expo-firebase-auth-component-auth-has-not-been-registered-yet/79603601
defaultConfig.resolver.unstable_enablePackageExports = false;

module.exports = defaultConfig;