/** Minimal post fields needed for the explore photo grid + ranking. */
export interface ExplorePost {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  authorId?: string;
  authorArchetype?: string;
  isArchetypePost?: boolean;
  // Ranking signals (see logic/exploreRanking.ts).
  reactionCount?: number;
  commentCount?: number;
  createdAtMs?: number;
}

/** User search result shown in the explore search bar. */
export interface UserSearchResult {
  id: string;
  username?: string;
  displayName?: string;
  profilePictureUrl?: string;
  profileThumbnailUrl?: string;
}

/** Tag search result shown in the explore search bar. */
export interface TagSearchResult {
  name: string;
  postCount: number;
}
