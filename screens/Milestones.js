import React, { useState } from 'react';
import { 
  StyleSheet,
  Text, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity 
} from 'react-native';
import globalStyles from '../styles/globalStyles';
import {
  profileIcon,
  postImage
} from '../assets/images';

function MilestonesScene() {
  const [milestones, setMilestones] = useState([
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

  function formatCount(num) {
    if (num >= 1000000) {
      return Math.floor(num / 1000000) + 'M';
    } else if (num >= 1000) {
      return Math.floor(num / 1000) + 'K';
    } else {
      return num;
    }
  }

  function handleReactionPress(index, reaction) {
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
      <ScrollView contentContainerStyle={styles.milestonesView}>
        {milestones.map((milestone, index) => (
          <TouchableOpacity key={index} onPress={() => {console.log("milestone element pressed")}}>
            <View style={styles.milestonesElement}>
              <View style={styles.milestonesPFPImage}>
                <Image source={milestone.profileIcon} style={styles.milestonesPFPStyle} />
              </View>

              <View style={styles.milestonesDescription}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Text style={styles.milestoneUsername}>{milestone.username}</Text>
                  <Text style={styles.milestonesTimestamp}> · {milestone.time}</Text>
                </View>
                <Text style={{fontSize: 18, marginLeft: 5}}>
                  <Text style={{color: 'white'}}>{milestone.activity}: </Text> 
                  <Text style={{color: 'orange'}}>{milestone.weight}</Text>
                </Text>

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

              {milestone.postImage && (
                <View style={styles.milestonesPostImage}>
                  <Image source={milestone.postImage} style={styles.milestonesPostStyle} />
                </View>
              )}
            </View>
          </TouchableOpacity>
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

const styles = StyleSheet.create({
  milestonesView: {
    marginBottom: 10,
    paddingHorizontal: 5
  },
  milestonesElement: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginVertical: 5,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#2e2e2e',
    borderRadius: 30,
  },
  milestoneUsername: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 20,
    marginLeft: 3,
  },
  milestonesDescription: {
    color: 'white',
    alignItems: 'left',
    fontSize: 10,
    flexShrink: 1,
  },
  milestonesPFPImage: {
    justifyContent: 'center',
    marginRight: 5,
    borderRadius: 5,
  },
  milestonesPostImage: {
    justifyContent: 'center',
    marginLeft: 5,
  },
  milestonesPFPStyle: {
    width: 50, 
    height: 50, 
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'white',
  },
  milestonesPostStyle: {
    width: 50, 
    height: 50, 
    borderRadius: 5,
  },
  milestonesTimestamp:{
    color: 'grey',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  reactionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  reactionButtonUnclicked: {
    padding: 7,
    width: 80,
    fontSize: 16,
    color: 'white',
    marginHorizontal: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'grey',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionButtonClicked: {
    padding: 7,
    width: 80,
    fontSize: 16,
    backgroundColor: 'white',
    color: 'black',
    marginHorizontal: 5,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionTextUnclicked: {
    color: 'white',
  },
  reactionTextClicked: {
    color: 'black',
  },
  sceneContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MilestonesScene;
