import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet, Text, View, Image, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Keyboard, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useBlockEnforcement } from '@/utils/blockUtils';
import { usePostsData, Post, Comment, Reply } from '@/hooks/usePostsData';
import type { CommentCursor } from '@/hooks/usePostsData';
import { getOptimalImageUrl } from '@/utils/imageUtils';
import MentionTextInput from '@/components/MentionTextInput';
import MentionText from '@/components/MentionText';
import { MentionData } from '@/features/mentions/domain/Mention';
import { useSelfUnmention } from '@/features/mentions/ui/useSelfUnmention';
import { ACCENT_COLOR } from '@/constants/Colors';

// How many comments to fetch per page (initial load + each "load more").
const COMMENTS_PAGE_SIZE = 15;

// Client-side ordering of the currently-loaded comments. Recency matches the
// fetch order (newest first); the others reorder the loaded window.
function sortComments(list: Comment[], type: string): Comment[] {
  const sorted = [...list];
  switch (type) {
    case 'Popularity':
      return sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    case 'Recency':
      return sorted.sort((a, b) =>
        (b.createdAt?.toDate?.()?.getTime?.() ?? 0) - (a.createdAt?.toDate?.()?.getTime?.() ?? 0)
      );
    case 'Relevance':
    default:
      return sorted;
  }
}

function formatDate(timestamp: any): string {
  if (!timestamp) return 'Unknown date';
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    let rel: string;
    if (diff < 60) rel = 'Just now';
    else if (diff < 3600) rel = `${Math.floor(diff / 60)}min ago`;
    else if (diff < 86400) rel = `${Math.floor(diff / 3600)}h ago`;
    else if (diff < 2592000) rel = `${Math.floor(diff / 86400)}d ago`;
    else if (diff < 31536000) rel = `${Math.floor(diff / 2592000)}m ago`;
    else rel = `${Math.floor(diff / 31536000)}y ago`;
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (date.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
    return `${date.toLocaleDateString(undefined, opts)} (${rel})`;
  } catch {
    return 'Unknown date';
  }
}

export interface CommentsThreadProps {
  post: Post;
  canInteractWithAuthor: boolean;
  /** 'screen' shows the "Comments N" + sort row; 'sheet' shows only the sort control. */
  variant?: 'screen' | 'sheet';
  /** Rendered above the comment list (the screen passes the post content here). */
  listHeader?: React.ReactElement | null;
  /** Called when the loaded comment count changes so the parent can update its post. */
  onCommentCountChange?: (delta: number) => void;
  /** Bottom padding for the input bar (safe-area inset). */
  bottomInset?: number;
}

/**
 * The full comment experience for a post: paginated list, replies (lazy),
 * comment/reply likes, add/reply/edit/delete, sorting, mentions, and double-tap
 * to like. Shared by ViewPost (variant="screen") and the comments bottom sheet
 * (variant="sheet").
 */
export default function CommentsThread({
  post,
  canInteractWithAuthor,
  variant = 'screen',
  listHeader = null,
  onCommentCountChange,
  bottomInset = 10,
}: CommentsThreadProps) {
  const router = useRouter();
  const { currentUser, userProfile } = useAuth();
  const { canInteractWithUser } = useBlockEnforcement();
  const { promptSelfUnmention } = useSelfUnmention();
  const {
    getPostComments, addComment, deleteComment, updateComment,
    likeComment, unlikeComment, addReplyToComment, getCommentReplies,
    likeReply, unlikeReply,
  } = usePostsData();

  const postId = post.id;

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentCursor, setCommentCursor] = useState<CommentCursor | null>(null);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [commentMentions, setCommentMentions] = useState<MentionData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortType, setSortType] = useState('Recency');
  const [sortModalVisible, setSortModalVisible] = useState(false);

  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyingToUsername, setReplyingToUsername] = useState<string | null>(null);
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [likingComments, setLikingComments] = useState<Record<string, boolean>>({});
  const [likingReplies, setLikingReplies] = useState<Record<string, boolean>>({});

  const [selectedCommentForAction, setSelectedCommentForAction] = useState<Comment | null>(null);
  const [commentActionModalVisible, setCommentActionModalVisible] = useState(false);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [editCommentMentions, setEditCommentMentions] = useState<MentionData[]>([]);
  const [editCommentModalVisible, setEditCommentModalVisible] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [selectedReplyForAction, setSelectedReplyForAction] = useState<{ reply: Reply; commentId: string } | null>(null);
  const [replyActionModalVisible, setReplyActionModalVisible] = useState(false);

  // ── Fetch first page ────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      setCommentsLoading(true);
      try {
        const page = await getPostComments(postId, { limitN: COMMENTS_PAGE_SIZE });
        if (!active) return;
        setComments(page.comments);
        setCommentCursor(page.cursor);
        setHasMoreComments(page.comments.length === COMMENTS_PAGE_SIZE);
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        if (active) setCommentsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [postId]);

  const loadMoreComments = async () => {
    if (loadingMoreComments || !hasMoreComments || !commentCursor) return;
    setLoadingMoreComments(true);
    try {
      const page = await getPostComments(postId, { limitN: COMMENTS_PAGE_SIZE, after: commentCursor });
      setComments(prev => {
        const seen = new Set(prev.map(c => c.id));
        const merged = [...prev, ...page.comments.filter(c => !seen.has(c.id))];
        return sortComments(merged, sortType);
      });
      setCommentCursor(page.cursor);
      setHasMoreComments(page.comments.length === COMMENTS_PAGE_SIZE);
    } catch (error) {
      console.error('Error loading more comments:', error);
    } finally {
      setLoadingMoreComments(false);
    }
  };

  const filteredComments = useMemo(() => {
    return comments.filter(comment => {
      if (comment.authorId === currentUser?.uid) return true;
      return canInteractWithUser(comment.authorId, comment.authorBlockedUsers);
    });
  }, [comments, canInteractWithUser, currentUser?.uid]);

  const navigateToProfile = (userId: string) => {
    if (!userId) return;
    router.push(`/profile/${userId}`);
  };

  // ── Add comment / reply ───────────────────────────────────────────────────
  const handleAddComment = async () => {
    if (!currentUser || !commentText.trim() || isSubmitting) return;
    if (!canInteractWithAuthor) {
      Alert.alert('Cannot Comment', 'You cannot interact with this user.');
      return;
    }
    try {
      setIsSubmitting(true);
      if (replyingToCommentId) {
        const expectedPrefix = `@${replyingToUsername} `;
        const replyText = commentText.startsWith(expectedPrefix)
          ? commentText.slice(expectedPrefix.length).trim()
          : commentText.trim();
        if (!replyText) return;
        const newReply = await addReplyToComment(postId, replyingToCommentId, replyText, commentMentions);
        setComments(prev => prev.map(c =>
          c.id === replyingToCommentId
            ? { ...c, replies: [...(c.replies || []), newReply], replyCount: (c.replyCount || 0) + 1 }
            : c
        ));
        setExpandedComments(prev => ({ ...prev, [replyingToCommentId]: true }));
        setReplyingToCommentId(null);
        setReplyingToUsername(null);
      } else {
        const newComment = await addComment(postId, commentText.trim(), commentMentions);
        setComments(prev => [{ ...newComment, replies: [] }, ...prev]);
        onCommentCountChange?.(1);
      }
      setCommentText('');
      setCommentMentions([]);
      Keyboard.dismiss();
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Could not add comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentTextChange = (text: string) => {
    if (replyingToCommentId && replyingToUsername) {
      const expectedPrefix = `@${replyingToUsername} `;
      if (!text.startsWith(expectedPrefix)) {
        setCommentText(expectedPrefix);
        return;
      }
    }
    setCommentText(text);
  };

  const handleToggleReplyInput = (commentId: string, username: string) => {
    if (replyingToCommentId === commentId) {
      setReplyingToCommentId(null);
      setReplyingToUsername(null);
      setCommentText('');
      setCommentMentions([]);
    } else {
      setReplyingToCommentId(commentId);
      setReplyingToUsername(username);
      setCommentText(`@${username} `);
    }
  };

  // ── Likes ─────────────────────────────────────────────────────────────────
  const handleCommentLike = async (commentId: string) => {
    if (!currentUser || likingComments[commentId]) return;
    const idx = comments.findIndex(c => c.id === commentId);
    if (idx === -1) return;
    const comment = comments[idx];
    if (!canInteractWithUser(comment.authorId, comment.authorBlockedUsers)) {
      Alert.alert('Cannot Like', 'You cannot interact with this user.');
      return;
    }
    setLikingComments(prev => ({ ...prev, [commentId]: true }));
    const original = [...comments];
    const currentlyLiked = comment.isLiked;
    const updated = [...comments];
    updated[idx] = {
      ...comment,
      isLiked: !currentlyLiked,
      likes: currentlyLiked ? Math.max(0, (comment.likes || 0) - 1) : (comment.likes || 0) + 1,
    };
    setComments(updated);
    try {
      if (currentlyLiked) await unlikeComment(postId, commentId);
      else await likeComment(postId, commentId);
    } catch (error) {
      console.error('Error toggling comment like:', error);
      setComments(original);
      Alert.alert('Error', 'Could not update like status. Please try again.');
    } finally {
      setLikingComments(prev => { const n = { ...prev }; delete n[commentId]; return n; });
    }
  };

  const handleReplyLike = async (commentId: string, replyId: string) => {
    if (!currentUser) return;
    const replyKey = `${commentId}-${replyId}`;
    if (likingReplies[replyKey]) return;
    const idx = comments.findIndex(c => c.id === commentId);
    if (idx === -1) return;
    const original = [...comments];
    const comment = comments[idx];
    const replyIdx = comment.replies?.findIndex(r => r.id === replyId);
    if (replyIdx === undefined || replyIdx === -1 || !comment.replies) return;
    const reply = comment.replies[replyIdx];
    if (!canInteractWithUser(reply.authorId, reply.authorBlockedUsers)) {
      Alert.alert('Cannot Like', 'You cannot interact with this user.');
      return;
    }
    setLikingReplies(prev => ({ ...prev, [replyKey]: true }));
    const currentlyLiked = reply.isLiked;
    const updatedReplies = [...comment.replies];
    updatedReplies[replyIdx] = {
      ...reply,
      isLiked: !currentlyLiked,
      likes: currentlyLiked ? Math.max(0, (reply.likes || 0) - 1) : (reply.likes || 0) + 1,
    };
    const updated = [...comments];
    updated[idx] = { ...comment, replies: updatedReplies };
    setComments(updated);
    try {
      if (currentlyLiked) await unlikeReply(postId, commentId, replyId);
      else await likeReply(postId, commentId, replyId);
    } catch (error) {
      console.error('Error toggling reply like:', error);
      setComments(original);
      Alert.alert('Error', 'Could not update reply like status.');
    } finally {
      setLikingReplies(prev => { const n = { ...prev }; delete n[replyKey]; return n; });
    }
  };

  const handleLoadReplies = async (commentId: string) => {
    if (expandedComments[commentId]) {
      setExpandedComments(prev => ({ ...prev, [commentId]: false }));
      return;
    }
    const comment = comments.find(c => c.id === commentId);
    if (!comment?.replies || comment.replies.length === 0) {
      setLoadingReplies(prev => ({ ...prev, [commentId]: true }));
      try {
        const fetched = await getCommentReplies(postId, commentId);
        setComments(prev => prev.map(c => c.id === commentId ? { ...c, replies: fetched } : c));
      } catch (error) {
        console.error('Error loading replies:', error);
        Alert.alert('Error', 'Could not load replies.');
        setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
        return;
      } finally {
        setLoadingReplies(prev => ({ ...prev, [commentId]: false }));
      }
    }
    setExpandedComments(prev => ({ ...prev, [commentId]: true }));
  };

  // ── Double-tap to like ──────────────────────────────────────────────────
  const commentTapTimers = useRef<Record<string, number>>({});
  const replyTapTimers = useRef<Record<string, number>>({});
  const likingInProgress = useRef<Record<string, boolean>>({});

  const handleCommentDoubleTap = (commentId: string) => {
    if (likingComments[commentId]) return;
    const comment = comments.find(c => c.id === commentId);
    if (!comment || !currentUser) return;
    if (!canInteractWithUser(comment.authorId, comment.authorBlockedUsers)) return;
    if (!comment.isLiked) handleCommentLike(commentId);
  };

  const handleReplyDoubleTap = (commentId: string, replyId: string) => {
    if (likingReplies[`${commentId}-${replyId}`]) return;
    const comment = comments.find(c => c.id === commentId);
    const reply = comment?.replies?.find(r => r.id === replyId);
    if (!reply || !currentUser) return;
    if (!canInteractWithUser(reply.authorId, reply.authorBlockedUsers)) return;
    if (!reply.isLiked) handleReplyLike(commentId, replyId);
  };

  const createDoubleTapHandler = (onDoubleTap: () => void, id: string, type: 'comment' | 'reply' = 'comment') => {
    const timers = type === 'reply' ? replyTapTimers.current : commentTapTimers.current;
    return () => {
      if (likingInProgress.current[id]) return;
      const now = Date.now();
      const lastTap = timers[id];
      if (lastTap && now - lastTap < 300) {
        delete timers[id];
        likingInProgress.current[id] = true;
        onDoubleTap();
        setTimeout(() => { likingInProgress.current[id] = false; }, 500);
      } else {
        timers[id] = now;
        setTimeout(() => { delete timers[id]; }, 300);
      }
    };
  };

  // ── Comment/reply action modals ───────────────────────────────────────────
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
    if (!editingComment || !editCommentText.trim() || isSubmittingEdit) return;
    setIsSubmittingEdit(true);
    try {
      await updateComment(postId, editingComment.id, editCommentText.trim(), editCommentMentions);
      setComments(prev => prev.map(c =>
        c.id === editingComment.id
          ? { ...c, text: editCommentText.trim(), mentions: editCommentMentions, editedAt: undefined }
          : c
      ));
      setEditCommentModalVisible(false);
      setEditingComment(null);
    } catch (error) {
      console.error('Error editing comment:', error);
      Alert.alert('Error', 'Could not edit comment. Please try again.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteComment = () => {
    if (!selectedCommentForAction) return;
    const commentToDelete = selectedCommentForAction;
    setCommentActionModalVisible(false);
    setSelectedCommentForAction(null);
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteComment(postId, commentToDelete.id);
            setComments(prev => prev.filter(c => c.id !== commentToDelete.id));
            onCommentCountChange?.(-1);
          } catch (error) {
            console.error('Error deleting comment:', error);
            Alert.alert('Error', 'Could not delete comment. Please try again.');
          }
        },
      },
    ]);
  };

  const handleReportComment = () => {
    if (!selectedCommentForAction) return;
    Alert.alert('Report Comment', `Reporting comment by ${selectedCommentForAction.authorUsername}.`);
    setCommentActionModalVisible(false);
    setSelectedCommentForAction(null);
  };

  const handleRemoveCommentMention = async () => {
    if (!selectedCommentForAction || !currentUser) return;
    if (!selectedCommentForAction.mentions?.some(m => m.userId === currentUser.uid)) return;
    setCommentActionModalVisible(false);
    await promptSelfUnmention(
      { context: 'comment', postId, commentId: selectedCommentForAction.id },
      selectedCommentForAction.authorUsername,
      selectedCommentForAction.authorId,
      () => {
        setComments(prev => prev.map(c =>
          c.id === selectedCommentForAction.id
            ? { ...c, mentions: c.mentions?.filter(m => m.userId !== currentUser.uid) || [] }
            : c
        ));
        setSelectedCommentForAction(null);
      }
    );
  };

  const handleRemoveReplyMention = async () => {
    if (!selectedReplyForAction || !currentUser) return;
    const { reply, commentId } = selectedReplyForAction;
    if (!reply.mentions?.some(m => m.userId === currentUser.uid)) return;
    setReplyActionModalVisible(false);
    await promptSelfUnmention(
      { context: 'reply', postId, commentId, replyId: reply.id },
      reply.authorUsername,
      reply.authorId,
      () => {
        setComments(prev => prev.map(c =>
          c.id === commentId
            ? {
                ...c,
                replies: c.replies?.map(r =>
                  r.id === reply.id
                    ? { ...r, mentions: r.mentions?.filter(m => m.userId !== currentUser.uid) || [] }
                    : r
                ) || [],
              }
            : c
        ));
        setSelectedReplyForAction(null);
      }
    );
  };

  const handleSort = (type: string) => {
    setSortType(type);
    setSortModalVisible(false);
    setComments(prev => sortComments(prev, type));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const renderReplyItem = (reply: Reply, commentId: string) => {
    const uri = getOptimalImageUrl(reply.authorProfileThumbnailUrl, reply.authorProfileImageUrl);
    const canInteract = canInteractWithUser(reply.authorId, reply.authorBlockedUsers);
    return (
      <TouchableOpacity
        key={reply.id}
        onPress={canInteract ? createDoubleTapHandler(() => handleReplyDoubleTap(commentId, reply.id), `${commentId}-${reply.id}`, 'reply') : undefined}
        onLongPress={canInteract ? () => handleLongPressReply(reply, commentId) : undefined}
        activeOpacity={0.7}
        style={styles.replyItem}
      >
        <View style={styles.commentLeftSection}>
          <Image source={{ uri }} style={styles.replyProfilePic} />
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentUsername}>{reply.authorUsername}</Text>
              <Text style={styles.commentTimestamp}>{formatDate(reply.createdAt)}</Text>
            </View>
            <MentionText text={reply.text} mentions={reply.mentions} style={styles.commentText} />
          </View>
        </View>
        {canInteract && (
          <View style={styles.commentLikeContainer}>
            <TouchableOpacity style={styles.commentLikeButton} onPress={() => handleReplyLike(commentId, reply.id)}>
              <Ionicons name={reply.isLiked ? 'heart' : 'heart-outline'} size={14} color={reply.isLiked ? '#FF3B30' : '#999'} />
            </TouchableOpacity>
            <Text style={[styles.commentLikeCount, reply.isLiked && styles.commentLikedCount]}>{reply.likes || 0}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCommentItem = (comment: Comment) => {
    const canInteract = canInteractWithUser(comment.authorId, comment.authorBlockedUsers);
    const hasReplies = comment.replyCount > 0;
    const isExpanded = expandedComments[comment.id];
    const isLoadingReplies = loadingReplies[comment.id];
    return (
      <View key={comment.id}>
        <TouchableOpacity
          onLongPress={canInteract ? () => handleLongPressComment(comment) : undefined}
          onPress={canInteract ? createDoubleTapHandler(() => handleCommentDoubleTap(comment.id), comment.id, 'comment') : undefined}
          delayLongPress={500}
          activeOpacity={0.7}
        >
          <View style={styles.commentItem}>
            <View style={styles.commentLeftSection}>
              <TouchableOpacity onPress={canInteract ? () => navigateToProfile(comment.authorId) : undefined}>
                <Image
                  source={{ uri: getOptimalImageUrl(comment.authorProfileThumbnailUrl, comment.authorProfileImageUrl) || 'https://via.placeholder.com/150' }}
                  style={styles.commentProfilePic}
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
                {canInteract && (
                  <View style={styles.commentActions}>
                    <TouchableOpacity onPress={() => handleToggleReplyInput(comment.id, comment.authorUsername)} style={styles.replyButton}>
                      <Text style={styles.replyButtonText}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            {canInteract && (
              <View style={styles.commentLikeContainer}>
                <TouchableOpacity style={styles.commentLikeButton} onPress={() => handleCommentLike(comment.id)}>
                  <Ionicons name={comment.isLiked ? 'heart' : 'heart-outline'} size={14} color={comment.isLiked ? '#FF3B30' : '#999'} />
                </TouchableOpacity>
                <Text style={[styles.commentLikeCount, comment.isLiked && styles.commentLikedCount]}>{comment.likes || 0}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {hasReplies && (
          <TouchableOpacity style={styles.viewRepliesButton} onPress={() => handleLoadReplies(comment.id)} disabled={isLoadingReplies}>
            {isLoadingReplies ? (
              <ActivityIndicator size="small" color="#0A84FF" />
            ) : (
              <Text style={styles.viewRepliesText}>{isExpanded ? 'Hide replies' : `View replies (${comment.replyCount})`}</Text>
            )}
          </TouchableOpacity>
        )}

        {isExpanded && comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies
              .filter(reply => reply.authorId === currentUser?.uid || canInteractWithUser(reply.authorId, reply.authorBlockedUsers))
              .map(reply => renderReplyItem(reply, comment.id))}
          </View>
        )}
      </View>
    );
  };

  const header = (
    <>
      {listHeader}
      <View style={[styles.commentsSection, variant === 'sheet' && styles.commentsSectionSheet]}>
        <View style={styles.commentsHeaderContainer}>
          {variant === 'screen' ? (
            <View style={styles.commentsHeaderLeft}>
              <Text style={styles.commentsHeader}>Comments</Text>
              <Text style={styles.commentCount}>{post.commentCount || 0}</Text>
            </View>
          ) : <View />}
          <TouchableOpacity style={styles.sortButton} onPress={() => setSortModalVisible(true)}>
            <Text style={styles.sortButtonText}>{sortType}</Text>
            <Ionicons name="chevron-down" size={14} color="#999" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filteredComments}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <View style={styles.commentRow}>{renderCommentItem(item)}</View>}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        ListHeaderComponent={header}
        ListEmptyComponent={
          commentsLoading ? (
            <ActivityIndicator size="small" color="#999" style={{ marginVertical: 24 }} />
          ) : (
            <Text style={[styles.commentRow, { color: '#999', textAlign: 'center', marginTop: 20, marginBottom: 20 }]}>
              {canInteractWithAuthor ? 'No comments yet. Be the first to comment!' : 'Comments are not available.'}
            </Text>
          )
        }
        ListFooterComponent={
          loadingMoreComments
            ? <ActivityIndicator size="small" color="#999" style={{ marginVertical: 16 }} />
            : <View style={{ height: 16 }} />
        }
        onEndReached={loadMoreComments}
        onEndReachedThreshold={0.4}
        extraData={[likingComments, likingReplies, expandedComments, loadingReplies, replyingToCommentId, editingComment, currentUser?.uid]}
        keyboardShouldPersistTaps="handled"
      />

      {canInteractWithAuthor && (
        <View style={[styles.commentInputContainer, { paddingBottom: Math.max(bottomInset, 10) }]}>
          {replyingToCommentId && (
            <View style={styles.replyIndicator}>
              <Text style={styles.replyIndicatorText}>Replying to @{replyingToUsername}</Text>
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
              placeholder={replyingToCommentId ? `Reply to @${replyingToUsername}...` : 'Add a comment...'}
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
              style={[styles.postButton, (commentText.trim() === '' || isSubmitting) && styles.disabledButton]}
              onPress={handleAddComment}
              disabled={commentText.trim() === '' || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#0A84FF" />
              ) : (
                <Text style={[styles.postButtonText, commentText.trim() === '' && styles.disabledButtonText]}>
                  {replyingToCommentId ? 'Reply' : 'Post'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Sort modal */}
      <Modal animationType="slide" transparent visible={sortModalVisible} onRequestClose={() => setSortModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSortModalVisible(false)}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Sort Comments By</Text>
            {['Recency', 'Popularity', 'Relevance'].map(type => (
              <TouchableOpacity key={type} style={[styles.sortOption, sortType === type && styles.selectedSortOption]} onPress={() => handleSort(type)}>
                <Text style={[styles.sortOptionText, sortType === type && styles.selectedSortOptionText]}>{type}</Text>
                {sortType === type && <Ionicons name="checkmark" size={18} color="#0A84FF" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Comment action modal */}
      {selectedCommentForAction && (
        <Modal animationType="slide" transparent visible={commentActionModalVisible} onRequestClose={() => { setCommentActionModalVisible(false); setSelectedCommentForAction(null); }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { setCommentActionModalVisible(false); setSelectedCommentForAction(null); }}>
            <View style={styles.commentActionModalView}>
              {selectedCommentForAction.authorId === currentUser?.uid ? (
                <>
                  <TouchableOpacity style={styles.commentActionItem} onPress={handleEditComment}>
                    <Ionicons name="create-outline" size={22} color="#FFF" style={styles.commentActionIcon} />
                    <Text style={styles.commentActionText}>Edit Comment</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.commentActionItem} onPress={handleDeleteComment}>
                    <Ionicons name="trash-outline" size={22} color="#FF3B30" style={styles.commentActionIcon} />
                    <Text style={[styles.commentActionText, { color: '#FF3B30' }]}>Delete Comment</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.commentActionItem} onPress={handleReportComment}>
                    <Ionicons name="flag-outline" size={22} color="#FF9500" style={styles.commentActionIcon} />
                    <Text style={[styles.commentActionText, { color: '#FF9500' }]}>Report Comment</Text>
                  </TouchableOpacity>
                  {selectedCommentForAction.mentions?.some(m => m.userId === currentUser?.uid) && (
                    <TouchableOpacity style={styles.commentActionItem} onPress={handleRemoveCommentMention}>
                      <Ionicons name="close-circle-outline" size={22} color="#999" style={styles.commentActionIcon} />
                      <Text style={[styles.commentActionText, { color: '#999' }]}>Remove my mention</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
              <TouchableOpacity style={[styles.commentActionItem, { borderBottomWidth: 0 }]} onPress={() => { setCommentActionModalVisible(false); setSelectedCommentForAction(null); }}>
                <Ionicons name="close-circle-outline" size={22} color="#999" style={styles.commentActionIcon} />
                <Text style={[styles.commentActionText, { color: '#999' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Edit comment modal */}
      {editingComment && (
        <Modal animationType="slide" transparent visible={editCommentModalVisible} onRequestClose={() => { setEditCommentModalVisible(false); setEditingComment(null); }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { setEditCommentModalVisible(false); setEditingComment(null); }}>
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                <View style={[styles.commentActionModalView, { padding: 16 }]}>
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16, marginBottom: 12 }}>Edit Comment</Text>
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
                    <TouchableOpacity onPress={() => { setEditCommentModalVisible(false); setEditingComment(null); }} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
                      <Text style={{ color: '#999', fontSize: 15 }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleSubmitEditComment}
                      disabled={!editCommentText.trim() || isSubmittingEdit}
                      style={{ backgroundColor: ACCENT_COLOR, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, opacity: (!editCommentText.trim() || isSubmittingEdit) ? 0.4 : 1 }}
                    >
                      {isSubmittingEdit ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Save</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Reply action modal */}
      {selectedReplyForAction && (
        <Modal animationType="slide" transparent visible={replyActionModalVisible} onRequestClose={() => { setReplyActionModalVisible(false); setSelectedReplyForAction(null); }}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { setReplyActionModalVisible(false); setSelectedReplyForAction(null); }}>
            <View style={styles.commentActionModalView}>
              {selectedReplyForAction.reply.authorId === currentUser?.uid ? (
                <>
                  <TouchableOpacity style={styles.commentActionItem} onPress={() => { Alert.alert('Edit Reply', 'Edit functionality not yet implemented.'); setReplyActionModalVisible(false); setSelectedReplyForAction(null); }}>
                    <Ionicons name="create-outline" size={22} color="#FFF" style={styles.commentActionIcon} />
                    <Text style={styles.commentActionText}>Edit Reply</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.commentActionItem} onPress={() => { Alert.alert('Delete Reply', 'Delete functionality not yet implemented.'); setReplyActionModalVisible(false); setSelectedReplyForAction(null); }}>
                    <Ionicons name="trash-outline" size={22} color="#FF3B30" style={styles.commentActionIcon} />
                    <Text style={[styles.commentActionText, { color: '#FF3B30' }]}>Delete Reply</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.commentActionItem} onPress={() => { Alert.alert('Report Reply', 'Report functionality not yet implemented.'); setReplyActionModalVisible(false); setSelectedReplyForAction(null); }}>
                    <Ionicons name="flag-outline" size={22} color="#FF9500" style={styles.commentActionIcon} />
                    <Text style={[styles.commentActionText, { color: '#FF9500' }]}>Report Reply</Text>
                  </TouchableOpacity>
                  {selectedReplyForAction.reply.mentions?.some(m => m.userId === currentUser?.uid) && (
                    <TouchableOpacity style={styles.commentActionItem} onPress={handleRemoveReplyMention}>
                      <Ionicons name="close-circle-outline" size={22} color="#999" style={styles.commentActionIcon} />
                      <Text style={[styles.commentActionText, { color: '#999' }]}>Remove my mention</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
              <TouchableOpacity style={[styles.commentActionItem, { borderBottomWidth: 0 }]} onPress={() => { setReplyActionModalVisible(false); setSelectedReplyForAction(null); }}>
                <Ionicons name="close-circle-outline" size={22} color="#999" style={styles.commentActionIcon} />
                <Text style={[styles.commentActionText, { color: '#999' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  commentsSection: { paddingHorizontal: 15, paddingVertical: 10, borderTopColor: '#222', borderTopWidth: 1 },
  commentsSectionSheet: { borderTopWidth: 0, paddingVertical: 6 },
  commentsHeaderContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  commentsHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  commentsHeader: { fontWeight: '600', fontSize: 16, color: '#FFF', marginRight: 8 },
  commentCount: { fontSize: 16, color: '#999' },
  sortButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  sortButtonText: { color: '#999', fontSize: 12, marginRight: 4 },
  commentRow: { paddingHorizontal: 15 },
  commentItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  commentLeftSection: { flexDirection: 'row', flex: 1, alignItems: 'flex-start' },
  commentProfilePic: { width: 30, height: 30, borderRadius: 15, marginRight: 10, alignSelf: 'flex-start' },
  commentContent: { flex: 1 },
  commentHeader: { flexDirection: 'row', alignItems: 'center' },
  commentUsername: { fontWeight: '600', color: '#FFF', marginRight: 8 },
  commentTimestamp: { fontSize: 12, color: '#999' },
  commentText: { color: '#FFF', marginVertical: 4 },
  commentActions: { flexDirection: 'row', marginTop: 5 },
  replyButton: {},
  replyButtonText: { color: '#999', fontSize: 12, fontWeight: '500' },
  commentLikeContainer: { alignItems: 'center', paddingLeft: 5, justifyContent: 'center', alignSelf: 'center' },
  commentLikeButton: { padding: 5 },
  commentLikeCount: { fontSize: 12, color: '#999' },
  commentLikedCount: { color: '#FF3B30' },
  repliesContainer: { marginLeft: 40, marginTop: 10, borderLeftColor: '#333', borderLeftWidth: 1, paddingLeft: 10 },
  replyItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  replyProfilePic: { width: 24, height: 24, borderRadius: 12, marginRight: 8, alignSelf: 'flex-start' },
  viewRepliesButton: { marginLeft: 50, marginVertical: 8 },
  viewRepliesText: { color: '#0A84FF', fontSize: 13, fontWeight: '500' },
  commentInputContainer: { paddingHorizontal: 15, paddingVertical: 10, borderTopColor: '#222', borderTopWidth: 1, backgroundColor: '#000' },
  replyIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginBottom: 8 },
  replyIndicatorText: { color: '#0A84FF', fontSize: 12, fontWeight: '500' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  commentInputProfilePic: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  commentInput: { flex: 1, minHeight: 36, maxHeight: 120, borderColor: '#333', borderWidth: 1, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 8, fontSize: 14, color: '#FFF', backgroundColor: '#111', textAlignVertical: 'center' },
  postButton: { marginLeft: 10, paddingHorizontal: 12 },
  postButtonText: { color: '#0A84FF', fontWeight: '600' },
  disabledButton: { opacity: 0.5 },
  disabledButtonText: { color: '#666' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalView: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#FFF', marginBottom: 15, textAlign: 'center' },
  sortOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomColor: '#333', borderBottomWidth: 1 },
  selectedSortOption: { backgroundColor: 'rgba(10, 132, 255, 0.1)' },
  sortOptionText: { color: '#FFF', fontSize: 16 },
  selectedSortOptionText: { color: '#0A84FF', fontWeight: '500' },
  commentActionModalView: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8, paddingBottom: 30 },
  commentActionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#2C2C2E' },
  commentActionIcon: { marginRight: 14 },
  commentActionText: { color: '#FFF', fontSize: 16 },
});
