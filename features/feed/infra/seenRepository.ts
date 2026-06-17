import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { SeenState, SeenEntry, emptySeenState } from '@/features/feed/domain/SeenState';
import { logger } from '@/shared/utils/logger';

const DOMAIN = 'SeenRepository';

/** Path to a user's single rolling seen-state doc. */
function seenDocRef(uid: string) {
  return doc(db, 'users', uid, 'feedState', 'seen');
}

export const SeenRepository = {
  /**
   * Loads a user's seen-state. Returns an empty state when the doc is missing
   * or unreadable — seen-tracking is best-effort and must never break the feed.
   */
  async loadSeenState(uid: string): Promise<SeenState> {
    try {
      const snap = await getDoc(seenDocRef(uid));
      if (!snap.exists()) return emptySeenState();
      const data = snap.data();
      const posts = (data?.posts ?? {}) as Record<string, SeenEntry>;
      return { posts };
    } catch (error) {
      logger.warn(DOMAIN, 'Failed to load seen state', error);
      return emptySeenState();
    }
  },

  /**
   * Persists the full seen-state (last-write-wins). The caller owns capping and
   * eviction, so this simply overwrites the doc. Best-effort — failures are
   * logged but never thrown.
   */
  async persistSeenState(uid: string, state: SeenState): Promise<void> {
    try {
      await setDoc(seenDocRef(uid), {
        posts: state.posts,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      logger.warn(DOMAIN, 'Failed to persist seen state', error);
    }
  },
};
