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
} from '../assets/images';
import { TabView, SceneMap } from 'react-native-tab-view';
import { Dimensions } from 'react-native';
import MilestonesScene from './Milestones';

function HomeScene() {
  return (
    <ScrollView contentContainerStyle={styles.postsContainer}>
      <Text style={{ color: 'white', alignItems: 'center' }}>Posts will go here</Text>
    </ScrollView>
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
});