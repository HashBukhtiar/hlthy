import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  onSnapshot,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Post } from '@/hooks/usePostsData';
import { FeedPost } from '@/features/feed/domain/FeedPost';
import { UserProfile } from '@/types';
import { logger } from '@/shared/utils/logger';

const DOMAIN = 'FeedRepository';
const BATCH_SIZE = 10;

/**
 * Opaque cursor type for feed pagination.
 * Re-exported so the hook can store it without a firebase/firestore import.
 */
export type FeedCursor = QueryDocumentSnapshot<DocumentData>;

export interface FeedPage {
  posts: FeedPost[];
  cursor: FeedCursor | null;
  /** true when the personalized feed had no documents at all */
  hasMore: boolean;
}

// ── Private helper ─────────────────────────────────────────────────────────

async function enrichPosts(
  postDocs: Array<Post & { id: string }>,
  uid: string
): Promise<FeedPost[]> {
  if (postDocs.length === 0) return [];

  const authorIds = [...new Set(postDocs.map(p => p.authorId).filter(Boolean))];

  // Batch-fetch author profiles.
  const authorProfiles: Record<string, UserProfile> = {};
  if (authorIds.length > 0) {
    const snap = await getDocs(
      query(collection(db, 'users'), where('__name__', 'in', authorIds.slice(0, 30)))
    );
    snap.forEach(d => {
      authorProfiles[d.id] = d.data() as UserProfile;
    });
  }

  // Fetch like + bookmark status for every post in parallel.
  const likeStatuses: Record<string, boolean> = {};
  const bookmarkStatuses: Record<string, boolean> = {};
  await Promise.all(
    postDocs.map(async p => {
      try {
        const [likeDoc, bookmarkDoc] = await Promise.all([
          getDoc(doc(db, 'posts', p.id, 'likers', uid)),
          getDoc(doc(db, 'users', uid, 'savedPosts', p.id)),
        ]);
        likeStatuses[p.id] = likeDoc.exists();
        bookmarkStatuses[p.id] = bookmarkDoc.exists();
      } catch {
        likeStatuses[p.id] = false;
        bookmarkStatuses[p.id] = false;
      }
    })
  );

  // Fetch following status for every author in parallel.
  const followingStatuses: Record<string, boolean> = {};
  await Promise.all(
    authorIds.map(async authorId => {
      if (authorId === uid) {
        followingStatuses[authorId] = false;
        return;
      }
      try {
        const d = await getDoc(doc(db, 'users', authorId, 'followers', uid));
        followingStatuses[authorId] = d.exists();
      } catch {
        followingStatuses[authorId] = false;
      }
    })
  );

  const enriched: FeedPost[] = postDocs.map(p => ({
    ...p,
    authorProfileImageUrl: authorProfiles[p.authorId]?.profileImageUrl || '',
    authorProfileThumbnailUrl: authorProfiles[p.authorId]?.profileThumbnailUrl || '',
    authorBlockedUsers: authorProfiles[p.authorId]?.blockedUsers || [],
    isLiked: likeStatuses[p.id] ?? false,
    isBookmarked: bookmarkStatuses[p.id] ?? false,
    isFollowing: followingStatuses[p.authorId] ?? false,
  }));

  // Filter out posts from private accounts unless the user follows them or it's their own post.
  return enriched.filter(p => {
    if (p.authorId === uid) return true;
    const profile = authorProfiles[p.authorId];
    if (!profile || profile.profileVisibility !== 'private') return true;
    return followingStatuses[p.authorId] ?? false;
  });
}

// ── Public API ─────────────────────────────────────────────────────────────

export const FeedRepository = {
  /**
   * Loads one page of the user's personalized feed.
   * Returns `{ posts: [], cursor: null, hasMore: false }` when the feed is empty
   * (caller should use loadPublicFallback in that case on initial load).
   */
  async loadPage(uid: string, cursor: FeedCursor | null = null): Promise<FeedPage> {
    const feedRef = collection(db, 'feeds', uid, 'userFeed');
    const q = cursor
      ? query(feedRef, orderBy('createdAt', 'desc'), startAfter(cursor), limit(BATCH_SIZE))
      : query(feedRef, orderBy('createdAt', 'desc'), limit(BATCH_SIZE));

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { posts: [], cursor: null, hasMore: false };
    }

    const postSnapshots = await Promise.all(
      snapshot.docs.map(feedDoc => getDoc(doc(db, 'posts', feedDoc.id)))
    );
    const postDocs = postSnapshots
      .filter(d => d.exists())
      .map(d => ({ id: d.id, ...d.data() } as Post & { id: string }));

    const enriched = await enrichPosts(postDocs, uid);

    return {
      posts: enriched,
      cursor: snapshot.docs[snapshot.docs.length - 1] ?? null,
      hasMore: snapshot.docs.length === BATCH_SIZE,
    };
  },

  /**
   * Fallback: loads public posts when the user has no personalized feed.
   * Tries a compound query first (requires a Firestore index); falls back to a
   * simpler query with client-side author filtering if the compound query fails.
   */
  async loadPublicFallback(uid: string): Promise<FeedPost[]> {
    try {
      const q = query(
        collection(db, 'posts'),
        where('authorId', '!=', uid),
        where('visibility', '==', 'public'),
        orderBy('authorId'),
        orderBy('createdAt', 'desc'),
        limit(BATCH_SIZE)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Post & { id: string }));
      return enrichPosts(docs, uid);
    } catch (compoundError) {
      logger.warn(DOMAIN, 'Compound fallback query failed, trying simple query', compoundError);
      try {
        const q = query(
          collection(db, 'posts'),
          where('visibility', '==', 'public'),
          orderBy('createdAt', 'desc'),
          limit(BATCH_SIZE * 2)
        );
        const snap = await getDocs(q);
        const filtered = snap.docs
          .filter(d => d.data().authorId !== uid)
          .slice(0, BATCH_SIZE);
        const docs = filtered.map(d => ({ id: d.id, ...d.data() } as Post & { id: string }));
        return enrichPosts(docs, uid);
      } catch (fallbackError) {
        logger.error(DOMAIN, 'Simple fallback query also failed', fallbackError);
        return [];
      }
    }
  },

  /**
   * Subscribes to real-time updates for the first page of the user's feed.
   * Calls onUpdate with a FeedPage when data changes, or 'empty' when the
   * personalized feed has no documents.
   * Returns an unsubscribe function.
   */
  subscribe(
    uid: string,
    onUpdate: (result: FeedPage | 'empty') => void,
    onError: (error: Error) => void
  ): () => void {
    let cancelled = false;

    const feedRef = collection(db, 'feeds', uid, 'userFeed');
    const feedQuery = query(feedRef, orderBy('createdAt', 'desc'), limit(BATCH_SIZE));

    const unsubscribe = onSnapshot(
      feedQuery,
      async snapshot => {
        if (cancelled) return;

        if (snapshot.empty) {
          onUpdate('empty');
          return;
        }

        try {
          const postSnapshots = await Promise.all(
            snapshot.docs.map(feedDoc => getDoc(doc(db, 'posts', feedDoc.id)))
          );
          if (cancelled) return;

          const postDocs = postSnapshots
            .filter(d => d.exists())
            .map(d => ({ id: d.id, ...d.data() } as Post & { id: string }));

          const enriched = await enrichPosts(postDocs, uid);
          if (cancelled) return;

          onUpdate({
            posts: enriched,
            cursor: snapshot.docs[snapshot.docs.length - 1] ?? null,
            hasMore: snapshot.docs.length === BATCH_SIZE,
          });
        } catch (err) {
          if (!cancelled) onError(err as Error);
        }
      },
      error => {
        if (!cancelled) onError(error as Error);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  },

  /**
   * Fetches and enriches posts from multiple tags for feed injection.
   * For each tag, fetches recent posts within the lookback window, then sorts
   * all results client-side by reactionCount desc before enrichment.
   * Returns a flat, deduplicated array of enriched posts tagged with
   * `injectedFromTag` indicating which tag sourced each post.
   */
  async fetchTagPostsForFeed(
    uid: string,
    tagNames: string[],
    postsPerTag: number,
    daysBack: number
  ): Promise<Array<FeedPost & { injectedFromTag: string }>> {
    if (tagNames.length === 0) return [];

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    const cutoffTimestamp = Timestamp.fromDate(cutoff);

    // Fetch posts for each tag in parallel. Over-fetch so we can sort by
    // reactionCount client-side without needing a complex composite index.
    const perTagLimit = Math.max(postsPerTag, 20);
    const tagResults = await Promise.allSettled(
      tagNames.map(tagName =>
        getDocs(
          query(
            collection(db, 'posts'),
            where('tags', 'array-contains', tagName),
            where('visibility', '==', 'public'),
            where('createdAt', '>=', cutoffTimestamp),
            orderBy('createdAt', 'desc'),
            limit(perTagLimit)
          )
        ).then(snap =>
          snap.docs.map(d => ({ id: d.id, ...(d.data() as object), _srcTag: tagName }))
        )
      )
    );

    // Flatten, deduplicate by postId, exclude the current user's own posts.
    const seen = new Set<string>();
    const tagByPostId = new Map<string, string>();
    const combined: Array<Post & { id: string }> = [];

    for (const result of tagResults) {
      if (result.status !== 'fulfilled') continue;
      for (const post of result.value as Array<Post & { id: string; _srcTag: string }>) {
        if (seen.has(post.id) || post.authorId === uid) continue;
        seen.add(post.id);
        tagByPostId.set(post.id, post._srcTag);
        combined.push(post);
      }
    }

    // Sort by reactionCount descending, then enrich.
    combined.sort((a, b) => ((b as any).reactionCount ?? 0) - ((a as any).reactionCount ?? 0));

    const enriched = await enrichPosts(combined, uid);

    return enriched.map(p => ({
      ...p,
      injectedFromTag: tagByPostId.get(p.id) ?? '',
    }));
  },
};
