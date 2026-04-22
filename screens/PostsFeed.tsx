import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  FlatList, 
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getOptimalImageUrl, DEFAULT_PROFILE_IMAGE } from '@/utils/imageUtils';
import * as Haptics from 'expo-haptics';
import { useFeedData, TagInjectedPost } from '@/hooks/useFeedData';
import { usePostsData, Post } from '@/hooks/usePostsData';
import { useAuth } from '@/context/AuthContext';
import { useBlockEnforcement } from '@/utils/blockUtils';
import { OptimizedImageLight } from '@/components/OptimizedImage';
import ShareModal from '@/components/ShareModal';
import { sharePost } from '@/services/ShareService';
import PostActionMenu from '@/components/PostActionMenu';
import { useContentActions } from '@/hooks/useContentActions';
import { ACCENT_COLOR } from '@/constants/Colors';
import { TagChip } from '@/components/TagChip';
import { navigateToTagFeed } from '@/features/explore/ui/useExplore';
import {
  TAG_INJECTION_MIN,
  TAG_INJECTION_MAX,
} from '@/features/tags/domain/Tag';

console.log('[PostsFeed] Module loaded');

type FeedItem = Post & { injectedFromTag?: string };

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to format relative time
const getRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  // If the date is in the future or exactly now, avoid negative values.
  // Return a neutral "0s ago" to prevent displaying "-5s ago".
  if (diffInSeconds <= 0) {
    return '0s ago';
  }

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}mo ago`;
  }
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
};

export default function PostsFeed() {
  console.log('[PostsFeed] Component rendering');
  const router = useRouter();
  const { currentUser, userProfile } = useAuth();
  const { posts: feedPosts, tagPostPool, loading, refreshing, loadingMore, hasMore, error, refreshFeed, loadMorePosts } = useFeedData();
  const { likePost, unlikePost, addComment } = usePostsData();
  const { canInteractWithUser, isUserBlocked } = useBlockEnforcement();
  
  // Local state for optimistic updates  
  const [posts, setPosts] = useState<typeof feedPosts>([]);

  // Update local posts when feedPosts change
  useEffect(() => {
    setPosts(feedPosts);
  }, [feedPosts]);
  
  const [newComment, setNewComment] = useState('');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [postToShare, setPostToShare] = useState<Post | null>(null);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [selectedPostForAction, setSelectedPostForAction] = useState<Post | null>(null);

  // Use shared content actions hook
  const { 
    handleToggleFollowFromMenu, 
    handleBlockUser, 
    handleReportContent: handleReportPost 
  } = useContentActions({
    selectedItem: selectedPostForAction,
    currentUser,
    setSelectedItem: setSelectedPostForAction,
    updateItems: setPosts,
    refreshFeed,
    contentType: 'post',
  });

  // Double-tap functionality refs
  const tapTimers = useRef<Record<string, number>>({});
  const likingInProgress = useRef<Record<string, boolean>>({});

  // Handle image click to view full post
  const handleViewPost = useCallback((postId: string) => {
    router.push(`/view-post/${postId}`);
  }, [router]);

  // Handle like/unlike post
  const handleToggleLike = useCallback(async (postId: string, isCurrentlyLiked: boolean) => {
    if (!currentUser) {
      Alert.alert('Please log in', 'You need to be logged in to like posts.');
      return;
    }

    // Haptic feedback
    Haptics.impactAsync(isCurrentlyLiked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);

    // Configure smooth animation (exclude opacity to avoid TouchableOpacity conflicts)
    LayoutAnimation.configureNext({
      duration: 200,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.scaleXY,
      },
    });

    // Optimistic update - update UI immediately
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? {
              ...post,
              isLiked: !isCurrentlyLiked,
              reactionCount: isCurrentlyLiked 
                ? Math.max(0, (post.reactionCount || 0) - 1)
                : (post.reactionCount || 0) + 1
            }
          : post
      )
    );

    try {
      if (isCurrentlyLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Animate the revert as well
      LayoutAnimation.configureNext({
        duration: 200,
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.scaleXY,
        },
      });
      // Revert optimistic update on error
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? {
                ...post,
                isLiked: isCurrentlyLiked,
                reactionCount: isCurrentlyLiked 
                  ? (post.reactionCount || 0) + 1
                  : Math.max(0, (post.reactionCount || 0) - 1)
              }
            : post
        )
      );
      Alert.alert('Error', 'Could not update like status. Please try again.');
    }
  }, [currentUser, likePost, unlikePost]);

  // Handle bookmark toggle
  const handleToggleBookmark = useCallback((postId: string, isCurrentlyBookmarked: boolean) => {
    if (!currentUser) {
      Alert.alert('Please log in', 'You need to be logged in to bookmark posts.');
      return;
    }

    // Haptic feedback
    Haptics.impactAsync(isCurrentlyBookmarked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);

    // Optimistic update - update UI immediately
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, isBookmarked: !isCurrentlyBookmarked }
          : post
      )
    );

    // TODO: Implement actual bookmark API call
    // For now, just keep the optimistic update
  }, [currentUser]);

  // Handle opening action menu
  const handleOpenActionMenu = useCallback((post: Post) => {
    setSelectedPostForAction(post);
    setActionMenuVisible(true);
  }, []);

  // Navigation functions
  const navigateToWorkout = useCallback((workoutId: string) => {
    router.push(`/view-workout/${workoutId}`);
  }, [router]);

  const navigateToMilestone = useCallback((milestoneId: string) => {
    router.push(`/view-milestone/${milestoneId}`);
  }, [router]);

  const navigateToProfile = useCallback((userId: string) => {
    router.push(`/profile/${userId}`);
  }, [router]);

  // Comment functions
  const toggleCommentInput = useCallback((postId: string) => {
    setActiveCommentId(activeCommentId === postId ? null : postId);
    setNewComment('');
  }, [activeCommentId]);

  // Share functions
  const handleSharePost = useCallback((post: Post) => {
    if (!currentUser) {
      Alert.alert('Please log in', 'You need to be logged in to share posts.');
      return;
    }
    setPostToShare(post);
    setShareModalVisible(true);
  }, [currentUser]);

  const sharePostWithUser = useCallback(async (
    userId: string, 
    username: string, 
    profileImageUrl?: string, 
    profileThumbnailUrl?: string
  ) => {
    if (!currentUser || !postToShare) return;

    try {
      await sharePost(
        currentUser,
        userId,
        username,
        profileImageUrl,
        profileThumbnailUrl,
        {
          id: postToShare.id,
          caption: postToShare.caption,
          imageUrl: postToShare.imageUrl,
          thumbnailUrl: postToShare.thumbnailUrl,
          authorUsername: postToShare.authorUsername
        }
      );

      setShareModalVisible(false);
      Alert.alert('Success', 'Post shared successfully');
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Error', 'Failed to share post. Please try again.');
    }
  }, [currentUser, postToShare]);

  const handleAddComment = useCallback(async (postId: string) => {
    if (!currentUser || !newComment.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      await addComment(postId, newComment.trim());
      setNewComment('');
      setActiveCommentId(null);
      // Optionally refresh the feed or update the specific post
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Could not add comment. Please try again.');
    } finally {
      setSubmittingComment(false);
    }
  }, [currentUser, newComment, submittingComment, addComment]);

  // Double-tap handler for posts
  const createDoubleTapHandler = useCallback((postId: string, isCurrentlyLiked: boolean) => {
    return () => {
      // Prevent multiple rapid taps
      if (likingInProgress.current[postId]) {
        return;
      }

      const now = Date.now();
      const lastTap = tapTimers.current[postId];
      
      if (lastTap && now - lastTap < 300) {
        // Double tap detected - like the post
        delete tapTimers.current[postId];
        try {
          // Haptic feedback
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          
          // Set in progress flag
          likingInProgress.current[postId] = true;
          
          // Only like if not already liked
          if (!isCurrentlyLiked) {
            handleToggleLike(postId, false);
          }
          
          // Clear in progress flag after a delay
          setTimeout(() => {
            delete likingInProgress.current[postId];
          }, 1000);
        } catch (error) {
          console.error('Error in double tap handler:', error);
          delete likingInProgress.current[postId];
        }
      } else {
        // Single tap - store timestamp and navigate after delay
        tapTimers.current[postId] = now;
        
        // Navigate to post after delay if no second tap comes
        setTimeout(() => {
          if (tapTimers.current[postId] === now) {
            delete tapTimers.current[postId];
            handleViewPost(postId);
          }
        }, 300);
      }
    };
  }, [handleToggleLike, handleViewPost]);

  // Format milestone preview
  const formatMilestonePreview = useCallback((details: any): string => {
    if (!details) return '';
  
    if (details.type === 'weightLoss' || details.type === 'weightGain') {
      return `${details.type === 'weightLoss' ? 'Lost' : 'Gained'}: ${details.totalLoss || details.totalGain} ${details.newWeightUnit || 'lbs'}`;
    }
  
    if (details.type === 'PR') {
      const exercise = details.exerciseName || 'Record';
      if (details.value && details.reps) {
        return `${exercise}: ${details.value} ${details.weightUnit || 'lbs'} × ${details.reps} reps`;
      }
      if (details.reps) {
        return `${exercise}: ${details.reps} reps`;
      }
      if (details.duration) {
        const d = details.duration;
        const h = Math.floor(d / 3600);
        const m = Math.floor((d % 3600) / 60);
        const s = d % 60;
        const time = [h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : '', (s > 0 || (!h && !m)) ? `${s}s` : ''].filter(Boolean).join(' ');
        return `${exercise}: ${time}`;
      }
      return exercise;
    }
  
    return 'View Achievement';
  }, []);

  const mergedFeed = useMemo((): FeedItem[] => {
    const regularPosts = posts.filter(post => {
      if (post.isMilestone && !post.imageUrl) return false;
      if (isUserBlocked(post.authorId)) return false;
      if (post.authorBlockedUsers?.includes(currentUser?.uid || '')) return false;
      return true;
    });

    if (tagPostPool.length === 0) return regularPosts;

    // Deduplicate tag pool against the regular feed.
    const regularIds = new Set(regularPosts.map(p => p.id));
    const pool: TagInjectedPost[] = tagPostPool.filter(p => !regularIds.has(p.id));

    if (pool.length === 0) return regularPosts;

    // Weave tag posts in at random intervals [TAG_INJECTION_MIN, TAG_INJECTION_MAX].
    const merged: FeedItem[] = [];
    let poolIndex = 0;
    let nextInjection = randomBetween(TAG_INJECTION_MIN, TAG_INJECTION_MAX);

    for (let i = 0; i < regularPosts.length; i++) {
      merged.push(regularPosts[i]);
      if (i + 1 === nextInjection && poolIndex < pool.length) {
        merged.push(pool[poolIndex++] as FeedItem);
        nextInjection += randomBetween(TAG_INJECTION_MIN, TAG_INJECTION_MAX);
      }
    }

    return merged;
  }, [posts, tagPostPool, isUserBlocked, currentUser?.uid]);

  // Render individual post
  const renderPost = useCallback(({ item }: { item: FeedItem }) => {
    const canInteract = !isUserBlocked(item.authorId);
    
    return (
      <View style={styles.postContainer}>
        {/* Header with user info */}
        <View style={styles.postHeader}>
          <TouchableOpacity 
            style={styles.userInfoContainer}
            onPress={() => canInteract ? navigateToProfile(item.authorId) : null}
            activeOpacity={0.8}
          >
            <OptimizedImageLight 
              thumbnailUrl={item.authorProfileThumbnailUrl}
              originalUrl={item.authorProfileImageUrl}
              style={styles.profilePic}
            />
            <View>
              <Text style={styles.username}>{item.authorUsername}</Text>
              <View style={styles.timestampContainer}>
                <Text style={styles.timestamp}>
                  {item.createdAt ? getRelativeTime(new Date(item.createdAt.toDate())) : 'Unknown'}
                </Text>
                <Ionicons 
                  name={item.isPublic ? "earth-outline" : "people"} 
                  size={12} 
                  color="#8E8E93" 
                  style={styles.visibilityIcon}
                />
              </View>
            </View>
          </TouchableOpacity>
          {canInteract && (
            <TouchableOpacity 
              style={styles.moreButton}
              onPress={() => handleOpenActionMenu(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tag injection attribution */}
        {item.injectedFromTag && (
          <Text style={styles.injectedTagLabel}>because you follow #{item.injectedFromTag}</Text>
        )}

        {/* Caption */}
        {item.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption} numberOfLines={3}>{item.caption}</Text>
          </View>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.map((tag) => (
              <TagChip
                key={tag}
                tag={tag}
                onPress={() => canInteract && navigateToTagFeed(tag)}
              />
            ))}
          </View>
        )}

        {/* Post Image */}
        {item.imageUrl && (
          <View style={styles.imageWrapper}>
            <TouchableOpacity 
              activeOpacity={0.9}
              onPress={canInteract ? createDoubleTapHandler(item.id, item.isLiked || false) : undefined}
            >
              <Image
                source={{ uri: item.imageUrl! }}
                style={styles.postImage}
                onError={({ nativeEvent }) => console.error('❌ post image failed to load:', item.imageUrl, nativeEvent)}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Likes and Comments Stats */}
        {canInteract && (
          <View style={styles.statsContainer}>
            <View style={styles.statsLeft}>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => handleToggleLike(item.id, item.isLiked || false)}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={item.isLiked ? "heart" : "heart-outline"} 
                  size={20} 
                  color={item.isLiked ? ACCENT_COLOR : "#FFF"} 
                  style={styles.statIcon} 
                />
                <Text style={styles.statNumber}>{item.reactionCount || 0}</Text>
                <Text style={styles.statLabel}> {item.reactionCount === 1 ? 'Like' : 'Likes'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => handleViewPost(item.id)}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-outline" size={20} color="#FFF" style={styles.statIcon} />
                <Text style={styles.statNumber}>{item.commentCount || 0}</Text>
                <Text style={styles.statLabel}> {item.commentCount === 1 ? 'Comment' : 'Comments'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.statsRight}>
              <TouchableOpacity 
                style={styles.iconButtonSmall} 
                activeOpacity={0.8}
                onPress={() => handleSharePost(item)}
              >
                <Ionicons name="paper-plane-outline" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.iconButtonSmall}
                onPress={() => handleToggleBookmark(item.id, item.isBookmarked || false)}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={item.isBookmarked ? "bookmark" : "bookmark-outline"} 
                  size={20} 
                  color="#FFF"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Comment Input (shown only for active comment) */}
        {canInteract && activeCommentId === item.id && (
          <View style={styles.commentInputContainer}>
            <Image 
              source={{ 
                uri: getOptimalImageUrl(userProfile?.profileThumbnailUrl, userProfile?.profileImageUrl) || DEFAULT_PROFILE_IMAGE
              }} 
              style={styles.commentInputProfilePic} 
            />
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor="#666"
              value={newComment}
              onChangeText={setNewComment}
              autoFocus
            />
            <TouchableOpacity 
              style={[styles.postButton, (newComment.trim() === '' || submittingComment) && styles.disabledButton]}
              onPress={() => handleAddComment(item.id)}
              disabled={newComment.trim() === '' || submittingComment}
            >
              {submittingComment ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={[styles.postButtonText, newComment.trim() === '' && styles.disabledButtonText]}>
                  Post
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Attached Milestone (if exists) - For Achievement Posts */}
        {canInteract && item.isMilestone && item.milestoneDetails && (
          <TouchableOpacity 
            style={styles.attachedItemContainer}
            onPress={() => navigateToMilestone(item.id)}
          >
            <View style={styles.attachedItemContent}>
              <View style={styles.attachedItemInfo}>
                <View style={styles.workoutIconContainer}>
                  <Ionicons name="trophy" size={18} color="#000" />
                </View>
                <View>
                  <Text style={styles.attachedItemTitle}>
                    {item.milestoneDetails.type === 'PR' ? 'Personal Record' : 
                    item.milestoneDetails.type === 'weightLoss' ? 'Weight Loss' : 'Weight Gain'}
                  </Text>
                  <Text style={styles.attachedItemDetails}>
                    {formatMilestonePreview(item.milestoneDetails)}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>
        )}

        {/* Attached Workout (if exists) */}
        {canInteract && item.workoutId && (
          <TouchableOpacity 
            style={styles.attachedItemContainer}
            onPress={() => navigateToWorkout(item.workoutId!)}
          >
            <View style={styles.attachedItemContent}>
              <View style={styles.attachedItemInfo}>
                <View style={styles.workoutIconContainer}>
                  <Ionicons name="flame" size={20} color="#000" />
                </View>
                <View>
                  <Text style={styles.attachedItemTitle}>
                    {item.workoutTitle || 'Workout'}
                  </Text>
                  <View style={styles.workoutDetailsContainer}>
                    <Text style={styles.attachedItemDetails}>
                      {item.workoutAuthor || item.authorUsername} • {item.workoutDuration ? (() => {
                        const d = item.workoutDuration;
                        const h = Math.floor(d / 3600);
                        const m = Math.floor((d % 3600) / 60);
                        const s = d % 60;
                        return [h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : '', (s > 0 || (!h && !m)) ? `${s}s` : ''].filter(Boolean).join(' ');
                      })() : '1h 45m'}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [
    navigateToProfile, 
    handleViewPost, 
    handleToggleLike, 
    toggleCommentInput, 
    handleToggleBookmark, 
    activeCommentId,
    newComment,
    submittingComment,
    handleAddComment,
    navigateToMilestone,
    navigateToWorkout,
    formatMilestonePreview,
    userProfile,
    isUserBlocked,
    createDoubleTapHandler,
    handleSharePost,
    handleOpenActionMenu,
  ]);

  // Render footer for load more
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={styles.loadingText}>Loading more posts...</Text>
      </View>
    );
  }, [loadingMore]);

  // Render empty state
  const renderEmptyState = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.emptyStateText}>Loading your feed...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyStateContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="people-outline" size={40} color={ACCENT_COLOR} />
          </View>
          <Text style={styles.emptyStateTitle}>Your Feed Awaits</Text>
          <Text style={styles.emptyStateText}>
            Start following creators to see their latest posts and workouts.
          </Text>
          <TouchableOpacity 
            style={styles.exploreButton}
            onPress={() => router.push('/explore')}
            activeOpacity={0.8}
          >
            <Ionicons name="compass" size={18} color="#000" style={styles.buttonIcon} />
            <Text style={styles.exploreButtonText}>Explore Content</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [loading, router]);

  if (error) {
    return (
      <View style={styles.errorState}>
        <Ionicons name="alert-circle-outline" size={80} color="#FF3B30" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorText}>Could not load your feed. Please try again.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshFeed}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={mergedFeed}
        renderItem={renderPost}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={mergedFeed.length === 0 ? styles.emptyContainer : styles.postsContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshFeed}
            colors={['#FFF']}
            tintColor="#FFF"
          />
        }
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
      />
      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        onShareWith={sharePostWithUser}
      />
      <PostActionMenu
        visible={actionMenuVisible}
        onClose={() => setActionMenuVisible(false)}
        isBookmarked={selectedPostForAction?.isBookmarked || false}
        isFollowing={selectedPostForAction?.isFollowing || false}
        isOwnPost={selectedPostForAction?.authorId === currentUser?.uid}
        onToggleBookmark={() => {
          if (selectedPostForAction) {
            handleToggleBookmark(selectedPostForAction.id, selectedPostForAction.isBookmarked || false);
          }
        }}
        onToggleFollow={handleToggleFollowFromMenu}
        onBlock={handleBlockUser}
        onReport={handleReportPost}
      />
    </>
  );
};

const styles = StyleSheet.create({
  postsContainer: {
    paddingTop: 12,
    paddingBottom: 70,
    backgroundColor: '#2C2C2E',
  },
  emptyContainer: {
    flex: 1,
  },
  postContainer: {
    marginBottom: 12,
    marginHorizontal: 12,
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontWeight: '600',
    fontSize: 15,
    color: '#FFF',
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  visibilityIcon: {
    marginLeft: 4,
  },
  moreButton: {
    padding: 5,
  },
  imageWrapper: {
    paddingHorizontal: 12,
  },
  postImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    resizeMode: 'cover',
    borderRadius: 12,
    marginBottom: 0,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  statsLeft: {
    flexDirection: 'row',
    gap: 20,
  },
  statsRight: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    marginRight: 6,
  },
  statNumber: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '400',
  },
  iconButtonSmall: {
    padding: 4,
  },
  captionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 12,
  },
  caption: {
    flex: 1,
    color: '#E5E5EA',
    lineHeight: 20,
    fontSize: 14,
  },
  injectedTagLabel: {
    fontSize: 11,
    color: '#636366',
    paddingHorizontal: 15,
    paddingTop: 6,
    paddingBottom: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopColor: '#1C1C1E',
    borderTopWidth: 1,
    backgroundColor: '#000',
  },
  commentInputProfilePic: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  commentInput: {
    flex: 1,
    height: 38,
    borderColor: '#1C1C1E',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#FFF',
    backgroundColor: '#1C1C1E',
  },
  postButton: {
    marginLeft: 10,
    paddingHorizontal: 12,
  },
  postButtonText: {
    color: ACCENT_COLOR,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    color: '#666',
  },
  attachedItemContainer: {
    backgroundColor: '#1C1C1E',
    marginHorizontal: 15,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderColor: '#2C2C2E',
    borderWidth: 1,
    padding: 12,
  },
  attachedItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attachedItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attachedItemIcon: {
    marginRight: 12,
    backgroundColor: '#2C2C2E',
    padding: 8,
    borderRadius: 18,
  },
  workoutIconContainer: {
    marginRight: 12,
    backgroundColor: ACCENT_COLOR,
    padding: 8,
    borderRadius: 18,
  },
  workoutDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachedItemTitle: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  attachedItemDetails: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 2,
  },
  loadingFooter: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#8E8E93',
    marginTop: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconContainer: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: ACCENT_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
  },
  buttonIcon: {
    marginRight: 2,
  },
  exploreButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 15,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FF3B30',
    marginTop: 20,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
});