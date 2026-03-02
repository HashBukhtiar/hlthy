/** Minimal post fields needed for the explore photo grid. */
export interface ExplorePost {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  authorId?: string;
  authorArchetype?: string;
  isArchetypePost?: boolean;
}

/** User search result shown in the explore search bar. */
export interface UserSearchResult {
  id: string;
  username?: string;
  displayName?: string;
  profilePictureUrl?: string;
  profileThumbnailUrl?: string;
}
