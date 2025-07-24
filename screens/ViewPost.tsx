import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, Image, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  TextInput, Modal, ActivityIndicator, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ShareModal from '@/components/ShareModal';
import { sharePost } from '@/services/ShareService';
import { usePostsData, Post, Comment, Reply } from '@/hooks/usePostsData';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { deleteImageFromStorage, deleteMilestoneFromFirestore } from '@/utils/imageUtils';

export default function ViewPost() {
  const [menuVisible, setMenuVisible] = useState(false);
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser, userProfile } = useAuth();
  const {
    getPostById, 
    getPostComments, 
    likePost, 
    unlikePost, 
    addComment, 
    deletePost,
    likeComment,
    unlikeComment,
    addReplyToComment,
    getCommentReplies,
    likeReply,
    unlikeReply
  } = usePostsData();  
  const postId = params.id ? String(params.id) : '';
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortType, setSortType] = useState('Recency');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string, username: string, profileImageUrl?: string}[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});

  const [selectedCommentForAction, setSelectedCommentForAction] = useState<Comment | null>(null);
  const [commentActionModalVisible, setCommentActionModalVisible] = useState(false);
  
  // Fetch post and comments
  useEffect(() => {
    const fetchPostData = async () => {
      if (!postId) {
        console.error("No post ID provided");
        setLoading(false);
        return;
      }

      console.log("Fetching post with ID:", postId);
      
      try {
        setLoading(true);
        
        // Get post data
        const fetchedPost = await getPostById(postId);
        setPost(fetchedPost);
        
        // Get comments
        const fetchedComments = await getPostComments(postId);
        setComments(fetchedComments);
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
      return `New Weight: ${details.newWeight} ${details.newWeightUnit || 'lbs'}`;
    }
  
    if (details.type === 'PR') {
      const exercise = details.exerciseName || 'Record';
      let preview = `${exercise}: `;
  
      // weight_reps
      if (details.value && details.reps) {
        return preview + `${details.value} ${details.weightUnit || 'lbs'} × ${details.reps} reps`;
      }
      // bodyweight_reps
      if (details.reps) {
        return preview + `${details.reps} reps`;
      }
      // duration, duration_level, distance_time
      if (details.duration) {
        const d = details.duration;
        const h = Math.floor(d / 3600);
        const m = Math.floor((d % 3600) / 60);
        const s = d % 60;
        const time = [h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : '', (s > 0 || (!h && !m)) ? `${s}s` : ''].filter(Boolean).join(' ');
  
        if (details.value && details.weightUnit === 'miles') { // distance_time
          return preview + `${details.value} ${details.weightUnit} in ${time}`;
        }
        return preview + time; // duration
      }
      // distance
      if (details.value && details.weightUnit) {
        return preview + `${details.value} ${details.weightUnit}`;
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
        where('username', '<=', searchText.toLowerCase() + '\uf8ff'),
        limit(10)
      );

      const querySnapshot = await getDocs(q);
      const users: {id: string, username: string, profileImageUrl?: string}[] = [];
      querySnapshot.forEach(doc => {
        if (doc.id !== currentUser?.uid) {
          users.push({
            id: doc.id,
            username: doc.data().username,
            profileImageUrl: doc.data().profileImageUrl,
          });
        }
      });
      setSearchResults(users);
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
  
  const handleLike = async () => {
    if (!post || !currentUser) return;
    
    try {
      if (post.isLiked) {
        await unlikePost(post.id);
        setPost({...post, isLiked: false, reactionCount: post.reactionCount - 1});
      } else {
        await likePost(post.id);
        setPost({...post, isLiked: true, reactionCount: post.reactionCount + 1});
      }
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };
  
  const handleBookmark = async () => {
    // Implement bookmark functionality with Firebase
    if (!post || !currentUser) return;
    
    try {
      // For now, just toggle the UI state
      setPost({...post, isBookmarked: !post.isBookmarked});
      // TODO: Implement actual bookmark logic with Firebase
    } catch (error) {
      console.error("Error toggling bookmark:", error);
    }
  };
  
  const handleAddComment = async () => {
    if (!post || !currentUser || !commentText.trim() || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      const newComment = await addComment(post.id, commentText.trim());
      setComments([{ ...newComment, replies: [] }, ...comments]);
      setCommentText('');
      setPost(prevPost => prevPost ? {...prevPost, commentCount: (prevPost.commentCount || 0) + 1} : null);
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Could not add comment. Please try again.");
    } finally {
      setIsSubmitting(false);
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
  
  const handleRefresh = async () => {
    if (!postId) return;
    
    try {
      setRefreshing(true);
      
      // Refetch post and comments
      const refreshedPost = await getPostById(postId);
      setPost(refreshedPost);
      
      const refreshedComments = await getPostComments(postId);
      setComments(refreshedComments);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };
  
  const handleCommentLike = async (commentId: string) => {
    if (!post || !currentUser) return;

    const commentIndex = comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) return;

    const originalComments = [...comments];
    const comment = comments[commentIndex];
    const currentlyLiked = comment.isLiked;

    const updatedComments = [...comments];
    updatedComments[commentIndex] = {
      ...comment,
      isLiked: !currentlyLiked,
      likes: currentlyLiked ? (comment.likes || 0) - 1 : (comment.likes || 0) + 1,
    };
    setComments(updatedComments);

    try {
      if (currentlyLiked) {
        await unlikeComment(post.id, commentId);
      } else {
        await likeComment(post.id, commentId);
      }
    } catch (error) {
      console.error("Error toggling comment like:", error);
      setComments(originalComments);
      Alert.alert("Error", "Could not update like status. Please try again.");
    }
  };
  
  const handleToggleReplyInput = (commentId: string | null) => {
    if (replyingToCommentId === commentId) {
      setReplyingToCommentId(null);
      setReplyText('');
    } else {
      setReplyingToCommentId(commentId);
      setReplyText('');
    }
  };

  const handleLoadReplies = async (commentId: string) => {
    if (!post) return;
    setLoadingReplies(prev => ({ ...prev, [commentId]: true }));
    try {
      const fetchedReplies = await getCommentReplies(post.id, commentId);
      setComments(prevComments => prevComments.map(c => 
        c.id === commentId ? { ...c, replies: fetchedReplies } : c
      ));
    } catch (error) {
      console.error("Error loading replies:", error);
      Alert.alert("Error", "Could not load replies.");
    } finally {
      setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const handleAddReply = async (parentCommentId: string) => {
    if (!post || !currentUser || !replyText.trim() || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      const newReply = await addReplyToComment(post.id, parentCommentId, replyText.trim());
      setComments(prevComments => prevComments.map(c => {
        if (c.id === parentCommentId) {
          return {
            ...c,
            replies: [newReply, ...(c.replies || [])],
            replyCount: (c.replyCount || 0) + 1,
          };
        }
        return c;
      }));
      setReplyText('');
      setReplyingToCommentId(null);
    } catch (error) {
      console.error("Error adding reply:", error);
      Alert.alert("Error", "Could not add reply. Please try again.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleReplyLike = async (commentId: string, replyId: string) => {
    if (!post || !currentUser) return;

    const commentIndex = comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) return;

    const originalComments = [...comments];
    const comment = comments[commentIndex];
    const replyIndex = comment.replies?.findIndex(r => r.id === replyId);

    if (replyIndex === undefined || replyIndex === -1 || !comment.replies) return;

    const reply = comment.replies[replyIndex];
    const currentlyLiked = reply.isLiked;

    // Optimistic UI Update
    const updatedReplies = [...comment.replies];
    updatedReplies[replyIndex] = {
      ...reply,
      isLiked: !currentlyLiked,
      likes: currentlyLiked ? (reply.likes || 0) - 1 : (reply.likes || 0) + 1,
    };
    const updatedComments = [...comments];
    updatedComments[commentIndex] = { ...comment, replies: updatedReplies };
    setComments(updatedComments);

    try {
      if (currentlyLiked) {
        await unlikeReply(post.id, commentId, replyId);
      } else {
        await likeReply(post.id, commentId, replyId);
      }
    } catch (error) {
      console.error("Error toggling reply like:", error);
      setComments(originalComments);
      Alert.alert("Error", "Could not update reply like status.");
    }
  };

  const handleLongPressComment = (comment: Comment) => {
    setSelectedCommentForAction(comment);
    setCommentActionModalVisible(true);
  };

  const handleEditComment = () => {
    if (!selectedCommentForAction) return;
    // Placeholder for edit functionality
    console.log("Edit comment:", selectedCommentForAction.id);
    Alert.alert("Edit Comment", `Editing comment: "${selectedCommentForAction.text.substring(0,30)}..."`);
    setCommentActionModalVisible(false);
    setSelectedCommentForAction(null);
  };

  const handleDeleteComment = () => {
    if (!selectedCommentForAction) return;
    // Placeholder for delete functionality
    console.log("Delete comment:", selectedCommentForAction.id);
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel", onPress: () => {} },
        { text: "Delete", style: "destructive", onPress: () => {
          // Actual deletion logic will go here
          // For now, just simulate by removing from local state (this is not persistent)
          setComments(prevComments => prevComments.filter(c => c.id !== selectedCommentForAction.id));
          // Update post's comment count if post is available
          if (post) {
            setPost(prevPost => prevPost ? {...prevPost, commentCount: Math.max(0, (prevPost.commentCount || 0) - 1)} : null);
          }
          Alert.alert("Comment Deleted", "The comment has been removed (locally).");
        }}
      ]
    );
    setCommentActionModalVisible(false);
    setSelectedCommentForAction(null);
  };

  const handleReportComment = () => {
    if (!selectedCommentForAction) return;
    // Placeholder for report functionality
    console.log("Report comment:", selectedCommentForAction.id);
    Alert.alert("Report Comment", `Reporting comment by ${selectedCommentForAction.authorUsername}.`);
    setCommentActionModalVisible(false);
    setSelectedCommentForAction(null);
  };

  const handleSort = (type: string) => {
    setSortType(type);
    setSortModalVisible(false);
    
    const sortedComments = [...comments];
    switch (type) {
      case 'Recency':
        setComments(sortedComments.sort((a, b) => 
          b.createdAt?.toDate?.() > a.createdAt?.toDate?.() ? 1 : -1
        ));
        break;
      case 'Popularity':
        setComments(sortedComments.sort((a, b) => (b.likes || 0) - (a.likes || 0)));
        break;
      case 'Relevance':
        // You might want to implement a more sophisticated relevance algorithm
        setComments(sortedComments);
        break;
      default:
        break;
    }
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
            onPress={() => router.back()}
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

  const renderReplyItem = (reply: Reply, commentId: string) => (
    <View key={reply.id} style={styles.replyItem}>
      <View style={styles.commentLeftSection}>
        <Image source={{ uri: reply.authorProfileImageUrl || 'https://via.placeholder.com/150' }} style={styles.replyProfilePic} />
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUsername}>{reply.authorUsername}</Text>
            <Text style={styles.commentTimestamp}>{formatDate(reply.createdAt)}</Text>
          </View>
          <Text style={styles.commentText}>{reply.text}</Text>
          {/* Reply Actions (e.g., like for reply) can go here */}
        </View>
      </View>
      <View style={styles.commentLikeContainer}>
        <TouchableOpacity 
          style={styles.commentLikeButton}
          onPress={() => handleReplyLike(commentId, reply.id)}
        >
          <Ionicons 
            name={reply.isLiked ? "heart" : "heart-outline"} 
            size={14} 
            color={reply.isLiked ? "#FF3B30" : "#999"}
          />
        </TouchableOpacity>
        <Text style={[
          styles.commentLikeCount,
          reply.isLiked && styles.commentLikedCount
        ]}>
          {reply.likes || 0}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      // You might need to add keyboardVerticalOffset if you have a custom fixed header
      // that's not accounted for by `insets.top`.
      // Example: keyboardVerticalOffset={Platform.OS === "ios" ? YOUR_HEADER_HEIGHT : 0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.userInfoContainer}
              onPress={() => navigateToProfile(post.authorId)}
            >
              <Image source={{ uri: post.authorProfileImageUrl || 'https://via.placeholder.com/150' }} style={styles.profilePic} />
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
          </View>

          {post.imageUrl && (
            <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
          )}

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

          <TouchableOpacity onPress={navigateToLikers}>
            <Text style={styles.likes}>{post.reactionCount || 0} likes</Text>
          </TouchableOpacity>

          <View style={styles.captionContainer}>
            <Text style={styles.caption}>{post.caption}</Text>
          </View>

          <Text style={styles.timestamp}>{formatDate(post.createdAt)}</Text>

          {post.workoutId && (
            <TouchableOpacity 
              style={styles.attachedWorkoutContainer}
              onPress={() => navigateToWorkout(post.workoutId)}
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

          <View style={styles.commentsSection}>
            <View style={styles.commentsHeaderContainer}>
              <View style={styles.commentsHeaderLeft}>
                <Text style={styles.commentsHeader}>Comments</Text>
                <Text style={styles.commentCount}>{post.commentCount || 0}</Text>
              </View>
              <TouchableOpacity 
                style={styles.sortButton}
                onPress={() => setSortModalVisible(true)}
              >
                <Text style={styles.sortButtonText}>{sortType}</Text>
                <Ionicons name="chevron-down" size={14} color="#999" />
              </TouchableOpacity>
            </View>
            
            {comments.length === 0 && (
              <Text style={{ color: '#999', textAlign: 'center', marginTop: 20, marginBottom: 20 }}>
                No comments yet. Be the first to comment!
              </Text>
            )}
            
            {comments.map(comment => (
              <View key={comment.id}>
                <TouchableOpacity 
                  onLongPress={() => handleLongPressComment(comment)}
                  delayLongPress={500}
                >
                  <View style={styles.commentItem}>
                    <View style={styles.commentLeftSection}>
                      <Image source={{ uri: comment.authorProfileImageUrl || 'https://via.placeholder.com/150' }} style={styles.commentProfilePic} />
                      <View style={styles.commentContent}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentUsername}>{comment.authorUsername}</Text>
                          <Text style={styles.commentTimestamp}>{formatDate(comment.createdAt)}</Text>
                        </View>
                        <Text style={styles.commentText}>{comment.text}</Text>
                        <View style={styles.commentActions}>
                          <TouchableOpacity onPress={() => handleToggleReplyInput(comment.id)} style={styles.replyButton}>
                            <Text style={styles.replyButtonText}>Reply</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                    <View style={styles.commentLikeContainer}>
                      <TouchableOpacity 
                        style={styles.commentLikeButton}
                        onPress={() => handleCommentLike(comment.id)}
                      >
                        <Ionicons 
                          name={comment.isLiked ? "heart" : "heart-outline"} 
                          size={14} 
                          color={comment.isLiked ? "#FF3B30" : "#999"}
                        />
                      </TouchableOpacity>
                      <Text style={[
                        styles.commentLikeCount,
                        comment.isLiked && styles.commentLikedCount
                      ]}>
                        {comment.likes || 0}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                {/* Reply Input Area */}
                {replyingToCommentId === comment.id && (
                  <View style={styles.replyInputContainer}>
                    <Image 
                      source={{ uri: userProfile?.profileImageUrl || 'https://via.placeholder.com/150' }} 
                      style={styles.replyInputProfilePic} 
                    />
                    <TextInput
                      style={styles.replyInput}
                      placeholder={`Replying to ${comment.authorUsername}...`}
                      placeholderTextColor="#666"
                      value={replyText}
                      onChangeText={setReplyText}
                      autoFocus={true}
                      autoCorrect={true}
                      spellCheck={true}
                    />
                    <TouchableOpacity 
                      style={[
                        styles.postReplyButton, 
                        (replyText.trim() === '' || isSubmittingReply) && styles.disabledButton
                      ]}
                      onPress={() => handleAddReply(comment.id)}
                      disabled={replyText.trim() === '' || isSubmittingReply}
                    >
                      {isSubmittingReply ? (
                        <ActivityIndicator size="small" color="#0A84FF" />
                      ) : (
                        <Text style={[
                          styles.postButtonText, 
                          replyText.trim() === '' && styles.disabledButtonText
                        ]}>
                          Post
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Display Replies */}
                {(comment.replyCount || 0) > 0 && !comment.replies?.length && !loadingReplies[comment.id] && (
                  <TouchableOpacity 
                    style={styles.viewRepliesButton} 
                    onPress={() => handleLoadReplies(comment.id)}
                  >
                    <Text style={styles.viewRepliesText}>
                      View {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                    </Text>
                  </TouchableOpacity>
                )}
                {loadingReplies[comment.id] && (
                  <ActivityIndicator size="small" color="#0A84FF" style={{alignSelf: 'flex-start', marginLeft: 50, marginVertical: 5}}/>
                )}

                {comment.replies && comment.replies.length > 0 && (
                  <View style={styles.repliesContainer}>
                    {comment.replies.map(reply => renderReplyItem(reply, comment.id))}
                    {(comment.replyCount || 0) > comment.replies.length && !loadingReplies[comment.id] && (
                      <TouchableOpacity 
                          style={styles.viewRepliesButton} 
                          onPress={() => handleLoadReplies(comment.id)} // Could be "load more" in future
                        >
                          <Text style={styles.viewRepliesText}>
                            View more replies
                          </Text>
                        </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.commentInputContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Image 
            source={{ uri: userProfile?.profileImageUrl || 'https://via.placeholder.com/150' }} 
            style={styles.commentInputProfilePic} 
          />
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor="#666"
            value={commentText}
            onChangeText={setCommentText}
            autoCorrect={true}
            spellCheck={true}
          />
          <TouchableOpacity 
            style={[
              styles.postButton, 
              (commentText.trim() === '' || isSubmitting) && styles.disabledButton
            ]}
            onPress={handleAddComment}
            disabled={commentText.trim() === '' || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#0A84FF" />
            ) : (
              <Text style={[
                styles.postButtonText, 
                commentText.trim() === '' && styles.disabledButtonText
              ]}>
                Post
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Modal
          animationType="slide"
          transparent={true}
          visible={sortModalVisible}
          onRequestClose={() => setSortModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSortModalVisible(false)}
          >
            <View style={styles.modalView}>
              <Text style={styles.modalTitle}>Sort Comments By</Text>
              {['Recency', 'Popularity', 'Relevance'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.sortOption,
                    sortType === type && styles.selectedSortOption
                  ]}
                  onPress={() => handleSort(type)}
                >
                  <Text style={[
                    styles.sortOptionText,
                    sortType === type && styles.selectedSortOptionText
                  ]}>
                    {type}
                  </Text>
                  {sortType === type && (
                    <Ionicons name="checkmark" size={18} color="#0A84FF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

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
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => setMenuVisible(false)}
              >
                <Text style={styles.menuItemText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Share Post Modal */}
        <ShareModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          onShareWith={sharePostWithUser}
        />
        {/* Comment Action Modal */}
        {selectedCommentForAction && (
          <Modal
            animationType="slide"
            transparent={true}
            visible={commentActionModalVisible}
            onRequestClose={() => {
              setCommentActionModalVisible(false);
              setSelectedCommentForAction(null);
            }}
          >
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => {
                setCommentActionModalVisible(false);
                setSelectedCommentForAction(null);
              }}
            >
              <View style={styles.commentActionModalView}>
                {selectedCommentForAction.authorId === currentUser?.uid ? (
                  <>
                    <TouchableOpacity
                      style={styles.commentActionItem}
                      onPress={handleEditComment}
                    >
                      <Ionicons name="create-outline" size={22} color="#FFF" style={styles.commentActionIcon} />
                      <Text style={styles.commentActionText}>Edit Comment</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.commentActionItem}
                      onPress={handleDeleteComment}
                    >
                      <Ionicons name="trash-outline" size={22} color="#FF3B30" style={styles.commentActionIcon} />
                      <Text style={[styles.commentActionText, { color: '#FF3B30' }]}>Delete Comment</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.commentActionItem}
                    onPress={handleReportComment}
                  >
                    <Ionicons name="flag-outline" size={22} color="#FF9500" style={styles.commentActionIcon} />
                    <Text style={[styles.commentActionText, { color: '#FF9500' }]}>Report Comment</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.commentActionItem, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    setCommentActionModalVisible(false);
                    setSelectedCommentForAction(null);
                  }}
                >
                  <Ionicons name="close-circle-outline" size={22} color="#999" style={styles.commentActionIcon} />
                  <Text style={[styles.commentActionText, { color: '#999' }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
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
    backgroundColor: '#ff2d55',
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
    backgroundColor: '#ff2d55',
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
  commentsSection: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopColor: '#222',
    borderTopWidth: 1,
  },
  commentsHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  commentsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentsHeader: {
    fontWeight: '600',
    fontSize: 16,
    color: '#FFF',
    marginRight: 8,
  },
  commentCount: {
    fontSize: 16,
    color: '#999'
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  sortButtonText: {
    color: '#999',
    fontSize: 12,
    marginRight: 4,
  },
  commentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  commentLeftSection: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
  },
  commentProfilePic: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    alignSelf: 'flex-start',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentUsername: {
    fontWeight: '600',
    color: '#FFF',
    marginRight: 8,
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  commentText: {
    color: '#FFF',
    marginVertical: 4,
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 5,
  },
  replyButton: {
    // Style for the reply button under a comment
  },
  replyButtonText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '500',
  },
  commentLikeContainer: {
    alignItems: 'center',
    paddingLeft: 5,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  commentLikeButton: {
    padding: 5,
  },
  commentLikeCount: {
    fontSize: 12,
    color: '#999',
  },
  commentLikedCount: {
    color: '#FF3B30',
  },
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginLeft: 40,
    backgroundColor: '#080808',
    borderRadius: 18,
    marginBottom: 10,
  },
  replyInputProfilePic: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  replyInput: {
    flex: 1,
    height: 30,
    fontSize: 13,
    color: '#FFF',
  },
  postReplyButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
  },
  repliesContainer: {
    marginLeft: 40,
    marginTop: 10,
    borderLeftColor: '#333',
    borderLeftWidth: 1,
    paddingLeft: 10,
  },
  replyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  replyProfilePic: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    alignSelf: 'flex-start',
  },
  viewRepliesButton: {
    marginLeft: 50,
    marginVertical: 8,
  },
  viewRepliesText: {
    color: '#0A84FF',
    fontSize: 13,
    fontWeight: '500',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopColor: '#222',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  selectedSortOption: {
    backgroundColor: 'rgba(10, 132, 255, 0.1)',
  },
  sortOptionText: {
    color: '#FFF',
    fontSize: 16,
  },
  selectedSortOptionText: {
    color: '#0A84FF',
    fontWeight: '500',
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
  shareModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  shareModalContent: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  shareModalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    marginVertical: 15,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#333',
    color: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  userItemImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  userItemText: {
    color: '#FFF',
    fontSize: 16,
  },
  emptyResultsText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
  commentActionModalView: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  commentActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomColor: '#3A3A3C',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  commentActionIcon: {
    marginRight: 15,
  },
  commentActionText: {
    color: '#FFF',
    fontSize: 17,
  },
});