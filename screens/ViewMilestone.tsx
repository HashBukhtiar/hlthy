import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ShareModal from '@/components/ShareModal';
import { shareMilestone } from '@/services/ShareService';
import { useAuth } from '@/context/AuthContext';
import { usePostsData } from '@/hooks/usePostsData';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { calculateImprovementPercentage } from '@/logic/milesonteUtils';
import { getOptimalImageUrl } from '@/utils/imageUtils';
import { useBlockEnforcement } from '@/utils/blockUtils';
import { useUnits } from '@/hooks/useUnits';
import { Milestone, MilestoneDetails, MilestoneStats } from '@/types/milestone';

export default function ViewMilestone() {
  const { currentUser } = useAuth();
  const { likePost, unlikePost } = usePostsData();
  const { canInteractWithUser } = useBlockEnforcement();
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const { getWeightUnit, getDistanceUnit, formatWeight, formatDistance, convertWeight, convertDistance } = useUnits();
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [isTop5Percent, setIsTop5Percent] = useState(false);
  const canInteractWithAuthor = milestone ? canInteractWithUser(milestone.userId, milestone.authorBlockedUsers) : false;

  useEffect(() => {
    const fetchMilestone = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const milestoneRef = doc(db, 'posts', id as string);
        const milestoneSnap = await getDoc(milestoneRef);

        if (milestoneSnap.exists()) {
          const data = milestoneSnap.data();
          
          if (!data.isMilestone) {
            console.warn("Document is not a milestone:", id);
            setMilestone(null);
            return;
          }

          // Fetch the author's profile to get the latest profile image
          let authorProfileImageUrl = 'https://via.placeholder.com/150';
          let authorProfileThumbnailUrl = null;
          let authorFullName = data.authorUsername;
          let authorBlockedUsers: string[] = [];

          if (data.authorId) {
            const userRef = doc(db, 'users', data.authorId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              authorProfileImageUrl = userData.profileImageUrl || authorProfileImageUrl;
              authorProfileThumbnailUrl = userData.profileThumbnailUrl || null;
              authorFullName = userData.displayName || authorFullName;
              authorBlockedUsers = userData.blockedUsers || [];
            }
          }

          // Check if the current user has liked this milestone
          let isLiked = false;
          if (currentUser) {
            try {
              const likerDoc = await getDoc(doc(db, 'posts', milestoneSnap.id, 'likers', currentUser.uid));
              isLiked = likerDoc.exists();
            } catch (error) {
              console.error('Error checking like status:', error);
              isLiked = false;
            }
          }

          const milestoneData: Milestone = {
            id: milestoneSnap.id,
            userId: data.authorId,
            username: data.authorUsername,
            fullName: authorFullName,
            profileImageUrl: getOptimalImageUrl(authorProfileImageUrl, authorProfileThumbnailUrl),
            createdAt: data.createdAt.toDate(),
            milestoneType: data.milestoneDetails?.type,
            details: {
              exerciseName: data.milestoneDetails?.exerciseName,
              value: data.milestoneDetails?.value,
              weightUnit: data.milestoneDetails?.weightUnit,
              reps: data.milestoneDetails?.reps,
              newWeight: data.milestoneDetails?.newWeight,
              newWeightUnit: data.milestoneDetails?.newWeightUnit,
              previousWeight: data.milestoneDetails?.previousWeight,
              previousWeightUnit: data.milestoneDetails?.previousWeightUnit,
              previousValue: data.milestoneDetails?.previousValue,
              previousReps: data.milestoneDetails?.previousReps,
              improvement: data.milestoneDetails?.improvement,
              totalLoss: data.milestoneDetails?.totalLoss,
              percentageLoss: data.milestoneDetails?.percentageLoss,
            },
            authorBlockedUsers: authorBlockedUsers,
            stats: {
              likes: data.likeCount || 0,
            },
            isLiked: isLiked,
            associatedPostId: milestoneSnap.id,
            postImageUrl: data.imageUrl || null,
            pinned: data.pinned || false,
            top5Percent: data.top5Percent || false,
          };
          
          // TODO: Implement pinned and top X%
          setMilestone(milestoneData);
          setIsPinned(milestoneData.pinned || false);
          setIsTop5Percent(milestoneData.top5Percent || false);

        } else {
          console.log("No such milestone document!");
          setMilestone(null);
        }
      } catch (error) {
        console.error("Error fetching milestone:", error);
        setMilestone(null);
      } finally {
        setLoading(false);
      }
    };

    fetchMilestone();
  }, [id, currentUser]);

  const handleLike = async () => {
    if (!milestone) return;

    if (!canInteractWithAuthor) {
      Alert.alert("Cannot Like", "You cannot interact with this user.");
      return;
    }
    
    // Optimistic update - update UI immediately
    setMilestone(prevState => {
      if (!prevState) return null;
      
      // Toggle liked status
      const newIsLiked = !prevState.isLiked;
      const likeDelta = newIsLiked ? 1 : -1;
      
      return {
        ...prevState,
        isLiked: newIsLiked,
        stats: {
          ...prevState.stats,
          likes: Math.max(0, prevState.stats.likes + likeDelta)
        }
      };
    });

    try {
      if (milestone.isLiked) {
        await unlikePost(milestone.id);
      } else {
        await likePost(milestone.id);
      }
    } catch (error) {
      console.error('Error toggling milestone like:', error);
      // Revert optimistic update on error
      setMilestone(prevState => {
        if (!prevState) return null;
        
        const revertedIsLiked = !prevState.isLiked;
        const revertDelta = revertedIsLiked ? 1 : -1;
        
        return {
          ...prevState,
          isLiked: revertedIsLiked,
          stats: {
            ...prevState.stats,
            likes: Math.max(0, prevState.stats.likes + revertDelta)
          }
        };
      });
      Alert.alert('Error', 'Could not update like status. Please try again.');
    }
  };

  const navigateToPost = (postId: string | undefined) => {
    if (!postId) return;
    
    if (!canInteractWithAuthor) {
      Alert.alert("Post Unavailable", "This post is not accessible.");
      return;
    }
    
    router.push(`/view-post/${postId}`);
  };
  
  const navigateToProfile = (userId: string) => {
    if (!canInteractWithUser(userId)) {
      Alert.alert("Profile Unavailable", "This user's profile is not accessible.");
      return;
    }
    router.push(`/profile?id=${userId}`);
  };

  const renderActionButtons = () => {
    if (!milestone || !canInteractWithAuthor) {
      return (
        <View style={styles.actionButtonsContainer}>
          <Text style={styles.blockedMessage}>Interactions not available</Text>
        </View>
      );
    }

    return (
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleLike}
        >
          <Ionicons 
            name={milestone.isLiked ? "heart" : "heart-outline"} 
            size={24} 
            color={milestone.isLiked ? "#FF69B4" : "#FFF"} 
            style={styles.actionIcon}
          />
          <Text style={styles.actionButtonText}>
            Like
            {milestone.stats.likes > 0 && <Text style={styles.likeCountText}> ({milestone.stats.likes})</Text>}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleShare}
        >
          <Ionicons name="paper-plane-outline" size={24} color="#FFF" style={styles.actionIcon} />
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  const handleShare = async () => {
    if (!currentUser) {
      Alert.alert("Please log in", "You need to be logged in to share milestones.");
      return;
    }
    
    if (!canInteractWithAuthor) {
      Alert.alert("Cannot Share", "You cannot interact with this user.");
      return;
    }
    
    setShareModalVisible(true);
  };

  const shareMilestoneWithUser = async (userId: string, username: string, profileImageUrl?: string, profileThumbnailUrl?: string) => {
    if (!currentUser || !milestone) return;
    
    try {
      await shareMilestone(
        currentUser,
        userId,
        username,
        profileImageUrl,
        profileThumbnailUrl,
        {
          id: milestone.id,
          milestoneType: milestone.milestoneType,
          details: milestone.details,
          username: milestone.username,
        }
      );
      
      setShareModalVisible(false);
      Alert.alert("Success", "Milestone shared successfully");
    } catch (error) {
      console.error("Error sharing milestone:", error);
      Alert.alert("Error", "Failed to share milestone. Please try again.");
    }
  };

  const handleDelete = () => {
    if (!milestone) return;

    // Logic for a milestone that is also a post with an image
    if (milestone.postImageUrl && milestone.associatedPostId) {
      Alert.alert(
        "Delete Options",
        "This milestone has an associated post. How would you like to proceed?",
        [
          {
            text: "Delete Milestone Only",
            onPress: async () => {
              try {
                const postRef = doc(db, 'posts', milestone.id);
                await updateDoc(postRef, {
                  isMilestone: false,
                  milestoneDetails: null,
                });
                Alert.alert("Success", "The milestone was removed, but the post remains.");
                router.back();
              } catch (error) {
                console.error("Error removing milestone from post:", error);
                Alert.alert("Error", "Could not remove the milestone from the post.");
              }
            },
          },
          {
            text: "Delete Both Milestone & Post",
            style: "destructive",
            onPress: async () => {
              try {
                const postRef = doc(db, 'posts', milestone.id);
                await deleteDoc(postRef);
                Alert.alert("Success", "The milestone and post have been deleted.");
                router.back();
              } catch (error) {
                console.error("Error deleting post and milestone:", error);
                Alert.alert("Error", "Could not delete the milestone and post.");
              }
            },
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } else {
      // Logic for a milestone-only post (no image)
      Alert.alert(
        "Delete Milestone",
        "Are you sure you want to permanently delete this milestone?",
        [
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                const postRef = doc(db, 'posts', milestone.id);
                await deleteDoc(postRef);
                Alert.alert("Success", "The milestone has been deleted.");
                router.back();
              } catch (error) {
                console.error("Error deleting milestone:", error);
                Alert.alert("Error", "Could not delete the milestone.");
              }
            },
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    }
  };

  const formatTimeAgo = (date: Date) => {
    if (!date) return 'Just now';
    
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  // Helper function to format duration
  const formatDuration = (durationSeconds: number): string => {
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const seconds = durationSeconds % 60;
    
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0 || hours > 0) result += `${minutes}m `;
    result += `${seconds}s`;
    
    return result.trim();
  };

  // Helper function to determine if unit is for distance
  const isDistanceUnit = (unit: string): boolean => {
    return unit === 'km' || unit === 'miles';
  };

  // Helper function to determine if unit is for weight
  const isWeightUnit = (unit: string): boolean => {
    return unit === 'kg' || unit === 'lbs';
  };

  // Helper function to convert and format value with proper units
  const convertAndFormatValue = (value: number, storedUnit: string) => {
    if (isWeightUnit(storedUnit)) {
      const userPreferredUnit = getWeightUnit() as 'kg' | 'lbs';
      const convertedValue = storedUnit !== userPreferredUnit 
        ? convertWeight(value, storedUnit as 'kg' | 'lbs', userPreferredUnit)
        : value;
      return {
        value: Math.round(convertedValue * 10) / 10,
        unit: userPreferredUnit
      };
    } else if (isDistanceUnit(storedUnit)) {
      const userPreferredUnit = getDistanceUnit() as 'km' | 'miles';
      const convertedValue = storedUnit !== userPreferredUnit 
        ? convertDistance(value, storedUnit as 'km' | 'miles', userPreferredUnit)
        : value;
      return {
        value: Math.round(convertedValue * 10) / 10,
        unit: userPreferredUnit
      };
    }
    return { value, unit: storedUnit };
  };

  const renderMilestoneDetails = () => {
    if (!milestone) return null;
    
    if (milestone.milestoneType === 'PR') {
      const details = milestone.details;
      
      return (
        <View style={styles.detailsContainer}>
          <View style={styles.previousPRCard}>
            <View style={styles.previousPRHeader}>
              <MaterialCommunityIcons name="trophy-outline" size={18} color="#FF5E69" />
              <Text style={styles.previousPRTitle}>{details.exerciseName}</Text>
              <Text style={styles.previousPRDate}>{formatTimeAgo(milestone.createdAt)}</Text>
            </View>
            
            <View style={styles.previousPRContent}>
              {details.value && details.reps && details.weightUnit && isWeightUnit(details.weightUnit) && (
                <View style={styles.prMetricsRow}>
                  <View style={styles.prMetricGroup}>
                    <Text style={styles.prMetricValue}>{convertAndFormatValue(details.value, details.weightUnit).value}</Text>
                    <Text style={styles.prMetricLabel}>{convertAndFormatValue(details.value, details.weightUnit).unit}</Text>
                  </View>
                  <Text style={styles.prMetricSeparator}>×</Text>
                  <View style={styles.prMetricGroup}>
                    <Text style={styles.prMetricValue}>{details.reps}</Text>
                    <Text style={styles.prMetricLabel}>reps</Text>
                  </View>
                </View>
              )}
              
              {/* Bodyweight Reps only (e.g., Push-ups) */}
              {details.reps && !details.value && (
                <View style={styles.prMetricsRow}>
                  <View style={styles.prMetricGroup}>
                    <Text style={styles.prMetricValue}>{details.reps}</Text>
                    <Text style={styles.prMetricLabel}>reps</Text>
                  </View>
                </View>
              )}
              
              {/* Distance only (e.g., 5K run) */}
              {details.value && details.weightUnit && isDistanceUnit(details.weightUnit) && !details.duration && (
                <View style={styles.prMetricsRow}>
                  <View style={styles.prMetricGroup}>
                    <Text style={styles.prMetricValue}>{convertAndFormatValue(details.value, details.weightUnit).value}</Text>
                    <Text style={styles.prMetricLabel}>{convertAndFormatValue(details.value, details.weightUnit).unit}</Text>
                  </View>
                </View>
              )}
              
              {/* Distance + Time (e.g., 5K run time) */}
              {details.value && details.duration && details.weightUnit && isDistanceUnit(details.weightUnit) && (
                <View style={styles.prMetricsColumn}>
                  <View style={styles.prMetricsRow}>
                    <View style={styles.prMetricGroup}>
                      <Text style={styles.prMetricValue}>{convertAndFormatValue(details.value, details.weightUnit).value}</Text>
                      <Text style={styles.prMetricLabel}>{convertAndFormatValue(details.value, details.weightUnit).unit}</Text>
                    </View>
                  </View>
                  <View style={styles.prMetricsRow}>
                    <View style={styles.prMetricGroup}>
                      <Text style={styles.prMetricValue}>{formatDuration(details.duration)}</Text>
                      <Text style={styles.prMetricLabel}>time</Text>
                    </View>
                  </View>
                  {/* Show pace */}
                  <View style={styles.prMetricsRow}>
                    <View style={styles.prMetricGroup}>
                      <Text style={styles.prMetricValue}>
                        {formatDuration(Math.round(details.duration / convertAndFormatValue(details.value, details.weightUnit).value))}
                      </Text>
                      <Text style={styles.prMetricLabel}>per {convertAndFormatValue(details.value, details.weightUnit).unit.slice(0, -1)}</Text>
                    </View>
                  </View>
                </View>
              )}
              
              {/* Duration only (e.g., Plank) */}
              {details.duration && !details.value && !details.level && (
                <View style={styles.prMetricsRow}>
                  <View style={styles.prMetricGroup}>
                    <Text style={styles.prMetricValue}>{formatDuration(details.duration)}</Text>
                    <Text style={styles.prMetricLabel}>duration</Text>
                  </View>
                </View>
              )}
              {/* Duration + Level (e.g., Plank with difficulty) */}
              {details.duration && details.level && !details.value && (
                <View style={styles.prMetricsColumn}>
                  <View style={styles.prMetricsRow}>
                    <View style={styles.prMetricGroup}>
                      <Text style={styles.prMetricValue}>{formatDuration(details.duration)}</Text>
                      <Text style={styles.prMetricLabel}>duration</Text>
                    </View>
                  </View>
                  <View style={styles.prMetricsRow}>
                    <View style={styles.prMetricGroup}>
                      <Text style={styles.prMetricValue}>{details.level}</Text>
                      <Text style={styles.prMetricLabel}>level</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
          
          {/* Previous Best (outside the card) */}
          {(details.previousValue != null || details.previousReps != null || details.previousDuration != null) && (
            <View style={styles.outsidePreviousBestRow}>
              <Text style={styles.previousBestLabel}>Previous Best:</Text>
              
              {/* Previous Weight + Reps */}
              {details.previousValue && details.previousReps && details.weightUnit && (
                <View style={styles.prMetricGroup}>
                  <Text style={styles.previousBestValue}>{convertAndFormatValue(details.previousValue, details.weightUnit).value}</Text>
                  <Text style={styles.previousBestUnit}>{convertAndFormatValue(details.previousValue, details.weightUnit).unit}</Text>
                  <Text style={styles.previousBestSeparator}>×</Text>
                  <Text style={styles.previousBestValue}>{details.previousReps}</Text>
                  <Text style={styles.previousBestUnit}>reps</Text>
                </View>
              )}
              
              {/* Previous Bodyweight Reps only */}
              {details.previousReps && !details.previousValue && (
                <View style={styles.prMetricGroup}>
                  <Text style={styles.previousBestValue}>{details.previousReps}</Text>
                  <Text style={styles.previousBestUnit}>reps</Text>
                </View>
              )}
              
              {/* Previous Distance */}
              {details.previousValue && !details.previousReps && details.weightUnit && isDistanceUnit(details.weightUnit) && (
                <View style={styles.prMetricGroup}>
                  <Text style={styles.previousBestValue}>{convertAndFormatValue(details.previousValue, details.weightUnit).value}</Text>
                  <Text style={styles.previousBestUnit}>{convertAndFormatValue(details.previousValue, details.weightUnit).unit}</Text>
                </View>
              )}
              
              {/* Previous Duration */}
              {details.previousDuration && (
                <View style={styles.prMetricGroup}>
                  <Text style={styles.previousBestValue}>{formatDuration(details.previousDuration)}</Text>
                  <Text style={styles.previousBestUnit}>duration</Text>
                </View>
              )}
              {details.previousValue && details.previousDuration && details.weightUnit && isDistanceUnit(details.weightUnit) && (
                <>
                  <View style={styles.prMetricGroup}>
                    <Text style={styles.previousBestValue}>{convertAndFormatValue(details.previousValue, details.weightUnit).value}</Text>
                    <Text style={styles.previousBestUnit}>{convertAndFormatValue(details.previousValue, details.weightUnit).unit}</Text>
                  </View>
                  <Text style={styles.previousBestSeparator}>in</Text>
                  <View style={styles.prMetricGroup}>
                    <Text style={styles.previousBestValue}>{formatDuration(details.previousDuration)}</Text>
                    <Text style={styles.previousBestUnit}>time</Text>
                  </View>
                </>
              )}
            </View>
          )}
          
          {/* Improvement Badge */}
          {(() => {
            const current = details.value || details.duration || details.reps;
            const previous = details.previousValue || details.previousDuration || details.previousReps;
            
            if (current && previous) {
              const improvement = calculateImprovementPercentage(current, previous);
              
              if (improvement && improvement > 0) {
                return (
                  <View style={styles.outsideImprovementBadge}>
                    <Text style={styles.improvementText}>
                      +{improvement}% Improvement
                    </Text>
                  </View>
                );
              }
            }
            return null;
          })()}
        </View>
      );
    } else if (milestone.milestoneType === 'weightLoss' || milestone.milestoneType === 'weightGain') {
      // Weight milestone handling (already implemented above)
      const isLoss = milestone.milestoneType === 'weightLoss';
      
      return (
        <View style={styles.detailsContainer}>
          <View style={styles.previousPRCard}>
            <View style={styles.previousPRHeader}>
              <Ionicons name="fitness-outline" size={18} color="#FF5E69" />
              <Text style={styles.previousPRTitle}>{isLoss ? 'Weight Loss' : 'Weight Gain'}</Text>
              <Text style={styles.previousPRDate}>{formatTimeAgo(milestone.createdAt)}</Text>
            </View>
            
            <View style={styles.previousPRContent}>
              <View style={styles.prMetricsRow}>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.prMetricValue}>
                    {milestone.details.newWeight && milestone.details.newWeightUnit 
                      ? convertAndFormatValue(milestone.details.newWeight, milestone.details.newWeightUnit).value
                      : milestone.details.newWeight}
                  </Text>
                  <Text style={styles.prMetricLabel}>
                    {milestone.details.newWeight && milestone.details.newWeightUnit 
                      ? convertAndFormatValue(milestone.details.newWeight, milestone.details.newWeightUnit).unit
                      : getWeightUnit()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Previous Weight (outside the card) */}
          {milestone.details.previousWeight && (
            <View style={styles.outsidePreviousBestRow}>
              <Text style={styles.previousBestLabel}>Previous Weight:</Text>
              <View style={styles.prMetricGroup}>
                <Text style={styles.previousBestValue}>
                  {milestone.details.previousWeight && milestone.details.previousWeightUnit 
                    ? convertAndFormatValue(milestone.details.previousWeight, milestone.details.previousWeightUnit).value
                    : milestone.details.previousWeight}
                </Text>
                <Text style={styles.previousBestUnit}>
                  {milestone.details.previousWeight && milestone.details.previousWeightUnit 
                    ? convertAndFormatValue(milestone.details.previousWeight, milestone.details.previousWeightUnit).unit
                    : getWeightUnit()}
                </Text>
              </View>
            </View>
          )}
          
          {/* Total Change Badge (outside the card) */}
          {milestone.details.totalLoss && (
            <View style={styles.outsideImprovementBadge}>
              <Text style={styles.improvementText}>
                {isLoss ? '↓' : '↑'} {milestone.details.totalLoss} {milestone.details.newWeight && milestone.details.newWeightUnit 
                  ? convertAndFormatValue(milestone.details.newWeight, milestone.details.newWeightUnit).unit
                  : getWeightUnit()}
              </Text>
            </View>
          )}
        </View>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#ff2d55" />
        <Text style={{ color: '#999', marginTop: 20 }}>Loading milestone...</Text>
      </View>
    );
  }
  
  if (!milestone) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No milestone data to display</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity 
          style={styles.backButtonIcon}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={28} color="#FFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.userInfoContainer}
          onPress={() => navigateToProfile(milestone.userId)}
        >
          <Image source={{ uri: milestone.profileImageUrl }} style={styles.profilePic} />
          <View>
            <Text style={styles.fullName}>{milestone.fullName}</Text>
            <Text style={styles.username}>@{milestone.username}</Text>
          </View>
        </TouchableOpacity>
        
        {currentUser?.uid === milestone.userId ? (
          <TouchableOpacity onPress={handleDelete} style={styles.moreButton}>
            <Ionicons name="trash-outline" size={24} color="#FF5E69" />
          </TouchableOpacity>
        ) : (
          // Add a placeholder view to maintain spacing when the delete button isn't shown
          <View style={{ width: 34 }} /> 
        )}
      </View>

      {/* Scrollable content */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}>
        
        <View style={[styles.headerSpacer, { height: insets.top }]} />
        
        <View style={styles.milestoneCard}>
          {isTop5Percent ? (
            <LinearGradient
              colors={['#B16CEA', '#FF5E69', '#FF8A56', '#FFA84B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBorder}
            >
              <View style={styles.gradientInnerContainer}>
                <View style={styles.milestoneHeader}>
                  <View style={styles.milestoneIconContainer}>
                    {milestone.milestoneType === 'PR' ? (
                      <Ionicons name="barbell-outline" size={32} color="#FFF" style={styles.milestoneIcon} />
                    ) : (
                      <Ionicons name="fitness-outline" size={32} color="#FFF" style={styles.milestoneIcon} />
                    )}
                  </View>
                  <View style={styles.milestoneTitleContainer}>
                    <Text style={styles.milestoneType}>
                      {milestone.milestoneType === 'PR' ? 'Personal Record' : 
                       milestone.milestoneType === 'weightLoss' ? 'Weight Loss' : 'Weight Gain'}
                    </Text>
                    <Text style={styles.milestoneDate}>
                      {milestone.createdAt.toDateString()}
                      <Text style={{color: '#FFA84B'}}> • Top 5%</Text>
                    </Text>
                  </View>
                </View>
                
                {renderMilestoneDetails()}
              </View>
            </LinearGradient>
          ) : isPinned ? (
            <View style={styles.pinnedBorder}>
              <View style={styles.pinnedInnerContainer}>
                <View style={styles.milestoneHeader}>
                  <View style={styles.milestoneIconContainer}>
                    {milestone.milestoneType === 'PR' ? (
                      <Ionicons name="barbell-outline" size={32} color="#FFF" style={styles.milestoneIcon} />
                    ) : (
                      <Ionicons name="fitness-outline" size={32} color="#FFF" style={styles.milestoneIcon} />
                    )}
                  </View>
                  <View style={styles.milestoneTitleContainer}>
                    <Text style={styles.milestoneType}>
                      {milestone.milestoneType === 'PR' ? 'Personal Record' : 
                       milestone.milestoneType === 'weightLoss' ? 'Weight Loss' : 'Weight Gain'}
                    </Text>
                    <Text style={styles.milestoneDate}>
                      {milestone.createdAt.toDateString()}
                      <Text style={{color: '#FF5E69'}}> • Pinned</Text>
                    </Text>
                  </View>
                </View>
                
                {renderMilestoneDetails()}
              </View>
            </View>
          ) : (
            <>
              <View style={styles.milestoneHeader}>
                <View style={styles.milestoneIconContainer}>
                  {milestone.milestoneType === 'PR' ? (
                    <Ionicons name="barbell-outline" size={32} color="#FFF" style={styles.milestoneIcon} />
                  ) : (
                    <Ionicons name="fitness-outline" size={32} color="#FFF" style={styles.milestoneIcon} />
                  )}
                </View>
                <View style={styles.milestoneTitleContainer}>
                  <Text style={styles.milestoneType}>
                    {milestone.milestoneType === 'PR' ? 'Personal Record' : 
                     milestone.milestoneType === 'weightLoss' ? 'Weight Loss' : 'Weight Gain'}
                  </Text>
                  <Text style={styles.milestoneDate}>{milestone.createdAt.toDateString()}</Text>
                </View>
              </View>
              
              {renderMilestoneDetails()}
            </>
          )}
        </View>
        
        {milestone.postImageUrl && milestone.associatedPostId && (
          <TouchableOpacity 
            style={styles.associatedPostContainer}
            onPress={() => navigateToPost(milestone.associatedPostId)}
          >
            <View style={styles.associatedPostHeader}>
              <Ionicons name="image-outline" size={20} color="#FFF" />
              <Text style={styles.associatedPostTitle}>Associated Post</Text>
            </View>
            <Image source={{ uri: milestone.postImageUrl }} style={styles.associatedPostImage} />
            <View style={styles.viewPostButton}>
              <Text style={styles.viewPostButtonText}>View Full Post</Text>
              <Ionicons name="chevron-forward" size={16} color="#ff2d55" />
            </View>
          </TouchableOpacity>
        )}
        
        {renderActionButtons()}
      </ScrollView>
      {canInteractWithAuthor && (
        <ShareModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          onShareWith={shareMilestoneWithUser}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 1,
    paddingHorizontal: 15,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButtonIcon: {
    padding: 5,
  },
  moreButton: {
    padding: 5,
  },
  headerSpacer: {
    height: 80,
  },
  userSection: {
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  fullName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    color: '#999',
  },
  timestamp: {
    fontSize: 14,
    color: '#999',
  },
  milestoneCard: {
    backgroundColor: '#1A1A1A',
    margin: 15,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  pinnedBorder: {
    padding: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF5E69',
  },
  pinnedInnerContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    overflow: 'hidden',
  },
  gradientBorder: {
    padding: 2,
    borderRadius: 12,
  },
  gradientInnerContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    overflow: 'hidden',
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  milestoneIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  milestoneIcon: {
    // No additional styles needed
  },
  milestoneTitleContainer: {
    flex: 1,
  },
  milestoneType: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  milestoneDate: {
    color: '#999',
    fontSize: 14,
  },
  detailsContainer: {
    padding: 15,
    paddingTop: 0,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    color: '#999',
    fontSize: 14,
  },
  detailValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
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
  associatedPostContainer: {
    margin: 15,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
  },
  associatedPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  associatedPostTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  associatedPostImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  viewPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  viewPostButtonText: {
    color: '#ff2d55',
    fontWeight: '500',
    marginRight: 5,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 15,
    marginBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    flex: 1,
    marginHorizontal: 8,
  },
  activeActionButton: {
    display: 'none',
  },
  actionIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  likeCountText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '400',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: 'gray',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  scrollViewContent: {
    paddingBottom: 70,
  },
  previousPRCard: {
    backgroundColor: '#1A1A1A',
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
  },
  prMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  prMetricsColumn: {
    alignItems: 'center',
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
    marginTop: 8,
    marginBottom: 10,
  },
  previousBestLabel: {
    color: '#777',
    fontSize: 14,
    marginRight: 6,
  },
  previousBestValue: {
    color: '#777',
    fontSize: 16,
    fontWeight: '600',
  },
  previousBestUnit: {
    color: '#777',
    fontSize: 12,
    marginLeft: 2,
  },
  previousBestSeparator: {
    color: '#777',
    fontSize: 14,
    marginHorizontal: 6,
  },
  improvementBadge: {
    backgroundColor: '#4CD964',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 8,
  },
  improvementText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  outsidePreviousBestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  outsideImprovementBadge: {
    backgroundColor: 'rgba(76, 217, 100, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#4CD964'
  },
  blockedMessage: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});