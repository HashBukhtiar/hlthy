import { Timestamp } from 'firebase/firestore';

export interface LatestPR {
  date: Timestamp;
  duration?: number | null;
  exerciseName: string;
  level?: number | null;
  postId: string;
  reps?: number | null;
  value: number;
}

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

  // Blocked Users
  blockedUsers?: string[];
  
  // Timestamps
  createdAt: Timestamp;
  dateOfBirth?: Timestamp; // Changed from Date to Timestamp to match Firebase
  
  // Fitness Identity
  archetype: string; // 'athlete' | 'bodybuilder' | 'crossfitter' | 'generalist' | 'powerlifter'
  
  // Social Stats - Using top-level structure to match Firebase
  followerCount: number;
  followingCount: number;
  
  // Stats object - Keep for additional metrics
  stats: {
    followerCount: number; // Duplicate for backwards compatibility during migration
    followingCount: number; // Duplicate for backwards compatibility during migration
    postCount: number;
    workoutCount?: number;
  };
  
  // Privacy & Settings
  profileVisibility: 'public' | 'private';
  
  // Fitness Data - Match Firebase structure
  latestPRs?: { [exerciseId: string]: LatestPR };
  
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
  units?: {
    weight: 'metric' | 'imperial';
    distance: 'metric' | 'imperial';
  };
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