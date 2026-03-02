import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FeedRepository, FeedCursor } from '@/features/feed/infra/feedRepository';
import { FeedPost } from '@/features/feed/domain/FeedPost';
import { logger } from '@/shared/utils/logger';

export function useFeedData() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [milestones, setMilestones] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastVisible, setLastVisible] = useState<FeedCursor | null>(null);

  const { currentUser } = useAuth();

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
    [currentUser?.uid, lastVisible, removeDuplicatePosts]
  );

  const refreshFeed = useCallback(() => {
    fetchFeedData(true, false);
  }, [fetchFeedData]);

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
      setLoading(false);
      setError(null);
      setLastVisible(null);
      setHasMore(true);
      return;
    }

    const uid = currentUser.uid;
    let active = true;

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
  }, [currentUser?.uid, removeDuplicatePosts]);

  return {
    posts,
    milestones,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    refreshFeed,
    loadMorePosts,
  };
}
