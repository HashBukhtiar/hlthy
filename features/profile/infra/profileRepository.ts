import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  getDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { UserProfile } from '@/types/user';
import type { Post } from '@/features/posts/domain/Post';
import type { WorkoutListItem } from '@/features/workouts/domain/WorkoutListItem';

// ── Public API ──────────────────────────────────────────────────────────────

export const ProfileRepository = {
  /** Fetches a user's Firestore document. Throws if not found. */
  async getById(userId: string): Promise<Record<string, unknown>> {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) throw new Error('User profile not found.');
    return { id: snap.id, ...snap.data() };
  },

  /**
   * Fetches all posts for a user, ordered by createdAt descending.
   * Injects the caller-supplied author image URLs directly (avoids N extra reads).
   */
  async getUserPosts(
    userId: string,
    profileImageUrl: string,
    profileThumbnailUrl?: string | null
  ): Promise<Post[]> {
    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      ...(d.data() as Post),
      id: d.id,
      authorProfileImageUrl: profileImageUrl,
      authorProfileThumbnailUrl: profileThumbnailUrl ?? undefined,
    }));
  },

  /** Fetches all workouts created by this user, ordered by createdAt descending. */
  async getUserWorkouts(userId: string): Promise<WorkoutListItem[]> {
    const q = query(
      collection(db, 'workouts'),
      where('creatorId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title as string,
        creatorId: data.creatorId as string,
        creatorUsername: data.creatorUsername as string,
        coverImageUrl: (data.coverImageUrl as string | undefined) ?? null,
        thumbnailUrl: (data.thumbnailUrl as string | undefined) ?? null,
        savedCount: (data.savedCount as number | undefined) ?? 0,
        isPublic: (data.isPublic as boolean | undefined) ?? false,
      } satisfies WorkoutListItem;
    });
  },

  /**
   * Fetches saved workout stubs for a user (ordered by savedAt desc),
   * then hydrates each with its full workout document.
   */
  async getSavedWorkouts(userId: string): Promise<WorkoutListItem[]> {
    const q = query(
      collection(db, 'users', userId, 'savedWorkouts'),
      orderBy('savedAt', 'desc')
    );
    const savedSnap = await getDocs(q);
    const ids = savedSnap.docs.map(d => d.id);
    if (ids.length === 0) return [];

    const results = await Promise.all(
      ids.map(async id => {
        const snap = await getDoc(doc(db, 'workouts', id));
        if (!snap.exists()) return null;
        const data = snap.data();
        return {
          id: snap.id,
          title: data.title as string,
          creatorId: data.creatorId as string,
          creatorUsername: data.creatorUsername as string,
          coverImageUrl: (data.coverImageUrl as string | undefined) ?? null,
          thumbnailUrl: (data.thumbnailUrl as string | undefined) ?? null,
          savedCount: (data.savedCount as number | undefined) ?? 0,
          isPublic: (data.isPublic as boolean | undefined) ?? false,
        } satisfies WorkoutListItem;
      })
    );
    return results.filter((w): w is WorkoutListItem => w !== null);
  },

  /** Fetches all follower stubs for a user. */
  async getFollowers(userId: string): Promise<Array<{ id: string; [k: string]: unknown }>> {
    const snap = await getDocs(collection(db, 'users', userId, 'followers'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  /** Fetches all following stubs for a user. */
  async getFollowing(userId: string): Promise<Array<{ id: string; [k: string]: unknown }>> {
    const snap = await getDocs(collection(db, 'users', userId, 'following'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  /**
   * Checks whether currentUserId is following targetUserId, and whether a
   * follow request is pending. Returns both flags together to avoid two calls.
   */
  async getFollowStatus(
    targetUserId: string,
    currentUserId: string
  ): Promise<{ isFollowing: boolean; isPending: boolean }> {
    const followSnap = await getDoc(
      doc(db, 'users', targetUserId, 'followers', currentUserId)
    );
    if (followSnap.exists()) return { isFollowing: true, isPending: false };

    const pendingSnap = await getDoc(
      doc(db, 'users', targetUserId, 'pendingFollowers', currentUserId)
    );
    return { isFollowing: false, isPending: pendingSnap.exists() };
  },

  /**
   * Returns true if currentUserId has a pending follow request to targetUserId.
   * Used before deciding whether to cancel vs unfollow.
   */
  async isPendingFollowRequest(targetUserId: string, currentUserId: string): Promise<boolean> {
    const snap = await getDoc(
      doc(db, 'users', targetUserId, 'pendingFollowers', currentUserId)
    );
    return snap.exists();
  },
};
