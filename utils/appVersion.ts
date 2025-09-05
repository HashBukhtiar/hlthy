import appJson from '../app.json';
import packageJson from '../package.json';

export const getAppVersion = (): string => {
  // Try to get from app.json first (Expo version), fallback to package.json
  return appJson?.expo?.version || packageJson?.version || '1.0.0';
};

export const getBuildNumber = (): string => {
  return appJson?.expo?.android?.versionCode?.toString() || 
         appJson?.expo?.ios?.buildNumber || 
         '1';
};

export const getFullVersionString = (): string => {
  const version = getAppVersion();
  const build = getBuildNumber();
  return `${version} (${build})`;
};