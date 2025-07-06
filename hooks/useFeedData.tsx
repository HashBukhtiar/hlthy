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
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/context/AuthContext';
import { Post } from '@/hooks/usePostsData';

interface FeedPost extends Post {
  // Add any feed-specific properties if needed
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
      const feedPosts: FeedPost[] = [];
      for (const feedDoc of feedSnapshot.docs) {
        const feedData = feedDoc.data();
        const postId = feedDoc.id;
        
        // Get the full post data
        const postRef = doc(db, 'posts', postId);
        const postDoc = await getDoc(postRef);
        
        if (postDoc.exists()) {
          const postData = postDoc.data() as Post;
          // Check if user has liked this post
          const likeRef = doc(db, 'posts', postId, 'likers', currentUser.uid);
          const likeDoc = await getDoc(likeRef);
          
          feedPosts.push({
            ...postData,
            id: postId,
            isLiked: likeDoc.exists(),
            isBookmarked: false, // TODO: Implement bookmark checking
          });
        }
      }

      // Set last visible for pagination
      if (feedSnapshot.docs.length > 0) {
        setLastVisible(feedSnapshot.docs[feedSnapshot.docs.length - 1]);
      }

      // Update state
      if (isRefresh || !isLoadMore) {
        setPosts(feedPosts);
        // Filter milestones
        setMilestones(feedPosts.filter(post => post.isMilestone));
      } else {
        setPosts(prevPosts => [...prevPosts, ...feedPosts]);
        setMilestones(prevMilestones => [
          ...prevMilestones,
          ...feedPosts.filter(post => post.isMilestone)
        ]);
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
  }, [currentUser?.uid, lastVisible]);

  const fetchPublicPostsFallback = async (isRefresh = false) => {
    try {
      // Fallback to public posts if user has no personalized feed
      const postsRef = collection(db, 'posts');
      const publicQuery = query(
        postsRef,
        orderBy('createdAt', 'desc'),
        limit(BATCH_SIZE)
      );

      const publicSnapshot = await getDocs(publicQuery);
      const publicPosts: FeedPost[] = [];

      for (const postDoc of publicSnapshot.docs) {
        const postData = postDoc.data() as Post;
        // Check if user has liked this post
        const likeRef = doc(db, 'posts', postDoc.id, 'likers', currentUser!.uid);
        const likeDoc = await getDoc(likeRef);
        
        publicPosts.push({
          ...postData,
          id: postDoc.id,
          isLiked: likeDoc.exists(),
          isBookmarked: false,
        });
      }

      setPosts(publicPosts);
      setMilestones(publicPosts.filter(post => post.isMilestone));
      setHasMore(publicSnapshot.docs.length === BATCH_SIZE);

    } catch (err) {
      console.error('Error fetching public posts fallback:', err);
      setError(err as Error);
    }
  };

  const refreshFeed = useCallback(() => {
    fetchFeedData(true, false);
  }, [fetchFeedData]);

  const loadMorePosts = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchFeedData(false, true);
    }
  }, [fetchFeedData, loadingMore, hasMore]);

  // Initial load
  useEffect(() => {
    if (currentUser?.uid) {
      fetchFeedData();
    }
  }, [currentUser?.uid]);

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