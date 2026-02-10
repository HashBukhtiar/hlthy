import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import ShareModal from '@/components/ShareModal';
import { shareMilestone } from '@/services/ShareService';
import { useAuth } from '@/context/AuthContext';
import { useFeedData } from '@/hooks/useFeedData';
import { usePostsData } from '@/hooks/usePostsData';
import { getOptimalImageUrl } from '@/utils/imageUtils';
import { useBlockEnforcement } from '@/utils/blockUtils';
import { FeedMilestone, MilestoneDetails, MilestoneStats } from '@/types/milestone';
import { useUnits } from '@/hooks/useUnits';
import PostActionMenu from '@/components/PostActionMenu';
import { useContentActions } from '@/hooks/useContentActions';
import { ACCENT_COLOR } from '@/constants/Colors';

console.log('[MilestonesFeed] Module loaded');

export default function MilestonesFeed() {
  console.log('[MilestonesFeed] Component rendering');
  const router = useRouter();
  const { currentUser, userProfile } = useAuth();
  const { milestones: feedMilestones, loading, refreshing, loadingMore, hasMore, error, refreshFeed, loadMorePosts } = useFeedData();
  const { likePost, unlikePost } = usePostsData();
  const { canInteractWithUser, isUserBlocked } = useBlockEnforcement();
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const milestoneToShare = useRef<FeedMilestone | null>(null);
  const { getWeightUnit, getDistanceUnit } = useUnits();
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [selectedMilestoneForAction, setSelectedMilestoneForAction] = useState<FeedMilestone | null>(null);
  // Local state for optimistic updates
  const [milestones, setMilestones] = useState<typeof feedMilestones>([]);

  // Use shared content actions hook
  const { 
    handleToggleFollowFromMenu, 
    handleBlockUser, 
    handleReportContent: handleReportMilestone 
  } = useContentActions({
    selectedItem: selectedMilestoneForAction,
    currentUser,
    setSelectedItem: setSelectedMilestoneForAction,
    updateItems: setMilestones,
    refreshFeed,
    contentType: 'milestone',
  });

  // Update local milestones when feedMilestones change
  useEffect(() => {
    setMilestones(feedMilestones);
  }, [feedMilestones]);

  // Format duration in seconds to human-readable format (must be defined before renderMilestoneDetails)
  const formatDuration = useCallback((durationSeconds: number): string => {
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const seconds = durationSeconds % 60;
    
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0 || hours > 0) result += `${minutes}m `;
    result += `${seconds}s`;
    
    return result.trim();
  }, []);

  // Format the time as "X time ago"
  const formatTimeAgo = useCallback((date: any): string => {
    if (!date) return 'Just now';
    
    const timestamp = date.toDate ? date.toDate() : new Date(date);
    const seconds = Math.floor((new Date().getTime() - timestamp.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return timestamp.toLocaleDateString();
  }, []);
  
  // Format the date as "Month Day"
  const formatDate = useCallback((date: any): string => {
    if (!date) return '';
    
    const timestamp = date.toDate ? date.toDate() : new Date(date);
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
    return timestamp.toLocaleDateString('en-US', options);
  }, []);
  
  const handleLike = useCallback(async (milestoneId: string, isCurrentlyLiked: boolean) => {
    if (!currentUser || !userProfile) {
      Alert.alert('Please log in', 'You need to be logged in to like milestones.');
      return;
    }

    // Haptic feedback
    Haptics.impactAsync(isCurrentlyLiked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);

    // Configure smooth animation (exclude opacity to avoid TouchableOpacity conflicts)
    LayoutAnimation.configureNext({
      duration: 200,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.scaleXY,
      },
    });

    // Optimistic update - update UI immediately
    setMilestones(prevMilestones => 
      prevMilestones.map(milestone => 
        milestone.id === milestoneId 
          ? {
              ...milestone,
              isLiked: !isCurrentlyLiked,
              reactionCount: isCurrentlyLiked 
                ? Math.max(0, (milestone.reactionCount || 0) - 1)
                : (milestone.reactionCount || 0) + 1
            }
          : milestone
      )
    );

    try {
      if (isCurrentlyLiked) {
        await unlikePost(milestoneId);
      } else {
        await likePost(milestoneId);
      }
    } catch (error) {
      console.error('Error toggling milestone like:', error);
      // Animate the revert as well
      LayoutAnimation.configureNext({
        duration: 200,
        update: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.scaleXY,
        },
      });
      // Revert optimistic update on error
      setMilestones(prevMilestones => 
        prevMilestones.map(milestone => 
          milestone.id === milestoneId 
            ? {
                ...milestone,
                isLiked: isCurrentlyLiked,
                reactionCount: isCurrentlyLiked 
                  ? (milestone.reactionCount || 0) + 1
                  : Math.max(0, (milestone.reactionCount || 0) - 1)
              }
            : milestone
        )
      );
      Alert.alert('Error', 'Could not update like status. Please try again.');
    }
  }, [currentUser, userProfile, likePost, unlikePost]);
  
  const navigateToMilestone = useCallback((id: string) => {
    router.push(`/view-milestone/${id}`);
  }, [router]);
  
  const navigateToPost = useCallback((id: string) => {
    if (id) {
      router.push(`/view-post/${id}`);
    }
  }, [router]);
  
  const navigateToProfile = useCallback((userId: string) => {
    router.push(`/profile/${userId}`);
  }, [router]);

  const handleShare = useCallback((milestone: FeedMilestone) => {
    console.log("🎯 sharing milestone payload:", milestone);
    if (!currentUser) {
      Alert.alert("Please log in", "You need to be logged in to share milestones.");
      return;
    }
    
    milestoneToShare.current = milestone;
    setShareModalVisible(true);
  }, [currentUser]);

  const handleShareWithUser = useCallback(async (userId: string, username: string, profileImageUrl?: string) => {
    if (!currentUser || !milestoneToShare.current) return;
    
    try {
      await shareMilestone(
        currentUser,
        userId,
        username,
        profileImageUrl,
        milestoneToShare.current.authorProfileThumbnailUrl, 
        {
          id: milestoneToShare.current.id,
          milestoneType: milestoneToShare.current.milestoneType || 'PR',
          details: milestoneToShare.current.milestoneDetails,
          username: milestoneToShare.current.authorUsername,
        }
      );
      setShareModalVisible(false);
      Alert.alert("Success", "Milestone shared successfully");
    } catch (error) {
      console.error("Error sharing milestone:", error);
      Alert.alert("Error", "Failed to share milestone. Please try again.");
    }
  }, [currentUser]);

  // Handle opening action menu
  const handleOpenActionMenu = useCallback((milestone: FeedMilestone) => {
    setSelectedMilestoneForAction(milestone);
    setActionMenuVisible(true);
  }, []);

  // Handle bookmark toggle for milestones
  const handleToggleBookmark = useCallback((milestoneId: string, isCurrentlyBookmarked: boolean) => {
    if (!currentUser) {
      Alert.alert('Please log in', 'You need to be logged in to bookmark milestones.');
      return;
    }

    // Haptic feedback
    Haptics.impactAsync(isCurrentlyBookmarked ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);

    // Optimistic update - update UI immediately
    setMilestones(prevMilestones => 
      prevMilestones.map(milestone => 
        milestone.id === milestoneId 
          ? { ...milestone, isBookmarked: !isCurrentlyBookmarked }
          : milestone
      )
    );

    // TODO: Implement actual bookmark API call
  }, [currentUser]);

  const renderMilestoneDetails = useCallback((milestone: FeedMilestone) => {
    const details = milestone.milestoneDetails;
    
    // Helper function to check if unit is a distance unit
    const isDistanceUnit = (unit?: string): boolean => {
      return unit === 'km' || unit === 'miles';
    };

    // Helper function to check if unit is a weight unit
    const isWeightUnit = (unit?: string): boolean => {
      return unit === 'kg' || unit === 'lbs';
    };

    // Helper function for distance conversion
    const convertAndFormatDistance = (value: number, unit: string) => {
      const userPreferredUnit = getDistanceUnit();
      let convertedValue = value;
      let displayUnit: string;

      if (unit !== userPreferredUnit) {
        if (unit === 'km' && userPreferredUnit === 'miles') {
          convertedValue = Math.round(value * 0.621371 * 10) / 10;
        } else if (unit === 'miles' && userPreferredUnit === 'km') {
          convertedValue = Math.round(value * 1.60934 * 10) / 10;
        }
        displayUnit = `${userPreferredUnit} (${value} ${unit})`;
      } else {
        displayUnit = userPreferredUnit;
      }

      return { value: convertedValue, unit: displayUnit };
    };

    // Helper function for weight conversion
    const convertAndFormatWeight = (value: number, unit: string) => {
      const userPreferredUnit = getWeightUnit();
      let convertedValue = value;
      let displayUnit: string;
      
      if (unit !== userPreferredUnit) {
        if (unit === 'kg' && userPreferredUnit === 'lbs') {
          convertedValue = Math.round(value * 2.20462 * 10) / 10;
        } else if (unit === 'lbs' && userPreferredUnit === 'kg') {
          convertedValue = Math.round(value * 0.453592 * 10) / 10;
        }
        displayUnit = `${userPreferredUnit} (${value} ${unit})`;
      } else {
        displayUnit = userPreferredUnit;
      }
      
      return { value: convertedValue, unit: displayUnit };
    };
    
    if (details.type === 'PR') {
      // Determine which metric type this PR uses
      const hasWeightReps = details.value && details.reps && details.weightUnit && isWeightUnit(details.weightUnit);
      const hasBodyweightReps = details.reps && !details.value && !details.duration && !details.level;
      const hasDuration = details.duration && !details.value && !details.level;
      const hasDurationLevel = details.duration && details.level && !details.value;
      const hasDistance = details.value && details.weightUnit && isDistanceUnit(details.weightUnit) && !details.duration;
      const hasDistanceTime = details.value && details.duration && details.weightUnit && isDistanceUnit(details.weightUnit);

      // Weight + Reps (e.g., Bench Press 225 lbs × 5 reps)
      if (hasWeightReps) {
        const converted = convertAndFormatWeight(details.value!, details.weightUnit!);
        const previousConverted = details.previousValue 
          ? convertAndFormatWeight(details.previousValue, details.weightUnit!)
          : null;

        return (
          <View style={styles.detailsContainer}>
            <View style={styles.previousPRCard}>
              <View style={styles.previousPRHeaderNoLine}>
                <MaterialCommunityIcons name="dumbbell" size={18} color="#FF5E69" />
                <Text style={styles.previousPRTitle}>
                  {details.exerciseName || 'Strength PR'}
                </Text>
                <Text style={styles.previousPRDate}>{formatTimeAgo(milestone.createdAt)}</Text>
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
            
            {previousConverted && (
              <View style={styles.centeredRow}>
                <View style={styles.previousBestRow}>
                  <Text style={styles.previousBestLabel}>Previous Best:</Text>
                  <View style={styles.prMetricGroup}>
                    <Text style={styles.previousBestValue}>{previousConverted.value}</Text>
                    <Text style={styles.previousBestUnit}>{previousConverted.unit}</Text>
                  </View>
                  {details.previousReps && (
                    <>
                      <Text style={styles.previousBestSeparator}>×</Text>
                      <View style={styles.prMetricGroup}>
                        <Text style={styles.previousBestValue}>{details.previousReps}</Text>
                        <Text style={styles.previousBestUnit}>reps</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            )}
          </View>
        );
      }

      // Bodyweight Reps (e.g., Push-ups 50 reps)
      if (hasBodyweightReps) {
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.previousPRCard}>
              <View style={styles.previousPRHeaderNoLine}>
                <MaterialCommunityIcons name="human-handsup" size={18} color="#FF5E69" />
                <Text style={styles.previousPRTitle}>
                  {details.exerciseName || 'Bodyweight PR'}
                </Text>
                <Text style={styles.previousPRDate}>{formatTimeAgo(milestone.createdAt)}</Text>
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
            
            {details.previousReps && (
              <View style={styles.centeredRow}>
                <View style={styles.previousBestRow}>
                  <Text style={styles.previousBestLabel}>Previous Best:</Text>
                  <View style={styles.prMetricGroup}>
                    <Text style={styles.previousBestValue}>{details.previousReps}</Text>
                    <Text style={styles.previousBestUnit}>reps</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      }

      // Duration Only (e.g., Plank 3m 45s)
      if (hasDuration) {
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.previousPRCard}>
              <View style={styles.previousPRHeaderNoLine}>
                <MaterialCommunityIcons name="timer-outline" size={18} color="#FF5E69" />
                <Text style={styles.previousPRTitle}>
                  {details.exerciseName || 'Endurance PR'}
                </Text>
                <Text style={styles.previousPRDate}>{formatTimeAgo(milestone.createdAt)}</Text>
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
            
            {details.previousDuration && (
              <View style={styles.centeredRow}>
                <View style={styles.previousBestRow}>
                  <Text style={styles.previousBestLabel}>Previous Best:</Text>
                  <View style={styles.prMetricGroup}>
                    <Text style={styles.previousBestValue}>{formatDuration(details.previousDuration)}</Text>
                    <Text style={styles.previousBestUnit}>time</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      }

      // Duration + Level (e.g., Plank Level 7: 2m 30s)
      if (hasDurationLevel) {
        return (
          <View style={styles.detailsContainer}>
            <View style={styles.previousPRCard}>
              <View style={styles.previousPRHeaderNoLine}>
                <MaterialCommunityIcons name="timer-sand" size={18} color="#FF5E69" />
                <Text style={styles.previousPRTitle}>
                  {details.exerciseName || 'Endurance PR'}
                </Text>
                <Text style={styles.previousPRDate}>{formatTimeAgo(milestone.createdAt)}</Text>
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
            
            {details.previousDuration && (
              <View style={styles.centeredRow}>
                <View style={styles.previousBestRow}>
                  <Text style={styles.previousBestLabel}>Previous Best:</Text>
                  <View style={styles.prMetricGroup}>
                    <Text style={styles.previousBestValue}>{formatDuration(details.previousDuration)}</Text>
                    <Text style={styles.previousBestUnit}>time</Text>
                  </View>
                  {details.previousLevel && (
                    <>
                      <Text style={styles.previousBestSeparator}>•</Text>
                      <View style={styles.prMetricGroup}>
                        <Text style={styles.previousBestValue}>Level {details.previousLevel}</Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            )}
          </View>
        );
      }

      // Distance Only (e.g., Run 5.2 km)
      if (hasDistance) {
        const converted = convertAndFormatDistance(details.value!, details.weightUnit!);
        const previousConverted = details.previousValue 
          ? convertAndFormatDistance(details.previousValue, details.weightUnit!)
          : null;

        return (
          <View style={styles.detailsContainer}>
            <View style={styles.previousPRCard}>
              <View style={styles.previousPRHeaderNoLine}>
                <MaterialCommunityIcons name="run" size={18} color="#FF5E69" />
                <Text style={styles.previousPRTitle}>
                  {details.exerciseName || 'Distance PR'}
                </Text>
                <Text style={styles.previousPRDate}>{formatTimeAgo(milestone.createdAt)}</Text>
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
            
            {previousConverted && (
              <View style={styles.centeredRow}>
                <View style={styles.previousBestRow}>
                  <Text style={styles.previousBestLabel}>Previous Best:</Text>
                  <View style={styles.prMetricGroup}>
                    <Text style={styles.previousBestValue}>{previousConverted.value}</Text>
                    <Text style={styles.previousBestUnit}>{previousConverted.unit}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      }

      // Distance + Time (e.g., 5K in 23m 15s, pace: 4m 39s/km)
      if (hasDistanceTime) {
        const converted = convertAndFormatDistance(details.value!, details.weightUnit!);
        const pace = details.value > 0 ? Math.round(details.duration! / details.value) : 0;
        const previousConverted = details.previousValue 
          ? convertAndFormatDistance(details.previousValue, details.weightUnit!)
          : null;

        return (
          <View style={styles.detailsContainer}>
            <View style={styles.previousPRCard}>
              <View style={styles.previousPRHeaderNoLine}>
                <MaterialCommunityIcons name="run-fast" size={18} color="#FF5E69" />
                <Text style={styles.previousPRTitle}>
                  {details.exerciseName || 'Cardio PR'}
                </Text>
                <Text style={styles.previousPRDate}>{formatTimeAgo(milestone.createdAt)}</Text>
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
                    <Text style={styles.prMetricLabel}>per {converted.unit.split(' ')[0].slice(0, -1)}</Text>
                  </View>
                </View>
              </View>
            </View>
            
            {previousConverted && details.previousDuration && (
              <View style={styles.centeredRow}>
                <View style={styles.previousBestRow}>
                  <Text style={styles.previousBestLabel}>Previous Best:</Text>
                  <View style={styles.prMetricGroup}>
                    <Text style={styles.previousBestValue}>{previousConverted.value}</Text>
                    <Text style={styles.previousBestUnit}>{previousConverted.unit}</Text>
                  </View>
                  <Text style={styles.previousBestSeparator}>in</Text>
                  <View style={styles.prMetricGroup}>
                    <Text style={styles.previousBestValue}>{formatDuration(details.previousDuration)}</Text>
                    <Text style={styles.previousBestUnit}>time</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        );
      }

      // Fallback for unknown PR type
      return (
        <View style={styles.detailsContainer}>
          <View style={styles.previousPRCard}>
            <View style={styles.previousPRHeaderNoLine}>
              <MaterialCommunityIcons name="trophy-outline" size={18} color="#FF5E69" />
              <Text style={styles.previousPRTitle}>
                {details.exerciseName || 'Personal Record'}
              </Text>
              <Text style={styles.previousPRDate}>{formatDate(milestone.createdAt)}</Text>
            </View>
          </View>
          
          {details.previousValue && (
            <View style={styles.centeredRow}>
              <View style={styles.previousBestRow}>
                <Text style={styles.previousBestLabel}>Previous Best: </Text>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.previousBestValue}>{previousDisplayValue} </Text>
                  <Text style={styles.previousBestUnit}>{previousDisplayUnit}</Text>
                </View>
                {details.previousReps && (
                  <>
                    <Text style={styles.previousBestSeparator}>×</Text>
                    <View style={styles.prMetricGroup}>
                      <Text style={styles.previousBestValue}>{details.previousReps}</Text>
                      <Text style={styles.previousBestUnit}> reps</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      );
    } else if (details.type === 'weightLoss' || details.type === 'weightGain') {
      const isLoss = details.type === 'weightLoss';
      
      // Format weight units based on user preferences
      const originalWeightUnit = details.newWeightUnit;
      const preferredWeightUnit = getWeightUnit();
      let displayWeight = details.newWeight;
      let displayWeightUnit = originalWeightUnit;
      
      if (originalWeightUnit !== preferredWeightUnit) {
        if (originalWeightUnit === 'kg' && preferredWeightUnit === 'lbs') {
          displayWeight = Math.round(details.newWeight * 2.20462 * 10) / 10;
        } else if (originalWeightUnit === 'lbs' && preferredWeightUnit === 'kg') {
          displayWeight = Math.round(details.newWeight * 0.453592 * 10) / 10;
        }
        displayWeightUnit = preferredWeightUnit;
      } else {
        displayWeightUnit = preferredWeightUnit;
      }

      // Format previous weight similarly
      let previousDisplayWeight = details.previousWeight;
      let previousDisplayWeightUnit = details.previousWeightUnit;
      if (details.previousWeight && details.previousWeightUnit !== preferredWeightUnit) {
        if (details.previousWeightUnit === 'kg' && preferredWeightUnit === 'lbs') {
          previousDisplayWeight = Math.round(details.previousWeight * 2.20462 * 10) / 10;
          previousDisplayWeightUnit = preferredWeightUnit;
        } else if (details.previousWeightUnit === 'lbs' && preferredWeightUnit === 'kg') {
          previousDisplayWeight = Math.round(details.previousWeight * 0.453592 * 10) / 10;
          previousDisplayWeightUnit = preferredWeightUnit;
        }
      }
      
      return (
        <View style={styles.detailsContainer}>
          <View style={styles.previousPRCard}>
            <View style={styles.previousPRHeader}>
              <Ionicons name="fitness-outline" size={18} color="#FF5E69" />
              <Text style={styles.previousPRTitle}>{isLoss ? 'Weight Loss' : 'Weight Gain'}</Text>
              <Text style={styles.previousPRDate}>{formatDate(milestone.createdAt)}</Text>
            </View>
            
            <View style={styles.previousPRContent}>
              <View style={styles.prMetricsRow}>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.prMetricValue}>{displayWeight}</Text>
                  <Text style={styles.prMetricLabel}>{displayWeightUnit}</Text>
                </View>
              </View>
            </View>
          </View>
          
          {details.previousWeight && (
            <View style={styles.centeredRow}>
              <View style={styles.previousBestRow}>
                <Text style={styles.previousBestLabel}>Previous Weight: </Text>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.previousBestValue}>{previousDisplayWeight}</Text>
                  <Text style={styles.previousBestUnit}>{previousDisplayWeightUnit}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      );
    }
    
    return null;
  }, [formatDate, getWeightUnit, getDistanceUnit, formatDuration]);

  const renderMilestoneCard = useCallback((item: typeof milestones[0]) => {
    // Convert Post to Milestone format
    const milestone: FeedMilestone = {
      id: item.id,
      authorId: item.authorId,
      authorUsername: item.authorUsername,
      authorProfileImageUrl: item.authorProfileImageUrl || '',
      authorProfileThumbnailUrl: item.authorProfileThumbnailUrl || '',
      createdAt: item.createdAt,
      milestoneType: item.milestoneDetails?.type || 'PR',
      milestoneDetails: item.milestoneDetails as MilestoneDetails,
      reactionCount: item.reactionCount || 0,
      isLiked: item.isLiked || false,
      associatedPostId: item.id,
      imageUrl: item.imageUrl,
      pinned: false, // TODO: Implement pinned logic
      top5Percent: false, // TODO: Implement top 5% logic
    };

    // Determine the styling based on milestone status
    let CardWrapper: any = View;
    let wrapperStyle = styles.milestoneCard;
    let innerContent = null;
    
    if (milestone.top5Percent) {
      // Top 5% milestone with gradient border
      CardWrapper = LinearGradient;
      wrapperStyle = styles.gradientBorder;
      innerContent = (
        <View style={styles.gradientInnerContainer}>
          {renderCardContent(milestone, true, 'Top 5%', '#FFA84B')}
        </View>
      );
    } else if (milestone.pinned) {
      // Pinned milestone 
      wrapperStyle = styles.pinnedBorder;
      innerContent = (
        <View style={styles.pinnedInnerContainer}>
          {renderCardContent(milestone, true, 'Pinned', '#FF5E69')}
        </View>
      );
    } else {
      // Regular milestone
      innerContent = renderCardContent(milestone);
    }
    
    // Render the appropriate card with gradient if top 5%
    if (milestone.top5Percent) {
      return (
        <View style={styles.gradientWrapper}>
          <CardWrapper
            colors={['#B16CEA', '#FF5E69', '#FF8A56', '#FFA84B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={wrapperStyle}
          >
            {innerContent}
          </CardWrapper>
        </View>
      );
    }
    
    // For pinned milestones
    if (milestone.pinned) {
      return (
        <View style={styles.pinnedWrapper}>
          <View style={wrapperStyle}>
            {innerContent}
          </View>
        </View>
      );
    }
    
    // Regular milestones
    return (
      <View style={wrapperStyle}>
        {innerContent}
      </View>
    );
  }, []);

  const filteredMilestones = useMemo(() => {
    return milestones.filter(milestone => {
      // Don't filter out current user's own milestones
      if (milestone.authorId === currentUser?.uid) return true;
      
      // Filter out milestones from users we've blocked or who have blocked us
      return canInteractWithUser(milestone.authorId, milestone.authorBlockedUsers || []);
    });
  }, [milestones, canInteractWithUser, currentUser?.uid]);

  // Helper function to render the card content
  const renderCardContent = useCallback((item: FeedMilestone, hasStatus = false, statusText = '', statusColor = '') => {
    const canInteract = !isUserBlocked(item.authorId);
    
    return (
      <>
        {/* Milestone Card Header and Details */}
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => canInteract ? navigateToMilestone(item.id) : null}
        >
          <View style={styles.milestoneHeader}>
            <TouchableOpacity 
              style={styles.userInfoContainer}
              onPress={() => canInteract ? navigateToProfile(item.authorId) : null}
              activeOpacity={0.8}
            >
              <Image 
                source={{ uri: getOptimalImageUrl(item.authorProfileThumbnailUrl, item.authorProfileImageUrl) }} 
                style={styles.profilePic}
              />
              <View>
                <Text style={styles.milestoneType}>
                  {item.authorUsername}
                </Text>
                <View style={styles.timestampContainer}>
                  <Text style={styles.milestoneDate}>
                    {formatTimeAgo(item.createdAt)}
                    {hasStatus && <Text style={{color: statusColor}}> {statusText}</Text>}
                  </Text>
                  {canInteract && item.imageUrl && item.associatedPostId && (
                    <TouchableOpacity
                      onPress={() => navigateToPost(item.associatedPostId || '')}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
                    >
                      <Text style={styles.associatedPostLink}>
                        {' '}• View Associated Post <Text style={styles.chevronText}>›</Text>
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
            
            {/* Three-dot menu */}
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={() => handleOpenActionMenu(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          
          {/* Milestone Details */}
          {renderMilestoneDetails(item)}
        </TouchableOpacity>
        
        {/* Like and Share */}
        {canInteract && (
          <View style={styles.cardFooter}>
            <TouchableOpacity 
              style={styles.footerButton}
              onPress={() => handleLike(item.id, item.isLiked)}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={item.isLiked ? "heart" : "heart-outline"} 
                size={20} 
                color={item.isLiked ? ACCENT_COLOR : "#FFF"} 
                style={styles.statIcon}
              />
              <Text style={styles.statNumber}>{item.reactionCount || 0}</Text>
              <Text style={styles.statLabel}> {item.reactionCount === 1 ? 'Like' : 'Likes'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.footerButton}
              onPress={() => handleShare(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="paper-plane-outline" size={20} color="#FFF" />
              <Text style={styles.footerButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  }, [navigateToMilestone, navigateToProfile, navigateToPost, formatTimeAgo, renderMilestoneDetails, handleLike, handleShare, isUserBlocked]);

  // Render footer for load more
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="large" color="#FFF" />
        <Text style={styles.loadingText}>Loading more milestones...</Text>
      </View>
    );
  }, [loadingMore]);

  // Render empty state
  const renderEmptyState = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyMilestonesContainer}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.emptyMilestonesText}>Loading milestones...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyMilestonesContainer}>
        <View style={styles.emptyMilestonesContent}>
          <View style={styles.milestoneIconContainer}>
            <Ionicons name="trophy" size={40} color={ACCENT_COLOR} />
          </View>
          <Text style={styles.emptyMilestonesTitle}>No Milestones Yet</Text>
          <Text style={styles.emptyMilestonesText}>
            Start following athletes to see their achievements.
          </Text>
          <TouchableOpacity 
            style={styles.createButton}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={18} color="#000" style={styles.buttonIcon} />
            <Text style={styles.createButtonText}>Create Milestone</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [loading, router]);

  if (error) {
    return (
      <View style={styles.emptyMilestonesContainer}>
        <Ionicons name="alert-circle-outline" size={80} color="#FF3B30" />
        <Text style={styles.emptyMilestonesTitle}>Something went wrong</Text>
        <Text style={styles.emptyMilestonesText}>Could not load milestones. Please try again.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshFeed}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <>
      <FlatList
        data={filteredMilestones}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={milestones.length === 0 ? styles.emptyContainer : styles.milestonesContainer}
        renderItem={({ item }) => renderMilestoneCard(item)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshFeed}
            colors={['#FFF']}
            tintColor="#FFF"
          />
        }
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
      />
      
      <ShareModal 
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        onShareWith={handleShareWithUser}
      />
      
      <PostActionMenu
        visible={actionMenuVisible}
        onClose={() => setActionMenuVisible(false)}
        isBookmarked={selectedMilestoneForAction?.isBookmarked || false}
        isFollowing={selectedMilestoneForAction?.isFollowing || false}
        isOwnPost={selectedMilestoneForAction?.authorId === currentUser?.uid}
        isMilestone={true}
        onToggleBookmark={() => {
          if (selectedMilestoneForAction) {
            handleToggleBookmark(selectedMilestoneForAction.id, selectedMilestoneForAction.isBookmarked || false);
          }
        }}
        onToggleFollow={handleToggleFollowFromMenu}
        onBlock={handleBlockUser}
        onReport={handleReportMilestone}
      />
    </>
  );
}

// Add the missing styles
const styles = StyleSheet.create({
  postsContainer: {
    paddingTop: 12,
    paddingBottom: 70,
    backgroundColor: '#2C2C2E',
  },
  emptyContainer: {
    flex: 1,
  },
  milestonesContainer: {
    paddingTop: 12,
    paddingBottom: 70,
    backgroundColor: '#2C2C2E',
  },
  milestoneCard: {
    marginBottom: 12,
    marginHorizontal: 12,
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  gradientWrapper: {
    marginBottom: 12,
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientBorder: {
    padding: 2,
    borderRadius: 16,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  gradientInnerContainer: {
    backgroundColor: '#000',
    borderRadius: 14,
    overflow: 'hidden',
  },
  pinnedWrapper: {
    marginBottom: 12,
    marginHorizontal: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pinnedBorder: {
    padding: 2,
    borderRadius: 16,
    borderColor: 'rgba(255, 94, 105, 0.75)',
    borderWidth: 2,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  pinnedInnerContainer: {
    backgroundColor: '#000',
    borderRadius: 14,
    overflow: 'hidden',
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  milestoneType: {
    fontWeight: '600',
    fontSize: 15,
    color: '#FFF',
  },
  milestoneDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
    marginRight: -8,
  },
  associatedPostLink: {
    color: '#8E8E93',
    fontSize: 12,
    // fontWeight: '500',
    // color: '#FF6B6B',
  },
  chevronText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsContainer: {
    padding: 15,
    paddingTop: 0,
    paddingBottom: 8,
  },
  previousPRCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
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
  previousPRHeaderNoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#222',
  },
  previousPRTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  previousPRDate: {
    color: '#999',
    fontSize: 12,
  },
  previousPRContent: {
    padding: 14,
    alignItems: 'center',
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
  previousBestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginBottom: 4,
  },
  previousBestLabel: {
    color: '#777',
    fontSize: 14,
  },
  previousBestValue: {
    color: '#777',
    fontSize: 14,
    fontWeight: '700',
  },
  previousBestUnit: {
    color: '#777',
    fontSize: 14,
  },
  previousBestSeparator: {
    color: '#777',
    fontSize: 14,
    marginHorizontal: 6,
  },
  centeredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 4,
    gap: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#333',
    justifyContent: 'center',
    gap: 12,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'transparent',
    flex: 1,
  },
  statIcon: {
    marginRight: 6,
  },
  statNumber: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '400',
  },
  footerButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '500',
  },
  loadingFooter: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#8E8E93',
    marginTop: 10,
  },
  emptyMilestonesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyMilestonesContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  milestoneIconContainer: {
    marginBottom: 16,
  },
  emptyMilestonesTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  emptyMilestonesText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: ACCENT_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
  },
  createButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 15,
  },
  retryButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
});