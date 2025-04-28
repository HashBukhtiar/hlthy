import React, { useState } from 'react';
import { 
  StyleSheet,
  Text, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
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
  username: string;
  time: string;
  activity: string;
  weight: string;
  profileIcon: any;
  postImage?: any;
  heartCount: ReactionCount;
  strongCount: ReactionCount;
  fireCount: ReactionCount;
}

function MilestonesScene() {
  const router = useRouter();
  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      username: '@sungjinwoo',
      time: '2m',
      activity: 'Bench Press',
      weight: '225 lbs',
      profileIcon: profileIcon,
      postImage: postImage,
      heartCount: { count: 999, selected: false },
      strongCount: { count: 999999, selected: false },
      fireCount: { count: 0, selected: false }
    },
    {
      username: '@username2',
      time: '5m',
      activity: 'Deadlift',
      weight: '30,000 lbs',
      profileIcon: profileIcon,
      heartCount: { count: 0, selected: false },
      strongCount: { count: -1, selected: false },
      fireCount: { count: 0, selected: false }
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

  function renderMilestonesList() {
    return (
      <ScrollView 
        contentContainerStyle={styles.milestonesView}
        showsHorizontalScrollIndicator={false}
        horizontal={false}
      >
        {milestones.map((milestone, index) => (
          <View key={index} style={styles.milestonesElement}>
            {/* Left div container */}
            <View style={styles.leftContainer}>
              {/* Top section of left div */}
              <View style={styles.topSection}>
                {/* Profile photo on left */}
                <View style={styles.profilePhotoContainer}>
                  <Image source={milestone.profileIcon} style={styles.milestonesPFPStyle} />
                </View>
                
                {/* User info on right */}
                <View style={styles.userInfoContainer}>
                  <View style={styles.usernameRow}>
                    <Text style={styles.milestoneUsername}>{milestone.username}</Text>
                    <Text style={styles.milestonesTimestamp}> · {milestone.time}</Text>
                  </View>
                  <Text style={styles.activityText}>
                    <Text style={{color: 'white'}}>{milestone.activity}: </Text> 
                    <Text style={{color: 'orange'}}>{milestone.weight}</Text>
                  </Text>
                </View>
              </View>
              
              {/* Bottom section with reactions */}
              <View style={styles.bottomSection}>
                <View style={styles.reactionButtons}>
                  <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(index, 'heartCount')} style={milestone.heartCount.selected ? styles.reactionButtonClicked : styles.reactionButtonUnclicked}>
                    <Text style={milestone.heartCount.selected ? styles.reactionTextClicked : styles.reactionTextUnclicked}>❤️ {formatCount(milestone.heartCount.count)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(index, 'strongCount')} style={milestone.strongCount.selected ? styles.reactionButtonClicked : styles.reactionButtonUnclicked}>
                    <Text style={milestone.strongCount.selected ? styles.reactionTextClicked : styles.reactionTextUnclicked}>💪 {formatCount(milestone.strongCount.count)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(index, 'fireCount')} style={milestone.fireCount.selected ? styles.reactionButtonClicked : styles.reactionButtonUnclicked}>
                    <Text style={milestone.fireCount.selected ? styles.reactionTextClicked : styles.reactionTextUnclicked}>🔥 {formatCount(milestone.fireCount.count)}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Right div with image preview */}
            {milestone.postImage && (
              <View style={styles.rightContainer}>
                <TouchableOpacity 
                  onPress={() => router.push({
                    pathname: '/view-post/[id]',
                    params: {
                      id: index.toString(),
                      postData: JSON.stringify({
                        image: milestone.postImage,
                        date: new Date().toISOString(),
                        likes: milestone.heartCount.count,
                        username: milestone.username,
                        profileImage: milestone.profileIcon
                      })
                    }
                  })}>
                  <Image source={milestone.postImage} style={styles.milestonesPostStyle} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <View style={styles.sceneContainer}>
      {renderMilestonesList()}
    </View>
  );
}

// Get screen width
const { width: screenWidth } = Dimensions.get('window');

const styles = StyleSheet.create({
  milestonesView: {
    marginBottom: 10,
    paddingHorizontal: 5,
    width: '100%'
  },
  milestonesElement: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginVertical: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#2e2e2e',
    borderRadius: 30,
    width: screenWidth * 0.9,
    alignSelf: 'center',
  },
  // Left container and nested elements
  leftContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bottomSection: {
    marginTop: 4,
  },
  profilePhotoContainer: {
    marginRight: 8,
  },
  userInfoContainer: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Right container with image
  rightContainer: {
    marginLeft: 8,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  // Profile image
  milestonesPFPStyle: {
    width: 35,
    height: 35,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'white',
  },
  // Post image (smaller)
  milestonesPostStyle: {
    width: 50,
    height: 50,
    borderRadius: 5,
  },
  // Text styles
  milestoneUsername: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 14,
  },
  milestonesTimestamp: {
    color: 'grey',
    fontSize: 11,
  },
  activityText: {
    fontSize: 13,
    marginTop: 2,
  },
  // Reaction buttons
  reactionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  reactionButtonUnclicked: {
    padding: 4,
    width: 65,
    color: 'white',
    marginRight: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'grey',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionButtonClicked: {
    padding: 4,
    width: 65,
    backgroundColor: 'white',
    color: 'black',
    marginRight: 5,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionTextUnclicked: {
    color: 'white',
    fontSize: 11,
  },
  reactionTextClicked: {
    color: 'black',
    fontSize: 11,
  },
  sceneContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
});

export default MilestonesScene;