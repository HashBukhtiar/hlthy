import { UserSettings } from '@/types/settings';
import { getFirestore, doc, updateDoc, increment, runTransaction } from 'firebase/firestore';

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
    // Make analytics safer - use user document instead of shared analytics
    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      'analytics.settingsUpdateCount': increment(1),
      'analytics.lastSettingsUpdate': new Date(),
      [`analytics.changedSettings.${settingKey}`]: increment(1)
    });
  } catch (error) {
    // Silently fail - analytics is not critical
    console.log('Analytics tracking failed (non-critical):', error.message);
    // Don't re-throw - this prevents analytics from breaking the settings flow
  }
};

export const calculatePrivacyLevel = (settings: Partial<UserSettings>): 'open' | 'moderate' | 'strict' => {
  let privacyScore = 0;

  // Profile visibility
  if (settings.profileVisibility === 'private') privacyScore += 3;
  else privacyScore += 0;

  // Message permissions
  if (settings.messagePermission === 'followers') privacyScore += 1;
  else privacyScore += 0;

  // Two-factor authentication
  if (settings.twoFactorEnabled) privacyScore += 2;

  // Blocked users count (more blocked users = higher privacy concern)
  if (settings.blockedUsers && settings.blockedUsers.length > 0) {
    privacyScore += Math.min(settings.blockedUsers.length * 0.5, 2);
  }

  if (privacyScore >= 6) return 'strict';
  if (privacyScore >= 3) return 'moderate';
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
    const totalNotifications = Object.keys(settings.notifications).length;
    
    if (enabledCount === 0) {
      insights.push('🔔 You might miss important updates with all notifications disabled');
    } else if (enabledCount === totalNotifications) {
      insights.push('📱 Consider disabling some notifications to reduce distractions');
    }
  }

  // Age-related insights
  if (settings.dateOfBirth) {
    try {
      // Ensure dateOfBirth is a Date object
      let dateOfBirth = settings.dateOfBirth;
      if (typeof dateOfBirth === 'string') {
        dateOfBirth = new Date(dateOfBirth);
      }
      if (dateOfBirth && typeof dateOfBirth.getFullYear === 'function') {
        const age = new Date().getFullYear() - dateOfBirth.getFullYear();
        if (age < 18 && settings.profileVisibility === 'public') {
          insights.push('👤 Consider making your profile private for better safety');
        }
      }
    } catch (error) {
      console.error('Error processing dateOfBirth in insights:', error);
    }
  }

  // Archetype-specific insights
  if (settings.archetype === 'athlete' && settings.profileVisibility === 'private') {
    insights.push('🏃‍♂️ Athletes often benefit from public profiles for networking');
  }

  return insights;
};