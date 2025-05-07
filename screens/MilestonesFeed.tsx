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
}

export interface Milestone {
  id: string;
  userId: string;
  username: string;
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
      profileImageUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
      createdAt: new Date(Date.now() - 8640000 * 2), // 2 days ago
      milestoneType: 'PR', 
      details: {
        exercise: 'Bench Press',
        value: 225,
        weightUnit: 'lbs',
        reps: 5
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
      profileImageUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
      createdAt: new Date(Date.now() - 86400000), // 1 day ago
      milestoneType: 'PR',
      details: {
        exercise: '10K Run',
        value: 42.5,
        weightUnit: 'min',
        reps: 1
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
      profileImageUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
      createdAt: new Date(Date.now() - 43200000), // 12 hours ago
      milestoneType: 'weightLoss',
      details: {
        newWeight: 165,
        newWeightUnit: 'lbs',
        previousWeight: 180,
        previousWeightUnit: 'lbs'
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
        <View style={styles.milestoneValueContainer}>
          <Text style={styles.milestoneValue}>
            <Text style={styles.milestoneStat}>{milestone.details.value} {milestone.details.weightUnit}</Text>
            {milestone.details.reps && milestone.details.reps > 1 ? ` × ${milestone.details.reps} reps` : ''}
          </Text>
          <Text style={styles.milestoneExercise}>{milestone.details.exercise}</Text>
        </View>
      );
    } else if (milestone.milestoneType === 'weightLoss' || milestone.milestoneType === 'weightGain') {
      const isLoss = milestone.milestoneType === 'weightLoss';
      const diff = Math.abs((milestone.details.previousWeight || 0) - (milestone.details.newWeight || 0));
      
      return (
        <View style={styles.milestoneValueContainer}>
          <Text style={styles.milestoneValue}>
            <Text style={styles.milestoneStat}>{milestone.details.newWeight} {milestone.details.newWeightUnit}</Text>
          </Text>
          <Text style={styles.milestoneExercise}>
            {isLoss ? 'Weight Loss' : 'Weight Gain'} 
            <Text style={[styles.milestoneDiff, {color: isLoss ? '#4CD964' : '#FF9500'}]}>
              {' '}({isLoss ? '-' : '+'}{diff} {milestone.details.newWeightUnit})
            </Text>
          </Text>
        </View>
      );
    }
    
    return <Text style={styles.milestoneExercise}>New Achievement</Text>;
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
        <TouchableOpacity 
          style={styles.milestoneContainer}
          onPress={() => navigateToMilestone(item.id)}
          activeOpacity={0.9}
        >
          {/* Header */}
          <View style={styles.milestoneHeader}>
            <TouchableOpacity 
              style={styles.milestoneUserInfo}
              onPress={() => navigateToProfile(item.userId)}
            >
              <Image 
                source={{ uri: item.profileImageUrl }} 
                style={styles.milestoneProfilePic} 
              />
              <View>
                <Text style={styles.milestoneUsername}>{item.username}</Text>
                <Text style={styles.milestoneTime}>{formatTimeAgo(item.createdAt)}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.milestoneAchievementBadge}>
              <Ionicons name="trophy" size={12} color="#FFD700" />
              <Text style={styles.milestoneAchievementText}>
                {item.milestoneType === 'PR' ? 'New PR' : 
                 item.milestoneType === 'weightLoss' ? 'Weight Loss' : 
                 item.milestoneType === 'weightGain' ? 'Weight Gain' : 'Achievement'}
              </Text>
            </View>
          </View>
          
          {/* Content with milestone details and attached image */}
          <View style={styles.milestoneContent}>
            <View style={styles.milestoneMainContent}>
              <View style={styles.milestoneIconContainer}>
                {item.milestoneType === 'PR' ? (
                  <Ionicons name="barbell-outline" size={24} color="#FFF" style={styles.milestoneIcon} />
                ) : (
                  <Ionicons name="fitness-outline" size={24} color="#FFF" style={styles.milestoneIcon} />
                )}
              </View>
              
              {renderMilestoneDetails(item)}
            </View>
            
            {/* Associated Post Image (if available) - inside widget on the right */}
            {item.postImageUrl && (
              <TouchableOpacity 
                style={styles.milestoneImageContainer}
                onPress={() => navigateToPost(item.associatedPostId || '')}
              >
                <Image source={{ uri: item.postImageUrl }} style={styles.milestoneImage} />
                <View style={styles.milestoneImageOverlay}>
                  <Ionicons name="camera" size={14} color="#FFF" />
                </View>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Reactions */}
          <View style={styles.milestoneReactionsContainer}>
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
            
            {/* View Post link when post image exists */}
            {item.postImageUrl && (
              <TouchableOpacity 
                style={styles.viewPostButton}
                onPress={() => navigateToPost(item.associatedPostId || '')}
              >
                <Text style={styles.viewPostButtonText}>View Post</Text>
                <Ionicons name="chevron-forward" size={12} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* View Full Milestone Button */}
          <TouchableOpacity 
            style={styles.viewMilestoneButton}
            onPress={() => navigateToMilestone(item.id)}
          >
            <Text style={styles.viewMilestoneText}>View Details</Text>
            <Ionicons name="chevron-forward" size={14} color="#0A84FF" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  milestoneContainer: {
    marginBottom: 15,
    borderBottomColor: '#222',
    borderBottomWidth: 1,
    paddingBottom: 15,
  },
  milestoneContent: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginVertical: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    flex: 1,
  },
  milestoneIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  milestoneIcon: {
    padding: 5,
  },
  milestoneImageContainer: {
    width: 90,
    height: 90,
    overflow: 'hidden',
  },
  milestoneImage: {
    width: '100%',
    height: '100%',
  },
  milestoneValueContainer: {
    flex: 1,
  },
  milestoneValue: {
    color: '#DDD',
    fontSize: 14,
  },
  milestoneStat: {
    color: '#4CD964',
  },
  milestoneExercise: {
    color: '#999',
    fontSize: 13,
    marginTop: 2,
  },
  milestoneDiff: {
    fontSize: 13,
  },
  milestoneImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 4,
    alignItems: 'center',
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
  milestonesContainer: {
    width: '100%',
    paddingBottom: 70,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomColor: '#222',
    borderBottomWidth: 0.5,
  },
  milestoneUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  milestoneProfilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  milestoneUsername: {
    fontWeight: '600',
    fontSize: 15,
    color: '#FFF',
  },
  milestoneTime: {
    fontSize: 12,
    color: '#999',
  },
  milestoneAchievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  milestoneAchievementText: {
    fontSize: 12,
    color: '#FFD700',
    marginLeft: 4,
  },
  reactionButtons: {
    flexDirection: 'row',
  },
  combinedReactionButton: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeReactionButton: {
    backgroundColor: '#0A84FF',
  },
  reactionEmoji: {
    fontSize: 14,
    color: '#FFF',
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    color: '#FFF',
  },
  viewMilestoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderTopColor: '#222',
    borderTopWidth: 1,
  },
  viewMilestoneText: {
    fontSize: 14,
    color: '#0A84FF',
    marginRight: 4,
  },
  viewPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  viewPostButtonText: {
    fontSize: 12,
    color: '#999',
    marginRight: 4,
  },
});