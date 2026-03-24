import { Timestamp } from 'firebase/firestore';
import { MentionData } from '../../mentions/domain/Mention';

export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  authorProfileThumbnailUrl?: string;
  authorBlockedUsers?: string[];
  caption: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  createdAt: Timestamp;
  tags?: string[];
  isMilestone: boolean;
  milestoneDetails?: {
    type: string;
    exerciseName?: string;
    exerciseId?: string;
    value?: number | string;
    reps?: number;
    duration?: number;
    level?: string;
    newWeight?: number | string;
    previousWeight?: number | string;
    weightUnit?: string;
    achievedAt?: Timestamp;
    previousValue?: number | string;
    improvementPercentage?: number;
    totalLoss?: number;
    totalGain?: number;
  };
  workoutId?: string;
  reactionCount: number;
  commentCount: number;
  visibility: 'public' | 'followers';
  mentions?: MentionData[];
  isLiked?: boolean;
  isBookmarked?: boolean;
  isFollowing?: boolean;
  isPublic?: boolean;
}

export interface Comment {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  authorProfileThumbnailUrl?: string;
  authorBlockedUsers?: string[];
  text: string;
  createdAt: Timestamp;
  likes: number;
  likedBy: string[];
  replyCount: number;
  mentions?: MentionData[];
  isLiked?: boolean;
  replies?: Reply[];
}

export interface Reply {
  id: string;
  parentCommentId: string;
  authorId: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  authorProfileThumbnailUrl?: string;
  authorBlockedUsers?: string[];
  text: string;
  createdAt: Timestamp;
  likes: number;
  likedBy: string[];
  replyToUserId: string;
  mentions?: MentionData[];
  isLiked?: boolean;
}

export interface ClientMilestoneDetails {
  type: 'PR' | 'weightLoss' | 'weightGain';
  exerciseName?: string;
  exerciseId?: string;
  value?: number | string | null;
  reps?: number | null;
  duration?: number | null;
  level?: string | null;
  newWeight?: number | string | null;
  previousWeight?: number | string | null;
  weightUnit?: string | null;
  achievedAt?: string | null;
}

export interface NewPostData {
  caption?: string;
  imageUri?: string;
  isMilestone: boolean;
  milestoneDetails?: ClientMilestoneDetails;
  visibility: 'public' | 'followers';
  workoutId?: string | null;
  authorArchetype?: string | null;
  mentions?: MentionData[];
  tags?: string[];
}

/** Minimal author fields needed for writes. */
export interface PostAuthorProfile {
  uid: string;
  username: string;
  profileImageUrl?: string;
  profileThumbnailUrl?: string;
}
