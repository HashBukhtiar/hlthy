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
    // Only track anonymized analytics
    const analyticsRef = doc(db, 'analytics', 'settings');
    
    // Use a transaction for better reliability
    await runTransaction(db, async (transaction) => {
      const analyticsDoc = await transaction.get(analyticsRef);
      
      if (!analyticsDoc.exists()) {
        // Create the document if it doesn't exist
        transaction.set(analyticsRef, {
          [`changes.${settingKey}`]: 1,
          totalChanges: 1,
          lastUpdate: new Date()
        });
      } else {
        // Update existing document
        const currentChanges = analyticsDoc.data()[`changes.${settingKey}`] || 0;
        const totalChanges = analyticsDoc.data().totalChanges || 0;
        
        transaction.update(analyticsRef, {
          [`changes.${settingKey}`]: currentChanges + 1,
          totalChanges: totalChanges + 1,
          lastUpdate: new Date()
        });
      }
    });
  } catch (error) {
    // Silently fail - analytics is not critical
    console.warn('Analytics tracking failed:', error);
    throw error; // Re-throw so the caller can handle it
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
    const totalNotifications = Object.keys(settings.notifications).length;
    
    if (enabledCount === 0) {
      insights.push('🔔 You might miss important updates with all notifications disabled');
    } else if (enabledCount === totalNotifications) {
      insights.push('📱 Consider disabling some notifications to reduce distractions');
    }
  }

  // Age-related insights
  if (settings.dateOfBirth) {
    const age = new Date().getFullYear() - settings.dateOfBirth.getFullYear();
    if (age < 18 && settings.profileVisibility === 'public') {
      insights.push('👤 Consider making your profile private for better safety');
    }
  }

  // Archetype-specific insights
  if (settings.archetype === 'athlete' && settings.profileVisibility === 'private') {
    insights.push('🏃‍♂️ Athletes often benefit from public profiles for networking');
  }

  return insights;
};