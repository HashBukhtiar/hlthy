import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ShareModal from '@/components/ShareModal';
import { shareMilestone } from '@/services/ShareService';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { calculateImprovementPercentage } from '@/logic/milesonteUtils';
import { getOptimalImageUrl } from '@/utils/imageUtils';

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

          // Fetch the author's profile to get the latest profile image
          let authorProfileImageUrl = 'https://via.placeholder.com/150';
          let authorProfileThumbnailUrl = null;
          let authorFullName = data.authorUsername;

          if (data.authorId) {
            const userRef = doc(db, 'users', data.authorId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              authorProfileImageUrl = userData.profileImageUrl || authorProfileImageUrl;
              authorProfileThumbnailUrl = userData.profileThumbnailUrl || null;
              authorFullName = userData.displayName || authorFullName;
            }
          }

          const milestoneData: Milestone = {
            id: milestoneSnap.id,
            userId: data.authorId,
            username: data.authorUsername,
            fullName: authorFullName,
            profileImageUrl: getOptimalImageUrl(authorProfileThumbnailUrl, authorProfileImageUrl),
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

  const renderMilestoneDetails = () => {
    if (!milestone) return null;
    
    if (milestone.milestoneType === 'PR') {
      return (
        <View style={styles.detailsContainer}>
          <View style={styles.previousPRCard}>
            <View style={styles.previousPRHeader}>
              <MaterialCommunityIcons name="trophy-outline" size={18} color="#FF5E69" />
              <Text style={styles.previousPRTitle}>{milestone.details.exerciseName}</Text>
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
          {milestone.details.previousValue != null && (
            <View style={styles.outsidePreviousBestRow}>
              <Text style={styles.previousBestLabel}>Previous Best:</Text>
              <View style={styles.prMetricGroup}>
                <Text style={styles.previousBestValue}>{milestone.details.previousValue}</Text>
                <Text style={styles.previousBestUnit}>{milestone.details.weightUnit}</Text>
              </View>
              {milestone.details.previousReps != null && (
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
          {(() => {
            const improvement = calculateImprovementPercentage(
              milestone.details.value,
              milestone.details.previousValue
            );

            if (improvement && improvement > 0) {
              return (
                <View style={styles.outsideImprovementBadge}>
                  <Text style={styles.improvementText}>
                    +{improvement}% Improvement
                  </Text>
                </View>
              );
            }
            return null;
          })()}
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
                {isLoss ? '↓' : '↑'} {milestone.details.totalLoss} {milestone.details.newWeightUnit}
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
});