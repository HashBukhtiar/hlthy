export interface SuggestedUser {
  userId: string;
  username: string;
  displayName: string;
  profileImageUrl?: string;
  profileThumbnailUrl?: string;
  score: number;
}

export interface SuggestedUsersCache {
  generatedAt: any; // Firestore Timestamp
  suggestions: SuggestedUser[];
}

export const SUGGESTED_USERS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
