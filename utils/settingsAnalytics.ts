import { UserSettings } from '@/types/settings';
import { getFirestore, doc, updateDoc, increment } from 'firebase/firestore';

const db = getFirestore();

export interface SettingsUsageStats {
  lastSettingsUpdate: Date;
  settingsUpdateCount: number;
  mostChangedSettings: Record<string, number>;
  averageSessionLength: number;
  privacyLevel: 'open' | 'moderate' | 'strict';
}

export const trackSettingsChange = async (
  userId: string, 
  settingKey: string, 
  oldValue: any, 
  newValue: any
): Promise<void> => {
  try {
    // Track setting changes for analytics (anonymized)
    const analyticsRef = doc(db, 'analytics', 'settings');
    await updateDoc(analyticsRef, {
      [`changes.${settingKey}`]: increment(1),
      totalChanges: increment(1),
      lastUpdate: new Date()
    });

    // Track user-specific analytics
    const userAnalyticsRef = doc(db, 'users', userId);
    await updateDoc(userAnalyticsRef, {
      'analytics.settingsUpdateCount': increment(1),
      'analytics.lastSettingsUpdate': new Date(),
      [`analytics.settingChanges.${settingKey}`]: increment(1)
    });
  } catch (error) {
    console.error('Failed to track settings change:', error);
  }
};

export const calculatePrivacyLevel = (settings: Partial<UserSettings>): 'open' | 'moderate' | 'strict' => {
  let privacyScore = 0;

  // Profile visibility
  if (settings.profileVisibility === 'private') privacyScore += 3;
  else if (settings.profileVisibility === 'followers') privacyScore += 2;
  else privacyScore += 0;

  // Follow permissions
  if (settings.followPermission === 'approval') privacyScore += 2;
  else privacyScore += 0;

  // Comment permissions
  if (settings.commentPermission === 'followers') privacyScore += 1;
  else privacyScore += 0;

  // Message permissions
  if (settings.messagePermission === 'followers') privacyScore += 1;
  else privacyScore += 0;

  // Two-factor authentication
  if (settings.twoFactorEnabled) privacyScore += 2;

  if (privacyScore >= 7) return 'strict';
  if (privacyScore >= 4) return 'moderate';
  return 'open';
};

export const generateSettingsInsights = (settings: Partial<UserSettings>): string[] => {
  const insights: string[] = [];
  const privacyLevel = calculatePrivacyLevel(settings);

  if (privacyLevel === 'open') {
    insights.push('💡 Consider enabling two-factor authentication for better security');
    insights.push('🔒 Your profile is quite open - consider making it more private if desired');
  } else if (privacyLevel === 'strict') {
    insights.push('🛡️ Great job! Your privacy settings are very secure');
    if (settings.profileVisibility === 'private') {
      insights.push('📈 Private profiles may get fewer followers but more engaged ones');
    }
  }

  if (!settings.twoFactorEnabled) {
    insights.push('🔐 Enable two-factor authentication to protect your account');
  }

  if (settings.notifications) {
    const enabledCount = Object.values(settings.notifications).filter(Boolean).length;
    if (enabledCount === 0) {
      insights.push('🔔 You might miss important updates with all notifications disabled');
    } else if (enabledCount === Object.keys(settings.notifications).length) {
      insights.push('📱 Consider disabling some notifications to reduce distractions');
    }
  }

  return insights;
};