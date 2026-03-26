import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { WorkoutListItem } from '@/features/workouts/domain/WorkoutListItem';
import { WorkoutDraft } from '@/features/workouts/domain/WorkoutDraft';
import { logger } from '@/shared/utils/logger';

const DOMAIN = 'WorkoutRepository';

function mapDocToWorkoutListItem(id: string, data: Record<string, unknown>): WorkoutListItem {
  return {
    id,
    title: data.title as string,
    creatorId: data.creatorId as string,
    creatorUsername: data.creatorUsername as string,
    coverImageUrl: (data.coverImageUrl as string | undefined) ?? null,
    thumbnailUrl: (data.thumbnailUrl as string | undefined) ?? null,
    savedCount: (data.savedCount as number | undefined) ?? 0,
    isPublic: (data.isPublic as boolean | undefined) ?? false,
  };
}

export const WorkoutRepository = {
  /** Workouts created by this user, newest first. */
  async listMyWorkouts(uid: string): Promise<WorkoutListItem[]> {
    const q = query(
      collection(db, 'workouts'),
      where('creatorId', '==', uid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => mapDocToWorkoutListItem(d.id, d.data() as Record<string, unknown>));
  },

  /** Workouts saved/favourited by this user (up to 30). */
  async listFavorites(uid: string): Promise<WorkoutListItem[]> {
    const savedSnap = await getDocs(collection(db, `users/${uid}/savedWorkouts`));
    const workoutIds = savedSnap.docs.map(d => d.id).slice(0, 30);

    if (workoutIds.length === 0) return [];

    const results: WorkoutListItem[] = [];
    for (const id of workoutIds) {
      try {
        const snap = await getDoc(doc(db, 'workouts', id));
        if (snap.exists()) {
          results.push(mapDocToWorkoutListItem(snap.id, snap.data() as Record<string, unknown>));
        }
      } catch (error) {
        logger.warn(DOMAIN, `Failed to fetch favourite workout ${id}`, error);
      }
    }
    return results;
  },

  /**
   * Workouts from users this user follows, newest first.
   * Returns empty array if the user follows nobody.
   */
  async listFromFollowing(uid: string): Promise<WorkoutListItem[]> {
    const followingSnap = await getDocs(collection(db, `users/${uid}/following`));
    const followingIds = followingSnap.docs.map(d => d.id);

    if (followingIds.length === 0) return [];

    const q = query(
      collection(db, 'workouts'),
      where('creatorId', 'in', followingIds.slice(0, 30)),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => mapDocToWorkoutListItem(d.id, d.data() as Record<string, unknown>));
  },

  /** Top 50 public workouts by save count (trending). */
  async listTrending(): Promise<WorkoutListItem[]> {
    const q = query(
      collection(db, 'workouts'),
      where('isPublic', '==', true),
      orderBy('savedCount', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => mapDocToWorkoutListItem(d.id, d.data() as Record<string, unknown>));
  },

  /**
   * Creates a new workout document and increments the creator's workout count.
   * Returns the new workout's Firestore ID.
   * coverImageUrl defaults to null; call updateCoverImageUrl after uploading the image.
   */
  async createDocument(
    uid: string,
    username: string,
    draft: WorkoutDraft,
    coverImageUrl: string | null = null
  ): Promise<string> {
    const workoutData: Record<string, unknown> = {
      creatorId: uid,
      creatorUsername: username,
      title: draft.title,
      description: draft.description,
      coverImageUrl,
      ...(draft.mentions && draft.mentions.length > 0 ? { mentions: draft.mentions } : {}),
      segments: draft.segments
        .map(seg => ({
          id: seg.id,
          name: seg.name.trim(),
          length: seg.length.trim(),
          exercises: seg.exercises
            .map(ex => ({ id: ex.id, name: ex.name.trim(), sets: ex.sets.trim(), reps: ex.reps.trim() }))
            .filter(ex => ex.name !== ''),
        }))
        .filter(seg => seg.exercises.length > 0 || seg.name !== ''),
      createdAt: serverTimestamp(),
      visibility: draft.visibility,
      isPublic: draft.visibility === 'public',
      savedCount: 0,
      tags: [],
    };

    const docRef = await addDoc(collection(db, 'workouts'), workoutData);
    await updateDoc(doc(db, 'users', uid), { 'stats.workoutCount': increment(1) });
    return docRef.id;
  },

  /** Updates the coverImageUrl field after a Storage upload completes. */
  async updateCoverImageUrl(workoutId: string, url: string): Promise<void> {
    await updateDoc(doc(db, 'workouts', workoutId), { coverImageUrl: url });
  },
};
