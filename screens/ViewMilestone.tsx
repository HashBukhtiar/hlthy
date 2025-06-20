import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ShareModal from '@/components/ShareModal';
import { shareMilestone } from '@/services/ShareService';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

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
  const { currentUser } = useAuth();
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [isTop5Percent, setIsTop5Percent] = useState(false);

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

          const milestoneData: Milestone = {
            id: milestoneSnap.id,
            userId: data.authorId,
            username: data.authorUsername,
            fullName: data.authorFullName || data.authorUsername,
            profileImageUrl: data.authorProfileImageUrl,
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
            stats: {
              likes: data.likeCount || (Array.isArray(data.likes) ? data.likes.length : 0),
            },
            isLiked: currentUser ? (data.likes || []).includes(currentUser.uid) : false,
            associatedPostId: milestoneSnap.id,
            postImageUrl: data.imageUrl || null,
            pinned: data.pinned || false,
            top5Percent: data.top5Percent || false,
          };
          
          setMilestone(milestoneData);
          setIsPinned(milestoneData.pinned);
          setIsTop5Percent(milestoneData.top5Percent);

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
            <Text style={styles.detailValue}>{milestone.details.exerciseName}</Text>
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
    paddingTop: 10
  },
});