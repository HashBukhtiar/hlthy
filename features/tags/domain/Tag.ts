export interface TagSearchResult {
  name: string;       // normalized: lowercase, no #, e.g. "legday"
  postCount: number;  // number of posts currently using this tag
}

export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 32; // characters, excluding the leading #
export const TAG_PATTERN = /^[a-z0-9_-]{1,32}$/;

// ── Feed injection config ─────────────────────────────────────────────────
// Inject one tag post after every N regular posts, where N is random in [MIN, MAX].
export const TAG_INJECTION_MIN = 4;
export const TAG_INJECTION_MAX = 7;
// How far back (in days) to look for popular tag posts to inject.
export const TAG_FEED_LOOKBACK_DAYS = 30;
// How many posts to prefetch per followed tag when building the injection pool.
export const TAG_FEED_POSTS_PER_TAG = 10;

/**
 * Normalize a raw tag string to the canonical form.
 * Returns null if the result is empty after normalization.
 */
export function normalizeTag(raw: string): string | null {
  if (!raw) return null;

  let normalized = raw
    .trim()
    .replace(/^#+/, '') // Strip leading # if present
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '') // Remove non-allowed characters
    .replace(/^[-_]+/, '') // Trim leading - and _
    .replace(/[-_]+$/, '') // Trim trailing - and _
    .slice(0, MAX_TAG_LENGTH); // Truncate to max length

  return normalized.length > 0 ? normalized : null;
}
