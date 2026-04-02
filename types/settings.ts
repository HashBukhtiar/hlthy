export interface UserSettings {
  // Profile Information
  displayName: string;
  bio: string;
  dateOfBirth?: Date;
  archetype: string;
  
  // Social Links
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
    linkedin?: string;
    spotify?: string;
    snapchat?: string;
    twitch?: string;
    github?: string;
    customUrl?: string;
    customLabel?: string;
    showLinksToFollowersOnly?: boolean;
  };
  
  // Account & Security
  email: string;
  twoFactorEnabled: boolean;
  
  // Privacy & Visibility
  profileVisibility: 'public' | 'private';
  messagePermission: 'everyone' | 'followers';
  blockedUsers: string[]; // Array of user IDs
  
  // Notifications
  notifications: {
    newFollowers: boolean;
    likesAndComments: boolean;
    directMessages: boolean;
    followRequestAccepted: boolean;
    taggedInComments: boolean;
    mentionedInReplies: boolean;
    mentions: boolean;
  };
  
  // UI/UX Preferences
  theme: 'light' | 'dark' | 'system';
  language: string;
  units: {
    weight: 'metric' | 'imperial';
    distance: 'metric' | 'imperial';
  };
  
  // Metadata
  lastModified: Date;
  version: number; // For future migrations
}

export interface SettingsSection {
  id: string;
  title: string;
  icon: string;
  expanded: boolean;
}

export interface SettingsItem {
  id: string;
  type: 'toggle' | 'select' | 'input' | 'button' | 'info' | 'date';
  label: string;
  value?: any;
  options?: { label: string; value: any }[];
  placeholder?: string;
  helperText?: string;
  destructive?: boolean;
  disabled?: boolean;
}

// Add these helpful type aliases and interfaces:

export type SettingsSectionType = SettingsSection;

// For validation results
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// For backup functionality
export interface SettingsBackup {
  timestamp: string;
  settings: Partial<UserSettings>;
  version: string;
}

// For export functionality
export interface SettingsExport {
  exportedAt: string;
  appVersion: string;
  settings: Partial<UserSettings>;
  metadata: {
    userId: string;
    username: string;
    exportVersion: string;
  };
}

// For analytics
export interface SettingsUsageStats {
  lastSettingsUpdate: Date;
  settingsUpdateCount: number;
  mostChangedSettings: Record<string, number>;
  averageSessionLength: number;
  privacyLevel: 'open' | 'moderate' | 'strict';
}

// For privacy level calculation
export type PrivacyLevel = 'open' | 'moderate' | 'strict';

// Constants for validation
export const VALIDATION_RULES = {
  displayName: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\s\-_\.]+$/
  },
  bio: {
    maxLength: 500
  },
  minAge: 13,
  maxAge: 120
} as const;

// Available themes
export const THEMES = ['light', 'dark', 'system'] as const;

// Available languages (expand as needed)
export const LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'nl'] as const;

// Unit systems
export const UNIT_SYSTEMS = ['metric', 'imperial'] as const;