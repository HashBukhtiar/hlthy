import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet, Text, View, Image, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  TextInput, Modal, ActivityIndicator, Alert, Keyboard
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ShareModal from '@/components/ShareModal';
import ReportModal from '@/components/ReportModal';
import { sharePost } from '@/services/ShareService';
import { usePostsData, Post, Comment, Reply } from '@/hooks/usePostsData';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, limit, getDocs, getDoc, doc } from '@/features/infra/firestore';
import { db } from '@/firebaseConfig';
import { getOptimalImageUrl, deleteImageFromStorage, deleteMilestoneFromFirestore } from '@/utils/imageUtils';
import { useBlockEnforcement } from '@/utils/blockUtils';
import { useUnits } from '@/hooks/useUnits';
import { ACCENT_COLOR } from '@/constants/Colors';
import MentionTextInput from '@/components/MentionTextInput';
import MentionText from '@/components/MentionText';
import { MentionData } from '@/features/mentions/domain/Mention';
import { useSelfUnmention } from '@/features/mentions/ui/useSelfUnmention';
import { TagChip } from '@/components/TagChip';
import { navigateToTagFeed } from '@/features/explore/ui/useExplore';
import VideoPlayer from '@/components/VideoPlayer';

export default function ViewPost() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser, userProfile } = useAuth();
  const { canInteractWithUser, isUserBlocked } = useBlockEnforcement();
  const { promptSelfUnmention } = useSelfUnmention();
  const {
    getPostById,
    getPostComments,
    likePost,
    unlikePost,
    addComment,
    deletePost,
    deleteComment,
    updateComment,
    likeComment,
    unlikeComment,
    addReplyToComment,
    getCommentReplies,
    likeReply,
    unlikeReply,
    savePost,
    unsavePost,
  } = usePostsData();  
  const postId = params.id ? String(params.id) : '';
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortType, setSortType] = useState('Recency');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { getWeightUnit, getDistanceUnit } = useUnits();

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string, username: string, profileImageUrl?: string}[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyingToUsername, setReplyingToUsername] = useState<string | null>(null);
  const [commentMentions, setCommentMentions] = useState<MentionData[]>([]);
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  const [selectedCommentForAction, setSelectedCommentForAction] = useState<Comment | null>(null);
  const [commentActionModalVisible, setCommentActionModalVisible] = useState(false);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [editCommentMentions, setEditCommentMentions] = useState<MentionData[]>([]);
  const [editCommentModalVisible, setEditCommentModalVisible] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [selectedReplyForAction, setSelectedReplyForAction] = useState<{ reply: Reply; commentId: string } | null>(null);
  const [replyActionModalVisible, setReplyActionModalVisible] = useState(false);

  const filteredComments = useMemo(() => {
    return comments.filter(comment => {
      // Always show current user's own comments
      if (comment.authorId === currentUser?.uid) return true;
      
      // Filter out comments from blocked users
      return canInteractWithUser(comment.authorId, comment.authorBlockedUsers);
    });
  }, [comments, canInteractWithUser, currentUser?.uid]);

  const canInteractWithAuthor = useMemo(() => {
    if (!post || !post.authorId) return false;
    return canInteractWithUser(post.authorId, post.authorBlockedUsers);
  }, [post, canInteractWithUser]);

  // Double-tap handlers for liking
  const handlePostDoubleTap = () => {
    if (!post || !currentUser || !canInteractWithAuthor || isLiking) return;
    
    if (!post.isLiked) {
      handleLike();
    }
  };

  // Helper function to handle comment double-tap
  const handleCommentDoubleTap = (commentId: string) => {
    if (likingComments[commentId]) return;
    
    const comment = comments.find(c => c.id === commentId);
    if (!comment || !currentUser) return;
    
    if (!canInteractWithUser(comment.authorId, comment.authorBlockedUsers)) return;
    
    if (!comment.isLiked) {
      handleCommentLike(commentId);
    }
  };

  // Helper function to handle reply double-tap
  const handleReplyDoubleTap = (commentId: string, replyId: string) => {
    const replyKey = `${commentId}-${replyId}`;
    if (likingReplies[replyKey]) return;
    
    const comment = comments.find(c => c.id === commentId);
    const reply = comment?.replies?.find(r => r.id === replyId);
    if (!reply || !currentUser) return;
    
    if (!canInteractWithUser(reply.authorId, reply.authorBlockedUsers)) return;
    
    if (!reply.isLiked) {
      handleReplyLike(commentId, replyId);
    }
  };

  // Double-tap logic without hooks for comments/replies
  const postTapTimers = useRef<Record<string, number>>({});
  const commentTapTimers = useRef<Record<string, number>>({});
  const replyTapTimers = useRef<Record<string, number>>({});
  const likingInProgress = useRef<Record<string, boolean>>({});

  const createDoubleTapHandler = (onDoubleTap: () => void, id: string, type: 'post' | 'comment' | 'reply' = 'comment') => {
    let timers;
    if (type === 'post') {
      timers = postTapTimers.current;
    } else if (type === 'reply') {
      timers = replyTapTimers.current;
    } else {
      timers = commentTapTimers.current;
    }
    
    return () => {
      // Prevent multiple rapid taps
      if (likingInProgress.current[id]) {
        console.log('Like operation already in progress for', id);
        return;
      }

      const now = Date.now();
      const lastTap = timers[id];
      
      if (lastTap && now - lastTap < 300) {
        // Double tap detected
        delete timers[id];
        try {
          // Haptic feedback
          import('expo-haptics').then(({ impactAsync, ImpactFeedbackStyle }) => {
            impactAsync?.(ImpactFeedbackStyle.Light);
          }).catch(() => {});
          
          // Set in progress flag
          likingInProgress.current[id] = true;
          
          onDoubleTap();
          
          // Clear in progress flag after a delay
          setTimeout(() => {
            delete likingInProgress.current[id];
          }, 1000);
        } catch (error) {
          console.error('Error in double tap handler:', error);
          delete likingInProgress.current[id];
        }
      } else {
        // Single tap - store timestamp
        timers[id] = now;
        
        // Clear after delay to reset for next potential double tap
        setTimeout(() => {
          if (timers[id] === now) {
            delete timers[id];
          }
        }, 300);
      }
    };
  };

  // Create post double-tap handler
  const postDoubleTapHandler = {
    onPress: createDoubleTapHandler(handlePostDoubleTap, 'post', 'post')
  };
  
  // Fetch post and comments
  useEffect(() => {
    const fetchPostData = async () => {
      if (!postId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Fetch post
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

        // Fetch comments
        const fetchedComments = await getPostComments(postId);

        // For each comment, fetch the author's thumbnail
        const commentsWithThumbnails = await Promise.all(
          fetchedComments.map(async (comment) => {
            if (comment.authorId) {
              const userDoc = await getDoc(doc(db, 'users', comment.authorId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                comment.authorProfileThumbnailUrl = userData.profileThumbnailUrl || '';
                comment.authorBlockedUsers = userData.blockedUsers || [];
              }
            }
            // For each reply, fetch the author's thumbnail and blocked users
            if (comment.replies && comment.replies.length > 0) {
              comment.replies = await Promise.all(
                comment.replies.map(async (reply) => {
                  if (reply.authorId) {
                    const replyUserDoc = await getDoc(doc(db, 'users', reply.authorId));
                    if (replyUserDoc.exists()) {
                      const replyUserData = replyUserDoc.data();
                      reply.authorProfileThumbnailUrl = replyUserData.profileThumbnailUrl || '';
                      reply.authorBlockedUsers = replyUserData.blockedUsers || [];
                    }
                  }
                  return reply;
                })
              );
            }
            return comment;
          })
        );

        setComments(commentsWithThumbnails);
      } catch (error) {
        console.error("Error fetching post/comments:", error);
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
        where('username', '<=', searchText.toLowerCase() + '\uf8ff'),
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
  
  const handleAddComment = async () => {
    if (!post || !currentUser || !commentText.trim() || isSubmitting) return;
    
    // Check if we can interact with the post author
    if (!canInteractWithAuthor) {
      Alert.alert("Cannot Comment", "You cannot interact with this user.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      if (replyingToCommentId) {
        // Handle reply - extract the actual reply text without the @username prefix
        // Use the stored username for precise removal instead of regex pattern matching
        const expectedPrefix = `@${replyingToUsername} `;
        const replyTextWithoutPrefix = commentText.startsWith(expectedPrefix) 
          ? commentText.slice(expectedPrefix.length).trim()
          : commentText.trim(); // Fallback if prefix doesn't match exactly
        
        if (!replyTextWithoutPrefix) return;
        
        const newReply = await addReplyToComment(post.id, replyingToCommentId, replyTextWithoutPrefix, commentMentions);
        
        // Update the comment with the new reply
        setComments(prevComments => 
          prevComments.map(comment => 
            comment.id === replyingToCommentId 
              ? { 
                  ...comment, 
                  replies: [...(comment.replies || []), newReply],
                  replyCount: (comment.replyCount || 0) + 1
                }
              : comment
          )
        );
        
        // Automatically expand the comment to show the new reply
        setExpandedComments(prev => ({ ...prev, [replyingToCommentId]: true }));
        
        // Clear reply mode
        setReplyingToCommentId(null);
        setReplyingToUsername(null);
      } else {
        // Handle regular comment
        const newComment = await addComment(post.id, commentText.trim(), commentMentions);
        setComments([{ ...newComment, replies: [] }, ...comments]);
        setPost(prevPost => prevPost ? {...prevPost, commentCount: (prevPost.commentCount || 0) + 1} : null);
      }
      
      setCommentText('');
      setCommentMentions([]);
      Keyboard.dismiss();
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
      
      // Reset expanded state
      setExpandedComments({});
      
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
  
  const [likingComments, setLikingComments] = useState<Record<string, boolean>>({});
  const [likingReplies, setLikingReplies] = useState<Record<string, boolean>>({});

  const handleCommentLike = async (commentId: string) => {
    if (!post || !currentUser || likingComments[commentId]) return;

    const commentIndex = comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) return;

    const comment = comments[commentIndex];
    
    // Check if we can interact with the comment author
    if (!canInteractWithUser(comment.authorId, comment.authorBlockedUsers)) {
      Alert.alert("Cannot Like", "You cannot interact with this user.");
      return;
    }

    setLikingComments(prev => ({ ...prev, [commentId]: true }));
    
    const originalComments = [...comments];
    const currentlyLiked = comment.isLiked;

    // Optimistic UI Update
    const updatedComments = [...comments];
    updatedComments[commentIndex] = {
      ...comment,
      isLiked: !currentlyLiked,
      likes: currentlyLiked ? Math.max(0, (comment.likes || 0) - 1) : (comment.likes || 0) + 1,
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
      // Revert optimistic update
      setComments(originalComments);
      Alert.alert("Error", "Could not update like status. Please try again.");
    } finally {
      setLikingComments(prev => {
        const newState = { ...prev };
        delete newState[commentId];
        return newState;
      });
    }
  };
  
  const handleToggleReplyInput = (commentId: string, username: string) => {
    if (replyingToCommentId === commentId) {
      // Cancel reply mode
      setReplyingToCommentId(null);
      setReplyingToUsername(null);
      setCommentText('');
      setCommentMentions([]);
    } else {
      // Enter reply mode
      setReplyingToCommentId(commentId);
      setReplyingToUsername(username);
      setCommentText(`@${username} `);
    }
  };

  // Custom text change handler to preserve @username prefix when replying
  const handleCommentTextChange = (text: string) => {
    if (replyingToCommentId && replyingToUsername) {
      const expectedPrefix = `@${replyingToUsername} `;
      // If user tries to delete the @username prefix, restore it
      if (!text.startsWith(expectedPrefix)) {
        setCommentText(expectedPrefix);
        return;
      }
    }
    setCommentText(text);
  };

  const handleLoadReplies = async (commentId: string) => {
    if (!post) return;
    
    // If already expanded, collapse it
    if (expandedComments[commentId]) {
      setExpandedComments(prev => ({ ...prev, [commentId]: false }));
      return;
    }
    
    // If not loaded yet, load the replies
    const comment = comments.find(c => c.id === commentId);
    if (!comment?.replies || comment.replies.length === 0) {
      setLoadingReplies(prev => ({ ...prev, [commentId]: true }));
      try {
        const fetchedReplies = await getCommentReplies(post.id, commentId);
        setComments(prevComments => prevComments.map(c => 
          c.id === commentId ? { ...c, replies: fetchedReplies } : c
        ));
      } catch (error) {
        console.error("Error loading replies:", error);
        Alert.alert("Error", "Could not load replies.");
        setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
        return;
      } finally {
        setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
      }
    }
    
    // Expand the comment to show replies
    setExpandedComments(prev => ({ ...prev, [commentId]: true }));
  };

  const handleReplyLike = async (commentId: string, replyId: string) => {
    if (!post || !currentUser) return;

    const replyKey = `${commentId}-${replyId}`;
    if (likingReplies[replyKey]) return;

    const commentIndex = comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) return;

    const originalComments = [...comments];
    const comment = comments[commentIndex];
    const replyIndex = comment.replies?.findIndex(r => r.id === replyId);

    if (replyIndex === undefined || replyIndex === -1 || !comment.replies) return;

    const reply = comment.replies[replyIndex];
    
    // Check if we can interact with the reply author
    if (!canInteractWithUser(reply.authorId, reply.authorBlockedUsers)) {
      Alert.alert("Cannot Like", "You cannot interact with this user.");
      return;
    }

    setLikingReplies(prev => ({ ...prev, [replyKey]: true }));

    const currentlyLiked = reply.isLiked;

    // Optimistic UI Update
    const updatedReplies = [...comment.replies];
    updatedReplies[replyIndex] = {
      ...reply,
      isLiked: !currentlyLiked,
      likes: currentlyLiked ? Math.max(0, (reply.likes || 0) - 1) : (reply.likes || 0) + 1,
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
      // Revert optimistic update
      setComments(originalComments);
      Alert.alert("Error", "Could not update reply like status.");
    } finally {
      setLikingReplies(prev => {
        const newState = { ...prev };
        delete newState[replyKey];
        return newState;
      });
    }
  };

  const renderCommentItem = (comment: Comment) => {
    const canInteractWithComment = canInteractWithUser(comment.authorId, comment.authorBlockedUsers);
    const hasReplies = comment.replyCount > 0;
    const isExpanded = expandedComments[comment.id];
    const isLoadingReplies = loadingReplies[comment.id];
    
    return (
      <View key={comment.id}>
        <TouchableOpacity 
          onLongPress={canInteractWithComment ? () => handleLongPressComment(comment) : undefined}
          onPress={canInteractWithComment ? createDoubleTapHandler(() => handleCommentDoubleTap(comment.id), comment.id, 'comment') : undefined}
          delayLongPress={500}
          activeOpacity={0.7}
        >
          <View style={styles.commentItem}>
            <View style={styles.commentLeftSection}>
              <TouchableOpacity 
                onPress={canInteractWithComment ? () => navigateToProfile(comment.authorId) : undefined}
              >
                <Image
                  source={{ uri: getOptimalImageUrl(comment.authorProfileThumbnailUrl, comment.authorProfileImageUrl) || 'https://via.placeholder.com/150' }}
                  style={styles.commentProfilePic}
                  onError={() => {
                    console.warn('Comment profile image failed to load');
                  }}
                />
              </TouchableOpacity>
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUsername}>{comment.authorUsername}</Text>
                  <Text style={styles.commentTimestamp}>
                    {formatDate(comment.createdAt)}{comment.editedAt ? ' · edited' : ''}
                  </Text>
                </View>
                <MentionText text={comment.text} mentions={comment.mentions} style={styles.commentText} />
                {canInteractWithComment && (
                  <View style={styles.commentActions}>
                    <TouchableOpacity onPress={() => handleToggleReplyInput(comment.id, comment.authorUsername)} style={styles.replyButton}>
                      <Text style={styles.replyButtonText}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            {canInteractWithComment && (
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
            )}
          </View>
        </TouchableOpacity>
        
        {/* View Replies Button */}
        {hasReplies && (
          <TouchableOpacity 
            style={styles.viewRepliesButton}
            onPress={() => handleLoadReplies(comment.id)}
            disabled={isLoadingReplies}
          >
            {isLoadingReplies ? (
              <ActivityIndicator size="small" color="#0A84FF" />
            ) : (
              <Text style={styles.viewRepliesText}>
                {isExpanded ? 'Hide replies' : `View replies (${comment.replyCount})`}
              </Text>
            )}
          </TouchableOpacity>
        )}
        
        {/* Replies Container - only show if expanded */}
        {isExpanded && comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies
              .filter(reply => 
                reply.authorId === currentUser?.uid || 
                canInteractWithUser(reply.authorId, reply.authorBlockedUsers)
              )
              .map(reply => renderReplyItem(reply, comment.id))
            }
          </View>
        )}
      </View>
    );
  };

  const handleLongPressComment = (comment: Comment) => {
    setSelectedCommentForAction(comment);
    setCommentActionModalVisible(true);
  };

  const handleLongPressReply = (reply: Reply, commentId: string) => {
    setSelectedReplyForAction({ reply, commentId });
    setReplyActionModalVisible(true);
  };

  const handleEditComment = () => {
    if (!selectedCommentForAction) return;
    setCommentActionModalVisible(false);
    setEditingComment(selectedCommentForAction);
    setEditCommentText(selectedCommentForAction.text);
    setEditCommentMentions(selectedCommentForAction.mentions || []);
    setSelectedCommentForAction(null);
    setEditCommentModalVisible(true);
  };

  const handleSubmitEditComment = async () => {
    if (!editingComment || !post || !editCommentText.trim() || isSubmittingEdit) return;
    setIsSubmittingEdit(true);
    try {
      await updateComment(post.id, editingComment.id, editCommentText.trim(), editCommentMentions);
      setComments(prev =>
        prev.map(c =>
          c.id === editingComment.id
            ? { ...c, text: editCommentText.trim(), mentions: editCommentMentions, editedAt: undefined }
            : c
        )
      );
      setEditCommentModalVisible(false);
      setEditingComment(null);
    } catch (error) {
      console.error("Error editing comment:", error);
      Alert.alert("Error", "Could not edit comment. Please try again.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteComment = () => {
    if (!selectedCommentForAction || !post) return;
    const commentToDelete = selectedCommentForAction;
    setCommentActionModalVisible(false);
    setSelectedCommentForAction(null);
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteComment(post.id, commentToDelete.id);
              setComments(prev => prev.filter(c => c.id !== commentToDelete.id));
              setPost(prev =>
                prev ? { ...prev, commentCount: Math.max(0, (prev.commentCount || 0) - 1) } : null
              );
            } catch (error) {
              console.error("Error deleting comment:", error);
              Alert.alert("Error", "Could not delete comment. Please try again.");
            }
          },
        },
      ]
    );
  };

  const handleReportComment = () => {
    if (!selectedCommentForAction) return;
    // Placeholder for report functionality
    console.log("Report comment:", selectedCommentForAction.id);
    Alert.alert("Report Comment", `Reporting comment by ${selectedCommentForAction.authorUsername}.`);
    setCommentActionModalVisible(false);
    setSelectedCommentForAction(null);
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

  const handleRemoveCommentMention = async () => {
    if (!selectedCommentForAction || !post || !currentUser) return;
    const authorMention = selectedCommentForAction.mentions?.find(m => m.userId === currentUser.uid);
    if (!authorMention) return;

    setCommentActionModalVisible(false);
    await promptSelfUnmention(
      {
        context: 'comment',
        postId: post.id,
        commentId: selectedCommentForAction.id,
      },
      selectedCommentForAction.authorUsername,
      selectedCommentForAction.authorId,
      () => {
        // Remove mention from local state
        setComments(prev =>
          prev.map(c =>
            c.id === selectedCommentForAction.id
              ? {
                  ...c,
                  mentions: c.mentions?.filter(m => m.userId !== currentUser.uid) || [],
                }
              : c
          )
        );
        setSelectedCommentForAction(null);
      }
    );
  };

  const handleRemoveReplyMention = async () => {
    if (!selectedReplyForAction || !post || !currentUser) return;
    const { reply, commentId } = selectedReplyForAction;
    const authorMention = reply.mentions?.find(m => m.userId === currentUser.uid);
    if (!authorMention) return;

    setReplyActionModalVisible(false);
    await promptSelfUnmention(
      {
        context: 'reply',
        postId: post.id,
        commentId,
        replyId: reply.id,
      },
      reply.authorUsername,
      reply.authorId,
      () => {
        // Remove mention from local state
        setComments(prev =>
          prev.map(c =>
            c.id === commentId
              ? {
                  ...c,
                  replies: c.replies?.map(r =>
                    r.id === reply.id
                      ? {
                          ...r,
                          mentions: r.mentions?.filter(m => m.userId !== currentUser.uid) || [],
                        }
                      : r
                  ) || [],
                }
              : c
          )
        );
        setSelectedReplyForAction(null);
      }
    );
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

  const renderReplyItem = (reply: Reply, commentId: string) => {
    const uri = getOptimalImageUrl(
      reply.authorProfileThumbnailUrl,
      reply.authorProfileImageUrl
    );

    const canInteractWithReply = canInteractWithUser(reply.authorId, reply.authorBlockedUsers);

    return (
      <TouchableOpacity
        key={reply.id}
        onPress={canInteractWithReply ? createDoubleTapHandler(() => handleReplyDoubleTap(commentId, reply.id), `${commentId}-${reply.id}`, 'reply') : undefined}
        onLongPress={canInteractWithReply ? () => handleLongPressReply(reply, commentId) : undefined}
        activeOpacity={0.7}
        style={styles.replyItem}
      >
        <View style={styles.commentLeftSection}>
          <Image
            source={{ uri }}
            style={styles.replyProfilePic}
            onError={() => {
              console.warn('Reply profile image failed to load:', uri);
            }}
          />
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentUsername}>{reply.authorUsername}</Text>
              <Text style={styles.commentTimestamp}>{formatDate(reply.createdAt)}</Text>
            </View>
            <MentionText text={reply.text} mentions={reply.mentions} style={styles.commentText} />
            {/* Reply Actions (e.g., like for reply) can go here */}
          </View>
        </View>
        {canInteractWithReply && (
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
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#000' }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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
            <Image
              source={{ uri: getOptimalImageUrl(post.authorProfileThumbnailUrl, post.authorProfileImageUrl) || 'https://via.placeholder.com/150' }}
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
            
            {filteredComments.length === 0 && (
              <Text style={{ color: '#999', textAlign: 'center', marginTop: 20, marginBottom: 20 }}>
                {canInteractWithAuthor ? "No comments yet. Be the first to comment!" : "Comments are not available."}
              </Text>
            )}
            
            {filteredComments.map(comment => renderCommentItem(comment))}
          </View>
        </ScrollView>

        {canInteractWithAuthor && (
          <View style={[styles.commentInputContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            {replyingToCommentId && (
              <View style={styles.replyIndicator}>
                <Text style={styles.replyIndicatorText}>
                  Replying to @{replyingToUsername}
                </Text>
                <TouchableOpacity onPress={() => {
                  setReplyingToCommentId(null);
                  setReplyingToUsername(null);
                  setCommentText('');
                  setCommentMentions([]);
                }}>
                  <Ionicons name="close" size={16} color="#999" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.inputRow}>
              <Image
                source={{ uri: getOptimalImageUrl(userProfile?.profileThumbnailUrl, userProfile?.profileImageUrl) || 'https://via.placeholder.com/150' }}
                style={styles.commentInputProfilePic}
              />
              <MentionTextInput
                containerStyle={{ flex: 1 }}
                style={styles.commentInput}
                placeholder={replyingToCommentId ? `Reply to @${replyingToUsername}...` : "Add a comment..."}
                placeholderTextColor="#666"
                value={commentText}
                onChangeText={handleCommentTextChange}
                mentions={commentMentions}
                onMentionsChange={setCommentMentions}
                autoCorrect={true}
                spellCheck={true}
                multiline={true}
                maxLength={500}
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
                    {replyingToCommentId ? 'Reply' : 'Post'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

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
                  <>
                    <TouchableOpacity
                      style={styles.commentActionItem}
                      onPress={handleReportComment}
                    >
                      <Ionicons name="flag-outline" size={22} color="#FF9500" style={styles.commentActionIcon} />
                      <Text style={[styles.commentActionText, { color: '#FF9500' }]}>Report Comment</Text>
                    </TouchableOpacity>
                    {selectedCommentForAction.mentions?.some(m => m.userId === currentUser?.uid) && (
                      <TouchableOpacity
                        style={styles.commentActionItem}
                        onPress={handleRemoveCommentMention}
                      >
                        <Ionicons name="close-circle-outline" size={22} color="#999" style={styles.commentActionIcon} />
                        <Text style={[styles.commentActionText, { color: '#999' }]}>Remove my mention</Text>
                      </TouchableOpacity>
                    )}
                  </>
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

        {/* Edit Comment Modal */}
        {editingComment && (
          <Modal
            animationType="slide"
            transparent={true}
            visible={editCommentModalVisible}
            onRequestClose={() => {
              setEditCommentModalVisible(false);
              setEditingComment(null);
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => {
                  setEditCommentModalVisible(false);
                  setEditingComment(null);
                }}
              >
                <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                  <View style={[styles.commentActionModalView, { padding: 16 }]}>
                    <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16, marginBottom: 12 }}>
                      Edit Comment
                    </Text>
                    <MentionTextInput
                      value={editCommentText}
                      onChangeText={setEditCommentText}
                      mentions={editCommentMentions}
                      onMentionsChange={setEditCommentMentions}
                      multiline
                      placeholder="Edit your comment..."
                      placeholderTextColor="#666"
                      style={{ color: '#fff', minHeight: 60, maxHeight: 120, fontSize: 14 }}
                      containerStyle={{ backgroundColor: '#2a2a2a', borderRadius: 10, padding: 10, marginBottom: 12 }}
                    />
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                      <TouchableOpacity
                        onPress={() => { setEditCommentModalVisible(false); setEditingComment(null); }}
                        style={{ paddingVertical: 8, paddingHorizontal: 16 }}
                      >
                        <Text style={{ color: '#999', fontSize: 15 }}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSubmitEditComment}
                        disabled={!editCommentText.trim() || isSubmittingEdit}
                        style={{
                          backgroundColor: ACCENT_COLOR,
                          paddingVertical: 8,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          opacity: (!editCommentText.trim() || isSubmittingEdit) ? 0.4 : 1,
                        }}
                      >
                        {isSubmittingEdit
                          ? <ActivityIndicator size="small" color="#fff" />
                          : <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Save</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </Modal>
        )}

        {/* Reply Action Modal */}
        {selectedReplyForAction && (
          <Modal
            animationType="slide"
            transparent={true}
            visible={replyActionModalVisible}
            onRequestClose={() => {
              setReplyActionModalVisible(false);
              setSelectedReplyForAction(null);
            }}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => {
                setReplyActionModalVisible(false);
                setSelectedReplyForAction(null);
              }}
            >
              <View style={styles.commentActionModalView}>
                {selectedReplyForAction.reply.authorId === currentUser?.uid ? (
                  <>
                    <TouchableOpacity
                      style={styles.commentActionItem}
                      onPress={() => {
                        Alert.alert("Edit Reply", "Edit functionality not yet implemented.");
                        setReplyActionModalVisible(false);
                        setSelectedReplyForAction(null);
                      }}
                    >
                      <Ionicons name="create-outline" size={22} color="#FFF" style={styles.commentActionIcon} />
                      <Text style={styles.commentActionText}>Edit Reply</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.commentActionItem}
                      onPress={() => {
                        Alert.alert("Delete Reply", "Delete functionality not yet implemented.");
                        setReplyActionModalVisible(false);
                        setSelectedReplyForAction(null);
                      }}
                    >
                      <Ionicons name="trash-outline" size={22} color="#FF3B30" style={styles.commentActionIcon} />
                      <Text style={[styles.commentActionText, { color: '#FF3B30' }]}>Delete Reply</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.commentActionItem}
                      onPress={() => {
                        Alert.alert("Report Reply", "Report functionality not yet implemented.");
                        setReplyActionModalVisible(false);
                        setSelectedReplyForAction(null);
                      }}
                    >
                      <Ionicons name="flag-outline" size={22} color="#FF9500" style={styles.commentActionIcon} />
                      <Text style={[styles.commentActionText, { color: '#FF9500' }]}>Report Reply</Text>
                    </TouchableOpacity>
                    {selectedReplyForAction.reply.mentions?.some(m => m.userId === currentUser?.uid) && (
                      <TouchableOpacity
                        style={styles.commentActionItem}
                        onPress={handleRemoveReplyMention}
                      >
                        <Ionicons name="close-circle-outline" size={22} color="#999" style={styles.commentActionIcon} />
                        <Text style={[styles.commentActionText, { color: '#999' }]}>Remove my mention</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
                <TouchableOpacity
                  style={[styles.commentActionItem, { borderBottomWidth: 0 }]}
                  onPress={() => {
                    setReplyActionModalVisible(false);
                    setSelectedReplyForAction(null);
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
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopColor: '#222',
    borderTopWidth: 1,
    backgroundColor: '#000',
  },
  replyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 8,
  },
  replyIndicatorText: {
    color: '#0A84FF',
    fontSize: 12,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentInputProfilePic: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  commentInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 14,
    color: '#FFF',
    backgroundColor: '#111',
    textAlignVertical: 'center',
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