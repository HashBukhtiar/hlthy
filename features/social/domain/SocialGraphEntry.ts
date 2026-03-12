/** A single entry in a user's followers or following list. */
export interface SocialGraphEntry {
  id: string;
  username: string;
  displayName?: string;
  profileImageUrl?: string;
  profileThumbnailUrl?: string;
}
