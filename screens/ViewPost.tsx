import React, { useState } from 'react';
import { StyleSheet, Text, View, Image, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import globalStyles from '@/styles/globalStyles';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ViewPost() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(156);
  const [comment, setComment] = useState('');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortType, setSortType] = useState('Recent');
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
      text: 'This is inspiring! What\'s your nutrition plan like? Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
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
    attachedWorkout: {
      id: '123',
      title: 'Impossible Leg Day',
      author: 'John Doe',
      length: '1h 30min',
      segments: 2
    },
    attachedMilestone: {
      id: '456',
      title: '10k Run Personal Best',
      achievement: 'Ran 10K in under 45 minutes',
      date: 'May 1, 2025',
      category: 'Running'
    }
  };

  const handleLike = () => {
    if (liked) {
      setLikeCount(likeCount - 1);
    } else {
      setLikeCount(likeCount + 1);
    }
    setLiked(!liked);
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
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

  const handleSort = (type: string) => {
    setSortType(type);
    setSortModalVisible(false);
    
    // Sort comments based on selected type
    const sortedComments = [...comments];
    switch (type) {
      case 'Recent':
        // Sort by recent - for demo we'll just reverse the current order
        setComments(sortedComments.reverse());
        break;
      case 'Popular':
        // Sort by most likes
        setComments(sortedComments.sort((a, b) => b.likes - a.likes));
        break;
      case 'Relevant':
        // For demo purposes, just randomize the order to simulate relevance
        setComments(sortedComments.sort(() => Math.random() - 0.5));
        break;
      default:
        break;
    }
  };

  const navigateToWorkout = (workoutId: string) => {
    router.push(`/view-workout/${workoutId}`);
  };

  const navigateToMilestone = (milestoneId: string) => {
    router.push(`/view-milestone/${milestoneId}`);
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
          <TouchableOpacity style={styles.actionButton} onPress={handleBookmark}>
            <Ionicons 
              name={bookmarked ? "bookmark" : "bookmark-outline"} 
              size={26} 
              color="#FFF" 
            />
          </TouchableOpacity>
        </View>

        {/* Likes */}
        <Text style={styles.likes}>{likeCount} likes</Text>

        {/* Caption */}
        <View style={styles.captionContainer}>
          <Text style={styles.caption}>{post.caption}</Text>
        </View>

        {/* Posted Date */}
        <Text style={styles.timestamp}>{post.timestamp}</Text>

        {/* Attached Milestone (if exists) */}
        {post.attachedMilestone && (
          <TouchableOpacity 
            style={styles.attachedMilestoneContainer}
            onPress={() => navigateToMilestone(post.attachedMilestone.id)}
          >
            <View style={styles.attachedMilestoneContent}>
              <View style={styles.attachedMilestoneInfo}>
                <Ionicons name="trophy-outline" size={18} color="#FFF" style={styles.milestoneIcon} />
                <View>
                  <Text style={styles.attachedMilestoneTitle}>
                    {post.attachedMilestone.title}
                  </Text>
                  <Text style={styles.attachedMilestoneDetails}>
                    {post.attachedMilestone.achievement} • {post.attachedMilestone.date}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>
        )}

        {/* Attached Workout (if exists) */}
        {post.attachedWorkout && (
          <TouchableOpacity 
            style={styles.attachedWorkoutContainer}
            onPress={() => navigateToWorkout(post.attachedWorkout.id)}
          >
            <View style={styles.attachedWorkoutContent}>
              <View style={styles.attachedWorkoutInfo}>
                <Ionicons name="barbell-outline" size={18} color="#FFF" style={styles.workoutIcon} />
                <View>
                  <Text style={styles.attachedWorkoutTitle}>
                    {post.attachedWorkout.title}
                  </Text>
                  <Text style={styles.attachedWorkoutDetails}>
                    by {post.attachedWorkout.author} • {post.attachedWorkout.segments} segments • {post.attachedWorkout.length}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
          </TouchableOpacity>
        )}

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <View style={styles.commentsHeaderContainer}>
            <View style={styles.commentsHeaderLeft}>
              <Text style={styles.commentsHeader}>Comments</Text>
              <Text style={styles.commentCount}>{comments.length}</Text>
            </View>
            <TouchableOpacity 
              style={styles.sortButton}
              onPress={() => setSortModalVisible(true)}
            >
              <Text style={styles.sortButtonText}>{sortType}</Text>
              <Ionicons name="chevron-down" size={14} color="#999" />
            </TouchableOpacity>
          </View>
          
          {comments.map(comment => (
            <View key={comment.id} style={styles.commentItem}>
              <View style={styles.commentLeftSection}>
                <Image source={{ uri: comment.profilePic }} style={styles.commentProfilePic} />
                <View style={styles.commentContent}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUsername}>{comment.username}</Text>
                    <Text style={styles.commentTimestamp}>{comment.timestamp}</Text>
                  </View>
                  <Text style={styles.commentText}>{comment.text}</Text>
                </View>
              </View>
              <View style={styles.commentLikeContainer}>
                <TouchableOpacity style={styles.commentLikeButton}>
                  <Ionicons name="heart-outline" size={14} color="#999" />
                </TouchableOpacity>
                <Text style={styles.commentLikeCount}>{comment.likes}</Text>
              </View>
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

      {/* Sort Modal */}
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
    marginTop: 2,
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
});