export interface MentionData {
  userId: string;
  username: string;
}

export interface MentionSuggestion {
  userId: string;
  username: string;
  displayName?: string;
  profileThumbnailUrl?: string;
  bucket: 'follower' | 'following' | 'other';
}

export interface SelfUnmentionParams {
  context: 'post_caption' | 'comment' | 'reply' | 'workout_description';
  postId?: string;
  commentId?: string;
  replyId?: string;
  workoutId?: string;
}

export interface MentionBlock {
  blockedAt: any; // Firestore Timestamp
}

/** Maximum number of @mentions allowed per piece of content. */
export const MAX_MENTIONS = 10;
