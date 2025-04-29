import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, FlatList, TouchableOpacity, SafeAreaView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { postImage } from '@/assets/images';

interface Milestone {
  id: number;
  exercise: string;
  reps: number;
  weight: string;
  date: Date;
  postId: number;
}

interface Workout {
  id: number;
  name: string;
  date: Date;
  favorites: number;
}

interface GroupedMilestones {
  [monthYear: string]: Milestone[];
}

enum TabType {
  POSTS = 'POSTS',
  MILESTONES = 'MILESTONES',
  WORKOUTS = 'WORKOUTS'
}

const Profile = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>(TabType.POSTS);
  const flatListRef = useRef<FlatList>(null);
  const { width: screenWidth } = Dimensions.get('window');
  const tabIndicator = useRef(new Animated.Value(0)).current;
  const tabWidth = screenWidth / 3; // Width of each tab

  // Transform scroll position to indicator position
  const indicatorPosition = tabIndicator.interpolate({
    inputRange: [0, screenWidth, screenWidth * 2],
    outputRange: [0, tabWidth, tabWidth * 2],
    extrapolate: 'clamp'
  });

  // Scroll to specific tab when tab button is clicked
  const scrollToTab = (tabType: TabType) => {
    setActiveTab(tabType);
    let index = 0;
    if (tabType === TabType.POSTS) index = 0;
    else if (tabType === TabType.MILESTONES) index = 1;
    else if (tabType === TabType.WORKOUTS) index = 2;
    
    flatListRef.current?.scrollToOffset({ 
      offset: index * screenWidth,
      animated: true 
    });
  };

  // Handler for FlatList scroll
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: tabIndicator } } }],
    { useNativeDriver: false }
  );

  // Handler for FlatList scroll end
  const handleScrollEnd = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    // Map index to the appropriate tab type
    if (index === 0) setActiveTab(TabType.POSTS);
    else if (index === 1) setActiveTab(TabType.MILESTONES);
    else if (index === 2) setActiveTab(TabType.WORKOUTS);
  };

  // Dummy data for posts 
  const postImages = [
    postImage,
    postImage,
    postImage,
    postImage,
    postImage,
    postImage,
  ];

  // Dummy data for milestones
  const milestones: Milestone[] = [
    { id: 1, exercise: 'Bench Press', reps: 10, weight: '100', date: new Date('2024-08-01'), postId: 1 },
    { id: 2, exercise: 'Squat', reps: 8, weight: '120', date: new Date('2024-08-05'), postId: 2 },
    { id: 3, exercise: 'Deadlift', reps: 5, weight: '140', date: new Date('2024-08-10'), postId: 3 },
    { id: 4, exercise: 'Leg Press', reps: 1, weight: '400', date: new Date('2024-09-01'), postId: 4 },
  ];

  const groupMilestonesByMonth = (milestones: Milestone[]): GroupedMilestones => {
    return milestones.reduce((groups: GroupedMilestones, milestone) => {
      const adjustedDate = new Date(milestone.date);
      adjustedDate.setDate(adjustedDate.getDate() + 1);
      const monthYear = adjustedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(milestone);
  
      return groups;
    }, {});
  };

  // Function to handle settings press
  const handleSettingsPress = () => {
    console.log(`Settings clicked`);
    router.push('/settings');
  };

  // Function to handle image click
  const handleImagePress = (imageUri: any) => {
    console.log(`Image clicked`);
    router.push({
      pathname: '/view-post/[id]',
      params: {
        id: '1', // Using a placeholder ID
        postData: JSON.stringify({
          image: imageUri,
          date: new Date().toISOString(),
          likes: 0,
          username: 'John Doe',
          profileImage: 'https://thumbs.dreamstime.com/b/creative-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mockup-144855718.jpg'
        })
      }
    });
  };

  // Function to handle milestone click
  const handleMilestonePress = (postId: number) => {
    console.log(`Milestone clicked, navigating to Milestone ID=${postId}`);
  };

  // Dummy data for workouts
  const workouts: Workout[] = [
    { id: 1, name: 'Full Body Workout', date: new Date('2024-08-01'), favorites: 10 },
    { id: 2, name: 'Upper Body Blast', date: new Date('2024-08-05'), favorites: 20 },
    { id: 3, name: 'Leg Day', date: new Date('2024-08-10'), favorites: 15 },
    { id: 4, name: 'Cardio Session', date: new Date('2024-09-01'), favorites: 5 },
  ];

  // Function to handle workout click
  const handleWorkoutPress = (workoutId: number) => {
    console.log(`Workout clicked, navigating to Workout ID=${workoutId}`);
    router.push({
      pathname: '/view-workout/[id]',
      params: { id: workoutId.toString() }
    });
  };

  const sortedWorkouts = [...workouts].sort((a, b) => b.date.getTime() - a.date.getTime());

  const formatDate = (date: Date): string => {
    return date.toLocaleString('default', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Render Posts Tab Content
  const renderPostsContent = () => (
    <FlatList
      key="posts-grid"
      data={postImages}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => handleImagePress(item)}>
          <Image source={item} style={styles.postImage} />
        </TouchableOpacity>
      )}
      keyExtractor={(item, index) => index.toString()}
      numColumns={3}
      contentContainerStyle={styles.postsContainer}
    />
  );

  // Render Milestones Tab Content
  const renderMilestonesContent = () => {
    const sortedMilestones = [...milestones].sort((a, b) => b.date.getTime() - a.date.getTime());
    const groupedMilestones = groupMilestonesByMonth(sortedMilestones);
    const monthKeys = Object.keys(groupedMilestones).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
  
    return (
      <FlatList
        key="milestones-list"
        data={monthKeys}
        renderItem={({ item: month }) => (
          <View>
            <Text style={styles.monthHeader}>{month}</Text>
            {groupedMilestones[month].map((item) => (
              <TouchableOpacity key={item.id} onPress={() => handleMilestonePress(item.postId)} style={styles.milestoneItem}>
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
            ))}
          </View>
        )}
        keyExtractor={(item) => item}
      />
    );
  };

  // Render Workouts Tab Content
  const renderWorkoutsContent = () => (
    <FlatList
      key="workouts-grid"
      data={sortedWorkouts}
      renderItem={({ item }) => (
        <TouchableOpacity key={item.id} onPress={() => handleWorkoutPress(item.id)} style={styles.workoutItem}>
          <View style={styles.workoutDetail}>
            <Text style={styles.workoutName}>{item.name}</Text>
            <Text style={styles.workoutDate}>{formatDate(item.date)}</Text>
            <Text style={styles.workoutFavorites}>{item.favorites} Favorites</Text>
          </View>
        </TouchableOpacity>
      )}
      keyExtractor={(item) => item.id.toString()}
      numColumns={3}
      contentContainerStyle={styles.workoutsList}
      showsVerticalScrollIndicator={false}
    />
  );

  // Data for the swipeable tabs
  const tabScenes = [
    { key: 'posts', component: renderPostsContent() },
    { key: 'milestones', component: renderMilestonesContent() },
    { key: 'workouts', component: renderWorkoutsContent() }
  ];

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case TabType.POSTS:
        return renderPostsContent();
      case TabType.MILESTONES:
        return renderMilestonesContent();
      case TabType.WORKOUTS:
        return renderWorkoutsContent();
      default:
        return renderPostsContent();
    }
  };

  // Custom Tab Bar
  const renderCustomTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity 
        style={styles.tabButton}
        onPress={() => scrollToTab(TabType.POSTS)}
      >
        <Text style={[styles.tabButtonText, activeTab === TabType.POSTS && styles.activeTabButtonText]}>POSTS</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.tabButton}
        onPress={() => scrollToTab(TabType.MILESTONES)}
      >
        <Text style={[styles.tabButtonText, activeTab === TabType.MILESTONES && styles.activeTabButtonText]}>MILESTONES</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={styles.tabButton}
        onPress={() => scrollToTab(TabType.WORKOUTS)}
      >
        <Text style={[styles.tabButtonText, activeTab === TabType.WORKOUTS && styles.activeTabButtonText]}>WORKOUTS</Text>
      </TouchableOpacity>
      <Animated.View style={[styles.tabIndicator, { transform: [{ translateX: indicatorPosition }] }]} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity
          style={{ position: 'absolute', top: 20, right: 20 }}
          onPress={() => handleSettingsPress()}
        >
          <Text style={{ color: 'white', backgroundColor: '#212121', padding: 5, borderRadius: 5 }}>Settings</Text>
        </TouchableOpacity>
        <Image
          source={{ uri: 'https://thumbs.dreamstime.com/b/creative-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mockup-144855718.jpg' }}
          style={styles.profileImage}
        />
        <Text style={styles.profileName}>John Doe</Text>
        <Text style={styles.profileUsername}>johndoe123</Text>
        <Text style={styles.profileBio}>Bio goes here. User can enter whatever they want.</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
      </View>

      {/* Custom Tab Bar */}
      {renderCustomTabBar()}

      {/* Swipeable Tab Content */}
      <View style={styles.tabContent}>
        <FlatList
          ref={flatListRef}
          data={tabScenes}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          renderItem={({ item }) => (
            <View style={[styles.tabContentContainer, { width: screenWidth }]}>
              {item.component}
            </View>
          )}
          keyExtractor={(item) => item.key}
        />
      </View>
    </SafeAreaView>
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
  profileUsername: {
    color: '#a6a6a6',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5
  },
  profileBio: {
    color: 'gray',
    fontSize: 16,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'gray',
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: 'black',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  tabButtonText: {
    color: 'gray',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeTabButtonText: {
    color: 'white',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: Dimensions.get('window').width / 3,
    backgroundColor: 'white',
  },
  tabContent: {
    flex: 1,
    backgroundColor: 'black',
  },
  postsContainer: {
    padding: 0,
  },
  postImage: {
    width: Dimensions.get('window').width / 3,
    height: Dimensions.get('window').width / 3,
    margin: 0,
  },
  milestoneItem: {
    backgroundColor: '#1c1c1e',
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
    marginHorizontal: 'auto',
    width: '95%',
    alignSelf: 'center',
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
    marginTop: -5,
  },
  milestoneDescriptor: {
    color: 'gray',
    fontSize: 14,
    marginTop: 0,
    marginBottom: -5,
  },
  monthHeader: {
    color: 'white',
    fontSize: 25,
    fontWeight: 'bold',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: 'black',
    marginTop: 10
  },
  workoutItem: {
    overflow: 'hidden',
    width: Dimensions.get('window').width / 3 - 15,
    height: Dimensions.get('window').width / 3 - 15,
    borderRadius: 15,
    backgroundColor: 'grey',
    margin: 5,
    justifyContent: 'flex-end',
  },
  workoutDetail: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(50, 50, 50, 0.5)',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  workoutName: {
    fontWeight: 'bold',
    color: 'white',
    fontSize: 12,
    marginBottom: 3,
  },
  workoutDate: {
    color: '#D0D0D0',
    fontSize: 10,
  },
  workoutFavorites: {
    color: '#D0D0D0',
    fontSize: 10,
  },
  workoutsList: {
    padding: 10,
  },
  tabContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Profile;