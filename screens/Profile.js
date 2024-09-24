import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';

const Profile = () => {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'posts', title: 'Posts' },
    { key: 'milestones', title: 'Milestones' },
    { key: 'workouts', title: 'Workouts' },
  ]);

  // Dummy content for each tab
  const Posts = () => (
    <View style={styles.scene}>
      <Text style={styles.dummyText}>Here are the user's posts.</Text>
    </View>
  );
  
  const Milestones = () => (
    <View style={styles.scene}>
      <Text style={styles.dummyText}>Here are the user's milestones.</Text>
    </View>
  );
  
  const Workouts = () => (
    <View style={styles.scene}>
      <Text style={styles.dummyText}>Here are the user's Workouts.</Text>
    </View>
  );

  const renderScene = SceneMap({
    posts: Posts,
    milestones: Milestones,
    workouts: Workouts,
  });

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Image
          source={{ uri: 'https://media.licdn.com/dms/image/v2/D4E03AQHZayvjUfWtxA/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1726984729318?e=1732752000&v=beta&t=IRtdqq7PeTqlTJPRVpU1IcjmAkcCd0wpUu-ZT9CjfSw' }}
          style={styles.profileImage}
        />
        <Text style={styles.profileName}>John Doe</Text>
        <Text style={styles.profileBio}>Bio goes here. User can enter whatever they want.</Text>
      </View>

      {/* TabView */}
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: Dimensions.get('window').width }}
        renderTabBar={props => (
          <TabBar
            {...props}
            indicatorStyle={styles.indicator}
            style={styles.tabBar}
            labelStyle={styles.tabLabel}
          />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'black',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  profileBio: {
    color: 'gray',
    fontSize: 16,
    textAlign: 'center',
  },
  scene: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
  },
  tabBar: {
    backgroundColor: 'black',
  },
  indicator: {
    backgroundColor: 'white',
  },
  tabLabel: {
    color: 'white',
    fontSize: 16,
  },
  dummyText: {
    color: 'white',
  },
});

export default Profile;