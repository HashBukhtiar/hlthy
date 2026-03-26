import { onCall } from 'firebase-functions/v2/https';
import { getDb } from '../admin/firebaseAdmin';
import { logger } from 'firebase-functions';

const MAX_TAG_LENGTH = 32;

/**
 * Normalize a raw tag string to the canonical form.
 * Returns null if the result is empty after normalization.
 */
function normalizeTag(raw: string): string | null {
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

export const searchHashtags = onCall(
  { region: 'northamerica-northeast2' },
  async (request) => {
    const db = getDb();
    const query = (request.data.query as string)?.trim() || '';

    if (!query) {
      return { results: [] };
    }

    const normalized = normalizeTag(query);
    if (!normalized) {
      return { results: [] };
    }

    try {
      // Prefix query: name >= normalized && name <= normalized + "\uf8ff"
      // Results ordered alphabetically for search/autocomplete UX
      const snapshot = await db
        .collection('hashtags')
        .where('name', '>=', normalized)
        .where('name', '<=', normalized + '\uf8ff')
        .where('isBanned', '==', false)
        .orderBy('name')
        .limit(20)
        .get();

      const results = snapshot.docs.map((doc: any) => ({
        name: doc.data().name,
        postCount: doc.data().postCount || 0,
      }));

      return { results };
    } catch (error) {
      console.error('Error searching hashtags:', error);
      return { results: [] };
    }
  }
);
