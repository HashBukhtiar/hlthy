import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, FlatList, TouchableOpacity, Alert } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';

const Profile = () => {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'posts', title: 'Posts' },
    { key: 'milestones', title: 'Milestones' },
    { key: 'workouts', title: 'Workouts' },
  ]);

  // Dummy data for posts 
  const postImages = [
    'https://via.placeholder.com/150',
    'https://via.placeholder.com/150',
    'https://via.placeholder.com/150',
    'https://via.placeholder.com/150',
    'https://via.placeholder.com/150',
    'https://via.placeholder.com/150',
  ];

  // Dummy data for milestones
  const milestones = [
    { id: 1, exercise: 'Bench Press', reps: 10, weight: '100', postId: 1 },
    { id: 2, exercise: 'Squat', reps: 8, weight: '120', postId: 2 },
    { id: 3, exercise: 'Deadlift', reps: 5, weight: '140', postId: 3 },
  ];

  // Function to handle image click
  const handleImagePress = (imageUri) => {
    console.log(`Image clicked: ${imageUri}`);
  };

  // Function to handle milestone click
  const handleMilestonePress = (postId) => {
    console.log(`Milestone clicked, navigating to post ${postId}`);
  };

  // Dummy content for each tab
  const Posts = () => (
    <FlatList
      data={postImages}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handleImagePress(item)}>
          <Image source={{ uri: item }} style={styles.postImage} />
        </TouchableOpacity>
      )}
      keyExtractor={(item, index) => index.toString()}
      numColumns={3}
      contentContainerStyle={styles.postsContainer}
    />
  );

  const Milestones = () => (
    <FlatList
      data={milestones}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handleMilestonePress(item.postId)} style={styles.milestoneItem}>
          <View style={styles.milestoneDetail}>
            <Text style={styles.milestoneExercise}>{item.exercise}</Text>
          </View>
          <View style={styles.milestoneDetail}>
            <Text style={styles.milestoneNumber}>{item.reps}</Text>
            <Text style={styles.milestoneDescriptor}>Reps</Text>
          </View>
          <View style={styles.milestoneDetail}>
            <Text style={styles.milestoneNumber}>{item.weight}</Text>
            <Text style={styles.milestoneDescriptor}>Weight</Text>
          </View>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id.toString()}
    />
  );
  

  const Workouts = () => (
    <View style={styles.scene}>
      <Text style={styles.dummyText}>Here are the user's workouts.</Text>
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
  postsContainer: {
    padding: 0,
  },
  postImage: {
    width: Dimensions.get('window').width / 3,
    height: Dimensions.get('window').width / 3,
    margin: 0,
  },
  dummyText: {
    color: 'white',
  },
  milestoneItem: {
    backgroundColor: '#1c1c1e',
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
    marginHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneDetail: {
    alignItems: 'center',
  },
  milestoneExercise: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  milestoneNumber: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  milestoneDescriptor: {
    color: 'gray',
    fontSize: 14,
    marginTop: -5,
  },
});

export default Profile;