import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getOptimalImageUrl } from '@/utils/imageUtils';
import { useFeedData } from '@/hooks/useFeedData';
import { usePostsData, Post } from '@/hooks/usePostsData';
import { useAuth } from '@/context/AuthContext';
import { useBlockEnforcement } from '@/utils/blockUtils';

const DEFAULT_PROFILE_IMAGE = 'https://thumbs.dreamstime.com/b/creative-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mockup-144855718.jpg';

export default function PostsFeed() {
  const router = useRouter();
  const { currentUser, userProfile } = useAuth();
  const { posts, loading, refreshing, loadingMore, hasMore, error, refreshFeed, loadMorePosts } = useFeedData();
  const { likePost, unlikePost, addComment } = usePostsData();
  const { canInteractWithUser, isUserBlocked } = useBlockEnforcement();
  
  const [newComment, setNewComment] = useState('');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

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

    try {
      if (isCurrentlyLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
      // The UI update should be handled by the parent component or through state management
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Could not update like status. Please try again.');
    }
  }, [currentUser, likePost, unlikePost]);

  // Handle bookmark toggle
  const handleToggleBookmark = useCallback((postId: string) => {
    // TODO: Implement bookmark functionality
    console.log('Bookmark toggle for post:', postId);
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

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // Don't filter out current user's own posts
      if (post.authorId === currentUser?.uid) return true;
      
      // Filter out posts from users we've blocked
      if (isUserBlocked(post.authorId)) return false;
      
      // Filter out posts if we've been blocked by the author
      if (post.authorBlockedUsers && post.authorBlockedUsers.includes(currentUser?.uid)) {
        return false;
      }
      
      return true;
    });
  }, [posts, isUserBlocked, currentUser?.uid]);

  // Render individual post
  const renderPost = useCallback(({ item }: { item: Post }) => {
    const canInteract = !isUserBlocked(item.authorId);
    
    return (
      <View style={styles.postContainer}>
        {/* Header with user info */}
        <View style={styles.postHeader}>
          <TouchableOpacity 
            style={styles.userInfoContainer}
            onPress={() => canInteract ? navigateToProfile(item.authorId) : null}
          >
            <Image 
              source={{ uri: getOptimalImageUrl(item.authorProfileThumbnailUrl, item.authorProfileImageUrl) || DEFAULT_PROFILE_IMAGE }}
              style={styles.profilePic}
              onError={({ nativeEvent }) => console.error('❌ profile failed to load:', item.authorProfileThumbnailUrl, nativeEvent)}
            />
            <View>
              <Text style={styles.username}>{item.authorUsername}</Text>
              <Text style={styles.timestamp}>
                {item.createdAt ? new Date(item.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
              </Text>
            </View>
          </TouchableOpacity>
          {canInteract && (
            <TouchableOpacity style={styles.moreButton}>
              <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Post Image */}
        {item.imageUrl && (
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => canInteract ? handleViewPost(item.id) : null}
          >
            <Image
              source={{ uri: item.imageUrl! }}
              style={styles.postImage}
              onError={({ nativeEvent }) => console.error('❌ post image failed to load:', item.imageUrl, nativeEvent)}
            />
          </TouchableOpacity>
        )}

        {/* Action Buttons */}
        {canInteract && (
          <View style={styles.actionButtons}>
            <View style={styles.leftActions}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => handleToggleLike(item.id, item.isLiked || false)}
              >
                <Ionicons 
                  name={item.isLiked ? "heart" : "heart-outline"} 
                  size={28} 
                  color={item.isLiked ? "#FF3B30" : "#FFF"} 
                />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => toggleCommentInput(item.id)}
              >
                <Ionicons name="chatbubble-outline" size={26} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="paper-plane-outline" size={26} color="#FFF" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={[styles.actionButton, styles.bookmarkButton]}
              onPress={() => handleToggleBookmark(item.id)}
            >
              <Ionicons 
                name={item.isBookmarked ? "bookmark" : "bookmark-outline"} 
                size={26} 
                color="#FFF" 
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Likes */}
        {canInteract && (
          <Text style={styles.likes}>{item.reactionCount || 0} likes</Text>
        )}

        {/* Caption */}
        {item.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
          </View>
        )}
        
        {/* Comments preview */}
        {canInteract && (
          <TouchableOpacity 
            style={styles.commentsPreview}
            onPress={() => handleViewPost(item.id)}
          >
            <Text style={styles.commentsPreviewText}>
              View all {item.commentCount || 0} comments
            </Text>
          </TouchableOpacity>
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
                <ActivityIndicator size="small" color="#0A84FF" />
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
                <Ionicons name="trophy-outline" size={18} color="#FFF" style={styles.attachedItemIcon} />
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
                <Ionicons name="flame" size={18} color="#FFF" style={styles.attachedItemIcon} />
                <View>
                  <Text style={styles.attachedItemTitle}>
                    Workout
                  </Text>
                  <Text style={styles.attachedItemDetails}>
                    View attached workout
                  </Text>
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
  ]);

  // Render footer for load more
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text style={styles.loadingText}>Loading more posts...</Text>
      </View>
    );
  }, [loadingMore]);

  // Render empty state
  const renderEmptyState = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#0A84FF" />
          <Text style={styles.emptyStateText}>Loading your feed...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={80} color="#333" />
        <Text style={styles.emptyStateTitle}>Your feed is empty</Text>
        <Text style={styles.emptyStateText}>
          Follow other users to see their posts here, or check out trending content in Explore.
        </Text>
        <TouchableOpacity 
          style={styles.exploreButton}
          onPress={() => router.push('/explore')}
        >
          <Text style={styles.exploreButtonText}>Explore</Text>
        </TouchableOpacity>
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
    <FlatList
      data={filteredPosts}
      renderItem={renderPost}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={posts.length === 0 ? styles.emptyContainer : styles.postsContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refreshFeed}
          colors={['#0A84FF']}
          tintColor="#0A84FF"
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
  );
};

const styles = StyleSheet.create({
  postsContainer: {
    paddingBottom: 70,
  },
  emptyContainer: {
    flex: 1,
  },
  postContainer: {
    marginBottom: 15,
    borderBottomColor: '#222',
    borderBottomWidth: 1,
    paddingBottom: 15,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomColor: '#222',
    borderBottomWidth: 0.5,
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
    color: '#999',
  },
  moreButton: {
    padding: 5,
  },
  postImage: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
    resizeMode: 'cover',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: -15,
  },
  leftActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginRight: 15,
  },
  bookmarkButton: {},
  likes: {
    fontWeight: '600',
    paddingHorizontal: 15,
    marginBottom: 5,
    color: '#FFF',
  },
  captionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 8,
  },
  caption: {
    flex: 1,
    color: '#FFF',
  },
  commentsPreview: {
    paddingHorizontal: 15,
    marginBottom: 5,
  },
  commentsPreviewText: {
    color: '#999',
    fontSize: 14,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopColor: '#222',
    borderTopWidth: 1,
    borderBottomColor: '#222',
    borderBottomWidth: 1,
    marginBottom: 10,
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
    height: 36,
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 15,
    fontSize: 14,
    color: '#FFF',
    backgroundColor: '#111',
  },
  postButton: {
    marginLeft: 10,
    paddingHorizontal: 12,
  },
  postButtonText: {
    color: '#0A84FF',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    color: '#666',
  },
  attachedItemContainer: {
    backgroundColor: '#111',
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderColor: '#222',
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
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 18,
  },
  attachedItemTitle: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  attachedItemDetails: {
    color: '#999',
    fontSize: 13,
    marginTop: 2,
  },
  loadingFooter: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    marginTop: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  exploreButton: {
    backgroundColor: '#0A84FF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
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
    color: '#999',
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