import React, { useState } from 'react';
import { 
  StyleSheet,
  Text, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import globalStyles from '../styles/globalStyles';
import {
  icon, 
  activityIcon, 
  exploreIcon,
  profileIcon,
  postImage
} from '../assets/images';
import { TabView, SceneMap } from 'react-native-tab-view';
import { Dimensions } from 'react-native';

function HomeScene() {
  return (
    <ScrollView contentContainerStyle={styles.postsContainer}>
      <Text style={{ color: 'white', alignItems: 'center' }}>Posts will go here</Text>
    </ScrollView>
  );
}

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
        // postImage: postImage,
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

export default function HomeFeed({ navigation }) {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'home', title: 'Home' },
    { key: 'milestones', title: 'Milestones' },
  ]);

  const renderScene = SceneMap({
    home: HomeScene,
    milestones: MilestonesScene,
  });

  function renderTopBar() {
    return (
      <View style={styles.topBar}>
        <Image source={icon} style={styles.icon} />
        <Text style={globalStyles.title}>hlthy</Text>
        <View style={styles.buttonContainer}>
          {/* Explore Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Explore')}
            style={styles.button}
          >
            <Image source={exploreIcon} style={styles.buttonIcon} />
          </TouchableOpacity>

          {/* Pulse Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Pulse')}
            style={styles.button}
          >
            <Image source={activityIcon} style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      {renderTopBar()}
      <StatusBar style="light" />
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: Dimensions.get('window').width }}
        renderTabBar={() => null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: 'red',
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  button: {
    marginLeft: 15,
  },
  buttonIcon: {
    width: 40,
    height: 40,
    borderRadius: 5,
  },
  postsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  sceneContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
});