import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import type { ExplorePost, UserSearchResult } from '@/features/explore/domain/ExploreTypes';

const BATCH_SIZE = 12;

/**
 * Opaque cursor type for explore pagination.
 * Re-exported so the hook can store it without a firebase/firestore import.
 */
export type ExploreCursor = QueryDocumentSnapshot<DocumentData>;

export interface ExploreInitialPage {
  posts: ExplorePost[];
  archetypeCursor: ExploreCursor | null;
  popularCursor: ExploreCursor | null;
}

export interface ExplorePage {
  posts: ExplorePost[];
  cursor: ExploreCursor | null;
}

export const ExploreRepository = {
  /**
   * Searches users by username prefix (case-sensitive Firestore range query).
   * Excludes the current user. Returns up to 10 results.
   * Callers should apply block-enforcement filtering on the returned results.
   */
  async searchUsers(
    searchText: string,
    excludeUid: string
  ): Promise<UserSearchResult[]> {
    const lower = searchText.toLowerCase();
    const q = query(
      collection(db, 'users'),
      where('username', '>=', lower),
      where('username', '<=', lower + '\uf8ff'),
      limit(20)
    );
    const snap = await getDocs(q);

    const users: UserSearchResult[] = [];
    snap.forEach(d => {
      if (d.id === excludeUid) return;
      const data = d.data();
      users.push({
        id: d.id,
        username: data.username,
        displayName: data.displayName,
        profilePictureUrl: data.profileImageUrl,
        profileThumbnailUrl: data.profileThumbnailUrl,
        // Expose raw blockedUsers so callers can apply canInteractWithUser.
        _blockedUsers: data.blockedUsers,
      } as UserSearchResult & { _blockedUsers?: string[] });
    });
    return users.slice(0, 10);
  },

  /**
   * Initial load: fetches up to BATCH_SIZE archetype posts and BATCH_SIZE
   * popular posts. Returns both sets and their respective cursors.
   */
  async loadInitialPosts(
    uid: string,
    archetype?: string
  ): Promise<ExploreInitialPage> {
    let archetypePosts: ExplorePost[] = [];
    let archetypeCursor: ExploreCursor | null = null;

    if (archetype) {
      const q = query(
        collection(db, 'posts'),
        where('visibility', '==', 'public'),
        where('authorArchetype', '==', archetype),
        where('imageUrl', '!=', null),
        orderBy('createdAt', 'desc'),
        limit(BATCH_SIZE)
      );
      const snap = await getDocs(q);
      archetypePosts = snap.docs
        .map(d => ({
          id: d.id,
          imageUrl: d.data().imageUrl,
          thumbnailUrl: d.data().thumbnailUrl,
          authorId: d.data().authorId,
          // These matched the viewer's archetype filter, so affinity = 1.
          authorArchetype: archetype,
          isArchetypePost: true,
          reactionCount: d.data().reactionCount ?? 0,
          commentCount: d.data().commentCount ?? 0,
          createdAtMs: d.data().createdAt?.toMillis?.(),
        }))
        .filter(p => p.authorId !== uid);
      archetypeCursor = snap.docs[snap.docs.length - 1] ?? null;
    }

    const popularQ = query(
      collection(db, 'posts'),
      where('visibility', '==', 'public'),
      where('imageUrl', '!=', null),
      orderBy('reactionCount', 'desc'),
      orderBy('createdAt', 'desc'),
      limit(BATCH_SIZE)
    );
    const popularSnap = await getDocs(popularQ);
    const popularPosts: ExplorePost[] = popularSnap.docs
      .map(d => ({
        id: d.id,
        imageUrl: d.data().imageUrl,
        thumbnailUrl: d.data().thumbnailUrl,
        authorId: d.data().authorId,
        authorArchetype: d.data().authorArchetype,
        isArchetypePost: false,
        reactionCount: d.data().reactionCount ?? 0,
        commentCount: d.data().commentCount ?? 0,
        createdAtMs: d.data().createdAt?.toMillis?.(),
      }))
      .filter(p => p.authorId !== uid && p.authorArchetype !== archetype);
    const popularCursor: ExploreCursor | null = popularSnap.docs[popularSnap.docs.length - 1] ?? null;

    // De-duplicate popular against archetype.
    const archetypeIds = new Set(archetypePosts.map(p => p.id));
    const uniquePopular = popularPosts.filter(p => !archetypeIds.has(p.id));

    return {
      posts: [...archetypePosts, ...uniquePopular],
      archetypeCursor,
      popularCursor,
    };
  },

  /** Next page of archetype-matched posts after the given cursor. */
  async loadNextArchetypeBatch(
    uid: string,
    archetype: string,
    cursor: ExploreCursor
  ): Promise<ExplorePage> {
    const q = query(
      collection(db, 'posts'),
      where('visibility', '==', 'public'),
      where('authorArchetype', '==', archetype),
      where('imageUrl', '!=', null),
      orderBy('createdAt', 'desc'),
      startAfter(cursor),
      limit(BATCH_SIZE)
    );
    const snap = await getDocs(q);
    const posts: ExplorePost[] = snap.docs
      .map(d => ({
        id: d.id,
        imageUrl: d.data().imageUrl,
        thumbnailUrl: d.data().thumbnailUrl,
        authorId: d.data().authorId,
        authorArchetype: archetype,
        isArchetypePost: true,
        reactionCount: d.data().reactionCount ?? 0,
        commentCount: d.data().commentCount ?? 0,
        createdAtMs: d.data().createdAt?.toMillis?.(),
      }))
      .filter(p => p.authorId !== uid);
    return { posts, cursor: snap.docs[snap.docs.length - 1] ?? null };
  },

  /** Next page of popular posts after the given cursor. */
  async loadNextPopularBatch(
    uid: string,
    archetype: string | undefined,
    cursor: ExploreCursor
  ): Promise<ExplorePage> {
    const q = query(
      collection(db, 'posts'),
      where('visibility', '==', 'public'),
      where('imageUrl', '!=', null),
      orderBy('reactionCount', 'desc'),
      orderBy('createdAt', 'desc'),
      startAfter(cursor),
      limit(BATCH_SIZE)
    );
    const snap = await getDocs(q);
    const posts: ExplorePost[] = snap.docs
      .map(d => ({
        id: d.id,
        imageUrl: d.data().imageUrl,
        thumbnailUrl: d.data().thumbnailUrl,
        authorId: d.data().authorId,
        authorArchetype: d.data().authorArchetype,
        isArchetypePost: false,
        reactionCount: d.data().reactionCount ?? 0,
        commentCount: d.data().commentCount ?? 0,
        createdAtMs: d.data().createdAt?.toMillis?.(),
      }))
      .filter(p => p.authorId !== uid && p.authorArchetype !== archetype);
    return { posts, cursor: snap.docs[snap.docs.length - 1] ?? null };
  },
};
