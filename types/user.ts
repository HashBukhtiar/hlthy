import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  // Core Identity
  uid: string;
  username: string;
  displayName: string;
  email: string;
  bio: string;
  
  // Profile Images
  profileImageUrl?: string;
  profileThumbnailUrl?: string | null;
  
  // Timestamps
  createdAt: Timestamp;
  dateOfBirth?: Date;
  
  // Fitness Identity
  archetype: string; // 'athlete' | 'bodybuilder' | 'crossfitter' | 'generalist' | 'powerlifter'
  
  // Social Stats
  stats: {
    followerCount: number;
    followingCount: number;
    postCount: number;
    workoutCount?: number;
  };
  
  // Social Stats (alternative structure - some parts of your code use this)
  followerCount?: number;
  followingCount?: number;
  postCount?: number;
  workoutCount?: number;
  
  // Privacy & Settings
  accountPrivacy?: 'public' | 'private';
  
  // Physical Stats (for fitness tracking)
  physicalStats?: {
    height?: number;
    weight?: number;
    heightUnit?: 'cm' | 'ft';
    weightUnit?: 'kg' | 'lbs';
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  };
  
  // Goals & Preferences
  fitnessGoals?: string[];
  preferredWorkoutTypes?: string[];
  workoutFrequency?: 'daily' | 'weekly' | 'occasional';
  
  // Verification & Status
  isVerified?: boolean;
  isPremium?: boolean;
  subscriptionStatus?: 'free' | 'premium' | 'pro';
  
  // Activity Status
  lastActive?: Timestamp;
  isOnline?: boolean;
  
  // Location (optional)
  location?: {
    city?: string;
    country?: string;
    timezone?: string;
  };
  
  // Social Links
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    website?: string;
  };
  
  // Notification Preferences
  notificationSettings?: {
    pushNotifications: boolean;
    emailNotifications: boolean;
    followRequests: boolean;
    workoutReminders: boolean;
    socialUpdates: boolean;
  };
  
  // Achievement System
  badges?: string[];
  achievements?: Achievement[];
  currentStreak?: number;
  longestStreak?: number;
  
  // Content Preferences
  contentPreferences?: {
    showMilestones: boolean;
    showWorkouts: boolean;
    allowTagging: boolean;
    profileVisibility: 'everyone' | 'followers' | 'friends';
  };
  
  // App Preferences
  units?: 'metric' | 'imperial';
  language?: string;
  region?: string;
  
  // Profile Completion
  isProfileComplete?: boolean;
  profileCompletionPercentage?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Timestamp;
  category: 'fitness' | 'social' | 'consistency' | 'milestone';
}

// Auth context types
export interface AuthContextType {
  currentUser: any;
  userProfile: UserProfile | null;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
}