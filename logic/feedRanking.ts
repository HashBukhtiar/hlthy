import type { FeedPost } from '@/features/feed/domain/FeedPost';
import type { SeenState, SeenEntry } from '@/features/feed/domain/SeenState';

/**
 * A feed post annotated with whether it was already seen (per the snapshot).
 * `seen` is optional in the type (so RankedFeedPost stays assignment-compatible
 * with plain Post consumers) but is always set by `rankFeed` at runtime.
 */
export type RankedFeedPost = FeedPost & { seen?: boolean };

export interface FeedRankingResult {
  /** Unseen posts first (incoming order), then seen posts (best-to-re-show). */
  ranked: RankedFeedPost[];
  unseenCount: number;
  seenCount: number;
}

/**
 * Comparator for the "seen" tier — best-to-re-show first. Each tier is a
 * fallback to the next, so order matters:
 *   1. not-opened before opened   (a glance is weaker than a real open)
 *   2. not-liked before liked     (already engaged → you're done with it)
 *   3. fewer impressions first
 *   4. seen longest ago first
 */
function compareReshow(
  a: { post: FeedPost; entry: SeenEntry },
  b: { post: FeedPost; entry: SeenEntry }
): number {
  if (a.entry.opened !== b.entry.opened) return a.entry.opened ? 1 : -1;
  const aLiked = !!a.post.isLiked;
  const bLiked = !!b.post.isLiked;
  if (aLiked !== bLiked) return aLiked ? 1 : -1;
  if (a.entry.count !== b.entry.count) return a.entry.count - b.entry.count;
  return a.entry.lastSeenAt - b.entry.lastSeenAt;
}

/**
 * Supply-adaptive feed ranking: unseen posts always come first (preserving
 * their incoming createdAt order); already-seen posts are demoted into a
 * backfill tier, ranked best-to-re-show. Nothing is ever dropped — when the
 * unseen tier is thin (small app), the seen tier keeps the feed full; as
 * content grows and the unseen tier always fills the page, the seen tier
 * naturally stops being reached, so recycling auto-disables with no timer.
 */
export function rankFeed(posts: FeedPost[], seen: SeenState): FeedRankingResult {
  const unseen: RankedFeedPost[] = [];
  const seenItems: Array<{ post: FeedPost; entry: SeenEntry }> = [];

  for (const p of posts) {
    const entry = seen.posts[p.id];
    if (entry) {
      seenItems.push({ post: p, entry });
    } else {
      unseen.push({ ...p, seen: false });
    }
  }

  seenItems.sort(compareReshow);
  const seenRanked: RankedFeedPost[] = seenItems.map(({ post }) => ({ ...post, seen: true }));

  return {
    ranked: [...unseen, ...seenRanked],
    unseenCount: unseen.length,
    seenCount: seenRanked.length,
  };
}
