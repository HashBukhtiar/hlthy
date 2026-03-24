export interface TagSearchResult {
  name: string;       // normalized: lowercase, no #, e.g. "legday"
  postCount: number;  // number of posts currently using this tag
}

export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 32; // characters, excluding the leading #
export const TAG_PATTERN = /^[a-z0-9_-]{1,32}$/;

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
