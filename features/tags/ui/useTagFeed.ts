import { useState, useEffect, useCallback } from 'react';
import { TagRepository, TagFeedCursor } from '../infra/tagRepository';
import type { ExplorePost } from '@/features/explore/domain/ExploreTypes';

const PAGE_SIZE = 18;

export function useTagFeed(tagName: string) {
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [allLoaded, setAllLoaded] = useState(false);
  const [cursor, setCursor] = useState<TagFeedCursor | null>(null);
  const [postCount, setPostCount] = useState(0);

  useEffect(() => {
    if (!tagName) return;
    let cancelled = false;

    const loadInitial = async () => {
      setLoading(true);
      setPosts([]);
      setCursor(null);
      setAllLoaded(false);

      const [tagInfo, page] = await Promise.all([
        TagRepository.getTag(tagName),
        TagRepository.fetchTagFeedPosts(tagName, PAGE_SIZE),
      ]);

      if (cancelled) return;
      setPostCount(tagInfo?.postCount ?? 0);
      setPosts(page.posts);
      setCursor(page.cursor);
      if (!page.cursor || page.posts.length < PAGE_SIZE) setAllLoaded(true);
      setLoading(false);
    };

    loadInitial().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [tagName]);

  const loadMore = useCallback(async () => {
    if (allLoaded || loading || !cursor) return;
    setLoading(true);
    try {
      const page = await TagRepository.fetchTagFeedPosts(tagName, PAGE_SIZE, cursor);
      setPosts(prev => {
        const ids = new Set(prev.map(p => p.id));
        return [...prev, ...page.posts.filter(p => !ids.has(p.id))];
      });
      setCursor(page.cursor);
      if (!page.cursor || page.posts.length < PAGE_SIZE) setAllLoaded(true);
    } catch (error) {
      console.error('Error loading more tag feed posts:', error);
    } finally {
      setLoading(false);
    }
  }, [tagName, cursor, allLoaded, loading]);

  return { posts, loading, allLoaded, loadMore, postCount };
}
