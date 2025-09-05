// Milestone-related type definitions

export interface MilestoneStats {
  likes: number;
}

export interface MilestoneDetails {
  // Exercise information
  exerciseName?: string;
  type?: 'PR' | 'weightLoss' | 'weightGain';
  
  // Weight and reps (for strength exercises)
  value?: number;
  weightUnit?: string;
  reps?: number;
  
  // Duration and level (for endurance/skill exercises)
  duration?: number;
  level?: string;
  
  // Distance (for cardio exercises)
  distance?: number;
  distanceUnit?: string;
  
  // Weight change milestones
  newWeight?: number;
  newWeightUnit?: string;
  previousWeight?: number;
  previousWeightUnit?: string;
  
  // Previous records for comparison
  previousValue?: number;
  previousReps?: number;
  previousDuration?: number;
  previousDistance?: number;
  
  // Improvement metrics
  improvement?: string;
  totalLoss?: number;
  percentageLoss?: string;
}

// Milestone interface for ViewMilestone screen
export interface Milestone {
  id: string;
  userId: string;
  username: string;
  fullName?: string;
  profileImageUrl: string;
  authorBlockedUsers?: string[];
  createdAt: Date;
  milestoneType: 'PR' | 'weightLoss' | 'weightGain' | string;
  details: MilestoneDetails;
  stats: MilestoneStats;
  isLiked: boolean;
  associatedPostId?: string;
  postImageUrl?: string;
  pinned?: boolean;
  top5Percent?: boolean;
}

// Milestone interface for MilestonesFeed screen
export interface FeedMilestone {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  authorProfileThumbnailUrl: string;
  createdAt: any;
  milestoneType: 'PR' | 'weightLoss' | 'weightGain' | string;
  milestoneDetails: MilestoneDetails;
  reactionCount: number;
  isLiked: boolean;
  associatedPostId?: string;
  imageUrl?: string;
  pinned?: boolean;
  top5Percent?: boolean;
}
