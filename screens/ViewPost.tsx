import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, Image,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Modal, ActivityIndicator, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Reanimated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ShareModal from '@/components/ShareModal';
import ReportModal from '@/components/ReportModal';
import { sharePost } from '@/services/ShareService';
import { usePostsData, peekCachedPost, Post } from '@/hooks/usePostsData';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, limit, getDocs, getDoc, doc } from '@/features/infra/firestore';
import { db } from '@/firebaseConfig';
import { getOptimalImageUrl, deleteImageFromStorage, deleteMilestoneFromFirestore } from '@/utils/imageUtils';
import { useBlockEnforcement } from '@/utils/blockUtils';
import { useUnits } from '@/hooks/useUnits';
import { ACCENT_COLOR } from '@/constants/Colors';
import MentionText from '@/components/MentionText';
import { useSelfUnmention } from '@/features/mentions/ui/useSelfUnmention';
import { TagChip } from '@/components/TagChip';
import { navigateToTagFeed } from '@/features/explore/ui/useExplore';
import VideoPlayer from '@/components/VideoPlayer';
import CommentsThread from '@/components/comments/CommentsThread';

export default function ViewPost() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { canInteractWithUser } = useBlockEnforcement();
  const { promptSelfUnmention } = useSelfUnmention();
  const {
    getPostById,
    likePost,
    unlikePost,
    deletePost,
    savePost,
    unsavePost,
  } = usePostsData();
  const postId = params.id ? String(params.id) : '';

  // Seed from the post cache when we arrived from a feed/grid — paints the post
  // instantly so the entrance transition lands on real content, not a spinner.
  const [post, setPost] = useState<Post | null>(() => peekCachedPost(postId));
  const [loading, setLoading] = useState(() => !peekCachedPost(postId));

  // "Settle" entrance: the first time a post is ready, the content eases in
  // (fade + a small rise/scale) instead of popping. Keyed by post id so the
  // background refresh's setPost doesn't replay it. Pairs with the route's
  // cross-fade so entering a post feels composed, not janky.
  const settle = useSharedValue(0);
  const settledForRef = useRef<string | null>(null);
  useEffect(() => {
    if (post?.id && settledForRef.current !== post.id) {
      settledForRef.current = post.id;
      settle.value = 0;
      settle.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
    }
  }, [post?.id, settle]);
  const settleStyle = useAnimatedStyle(() => ({
    opacity: settle.value,
    transform: [
      { translateY: (1 - settle.value) * 12 },
      { scale: 0.99 + settle.value * 0.01 },
    ],
  }));

  const { getWeightUnit } = useUnits();

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string, username: string, profileImageUrl?: string}[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const canInteractWithAuthor = post && post.authorId
    ? canInteractWithUser(post.authorId, post.authorBlockedUsers)
    : false;

  // Post double-tap to like
  const handlePostDoubleTap = () => {
    if (!post || !currentUser || !canInteractWithAuthor || isLiking) return;
    if (!post.isLiked) {
      handleLike();
    }
  };

  const postTapTimer = useRef<number | null>(null);
  const postLikeInProgress = useRef(false);
  const handlePostTap = () => {
    if (postLikeInProgress.current) return;
    const now = Date.now();
    if (postTapTimer.current && now - postTapTimer.current < 300) {
      postTapTimer.current = null;
      postLikeInProgress.current = true;
      import('expo-haptics').then(({ impactAsync, ImpactFeedbackStyle }) => {
        impactAsync?.(ImpactFeedbackStyle.Light);
      }).catch(() => {});
      handlePostDoubleTap();
      setTimeout(() => { postLikeInProgress.current = false; }, 1000);
    } else {
      postTapTimer.current = now;
      setTimeout(() => { if (postTapTimer.current === now) postTapTimer.current = null; }, 300);
    }
  };
  const postDoubleTapHandler = { onPress: handlePostTap };

  // Fetch the post. Comments are owned by <CommentsThread>.
  useEffect(() => {
    const fetchPostData = async () => {
      if (!postId) {
        setLoading(false);
        return;
      }
      // Only show the full-screen spinner on a cold open (deep link / notification).
      // When the post is already cached it's painted, so we refresh silently.
      if (!peekCachedPost(postId)) setLoading(true);
      try {
        const fetchedPost = await getPostById(postId);
        if (fetchedPost && fetchedPost.authorId) {
          const userDoc = await getDoc(doc(db, 'users', fetchedPost.authorId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            fetchedPost.authorProfileThumbnailUrl = userData.profileThumbnailUrl || '';
            fetchedPost.authorBlockedUsers = userData.blockedUsers || [];
          }
        }
        setPost(fetchedPost);
      } catch (error) {
        console.error("Error fetching post:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPostData();
  }, [postId]);

  const handleSharePost = () => {
    if (!currentUser) {
      Alert.alert("Please log in", "You need to be logged in to share posts.");
      return;
    }
    setShareModalVisible(true);
  };

  const formatMilestonePreview = (details: any): string => {
    if (!details) return '';

    if (details.type === 'weightLoss' || details.type === 'weightGain') {
      // Display the unit that was actually used when the milestone was created
      const unit = details.newWeightUnit || details.weightUnit || getWeightUnit();
      return `New Weight: ${details.newWeight} ${unit}`;
    }

    if (details.type === 'PR') {
      const exercise = details.exerciseName || 'Record';
      let preview = `${exercise}: `;

      // weight_reps
      if (details.value && details.reps) {
        // Display the unit that was actually used when the milestone was created
        const unit = details.weightUnit || getWeightUnit();
        return preview + `${details.value} ${unit} × ${details.reps} reps`;
      }

      // bodyweight_reps
      if (details.reps && !details.value) {
        return preview + `${details.reps} reps`;
      }

      // duration, duration_level, distance_time
      if (details.duration) {
        const d = details.duration;
        const h = Math.floor(d / 3600);
        const m = Math.floor((d % 3600) / 60);
        const s = d % 60;
        const time = [h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : '', (s > 0 || (!h && !m)) ? `${s}s` : ''].filter(Boolean).join(' ');

        // For distance_time, check if weightUnit represents distance unit
        if (details.value && details.weightUnit && (details.weightUnit === 'miles' || details.weightUnit === 'km')) {
          return preview + `${details.value} ${details.weightUnit} in ${time}`;
        }

        // For pure duration
        if (details.level) {
          return preview + `${time} (Level ${details.level})`;
        }

        return preview + time;
      }

      // distance only
      if (details.value && details.weightUnit && (details.weightUnit === 'miles' || details.weightUnit === 'km')) {
        return preview + `${details.value} ${details.weightUnit}`;
      }

      // fallback
      if (details.value) {
        const unit = details.weightUnit || getWeightUnit();
        return preview + `${details.value} ${unit}`;
      }

      return exercise;
    }

    return 'View Achievement';
  };

  const searchUsers = async () => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('username', '>=', searchText.toLowerCase()),
        where('username', '<=', searchText.toLowerCase() + ''),
        limit(20) // Fetch more to account for filtering
      );

      const querySnapshot = await getDocs(q);
      const users: {id: string, username: string, profileImageUrl?: string}[] = [];

      querySnapshot.forEach(doc => {
        const userData = doc.data();
        const userId = doc.id;

        // Skip current user and blocked users
        if (userId === currentUser?.uid) return;

        // Check if we can interact with this user
        if (canInteractWithUser(userId, userData.blockedUsers)) {
          users.push({
            id: userId,
            username: userData.username,
            profileImageUrl: userData.profileImageUrl,
          });
        }
      });

      // Limit final results
      setSearchResults(users.slice(0, 10));
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      searchUsers();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchText]);

  const sharePostWithUser = async (userId: string, username: string, profileImageUrl?: string) => {
    if (!currentUser || !post) return;

    try {
      await sharePost(
        currentUser,
        userId,
        username,
        profileImageUrl,
        undefined,
        {
          id: post.id,
          caption: post.caption,
          imageUrl: post.imageUrl,
          thumbnailUrl: post.thumbnailUrl,
          authorUsername: post.authorUsername
        }
      );

      setShareModalVisible(false);
      Alert.alert("Success", "Post shared successfully");
    } catch (error) {
      console.error("Error sharing post:", error);
      Alert.alert("Error", "Failed to share post. Please try again.");
    }
  };

  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (!post || !currentUser || isLiking) return;

    // Check if we can interact with the post author
    if (!canInteractWithAuthor) {
      Alert.alert("Cannot Like", "You cannot interact with this user.");
      return;
    }

    setIsLiking(true);
    try {
      if (post.isLiked) {
        await unlikePost(post.id);
        setPost({...post, isLiked: false, reactionCount: Math.max(0, post.reactionCount - 1)});
      } else {
        await likePost(post.id);
        setPost({...post, isLiked: true, reactionCount: post.reactionCount + 1});
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Show user-friendly error message
      Alert.alert("Error", "Failed to update like status. Please try again.");
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (!post || !currentUser) return;
    const wasBookmarked = post.isBookmarked;
    setPost(prev => prev ? { ...prev, isBookmarked: !wasBookmarked } : null);
    try {
      if (wasBookmarked) {
        await unsavePost(post.id);
      } else {
        await savePost(post.id);
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      setPost(prev => prev ? { ...prev, isBookmarked: wasBookmarked } : null);
      Alert.alert("Error", "Could not update bookmark. Please try again.");
    }
  };

  const handleDeletePost = async () => {
    if (!post || !currentUser) return;

    // Check if post has a milestone
    if (post.isMilestone && post.milestoneDetails) {
      Alert.alert(
        "Delete Post",
        "This post contains a milestone. What would you like to delete?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete Post Only",
            onPress: async () => {
              await performPostDeletion(false);
            }
          },
          {
            text: "Delete Both",
            style: "destructive",
            onPress: async () => {
              await performPostDeletion(true);
            }
          }
        ]
      );
    } else {
      Alert.alert(
        "Delete Post",
        "Are you sure you want to delete this post? This cannot be undone.",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              await performPostDeletion(false);
            }
          }
        ]
      );
    }
  };

  const performPostDeletion = async (deleteMilestone: boolean) => {
    if (!post || !currentUser) return;

    try {
      setMenuVisible(false);
      setLoading(true);

      let storageErrors: string[] = [];
      let milestoneErrors: string[] = [];

      // Delete images from storage first
      if (post.imageUrl) {
        try {
          await deleteImageFromStorage(post.imageUrl);
        } catch (storageError: any) {
          console.error("Error deleting images from storage:", storageError);
          storageErrors.push("Failed to delete images from storage");
          // Continue with post deletion even if image deletion fails
        }
      }

      // Delete milestone if requested and post has one
      if (deleteMilestone && post.isMilestone && post.milestoneDetails) {
        try {
          await deleteMilestoneFromFirestore(post.id);
        } catch (milestoneError: any) {
          console.error("Error deleting milestone:", milestoneError);
          milestoneErrors.push("Failed to delete milestone record");
          // Continue with post deletion even if milestone deletion fails
        }
      }

      // Delete the post document from Firestore
      await deletePost(post.id);

      // Show success message with any warnings
      const successMessage = deleteMilestone && post.isMilestone
        ? "Post and milestone deleted successfully"
        : "Post deleted successfully";

      const warnings = [...storageErrors, ...milestoneErrors];
      const fullMessage = warnings.length > 0
        ? `${successMessage}\n\nNote: ${warnings.join(', ')}`
        : successMessage;

      Alert.alert("Success", fullMessage, [
        { text: "OK", onPress: () => router.replace('/') }
      ]);

    } catch (error: any) {
      console.error("Error deleting post:", error);
      const errorMessage = error.message || "Could not delete post. Please try again.";
      Alert.alert("Error", errorMessage);
      setLoading(false);
    }
  };

  const handleRemovePostMention = async () => {
    if (!post || !currentUser) return;
    const authorMention = post.mentions?.find(m => m.userId === currentUser.uid);
    if (!authorMention) return;

    setMenuVisible(false);
    await promptSelfUnmention(
      {
        context: 'post_caption',
        postId: post.id,
      },
      post.authorUsername,
      post.authorId,
      () => {
        // Remove mention from local state
        setPost(prev =>
          prev
            ? {
                ...prev,
                mentions: prev.mentions?.filter(m => m.userId !== currentUser.uid) || [],
              }
            : null
        );
      }
    );
  };

  const navigateToLikers = () => {
    if (!post || !post.id) {
      console.warn("Cannot navigate to likers: post or post.id is missing.");
      return;
    }
    router.push({
      pathname: "/post-likers/[id]",
      params: { id: post.id },
    });
  };

  const navigateToWorkout = (workoutId: string) => {
    router.push(`/view-workout/${workoutId}`);
  };

  const navigateToMilestone = (milestoneId: string) => {
    router.push(`/view-milestone/${milestoneId}`);
  };

  const navigateToProfile = (userId: string) => {
    if (!userId) return;
    router.push(`/profile/${userId}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0A84FF" />
        <Text style={{ color: '#999', marginTop: 20 }}>Loading post...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Post not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Unknown date';

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      let relativeTimeString: string;

      const secondsInMinute = 60;
      const secondsInHour = secondsInMinute * 60;
      const secondsInDay = secondsInHour * 24;
      const secondsInMonth = secondsInDay * 30;
      const secondsInYear = secondsInDay * 365;

      if (diffInSeconds < 0) {
        relativeTimeString = 'Just now';
      } else if (diffInSeconds < secondsInMinute) {
        relativeTimeString = 'Just now';
      } else if (diffInSeconds < secondsInHour) {
        relativeTimeString = `${Math.floor(diffInSeconds / secondsInMinute)}min ago`;
      } else if (diffInSeconds < secondsInDay) {
        relativeTimeString = `${Math.floor(diffInSeconds / secondsInHour)}h ago`;
      } else if (diffInSeconds < secondsInMonth) {
        relativeTimeString = `${Math.floor(diffInSeconds / secondsInDay)}d ago`;
      } else if (diffInSeconds < secondsInYear) {
        relativeTimeString = `${Math.floor(diffInSeconds / secondsInMonth)}m ago`;
      } else {
        relativeTimeString = `${Math.floor(diffInSeconds / secondsInYear)}y ago`;
      }

      const dateOptions: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
      };

      if (date.getFullYear() !== now.getFullYear()) {
        dateOptions.year = 'numeric';
      }

      const absoluteDateString = date.toLocaleDateString(undefined, dateOptions);

      return `${absoluteDateString} (${relativeTimeString})`;

    } catch (e) {
      console.error("Error formatting date:", e);
      return 'Unknown date';
    }
  };

  // The post content, rendered above the comment list inside <CommentsThread>.
  const postHeader = (
    <Reanimated.View style={settleStyle}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.userInfoContainer}
          onPress={() => navigateToProfile(post.authorId)}
        >
          <Image
            source={{ uri: getOptimalImageUrl(post.authorProfileThumbnailUrl, post.authorProfileImageUrl) }}
            style={styles.profilePic}
          />
          <View>
            <Text style={styles.username}>{post.authorUsername}</Text>
            <Text style={styles.location}>{formatDate(post.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        {post.authorId === currentUser?.uid && (
          <TouchableOpacity style={styles.moreButton} onPress={() => setMenuVisible(true)}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
        {post.authorId !== currentUser?.uid && currentUser && (
          <TouchableOpacity style={styles.moreButton} onPress={() => setMenuVisible(true)}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>

      {post.videoUrl ? (
        <VideoPlayer
          videoUrl={post.videoUrl}
          style={styles.postImage}
        />
      ) : post.imageUrl ? (
        <TouchableOpacity
          activeOpacity={1}
          {...postDoubleTapHandler}
        >
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
        </TouchableOpacity>
      ) : null}

      {canInteractWithAuthor && (
        <View style={styles.actionButtons}>
          <View style={styles.leftActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Ionicons
                name={post.isLiked ? "heart" : "heart-outline"}
                size={28}
                color={post.isLiked ? "#FF3B30" : "#FFF"}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={26} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleSharePost}>
              <Ionicons name="paper-plane-outline" size={26} color="#FFF" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.actionButton} onPress={handleBookmark}>
            <Ionicons
              name={post.isBookmarked ? "bookmark" : "bookmark-outline"}
              size={26}
              color="#FFF"
            />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity onPress={navigateToLikers}>
        <Text style={styles.likes}>{post.reactionCount || 0} likes</Text>
      </TouchableOpacity>

      <View style={styles.captionContainer}>
        <MentionText text={post.caption} mentions={post.mentions} style={styles.caption} />
      </View>

      {post.tags && post.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {post.tags.map((tag) => (
            <TagChip
              key={tag}
              tag={tag}
              onPress={() => navigateToTagFeed(tag)}
            />
          ))}
        </View>
      )}

      <Text style={styles.timestamp}>
        {formatDate(post.createdAt)}{post.editedAt ? ' · edited' : ''}
      </Text>

      {post.workoutId && (
        <TouchableOpacity
          style={styles.attachedWorkoutContainer}
          onPress={() => post.workoutId && navigateToWorkout(post.workoutId)}
        >
          <View style={styles.attachedWorkoutContent}>
            <View style={styles.attachedWorkoutInfo}>
              <Ionicons name="flame" size={18} color="#FFF" style={styles.workoutIcon} />
              <View>
                <Text style={styles.attachedWorkoutTitle}>
                  Workout
                </Text>
                <Text style={styles.attachedWorkoutDetails}>
                  View attached workout details
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </TouchableOpacity>
      )}

      {post.isMilestone && post.milestoneDetails && (
        <TouchableOpacity
          style={styles.attachedMilestoneContainer}
          onPress={() => navigateToMilestone(post.id)}
        >
          <View style={styles.attachedMilestoneContent}>
            <View style={styles.attachedMilestoneInfo}>
              <Ionicons name="trophy-outline" size={18} color="#FFF" style={styles.milestoneIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.attachedMilestoneTitle}>
                  {post.milestoneDetails.type === 'PR' ? 'Personal Record' :
                   post.milestoneDetails.type === 'weightLoss' ? 'Weight Loss' : 'Weight Gain'}
                </Text>
                <Text style={styles.attachedMilestoneDetails} numberOfLines={1}>
                  {formatMilestonePreview(post.milestoneDetails)}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </TouchableOpacity>
      )}
    </Reanimated.View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <CommentsThread
          post={post}
          canInteractWithAuthor={canInteractWithAuthor}
          variant="screen"
          listHeader={postHeader}
          bottomInset={insets.bottom}
          onCommentCountChange={(delta) =>
            setPost(prev => prev ? { ...prev, commentCount: Math.max(0, (prev.commentCount || 0) + delta) } : null)
          }
        />

        <Modal
          transparent={true}
          visible={menuVisible}
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          >
            <View style={styles.menuModalContent}>
              {/* Owner-only options */}
              {post?.authorId === currentUser?.uid ? (
                <>
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setMenuVisible(false);
                      router.push({ pathname: '/edit-post/[id]', params: { id: post.id } });
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color="#0A84FF" />
                    <Text style={[styles.menuItemText, { color: '#0A84FF' }]}>Edit Post</Text>
                  </TouchableOpacity>
                  {post?.isMilestone && post.milestoneDetails ? (
                    <>
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => performPostDeletion(false)}
                      >
                        <Ionicons name="document-outline" size={20} color="#FF9500" />
                        <Text style={[styles.menuItemText, { color: '#FF9500' }]}>Delete Post Only</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => performPostDeletion(true)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                        <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Delete Post & Milestone</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => performPostDeletion(false)}
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                      <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Delete Post</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                /* Non-owner options - Report */
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    setReportModalVisible(true);
                  }}
                >
                  <Ionicons name="flag-outline" size={20} color="#FF9500" />
                  <Text style={[styles.menuItemText, { color: '#FF9500' }]}>Report Post</Text>
                </TouchableOpacity>
              )}

              {/* Remove my mention option - for non-authors who are mentioned */}
              {post?.authorId !== currentUser?.uid && post?.mentions?.some(m => m.userId === currentUser?.uid) && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleRemovePostMention}
                >
                  <Ionicons name="close-circle-outline" size={20} color="#999" />
                  <Text style={[styles.menuItemText, { color: '#999' }]}>Remove my mention</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setMenuVisible(false)}
              >
                <Text style={styles.menuItemText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Report Post Modal */}
        {post.authorId !== currentUser?.uid && (
          <ReportModal
            visible={reportModalVisible}
            onClose={() => setReportModalVisible(false)}
            contentType="post"
            contentId={post.id}
            reportedUserId={post.authorId}
            contentSnapshot={{
              caption: post.caption,
              imageUrl: post.imageUrl,
              authorUsername: post.authorUsername,
            }}
          />
        )}

        {/* Share Post Modal */}
        <ShareModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          onShareWith={sharePostWithUser}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomColor: '#222',
    borderBottomWidth: 1,
  },
  headerBackButton: {
    padding: 4,
    marginRight: 4,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  location: {
    fontSize: 12,
    color: '#999',
  },
  moreButton: {
    padding: 5,
  },
  postImage: {
    width: '100%',
    height: 400,
    resizeMode: 'cover',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: -15
  },
  leftActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginRight: 15,
  },
  likes: {
    fontWeight: '600',
    paddingHorizontal: 15,
    marginBottom: 5,
    color: '#FFF',
    paddingVertical: 5,
  },
  captionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 5,
  },
  caption: {
    flex: 1,
    color: '#FFF',
    marginBottom: 5,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  attachedWorkoutContainer: {
    backgroundColor: '#111',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    borderColor: '#222',
    borderWidth: 1,
    padding: 12,
  },
  attachedWorkoutContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attachedWorkoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutIcon: {
    marginRight: 12,
    backgroundColor: ACCENT_COLOR,
    padding: 8,
    borderRadius: 18,
  },
  attachedWorkoutTitle: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  attachedWorkoutDetails: {
    color: '#999',
    fontSize: 13,
    marginTop: 2,
  },
  attachedMilestoneContainer: {
    backgroundColor: '#111',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    borderColor: '#222',
    borderWidth: 1,
    padding: 12,
  },
  attachedMilestoneContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attachedMilestoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  milestoneIcon: {
    marginRight: 12,
    backgroundColor: ACCENT_COLOR,
    padding: 8,
    borderRadius: 18,
  },
  attachedMilestoneTitle: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  attachedMilestoneDetails: {
    color: '#999',
    fontSize: 13,
    marginTop: 2,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuModalContent: {
    position: 'absolute',
    right: 15,
    top: 50,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    overflow: 'hidden',
    width: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuItemText: {
    color: '#FFF',
    fontSize: 16,
    marginLeft: 12,
  },
});
