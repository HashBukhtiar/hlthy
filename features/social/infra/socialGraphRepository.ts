import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { SocialGraphEntry } from '@/features/social/domain/SocialGraphEntry';
import { logger } from '@/shared/utils/logger';

const DOMAIN = 'SocialGraphRepository';

async function hydrateEntries(docIds: string[]): Promise<SocialGraphEntry[]> {
  const results = await Promise.all(
    docIds.map(async id => {
      try {
        const snap = await getDoc(doc(db, 'users', id));
        if (!snap.exists()) return null;
        const d = snap.data();
        return {
          id: snap.id,
          username: d.username ?? 'User',
          displayName: d.displayName,
          profileImageUrl: d.profileImageUrl,
          profileThumbnailUrl: d.profileThumbnailUrl,
        } as SocialGraphEntry;
      } catch (err) {
        logger.warn(DOMAIN, `Failed to fetch user ${id}`, err);
        return null;
      }
    })
  );
  return results.filter((e): e is SocialGraphEntry => e !== null);
}

export const SocialGraphRepository = {
  /** Returns the username for a given userId. Falls back to 'User' if not found. */
  async fetchUsername(userId: string): Promise<string> {
    try {
      const snap = await getDoc(doc(db, 'users', userId));
      return snap.exists() ? (snap.data().username ?? 'User') : 'User';
    } catch {
      return 'User';
    }
  },

  /** Returns the full user entries for everyone who follows userId. */
  async listFollowers(userId: string): Promise<SocialGraphEntry[]> {
    const snap = await getDocs(collection(db, 'users', userId, 'followers'));
    return hydrateEntries(snap.docs.map(d => d.id));
  },

  /** Returns the full user entries for everyone userId follows. */
  async listFollowing(userId: string): Promise<SocialGraphEntry[]> {
    const snap = await getDocs(collection(db, 'users', userId, 'following'));
    return hydrateEntries(snap.docs.map(d => d.id));
  },
};
