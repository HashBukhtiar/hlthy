import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity, 
  FlatList 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Define interfaces for milestone data
export interface MilestoneReactions {
  '❤️': number;
  '💪': number;
  '🔥': number;
  [key: string]: number;
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
  reactions: MilestoneReactions;
  userReaction: string | null;
  associatedPostId?: string;
  postImageUrl?: string;
}

export default function MilestonesFeed() {
  const router = useRouter();
  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      id: 'm1',
      userId: 'user1',
      username: 'fitness_pro',
      fullName: 'Alex Fitness',
      profileImageUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
      createdAt: new Date(Date.now() - 8640000 * 2), // 2 days ago
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
      postImageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 'm2',
      userId: 'user2',
      username: 'runner_girl',
      fullName: 'Sarah Runner',
      profileImageUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
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
      associatedPostId: 'post2'
    },
    {
      id: 'm3',
      userId: 'user3',
      username: 'weightloss_journey',
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
      reactions: {
        '❤️': 35,
        '💪': 22,
        '🔥': 19
      },
      userReaction: '🔥',
      associatedPostId: 'post3',
      postImageUrl: 'https://images.unsplash.com/photo-1535743686920-55e4145369b9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80'
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
  
  const handleReaction = (milestoneId: string, reaction: string): void => {
    setMilestones(milestones.map(milestone => {
      if (milestone.id === milestoneId) {
        // If user already reacted with this reaction, remove it
        if (milestone.userReaction === reaction) {
          const updatedReactions = { ...milestone.reactions };
          updatedReactions[reaction] = Math.max(0, updatedReactions[reaction] - 1);
          
          return {
            ...milestone,
            reactions: updatedReactions,
            userReaction: null
          };
        }
        
        // If user reacted with a different reaction, remove previous and add new
        const updatedReactions = { ...milestone.reactions };
        
        if (milestone.userReaction) {
          updatedReactions[milestone.userReaction] = Math.max(0, updatedReactions[milestone.userReaction] - 1);
        }
        
        updatedReactions[reaction] = (updatedReactions[reaction] || 0) + 1;
        
        return {
          ...milestone,
          reactions: updatedReactions,
          userReaction: reaction
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

  const renderMilestoneDetails = (milestone: Milestone) => {
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
              {milestone.details.reps && milestone.details.reps > 1 ? ` × ${milestone.details.reps} reps` : ''}
            </Text>
          </View>
          
          {milestone.details.previousValue && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Previous:</Text>
              <Text style={styles.detailValue}>
                {milestone.details.previousValue} {milestone.details.weightUnit}
                {milestone.details.previousReps && milestone.details.previousReps > 1 ? ` × ${milestone.details.previousReps} reps` : ''}
              </Text>
            </View>
          )}
          
          {milestone.details.improvement && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Improvement:</Text>
              <Text style={styles.detailValue}>
                <Text style={styles.improvementValue}>{milestone.details.improvement}</Text>
              </Text>
            </View>
          )}
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
          
          {milestone.details.previousWeight && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Previous:</Text>
              <Text style={styles.detailValue}>
                {milestone.details.previousWeight} {milestone.details.previousWeightUnit}
              </Text>
            </View>
          )}
          
          {milestone.details.totalLoss && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {isLoss ? 'Total Loss:' : 'Total Gain:'}
              </Text>
              <Text style={styles.detailValue}>
                <Text style={isLoss ? styles.lossValue : styles.gainValue}>
                  {isLoss ? '-' : '+'}{milestone.details.totalLoss} {milestone.details.newWeightUnit}
                  {milestone.details.percentageLoss && ` (${milestone.details.percentageLoss})`}
                </Text>
              </Text>
            </View>
          )}
        </View>
      );
    }
    
    return null;
  };
  
  if (milestones.length === 0) {
    return (
      <View style={styles.emptyMilestonesContainer}>
        <Text style={styles.emptyMilestonesText}>No milestones to display</Text>
      </View>
    );
  }
  
  return (
    <FlatList
      data={milestones}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.milestonesContainer}
      renderItem={({item}) => (
        <View style={styles.milestoneContainer}>
          
          {/* Milestone Card Content */}
          <TouchableOpacity 
            style={styles.milestoneCardWrapper}
            onPress={() => navigateToMilestone(item.id)}
            activeOpacity={0.9}
          >
            <View style={styles.milestoneCard}>
              {/* Milestone Card Header */}
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
                    {item.fullName || item.username}
                  </Text>
                  <Text style={styles.milestoneDate}>{formatTimeAgo(item.createdAt)}</Text>
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
            </View>
          </TouchableOpacity>
          
          {/* Reactions */}
          <View style={styles.reactionsContainer}>
            <View style={styles.reactionButtons}>
              {['❤️', '💪', '🔥'].map(emoji => (
                <TouchableOpacity 
                  key={emoji}
                  style={[
                    styles.combinedReactionButton,
                    item.userReaction === emoji && styles.activeReactionButton
                  ]}
                  onPress={() => handleReaction(item.id, emoji)}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  {(item.reactions[emoji] && item.reactions[emoji] > 0) && (
                    <Text style={styles.reactionCount}>{item.reactions[emoji]}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            {/* View Full Details Link */}
            <TouchableOpacity 
              style={styles.viewDetailsButton}
              onPress={() => navigateToMilestone(item.id)}
            >
              <Text style={styles.viewDetailsText}>View Details</Text>
              <Ionicons name="chevron-forward" size={14} color="#0A84FF" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  milestonesContainer: {
    width: '100%',
    paddingBottom: 70,
  },
  milestoneContainer: {
    marginBottom: 15,
    borderBottomColor: '#222',
    borderBottomWidth: 1,
    paddingBottom: 15,
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
    borderRadius: 25, // Match the container radius
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
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  milestoneIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden', // Add overflow hidden to ensure image stays in circle
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
    backgroundColor: '#0A84FF',
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
    color: '#0A84FF',
    marginRight: 4,
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
});