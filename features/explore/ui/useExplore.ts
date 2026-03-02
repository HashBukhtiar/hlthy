import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBlockEnforcement } from '@/utils/blockUtils';
import { ExploreRepository, ExploreCursor } from '@/features/explore/infra/exploreRepository';
import type { ExplorePost, UserSearchResult } from '@/features/explore/domain/ExploreTypes';

// Fisher-Yates shuffle (pure function, no Firestore dependency).
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface UseExploreResult {
  // Search
  searchQuery: string;
  searchResults: UserSearchResult[];
  searchLoading: boolean;
  searchPerformed: boolean;
  handleSearch: (text: string) => void;
  // Posts grid
  posts: ExplorePost[];
  loadingPosts: boolean;
  allPostsLoaded: boolean;
  loadMore: () => void;
}

export function useExplore(): UseExploreResult {
  const { currentUser, userProfile } = useAuth();
  const { canInteractWithUser } = useBlockEnforcement();

  // ── Search state ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Posts grid state ────────────────────────────────────────────────────
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [allPostsLoaded, setAllPostsLoaded] = useState(false);
  const [lastVisibleArchetype, setLastVisibleArchetype] = useState<ExploreCursor | null>(null);
  const [lastVisiblePopular, setLastVisiblePopular] = useState<ExploreCursor | null>(null);
  const [nextFetchType, setNextFetchType] = useState<'archetype' | 'popular'>('archetype');

  // ── Search ───────────────────────────────────────────────────────────────

  const performSearch = useCallback(
    async (text: string) => {
      if (text.trim().length < 2) {
        setSearchResults([]);
        setSearchPerformed(false);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      setSearchPerformed(true);
      try {
        const raw = await ExploreRepository.searchUsers(text, currentUser?.uid ?? '');
        // Apply block enforcement on the client side.
        const filtered = raw.filter(u =>
          canInteractWithUser(u.id, (u as any)._blockedUsers)
        );
        setSearchResults(filtered);
      } catch (err) {
        console.error('Error searching users:', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [currentUser?.uid, canInteractWithUser]
  );

  const handleSearch = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (text.trim().length === 0) {
        setSearchResults([]);
        setSearchPerformed(false);
        setSearchLoading(false);
        return;
      }
      if (text.trim().length >= 2) setSearchLoading(true);
      debounceTimer.current = setTimeout(() => performSearch(text), 300);
    },
    [performSearch]
  );

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // ── Posts grid ───────────────────────────────────────────────────────────

  const fetchInitialPosts = useCallback(async () => {
    if (!currentUser?.uid) return;
    setLoadingPosts(true);
    setLastVisibleArchetype(null);
    setLastVisiblePopular(null);
    setAllPostsLoaded(false);
    try {
      const page = await ExploreRepository.loadInitialPosts(
        currentUser.uid,
        userProfile?.archetype
      );
      setPosts(shuffleArray(page.posts));
      setLastVisibleArchetype(page.archetypeCursor);
      setLastVisiblePopular(page.popularCursor);
      setNextFetchType('archetype');
    } catch (err) {
      console.error('Error fetching explore posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  }, [currentUser?.uid, userProfile?.archetype]);

  const loadMore = useCallback(async () => {
    if (loadingPosts || allPostsLoaded || !currentUser?.uid) return;
    setLoadingPosts(true);
    try {
      const archetype = userProfile?.archetype;
      let newPosts: ExplorePost[] = [];
      let newCursor: ExploreCursor | null = null;

      if (nextFetchType === 'archetype' && archetype && lastVisibleArchetype) {
        const page = await ExploreRepository.loadNextArchetypeBatch(
          currentUser.uid,
          archetype,
          lastVisibleArchetype
        );
        newPosts = page.posts;
        newCursor = page.cursor;
        if (newCursor) setLastVisibleArchetype(newCursor);
        setNextFetchType('popular');
      } else if (lastVisiblePopular) {
        const page = await ExploreRepository.loadNextPopularBatch(
          currentUser.uid,
          archetype,
          lastVisiblePopular
        );
        newPosts = page.posts;
        newCursor = page.cursor;
        if (newCursor) setLastVisiblePopular(newCursor);
        setNextFetchType('archetype');
      }

      if (newPosts.length === 0) {
        if (nextFetchType === 'popular') {
          setNextFetchType('archetype');
        } else {
          setAllPostsLoaded(true);
        }
      } else {
        setPosts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          return [...prev, ...newPosts.filter(p => !existingIds.has(p.id))];
        });
      }
    } catch (err) {
      console.error('Error fetching more explore posts:', err);
    } finally {
      setLoadingPosts(false);
    }
  }, [
    loadingPosts,
    allPostsLoaded,
    currentUser?.uid,
    userProfile?.archetype,
    nextFetchType,
    lastVisibleArchetype,
    lastVisiblePopular,
  ]);

  // Reload when userProfile changes (matches original behavior).
  useEffect(() => {
    if (!searchQuery) {
      fetchInitialPosts();
    }
  }, [userProfile]);

  return {
    searchQuery,
    searchResults,
    searchLoading,
    searchPerformed,
    handleSearch,
    posts,
    loadingPosts,
    allPostsLoaded,
    loadMore,
  };
}
