import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  exercise?: string;
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
  username: string;
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

export default function ViewMilestone() {
  const auth = useAuth() as any;
  const currentUser = auth?.currentUser;
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [isTop5Percent, setIsTop5Percent] = useState(false);

  // Helper function to set milestone data and handle optional properties
  const setMilestoneData = (milestoneData: Milestone) => {
    setMilestone(milestoneData);
    setIsPinned(milestoneData.pinned ?? false);
    setIsTop5Percent(milestoneData.top5Percent ?? false);
  };

  useEffect(() => {
    const fetchData = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (id === 'm1') {
        const milestoneData: Milestone = {
          id: 'm1',
          userId: 'user1',
          username: 'fitness_pro',
          fullName: 'Alex Fitness',
          profileImageUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
          createdAt: new Date(Date.now() - 8640000 * 2),
          milestoneType: 'PR', 
          details: {
            exercise: 'Bench Press',
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
          pinned: true,
          top5Percent: true
        };
        setMilestoneData(milestoneData);
      } else if (id === 'm2') {
        const milestoneData: Milestone = {
          id: 'm2',
          userId: 'user2',
          username: 'runner_girl',
          fullName: 'Sarah Runner',
          profileImageUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
          createdAt: new Date(Date.now() - 86400000),
          milestoneType: 'PR',
          details: {
            exercise: '10K Run',
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
          pinned: false,
          top5Percent: false
        };
        setMilestoneData(milestoneData);
      } else if (id === 'm3') {
        const milestoneData: Milestone = {
          id: 'm3',
          userId: 'user3',
          username: 'weightloss_journey',
          fullName: 'Jamie Progress',
          profileImageUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
          createdAt: new Date(Date.now() - 43200000),
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
          isLiked: true,
          associatedPostId: 'post3',
          postImageUrl: 'https://images.unsplash.com/photo-1535743686920-55e4145369b9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
          pinned: true,
          top5Percent: false
        };
        setMilestoneData(milestoneData);
      } else if (id === 'm4') {
        const milestoneData: Milestone = {
          id: 'm4',
          userId: 'user7',
          username: 'super_athlete',
          fullName: 'Jamie Athlete',
          profileImageUrl: 'https://randomuser.me/api/portraits/women/28.jpg',
          createdAt: new Date(Date.now() - 120000),
          milestoneType: 'PR',
          details: {
            exercise: 'Squat',
            value: 315,
            weightUnit: 'lbs',
            reps: 3,
            previousValue: 275,
            previousReps: 3,
            improvement: '14.5%'
          },
          stats: {
            likes: 45
          },
          isLiked: false,
          associatedPostId: 'post4',
          pinned: true,
          top5Percent: true
        };
        setMilestoneData(milestoneData);
      } else {
        const milestoneData: Milestone = {
          id: id as string || 'unknown',
          userId: 'user1',
          username: 'hlthy_user',
          fullName: 'Hlthy User',
          profileImageUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
          createdAt: new Date(Date.now() - 86400000),
          milestoneType: 'PR',
          details: {
            exercise: 'Deadlift',
            value: 315,
            weightUnit: 'lbs',
            reps: 3,
            previousValue: 285,
            previousReps: 3,
            improvement: '10.5%'
          },
          stats: {
            likes: 12
          },
          isLiked: false,
          pinned: false,
          top5Percent: false
        };
        setMilestoneData(milestoneData);
      }
      
      setLoading(false);
    };
    
    fetchData();
  }, [id]);

  const handleLike = () => {
    if (!milestone) return;
    
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
  };

  const navigateToPost = (postId: string | undefined) => {
    if (postId) {
      router.push(`/view-post/${postId}`);
    }
  };
  
  const navigateToProfile = (userId: string) => {
    router.push(`/profile?id=${userId}`);
  };
  
  const handleShare = async () => {
    if (!currentUser) {
      Alert.alert("Please log in", "You need to be logged in to share milestones.");
      return;
    }
    
    setShareModalVisible(true);

    // implement this later
    /*
    try {
      const result = await Share.share({
        message: `Check out this amazing milestone from ${milestone.username} on Hlthy!`,
        url: `https://hlthy.app/milestone/${milestone.id}`
      });
    } catch (error) {
      console.error('Error sharing milestone:', error);
    }
      */
  };

  const shareMilestoneWithUser = async (userId: string, username: string, profileImageUrl?: string) => {
    if (!currentUser || !milestone) return;
    
    try {
      await shareMilestone(
        currentUser,
        userId,
        username,
        profileImageUrl,
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


  const formatTimeAgo = (date: Date) => {
    if (!date) return 'Just now';
    
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderMilestoneDetails = () => {
    if (!milestone) return null;
    
    if (milestone.milestoneType === 'PR') {
      return (
        <View style={styles.detailsContainer}>
          <View style={styles.previousPRCard}>
            <View style={styles.previousPRHeader}>
              <MaterialCommunityIcons name="trophy-outline" size={18} color="#FF5E69" />
              <Text style={styles.previousPRTitle}>{milestone.details.exercise}</Text>
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
          
          {/* Previous Best Value (outside the card) */}
          {milestone.details.previousValue && (
            <View style={styles.outsidePreviousBestRow}>
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
          )}
          
          {/* Improvement Badge (outside the card) */}
          {milestone.details.improvement && (
            <View style={styles.outsideImprovementBadge}>
              <Text style={styles.improvementText}>+{milestone.details.improvement}</Text>
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
          
          {/* Previous Weight (outside the card) */}
          {milestone.details.previousWeight && (
            <View style={styles.outsidePreviousBestRow}>
              <Text style={styles.previousBestLabel}>Previous Weight:</Text>
              <View style={styles.prMetricGroup}>
                <Text style={styles.previousBestValue}>{milestone.details.previousWeight}</Text>
                <Text style={styles.previousBestUnit}>{milestone.details.previousWeightUnit}</Text>
              </View>
            </View>
          )}
          
          {/* Total Change Badge (outside the card) */}
          {milestone.details.totalLoss && (
            <View style={styles.outsideImprovementBadge}>
              <Text style={styles.improvementText}>
                {isLoss ? '-' : '+'}{milestone.details.totalLoss} {milestone.details.newWeightUnit} ({milestone.details.percentageLoss})
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
        <View style={styles.userSection}>
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
          <Text style={styles.timestamp}>{formatTimeAgo(milestone.createdAt)}</Text>
        </View>
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
      </ScrollView>
      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        onShareWith={shareMilestoneWithUser}
      />
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
    backgroundColor: '#000',
    zIndex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerSpacer: {
    height: 80,
  },
  userSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  // Previous Best widget styles
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
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  // Style merged with first declaration
  outsidePreviousBestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  outsideImprovementBadge: {
    backgroundColor: '#4CD964',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'center',
    marginTop: 8,
  },
});