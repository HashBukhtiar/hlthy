import { UserSettings } from '@/types/settings';
import { getFirestore, doc, updateDoc, increment } from '@/features/infra/firestore';

const db = getFirestore();

// Helper function to calculate accurate age from date of birth
const calculateAge = (dateOfBirth: Date | string): number | null => {
  try {
    const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
    if (!birthDate || typeof birthDate.getFullYear !== 'function') {
      return null;
    }
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // If birthday hasn't occurred this year yet, subtract 1 from age
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    console.error('Error calculating age:', error);
    return null;
  }
};

export interface SettingsUsageStats {
  lastSettingsUpdate: Date;
  settingsUpdateCount: number;
  mostChangedSettings: Record<string, number>;
  averageSessionLength: number;
  privacyLevel: 'open' | 'moderate' | 'strict';
}

export const calculatePrivacyLevel = (settings: Partial<UserSettings>): 'open' | 'moderate' | 'strict' => {
  let score = 0;
  
  // Profile visibility (most important - weight: 3)
  if (settings.profileVisibility === 'private') score += 3;
  else if (settings.profileVisibility === 'public') score += 0;
  
  // Message permissions (weight: 2)
  if (settings.messagePermission === 'followers') score += 2;
  else if (settings.messagePermission === 'everyone') score += 0;
  
  // Notification settings (weight: 1 each)
  const notifications = settings.notifications || {};
  const notificationCount = Object.values(notifications).filter(Boolean).length;
  if (notificationCount <= 2) score += 2; // Very few notifications = more private
  else if (notificationCount <= 4) score += 1; // Some notifications
  // Many notifications = 0 points
  
  // Bio privacy check (weight: 1)
  const bio = settings.bio || '';
  const hasPersonalInfo = /\b(phone|email|@|\.com|\.net|contact|call|text)\b/i.test(bio);
  if (!hasPersonalInfo) score += 1;
  
  // Age consideration (weight: 1)
  if (settings.dateOfBirth) {
    const age = calculateAge(settings.dateOfBirth);
    if (age !== null && age < 18 && settings.profileVisibility === 'private') {
      score += 1;
    }
  }
  
  // Scoring:
  // 0-2: Open (red)
  // 3-5: Moderate (orange) 
  // 6+: Strict (green)
  
  if (score <= 2) return 'open';
  if (score <= 5) return 'moderate';
  return 'strict';
};

export const generateSettingsInsights = (settings: Partial<UserSettings>): string[] => {
  const insights: string[] = [];
  const privacyLevel = calculatePrivacyLevel(settings);

  // Privacy level insights
  if (privacyLevel === 'open') {
    insights.push('💡 Consider enabling two-factor authentication for better security');
    insights.push('🔒 Your profile is quite open - consider making it more private if desired');
  } else if (privacyLevel === 'strict') {
    insights.push('🛡️ Great job! Your privacy settings are very secure');
    if (settings.profileVisibility === 'private') {
      insights.push('📈 Private profiles may get fewer followers but more engaged ones');
    }
  }

  // Two-factor authentication
  if (!settings.twoFactorEnabled) {
    insights.push('🔐 Enable two-factor authentication to protect your account');
  }

  // Notification insights
  if (settings.notifications) {
    const enabledCount = Object.values(settings.notifications).filter(Boolean).length;
    const totalNotifications = Object.keys(settings.notifications).length;
    
    if (enabledCount === 0) {
      insights.push('🔔 You might miss important updates with all notifications disabled');
    } else if (enabledCount === totalNotifications) {
      insights.push('📱 Consider disabling some notifications to reduce distractions');
    } else if (enabledCount > 4) {
      insights.push('🔔 Consider disabling some notifications to reduce tracking');
    }
  }

  // Message permission insights
  if (settings.messagePermission === 'everyone') {
    insights.push('💬 Consider limiting messages to followers only for better privacy');
  }

  // Age-related insights
  if (settings.dateOfBirth) {
    const age = calculateAge(settings.dateOfBirth);
    if (age !== null) {
      if (age < 18 && settings.profileVisibility === 'public') {
        insights.push('👤 Consider making your profile private for better safety');
      }
      if (age < 16 && privacyLevel !== 'strict') {
        insights.push('🔒 Young users should use strict privacy settings');
      }
    }
  }

  // Profile completeness insights
  if (!settings.bio || settings.bio.trim().length < 10) {
    insights.push('📝 Consider adding a bio to help others understand your fitness journey');
  }

  // Security insights
  if (settings.profileVisibility === 'public' && settings.messagePermission === 'everyone') {
    insights.push('🚨 Very open settings - consider tightening privacy if you receive unwanted contact');
  }

  // Display name insights
  if (settings.displayName) {
    if (settings.displayName.length < 3) {
      insights.push('📛 Consider using a longer display name for better recognition');
    }
  }

  // Final check - if no insights, add a positive message
  if (insights.length === 0) {
    insights.push('✅ Your settings look great! No recommendations at this time.');
  }

  return insights;
};