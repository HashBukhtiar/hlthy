import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  FlatList, 
  TextInput 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import postsData, { Post } from '@/data/posts';

export default function PostsFeed() {
  const router = useRouter();
  
  const [feedPosts, setFeedPosts] = useState<Post[]>(postsData);
  const [newComment, setNewComment] = useState('');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  // Function to handle image click to view full post
  const handleViewPost = (postId: string) => {
    router.push(`/view-post/${postId}`);
  };

  // Function to toggle like on a post
  const toggleLike = (postId: string) => {
    setFeedPosts(feedPosts.map(post => {
      if (post.id === postId) {
        const newIsLiked = !post.isLiked;
        return {
          ...post,
          isLiked: newIsLiked,
          likes: newIsLiked ? post.likes + 1 : post.likes - 1
        };
      }
      return post;
    }));
  };

  // Function to toggle bookmark on a post
  const toggleBookmark = (postId: string) => {
    setFeedPosts(feedPosts.map(post => {
      if (post.id === postId) {
        return { ...post, isBookmarked: !post.isBookmarked };
      }
      return post;
    }));
  };

  const navigateToWorkout = (workoutId: string) => {
    router.push(`/view-workout/${workoutId}`);
  };

  const navigateToMilestone = (milestoneId: string) => {
    router.push(`/view-milestone/${milestoneId}`);
  };

  const handleCommentPress = (postId: string) => {
    router.push(`/view-post/${postId}`);
  };
  
  // Toggle comment input for a specific post
  const toggleCommentInput = (postId: string) => {
    setActiveCommentId(activeCommentId === postId ? null : postId);
    setNewComment('');
  };

  // Add a new comment
  const addComment = (postId: string) => {
    if (newComment.trim() === '') return;
    
    setFeedPosts(feedPosts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: post.comments + 1,
        };
      }
      return post;
    }));
    
    setNewComment('');
    setActiveCommentId(null);
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postContainer}>
      {/* Header with user info */}
      <View style={styles.postHeader}>
        <TouchableOpacity style={styles.userInfoContainer}>
          <Image source={{ uri: item.profilePic }} style={styles.profilePic} />
          <View>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.location}>{item.location}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Post Image */}
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => handleViewPost(item.id)}
      >
        <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <View style={styles.leftActions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => toggleLike(item.id)}
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
          onPress={() => toggleBookmark(item.id)}
        >
          <Ionicons 
            name={item.isBookmarked ? "bookmark" : "bookmark-outline"} 
            size={26} 
            color="#FFF" 
          />
        </TouchableOpacity>
      </View>

      {/* Likes */}
      <Text style={styles.likes}>{item.likes} likes</Text>

      {/* Caption */}
      <View style={styles.captionContainer}>
        <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text>
      </View>
      
      {/* Comments preview button */}
      <TouchableOpacity 
        style={styles.commentsPreview}
        onPress={() => handleViewPost(item.id)}
      >
        <Text style={styles.commentsPreviewText}>
          View all {item.comments} comments
        </Text>
      </TouchableOpacity>

      {/* Timestamp */}
      <Text style={styles.timestamp}>{item.timestamp}</Text>

      {/* Comment Input (shown only for active comment) */}
      {activeCommentId === item.id && (
        <View style={styles.commentInputContainer}>
          <Image 
            source={{ uri: 'https://randomuser.me/api/portraits/men/1.jpg' }} 
            style={styles.commentInputProfilePic} 
          />
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor="#666"
            value={newComment}
            onChangeText={setNewComment}
          />
          <TouchableOpacity 
            style={[styles.postButton, newComment.trim() === '' && styles.disabledButton]}
            onPress={() => addComment(item.id)}
            disabled={newComment.trim() === ''}
          >
            <Text style={[styles.postButtonText, newComment.trim() === '' && styles.disabledButtonText]}>
              Post
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Attached Milestone (if exists) */}
      {item.attachedMilestone && (
        <TouchableOpacity 
          style={styles.attachedItemContainer}
          onPress={() => item.attachedMilestone && navigateToMilestone(item.attachedMilestone.id)}
        >
          <View style={styles.attachedItemContent}>
            <View style={styles.attachedItemInfo}>
              <Ionicons name="trophy-outline" size={18} color="#FFF" style={styles.attachedItemIcon} />
              <View>
                <Text style={styles.attachedItemTitle}>
                  {item.attachedMilestone.title}
                </Text>
                <Text style={styles.attachedItemDetails}>
                  {item.attachedMilestone.details}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </TouchableOpacity>
      )}

      {/* Attached Workout (if exists) */}
      {item.attachedWorkout && (
        <TouchableOpacity 
          style={styles.attachedItemContainer}
          onPress={() => item.attachedWorkout && navigateToWorkout(item.attachedWorkout.id)}
        >
          <View style={styles.attachedItemContent}>
            <View style={styles.attachedItemInfo}>
              <Ionicons name="flame" size={18} color="#FFF" style={styles.attachedItemIcon} />
              <View>
                <Text style={styles.attachedItemTitle}>
                  {item.attachedWorkout.title}
                </Text>
                <Text style={styles.attachedItemDetails}>
                  {item.attachedWorkout.details}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
  
  return (
    <FlatList
      data={feedPosts}
      renderItem={renderPost}
      keyExtractor={item => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.postsContainer}
    />
  );
}

const styles = StyleSheet.create({
  postsContainer: {
    width: '100%',
    paddingBottom: 70,
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
  location: {
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
  timestamp: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 15,
    marginBottom: 10,
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
});