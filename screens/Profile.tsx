import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, Text, Image, StyleSheet, Dimensions, FlatList, TouchableOpacity, SafeAreaView, Animated, ActivityIndicator, RefreshControl, Modal, Platform, ActionSheetIOS, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useProfileData } from '@/hooks/useProfileData';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCount } from '@/logic/formattingFunctions';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/firebaseConfig';
import { BOTTOM_BAR_HEIGHT } from '@/styles/globalStyles';
import { useBlockEnforcement } from '@/utils/blockUtils';
import { useUnits } from '@/hooks/useUnits';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

const archetypeIcons = {
  'athlete': require('@/assets/images/athlete.png'),
  'bodybuilder': require('@/assets/images/bodybuilder.png'),
  'crossfitter': require('@/assets/images/crossfitter.png'),
  'generalist': require('@/assets/images/generalist.png'),
  'powerlifter': require('@/assets/images/powerlifter.png'),
};

// Archetype descriptions for tooltips
const archetypeDescriptions = {
  'athlete': 'Balanced all-round athletic performance with focus on endurance and strength.',
  'bodybuilder': 'Focus on muscle hypertrophy, symmetry, and aesthetic physique development.',
  'crossfitter': 'High-intensity functional movements combining gymnastics, weightlifting, and cardio.',
  'generalist': 'Well-rounded fitness approach with balanced strength, cardio, and flexibility goals.',
  'powerlifter': 'Specialized in maximizing strength in the squat, bench press, and deadlift.',
};
import { getOptimalImageUrl, getCoverImageSource } from '@/utils/imageUtils';
import { MilestoneDetails } from '@/types/milestone';

interface ProfileScreenProps {
  userId?: string;
}

enum TabType {
  POSTS = 'POSTS',
  MILESTONES = 'MILESTONES',
  WORKOUTS = 'WORKOUTS'
}

const generateConversationId = (userId1: string, userId2: string): string => {
  // Sort user IDs alphabetically to ensure consistent conversation ID
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

const Profile: React.FC<ProfileScreenProps> = ({ userId: routeUserId }) => {
  const { currentUser, userProfile: currentUserProfile, refreshUserProfile } = useAuth();
  
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
  const { getWeightUnit, getDistanceUnit, formatWeight, formatDistance, convertWeight } = useUnits();
  const [isBlockedByUser, setIsBlockedByUser] = useState(false);
  const [hasBlockedUser, setHasBlockedUser] = useState(false);

  const displayablePosts = useMemo(() => {
    if (!posts) return [];
    // Filter out posts that are only milestones and have no image to display in the grid.
    return posts.filter(post => !!post.imageUrl);
  }, [posts]);

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
    outputRange: [0, tabWidth, tabWidth * 2],
    extrapolate: 'clamp'
  });

  const formatTimeAgo = (date: any) => {
    if (!date) return 'Just now';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    
    const seconds = Math.floor((new Date().getTime() - dateObj.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderMilestoneDetails = (milestone: { milestoneType: string, details: any }) => {
    // Helper function to check if unit is a distance unit
    const isDistanceUnit = (unit?: string): boolean => {
      return unit === 'km' || unit === 'miles';
    };

    // Helper function to check if unit is a weight unit
    const isWeightUnit = (unit?: string): boolean => {
      return unit === 'kg' || unit === 'lbs';
    };

    // Helper function for duration formatting
    const formatDuration = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      const parts: string[] = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
      parts.push(`${secs}s`);
      
      return parts.join(' ');
    };

    // Helper function for weight conversion
    const convertAndFormatWeight = (value: number, unit: string) => {
      const userPreferredUnit = getWeightUnit();
      let convertedValue = value;
      let displayUnit = unit;
      
      if (unit !== userPreferredUnit) {
        if (unit === 'kg' && userPreferredUnit === 'lbs') {
          convertedValue = Math.round(value * 2.20462 * 10) / 10;
        } else if (unit === 'lbs' && userPreferredUnit === 'kg') {
          convertedValue = Math.round(value * 0.453592 * 10) / 10;
        }
        displayUnit = userPreferredUnit;
      }
      
      return { value: Math.round(convertedValue * 10) / 10, unit: displayUnit };
    };

    // Helper function for distance conversion
    const convertAndFormatDistance = (value: number, unit: string) => {
      const userPreferredUnit = getDistanceUnit();
      let convertedValue = value;
      let displayUnit = unit;
      
      if (unit !== userPreferredUnit) {
        if (unit === 'km' && userPreferredUnit === 'miles') {
          convertedValue = Math.round(value * 0.621371 * 10) / 10;
        } else if (unit === 'miles' && userPreferredUnit === 'km') {
          convertedValue = Math.round(value * 1.60934 * 10) / 10;
        }
        displayUnit = userPreferredUnit;
      }
      
      return { value: convertedValue, unit: displayUnit };
    };

    if (milestone.milestoneType === 'PR') {
      const details = milestone.details;
      
      // Determine which metric type this PR uses (use details.value directly)
      const hasWeightReps = details.value && details.reps && details.weightUnit && isWeightUnit(details.weightUnit);
      const hasBodyweightReps = details.reps && !details.value && !details.duration && !details.level;
      const hasDuration = details.duration && !details.value && !details.level;
      const hasDurationLevel = details.duration && details.level && !details.value;
      const hasDistance = details.value && details.weightUnit && isDistanceUnit(details.weightUnit) && !details.duration;
      const hasDistanceTime = details.value && details.duration && details.weightUnit && isDistanceUnit(details.weightUnit);

      // Weight + Reps (e.g., Bench Press 225 lbs × 5 reps)
      if (hasWeightReps) {
        const converted = convertAndFormatWeight(details.value!, details.weightUnit!);
        
        return (
          <View style={styles.previousPRCard}>
            <View style={styles.previousPRHeader}>
              <MaterialCommunityIcons name="dumbbell" size={18} color="#FF5E69" />
              <Text style={styles.previousPRTitle}>
                {details.exerciseName || 'Strength PR'}
              </Text>
              <Text style={styles.previousPRDate}>{formatTimeAgo(details.date)}</Text>
            </View>
            
            <View style={styles.previousPRContent}>
              <View style={styles.prMetricsRow}>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.prMetricValue}>{converted.value}</Text>
                  <Text style={styles.prMetricLabel}>{converted.unit}</Text>
                </View>
                <Text style={styles.prMetricSeparator}>×</Text>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.prMetricValue}>{details.reps}</Text>
                  <Text style={styles.prMetricLabel}>reps</Text>
                </View>
              </View>
            </View>
          </View>
        );
      }

      // Bodyweight Reps (e.g., Push-ups 50 reps)
      if (hasBodyweightReps) {
        return (
          <View style={styles.previousPRCard}>
            <View style={styles.previousPRHeader}>
              <MaterialCommunityIcons name="human-handsup" size={18} color="#FF5E69" />
              <Text style={styles.previousPRTitle}>
                {details.exerciseName || 'Bodyweight PR'}
              </Text>
              <Text style={styles.previousPRDate}>{formatTimeAgo(details.date)}</Text>
            </View>
            
            <View style={styles.previousPRContent}>
              <View style={styles.prMetricsRow}>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.prMetricValue}>{details.reps}</Text>
                  <Text style={styles.prMetricLabel}>reps</Text>
                </View>
              </View>
            </View>
          </View>
        );
      }

      // Duration Only (e.g., Plank 3m 45s)
      if (hasDuration) {
        return (
          <View style={styles.previousPRCard}>
            <View style={styles.previousPRHeader}>
              <MaterialCommunityIcons name="timer-outline" size={18} color="#FF5E69" />
              <Text style={styles.previousPRTitle}>
                {details.exerciseName || 'Endurance PR'}
              </Text>
              <Text style={styles.previousPRDate}>{formatTimeAgo(details.date)}</Text>
            </View>
            
            <View style={styles.previousPRContent}>
              <View style={styles.prMetricsRow}>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.prMetricValue}>{formatDuration(details.duration)}</Text>
                  <Text style={styles.prMetricLabel}>time</Text>
                </View>
              </View>
            </View>
          </View>
        );
      }

      // Duration + Level (e.g., Plank Level 7: 2m 30s)
      if (hasDurationLevel) {
        return (
          <View style={styles.previousPRCard}>
            <View style={styles.previousPRHeader}>
              <MaterialCommunityIcons name="timer-sand" size={18} color="#FF5E69" />
              <Text style={styles.previousPRTitle}>
                {details.exerciseName || 'Endurance PR'}
              </Text>
              <Text style={styles.previousPRDate}>{formatTimeAgo(details.date)}</Text>
            </View>
            
            <View style={styles.previousPRContent}>
              <View style={styles.prMetricsRow}>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.prMetricValue}>{formatDuration(details.duration)}</Text>
                  <Text style={styles.prMetricLabel}>time</Text>
                </View>
              </View>
              <View style={styles.prMetricsRow}>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.prMetricValue}>Level {details.level}</Text>
                  <Text style={styles.prMetricLabel}>difficulty</Text>
                </View>
              </View>
            </View>
          </View>
        );
      }

      // Distance Only (e.g., Run 5.2 km)
      if (hasDistance) {
        const converted = convertAndFormatDistance(details.value!, details.weightUnit!);
        
        return (
          <View style={styles.previousPRCard}>
            <View style={styles.previousPRHeader}>
              <MaterialCommunityIcons name="run" size={18} color="#FF5E69" />
              <Text style={styles.previousPRTitle}>
                {details.exerciseName || 'Distance PR'}
              </Text>
              <Text style={styles.previousPRDate}>{formatTimeAgo(details.date)}</Text>
            </View>
            
            <View style={styles.previousPRContent}>
              <View style={styles.prMetricsRow}>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.prMetricValue}>{converted.value}</Text>
                  <Text style={styles.prMetricLabel}>{converted.unit}</Text>
                </View>
              </View>
            </View>
          </View>
        );
      }

      // Distance + Time (e.g., 5K in 23m 15s, pace: 4m 39s/km)
      if (hasDistanceTime) {
        const converted = convertAndFormatDistance(details.value!, details.weightUnit!);
        const pace = Math.round(details.duration! / details.value!);
        // Get the unit name without 's' if it ends with 's'
        const paceUnit = converted.unit.endsWith('s') ? converted.unit.slice(0, -1) : converted.unit;
        
        return (
          <View style={styles.previousPRCard}>
            <View style={styles.previousPRHeader}>
              <MaterialCommunityIcons name="run-fast" size={18} color="#FF5E69" />
              <Text style={styles.previousPRTitle}>
                {details.exerciseName || 'Cardio PR'}
              </Text>
              <Text style={styles.previousPRDate}>{formatTimeAgo(details.date)}</Text>
            </View>
            
            <View style={styles.previousPRContent}>
              <View style={styles.prMetricsRow}>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.prMetricValue}>{converted.value}</Text>
                  <Text style={styles.prMetricLabel}>{converted.unit}</Text>
                </View>
              </View>
              <View style={styles.prMetricsRow}>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.prMetricValue}>{formatDuration(details.duration!)}</Text>
                  <Text style={styles.prMetricLabel}>time</Text>
                </View>
              </View>
              <View style={styles.prMetricsRow}>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.prMetricValue}>{formatDuration(pace)}</Text>
                  <Text style={styles.prMetricLabel}>per {paceUnit}</Text>
                </View>
              </View>
            </View>
          </View>
        );
      }

      // Fallback for unknown PR type
      return (
        <View style={styles.previousPRCard}>
          <View style={styles.previousPRHeader}>
            <MaterialCommunityIcons name="trophy-outline" size={18} color="#FF5E69" />
            <Text style={styles.previousPRTitle}>
              {details.exerciseName || 'Personal Record'}
            </Text>
            <Text style={styles.previousPRDate}>{formatTimeAgo(details.date)}</Text>
          </View>
        </View>
      );
    } else if (milestone.milestoneType === 'weightLoss' || milestone.milestoneType === 'weightGain') {
      const isLoss = milestone.milestoneType === 'weightLoss';
      const details = milestone.details;
      
      // Parse old weight string format if it exists
      const weightString = details.weight || '';
      const weightParts = weightString.split(' ');
      const legacyWeightValue = parseFloat(weightParts[0]) || 0;
      const legacyWeightUnit = weightParts.length > 1 ? weightParts[1] : '';
      
      // Use new format if available, otherwise fall back to legacy
      const weightValue = details.newWeight || legacyWeightValue;
      const weightUnit = details.newWeightUnit || legacyWeightUnit || getWeightUnit();
      
      const converted = convertAndFormatWeight(weightValue, weightUnit);
      
      return (
        <View style={styles.previousPRCard}>
          <View style={styles.previousPRHeader}>
            <Ionicons name="fitness-outline" size={18} color="#FF5E69" />
            <Text style={styles.previousPRTitle}>{isLoss ? 'Weight Loss' : 'Weight Gain'}</Text>
            <Text style={styles.previousPRDate}>{formatTimeAgo(details.date)}</Text>
          </View>
          
          <View style={styles.previousPRContent}>
            <View style={styles.prMetricsRow}>
              <View style={styles.prMetricGroup}>
                <Text style={styles.prMetricValue}>{converted.value}</Text>
                <Text style={styles.prMetricLabel}>{converted.unit}</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }
    return null;
  };

  const handleDirectMessage = async () => {
    if (!currentUser || !displayProfileData?.id) return;
    
    const conversationId = generateConversationId(currentUser.uid, displayProfileData.id);
    
    try {
      // Check if conversation already exists
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        // Conversation exists, navigate directly
        router.push(`/chat/${conversationId}`);
      } else {
        // New conversation, navigate and let SmartChatInput handle permission checking
        router.push(`/chat/${conversationId}`);
      }
    } catch (error) {
      console.error('Error navigating to chat:', error);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
    }
  };

  const handleBlockUser = async () => {
    if (!displayProfileData?.id) return;
    const username = displayProfileData.username || 'this user';

    Alert.alert(
      'Block User',
      `Are you sure you want to block @${username}? They will not be able to interact with you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const functions = getFunctions(app, 'northamerica-northeast2');
              const blockUserFn = httpsCallable(functions, 'blockUser');
              await blockUserFn({ targetUserId: displayProfileData.id });
              
              // Refresh user profile to update blocked users list
              if (refreshUserProfile) {
                await refreshUserProfile();
              }
              
              Alert.alert('Blocked', `You have blocked @${username}.`);
              router.replace('/');
            } catch (error) {
              Alert.alert('Error', 'Failed to block user. Please try again.');
              console.error('Block user error:', error);
            }
          }
        }
      ]
    );
  };

  // Add new handleUnblockUser function
  const handleUnblockUser = async () => {
    if (!displayProfileData?.id) return;
    const username = displayProfileData.username || 'this user';

    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock @${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: async () => {
            try {
              const functions = getFunctions(app, 'northamerica-northeast2');
              const unblockUserFn = httpsCallable(functions, 'unblockUser');
              await unblockUserFn({ targetUserId: displayProfileData.id });
              Alert.alert('Success', `@${username} has been unblocked.`);
              // Refresh the profile data to update the UI
              await refreshProfileData();
            } catch (error) {
              Alert.alert('Error', 'Failed to unblock user. Please try again.');
              console.error('Unblock user error:', error);
            }
          }
        }
      ]
    );
  };

  // Show action sheet (three dots)
  const showMoreOptions = () => {
    if (!displayProfileData?.id) return;
    
    const isBlocked = isUserBlocked(displayProfileData.id);
    const actionText = isBlocked ? 'Unblock User' : 'Block User';
    const actionHandler = isBlocked ? handleUnblockUser : handleBlockUser;
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', actionText],
          destructiveButtonIndex: isBlocked ? -1 : 1,
          cancelButtonIndex: 0,
          userInterfaceStyle: 'dark',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) actionHandler();
        }
      );
    } else {
      // Android fallback
      Alert.alert(
        'More Options',
        '',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: actionText, 
            style: isBlocked ? 'default' : 'destructive', 
            onPress: actionHandler 
          }
        ]
      );
    }
  };

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

  const renderWorkoutListItem = (item: any, index: number) => ( 
    <TouchableOpacity 
      key={item.id || index} 
      style={styles.workoutItem} 
      onPress={() => router.push(`/view-workout/${item.id}`)}
    >
      <Image
        source={getCoverImageSource(item.thumbnailUrl, item.coverImageUrl)}
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
      data={displayablePosts}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handleImagePress(item)}>
          <Image source={{ uri: getOptimalImageUrl(item.thumbnailUrl, item.imageUrl) }} style={styles.postImage} />
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
  ), [displayablePosts, refreshing, handleImagePress, onRefresh]);

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
          <Text style={{ color: 'gray', textAlign: 'center' }}>No milestones yet. Add a milestone to see it here.</Text>
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
            {groupedMilestones[month].map((milestoneItem: any, idx: number) => {
              // Infer type
              let milestoneType = "PR";
              if (
                milestoneItem.exerciseName &&
                typeof milestoneItem.exerciseName === "string" &&
                milestoneItem.exerciseName.toLowerCase().includes("weight loss")
              ) {
                milestoneType = "weightLoss";
              } else if (
                milestoneItem.exerciseName &&
                typeof milestoneItem.exerciseName === "string" &&
                milestoneItem.exerciseName.toLowerCase().includes("weight gain")
              ) {
                milestoneType = "weightGain";
              }

              const milestoneForDetails = {
                milestoneType,
                details: milestoneItem
              };

              return (
                <TouchableOpacity
                  key={milestoneItem.id}
                  onPress={() => handleMilestonePress(milestoneItem.id)}
                  style={styles.milestoneItemCard}
                >
                  {renderMilestoneDetails(milestoneForDetails)}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        keyExtractor={(item) => item}
      />
    );
  }, [groupedMilestones, handleMilestonePress]);
  
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
                source={getCoverImageSource(item.thumbnailUrl, item.coverImageUrl)}
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
  }, [workouts, refreshing, handleWorkoutPress, onRefresh, loadingWorkouts, isOwnProfile]);

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
          POSTS {displayablePosts ? `(${formatCount(displayablePosts.length)})` : '(0)'}
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

  if (isBlockedByUser && !isOwnProfile) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Back Button */}
        {router.canGoBack() && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
        )}
        
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
        {!isOwnProfile && displayProfileData && !isBlockedByUser && (
          <TouchableOpacity
            style={[
              styles.followButton,
              hasBlockedUser
                ? styles.blockedButtonActive
                : isFollowingStatus 
                  ? styles.unfollowButtonActive 
                  : isRequestPending
                    ? styles.requestedButtonActive
                    : styles.followButtonActive,
              (followActionLoading || hasBlockedUser) && styles.followButtonDisabled
            ]}
            onPress={() => {
              if (followActionLoading || hasBlockedUser) return;
              if (isFollowingStatus) {
                unfollowUser(displayProfileData.id);
              } else if (isRequestPending) {
                unfollowUser(displayProfileData.id); 
              } else {
                followUser(displayProfileData.id);
              }
            }}
            disabled={followActionLoading || hasBlockedUser}
          >
            {followActionLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.followButtonText}>
                {hasBlockedUser 
                  ? "Blocked" 
                  : isFollowingStatus 
                    ? "Unfollow" 
                    : isRequestPending 
                      ? "Requested" 
                      : "Follow"}
              </Text>
            )}
          </TouchableOpacity>
        )}
        <Image
          source={{ uri: getOptimalImageUrl(
            processedProfileData?.profileThumbnailUrl,
            processedProfileData?.profileImageUrl
          ) }}
          style={styles.profileImage}
        />
        <Text style={styles.profileName}>{processedProfileData?.displayName || 'User'}</Text>
        <View style={styles.profileNameRow}>
          <Text style={styles.profileUsername}>
            @{processedProfileData?.username || 'username'}
          </Text>
          
          {/* DM Button (Other's Profile) */}
          {!isOwnProfile && displayProfileData && !isBlockedByUser && !hasBlockedUser && (
            <TouchableOpacity
              style={styles.dmButton}
              onPress={handleDirectMessage}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#007AFF" />
            </TouchableOpacity>
          )}
          
          {/* Three dots button (Other's Profile) */}
          {!isOwnProfile && displayProfileData && (
            <TouchableOpacity
              style={styles.inlineMoreButton}
              onPress={showMoreOptions}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="white" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.profileBio}>{processedProfileData?.bio || 'No bio yet'}</Text>

        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => {
              if (processedProfileData?.archetype && !isBlockedByUser) {
                setTooltipText(archetypeDescriptions[processedProfileData.archetype.toLowerCase() || 'generalist']);
                setTooltipVisible(true);
              }
            }}
            disabled={!processedProfileData?.archetype || isBlockedByUser}
          >
            <Image
              source={archetypeIcons[processedProfileData?.archetype?.toLowerCase() || 'generalist']}
              style={[styles.archetypeIcon, isBlockedByUser && styles.disabledIcon]}
            />
            <Text style={[styles.statLabel, isBlockedByUser && styles.disabledText]}>Archetype</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => {
              if (isPrivate && !isOwnProfile) return;
              if (isBlockedByUser) return;
              router.push(`/followers/${viewedProfileId}`);
            }}
            disabled={(isPrivate && !isOwnProfile) || isBlockedByUser}
          >
            <Text style={[styles.statNumber, isBlockedByUser && styles.disabledText]}>
              {isBlockedByUser ? "••" : (processedProfileData?.followerCount ?? followers.length)}
            </Text>
            <Text style={[styles.statLabel, isBlockedByUser && styles.disabledText]}>Followers</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => {
              if (isPrivate && !isOwnProfile) return;
              if (isBlockedByUser) return;
              router.push(`/following/${viewedProfileId}`);
            }}
            disabled={(isPrivate && !isOwnProfile) || isBlockedByUser}
          >
            <Text style={[styles.statNumber, isBlockedByUser && styles.disabledText]}>
              {isBlockedByUser ? "••" : (processedProfileData?.followingCount ?? following.length)}
            </Text>
            <Text style={[styles.statLabel, isBlockedByUser && styles.disabledText]}>Following</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Archetype Tooltip Modal - For all profiles */}
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
            >
              <Text style={styles.tooltipButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {renderCustomTabBar()}

      {canViewContent ? (
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
      ) : (
        <View style={styles.lockedContainer}>
          <Ionicons 
            name={isBlockedByUser ? "person-remove" : "lock-closed"} 
            size={48} 
            color="gray" 
          />
          <Text style={styles.lockedText}>
            {isBlockedByUser 
              ? "This user has restricted access to their profile" 
              : "This account is private"}
          </Text>
        </View>
      )}
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
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  dmButton: {
    marginLeft: 8,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  inlineMoreButton: {
    marginLeft: 8,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
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
  moreButton: {
    position: 'absolute',
    top: 15,
    right: 15 + 48 + 8,
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
  requestedButtonActive: {
    backgroundColor: '#444',
    borderColor: '#555',
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
  previousPRCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  previousPRHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#222',
  },
  previousPRTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  previousPRDate: {
    color: '#999',
    fontSize: 12,
  },
  previousPRContent: {
    padding: 14,
  },
  prMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  prMetricGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  prMetricValue: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '700',
  },
  prMetricLabel: {
    color: '#999',
    fontSize: 14,
    marginLeft: 4,
  },
  prMetricSeparator: {
    color: '#FF5E69',
    fontSize: 20,
    marginHorizontal: 8,
  },
  milestoneItemCard: {
    backgroundColor: '#1c1c1e',
    marginVertical: 5,
    borderRadius: 10,
    marginHorizontal: 'auto',
    width: '95%',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  detailsContainer: {
    padding: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    color: '#999',
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
    fontWeight: 'bold',
  },
  improvementValue: {
    color: '#4CD964',
    fontWeight: 'bold',
  },
  lossValue: {
    color: '#4CD964',
    fontWeight: 'bold',
  },
  gainValue: {
    color: '#FF9500',
    fontWeight: 'bold',
  },
  lockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lockedText: {
    color: 'gray',
    fontSize: 16,
    marginTop: 12,
  },
  blockedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  blockedTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  blockedSubtitle: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  blockedButtonActive: {
    backgroundColor: '#444',
    borderColor: '#666',
  },
  disabledIcon: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
    color: '#666',
  },
});

export default Profile;