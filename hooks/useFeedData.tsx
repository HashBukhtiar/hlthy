import { useState, useEffect, useCallback } from 'react';
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
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/context/AuthContext';
import { Post } from '@/hooks/usePostsData';
import { UserProfile } from '@/types';

interface FeedPost extends Post {
  authorBlockedUsers?: string[];
}

export function useFeedData() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [milestones, setMilestones] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const { currentUser } = useAuth();
  const BATCH_SIZE = 10;

  const removeDuplicatePosts = useCallback((posts: FeedPost[]): FeedPost[] => {
    const seenIds = new Set<string>();
    return posts.filter(post => {
      if (seenIds.has(post.id)) {
        console.warn(`Duplicate post prevented in feed data: ${post.id}`);
        return false;
      }
      seenIds.add(post.id);
      return true;
    });
  }, []);

  const processPostsWithAuthorProfiles = useCallback(async (postDocs: (Post & { id: string })[]): Promise<FeedPost[]> => {
    if (postDocs.length === 0) return [];
    if (!currentUser?.uid) return [];

    // 1. Collect unique author IDs from the posts
    const authorIds = [...new Set(postDocs.map(post => post.authorId).filter(id => id))];

    // 2. Fetch all author profiles in a single batched query
    const authorProfiles: Record<string, UserProfile> = {};
    if (authorIds.length > 0) {
      // Firestore 'in' queries are limited to 30 items. For larger batches, you would need to chunk this.
      const usersQuery = query(collection(db, 'users'), where('__name__', 'in', authorIds));
      const usersSnapshot = await getDocs(usersQuery);
      usersSnapshot.forEach(doc => {
        authorProfiles[doc.id] = doc.data() as UserProfile;
      });
    }
    
    // 3. Map fresh profile data back to each post
    const enrichedPosts: FeedPost[] = [];
    for (const postData of postDocs) {
      const authorProfile = authorProfiles[postData.authorId];
      const likeRef = doc(db, 'posts', postData.id, 'likers', currentUser.uid);
      const likeDoc = await getDoc(likeRef);

      enrichedPosts.push({
        ...postData,
        authorProfileImageUrl: authorProfile?.profileImageUrl,
        authorProfileThumbnailUrl: authorProfile?.profileThumbnailUrl,
        authorBlockedUsers: authorProfile?.blockedUsers || [],
        isLiked: likeDoc.exists(),
        isBookmarked: false, // TODO: Implement bookmark checking
      });
    }
    return enrichedPosts;
  }, [currentUser?.uid]);

  const fetchFeedData = useCallback(async (isRefresh = false, isLoadMore = false) => {
    if (!currentUser?.uid) return;

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

      // Query user's personalized feed
      const feedRef = collection(db, 'feeds', currentUser.uid, 'userFeed');
      let feedQuery = query(
        feedRef,
        orderBy('createdAt', 'desc'),
        limit(BATCH_SIZE)
      );

      // Add pagination for load more
      if (isLoadMore && lastVisible) {
        feedQuery = query(
          feedRef,
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(BATCH_SIZE)
        );
      }

      const feedSnapshot = await getDocs(feedQuery);
      
      if (feedSnapshot.empty) {
        if (isLoadMore) {
          setHasMore(false);
        } else {
          // No feed data, fetch some public posts as fallback
          await fetchPublicPostsFallback(isRefresh);
        }
        return;
      }

      // Get the actual post data for each feed item
      const postPromises = feedSnapshot.docs.map(feedDoc => getDoc(doc(db, 'posts', feedDoc.id)));
      const postSnapshots = await Promise.all(postPromises);

      const postsData = postSnapshots
        .filter(doc => doc.exists())
        .map(doc => ({ id: doc.id, ...doc.data() } as Post & { id: string }));

      const feedPosts = await processPostsWithAuthorProfiles(postsData);

      // Set last visible for pagination
      if (feedSnapshot.docs.length > 0) {
        setLastVisible(feedSnapshot.docs[feedSnapshot.docs.length - 1]);
      }

      // Remove duplicates before updating state
      const uniqueFeedPosts = removeDuplicatePosts(feedPosts);

      // Update state
      if (isRefresh || !isLoadMore) {
        setPosts(uniqueFeedPosts);
        setMilestones(uniqueFeedPosts.filter(post => post.isMilestone));
      } else {
        // For load more, ensure we don't add duplicates to existing posts
        setPosts(prevPosts => {
          const combinedPosts = [...prevPosts, ...uniqueFeedPosts];
          return removeDuplicatePosts(combinedPosts);
        });
        setMilestones(prevMilestones => {
          const newMilestones = uniqueFeedPosts.filter(post => post.isMilestone);
          const combinedMilestones = [...prevMilestones, ...newMilestones];
          return removeDuplicatePosts(combinedMilestones);
        });
      }

      // Check if we have more data
      setHasMore(feedSnapshot.docs.length === BATCH_SIZE);
      setError(null);

    } catch (err) {
      console.error('Error fetching feed data:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [currentUser?.uid, lastVisible, removeDuplicatePosts]);

  const fetchPublicPostsFallback = async (isRefresh = false) => {
    try {
      // Fallback to public posts if user has no personalized feed
      const postsRef = collection(db, 'posts');
      const publicQuery = query(
        postsRef,
        where('authorId', '!=', currentUser!.uid),
        where('visibility', '==', 'public'),
        orderBy('authorId'), 
        orderBy('createdAt', 'desc'),
        limit(BATCH_SIZE)
      );

      const publicSnapshot = await getDocs(publicQuery);
      
      // Efficiently process all fetched public posts
      const postsData = publicSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post & { id: string }));
      const publicPosts = await processPostsWithAuthorProfiles(postsData);

      // Remove duplicates before setting state
      const uniquePublicPosts = removeDuplicatePosts(publicPosts);
      setPosts(uniquePublicPosts);
      setMilestones(uniquePublicPosts.filter(post => post.isMilestone));
      setHasMore(publicSnapshot.docs.length === BATCH_SIZE);

    } catch (err) {
      console.error('Error fetching public posts fallback:', err);
      // If the compound query fails, try a simpler approach
      try {
        const postsRef = collection(db, 'posts');
        const simpleQuery = query(
          postsRef,
          where('visibility', '==', 'public'),
          orderBy('createdAt', 'desc'),
          limit(BATCH_SIZE * 2) // Get more to filter out user's posts
        );

        const simpleSnapshot = await getDocs(simpleQuery);
        
        // Filter out user's own posts client-side
        const filteredPostDocs = simpleSnapshot.docs
          .filter(doc => doc.data().authorId !== currentUser!.uid)
          .slice(0, BATCH_SIZE);

        // Efficiently process the filtered posts
        const postsData = filteredPostDocs.map(doc => ({ id: doc.id, ...doc.data() } as Post & { id: string }));
        const filteredPosts = await processPostsWithAuthorProfiles(postsData);

        const uniqueFilteredPosts = removeDuplicatePosts(filteredPosts);
        setPosts(uniqueFilteredPosts);
        setMilestones(uniqueFilteredPosts.filter(post => post.isMilestone));
        setHasMore(filteredPosts.length === BATCH_SIZE);
        
      } catch (fallbackErr) {
        console.error('Error in simple fallback query:', fallbackErr);
        setError(fallbackErr as Error);
      }
    }
  };

  const refreshFeed = useCallback(() => {
    fetchFeedData(true, false);
  }, [fetchFeedData]);

  const loadMorePosts = useCallback(() => {
    if (!loadingMore && hasMore && lastVisible) {
      fetchFeedData(false, true);
    }
  }, [fetchFeedData, loadingMore, hasMore, lastVisible]);

  // Initial load with real-time listener
  useEffect(() => {
    if (!currentUser?.uid) return;

    const feedRef = collection(db, 'feeds', currentUser.uid, 'userFeed');
    const feedQuery = query(
      feedRef,
      orderBy('createdAt', 'desc'),
      limit(BATCH_SIZE)
    );

    const unsubscribe = onSnapshot(feedQuery, 
      async (snapshot) => {
        if (snapshot.empty) {
          // No personalized feed data, use fallback
          await fetchPublicPostsFallback();
          setLoading(false);
          return;
        }

        // Get post documents from the feed references
        const postPromises = snapshot.docs.map(feedDoc => getDoc(doc(db, 'posts', feedDoc.id)));
        const postSnapshots = await Promise.all(postPromises);
        
        const postsData = postSnapshots
          .filter(doc => doc.exists())
          .map(doc => ({ id: doc.id, ...doc.data() } as Post & { id: string }));

        // Process posts to get author profiles and like status
        const feedPosts = await processPostsWithAuthorProfiles(postsData);

        // Remove duplicates before setting state
        const uniqueFeedPosts = removeDuplicatePosts(feedPosts);
        setPosts(uniqueFeedPosts);
        setMilestones(uniqueFeedPosts.filter(post => post.isMilestone));
        setLoading(false);
        setError(null);

        if (snapshot.docs.length > 0) {
          setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
          setHasMore(snapshot.docs.length === BATCH_SIZE);
        }
      },
      (error) => {
        console.error('Feed listener error:', error);
        setError(error as Error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [currentUser?.uid, removeDuplicatePosts, processPostsWithAuthorProfiles]);

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