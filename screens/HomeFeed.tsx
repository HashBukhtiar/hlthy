import React, { useState, useRef } from 'react';
import { 
  StyleSheet,
  Text, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  Dimensions,
  FlatList
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/globalStyles';
import {
  icon, 
  activityIcon, 
  exploreIcon,
  postImage,
} from '@/assets/images';
import MilestonesScene from './MilestonesScene';

enum TabType {
  POSTS = 'POSTS',
  MILESTONES = 'MILESTONES'
}

function PostsScene() {
  // Dummy data for posts 
  const postImages = [
    postImage,
    postImage,
    postImage,
    postImage,
    postImage,
    postImage,
  ];

  const router = useRouter();

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
  
  return (
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
}

export default function HomeFeed() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>(TabType.POSTS);
  const flatListRef = useRef<FlatList>(null);
  const { width: screenWidth } = Dimensions.get('window');

  // Handler for FlatList scroll end
  const handleScrollEnd = (e: any) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / screenWidth);
    setActiveTab(index === 0 ? TabType.POSTS : TabType.MILESTONES);
  };

  function renderTopBar() {
    return (
      <View style={styles.topBar}>
        <Image source={require('@/assets/images/logo-dark.png')} style={styles.icon} />
        <Text style={globalStyles.title}>hlthy</Text>
        <View style={styles.buttonContainer}>
          {/* Explore Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/explore')}
            style={styles.button}
          >
            <Image source={exploreIcon} style={styles.buttonIcon} />
          </TouchableOpacity>

          {/* Pulse Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/pulse')}
            style={styles.button}
          >
            <Image source={activityIcon} style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Data for the swipeable tabs
  const tabScenes = [
    { key: 'posts', component: <PostsScene /> },
    { key: 'milestones', component: <MilestonesScene /> }
  ];

  return (
    <View style={globalStyles.container}>
      {renderTopBar()}
      <StatusBar style="light" />
      
      {/* Swipeable Tab Content - No header tabs */}
      <FlatList
        ref={flatListRef}
        data={tabScenes}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        renderItem={({ item }) => (
          <View style={[styles.tabContent, { width: screenWidth }]}>
            {item.component}
          </View>
        )}
        keyExtractor={(item) => item.key}
        contentContainerStyle={globalStyles.contentContainer}
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
  activeTabButton: {
    borderBottomWidth: 3,
    borderBottomColor: 'white',
  },
  tabButtonText: {
    color: 'gray',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeTabButtonText: {
    color: 'white',
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
  sceneContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});