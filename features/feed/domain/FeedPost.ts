import type { Post } from '@/hooks/usePostsData';

// Re-export Post so callers can import from here instead of the hook directly.
// TODO(Phase 6): move the Post definition here when usePostsData is migrated to features/posts/.
export type { Post };

/** Post enriched with author profile data, like/following status, and block list. */
export interface FeedPost extends Post {
  authorBlockedUsers?: string[];
}
