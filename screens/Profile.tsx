import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, ScrollView, Text, Image, StyleSheet, Dimensions, FlatList, TouchableOpacity, SafeAreaView, Animated, ActivityIndicator, RefreshControl, Modal, Platform, ActionSheetIOS, Alert, StatusBar, ImageBackground } from 'react-native';
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
import { OptimizedImageLight } from '@/components/OptimizedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ACCENT_COLOR } from '@/constants/Colors';

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
import { getOptimalImageUrl, getCoverImageSource, DEFAULT_PROFILE_IMAGE } from '@/utils/imageUtils';
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

    // **FIX: Parse the weight string from useProfileData hook format**
    const parseWeightString = (weightStr?: string) => {
      if (!weightStr) return { value: null, unit: null };
      const parts = weightStr.split(' ');
      const value = parseFloat(parts[0]);
      const unit = parts[1] || null;
      return { value: isNaN(value) ? null : value, unit };
    };

    if (milestone.milestoneType === 'PR') {
      const details = milestone.details;
      
      // **FIX: Handle both old format (weight string) and new format (value + weightUnit)**
      const parsedWeight = parseWeightString(details.weight);
      const actualValue = details.value ?? parsedWeight.value;
      const actualWeightUnit = details.weightUnit ?? parsedWeight.unit;
      const actualReps = details.reps;
      const actualDuration = details.duration;
      const actualLevel = details.level;
      const actualDistance = details.distance;
      const actualDistanceUnit = details.distanceUnit;
      
      // Determine which metric type this PR uses
      const hasWeightReps = actualValue && actualReps && actualWeightUnit && isWeightUnit(actualWeightUnit);
      const hasBodyweightReps = actualReps && !actualValue && !actualDuration && !actualLevel;
      const hasDuration = actualDuration && !actualValue && !actualLevel;
      const hasDurationLevel = actualDuration && actualLevel && !actualValue;
      const hasDistance = (actualValue && actualWeightUnit && isDistanceUnit(actualWeightUnit) && !actualDuration) ||
                        (actualDistance && actualDistanceUnit && !actualDuration);
      const hasDistanceTime = ((actualValue && actualDuration && actualWeightUnit && isDistanceUnit(actualWeightUnit)) ||
                              (actualDistance && actualDistanceUnit && actualDuration));

      // Weight + Reps (e.g., Bench Press 225 lbs × 5 reps)
      if (hasWeightReps) {
        const converted = convertAndFormatWeight(actualValue!, actualWeightUnit!);
        
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
                  <Text style={styles.prMetricValue}>{actualReps}</Text>
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
                  <Text style={styles.prMetricValue}>{actualReps}</Text>
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
                  <Text style={styles.prMetricValue}>{formatDuration(actualDuration)}</Text>
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
                  <Text style={styles.prMetricValue}>{formatDuration(actualDuration)}</Text>
                  <Text style={styles.prMetricLabel}>time</Text>
                </View>
              </View>
              <View style={styles.prMetricsRow}>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.prMetricValue}>Level {actualLevel}</Text>
                  <Text style={styles.prMetricLabel}>difficulty</Text>
                </View>
              </View>
            </View>
          </View>
        );
      }

      // Distance Only (e.g., Run 5.2 km)
      if (hasDistance) {
        const distValue = actualDistance || actualValue!;
        const distUnit = actualDistanceUnit || actualWeightUnit!;
        const converted = convertAndFormatDistance(distValue, distUnit);
        
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
        const distValue = actualDistance || actualValue!;
        const distUnit = actualDistanceUnit || actualWeightUnit!;
        const converted = convertAndFormatDistance(distValue, distUnit);
        const pace = distValue > 0 ? Math.round(actualDuration! / distValue) : 0;
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
                  <Text style={styles.prMetricValue}>{formatDuration(actualDuration!)}</Text>
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
      activeOpacity={0.85}
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
        <TouchableOpacity onPress={() => handleImagePress(item)} activeOpacity={0.85}>
          <OptimizedImageLight 
            thumbnailUrl={item.thumbnailUrl} 
            originalUrl={item.imageUrl} 
            style={styles.postImage} 
          />
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, minHeight: 200 }}>
          <Ionicons name="trophy-outline" size={36} color="#666" style={{ marginBottom: 12 }} />
          <Text style={{ 
            color: '#FFF', 
            fontSize: 18,
            fontWeight: '600',
            marginBottom: 6,
            textAlign: 'center' 
          }}>No Milestones Yet</Text>
          <Text style={{ 
            color: '#8E8E93', 
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 20,
            maxWidth: 260
          }}>Track your fitness journey by adding milestones.</Text>
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
                  activeOpacity={0.85}
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
              activeOpacity={0.85}
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
        activeOpacity={0.85}
      >
        <Ionicons 
          name="grid" 
          size={22} 
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
          size={22} 
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
          size={22} 
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
        {/* Back Button */}
        {router.canGoBack() && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.85}
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
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        style={styles.scrollView}
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
        stickyHeaderIndices={[1]}
      >
        {/* Banner Section with Profile Info Overlay */}
        <View style={styles.headerSection}>
          {/* Banner Image */}
          <View style={styles.bannerContainer}>
            <Image
              source={{ 
                uri: processedProfileData?.bannerImageUrl || 
                     'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'
              }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.2)']}
              locations={[0, 1]}
              style={styles.bannerGradient}
            />
            
            {/* Top Navigation Buttons */}
            <SafeAreaView style={styles.topNavigation}>
              {!isOwnProfile && router.canGoBack() && (
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() => router.back()}
                  activeOpacity={0.85}
                >
                  <BlurView intensity={30} tint="dark" style={styles.navButtonBlur}>
                    <Ionicons name="chevron-back" size={24} color="white" />
                  </BlurView>
                </TouchableOpacity>
              )}
              
              <View style={styles.navSpacer} />
              
              {isOwnProfile ? (
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={handleSettingsPress}
                  activeOpacity={0.85}
                >
                  <BlurView intensity={30} tint="dark" style={styles.navButtonBlur}>
                    <Ionicons name="settings-outline" size={22} color="white" />
                  </BlurView>
                </TouchableOpacity>
              ) : displayProfileData && (
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={showMoreOptions}
                  activeOpacity={0.85}
                >
                  <BlurView intensity={30} tint="dark" style={styles.navButtonBlur}>
                    <Ionicons name="ellipsis-horizontal" size={22} color="white" />
                  </BlurView>
                </TouchableOpacity>
              )}
            </SafeAreaView>
          </View>
          
          {/* Profile Info Section */}
          <View style={styles.profileInfoSection}>
            {/* Profile Image & Actions Row */}
            <View style={styles.profileTopRow}>
              {/* Profile Image */}
              <View style={styles.profileImageWrapper}>
                <Image
                  source={{ 
                    uri: getOptimalImageUrl(
                      processedProfileData?.profileThumbnailUrl,
                      processedProfileData?.profileImageUrl
                    )
                  }}
                  style={styles.profileImage}
                />
                {/* Archetype Badge */}
                {processedProfileData?.archetype && (
                  <TouchableOpacity 
                    style={styles.archetypeBadge}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (!isBlockedByUser) {
                        setTooltipText(archetypeDescriptions[processedProfileData.archetype.toLowerCase() || 'generalist']);
                        setTooltipVisible(true);
                      }
                    }}
                  >
                    <Image
                      source={archetypeIcons[processedProfileData?.archetype?.toLowerCase() || 'generalist']}
                      style={styles.archetypeBadgeIcon}
                    />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Action Buttons */}
              <View style={styles.actionButtonsContainer}>
                {!isOwnProfile && displayProfileData && !isBlockedByUser && !hasBlockedUser && (
                  <TouchableOpacity
                    style={styles.messageButton}
                    onPress={handleDirectMessage}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="mail-outline" size={20} color="#FFF" />
                  </TouchableOpacity>
                )}
                
                {!isOwnProfile && displayProfileData && !isBlockedByUser && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[
                      styles.followButtonNew,
                      hasBlockedUser
                        ? styles.blockedButtonStyle
                        : isFollowingStatus 
                          ? styles.followingButtonStyle 
                          : isRequestPending
                            ? styles.requestedButtonStyle
                            : styles.followButtonStyle,
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
                      <Text style={[
                        styles.followButtonTextNew,
                        (isFollowingStatus || isRequestPending) && styles.followButtonTextSecondary
                      ]}>
                        {hasBlockedUser 
                          ? "Blocked" 
                          : isFollowingStatus 
                            ? "Following" 
                            : isRequestPending 
                              ? "Requested" 
                              : "Follow"}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                
                {isOwnProfile && (
                  <TouchableOpacity
                    style={styles.editProfileButton}
                    onPress={() => router.push('/settings')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* Name & Username */}
            <View style={styles.nameSection}>
              <Text style={styles.displayName}>{processedProfileData?.displayName || 'User'}</Text>
              <Text style={styles.username}>@{processedProfileData?.username || 'username'}</Text>
            </View>
            
            {/* Bio */}
            {processedProfileData?.bio && (
              <Text style={styles.bio}>{processedProfileData.bio}</Text>
            )}
            
            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItemNew}>
                <Text style={styles.statValueNew}>
                  {formatCount(displayablePosts?.length || 0)}
                </Text>
                <Text style={styles.statLabelNew}>Posts</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <TouchableOpacity
                style={styles.statItemNew}
                activeOpacity={0.85}
                onPress={() => {
                  if (isPrivate && !isOwnProfile) return;
                  if (isBlockedByUser) return;
                  router.push(`/followers/${viewedProfileId}`);
                }}
                disabled={(isPrivate && !isOwnProfile) || isBlockedByUser}
              >
                <Text style={styles.statValueNew}>
                  {isBlockedByUser ? "••" : formatCount(processedProfileData?.followerCount ?? followers.length)}
                </Text>
                <Text style={styles.statLabelNew}>Followers</Text>
              </TouchableOpacity>
              
              <View style={styles.statDivider} />
              
              <TouchableOpacity
                style={styles.statItemNew}
                activeOpacity={0.85}
                onPress={() => {
                  if (isPrivate && !isOwnProfile) return;
                  if (isBlockedByUser) return;
                  router.push(`/following/${viewedProfileId}`);
                }}
                disabled={(isPrivate && !isOwnProfile) || isBlockedByUser}
              >
                <Text style={styles.statValueNew}>
                  {isBlockedByUser ? "••" : formatCount(processedProfileData?.followingCount ?? following.length)}
                </Text>
                <Text style={styles.statLabelNew}>Following</Text>
              </TouchableOpacity>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItemNew}>
                <Text style={styles.statValueNew}>
                  {formatCount(processedProfileData?.stats?.totalWorkouts || 0)}
                </Text>
                <Text style={styles.statLabelNew}>Workouts</Text>
              </View>
            </View>
          </View>
        </View>

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
    height: 100,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
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
    paddingHorizontal: 20,
    paddingTop: 0,
    marginTop: -40,
  },
  
  // Profile Top Row
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: '#000',
    backgroundColor: '#1C1C1E',
  },
  archetypeBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    borderWidth: 3,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  archetypeBadgeIcon: {
    width: 20,
    height: 20,
  },
  
  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followButtonNew: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 110,
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
    fontSize: 15,
    fontWeight: '600',
  },
  followButtonTextSecondary: {
    color: 'rgba(255,255,255,0.8)',
  },
  editProfileButton: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  editProfileButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Name Section
  nameSection: {
    marginBottom: 12,
  },
  displayName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  username: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  
  // Bio
  bio: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: 20,
  },
  
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  statItemNew: {
    flex: 1,
    alignItems: 'center',
  },
  statValueNew: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  statLabelNew: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 32,
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
    paddingVertical: 14,
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
    width: Dimensions.get('window').width / 3,
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
    marginTop: 20,
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