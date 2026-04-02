import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db, functions } from '@/firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import type { TagSearchResult } from '../domain/Tag';
import type { ExplorePost } from '@/features/explore/domain/ExploreTypes';

const searchHashtagsCallable = httpsCallable<
  { query: string },
  { results: TagSearchResult[] }
>(functions, 'searchHashtags');

export type TagFeedCursor = QueryDocumentSnapshot<DocumentData>;

export interface TagFeedPage {
  posts: ExplorePost[];
  cursor: TagFeedCursor | null;
}

export interface TagInfo {
  name: string;
  postCount: number;
}

export const TagRepository = {
  /**
   * Search for tags matching the given query (prefix search, banned filtered).
   */
  async searchTags(queryStr: string): Promise<TagSearchResult[]> {
    try {
      const result = await searchHashtagsCallable({ query: queryStr });
      return result.data.results;
    } catch (error) {
      console.error('Error searching hashtags:', error);
      return [];
    }
  },

  /**
   * Fetch metadata for a single tag from the hashtags collection.
   * Returns null if the tag does not exist yet.
   */
  async getTag(tagName: string): Promise<TagInfo | null> {
    try {
      const snap = await getDoc(doc(db, 'hashtags', tagName));
      if (!snap.exists()) return null;
      const d = snap.data();
      return { name: d.name, postCount: d.postCount ?? 0 };
    } catch {
      return null;
    }
  },

  // ── Follow / unfollow ────────────────────────────────────────────────────

  async followTag(uid: string, tagName: string): Promise<void> {
    await setDoc(doc(db, 'users', uid, 'followedTags', tagName), {
      tagName,
      followedAt: Timestamp.now(),
    });
  },

  async unfollowTag(uid: string, tagName: string): Promise<void> {
    await deleteDoc(doc(db, 'users', uid, 'followedTags', tagName));
  },

  async isFollowingTag(uid: string, tagName: string): Promise<boolean> {
    const snap = await getDoc(doc(db, 'users', uid, 'followedTags', tagName));
    return snap.exists();
  },

  async fetchFollowedTags(uid: string): Promise<string[]> {
    const snap = await getDocs(collection(db, 'users', uid, 'followedTags'));
    return snap.docs.map(d => d.id);
  },

  // ── Tag feed posts (for tag feed screen grid) ────────────────────────────

  /**
   * Fetches posts for the tag feed screen (3-column grid).
   * Ordered by createdAt desc, no lookback window — shows all posts with this tag.
   * Returns ExplorePost (minimal fields) since the screen only needs an image grid.
   */
  async fetchTagFeedPosts(
    tagName: string,
    pageSize: number,
    cursor?: TagFeedCursor
  ): Promise<TagFeedPage> {
    try {
      const baseQuery = cursor
        ? query(
            collection(db, 'posts'),
            where('tags', 'array-contains', tagName),
            where('visibility', '==', 'public'),
            orderBy('createdAt', 'desc'),
            startAfter(cursor),
            limit(pageSize)
          )
        : query(
            collection(db, 'posts'),
            where('tags', 'array-contains', tagName),
            where('visibility', '==', 'public'),
            orderBy('createdAt', 'desc'),
            limit(pageSize)
          );

      const snap = await getDocs(baseQuery);
      const posts: ExplorePost[] = snap.docs.map(d => ({
        id: d.id,
        imageUrl: d.data().imageUrl,
        thumbnailUrl: d.data().thumbnailUrl,
        authorId: d.data().authorId,
      }));

      return {
        posts,
        cursor: snap.docs[snap.docs.length - 1] ?? null,
      };
    } catch (error) {
      console.error('Error fetching tag feed posts:', error);
      return { posts: [], cursor: null };
    }
  },
};
