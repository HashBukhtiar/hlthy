import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet,
  Text, 
  View, 
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated,
  Image
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import globalStyles from '@/styles/globalStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MilestonesFeed from './MilestonesFeed';
import PostsFeed from './PostsFeed';
import { ACCENT_COLOR } from '@/constants/Colors';
import { SeenTrackingProvider } from '@/features/feed/ui/SeenTrackingProvider';

enum TabType {
  POSTS = 'POSTS',
  MILESTONES = 'MILESTONES'
}

export default function HomeFeed() {
  console.log('[HomeFeed] Component starting to render');
  
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>(TabType.POSTS);
  const flatListRef = useRef<FlatList>(null);
  const { width: screenWidth } = Dimensions.get('window');
  
  console.log('[HomeFeed] Hooks initialized successfully');
  
  // Animated value for indicator position
  const indicatorWidth = screenWidth * 0.43;
  
  // Keep track of current scroll position
  const scrollX = useRef(new Animated.Value(0)).current;

  console.log('[HomeFeed] About to set up scrollX listener');

  // Handler for FlatList scroll
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  // Update indicator position based on scroll
  useEffect(() => {
    console.log('[HomeFeed] useEffect for scrollX listener running');
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

  console.log('[HomeFeed] About to define renderTopBar');

  function renderTopBar() {
    console.log('[HomeFeed] renderTopBar called');
    return (
      <View style={styles.topBar}>
        {/* Left side: hlthy logo with icon */}
        <View style={styles.leftContainer}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/logo-dark.png')}
              style={styles.logoIcon}
              resizeMode="contain"
            />
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
    // Interpolate colors for smooth transitions
    const postsColor = scrollX.interpolate({
      inputRange: [0, screenWidth],
      outputRange: ['rgba(255, 255, 255, 1)', 'rgba(102, 102, 102, 1)'],
      extrapolate: 'clamp'
    });

    const milestonesColor = scrollX.interpolate({
      inputRange: [0, screenWidth],
      outputRange: ['rgba(102, 102, 102, 1)', 'rgba(255, 255, 255, 1)'],
      extrapolate: 'clamp'
    });

    return (
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabButton}
          activeOpacity={1}
          onPress={() => {
            setActiveTab(TabType.POSTS);
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
        >
          <Animated.Text style={[
            styles.tabButtonText,
            { color: postsColor }
          ]}>
            POSTS
          </Animated.Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.tabButton}
          activeOpacity={1}
          onPress={() => {
            setActiveTab(TabType.MILESTONES);
            flatListRef.current?.scrollToOffset({ offset: screenWidth, animated: true });
          }}
        >
          <Animated.Text style={[
            styles.tabButtonText,
            { color: milestonesColor }
          ]}>
            MILESTONES
          </Animated.Text>
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
                  outputRange: [(screenWidth / 2 - indicatorWidth) / 2, screenWidth / 2 + (screenWidth / 2 - indicatorWidth) / 2],
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
  console.log('[HomeFeed] About to create tabScenes');
  
  // Lazy load the tab components to avoid crashes during initial render
  const tabScenes = [
    { key: 'posts', component: <PostsFeed isActive={activeTab === TabType.POSTS} /> },
    { key: 'milestones', component: <MilestonesFeed isActive={activeTab === TabType.MILESTONES} /> }
  ];

  console.log('[HomeFeed] tabScenes created, about to return JSX');

  return (
    <SeenTrackingProvider>
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
    </SeenTrackingProvider>
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
    backgroundColor: '#2C2C2E',
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
    backgroundColor: ACCENT_COLOR,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#2C2C2E',
  },
});