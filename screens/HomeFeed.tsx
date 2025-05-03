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
import {
  icon, 
  activityIcon, 
  exploreIcon,
  postImage,
} from '@/assets/images';
import MilestonesScene from './MilestonesScene';

enum TabType {
  POSTS = 'POSTS',
  MILESTONES = 'MILESTONES'
}

function PostsScene() {
  const router = useRouter();
  
  // Mock data for posts
  const posts = [
    {
      id: '1',
      username: 'alex_fitness',
      fullName: 'Alex Johnson',
      profilePic: 'https://randomuser.me/api/portraits/men/22.jpg',
      imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      caption: 'Just finished my morning workout session! Feeling great and ready to tackle the day. #fitness #health #motivation',
      timestamp: '20m ago',
      location: 'Fitness First Gym',
      likes: 156,
      comments: 12,
      isLiked: false,
      isBookmarked: false,
      hasAttachedWorkout: true,
      workoutTitle: 'Morning HIIT Session',
      workoutDetails: 'by Alex Johnson • 4 segments • 45min'
    },
    {
      id: '2',
      username: 'health_junkie',
      fullName: 'Sarah Williams',
      profilePic: 'https://randomuser.me/api/portraits/women/44.jpg',
      imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      caption: 'Made this protein-packed breakfast bowl to fuel my day! Featuring fresh berries, Greek yogurt, and homemade granola. #healthyeating #breakfast #nutrition',
      timestamp: '1h ago',
      location: 'Home Kitchen',
      likes: 243,
      comments: 18,
      isLiked: true,
      isBookmarked: true,
      hasAttachedWorkout: false,
    },
    {
      id: '3',
      username: 'runner_dave',
      fullName: 'Dave Peterson',
      profilePic: 'https://randomuser.me/api/portraits/men/32.jpg',
      imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      caption: 'New personal best on my 10K run today! Hard work pays off. #running #personalrecord #fitness',
      timestamp: '3h ago',
      location: 'City Park Trail',
      likes: 189,
      comments: 24,
      isLiked: false,
      isBookmarked: false,
      hasAttachedWorkout: true,
      workoutTitle: '10K Morning Run',
      workoutDetails: 'by Dave Peterson • 1 segment • 45min',
      hasMilestone: true,
      milestoneTitle: '10K Run Personal Best',
      milestoneDetails: 'Ran 10K in under 45 minutes • May 2, 2025',
    },
  ];

  const [feedPosts, setFeedPosts] = useState(posts);
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

  const navigateToWorkout = (postId: string) => {
    router.push(`/view-workout/${postId}`);
  };

  const navigateToMilestone = (postId: string) => {
    router.push(`/view-milestone/${postId}`);
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

  const renderPost = ({ item }: { item: any }) => (
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
          style={styles.actionButton}
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
      {item.hasMilestone && (
        <TouchableOpacity 
          style={styles.attachedItemContainer}
          onPress={() => navigateToMilestone(item.id)}
        >
          <View style={styles.attachedItemContent}>
            <View style={styles.attachedItemInfo}>
              <Ionicons name="trophy-outline" size={18} color="#FFF" style={styles.attachedItemIcon} />
              <View>
                <Text style={styles.attachedItemTitle}>
                  {item.milestoneTitle}
                </Text>
                <Text style={styles.attachedItemDetails}>
                  {item.milestoneDetails}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </TouchableOpacity>
      )}

      {/* Attached Workout (if exists) */}
      {item.hasAttachedWorkout && (
        <TouchableOpacity 
          style={styles.attachedItemContainer}
          onPress={() => navigateToWorkout(item.id)}
        >
          <View style={styles.attachedItemContent}>
            <View style={styles.attachedItemInfo}>
              <Ionicons name="barbell-outline" size={18} color="#FFF" style={styles.attachedItemIcon} />
              <View>
                <Text style={styles.attachedItemTitle}>
                  {item.workoutTitle}
                </Text>
                <Text style={styles.attachedItemDetails}>
                  {item.workoutDetails}
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
      <View style={[styles.topBar, { marginTop: insets.top }]}>
        <View style={styles.logoContainer}>
          <Image source={require('@/assets/images/logo-dark.png')} style={styles.icon} />
          <Text style={globalStyles.title}>hlthy</Text>
        </View>
        <View style={styles.buttonContainer}>
          {/* Explore Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/explore')}
            style={styles.button}
          >
            <Image source={exploreIcon} style={styles.buttonIcon} />
          </TouchableOpacity>

          {/* Pulse Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/pulse')}
            style={styles.button}
          >
            <Image source={activityIcon} style={styles.buttonIcon} />
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
    { key: 'milestones', component: <MilestonesScene /> }
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
    position: 'relative', // Add this to position the indicator
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
});