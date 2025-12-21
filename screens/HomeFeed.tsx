import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet,
  Text, 
  View, 
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import globalStyles from '@/styles/globalStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MilestonesFeed from './MilestonesFeed';
import PostsFeed from './PostsFeed';

enum TabType {
  POSTS = 'POSTS',
  MILESTONES = 'MILESTONES'
}

export default function HomeFeed() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>(TabType.POSTS);
  const flatListRef = useRef<FlatList>(null);
  const { width: screenWidth } = Dimensions.get('window');
  
  // Animated value for indicator position
  const indicatorWidth = screenWidth / 2;
  
  // Keep track of current scroll position
  const scrollX = useRef(new Animated.Value(0)).current;

  // Handler for FlatList scroll
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  // Update indicator position based on scroll
  useEffect(() => {
    scrollX.addListener(({ value }) => {
      // Calculate the ratio of scroll position to screen width
      const ratio = value / screenWidth;
      // Set the active tab based on position
      if (ratio < 0.5) {
        setActiveTab(TabType.POSTS);
      } else {
        setActiveTab(TabType.MILESTONES);
      }
    });

    // Clean up listener on unmount
    return () => {
      scrollX.removeAllListeners();
    };
  }, []);

  function renderTopBar() {
    return (
      <View style={styles.topBar}>
        {/* Left side: hlthy logo with icon */}
        <View style={styles.leftContainer}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="accessibility-outline" size={24} color="#000" />
            </View>
            <Text style={styles.logoText}>hlthy</Text>
          </View>
        </View>

        {/* Right side: Pulse, DMs, and Explore Buttons */}
        <View style={styles.rightButtonContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/pulse')}
            style={styles.iconButton}
          >
            <Ionicons name="fitness-outline" size={24} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/dms')}
            style={styles.iconButton}
          >
            <Ionicons name="chatbubbles-outline" size={24} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push('/explore')}
            style={styles.iconButton}
          >
            <Ionicons name="search" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderTabBar() {
    return (
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabButton}
          onPress={() => {
            setActiveTab(TabType.POSTS);
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
        >
          <Text style={[
            styles.tabButtonText, 
            activeTab === TabType.POSTS && styles.activeTabButtonText
          ]}>
            POSTS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tabButton}
          onPress={() => {
            setActiveTab(TabType.MILESTONES);
            flatListRef.current?.scrollToOffset({ offset: screenWidth, animated: true });
          }}
        >
          <Text style={[
            styles.tabButtonText, 
            activeTab === TabType.MILESTONES && styles.activeTabButtonText
          ]}>
            MILESTONES
          </Text>
        </TouchableOpacity>
        
        {/* Animated indicator that moves with swipe */}
        <Animated.View 
          style={[
            styles.tabIndicator,
            {
              width: indicatorWidth,
              transform: [{ 
                translateX: scrollX.interpolate({
                  inputRange: [0, screenWidth],
                  outputRange: [0, indicatorWidth],
                  extrapolate: 'clamp'
                }) 
              }]
            }
          ]}
        />
      </View>
    );
  }

  // Data for the swipeable tabs
  const tabScenes = [
    { key: 'posts', component: <PostsFeed /> },
    { key: 'milestones', component: <MilestonesFeed /> }
  ];

  return (
    <View style={[globalStyles.container, { paddingTop: 0 }]}>
      {renderTopBar()}
      {renderTabBar()}
      <StatusBar style="light" />
      
      {/* Swipeable Tab Content */}
      <Animated.FlatList
        ref={flatListRef}
        data={tabScenes}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const contentOffsetX = e.nativeEvent.contentOffset.x;
          const index = Math.round(contentOffsetX / screenWidth);
          setActiveTab(index === 0 ? TabType.POSTS : TabType.MILESTONES);
        }}
        renderItem={({ item }) => (
          <View style={[styles.tabContent, { width: screenWidth }]}>
            {item.component}
          </View>
        )}
        keyExtractor={(item) => item.key}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#000',
    borderBottomWidth: 0,
  },
  leftContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: -0.5,
  },
  rightButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
    backgroundColor: 'black',
    position: 'relative',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 2,
    backgroundColor: '#FF6B6B',
  },
  tabButtonText: {
    color: '#666',
    fontSize: 13,
    fontWeight: 'bold',
  },
  activeTabButtonText: {
    color: 'white',
  },
  tabContent: {
    flex: 1,
    backgroundColor: 'black',
  },
});