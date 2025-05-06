import { ExpoConfig, ConfigContext } from 'expo/config';

// Environment helper function (optional, keep if used)
const getEnvironmentVariable = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    return '';
  }
  return value;
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config, // Spread all properties from app.json first

  // Override or ensure specific top-level properties exist
  // (These values are likely already in your app.json via ...config,
  // but explicitly listing them can improve clarity)
  name: config.name || 'hlthy',
  slug: config.slug || 'hlthy',
  version: config.version || '1.0.0',
  // ... other top-level properties if needed ...

  // --- Define/Extend the android section ---
  android: {
    ...(config.android || {}), // Spread existing android config from app.json
    package: "com.derana1.hlthy", // Add the required package name (using value from app.json ios section)

    // Ensure adaptiveIcon is merged correctly (using values from app.json)
    adaptiveIcon: {
        ...(config.android?.adaptiveIcon || {}),
        foregroundImage: config.android?.adaptiveIcon?.foregroundImage || "./assets/images/icon.png",
        backgroundColor: config.android?.adaptiveIcon?.backgroundColor || "#ffffff"
    },
  },

  // --- Ensure other sections are merged correctly ---
  // (No need to redefine ios, web, plugins etc. if they are correctly
  // defined in app.json and included via the top-level ...config spread)

  // Merge extra section correctly
  extra: {
    ...config.extra, // Spread extra from app.json
    // Add any specific overrides for app.config.ts if needed
  },

  // Ensure owner is present (using value from app.json)
  owner: config.owner || "hlthy",
});