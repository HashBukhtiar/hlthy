import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  FlatList,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ShareModal from '@/components/ShareModal';
import { shareMilestone } from '@/services/ShareService';
import { useAuth } from '@/context/AuthContext';

// Define interfaces for milestone data
export interface MilestoneStats {
  likes: number;
}

export interface MilestoneDetails {
  exerciseName?: string;
  value?: number;
  weightUnit?: string;
  reps?: number;
  newWeight?: number;
  newWeightUnit?: string;
  previousWeight?: number;
  previousWeightUnit?: string;
  previousValue?: number;
  previousReps?: number;
  improvement?: string;
  totalLoss?: number;
  percentageLoss?: string;
}

export interface Milestone {
  id: string;
  userId: string;
  fullName?: string;
  profileImageUrl: string;
  createdAt: Date;
  milestoneType: 'PR' | 'weightLoss' | 'weightGain' | string;
  details: MilestoneDetails;
  stats: MilestoneStats;
  isLiked: boolean;
  associatedPostId?: string;
  postImageUrl?: string;
  pinned?: boolean;
  top5Percent?: boolean;
}

export default function MilestonesFeed() {
  const router = useRouter();
  const auth = useAuth() as any;
  const currentUser = auth?.currentUser;
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const milestoneToShare = useRef<Milestone | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      id: 'm1',
      userId: 'user1',
      fullName: 'Alex Fitness',
      profileImageUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
      createdAt: new Date(Date.now() - 8640000 * 2), // 2 days ago
      milestoneType: 'PR', 
      details: {
        exerciseName: 'Bench Press',
        value: 225,
        weightUnit: 'lbs',
        reps: 5,
        previousValue: 205,
        previousReps: 5,
        improvement: '9.7%'
      },
      stats: {
        likes: 24
      },
      isLiked: false,
      associatedPostId: 'post1',
      postImageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      pinned: false,
      top5Percent: true
    },
    {
      id: 'm2',
      userId: 'user2',
      fullName: 'Sarah Runner',
      profileImageUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      milestoneType: 'PR',
      details: {
        exerciseName: '10K Run',
        value: 42.5,
        weightUnit: 'min',
        reps: 1,
        previousValue: 45.8,
        previousReps: 1,
        improvement: '7.2%'
      },
      stats: {
        likes: 18
      },
      isLiked: true,
      associatedPostId: 'post2',
      top5Percent: false,
      pinned: false
    },
    {
      id: 'm3',
      userId: 'user3',
      fullName: 'Jamie Progress',
      profileImageUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
      createdAt: new Date(Date.now() - 43200000), // 12 hours ago
      milestoneType: 'weightLoss',
      details: {
        newWeight: 165,
        newWeightUnit: 'lbs',
        previousWeight: 180,
        previousWeightUnit: 'lbs',
        totalLoss: 15,
        percentageLoss: '8.3%'
      },
      stats: {
        likes: 35
      },
      isLiked: false,
      associatedPostId: 'post3',
      postImageUrl: 'https://images.unsplash.com/photo-1535743686920-55e4145369b9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
      pinned: true,
      top5Percent: false
    }
  ]);
  
  // Format the time as "X time ago"
  const formatTimeAgo = (date: Date): string => {
    if (!date) return 'Just now';
    
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };
  
  const handleLike = (milestoneId: string): void => {
    setMilestones(milestones.map(milestone => {
      if (milestone.id === milestoneId) {
        // Toggle liked status and update like count
        const newIsLiked = !milestone.isLiked;
        const likeDelta = newIsLiked ? 1 : -1;
        
        return {
          ...milestone,
          isLiked: newIsLiked,
          stats: {
            ...milestone.stats,
            likes: Math.max(0, milestone.stats.likes + likeDelta)
          }
        };
      }
      return milestone;
    }));
  };
  
  const navigateToMilestone = (id: string): void => {
    router.push(`/view-milestone/${id}`);
  };
  
  const navigateToPost = (id: string): void => {
    if (id) {
      router.push(`/view-post/${id}`);
    }
  };
  
  const navigateToProfile = (userId: string): void => {
    router.push(`/profile?id=${userId}`);
  };

  const handleShare = async (milestone: Milestone) => {
    if (!currentUser) {
      Alert.alert("Please log in", "You need to be logged in to share milestones.");
      return;
    }
    
    milestoneToShare.current = milestone;
    setShareModalVisible(true);
    // implement later
    /*
    try {
      await Share.share({
        message: `Check out this amazing milestone on Hlthy!`,
        url: `https://hlthy.app/milestone/${milestone.id}`
      });
    } catch (error) {
      console.error('Error sharing milestone:', error);
    }
    */
  };

  const handleShareWithUser = async (userId: string, username: string, profileImageUrl?: string) => {
    if (!currentUser || !milestoneToShare.current) return;
    
    try {
      await shareMilestone(
        currentUser,
        userId,
        username,
        profileImageUrl,
        {
          id: milestoneToShare.current.id,
          milestoneType: milestoneToShare.current.milestoneType,
          details: milestoneToShare.current.details,
          username: milestoneToShare.current.fullName,
        }
      );
      
      // Close modal and show confirmation
      setShareModalVisible(false);
      Alert.alert("Success", "Milestone shared successfully");
    } catch (error) {
      console.error("Error sharing milestone:", error);
      Alert.alert("Error", "Failed to share milestone. Please try again.");
    }
  };

  const renderMilestoneDetails = (milestone: Milestone) => {
    if (milestone.milestoneType === 'PR') {
      return (
        <View style={styles.detailsContainer}>
          <View style={styles.previousPRCard}>
            <View style={styles.previousPRHeaderNoLine}>
              <MaterialCommunityIcons name="trophy-outline" size={18} color="#FF5E69" />
              <Text style={styles.previousPRTitle}>
                {milestone.details.exercise || 'Personal Record'}
                </Text>
              <Text style={styles.previousPRDate}>{formatTimeAgo(milestone.createdAt)}</Text>
            </View>
            
            <View style={styles.previousPRContent}>
              {/* Current PR Value */}
              <View style={styles.prMetricsRow}>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.prMetricValue}>{milestone.details.value}</Text>
                  <Text style={styles.prMetricLabel}>{milestone.details.weightUnit}</Text>
                </View>
                {milestone.details.reps && (
                  <>
                    <Text style={styles.prMetricSeparator}>×</Text>
                    <View style={styles.prMetricGroup}>
                      <Text style={styles.prMetricValue}>{milestone.details.reps}</Text>
                      <Text style={styles.prMetricLabel}>reps</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>
          
          {/* Previous Best only, improvement badge removed */}
          {milestone.details.previousValue && (
            <View style={styles.centeredRow}>
              <View style={styles.previousBestRow}>
                <Text style={styles.previousBestLabel}>Previous Best:</Text>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.previousBestValue}>{milestone.details.previousValue}</Text>
                  <Text style={styles.previousBestUnit}>{milestone.details.weightUnit}</Text>
                </View>
                {milestone.details.previousReps && (
                  <>
                    <Text style={styles.previousBestSeparator}>×</Text>
                    <View style={styles.prMetricGroup}>
                      <Text style={styles.previousBestValue}>{milestone.details.previousReps}</Text>
                      <Text style={styles.previousBestUnit}>reps</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      );
    } else if (milestone.milestoneType === 'weightLoss' || milestone.milestoneType === 'weightGain') {
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
              {/* Current Weight */}
              <View style={styles.prMetricsRow}>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.prMetricValue}>{milestone.details.newWeight}</Text>
                  <Text style={styles.prMetricLabel}>{milestone.details.newWeightUnit}</Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Previous Weight centered, styled like PR previous best */}
          {milestone.details.previousWeight && (
            <View style={styles.centeredRow}>
              <View style={styles.previousBestRow}>
                <Text style={styles.previousBestLabel}>Previous Weight:</Text>
                <View style={styles.prMetricGroup}>
                  <Text style={styles.previousBestValue}>{milestone.details.previousWeight}</Text>
                  <Text style={styles.previousBestUnit}>{milestone.details.previousWeightUnit}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      );
    }
    
    return null;
  };

  const renderMilestoneCard = (item: Milestone) => {
    // Determine the styling based on milestone status
    let CardWrapper: any = View;
    let wrapperStyle = styles.milestoneCard;
    let innerContent = null;
    
    if (item.top5Percent) {
      // Top 5% milestone with gradient border
      CardWrapper = LinearGradient;
      wrapperStyle = styles.gradientBorder;
      innerContent = (
        <View style={styles.gradientInnerContainer}>
          {renderCardContent(item, true, 'Top 5%', '#FFA84B')}
        </View>
      );
    } else if (item.pinned) {
      // Pinned milestone 
      wrapperStyle = styles.pinnedBorder;
      innerContent = (
        <View style={styles.pinnedInnerContainer}>
          {renderCardContent(item, true, 'Pinned', '#FF5E69')}
        </View>
      );
    } else {
      // Regular milestone
      innerContent = renderCardContent(item);
    }
    
    // Render the appropriate card with gradient if top 5%
    if (item.top5Percent) {
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
    
    // For pinned or regular milestones
    return (
      <View style={item.pinned ? styles.pinnedWrapper : null}>
        <View style={wrapperStyle}>
          {innerContent}
        </View>
      </View>
    );
  };

  // Helper function to render the card content
  const renderCardContent = (item: Milestone, hasStatus = false, statusText = '', statusColor = '') => {
    return (
      <>
        {/* Milestone Card Header and Details */}
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => navigateToMilestone(item.id)}
        >
          <View style={styles.milestoneHeader}>
            <View style={styles.milestoneIconContainer}>
              <TouchableOpacity onPress={() => navigateToProfile(item.userId)}>
                <Image 
                  source={{ uri: item.profileImageUrl }} 
                  style={styles.profilePic}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.milestoneTitleContainer}>
              <Text style={styles.milestoneType}>
                {item.fullName}
              </Text>
              <Text style={styles.milestoneDate}>
                {formatTimeAgo(item.createdAt)}
                {hasStatus && <Text style={{color: statusColor}}> • {statusText}</Text>}
              </Text>
            </View>
            
            {/* Post Preview (if available) */}
            {item.postImageUrl && (
              <TouchableOpacity 
                style={styles.postPreviewContainer}
                onPress={() => navigateToPost(item.associatedPostId || '')}
                activeOpacity={0.9}
              >
                <Image 
                  source={{ uri: item.postImageUrl }} 
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
        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={styles.footerButton}
            onPress={() => handleLike(item.id)}
          >
            <Ionicons 
              name={item.isLiked ? "heart" : "heart-outline"} 
              size={20} 
              color={item.isLiked ? "#FF69B4" : "#FFF"} 
            />
            <Text style={styles.footerButtonText}>
              {item.stats.likes > 0 
                ? `${item.stats.likes}` 
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
      </>
    );
  };

  if (milestones.length === 0) {
    return (
      <View style={styles.emptyMilestonesContainer}>
        <Text style={styles.emptyMilestonesText}>No milestones to display</Text>
      </View>
    );
  }
  
  return (
    <View>
      <FlatList
        data={milestones}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.milestonesContainer}
        renderItem={({item}) => (
          <View style={styles.milestoneContainer}>
            {renderMilestoneCard(item)}
          </View>
        )}
      />
      
      <ShareModal 
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        onShareWith={handleShareWithUser}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  milestonesContainer: {
    width: '100%',
    paddingBottom: 70,
  },
  milestoneContainer: {
    paddingTop: 15,
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  username: {
    fontWeight: '600',
    fontSize: 16,
    color: '#FFF',
  },
  fullName: {
    fontSize: 14,
    color: '#999',
  },
  rightHeader: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  milestoneCardWrapper: {
    paddingHorizontal: 15,
  },
  milestoneCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  gradientWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientBorder: {
    padding: 2,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  gradientInnerContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    overflow: 'hidden',
  },
  pinnedWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  pinnedBorder: {
    padding: 2,
    borderRadius: 12,
    // borderColor: '#FF5E69',
    borderColor: 'rgba(255, 94, 105, 0.75)',
    borderWidth: 2,
    backgroundColor: '#1A1A1A',
    overflow: 'hidden',
  },
  pinnedInnerContainer: {
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
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden', 
    marginRight: 12,
  },
  milestoneIcon: {
    // No additional styles needed
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
  usernameText: {
    color: '#999',
    fontSize: 12,
    marginBottom: 2,
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
  },  detailsContainer: {
    padding: 15,
    paddingTop: 0,
    paddingBottom: 8,
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
  reactionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 12,
    marginTop: 10,
  },
  reactionButtons: {
    flexDirection: 'row',
  },
  combinedReactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  activeReactionButton: {
    backgroundColor: '#FF5E69',
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    color: '#FFF',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#FF5E69',
    marginRight: 4,
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
  previousPRCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginBottom: 4,
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
    padding: 14
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
    fontSize: 16,
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
    marginTop: 6,
    marginBottom: 8,
  },
  previousBestLabel: {
    color: '#777',
    fontSize: 12,
    marginRight: 6,
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
});