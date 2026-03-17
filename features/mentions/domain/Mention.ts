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

/** Maximum number of @mentions allowed per piece of content. */
export const MAX_MENTIONS = 10;
