/**
 * Per-post "seen" record. Stored client-side and persisted to
 * users/{uid}/feedState/seen as a map keyed by postId.
 *
 * - `lastSeenAt` — epoch millis of the most recent impression or open.
 * - `count`      — total impressions (how many times it scrolled into view).
 * - `opened`     — true once the user has tapped into the post detail.
 *                  A stronger "seen" signal than an impression alone.
 */
export interface SeenEntry {
  lastSeenAt: number;
  count: number;
  opened: boolean;
}

/**
 * The full seen-state document for a user. `posts` is capped to the most
 * recently seen entries (oldest evicted) so the doc stays small.
 */
export interface SeenState {
  posts: Record<string, SeenEntry>;
}

/** Maximum number of post entries retained in a user's seen-state. */
export const SEEN_STATE_MAX_ENTRIES = 500;

/** Returns an empty seen-state. */
export function emptySeenState(): SeenState {
  return { posts: {} };
}
