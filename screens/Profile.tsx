import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, Text, Image, StyleSheet, Dimensions, FlatList, TouchableOpacity, SafeAreaView, Animated, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useProfileData, GroupedMilestones, Milestone } from '@/hooks/useProfileData';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { formatCount } from '@/logic/formattingFunctions';
import { BOTTOM_BAR_HEIGHT } from '@/styles/globalStyles';

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

interface ProfileScreenProps {
  userId?: string;
}

enum TabType {
  POSTS = 'POSTS',
  MILESTONES = 'MILESTONES',
  WORKOUTS = 'WORKOUTS'
}

const Profile: React.FC<ProfileScreenProps> = ({ userId: routeUserId }) => {
  const { currentUser, userProfile: currentUserProfile, refreshUserProfile } = useAuth();
  
  const {
    loading,
    profileData,
    posts,
    groupedMilestones,
    workouts,
    followers,
    following,
    error,
    refreshProfileData,
    isFollowingStatus,
    isRequestPending,
    followUser,
    unfollowUser,
    followActionLoading,
    viewedProfileId,
    createdWorkouts,
    savedWorkouts,
    loadingWorkouts,
  } = useProfileData(routeUserId);

  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>(TabType.POSTS);
  const flatListRef = useRef<FlatList>(null);
  const { width: screenWidth } = Dimensions.get('window');
  const tabIndicator = useRef(new Animated.Value(0)).current;
  const tabWidth = screenWidth / 3;
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipText, setTooltipText] = useState('');

  const isOwnProfile = !routeUserId || routeUserId === currentUser?.uid;
  const displayProfileData = isOwnProfile ? (profileData || currentUserProfile) : profileData;

  const indicatorPosition = tabIndicator.interpolate({
    inputRange: [0, screenWidth, screenWidth * 2],
    outputRange: [0, tabWidth, tabWidth * 2],
    extrapolate: 'clamp'
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (isOwnProfile) {
        await refreshUserProfile();
      }
      await refreshProfileData();
    } catch (error) {
      console.error("Error refreshing profile:", error);
    } finally {
      setRefreshing(false);
    }
  }, [isOwnProfile, refreshUserProfile, refreshProfileData]); 

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

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: tabIndicator } } }],
    { useNativeDriver: false }
  );

  const handleScrollEnd = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    if (index === 0) setActiveTab(TabType.POSTS);
    else if (index === 1) setActiveTab(TabType.MILESTONES);
    else if (index === 2) setActiveTab(TabType.WORKOUTS);
  };

  const handleSettingsPress = () => {
    console.log(`Settings clicked`);
    router.push('/settings');
  };

  const handleImagePress = useCallback((post: any) => {
    console.log(`Image clicked - Post ID: ${post.id}`);
    router.push({
      pathname: '/view-post/[id]',
      params: { id: post.id }
    });
  }, [router]);

  const handleMilestonePress = useCallback((postId: string) => {
    console.log(`Milestone clicked, navigating to Post ID=${postId}`);
     router.push({
       pathname: '/view-post/[id]', 
       params: { id: postId }
     });
  }, [router]);

  const handleWorkoutPress = useCallback((workoutId: number) => {
    console.log(`Workout clicked, navigating to Workout ID=${workoutId}`);
    router.push({
      pathname: '/view-workout/[id]',
      params: { id: workoutId.toString() }
    });
  }, [router]);

  const renderWorkoutListItem = (item: any, index: number) => ( 
    <TouchableOpacity 
        key={item.id || index} 
        style={styles.workoutItem} 
        onPress={() => router.push(`/view-workout/${item.id}`)}
    >
        <Image 
            source={item.coverImageUrl ? { uri: item.coverImageUrl } : require('@/assets/images/default_workout_cover.png')} 
            style={styles.workoutItemImage} 
        />
        <View style={styles.workoutItemTextContainer}>
            <Text style={styles.workoutItemTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.workoutItemCreator} numberOfLines={1}>by {item.creatorUsername}</Text>
        </View>
    </TouchableOpacity>
  );

  const renderWorkoutsTab = () => {
    if (loadingWorkouts && createdWorkouts.length === 0 && savedWorkouts.length === 0) {
      return <ActivityIndicator style={{ marginTop: 20 }} size="large" color="white"/>;
    }

    return (
      <ScrollView style={styles.tabContentContainer}>
        <Text style={styles.tabSectionHeader}>Created Workouts ({createdWorkouts.length})</Text>
        {createdWorkouts.length > 0 ? (
          createdWorkouts.map(renderWorkoutListItem)
        ) : (
          <Text style={styles.emptyTabText}>No workouts created yet.</Text>
        )}

        <Text style={styles.tabSectionHeader}>Saved Workouts ({savedWorkouts.length})</Text>
        {savedWorkouts.length > 0 ? (
          savedWorkouts.map(renderWorkoutListItem)
        ) : (
          <Text style={styles.emptyTabText}>No workouts saved yet.</Text>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    );
  };

  const renderPostsContent = useCallback(() => (
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
  ), [posts, refreshing, handleImagePress, onRefresh]);

  const renderMilestonesContent = useCallback(() => {
    const monthKeys = Object.keys(groupedMilestones).sort((a, b) => {
        try {
            const dateA = new Date(`01 ${a}`);
            const dateB = new Date(`01 ${b}`);
            return dateB.getTime() - dateA.getTime();
        } catch (e) { return 0; }
    });

    if (monthKeys.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, minHeight: 200 }}>
          <Text style={{ color: 'gray', textAlign: 'center' }}>No milestones yet. Add a post with a milestone to see it here.</Text>
           <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={["#FFFFFF"]}
            progressBackgroundColor="#212121"
          />
        </View>
      );
    }
    return (
      <FlatList
        key="milestones-list"
        data={monthKeys}
        renderItem={({ item: month }) => (
          <View>
            <Text style={styles.monthHeader}>{month}</Text>
            {groupedMilestones[month].map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleMilestonePress(item.postId)}
                style={styles.milestoneItem}
              >
                <View style={styles.milestoneDetail}>
                  <Text style={styles.milestoneExercise}>{item.exercise || 'Milestone'}</Text>
                </View>
                {item.reps !== undefined && item.reps > 0 && (
                   <View style={styles.milestoneDetail}>
                     <Text style={styles.milestoneNumber}>{item.reps}</Text>
                     <Text style={styles.milestoneDescriptor}>Reps</Text>
                   </View>
                )}
                <View style={styles.milestoneDetail}>
                  <Text style={styles.milestoneNumber}>{item.weight || ''}</Text>
                  {item.weight && <Text style={styles.milestoneDescriptor}>Weight</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        keyExtractor={(item) => item}
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
  }, [groupedMilestones, refreshing, handleMilestonePress, onRefresh]);
  
  const renderWorkoutsContent = useCallback(() => {
    if (loadingWorkouts && (!workouts || workouts.length === 0)) { 
        return (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, minHeight: 200 }}>
            <ActivityIndicator size="large" color="white" />
          </View>
        );
    }
    if (!workouts || workouts.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, minHeight: 200 }}>
          <Text style={{ color: 'gray', textAlign: 'center' }}>No workouts yet. Create or save a workout to see it here.</Text>
           <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFFFFF"
            colors={["#FFFFFF"]}
            progressBackgroundColor="#212121"
          />
        </View>
      );
    }
    // Sort workouts by creation date, newest first
    const sortedWorkoutsData = [...workouts].sort((a, b) => {
      try {
        // Assuming createdAt can be a Firestore Timestamp or a string/number date
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      } catch (error) { return 0; }
    });

    return (
      <FlatList
        key="workouts-list-single-column"
        data={sortedWorkoutsData}
        renderItem={({ item }) => {
          let formattedDate = "Date N/A";
          try {
            if (item.createdAt) {
              const workoutDate = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
              formattedDate = workoutDate.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              });
            }
          } catch (error) { formattedDate = "Invalid Date"; }
          
          if (!item.isPublic && !isOwnProfile) {
            return null;
          }

          return (
            <TouchableOpacity 
              key={item.id} 
              onPress={() => handleWorkoutPress(item.id)} 
              style={styles.workoutListItemRowStyle}
            >
              <Image 
                source={item.coverImageUrl ? { uri: item.coverImageUrl } : require('@/assets/images/default_workout_cover.png')} 
                style={styles.workoutListItemImageStyle} 
              />
              <View style={styles.workoutListItemTextContainerStyle}>
                <Text style={styles.workoutListItemTitleStyle} numberOfLines={2}>{item.title || 'Unnamed Workout'}</Text>
                <Text style={styles.workoutListItemMetaStyle}>{formattedDate}</Text>
                <Text style={styles.workoutListItemMetaStyle}>{item.savedCount || 0} saves</Text>
              </View>
              {item.isPublic !== true && isOwnProfile && (
                <Ionicons name="lock-closed" size={24} color="#888" />
              )}
            </TouchableOpacity>
          );
        }}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.workoutsListSingleColumn} 
        showsVerticalScrollIndicator={false}
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
  }, [workouts, refreshing, handleWorkoutPress, onRefresh, loadingWorkouts]);

  const postsTabComponent = useMemo(() => renderPostsContent(), [renderPostsContent]);
  const milestonesTabComponent = useMemo(() => renderMilestonesContent(), [renderMilestonesContent]);
  const workoutsTabComponent = useMemo(() => renderWorkoutsContent(), [renderWorkoutsContent]);

  const tabScenes = useMemo(() => [
    { key: 'posts', component: postsTabComponent },
    { key: 'milestones', component: milestonesTabComponent },
    { key: 'workouts', component: workoutsTabComponent },
  ], [postsTabComponent, milestonesTabComponent, workoutsTabComponent]);

  // Custom Tab Bar - Not a hook, so its definition order is more flexible but good to keep with related logic
  const renderCustomTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity 
        style={styles.tabButton}
        onPress={() => scrollToTab(TabType.POSTS)}
      >
        <Text style={[styles.tabButtonText, activeTab === TabType.POSTS && styles.activeTabButtonText]}>
          POSTS {posts ? `(${formatCount(posts.length)})` : '(0)'}
        </Text>
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

  const prevLoading = useRef(loading);

  useEffect(() => { 
    if (prevLoading.current === true && loading === false) {
      if (flatListRef.current) {
        let targetIndex = 0;
        if (activeTab === TabType.MILESTONES) {
          targetIndex = 1;
        } else if (activeTab === TabType.WORKOUTS) {
          targetIndex = 2;
        }
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({
            offset: targetIndex * screenWidth,
            animated: false, 
          });
        }, 0); 
      }
    }
    prevLoading.current = loading;
  }, [loading, activeTab, screenWidth]);


  // Early returns for loading and error states
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
            source={{ uri: currentUserProfile?.profileImageUrl || 'https://thumbs.dreamstime.com/b/creative-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mockup-144855718.jpg' }}
            style={styles.profileImage}
          />
          <Text style={styles.profileName}>{currentUserProfile?.displayName || 'User'}</Text>
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

  // Main return statement for the component
  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        {/* Settings Button (Own Profile) */}
        {isOwnProfile && (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={handleSettingsPress}
          >
            <Ionicons name="settings-outline" size={24} color="white" />
          </TouchableOpacity>
        )}
        {/* Back Button (Other's Profile) */}
        {!isOwnProfile && router.canGoBack() && (
           <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
        )}

        {/* Follow/Unfollow Button (Other's Profile) */}
        {!isOwnProfile && displayProfileData && (
          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowingStatus 
                ? styles.unfollowButtonActive 
                : isRequestPending // Use the new state from useProfileData
                  ? styles.requestedButtonActive // Add a new style for "Requested"
                  : styles.followButtonActive,
              followActionLoading && styles.followButtonDisabled
            ]}
            onPress={() => {
              if (followActionLoading) return;
              if (isFollowingStatus) {
                unfollowUser(displayProfileData.id); // This will also cancel a request if isFollowingStatus is false but isRequestPending is true
              } else if (isRequestPending) {
                // Optionally, allow cancelling the request by pressing "Requested" again
                // This would call unfollowUser which now handles cancelling pending requests
                unfollowUser(displayProfileData.id); 
              } else {
                followUser(displayProfileData.id);
              }
            }}
            disabled={followActionLoading}
          >
            {followActionLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.followButtonText}>
                {isFollowingStatus 
                  ? "Unfollow" 
                  : isRequestPending 
                    ? "Requested" 
                    : "Follow"}
              </Text>
            )}
          </TouchableOpacity>
        )}

        <Image
          source={{ uri: displayProfileData?.profileImageUrl || 'https://thumbs.dreamstime.com/b/creative-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mockup-144855718.jpg' }}
          style={styles.profileImage}
        />
        <Text style={styles.profileName}>{displayProfileData?.displayName || 'User'}</Text>
        <Text style={styles.profileUsername}>@{displayProfileData?.username || 'username'}</Text>
        <Text style={styles.profileBio}>{displayProfileData?.bio || 'No bio yet'}</Text>

        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => {
              if (displayProfileData?.archetype) {
                setTooltipText(archetypeDescriptions[displayProfileData.archetype.toLowerCase() || 'generalist']);
                setTooltipVisible(true);
              }
            }}
            disabled={!displayProfileData?.archetype}
          >
            <Image
              source={archetypeIcons[displayProfileData?.archetype?.toLowerCase() || 'generalist']}
              style={styles.archetypeIcon}
            />
            <Text style={styles.statLabel}>Archetype</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push(`/followers/${viewedProfileId || currentUser?.uid}`)}
          >
            <Text style={styles.statNumber}>{profileData?.followerCount !== undefined ? profileData.followerCount : followers.length}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => router.push(`/following/${viewedProfileId || currentUser?.uid}`)}
          >
            <Text style={styles.statNumber}>{profileData?.followingCount !== undefined ? profileData.followingCount : following.length}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>
      </View>

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
                source={archetypeIcons[displayProfileData?.archetype?.toLowerCase() || 'generalist']}
                style={styles.tooltipIcon}
              />
              <Text style={styles.tooltipTitle}>
                {displayProfileData?.archetype?.split(' ').map(word =>
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(' ') || 'Generalist'}
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

      {renderCustomTabBar()}

      <View style={styles.tabContent}>
        <FlatList
          ref={flatListRef}
          data={tabScenes} // tabScenes is defined above
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
  tabContentContainer: {
    paddingHorizontal: 10,
  },
  tabSectionHeader: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  emptyTabText: {
    color: 'grey',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    fontSize: 14,
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
    marginBottom: BOTTOM_BAR_HEIGHT
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
  workoutsList: {
    padding: 10,
  },
  workoutItem: {
    flexDirection: 'row',
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  workoutItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#333',
  },
  workoutItemTextContainer: {
    flex: 1,
  },
  workoutItemTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  workoutItemCreator: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },
  workoutsListSingleColumn: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  workoutListItemRowStyle: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    marginHorizontal: 10,
    justifyContent: 'space-between', 
  },
  workoutListItemImageStyle: {
    width: 70, 
    height: 70,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#333', 
  },
  workoutListItemTextContainerStyle: {
    flex: 1,
    justifyContent: 'center',
  },
  workoutListItemTitleStyle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  workoutListItemMetaStyle: {
    color: '#AEAEB2',
    fontSize: 13,
    marginBottom: 2,
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
  archetypeIcon: {
    width: 24,
    height: 24,
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
  settingsButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
    padding: 8,
  },
  backButton: {
    position: 'absolute',
    top: 15,
    left: 15,
    zIndex: 1,
    padding: 8,
  },
  followButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
  },
  followButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  unfollowButtonActive: {
    backgroundColor: 'transparent',
    borderColor: '#555',
  },
  followButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  followButtonDisabled: {
    opacity: 0.7,
  },
  archetypeText: { 
    color: 'white',
    fontSize: 13, 
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Profile;