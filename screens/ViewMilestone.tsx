import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, ActivityIndicator, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [isTop5Percent, setIsTop5Percent] = useState(false);

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
          top5Percent: false
        };
        setMilestone(milestoneData);
        setIsPinned(milestoneData.pinned);
        setIsTop5Percent(milestoneData.top5Percent);
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
          top5Percent: true
        };
        setMilestone(milestoneData);
        setIsPinned(milestoneData.pinned);
        setIsTop5Percent(milestoneData.top5Percent);
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
          pinned: false,
          top5Percent: false
        };
        setMilestone(milestoneData);
        setIsPinned(milestoneData.pinned);
        setIsTop5Percent(milestoneData.top5Percent);
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
        setMilestone(milestoneData);
        setIsPinned(milestoneData.pinned);
        setIsTop5Percent(milestoneData.top5Percent);
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
        setMilestone(milestoneData);
        setIsPinned(milestoneData.pinned);
        setIsTop5Percent(milestoneData.top5Percent);
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

  const navigateToPost = (postId) => {
    if (postId) {
      router.push(`/view-post/${postId}`);
    }
  };
  
  const navigateToProfile = (userId) => {
    router.push(`/profile?id=${userId}`);
  };
  
  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `Check out this amazing milestone from ${milestone.username} on Hlthy!`,
        url: `https://hlthy.app/milestone/${milestone.id}`
      });
    } catch (error) {
      console.error('Error sharing milestone:', error);
    }
  };

  const formatTimeAgo = (date) => {
    if (!date) return 'Just now';
    
    const seconds = Math.floor((new Date() - date) / 1000);
    
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
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Exercise:</Text>
            <Text style={styles.detailValue}>{milestone.details.exercise}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>New PR:</Text>
            <Text style={styles.detailValue}>
              <Text style={styles.highlightedValue}>{milestone.details.value} {milestone.details.weightUnit}</Text>
              {milestone.details.reps > 1 ? ` × ${milestone.details.reps} reps` : ''}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Previous:</Text>
            <Text style={styles.detailValue}>
              {milestone.details.previousValue} {milestone.details.weightUnit}
              {milestone.details.previousReps > 1 ? ` × ${milestone.details.previousReps} reps` : ''}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Improvement:</Text>
            <Text style={styles.detailValue}>
              <Text style={styles.improvementValue}>{milestone.details.improvement}</Text>
            </Text>
          </View>
        </View>
      );
    } else if (milestone.milestoneType === 'weightLoss' || milestone.milestoneType === 'weightGain') {
      const isLoss = milestone.milestoneType === 'weightLoss';
      
      return (
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type:</Text>
            <Text style={styles.detailValue}>
              {isLoss ? 'Weight Loss' : 'Weight Gain'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>New Weight:</Text>
            <Text style={styles.detailValue}>
              <Text style={styles.highlightedValue}>
                {milestone.details.newWeight} {milestone.details.newWeightUnit}
              </Text>
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Previous:</Text>
            <Text style={styles.detailValue}>
              {milestone.details.previousWeight} {milestone.details.previousWeightUnit}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {isLoss ? 'Total Loss:' : 'Total Gain:'}
            </Text>
            <Text style={styles.detailValue}>
              <Text style={isLoss ? styles.lossValue : styles.gainValue}>
                {isLoss ? '-' : '+'}{milestone.details.totalLoss} {milestone.details.newWeightUnit}
                {' '}({milestone.details.percentageLoss})
              </Text>
            </Text>
          </View>
        </View>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0A84FF" />
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
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
            <Ionicons name="paper-plane-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </View>

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
            <View style={styles.pinnedContainer}>
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
        
        {milestone.postImageUrl && (
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
              <Ionicons name="chevron-forward" size={16} color="#0A84FF" />
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
              {milestone.isLiked ? 'Liked' : 'Like'} 
              {milestone.stats.likes > 0 && ` (${milestone.stats.likes})`}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
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
  pinnedContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
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
    borderBottomWidth: 1,
    borderBottomColor: '#333',
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
    color: '#0A84FF',
    fontWeight: '500',
    marginRight: 5,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#222',
    marginTop: 20,
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
});