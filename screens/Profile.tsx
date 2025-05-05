import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, FlatList, TouchableOpacity, SafeAreaView, Animated, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { postImage } from '@/assets/images';
import { useProfileData, GroupedMilestones, Milestone } from '@/hooks/useProfileData'; // Import interfaces if needed
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

// Import archetype icons
const archetypeIcons = {
  'athlete': require('@/assets/images/athlete.png'),
  'bodybuilder': require('@/assets/images/bodybuilder.png'),
  'crossfitter': require('@/assets/images/crossfitter.png'),
  'generalist': require('@/assets/images/generalist.png'),
  'powerlifter': require('@/assets/images/powerlifter.png'),
};

// Archetype descriptions for tooltips. Should we add this to the DB?
const archetypeDescriptions = {
  'athlete': 'Balanced all-round athletic performance with focus on endurance and strength.',
  'bodybuilder': 'Focus on muscle hypertrophy, symmetry, and aesthetic physique development.',
  'crossfitter': 'High-intensity functional movements combining gymnastics, weightlifting, and cardio.',
  'generalist': 'Well-rounded fitness approach with balanced strength, cardio, and flexibility goals.',
  'powerlifter': 'Specialized in maximizing strength in the squat, bench press, and deadlift.',
};

interface Workout {
  id: number;
  name: string;
  date: Date;
  favorites: number;
}

enum TabType {
  POSTS = 'POSTS',
  MILESTONES = 'MILESTONES',
  WORKOUTS = 'WORKOUTS'
}

const Profile = () => {
  const { currentUser, userProfile, refreshUserProfile } = useAuth();
  const {
    loading,
    profileData,
    posts,
    groupedMilestones,
    workouts,
    followers,
    following,
    error,
    refreshProfileData
  } = useProfileData();
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>(TabType.POSTS);
  const flatListRef = useRef<FlatList>(null);
  const { width: screenWidth } = Dimensions.get('window');
  const tabIndicator = useRef(new Animated.Value(0)).current;
  const tabWidth = screenWidth / 3;
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipText, setTooltipText] = useState('');

  // Transform scroll position to indicator position
  const indicatorPosition = tabIndicator.interpolate({
    inputRange: [0, screenWidth, screenWidth * 2],
    outputRange: [0, tabWidth, tabWidth * 2],
    extrapolate: 'clamp'
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUserProfile();
      await refreshProfileData();
    } catch (error) {
      console.error("Error refreshing profile:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Scroll to specific tab when tab button is clicked
  const scrollToTab = (tabType: TabType) => {
    setActiveTab(tabType);
    let index = 0;
    if (tabType === TabType.POSTS) index = 0;
    else if (tabType === TabType.MILESTONES) index = 1;
    else if (tabType === TabType.WORKOUTS) index = 2;
    
    flatListRef.current?.scrollToOffset({ 
      offset: index * screenWidth,
      animated: true 
    });
  };

  // Handler for FlatList scroll
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: tabIndicator } } }],
    { useNativeDriver: false }
  );

  // Handler for FlatList scroll end
  const handleScrollEnd = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    // Map index to the appropriate tab type
    if (index === 0) setActiveTab(TabType.POSTS);
    else if (index === 1) setActiveTab(TabType.MILESTONES);
    else if (index === 2) setActiveTab(TabType.WORKOUTS);
  };

  const groupMilestonesByMonth = (milestones: Milestone[]): GroupedMilestones => {
    return milestones.reduce((groups: GroupedMilestones, milestone) => {
      // Handle potentially missing date
      if (!milestone.date) {
        const unknownGroup = 'Unknown Date';
        if (!groups[unknownGroup]) {
          groups[unknownGroup] = [];
        }
        groups[unknownGroup].push(milestone);
        return groups;
      }
      
      try {
        // Convert Firebase timestamp to Date if needed
        const dateObj = milestone.date.toDate ? milestone.date.toDate() : new Date(milestone.date);
        const adjustedDate = new Date(dateObj);
        adjustedDate.setDate(adjustedDate.getDate() + 1);
        const monthYear = adjustedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        if (!groups[monthYear]) {
          groups[monthYear] = [];
        }
        groups[monthYear].push(milestone);
      } catch (error) {
        console.log("Error processing milestone date:", error);
        // Add to 'Unknown Date' group if there's an error
        const unknownGroup = 'Unknown Date';
        if (!groups[unknownGroup]) {
          groups[unknownGroup] = [];
        }
        groups[unknownGroup].push(milestone);
      }
      
      return groups;
    }, {});
  };

  // Function to handle settings press
  const handleSettingsPress = () => {
    console.log(`Settings clicked`);
    router.push('/settings');
  };

  // Function to handle image click
  const handleImagePress = (post: any) => {
    console.log(`Image clicked - Post ID: ${post.id}`);
    
    // Navigate to view post with the actual Firebase document ID
    router.push({
      pathname: '/view-post/[id]',
      params: { id: post.id }
    });
  };

  // Function to handle milestone click
  const handleMilestonePress = (postId: string) => {
    console.log(`Milestone clicked, navigating to Post ID=${postId}`);
    // Navigate to the post view, not a dedicated milestone view unless you have one
     router.push({
       pathname: '/view-post/[id]',
       params: { id: postId }
     });
    router.push(`/view-milestone/${postId}`); // Assuming postId is the relevant ID
  };

  // Function to handle workout click
  const handleWorkoutPress = (workoutId: number) => {
    console.log(`Workout clicked, navigating to Workout ID=${workoutId}`);
    router.push({
      pathname: '/view-workout/[id]',
      params: { id: workoutId.toString() }
    });
  };

  const sortedWorkouts = [...workouts].sort((a, b) => b.date.getTime() - a.date.getTime());

  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return 'No date';
    
    // Check if it's a Firestore timestamp (has toDate method)
    if (date.toDate && typeof date.toDate === 'function') {
      try {
        return date.toDate().toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
      } catch (error) {
        console.log("Error formatting Firestore timestamp:", error);
        return 'Invalid date';
      }
    }
    
    // Regular Date object
    try {
      return new Date(date).toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (error) {
      console.log("Error formatting date:", error);
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.profileHeader}>
          <Image
            source={{ uri: userProfile?.profileImageUrl || 'https://thumbs.dreamstime.com/b/creative-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mockup-144855718.jpg' }}
            style={styles.profileImage}
          />
          <Text style={styles.profileName}>{userProfile?.displayName || 'User'}</Text>
          <Text style={styles.profileBio}>Error loading complete profile data</Text>
          
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={onRefresh}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render Posts Tab Content
  const renderPostsContent = () => (
    <FlatList
      key="posts-grid"
      data={posts}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handleImagePress(item)}>
          <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id}
      numColumns={3}
      contentContainerStyle={styles.postsContainer}
      ListEmptyComponent={
        <Text style={{ color: 'gray', textAlign: 'center', padding: 30 }}>No posts yet</Text>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FFFFFF"
          colors={["#FFFFFF"]}
          progressBackgroundColor="#212121"
        />
      }
    />
  );

  // Render Milestones Tab Content
  const renderMilestonesContent = () => {
    const monthKeys = Object.keys(groupedMilestones).sort((a, b) => {
        // Sort month keys chronologically (most recent first)
        try {
            // Attempt to parse dates for sorting
            const dateA = new Date(`01 ${a}`); // e.g., "01 May 2024"
            const dateB = new Date(`01 ${b}`); // e.g., "01 June 2024"
            return dateB.getTime() - dateA.getTime();
        } catch (e) {
            console.error("Error parsing month keys for sorting:", e);
            return 0; // Fallback to original order if parsing fails
        }
    });

    // Early return if no milestones after grouping
    if (monthKeys.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: 'gray', textAlign: 'center' }}>No milestones yet. Add a post with a milestone to see it here.</Text>
        </View>
      );
    }

    console.log("Rendering Milestones - Month Keys:", monthKeys);
    console.log("Rendering Milestones - Grouped Data:", groupedMilestones);


    return (
      <FlatList
        key="milestones-list"
        data={monthKeys}
        renderItem={({ item: month }) => (
          <View>
            <Text style={styles.monthHeader}>{month}</Text>
            {groupedMilestones[month].map((item) => (
              <TouchableOpacity
                key={item.id} // Use milestone's unique ID (which is the post ID)
                onPress={() => handleMilestonePress(item.postId)} // Pass postId (string)
                style={styles.milestoneItem}
              >
                {/* Display milestone details */}
                <View style={styles.milestoneDetail}>
                  <Text style={styles.milestoneExercise}>{item.exercise || 'Milestone'}</Text>
                </View>
                {item.reps !== undefined && item.reps > 0 && ( // Conditionally render reps if available
                   <View style={styles.milestoneDetail}>
                     <Text style={styles.milestoneNumber}>{item.reps}</Text>
                     <Text style={styles.milestoneDescriptor}>Reps</Text>
                   </View>
                )}
                <View style={styles.milestoneDetail}>
                  <Text style={styles.milestoneNumber}>{item.weight || ''}</Text>
                  {/* Conditionally render descriptor based on content */}
                  {item.weight && <Text style={styles.milestoneDescriptor}>Weight</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        keyExtractor={(item) => item} // Key is the month string
        ListEmptyComponent={ // This might be redundant now with the check above
          <Text style={{ color: 'gray', textAlign: 'center', padding: 30 }}>
            No milestones yet
          </Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={["#FFFFFF"]}
            progressBackgroundColor="#212121"
          />
        }
      />
    );
  };
  
  // Render Workouts Tab Content
  const renderWorkoutsContent = () => {
    // Early return if no workouts
    if (!workouts || workouts.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: 'gray', textAlign: 'center' }}>No workouts yet. Create a workout to see it here.</Text>
        </View>
      );
    }
  
    // Convert Firestore timestamps to Date objects and sort workouts
    const sortedWorkouts = [...workouts].sort((a, b) => {
      try {
        // Safely handle a.date being undefined or missing seconds
        let dateA;
        if (!a.date) {
          dateA = new Date(0); // Default to epoch start if no date
        } else if (a.date instanceof Date) {
          dateA = a.date;
        } else if (a.date.seconds) {
          dateA = new Date(a.date.seconds * 1000);
        } else {
          dateA = new Date(a.date);
        }
    
        // Safely handle b.date being undefined or missing seconds
        let dateB;
        if (!b.date) {
          dateB = new Date(0); // Default to epoch start if no date
        } else if (b.date instanceof Date) {
          dateB = b.date;
        } else if (b.date.seconds) {
          dateB = new Date(b.date.seconds * 1000);
        } else {
          dateB = new Date(b.date);
        }
    
        return dateB.getTime() - dateA.getTime();
      } catch (error) {
        console.error("Error sorting workout dates:", error, { a, b });
        return 0; // Keep original order on error
      }
    });
  
    return (
      <FlatList
        key="workouts-grid"
        data={sortedWorkouts}
        renderItem={({ item }) => {
          // Safely handle the date with comprehensive error checking
          let formattedDate = "No date available";
          
          try {
            if (item.date) {
              // Get a proper date object first
              let workoutDate;
              
              if (item.date instanceof Date) {
                workoutDate = item.date;
              } else if (item.date.toDate && typeof item.date.toDate === 'function') {
                // Firestore timestamp
                workoutDate = item.date.toDate();
              } else if (item.date.seconds) {
                // Old Firestore timestamp format
                workoutDate = new Date(item.date.seconds * 1000);
              } else {
                // Try regular conversion
                workoutDate = new Date(item.date);
              }
              
              formattedDate = workoutDate.toLocaleString('default', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              });
            }
          } catch (error) {
            console.log("Error formatting workout date:", error, item.date);
            formattedDate = "Invalid date";
          }
              
          return (
            <TouchableOpacity 
              key={item.id} 
              onPress={() => handleWorkoutPress(item.id)} 
              style={styles.workoutItem}
            >
              <View style={styles.workoutDetail}>
                <Text style={styles.workoutName}>{item.name || 'Unnamed Workout'}</Text>
                <Text style={styles.workoutDate}>{formattedDate}</Text>
                <Text style={styles.workoutFavorites}>
                  {item.favorites || 0} Favorites
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        contentContainerStyle={styles.workoutsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={{ color: 'gray', textAlign: 'center', padding: 30 }}>
            No workouts yet
          </Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={["#FFFFFF"]}
            progressBackgroundColor="#212121"
          />
        }
      />
    );
  };

  // Data for the swipeable tabs
  const tabScenes = [
    { key: 'posts', component: renderPostsContent() },
    { key: 'milestones', component: renderMilestonesContent() },
    { key: 'workouts', component: renderWorkoutsContent() }
  ];

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case TabType.POSTS:
        return renderPostsContent();
      case TabType.MILESTONES:
        return renderMilestonesContent();
      case TabType.WORKOUTS:
        return renderWorkoutsContent();
      default:
        return renderPostsContent();
    }
  };

  // Custom Tab Bar
  const renderCustomTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity 
        style={styles.tabButton}
        onPress={() => scrollToTab(TabType.POSTS)}
      >
        <Text style={[styles.tabButtonText, activeTab === TabType.POSTS && styles.activeTabButtonText]}>POSTS</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.tabButton}
        onPress={() => scrollToTab(TabType.MILESTONES)}
      >
        <Text style={[styles.tabButtonText, activeTab === TabType.MILESTONES && styles.activeTabButtonText]}>MILESTONES</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.tabButton}
        onPress={() => scrollToTab(TabType.WORKOUTS)}
      >
        <Text style={[styles.tabButtonText, activeTab === TabType.WORKOUTS && styles.activeTabButtonText]}>WORKOUTS</Text>
      </TouchableOpacity>
      <Animated.View style={[styles.tabIndicator, { transform: [{ translateX: indicatorPosition }] }]} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity
          style={{ position: 'absolute', top: 20, right: 20 }}
          onPress={() => handleSettingsPress()}
        >
          <Text style={{ color: 'white', backgroundColor: '#212121', padding: 5, borderRadius: 5 }}>Settings</Text>
        </TouchableOpacity>
        <Image
          source={{ uri: profileData?.profileImageUrl || 'https://thumbs.dreamstime.com/b/creative-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mockup-144855718.jpg' }}
          style={styles.profileImage}
        />
        <Text style={styles.profileName}>{profileData?.displayName || 'User'}</Text>
        <Text style={styles.profileUsername}>@{profileData?.username || 'username'}</Text>
        <Text style={styles.profileBio}>{profileData?.bio || 'No bio yet'}</Text>

        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => {
              setTooltipText(archetypeDescriptions[profileData?.archetype?.toLowerCase() || 'generalist']);
              setTooltipVisible(true);
            }}
          >
            <Image
              source={archetypeIcons[profileData?.archetype?.toLowerCase() || 'generalist']}
              style={styles.archetypeIcon}
            />
            <Text style={styles.statLabel}>Archetype</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => router.push(`/followers/${currentUser.uid}`)}
          >
            <Text style={styles.statNumber}>{followers.length}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => router.push(`/following/${currentUser.uid}`)}
          >
            <Text style={styles.statNumber}>{following.length}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tooltip Modal */}
      <Modal
        transparent={true}
        visible={tooltipVisible}
        animationType="fade"
        onRequestClose={() => setTooltipVisible(false)}
      >
        <TouchableOpacity 
          style={styles.tooltipContainer} 
          activeOpacity={1} 
          onPress={() => setTooltipVisible(false)}
        >
          <View style={styles.tooltip}>
            <View style={styles.tooltipHeader}>
              <Image
                source={archetypeIcons[profileData?.archetype?.toLowerCase() || 'generalist']}
                style={styles.tooltipIcon}
              />
              <Text style={styles.tooltipTitle}>
                {profileData?.archetype?.split(' ').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(' ') || 'Generalist'} {/* title case */}
              </Text>
            </View>
            <View style={styles.tooltipDivider} />
            <Text style={styles.tooltipText}>{tooltipText}</Text>
            <TouchableOpacity
              onPress={() => setTooltipVisible(false)}
              style={styles.tooltipCloseButton}
            >
              <Text style={styles.tooltipButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Custom Tab Bar */}
      {renderCustomTabBar()}

      {/* Swipeable Tab Content */}
      <View style={styles.tabContent}>
        <FlatList
          ref={flatListRef}
          data={tabScenes}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          renderItem={({ item }) => (
            <View style={[styles.tabContentContainer, { width: screenWidth }]}>
              {item.component}
            </View>
          )}
          keyExtractor={(item) => item.key}
          initialScrollIndex={0}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'black',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  profileUsername: {
    color: '#a6a6a6',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5
  },
  profileBio: {
    color: 'gray',
    fontSize: 16,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'gray',
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: 'black',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  tabButtonText: {
    color: 'gray',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeTabButtonText: {
    color: 'white',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: Dimensions.get('window').width / 3,
    backgroundColor: 'white',
  },
  tabContent: {
    flex: 1,
    backgroundColor: 'black',
  },
  postsContainer: {
    padding: 0,
  },
  postImage: {
    width: Dimensions.get('window').width / 3,
    height: Dimensions.get('window').width / 3,
    margin: 0,
  },
  milestoneItem: {
    backgroundColor: '#1c1c1e',
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
    marginHorizontal: 'auto',
    width: '95%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneDetail: {
    alignItems: 'center',
  },
  milestoneExercise: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  milestoneNumber: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: -5,
  },
  milestoneDescriptor: {
    color: 'gray',
    fontSize: 14,
    marginTop: 0,
    marginBottom: -5,
  },
  monthHeader: {
    color: 'white',
    fontSize: 25,
    fontWeight: 'bold',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: 'black',
    marginTop: 10
  },
  workoutItem: {
    overflow: 'hidden',
    width: Dimensions.get('window').width / 3 - 15,
    height: Dimensions.get('window').width / 3 - 15,
    borderRadius: 15,
    backgroundColor: 'grey',
    margin: 5,
    justifyContent: 'flex-end',
  },
  workoutDetail: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(50, 50, 50, 0.5)',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  workoutName: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 12,
    marginBottom: 3,
  },
  workoutDate: {
    color: '#D0D0D0',
    fontSize: 10,
  },
  workoutFavorites: {
    color: '#D0D0D0',
    fontSize: 10,
  },
  workoutsList: {
    padding: 10,
  },
  tabContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  archetypeContainer: {
    backgroundColor: '#212121',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  archetypeLabel: {
    color: 'gray',
    fontSize: 12,
    textAlign: 'center',
  },
  archetypeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  archetypeIcon: {
    width: 18,
    height: 18,
    marginBottom: 5,
  },
  tooltipContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  tooltip: {
    backgroundColor: '#333',
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    maxWidth: '80%',
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tooltipIcon: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  tooltipTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tooltipDivider: {
    height: 1,
    backgroundColor: 'white',
    width: '100%',
    marginVertical: 5,
  },
  tooltipText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  tooltipCloseButton: {
    marginTop: 10,
    backgroundColor: '#555',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  tooltipButtonText: {
    color: 'white',
    fontSize: 14,
  },
});

export default Profile;