import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, FlatList, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ShareModal from '@/components/ShareModal';
import { sharePost } from '@/services/ShareService';
import { usePostsData, Post, Comment } from '@/hooks/usePostsData';
import { useAuth } from '@/context/AuthContext';
import { collection } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { query, where, limit, getDocs, doc, setDoc, getDoc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

export default function ViewPost() {
  const [menuVisible, setMenuVisible] = useState(false);
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser, userProfile } = useAuth();
  const { getPostById, getPostComments, likePost, unlikePost, addComment, deletePost } = usePostsData();  
  const postId = params.id ? String(params.id) : '';
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortType, setSortType] = useState('Recency');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<{id: string, username: string, profileImageUrl?: string}[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
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
        {
          id: post.id,
          caption: post.caption,
          imageUrl: post.imageUrl,
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

  // Helper function to generate conversation ID
  const generateConversationId = (userId1: string, userId2: string): string => {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
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
      
      // Add comment to Firebase
      const newComment = await addComment(post.id, commentText.trim());
      
      // Update local state
      setComments([newComment, ...comments]);
      setCommentText('');
      setPost({...post, commentCount: post.commentCount + 1});
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post || !currentUser) return;
    
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
            try {
              setMenuVisible(false);
              // Show loading
              setLoading(true);
              
              await deletePost(post.id);
              
              // Navigate back after successful deletion
              Alert.alert("Success", "Post deleted successfully", [
                { text: "OK", onPress: () => router.replace('/') }
              ]);
            } catch (error) {
              console.error("Error deleting post:", error);
              Alert.alert("Error", "Could not delete post. Please try again.");
              setLoading(false);
            }
          }
        }
      ]
    );
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
    // TODO: Implement comment like functionality with Firebase
    setComments(comments.map(item => {
      if (item.id === commentId) {
        const newLikedState = !item.liked;
        return {
          ...item,
          liked: newLikedState,
          likes: newLikedState ? item.likes + 1 : item.likes - 1
        };
      }
      return item;
    }));
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
  
  const navigateToWorkout = (workoutId: string) => {
    router.push(`/view-workout/${workoutId}`);
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
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) return 'Just now';
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
      
      return date.toLocaleDateString();
    } catch (e) {
      return 'Unknown date';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#000' }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.header}>
          <View style={styles.userInfoContainer}>
            <Image source={{ uri: post.authorProfileImageUrl || 'https://via.placeholder.com/150' }} style={styles.profilePic} />
            <View>
              <Text style={styles.username}>{post.authorUsername}</Text>
              <Text style={styles.location}>{formatDate(post.createdAt)}</Text>
            </View>
          </View>
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

        <Text style={styles.likes}>{post.reactionCount || 0} likes</Text>

        <View style={styles.captionContainer}>
          <Text style={styles.caption}>{post.caption}</Text>
        </View>

        <Text style={styles.timestamp}>{formatDate(post.createdAt)}</Text>

        {post.isMilestone && post.milestoneDetails && (
          <TouchableOpacity 
            style={styles.attachedMilestoneContainer}
          >
            <View style={styles.attachedMilestoneContent}>
              <View style={styles.attachedMilestoneInfo}>
                <Ionicons name="trophy-outline" size={18} color="#FFF" style={styles.milestoneIcon} />
                <View>
                  <Text style={styles.attachedMilestoneTitle}>
                    {post.milestoneDetails.type === 'PR' ? 'Personal Record' : 
                     post.milestoneDetails.type === 'weightLoss' ? 'Weight Loss' : 'Weight Gain'}
                  </Text>
                  <Text style={styles.attachedMilestoneDetails}>
                    {post.milestoneDetails.type === 'PR' ? 
                      `${post.milestoneDetails.exercise}: ${post.milestoneDetails.value} ${post.milestoneDetails.weightUnit} × ${post.milestoneDetails.reps} reps` : 
                      `New weight: ${post.milestoneDetails.newWeight} ${post.milestoneDetails.newWeightUnit}`
                    }
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>
        )}

        {post.workoutId && (
          <TouchableOpacity 
            style={styles.attachedWorkoutContainer}
            onPress={() => navigateToWorkout(post.workoutId)}
          >
            <View style={styles.attachedWorkoutContent}>
              <View style={styles.attachedWorkoutInfo}>
                <Ionicons name="barbell-outline" size={18} color="#FFF" style={styles.workoutIcon} />
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
            <View key={comment.id} style={styles.commentItem}>
              <View style={styles.commentLeftSection}>
                <Image source={{ uri: comment.authorProfileImageUrl || 'https://via.placeholder.com/150' }} style={styles.commentProfilePic} />
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUsername}>{comment.authorUsername}</Text>
                    <Text style={styles.commentTimestamp}>{formatDate(comment.createdAt)}</Text>
                  </View>
                  <Text style={styles.commentText}>{comment.text}</Text>
                </View>
              </View>
              <View style={styles.commentLikeContainer}>
                <TouchableOpacity 
                  style={styles.commentLikeButton}
                  onPress={() => handleCommentLike(comment.id)}
                >
                  <Ionicons 
                    name={comment.liked ? "heart" : "heart-outline"} 
                    size={14} 
                    color={comment.liked ? "#FF3B30" : "#999"}
                  />
                </TouchableOpacity>
                <Text style={[
                  styles.commentLikeCount,
                  comment.liked && styles.commentLikedCount
                ]}>
                  {comment.likes || 0}
                </Text>
              </View>
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
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleDeletePost}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Delete Post</Text>
            </TouchableOpacity>
            
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
    </View>
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
    backgroundColor: '#333',
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
    backgroundColor: '#333',
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
});