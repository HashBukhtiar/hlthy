import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, ActivityIndicator, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function ViewMilestone() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [milestone, setMilestone] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (id === 'm1') {
        setMilestone({
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
          reactions: {
            '❤️': 24,
            '💪': 15,
            '🔥': 8
          },
          userReaction: null,
          associatedPostId: 'post1',
          postImageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
          comments: [
            {
              id: 'c1',
              userId: 'user2',
              username: 'lifter_1',
              profileImageUrl: 'https://randomuser.me/api/portraits/men/42.jpg',
              text: 'Amazing progress! Keep pushing!',
              createdAt: new Date(Date.now() - 36000000)
            },
            {
              id: 'c2',
              userId: 'user3',
              username: 'fit_coach',
              profileImageUrl: 'https://randomuser.me/api/portraits/women/24.jpg',
              text: 'Great form on that bench. Next goal: 250?',
              createdAt: new Date(Date.now() - 18000000)
            }
          ]
        });
      } else if (id === 'm2') {
        setMilestone({
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
          reactions: {
            '❤️': 18,
            '💪': 7,
            '🔥': 12
          },
          userReaction: '❤️',
          associatedPostId: 'post2',
          comments: [
            {
              id: 'c3',
              userId: 'user4',
              username: 'track_star',
              profileImageUrl: 'https://randomuser.me/api/portraits/women/33.jpg',
              text: 'Wow, you\'re getting so fast! What\'s your training plan?',
              createdAt: new Date(Date.now() - 50000000)
            }
          ]
        });
      } else if (id === 'm3') {
        setMilestone({
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
          reactions: {
            '❤️': 35,
            '💪': 22,
            '🔥': 19
          },
          userReaction: '🔥',
          associatedPostId: 'post3',
          postImageUrl: 'https://images.unsplash.com/photo-1535743686920-55e4145369b9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
          comments: [
            {
              id: 'c4',
              userId: 'user5',
              username: 'fitness_journey2',
              profileImageUrl: 'https://randomuser.me/api/portraits/women/55.jpg',
              text: 'So inspiring! What changes did you make to your diet?',
              createdAt: new Date(Date.now() - 21600000)
            },
            {
              id: 'c5',
              userId: 'user6',
              username: 'health_coach',
              profileImageUrl: 'https://randomuser.me/api/portraits/men/66.jpg',
              text: 'Consistent progress is key. Great work!',
              createdAt: new Date(Date.now() - 7200000)
            }
          ]
        });
      } else {
        setMilestone({
          id: id || 'unknown',
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
          reactions: {
            '❤️': 12,
            '💪': 8,
            '🔥': 5
          },
          userReaction: null,
          comments: []
        });
      }
      
      setLoading(false);
    };
    
    fetchData();
  }, [id]);

  const handleReaction = (reaction) => {
    if (!milestone) return;
    
    setMilestone(prevState => {
      const updatedReactions = { ...prevState.reactions };
      
      if (prevState.userReaction === reaction) {
        updatedReactions[reaction] = Math.max(0, updatedReactions[reaction] - 1);
        
        return {
          ...prevState,
          reactions: updatedReactions,
          userReaction: null
        };
      }
      
      if (prevState.userReaction) {
        updatedReactions[prevState.userReaction] = Math.max(0, updatedReactions[prevState.userReaction] - 1);
      }
      
      updatedReactions[reaction] = (updatedReactions[reaction] || 0) + 1;
      
      return {
        ...prevState,
        reactions: updatedReactions,
        userReaction: reaction
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
            style={styles.userInfoContainer}
            onPress={() => navigateToProfile(milestone.userId)}
          >
            <Image source={{ uri: milestone.profileImageUrl }} style={styles.profilePic} />
            <View>
              <Text style={styles.username}>{milestone.username}</Text>
              <Text style={styles.fullName}>{milestone.fullName}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.rightHeader}>
            <Text style={styles.timestamp}>{formatTimeAgo(milestone.createdAt)}</Text>
            <TouchableOpacity onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.milestoneCard}>
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
        
        <View style={styles.reactionsContainer}>
          <Text style={styles.sectionTitle}>Reactions</Text>
          <View style={styles.reactionsContent}>
            <View style={styles.reactionButtons}>
              {['❤️', '💪', '🔥'].map(emoji => (
                <TouchableOpacity 
                  key={emoji}
                  style={[
                    styles.combinedReactionButton,
                    milestone.userReaction === emoji && styles.activeReactionButton
                  ]}
                  onPress={() => handleReaction(emoji)}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  {(milestone.reactions[emoji] && milestone.reactions[emoji] > 0) && (
                    <Text style={styles.reactionCount}>{milestone.reactions[emoji]}</Text>
                  )}
                </TouchableOpacity>
              ))}
              {Object.values(milestone.reactions).reduce((a, b) => a + b, 0) === 0 && (
                <Text style={styles.noReactionsText}>No reactions yet</Text>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.commentsContainer}>
          <Text style={styles.sectionTitle}>Comments</Text>
          {milestone.comments && milestone.comments.length > 0 ? (
            <View style={styles.commentsList}>
              {milestone.comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <TouchableOpacity 
                    onPress={() => navigateToProfile(comment.userId)}
                    style={styles.commentUserInfo}
                  >
                    <Image source={{ uri: comment.profileImageUrl }} style={styles.commentProfilePic} />
                    <View style={styles.commentContent}>
                      <View style={styles.commentHeader}>
                        <Text style={styles.commentUsername}>{comment.username}</Text>
                        <Text style={styles.commentTime}>{formatTimeAgo(comment.createdAt)}</Text>
                      </View>
                      <Text style={styles.commentText}>{comment.text}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noCommentsText}>No comments yet</Text>
          )}
          
          <TouchableOpacity 
            style={styles.viewCommentsButton}
            onPress={() => milestone.associatedPostId && navigateToPost(milestone.associatedPostId)}
          >
            <Text style={styles.viewCommentsText}>
              {milestone.comments && milestone.comments.length > 0 ? 
                'View all comments' : 'Add a comment'}
            </Text>
            <Ionicons name="chatbubble-outline" size={16} color="#0A84FF" style={{marginLeft: 5}} />
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
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomColor: '#222',
    borderBottomWidth: 1,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
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
    marginBottom: 5,
  },
  milestoneCard: {
    backgroundColor: '#1A1A1A',
    margin: 15,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
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
  reactionsContainer: {
    margin: 15,
    padding: 15,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  reactionsContent: {
    alignItems: 'flex-start',
  },
  reactionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  combinedReactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    marginBottom: 10,
  },
  activeReactionButton: {
    backgroundColor: '#0A84FF',
  },
  reactionEmoji: {
    fontSize: 16,
    marginRight: 5,
  },
  reactionCount: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '500',
  },
  noReactionsText: {
    color: '#999',
    fontSize: 14,
  },
  commentsContainer: {
    margin: 15,
    padding: 15,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 30,
  },
  commentsList: {
    marginBottom: 15,
  },
  commentItem: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 15,
  },
  commentUserInfo: {
    flexDirection: 'row',
  },
  commentProfilePic: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  commentUsername: {
    color: '#FFF',
    fontWeight: '500',
    fontSize: 14,
  },
  commentTime: {
    color: '#999',
    fontSize: 12,
  },
  commentText: {
    color: '#FFF',
    fontSize: 14,
  },
  noCommentsText: {
    color: '#999',
    fontSize: 14,
    marginBottom: 15,
  },
  viewCommentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  viewCommentsText: {
    color: '#0A84FF',
    fontWeight: '500',
  },
});