export interface UserSettings {
  // Profile Information
  displayName: string;
  bio: string;
  dateOfBirth?: Date;
  archetype: string;
  
  // Account & Security
  email: string;
  twoFactorEnabled: boolean;
  
  // Privacy & Visibility
  profileVisibility: 'public' | 'followers' | 'private';
  followPermission: 'anyone' | 'approval';
  commentPermission: 'everyone' | 'followers';
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