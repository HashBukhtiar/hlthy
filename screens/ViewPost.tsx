import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import globalStyles from '@/styles/globalStyles';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ViewPost() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(156);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([
    {
      id: '1',
      username: 'fitnessGuru',
      profilePic: 'https://randomuser.me/api/portraits/men/32.jpg',
      text: 'Amazing progress! Keep up the great work!',
      timestamp: '2h ago',
      likes: 12,
    },
    {
      id: '2',
      username: 'health_junkie',
      profilePic: 'https://randomuser.me/api/portraits/women/44.jpg',
      text: 'This is inspiring! What\'s your nutrition plan like?',
      timestamp: '3h ago',
      likes: 8,
    },
  ]);

  // Mock post data (would be fetched from API/database in a real app)
  const post = {
    id: id,
    username: 'alex_fitness',
    fullName: 'Alex Johnson',
    profilePic: 'https://randomuser.me/api/portraits/men/22.jpg',
    imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
    caption: 'Just finished my morning workout session! Feeling great and ready to tackle the day. #fitness #health #motivation',
    timestamp: 'May 1, 2025',
    location: 'Fitness First Gym',
  };

  const handleLike = () => {
    if (liked) {
      setLikeCount(likeCount - 1);
    } else {
      setLikeCount(likeCount + 1);
    }
    setLiked(!liked);
  };

  const addComment = () => {
    if (comment.trim() === '') return;
    
    const newComment = {
      id: Date.now().toString(),
      username: 'you',
      profilePic: 'https://randomuser.me/api/portraits/men/1.jpg',
      text: comment,
      timestamp: 'Just now',
      likes: 0,
    };

    setComments([newComment, ...comments]);
    setComment('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#000' }]}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {/* Header with user info */}
        <View style={styles.header}>
          <View style={styles.userInfoContainer}>
            <Image source={{ uri: post.profilePic }} style={styles.profilePic} />
            <View>
              <Text style={styles.username}>{post.username}</Text>
              <Text style={styles.location}>{post.location}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Post Image */}
        <Image source={{ uri: post.imageUrl }} style={styles.postImage} />

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <View style={styles.leftActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <Ionicons 
                name={liked ? "heart" : "heart-outline"} 
                size={28} 
                color={liked ? "#FF3B30" : "#FFF"} 
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="chatbubble-outline" size={26} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="paper-plane-outline" size={26} color="#FFF" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="bookmark-outline" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Likes */}
        <Text style={styles.likes}>{likeCount} likes</Text>

        {/* Caption */}
        <View style={styles.captionContainer}>
          <Text style={styles.captionUsername}>{post.username}</Text>
          <Text style={styles.caption}>{post.caption}</Text>
        </View>

        {/* Posted Date */}
        <Text style={styles.timestamp}>{post.timestamp}</Text>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsHeader}>Comments</Text>
          
          {comments.map(comment => (
            <View key={comment.id} style={styles.commentItem}>
              <Image source={{ uri: comment.profilePic }} style={styles.commentProfilePic} />
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUsername}>{comment.username}</Text>
                  <Text style={styles.commentText}>{comment.text}</Text>
                </View>
                <View style={styles.commentActions}>
                  <Text style={styles.commentTimestamp}>{comment.timestamp}</Text>
                  <Text style={styles.commentLikes}>{comment.likes} likes</Text>
                  <Text style={styles.replyButton}>Reply</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.commentLikeButton}>
                <Ionicons name="heart-outline" size={14} color="#999" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View style={[styles.commentInputContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <Image 
          source={{ uri: 'https://randomuser.me/api/portraits/men/1.jpg' }} 
          style={styles.commentInputProfilePic} 
        />
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor="#666"
          value={comment}
          onChangeText={setComment}
        />
        <TouchableOpacity 
          style={[styles.postButton, comment.trim() === '' && styles.disabledButton]}
          onPress={addComment}
          disabled={comment.trim() === ''}
        >
          <Text style={[styles.postButtonText, comment.trim() === '' && styles.disabledButtonText]}>
            Post
          </Text>
        </TouchableOpacity>
      </View>
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
  captionUsername: {
    fontWeight: '600',
    marginRight: 5,
    color: '#FFF',
  },
  caption: {
    flex: 1,
    color: '#FFF',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  commentsSection: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopColor: '#222',
    borderTopWidth: 1,
  },
  commentsHeader: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 10,
    color: '#FFF',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-start',
  },
  commentProfilePic: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  commentUsername: {
    fontWeight: '600',
    marginRight: 5,
    color: '#FFF',
  },
  commentText: {
    flex: 1,
    color: '#FFF',
  },
  commentActions: {
    flexDirection: 'row',
    marginTop: 5,
  },
  commentTimestamp: {
    fontSize: 12,
    color: '#999',
    marginRight: 15,
  },
  commentLikes: {
    fontSize: 12,
    color: '#999',
    marginRight: 15,
  },
  replyButton: {
    fontSize: 12,
    color: '#999',
  },
  commentLikeButton: {
    marginLeft: 10,
    padding: 5,
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
});