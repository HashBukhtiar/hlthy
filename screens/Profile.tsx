import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, Text, Image, StyleSheet, Dimensions, FlatList, TouchableOpacity, Animated, ActivityIndicator, Modal, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useProfileData } from '@/hooks/useProfileData';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BOTTOM_BAR_HEIGHT } from '@/styles/globalStyles';
import { useBlockEnforcement } from '@/utils/blockUtils';
import { ACCENT_COLOR } from '@/constants/Colors';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { FollowersModal } from '@/components/profile/FollowersModal';
import { PostsTab, MilestonesTab, WorkoutsTab } from '@/components/profile/ProfileTabs';
import { useProfileActions } from '@/hooks/useProfileActions';
import { formatTimeAgo, archetypeDescriptions } from '@/utils/profileUtils';
import { getOptimalImageUrl } from '@/utils/imageUtils';
import { formatCount } from '@/logic/formattingFunctions';
import BottomActionMenu, { BottomActionMenuItem } from '@/components/BottomActionMenu';

const archetypeIcons = {
  'athlete': require('@/assets/images/athlete.png'),
  'bodybuilder': require('@/assets/images/bodybuilder.png'),
  'crossfitter': require('@/assets/images/crossfitter.png'),
  'generalist': require('@/assets/images/generalist.png'),
  'powerlifter': require('@/assets/images/powerlifter.png'),
};



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
  const router = useRouter();
  
  const {
    loading,
    profileData,
    posts,
    groupedMilestones,
    workouts,
    savedWorkouts,
    loadingWorkouts,
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
  } = useProfileData(routeUserId, currentUserProfile);
  const createdWorkouts = workouts || [];
  const { isUserBlocked } = useBlockEnforcement();
  
  const [isBlockedByUser, setIsBlockedByUser] = useState(false);
  const [hasBlockedUser, setHasBlockedUser] = useState(false);

  const displayablePosts = useMemo(() => {
    if (!posts) return [];
    // Filter out posts that are only milestones and have no image to display in the grid.
    return posts.filter(post => !!post.imageUrl);
  }, [posts]);

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>(TabType.POSTS);
  const flatListRef = useRef<FlatList>(null);
  const { width: screenWidth } = Dimensions.get('window');
  const tabIndicator = useRef(new Animated.Value(0)).current;
  const tabWidth = screenWidth / 3;
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipText, setTooltipText] = useState('');
  const [followersModalVisible, setFollowersModalVisible] = useState(false);
  const [followingModalVisible, setFollowingModalVisible] = useState(false);

  const indicatorWidth = screenWidth * 0.2;
  const tabCenterOffset = (screenWidth / 3 - indicatorWidth) / 2;

  const isOwnProfile = !routeUserId || routeUserId === currentUser?.uid;
  const displayProfileData = isOwnProfile ? (profileData || currentUserProfile) : profileData;

  useEffect(() => {
    if (displayProfileData?.blockedUsers && currentUser) {
      setIsBlockedByUser(displayProfileData.blockedUsers.includes(currentUser.uid));
    }
    if (currentUserProfile?.blockedUsers && displayProfileData?.id) {
      setHasBlockedUser(currentUserProfile.blockedUsers.includes(displayProfileData.id));
    }
  }, [displayProfileData, currentUserProfile, currentUser]);
  
  // Process profile data to ensure consistent count structure
  const processedProfileData = useMemo(() => {
    if (!displayProfileData) return null;
    
    return {
      ...displayProfileData,
      // Prioritize top-level counts (current Firebase structure)
      followerCount: displayProfileData.followerCount ?? displayProfileData.stats?.followerCount ?? 0,
      followingCount: displayProfileData.followingCount ?? displayProfileData.stats?.followingCount ?? 0,
      
      // Ensure stats object exists with consistent data
      stats: {
        ...displayProfileData.stats,
        followerCount: displayProfileData.followerCount ?? displayProfileData.stats?.followerCount ?? 0,
        followingCount: displayProfileData.followingCount ?? displayProfileData.stats?.followingCount ?? 0,
        postCount: displayProfileData.stats?.postCount ?? 0,
        workoutCount: displayProfileData.stats?.workoutCount ?? 0,
      }
    };
  }, [displayProfileData]);

  const profileActions = useProfileActions({
    currentUser,
    displayProfileData: processedProfileData,
    refreshUserProfile,
    refreshProfileData,
    followUser,
    unfollowUser,
    isFollowingStatus,
    isRequestPending,
    followActionLoading,
  });

  const isPrivate = processedProfileData?.profileVisibility === 'private';
  const canViewContent = useMemo(() => {
    // If blocked by the user, cannot view content
    if (isBlockedByUser && !isOwnProfile) return false;
    
    // If we've blocked the user, we can still view their profile but with limited interactions
    // (This maintains current behavior while showing block status)
    
    // Original private profile logic
    return isOwnProfile || !isPrivate || isFollowingStatus;
  }, [isOwnProfile, isPrivate, isFollowingStatus, isBlockedByUser]);

  const indicatorPosition = tabIndicator.interpolate({
    inputRange: [0, screenWidth, screenWidth * 2],
    outputRange: [
      tabCenterOffset,
      tabWidth + tabCenterOffset,
      tabWidth * 2 + tabCenterOffset
    ],
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
       pathname: '/view-milestone/[id]', 
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

  const handleArchetypeBadgePress = useCallback(() => {
    if (!isBlockedByUser && processedProfileData?.archetype) {
      setTooltipText(archetypeDescriptions[processedProfileData.archetype.toLowerCase()] || archetypeDescriptions['generalist']);
      setTooltipVisible(true);
    }
  }, [isBlockedByUser, processedProfileData]);

  const handleFollowersPress = useCallback(() => {
    if (isPrivate && !isOwnProfile) return;
    if (isBlockedByUser) return;
    setFollowersModalVisible(true);
  }, [isPrivate, isOwnProfile, isBlockedByUser]);

  const handleFollowingPress = useCallback(() => {
    if (isPrivate && !isOwnProfile) return;
    if (isBlockedByUser) return;
    setFollowingModalVisible(true);
  }, [isPrivate, isOwnProfile, isBlockedByUser]);

  const renderPostsContent = useCallback(() => (
    <PostsTab
      displayablePosts={displayablePosts}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onImagePress={handleImagePress}
    />
  ), [displayablePosts, refreshing, onRefresh, handleImagePress]);

  const renderMilestonesContent = useCallback(() => (
    <MilestonesTab
      groupedMilestones={groupedMilestones}
      onMilestonePress={handleMilestonePress}
      formatTimeAgo={formatTimeAgo}
    />
  ), [groupedMilestones, handleMilestonePress]);
  
  const renderWorkoutsContent = useCallback(() => (
    <WorkoutsTab
      workouts={workouts}
      loadingWorkouts={loadingWorkouts}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onWorkoutPress={handleWorkoutPress}
      isOwnProfile={isOwnProfile}
    />
  ), [workouts, loadingWorkouts, refreshing, onRefresh, handleWorkoutPress, isOwnProfile]);

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
        activeOpacity={0.85}
      >
        <Ionicons 
          name="grid" 
          size={20} 
          color={activeTab === TabType.POSTS ? '#FFF' : 'rgba(255,255,255,0.5)'} 
        />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.tabButton}
        onPress={() => scrollToTab(TabType.MILESTONES)}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons 
          name="trophy" 
          size={20} 
          color={activeTab === TabType.MILESTONES ? '#FFF' : 'rgba(255,255,255,0.5)'} 
        />
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.tabButton}
        onPress={() => scrollToTab(TabType.WORKOUTS)}
        activeOpacity={0.85}
      >
        <Ionicons 
          name="flame" 
          size={20} 
          color={activeTab === TabType.WORKOUTS ? '#FFF' : 'rgba(255,255,255,0.5)'} 
        />
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

  if (isBlockedByUser && !isOwnProfile) {
    return (
      <SafeAreaView style={styles.container}>
        
        <View style={styles.blockedContainer}>
          <Ionicons name="person-remove" size={64} color="#666" />
          <Text style={styles.blockedTitle}>User Not Available</Text>
          <Text style={styles.blockedSubtitle}>
            This user has restricted access to their profile.
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.profileHeader}>
          {/* Settings Button (Own Profile) - even in error state */}
          {isOwnProfile && (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={handleSettingsPress}
              activeOpacity={0.85}
            >
              <Ionicons name="settings-outline" size={24} color="white" />
            </TouchableOpacity>
          )}
          {/* Back Button (Other's Profile) */}
          {!isOwnProfile && router.canGoBack() && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={28} color="white" />
            </TouchableOpacity>
          )}
          <Image
            source={{
              uri: getOptimalImageUrl(
                processedProfileData?.profileThumbnailUrl,
                processedProfileData?.profileImageUrl
              ),
              cache: 'reload'
            }}
            style={styles.profileImage}
            key={processedProfileData?.profileImageUrl || 'default-profile'}
          />
          <Text style={styles.profileName}>{currentUserProfile?.displayName || 'User'}</Text>
          <Text style={styles.profileBio}>Error loading complete profile data</Text>
          
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={onRefresh}
            activeOpacity={0.85}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  // Main return statement for the component
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        bounces={false}
        overScrollMode="never"
      >
        {/* Profile Header */}
        <ProfileHeader
          profileData={processedProfileData}
          isOwnProfile={isOwnProfile}
          isFollowingStatus={isFollowingStatus}
          isRequestPending={isRequestPending}
          followActionLoading={followActionLoading}
          hasBlockedUser={hasBlockedUser}
          isBlockedByUser={isBlockedByUser}
          displayablePosts={displayablePosts}
          followers={followers}
          following={following}
          viewedProfileId={viewedProfileId}
          isPrivate={isPrivate}
          canGoBack={router.canGoBack()}
          onBack={() => router.back()}
          onSettings={handleSettingsPress}
          onMoreOptions={profileActions.showMoreOptions}
          onDirectMessage={profileActions.handleDirectMessage}
          onFollowAction={profileActions.handleFollowAction}
          onArchetypeBadgePress={handleArchetypeBadgePress}
          onFollowersPress={handleFollowersPress}
          onFollowingPress={handleFollowingPress}
          onViewProfileCard={() => router.push(`/view-profile-card/${viewedProfileId}`)}
        />

        {/* Tab Bar */}
        <View style={{ width: '100%' }}>
          {renderCustomTabBar()}
        </View>

        {/* Tab Content */}
        {canViewContent ? (
          <View style={styles.tabContentInline}>
            <FlatList
              ref={flatListRef}
              data={tabScenes}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              onMomentumScrollEnd={handleScrollEnd}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              renderItem={({ item }) => (
                <View style={[styles.tabContentContainer, { width: screenWidth }]}>
                  {item.component}
                </View>
              )}
              keyExtractor={(item) => item.key}
              initialScrollIndex={0}
            />
          </View>
        ) : (
          <View style={styles.lockedContainer}>
            <View style={styles.lockedIconContainer}>
              <Ionicons 
                name={isBlockedByUser ? "person-remove" : "lock-closed"} 
                size={32} 
                color="#666" 
              />
            </View>
            <Text style={styles.lockedTitle}>
              {isBlockedByUser 
                ? "Profile Unavailable" 
                : "Private Account"}
            </Text>
            <Text style={styles.lockedSubtitle}>
              {isBlockedByUser 
                ? "This user has restricted access to their profile" 
                : "Follow to see their posts and content"}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Archetype Tooltip Modal */}
      <Modal
        transparent={true}
        visible={tooltipVisible}
        animationType="fade"
        onRequestClose={() => setTooltipVisible(false)}
      >
        <TouchableOpacity
          style={styles.tooltipOverlay}
          activeOpacity={0.85}
          onPress={() => setTooltipVisible(false)}
        >
          <View style={styles.tooltipCard}>
            <View style={styles.tooltipHeader}>
              <Image
                source={archetypeIcons[processedProfileData?.archetype?.toLowerCase() || 'generalist']}
                style={styles.tooltipIcon}
              />
              <Text style={styles.tooltipTitle}>
                {processedProfileData?.archetype?.split(' ').map(word =>
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(' ') || 'Generalist'}
              </Text>
            </View>
            <View style={styles.tooltipDivider} />
            <Text style={styles.tooltipText}>{tooltipText}</Text>
            <TouchableOpacity
              onPress={() => setTooltipVisible(false)}
              style={styles.tooltipCloseButton}
              activeOpacity={0.85}
            >
              <Text style={styles.tooltipButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Profile Action Menu */}
      <BottomActionMenu
        visible={profileActions.showActionMenu}
        onClose={() => profileActions.setShowActionMenu(false)}
        items={[
          {
            icon: "id-card-outline",
            label: "View Profile Card",
            sublabel: "See their hlthy profile card",
            color: "#AF52DE",
            backgroundColor: "rgba(175, 82, 222, 0.22)",
            onPress: () => {
              profileActions.setShowActionMenu(false);
              router.push(`/view-profile-card/${viewedProfileId}`);
            },
          },
          {
            icon: "chatbubble-outline",
            label: "Message",
            sublabel: `Send a direct message`,
            color: "#0A84FF",
            backgroundColor: "rgba(10, 132, 255, 0.22)",
            onPress: profileActions.handleDirectMessage,
          },
          {
            icon: isFollowingStatus ? "person-remove-outline" : "person-add-outline",
            label: isFollowingStatus ? "Unfollow" : "Follow",
            sublabel: isFollowingStatus ? "Stop seeing posts from this user" : "See more from this user",
            color: isFollowingStatus ? "#FF453A" : "#30D158",
            backgroundColor: isFollowingStatus ? "rgba(255, 69, 58, 0.22)" : "rgba(48, 209, 88, 0.22)",
            onPress: profileActions.handleFollowAction,
          },
          {
            icon: "ban-outline",
            label: hasBlockedUser ? "Unblock User" : "Block User",
            sublabel: hasBlockedUser ? "You will see their content again" : "You won't see their content",
            color: "#FF9F0A",
            backgroundColor: "rgba(255, 159, 10, 0.22)",
            onPress: hasBlockedUser ? profileActions.handleUnblockUser : profileActions.handleBlockUser,
          },
          {
            icon: "flag-outline",
            label: "Report",
            sublabel: "Report inappropriate content",
            color: "#FF453A",
            backgroundColor: "rgba(255, 69, 58, 0.22)",
            onPress: profileActions.handleReportUser,
          },
        ]}
      />

      {/* Followers Modal */}
      <FollowersModal
        visible={followersModalVisible}
        onClose={() => setFollowersModalVisible(false)}
        userId={viewedProfileId}
        type="followers"
        onUserPress={(userId) => router.push(`/profile/${userId}`)}
      />

      {/* Following Modal */}
      <FollowersModal
        visible={followingModalVisible}
        onClose={() => setFollowingModalVisible(false)}
        userId={viewedProfileId}
        type="following"
        onUserPress={(userId) => router.push(`/profile/${userId}`)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  
  // Header Section
  headerSection: {
    width: '100%',
  },
  
  // Banner
  bannerContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  bannerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  
  // Top Navigation
  topNavigation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  navButtonBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  navSpacer: {
    flex: 1,
  },
  
  // Profile Info Section
  profileInfoSection: {
    paddingHorizontal: 16,
    paddingTop: 0,
    marginTop: -50,
  },
  
  // Profile Top Row
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#000',
    backgroundColor: '#1C1C1E',
  },
  archetypeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1C1C1E',
    borderWidth: 2.5,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  archetypeBadgeIcon: {
    width: 18,
    height: 18,
  },
  
  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followButtonNew: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  followButtonStyle: {
    backgroundColor: ACCENT_COLOR,
  },
  followingButtonStyle: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  requestedButtonStyle: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  blockedButtonStyle: {
    backgroundColor: 'rgba(255,59,48,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.3)',
  },
  followButtonTextNew: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  followButtonTextSecondary: {
    color: 'rgba(255,255,255,0.8)',
  },
  editProfileButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  editProfileButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Name Section
  nameSection: {
    marginBottom: 8,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: -0.3,
  },
  username: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  
  // Bio
  bio: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    marginBottom: 14,
  },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  statItemNew: {
    flex: 1,
    alignItems: 'center',
  },
  statValueNew: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  statLabelNew: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 3,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activeTabButtonText: {
    color: '#FFF',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: Dimensions.get('window').width * 0.2,
    backgroundColor: ACCENT_COLOR,
    borderRadius: 1.5,
  },
  
  // Tab Content
  tabContent: {
    flex: 1,
    backgroundColor: '#000',
    marginBottom: BOTTOM_BAR_HEIGHT,
  },
  tabContentInline: {
    minHeight: 400,
    backgroundColor: '#000',
  },
  tabContentContainer: {
    paddingHorizontal: 0,
  },
  
  // Posts Grid
  postsContainer: {
    padding: 0,
  },
  postImage: {
    width: Dimensions.get('window').width / 3,
    height: Dimensions.get('window').width / 3,
    margin: 0,
  },
  
  // Locked Content
  lockedContainer: {
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  lockedIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
  },
  lockedText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  
  // Tooltip Modal
  tooltipOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  tooltipCard: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tooltipIcon: {
    width: 36,
    height: 36,
    marginRight: 12,
  },
  tooltipTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  tooltipDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
    marginBottom: 16,
  },
  tooltipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  tooltipCloseButton: {
    backgroundColor: ACCENT_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 25,
  },
  tooltipButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  
  // Milestones
  monthHeader: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '700',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#000',
    marginTop: 8,
  },
  milestoneItemCard: {
    backgroundColor: '#1C1C1E',
    marginVertical: 6,
    borderRadius: 16,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  previousPRCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  previousPRHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  previousPRTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
  previousPRDate: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  previousPRContent: {
    padding: 16,
  },
  prMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  prMetricGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  prMetricValue: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '700',
  },
  prMetricLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    marginLeft: 6,
  },
  prMetricSeparator: {
    color: ACCENT_COLOR,
    fontSize: 22,
    marginHorizontal: 10,
  },
  
  // Workouts
  workoutsListSingleColumn: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  workoutListItemRowStyle: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  workoutListItemImageStyle: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: '#2C2C2E',
  },
  workoutListItemTextContainerStyle: {
    flex: 1,
    justifyContent: 'center',
  },
  workoutListItemTitleStyle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  workoutListItemMetaStyle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginBottom: 2,
  },
  workoutItem: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  workoutItemImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#2C2C2E',
  },
  workoutItemTextContainer: {
    flex: 1,
  },
  workoutItemTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  workoutItemCreator: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 4,
  },
  workoutsList: {
    padding: 12,
  },
  
  // Tab Section Headers
  tabSectionHeader: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  emptyTabText: {
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
    fontSize: 15,
  },
  
  // Legacy styles kept for compatibility
  profileHeader: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  profileName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '700',
    marginVertical: 10,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  dmButton: {
    marginLeft: 8,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderRadius: 8,
  },
  inlineMoreButton: {
    marginLeft: 8,
    padding: 6,
  },
  profileUsername: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 5,
  },
  profileBio: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  settingsButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
    padding: 8,
  },
  moreButton: {
    position: 'absolute',
    top: 15,
    right: 67,
    zIndex: 1,
    padding: 8,
  },
  followButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  followButtonActive: {
    backgroundColor: ACCENT_COLOR,
    borderColor: ACCENT_COLOR,
  },
  unfollowButtonActive: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  followButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  followButtonDisabled: {
    opacity: 0.6,
  },
  requestedButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  archetypeContainer: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  archetypeLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
  },
  archetypeIcon: {
    width: 28,
    height: 28,
    marginBottom: 6,
  },
  archetypeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: ACCENT_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 25,
    marginTop: 16,
  },
  retryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  blockedTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  blockedSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  blockedButtonActive: {
    backgroundColor: 'rgba(255,59,48,0.2)',
    borderColor: 'rgba(255,59,48,0.4)',
  },
  disabledIcon: {
    opacity: 0.4,
  },
  disabledText: {
    opacity: 0.4,
    color: 'rgba(255,255,255,0.4)',
  },
  milestoneItem: {
    backgroundColor: '#1C1C1E',
    padding: 16,
    marginVertical: 6,
    borderRadius: 14,
    marginHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneDetail: {
    alignItems: 'center',
  },
  milestoneExercise: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  milestoneNumber: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '700',
  },
  milestoneDescriptor: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  detailsContainer: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  detailValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  highlightedValue: {
    color: '#4CD964',
    fontWeight: '700',
  },
  improvementValue: {
    color: '#4CD964',
    fontWeight: '700',
  },
  lossValue: {
    color: '#4CD964',
    fontWeight: '700',
  },
  gainValue: {
    color: '#FF9500',
    fontWeight: '700',
  },
  tooltip: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    maxWidth: '85%',
  },
  tooltipContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
});

export default Profile;