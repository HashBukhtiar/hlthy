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
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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

export default function MilestonesFeed() {
  const router = useRouter();
  const { currentUser, userProfile } = useAuth();
  const { milestones: feedMilestones, loading, refreshing, loadingMore, hasMore, error, refreshFeed, loadMorePosts } = useFeedData();
  const { likePost, unlikePost } = usePostsData();
  const { canInteractWithUser, isUserBlocked } = useBlockEnforcement();
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const milestoneToShare = useRef<FeedMilestone | null>(null);
  const { getWeightUnit, getDistanceUnit } = useUnits();
  
  // Local state for optimistic updates  
  const [milestones, setMilestones] = useState<typeof feedMilestones>([]);

  // Update local milestones when feedMilestones change
  useEffect(() => {
    setMilestones(feedMilestones);
  }, [feedMilestones]);

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
  
  const handleLike = useCallback(async (milestoneId: string, isCurrentlyLiked: boolean) => {
    if (!currentUser || !userProfile) {
      Alert.alert('Please log in', 'You need to be logged in to like milestones.');
      return;
    }

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

  const renderMilestoneDetails = useCallback((milestone: FeedMilestone) => {
    const details = milestone.milestoneDetails;
    
    if (details.type === 'PR') {
      // Format weight/distance units based on user preferences
      const displayValue = details.value;
      const originalUnit = details.weightUnit;
      let displayUnit = originalUnit;
      let convertedValue = displayValue;
      
      // Convert to user's preferred unit if different
      if (originalUnit === 'kg' || originalUnit === 'lbs') {
        const preferredWeightUnit = getWeightUnit();
        if (originalUnit !== preferredWeightUnit) {
          if (originalUnit === 'kg' && preferredWeightUnit === 'lbs') {
            convertedValue = Math.round(displayValue * 2.20462 * 10) / 10;
          } else if (originalUnit === 'lbs' && preferredWeightUnit === 'kg') {
            convertedValue = Math.round(displayValue * 0.453592 * 10) / 10;
          }
          displayUnit = `${preferredWeightUnit} (${displayValue} ${originalUnit})`;
        } else {
          displayUnit = preferredWeightUnit;
        }
      } else if (originalUnit === 'km' || originalUnit === 'miles') {
        const preferredDistanceUnit = getDistanceUnit();
        if (originalUnit !== preferredDistanceUnit) {
          if (originalUnit === 'km' && preferredDistanceUnit === 'miles') {
            convertedValue = Math.round(displayValue * 0.621371 * 10) / 10;
          } else if (originalUnit === 'miles' && preferredDistanceUnit === 'km') {
            convertedValue = Math.round(displayValue * 1.60934 * 10) / 10;
          }
          displayUnit = `${preferredDistanceUnit} (${displayValue} ${originalUnit})`;
        } else {
          displayUnit = preferredDistanceUnit;
        }
      }

      // Format previous value similarly
      let previousDisplayValue = details.previousValue;
      let previousDisplayUnit = originalUnit;
      if (details.previousValue && originalUnit !== displayUnit.split(' ')[0]) {
        if (originalUnit === 'kg' && displayUnit.includes('lbs')) {
          previousDisplayValue = Math.round(details.previousValue * 2.20462 * 10) / 10;
          previousDisplayUnit = getWeightUnit();
        } else if (originalUnit === 'lbs' && displayUnit.includes('kg')) {
          previousDisplayValue = Math.round(details.previousValue * 0.453592 * 10) / 10;
          previousDisplayUnit = getWeightUnit();
        } else if (originalUnit === 'km' && displayUnit.includes('miles')) {
          previousDisplayValue = Math.round(details.previousValue * 0.621371 * 10) / 10;
          previousDisplayUnit = getDistanceUnit();
        } else if (originalUnit === 'miles' && displayUnit.includes('km')) {
          previousDisplayValue = Math.round(details.previousValue * 1.60934 * 10) / 10;
          previousDisplayUnit = getDistanceUnit();
        }
      }
      
      return (
        <View style={styles.detailsContainer}>
          <View style={styles.previousPRCard}>
            <View style={styles.previousPRHeaderNoLine}>
              <MaterialCommunityIcons name="trophy-outline" size={18} color="#FF5E69" />
              <Text style={styles.previousPRTitle}>
                {details.exerciseName || 'Personal Record'}
              </Text>
              <Text style={styles.previousPRDate}>{formatTimeAgo(milestone.createdAt)}</Text>
            </View>
            
            <View style={styles.previousPRContent}>
              <View style={styles.prMetricsRow}>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.prMetricValue}>{convertedValue}</Text>
                  <Text style={styles.prMetricLabel}>{displayUnit}</Text>
                </View>
                {details.reps && (
                  <>
                    <Text style={styles.prMetricSeparator}>×</Text>
                    <View style={styles.prMetricGroup}>
                      <Text style={styles.prMetricValue}>{details.reps}</Text>
                      <Text style={styles.prMetricLabel}>reps</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
          
          {details.previousValue && (
            <View style={styles.centeredRow}>
              <View style={styles.previousBestRow}>
                <Text style={styles.previousBestLabel}>Previous Best:</Text>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.previousBestValue}>{previousDisplayValue}</Text>
                  <Text style={styles.previousBestUnit}>{previousDisplayUnit}</Text>
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
        displayWeightUnit = `${preferredWeightUnit} (${details.newWeight} ${originalWeightUnit})`;
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
              <Text style={styles.previousPRDate}>{formatTimeAgo(milestone.createdAt)}</Text>
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
                <Text style={styles.previousBestLabel}>Previous Weight:</Text>
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
  }, [formatTimeAgo, getWeightUnit, getDistanceUnit]);

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
            <View style={styles.milestoneIconContainer}>
              <TouchableOpacity onPress={() => canInteract ? navigateToProfile(item.authorId) : null}>
                <Image 
                  source={{ uri: getOptimalImageUrl(item.authorProfileThumbnailUrl, item.authorProfileImageUrl) }} 
                  style={styles.profilePic}
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.milestoneTitleContainer}>
              <Text style={styles.milestoneType}>
                {item.authorUsername}
              </Text>
              <Text style={styles.milestoneDate}>
                {formatTimeAgo(item.createdAt)}
                {hasStatus && <Text style={{color: statusColor}}> • {statusText}</Text>}
              </Text>
            </View>
            
            {/* Post Preview (if available) */}
            {canInteract && item.imageUrl && (
              <TouchableOpacity 
                style={styles.postPreviewContainer}
                onPress={() => navigateToPost(item.associatedPostId || '')}
                activeOpacity={0.9}
              >
                <Image 
                  source={{ uri: getOptimalImageUrl(item.imageUrl, item.imageUrl) }} 
                  style={styles.postPreviewImage} 
                />
                <View style={styles.postPreviewOverlay}>
                  <Ionicons name="camera" size={12} color="#FFF" />
                </View>
              </TouchableOpacity>
            )}
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
            >
              <Ionicons 
                name={item.isLiked ? "heart" : "heart-outline"} 
                size={20} 
                color={item.isLiked ? "#FF69B4" : "#FFF"} 
              />
              <Text style={styles.footerButtonText}>
                {item.reactionCount > 0 
                  ? `${item.reactionCount}` 
                  : "Like"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.footerButton}
              onPress={() => handleShare(item)}
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
        <Ionicons name="trophy-outline" size={80} color="#333" />
        <Text style={styles.emptyMilestonesTitle}>No milestones yet</Text>
        <Text style={styles.emptyMilestonesText}>
          Follow users to see their achievements here, or create your first milestone!
        </Text>
        <TouchableOpacity 
          style={styles.createButton}
        >
          <Text style={styles.createButtonText}>Create Milestone</Text>
        </TouchableOpacity>
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
    padding: 15,
  },
  milestoneIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden', 
    marginRight: 12,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  milestoneTitleContainer: {
    flex: 1,
  },
  milestoneType: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  milestoneDate: {
    color: '#999',
    fontSize: 12,
  },
  postPreviewContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginLeft: 10,
  },
  postPreviewImage: {
    width: '100%',
    height: '100%',
  },
  postPreviewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  detailsContainer: {
    padding: 15,
    paddingTop: 0,
    paddingBottom: 8,
  },
  previousPRCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  previousPRHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    paddingTop: 8,
    paddingHorizontal: 12,
    marginHorizontal: -12,
    marginTop: -12,
    backgroundColor: '#2C2C2E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  previousPRHeaderNoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    paddingTop: 8,
    paddingHorizontal: 12,
    marginHorizontal: -12,
    marginTop: -12,
    backgroundColor: '#2C2C2E',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  previousPRTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  previousPRDate: {
    color: '#999',
    fontSize: 12,
  },
  previousPRContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  prMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  prMetricGroup: {
    alignItems: 'center',
  },
  prMetricValue: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  prMetricLabel: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  prMetricSeparator: {
    color: '#999',
    fontSize: 16,
    marginHorizontal: 8,
  },
  previousBestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previousBestLabel: {
    color: '#777',
    fontSize: 12,
    fontWeight: '600',
  },
  previousBestValue: {
    color: '#777',
    fontSize: 14,
    fontWeight: '600',
  },
  previousBestUnit: {
    color: '#777',
    fontSize: 12,
    marginLeft: 2,
  },
  previousBestSeparator: {
    color: '#777',
    fontSize: 12,
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
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: 'transparent',
    flex: 1,
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
  emptyMilestonesTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyMilestonesText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  createButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  createButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
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