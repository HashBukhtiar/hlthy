import React, { useState } from 'react';
import { 
  StyleSheet,
  Text, 
  View, 
  Image, 
  TouchableOpacity,
  Dimensions,
  FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import globalStyles from '@/styles/globalStyles';
import {
  profileIcon,
  postImage
} from '@/assets/images';

interface ReactionCount {
  count: number;
  selected: boolean;
}

interface Milestone {
  id?: string;
  username: string;
  displayName?: string;
  time: string;
  activity: string;
  weight: string;
  profileIcon: any;
  postImage?: any;
  heartCount: ReactionCount;
  strongCount: ReactionCount;
  fireCount: ReactionCount;
  type?: 'PR' | 'weightLoss' | 'weightGain';
}

function MilestonesScene() {
  const router = useRouter();
  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      id: 'm1',
      username: '@sungjinwoo',
      displayName: 'Sung Jin-Woo',
      time: '2m',
      activity: 'Bench Press',
      weight: '225 lbs',
      type: 'PR',
      profileIcon: profileIcon,
      postImage: postImage,
      heartCount: { count: 999, selected: false },
      strongCount: { count: 42, selected: false },
      fireCount: { count: 18, selected: false }
    },
    {
      id: 'm2',
      username: '@username2',
      displayName: 'Alex Smith',
      time: '5m',
      activity: 'Deadlift',
      weight: '315 lbs',
      type: 'PR',
      profileIcon: profileIcon,
      heartCount: { count: 32, selected: false },
      strongCount: { count: 15, selected: false },
      fireCount: { count: 6, selected: false }
    },
    {
      id: 'm3',
      username: '@fitnessfreak',
      displayName: 'Jessica Fit',
      time: '20m',
      activity: 'Weight Loss',
      weight: '145 lbs',
      type: 'weightLoss',
      profileIcon: profileIcon,
      heartCount: { count: 87, selected: false },
      strongCount: { count: 21, selected: false },
      fireCount: { count: 35, selected: true }
    },
  ]);

  function formatCount(num: number): string {
    if (num >= 1000000) {
      return Math.floor(num / 1000000) + 'M';
    } else if (num >= 1000) {
      return Math.floor(num / 1000) + 'K';
    } else {
      return num.toString();
    }
  }

  function handleReactionPress(index: number, reaction: 'heartCount' | 'strongCount' | 'fireCount'): void {
    setMilestones(prevMilestones => {
      const newMilestones = [...prevMilestones];
      const milestone = newMilestones[index];
      milestone[reaction] = {
        count: milestone[reaction].selected ? milestone[reaction].count - 1 : milestone[reaction].count + 1,
        selected: !milestone[reaction].selected
      };
      return newMilestones;
    });
  }

  const handleViewMilestone = (milestoneId) => {
    router.push(`/view-milestone/${milestoneId}`);
  };

  const renderMilestone = ({ item, index }) => (
    <View style={styles.milestoneContainer}>
      {/* Header with user info */}
      <View style={styles.postHeader}>
        <TouchableOpacity style={styles.userInfoContainer}>
          <Image source={item.profileIcon} style={styles.profilePic} />
          <View>
            <Text style={styles.username}>{item.displayName || item.username}</Text>
            <Text style={styles.timestamp}>{item.time}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Milestone Content */}
      <TouchableOpacity 
        activeOpacity={0.9}
        style={styles.milestoneContent}
        onPress={() => handleViewMilestone(item.id || index.toString())}
      >
        <View style={styles.milestoneIconContainer}>
          <Ionicons 
            name="trophy" 
            size={24} 
            color="#FFD700" 
            style={styles.milestoneIcon} 
          />
        </View>
        <View style={styles.milestoneDetails}>
          <Text style={styles.milestoneTitle}>
            {item.type === 'PR' ? 'Personal Record' : 
             item.type === 'weightLoss' ? 'Weight Loss' : 
             item.type === 'weightGain' ? 'Weight Gain' : 
             'Achievement'}
          </Text>
          <Text style={styles.milestoneValue}>
            {item.type === 'PR' 
              ? `${item.activity}: ${item.weight}` 
              : item.type === 'weightLoss'
              ? `New Weight: ${item.weight}`
              : `${item.activity}: ${item.weight}`
            }
          </Text>
        </View>
        {item.postImage && (
          <View style={styles.milestoneImageContainer}>
            <Image source={item.postImage} style={styles.milestoneImage} />
          </View>
        )}
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <View style={styles.reactionsContainer}>
          <TouchableOpacity 
            style={styles.reactionButton} 
            onPress={() => handleReactionPress(index, 'heartCount')}
          >
            <Ionicons 
              name={item.heartCount.selected ? "heart" : "heart-outline"} 
              size={22} 
              color={item.heartCount.selected ? "#FF3B30" : "#FFF"} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.reactionButton}
            onPress={() => handleReactionPress(index, 'strongCount')}
          >
            <Ionicons 
              name="fitness" 
              size={22} 
              color={item.strongCount.selected ? "#4CD964" : "#FFF"} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.reactionButton}
            onPress={() => handleReactionPress(index, 'fireCount')}
          >
            <Ionicons 
              name="flame" 
              size={22} 
              color={item.fireCount.selected ? "#FF9500" : "#FFF"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Reactions Count */}
      <Text style={styles.reactionsCount}>
        {formatCount(item.heartCount.count)} likes • {formatCount(item.strongCount.count)} 💪 • {formatCount(item.fireCount.count)} 🔥
      </Text>
    </View>
  );

  return (
    <View style={styles.sceneContainer}>
      <FlatList
        data={milestones}
        renderItem={renderMilestone}
        keyExtractor={(item, index) => item.id || index.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

// Get screen width
const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    paddingTop: 10,
  },
  listContainer: {
    paddingBottom: 20,
  },
  milestoneContainer: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginHorizontal: 10,
    marginVertical: 5,
    padding: 10,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  timestamp: {
    color: '#8E8E93',
    fontSize: 12,
  },
  moreButton: {
    padding: 5,
  },
  milestoneContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  milestoneIconContainer: {
    marginRight: 10,
  },
  milestoneIcon: {
    backgroundColor: '#3A3A3C',
    borderRadius: 12,
    padding: 5,
  },
  milestoneDetails: {
    flex: 1,
  },
  milestoneTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  milestoneValue: {
    color: '#FFD700',
    fontSize: 14,
  },
  milestoneImageContainer: {
    marginLeft: 10,
  },
  milestoneImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  reactionsContainer: {
    flexDirection: 'row',
  },
  reactionButton: {
    marginHorizontal: 5,
  },
  reactionsCount: {
    color: '#8E8E93',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default MilestonesScene;