import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FeedRepository, FeedCursor } from '@/features/feed/infra/feedRepository';
import { FeedPost } from '@/features/feed/domain/FeedPost';
import { TagRepository } from '@/features/tags/infra/tagRepository';
import {
  TAG_FEED_LOOKBACK_DAYS,
  TAG_FEED_POSTS_PER_TAG,
} from '@/features/tags/domain/Tag';
import { useSharedSeenTracking } from '@/features/feed/ui/SeenTrackingProvider';
import { SeenState } from '@/features/feed/domain/SeenState';
import { rankFeed, RankedFeedPost } from '@/logic/feedRanking';
import { logger } from '@/shared/utils/logger';

export type TagInjectedPost = FeedPost & { injectedFromTag: string };

export function useFeedData() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [milestones, setMilestones] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastVisible, setLastVisible] = useState<FeedCursor | null>(null);
  const [tagPostPool, setTagPostPool] = useState<TagInjectedPost[]>([]);

  const { currentUser } = useAuth();
  const { markSeen, isHydrated, getSeenSnapshot } = useSharedSeenTracking();

  // Frozen snapshot the feed is ranked against. Captured only on hydration and
  // on pull-to-refresh — never on every impression — so the order stays stable
  // within a viewing session (a post the user just scrolled past doesn't jump).
  const [rankSnapshot, setRankSnapshot] = useState<SeenState>({ posts: {} });

  // Capture the hydrated seen-state once it's available.
  useEffect(() => {
    if (isHydrated) setRankSnapshot(getSeenSnapshot());
  }, [isHydrated, getSeenSnapshot]);

  const removeDuplicatePosts = useCallback((items: FeedPost[]): FeedPost[] => {
    const seen = new Set<string>();
    return items.filter(p => {
      if (seen.has(p.id)) {
        logger.warn('useFeedData', `Duplicate post prevented in feed: ${p.id}`);
        return false;
      }
      seen.add(p.id);
      return true;
    });
  }, []);

  // ── Tag post pool ──────────────────────────────────────────────────────────
  // Fetched once when the feed first loads. Silently fails — tag injection is
  // best-effort and should never block or break the regular feed.

  const buildTagPool = useCallback(async (uid: string) => {
    try {
      const followedTags = await TagRepository.fetchFollowedTags(uid);
      if (followedTags.length === 0) return;

      const pool = await FeedRepository.fetchTagPostsForFeed(
        uid,
        followedTags,
        TAG_FEED_POSTS_PER_TAG,
        TAG_FEED_LOOKBACK_DAYS
      );
      setTagPostPool(pool);
    } catch (err) {
      logger.warn('useFeedData', 'Failed to build tag post pool', err);
    }
  }, []);

  // ── Manual fetch (refresh / load-more) ────────────────────────────────────

  const fetchFeedData = useCallback(
    async (isRefresh = false, isLoadMore = false) => {
      if (!currentUser?.uid) {
        setPosts([]);
        setMilestones([]);
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
          setLastVisible(null);
          setHasMore(true);
          // Rebuild tag pool on manual refresh.
          buildTagPool(currentUser.uid);
        } else if (isLoadMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        const cursor = isLoadMore ? lastVisible : null;
        const page = await FeedRepository.loadPage(currentUser.uid, cursor);

        if (page.posts.length === 0) {
          if (isLoadMore) {
            setHasMore(false);
          } else {
            // No personalized feed — use public posts fallback.
            const fallback = await FeedRepository.loadPublicFallback(currentUser.uid);
            const unique = removeDuplicatePosts(fallback);
            setPosts(unique);
            setMilestones(unique.filter(p => p.isMilestone));
          }
          return;
        }

        const unique = removeDuplicatePosts(page.posts);

        if (isRefresh || !isLoadMore) {
          setPosts(unique);
          setMilestones(unique.filter(p => p.isMilestone));
        } else {
          setPosts(prev => removeDuplicatePosts([...prev, ...unique]));
          setMilestones(prev =>
            removeDuplicatePosts([...prev, ...unique.filter(p => p.isMilestone)])
          );
        }

        if (page.cursor) setLastVisible(page.cursor);
        setHasMore(page.hasMore);
        setError(null);
      } catch (err) {
        logger.error('useFeedData', 'fetchFeedData failed', err);
        setError(err as Error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [currentUser?.uid, lastVisible, removeDuplicatePosts, buildTagPool]
  );

  const refreshFeed = useCallback(() => {
    // Re-freeze the snapshot at refresh time: content seen during the previous
    // session now counts as "seen" and gets demoted on this fresh load.
    setRankSnapshot(getSeenSnapshot());
    fetchFeedData(true, false);
  }, [fetchFeedData, getSeenSnapshot]);

  const loadMorePosts = useCallback(() => {
    if (!loadingMore && hasMore && lastVisible) {
      fetchFeedData(false, true);
    }
  }, [fetchFeedData, loadingMore, hasMore, lastVisible]);

  // ── Real-time listener (initial load + live updates) ──────────────────────

  useEffect(() => {
    if (!currentUser?.uid) {
      setPosts([]);
      setMilestones([]);
      setTagPostPool([]);
      setLoading(false);
      setError(null);
      setLastVisible(null);
      setHasMore(true);
      return;
    }

    const uid = currentUser.uid;
    let active = true;

    // Build the tag pool in parallel with the feed subscription.
    buildTagPool(uid);

    const unsubscribe = FeedRepository.subscribe(
      uid,
      async result => {
        if (!active) return;

        if (result === 'empty') {
          // No personalized feed — load public posts as a one-time fallback.
          const fallback = await FeedRepository.loadPublicFallback(uid);
          if (!active) return;
          const unique = removeDuplicatePosts(fallback);
          setPosts(unique);
          setMilestones(unique.filter(p => p.isMilestone));
          setLoading(false);
          return;
        }

        const unique = removeDuplicatePosts(result.posts);
        setPosts(unique);
        setMilestones(unique.filter(p => p.isMilestone));
        setLoading(false);
        setError(null);
        if (result.cursor) setLastVisible(result.cursor);
        setHasMore(result.hasMore);
      },
      err => {
        if (!active) return;
        logger.error('useFeedData', 'Feed listener error', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [currentUser?.uid, removeDuplicatePosts, buildTagPool]);

  // Apply supply-adaptive ranking against the frozen snapshot. Re-runs when the
  // raw feed changes (live updates / load-more) but uses the frozen snapshot, so
  // unseen-first order is stable mid-session; posts and milestones are ranked
  // independently so each surface has its own unseen/seen boundary.
  const rankedPosts = useMemo<RankedFeedPost[]>(
    () => rankFeed(posts, rankSnapshot).ranked,
    [posts, rankSnapshot]
  );
  const rankedMilestones = useMemo<RankedFeedPost[]>(
    () => rankFeed(milestones, rankSnapshot).ranked,
    [milestones, rankSnapshot]
  );

  return {
    posts: rankedPosts,
    milestones: rankedMilestones,
    tagPostPool,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    refreshFeed,
    loadMorePosts,
    markSeen,
    isHydrated,
  };
}
