import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/firebaseConfig';
import { SuggestedUser, SuggestedUsersCache, SUGGESTED_USERS_CACHE_TTL_MS } from '@/features/social/domain/SuggestedUser';

export const SuggestedUsersRepository = {
  async getSuggestions(uid: string): Promise<SuggestedUser[]> {
    // Check cache first
    const cacheSnap = await getDoc(doc(db, 'users', uid, 'suggestedUsers', 'cache'));
    if (cacheSnap.exists()) {
      const cache = cacheSnap.data() as SuggestedUsersCache;
      const generatedAt: number = cache.generatedAt?.toMillis?.() ?? 0;
      if (Date.now() - generatedAt < SUGGESTED_USERS_CACHE_TTL_MS) {
        return cache.suggestions;
      }
    }

    // Cache stale or missing — call the Cloud Function
    const functions = getFunctions(undefined, 'northamerica-northeast2');
    const getSuggestedUsers = httpsCallable<void, { suggestions: SuggestedUser[] }>(
      functions,
      'getSuggestedUsers'
    );
    const result = await getSuggestedUsers();
    return result.data.suggestions;
  },
};
