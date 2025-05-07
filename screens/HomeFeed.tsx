import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet,
  Text, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  Dimensions,
  FlatList,
  TextInput,
  Animated
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import globalStyles from '@/styles/globalStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MilestonesScene from './MilestonesScene';
import postsData, { Post } from '@/data/posts';

enum TabType {
  POSTS = 'POSTS',
  MILESTONES = 'MILESTONES'
}

// New MilestonesFeed component that shows milestones in the home feed
function MilestonesFeed() {
  const router = useRouter();
  const [milestones, setMilestones] = useState([
    {
      id: 'm1',
      userId: 'user1',
      username: 'fitness_pro',
      profileImageUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
      createdAt: new Date(Date.now() - 8640000 * 2), // 2 days ago
      milestoneType: 'PR', 
      details: {
        exercise: 'Bench Press',
        value: 225,
        weightUnit: 'lbs',
        reps: 5
      },
      reactions: {
        '❤️': 24,
        '💪': 15,
        '🔥': 8
      },
      userReaction: null,
      associatedPostId: 'post1',
      postImageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'm2',
      userId: 'user2',
      username: 'runner_girl',
      profileImageUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      milestoneType: 'PR',
      details: {
        exercise: '10K Run',
        value: 42.5,
        weightUnit: 'min',
        reps: 1
      },
      reactions: {
        '❤️': 18,
        '💪': 7,
        '🔥': 12
      },
      userReaction: '❤️',
      associatedPostId: 'post2'
    },
    {
      id: 'm3',
      userId: 'user3',
      username: 'weightloss_journey',
      profileImageUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
      createdAt: new Date(Date.now() - 43200000), // 12 hours ago
      milestoneType: 'weightLoss',
      details: {
        newWeight: 165,
        newWeightUnit: 'lbs',
        previousWeight: 180,
        previousWeightUnit: 'lbs'
      },
      reactions: {
        '❤️': 35,
        '💪': 22,
        '🔥': 19
      },
      userReaction: '🔥',
      associatedPostId: 'post3',
      postImageUrl: 'https://images.unsplash.com/photo-1535743686920-55e4145369b9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    }
  ]);
  
  // Format the time as "X time ago"
  const formatTimeAgo = (date) => {
    if (!date) return 'Just now';
    
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };
  
  const handleReaction = (milestoneId, reaction) => {
    setMilestones(milestones.map(milestone => {
      if (milestone.id === milestoneId) {
        // If user already reacted with this reaction, remove it
        if (milestone.userReaction === reaction) {
          const updatedReactions = { ...milestone.reactions };
          updatedReactions[reaction] = Math.max(0, updatedReactions[reaction] - 1);
          
          return {
            ...milestone,
            reactions: updatedReactions,
            userReaction: null
          };
        }
        
        // If user reacted with a different reaction, remove previous and add new
        const updatedReactions = { ...milestone.reactions };
        
        if (milestone.userReaction) {
          updatedReactions[milestone.userReaction] = Math.max(0, updatedReactions[milestone.userReaction] - 1);
        }
        
        updatedReactions[reaction] = (updatedReactions[reaction] || 0) + 1;
        
        return {
          ...milestone,
          reactions: updatedReactions,
          userReaction: reaction
        };
      }
      return milestone;
    }));
  };
  
  const navigateToMilestone = (id) => {
    router.push(`/view-milestone/${id}`);
  };
  
  const navigateToPost = (id) => {
    if (id) {
      router.push(`/view-post/${id}`);
    }
  };
  
  const navigateToProfile = (userId) => {
    router.push(`/profile?id=${userId}`);
  };

  const renderMilestoneDetails = (milestone) => {
    if (milestone.milestoneType === 'PR') {
      return (
        <View style={styles.milestoneValueContainer}>
          <Text style={styles.milestoneValue}>
            <Text style={styles.milestoneStat}>{milestone.details.value} {milestone.details.weightUnit}</Text>
            {milestone.details.reps > 1 ? ` × ${milestone.details.reps} reps` : ''}
          </Text>
          <Text style={styles.milestoneExercise}>{milestone.details.exercise}</Text>
        </View>
      );
    } else if (milestone.milestoneType === 'weightLoss' || milestone.milestoneType === 'weightGain') {
      const isLoss = milestone.milestoneType === 'weightLoss';
      const diff = Math.abs(milestone.details.previousWeight - milestone.details.newWeight);
      
      return (
        <View style={styles.milestoneValueContainer}>
          <Text style={styles.milestoneValue}>
            <Text style={styles.milestoneStat}>{milestone.details.newWeight} {milestone.details.newWeightUnit}</Text>
          </Text>
          <Text style={styles.milestoneExercise}>
            {isLoss ? 'Weight Loss' : 'Weight Gain'} 
            <Text style={[styles.milestoneDiff, {color: isLoss ? '#4CD964' : '#FF9500'}]}>
              {' '}({isLoss ? '-' : '+'}{diff} {milestone.details.newWeightUnit})
            </Text>
          </Text>
        </View>
      );
    }
    
    return <Text style={styles.milestoneExercise}>New Achievement</Text>;
  };
  
  if (milestones.length === 0) {
    return (
      <View style={styles.emptyMilestonesContainer}>
        <Text style={styles.emptyMilestonesText}>No milestones to display</Text>
      </View>
    );
  }
  
  return (
    <FlatList
      data={milestones}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.milestonesContainer}
      renderItem={({item}) => (
        <TouchableOpacity 
          style={styles.milestoneContainer}
          onPress={() => navigateToMilestone(item.id)}
          activeOpacity={0.9}
        >
          {/* Header */}
          <View style={styles.milestoneHeader}>
            <TouchableOpacity 
              style={styles.milestoneUserInfo}
              onPress={() => navigateToProfile(item.userId)}
            >
              <Image 
                source={{ uri: item.profileImageUrl }} 
                style={styles.milestoneProfilePic} 
              />
              <View>
                <Text style={styles.milestoneUsername}>{item.username}</Text>
                <Text style={styles.milestoneTime}>{formatTimeAgo(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.milestoneAchievementBadge}>
              <Ionicons name="trophy" size={12} color="#FFD700" />
              <Text style={styles.milestoneAchievementText}>New PR</Text>
            </View>
          </View>
          
          {/* Content */}
          <View style={styles.milestoneContent}>
            <View style={styles.milestoneIconContainer}>
              {item.milestoneType === 'PR' ? (
                <Ionicons name="barbell-outline" size={24} color="#FFF" style={styles.milestoneIcon} />
              ) : (
                <Ionicons name="fitness-outline" size={24} color="#FFF" style={styles.milestoneIcon} />
              )}
            </View>
            
            {renderMilestoneDetails(item)}
          </View>
          
          {/* Associated Post Image (if available) */}
          {item.postImageUrl && (
            <TouchableOpacity 
              style={styles.milestoneImageContainer}
              onPress={() => navigateToPost(item.associatedPostId)}
            >
              <Image source={{ uri: item.postImageUrl }} style={styles.milestoneImage} />
              <View style={styles.milestoneImageOverlay}>
                <Ionicons name="camera" size={16} color="#FFF" />
                <Text style={styles.viewPostText}>View Post</Text>
              </View>
            </TouchableOpacity>
          )}
          
          {/* Reactions */}
          <View style={styles.milestoneReactionsContainer}>
            <View style={styles.reactionButtons}>
              {['❤️', '💪', '🔥'].map(emoji => (
                <TouchableOpacity 
                  key={emoji}
                  style={[
                    styles.combinedReactionButton,
                    item.userReaction === emoji && styles.activeReactionButton
                  ]}
                  onPress={() => handleReaction(item.id, emoji)}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  {(item.reactions[emoji] && item.reactions[emoji] > 0) && (
                    <Text style={styles.reactionCount}>{item.reactions[emoji]}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* View Full Milestone Button */}
          <TouchableOpacity 
            style={styles.viewMilestoneButton}
            onPress={() => navigateToMilestone(item.id)}
          >
            <Text style={styles.viewMilestoneText}>View Details</Text>
            <Ionicons name="chevron-forward" size={14} color="#0A84FF" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    />
  );
}

function PostsScene() {
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
              <Ionicons name="barbell-outline" size={18} color="#FFF" style={styles.attachedItemIcon} />
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

export default function HomeFeed() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>(TabType.POSTS);
  const flatListRef = useRef<FlatList>(null);
  const { width: screenWidth } = Dimensions.get('window');
  
  // New animated value for indicator position
  const indicatorPosition = useRef(new Animated.Value(0)).current;
  const indicatorWidth = screenWidth / 2;
  
  // Keep track of current scroll position
  const scrollX = useRef(new Animated.Value(0)).current;

  // Handler for FlatList scroll
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  // Update indicator position based on scroll
  useEffect(() => {
    scrollX.addListener(({ value }) => {
      // Calculate the ratio of scroll position to screen width
      const ratio = value / screenWidth;
      // Set the active tab based on position
      if (ratio < 0.5) {
        setActiveTab(TabType.POSTS);
      } else {
        setActiveTab(TabType.MILESTONES);
      }
    });

    // Clean up listener on unmount
    return () => {
      scrollX.removeAllListeners();
    };
  }, []);

  function renderTopBar() {
    return (
      <View style={styles.topBar}>
        <View style={styles.logoContainer}>
          <Image source={require('@/assets/images/logo-dark.png')} style={styles.icon} />
          <Text style={globalStyles.title}>hlthy</Text>
        </View>
        <View style={styles.buttonContainer}>
          {/* Pulse Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/pulse')}
            style={styles.button}
          >
            {/* <Image source={activityIcon} style={styles.buttonIcon} /> */}
            <Ionicons name="fitness-outline" size={32} color="#FFF" />
            {/* <Ionicons name="pulse" size={32} color="#FFF" /> */}
          </TouchableOpacity>

          {/* Explore Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/explore')}
            style={styles.button}
          >
            {/* <Image source={exploreIcon} style={styles.buttonIcon} /> */}
            <Ionicons name="search" size={32} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderTabBar() {
    return (
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabButton}
          onPress={() => {
            setActiveTab(TabType.POSTS);
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
        >
          <Text style={[
            styles.tabButtonText, 
            activeTab === TabType.POSTS && styles.activeTabButtonText
          ]}>
            POSTS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tabButton}
          onPress={() => {
            setActiveTab(TabType.MILESTONES);
            flatListRef.current?.scrollToOffset({ offset: screenWidth, animated: true });
          }}
        >
          <Text style={[
            styles.tabButtonText, 
            activeTab === TabType.MILESTONES && styles.activeTabButtonText
          ]}>
            MILESTONES
          </Text>
        </TouchableOpacity>
        
        {/* Animated indicator that moves with swipe */}
        <Animated.View 
          style={[
            styles.tabIndicator,
            {
              width: indicatorWidth,
              transform: [{ 
                translateX: scrollX.interpolate({
                  inputRange: [0, screenWidth],
                  outputRange: [0, indicatorWidth],
                  extrapolate: 'clamp'
                }) 
              }]
            }
          ]}
        />
      </View>
    );
  }

  // Data for the swipeable tabs
  const tabScenes = [
    { key: 'posts', component: <PostsScene /> },
    { key: 'milestones', component: <MilestonesFeed /> }
  ];

  return (
    <View style={[globalStyles.container, { paddingTop: 0 }]}>
      {renderTopBar()}
      {renderTabBar()}
      <StatusBar style="light" />
      
      {/* Swipeable Tab Content */}
      <Animated.FlatList
        ref={flatListRef}
        data={tabScenes}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const contentOffsetX = e.nativeEvent.contentOffset.x;
          const index = Math.round(contentOffsetX / screenWidth);
          setActiveTab(index === 0 ? TabType.POSTS : TabType.MILESTONES);
        }}
        renderItem={({ item }) => (
          <View style={[styles.tabContent, { width: screenWidth }]}>
            {item.component}
          </View>
        )}
        keyExtractor={(item) => item.key}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: '#222',
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#000',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 5,
    marginRight: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  button: {
    marginLeft: 15,
  },
  buttonIcon: {
    width: 30,
    height: 30,
    borderRadius: 5,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: 'black',
    position: 'relative',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: 'white',
  },
  tabButtonText: {
    color: 'gray',
    fontSize: 13,
    fontWeight: 'bold',
  },
  activeTabButtonText: {
    color: 'white',
  },
  tabContent: {
    flex: 1,
    backgroundColor: 'black',
  },
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
  sceneContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  milestoneContainer: {
    marginBottom: 15,
    borderBottomColor: '#222',
    borderBottomWidth: 1,
    paddingBottom: 15,
  },
  milestoneContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: '#1A1A1A',
    marginHorizontal: 15,
    borderRadius: 12,
    marginBottom: 12,
  },
  milestoneIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  milestoneIcon: {
    padding: 5,
  },
  milestoneDetails: {
    flex: 1,
  },
  milestoneTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  milestoneValue: {
    color: '#DDD',
    fontSize: 14,
  },
  milestoneStat: {
    color: '#4CD964',
  },
  milestoneImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginLeft: 10,
  },
  milestoneImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  emptyMilestonesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  emptyMilestonesText: {
    color: 'gray',
    fontSize: 16,
    fontWeight: 'bold',
  },
  milestonesContainer: {
    width: '100%',
    paddingBottom: 70,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomColor: '#222',
    borderBottomWidth: 0.5,
  },
  milestoneUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  milestoneProfilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  milestoneUsername: {
    fontWeight: '600',
    fontSize: 15,
    color: '#FFF',
  },
  milestoneTime: {
    fontSize: 12,
    color: '#999',
  },
  milestoneAchievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  milestoneAchievementText: {
    fontSize: 12,
    color: '#FFD700',
    marginLeft: 4,
  },
  milestoneValueContainer: {
    flex: 1,
  },
  milestoneExercise: {
    color: '#999',
    fontSize: 13,
    marginTop: 2,
  },
  milestoneDiff: {
    fontSize: 13,
  },
  milestoneImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  viewPostText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 2,
  },
  milestoneReactionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopColor: '#222',
    borderTopWidth: 1,
  },
  reactionButtons: {
    flexDirection: 'row',
  },
  combinedReactionButton: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeReactionButton: {
    backgroundColor: '#0A84FF',
  },
  reactionEmoji: {
    fontSize: 14,
    color: '#FFF',
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    color: '#FFF',
  },
  viewMilestoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderTopColor: '#222',
    borderTopWidth: 1,
  },
  viewMilestoneText: {
    fontSize: 14,
    color: '#0A84FF',
    marginRight: 4,
  },
});