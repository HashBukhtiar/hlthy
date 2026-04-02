import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Image,
  FlatList,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TabView, TabBar } from 'react-native-tab-view';
import globalStyles from '@/styles/globalStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { getOptimalImageUrl } from '@/utils/imageUtils';
import { OptimizedImageLight } from '@/components/OptimizedImage';
import { useExplore } from '@/features/explore/ui/useExplore';
import { useTagFollow } from '@/features/tags/ui/useTagFollow';
import { ACCENT_COLOR } from '@/constants/Colors';
import type { ExplorePost, UserSearchResult, TagSearchResult } from '@/features/explore/domain/ExploreTypes';

// ── Sub-components ───────────────────────────────────────────────────────────

const ShimmerPlaceholder = () => {
  const animatedValue = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View style={styles.skeletonItem}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX }], backgroundColor: 'transparent' },
        ]}
      >
        <LinearGradient
          colors={['#2e2e2e', '#3a3a3a', '#2e2e2e']}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
      </Animated.View>
    </View>
  );
};

const PostGridItem = ({ item, onPress }: { item: ExplorePost; onPress: () => void }) => {
  const imageOpacity = useRef(new Animated.Value(0)).current;

  const onImageLoad = () => {
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity style={styles.postPreview} onPress={onPress}>
      <ShimmerPlaceholder />
      <Animated.View style={[styles.postImage, { position: 'absolute', opacity: imageOpacity }]}>
        <OptimizedImageLight
          thumbnailUrl={item.thumbnailUrl}
          originalUrl={item.imageUrl}
          style={styles.postImage}
          onLoad={onImageLoad}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const TagFollowButton = ({ tagName }: { tagName: string }) => {
  const { isFollowing, toggle, loading } = useTagFollow(tagName);

  if (loading) {
    return <ActivityIndicator size="small" color="#8E8E93" style={styles.followLoading} />;
  }

  return (
    <TouchableOpacity
      style={[styles.followButton, isFollowing && styles.followButtonActive]}
      onPress={toggle}
      activeOpacity={0.8}
    >
      <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}>
        {isFollowing ? 'Following' : 'Follow'}
      </Text>
    </TouchableOpacity>
  );
};

// ── Screen ───────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'users', title: 'Users' },
  { key: 'tags', title: 'Tags' },
];

export default function Explore() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    searchQuery,
    searchResults,
    searchLoading,
    tagSearchResults,
    tagSearchLoading,
    handleSearch,
    clearSearch,
    posts,
    loadingPosts,
    loadMore,
  } = useExplore();

  const [tabIndex, setTabIndex] = React.useState(0);

  const isSearching = searchQuery.trim().length > 0;

  // Reset to Users tab whenever search is cleared
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setTabIndex(0);
    }
  }, [searchQuery]);

  const renderUserResultItem = useCallback(
    (user: UserSearchResult) => (
      <TouchableOpacity
        key={user.id}
        style={styles.resultItem}
        onPress={() => router.push(`/profile/${user.id}`)}
      >
        <Image
          source={{ uri: getOptimalImageUrl(user.profileThumbnailUrl || user.profilePictureUrl) }}
          style={styles.profilePic}
        />
        <View style={styles.resultTextContainer}>
          <Text style={styles.displayName}>{user.displayName || user.username}</Text>
          {user.displayName && <Text style={styles.username}>@{user.username}</Text>}
        </View>
      </TouchableOpacity>
    ),
    [router]
  );

  const renderTagResultItem = useCallback(
    ({ item }: { item: TagSearchResult }) => (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => router.push(`/explore/tags/${item.name}`)}
      >
        <View style={styles.tagIconContainer}>
          <Text style={styles.tagIconText}>#</Text>
        </View>
        <View style={styles.resultTextContainer}>
          <Text style={styles.displayName}>#{item.name}</Text>
          <Text style={styles.username}>
            {item.postCount > 0
              ? `${item.postCount >= 1000 ? `${(item.postCount / 1000).toFixed(1)}k` : item.postCount} posts`
              : 'No posts yet'}
          </Text>
        </View>
        <TagFollowButton tagName={item.name} />
      </TouchableOpacity>
    ),
    [router]
  );

  // ── Tab scenes ────────────────────────────────────────────────────────────

  const UsersScene = useCallback(() => {
    if (searchLoading) {
      return <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />;
    }
    if (searchResults.length === 0) {
      return (
        <Text style={styles.noResultsText}>
          {searchQuery.trim().length >= 2 ? `No users found for "${searchQuery}"` : ''}
        </Text>
      );
    }
    return (
      <FlatList
        data={searchResults}
        keyExtractor={item => item.id}
        renderItem={({ item }) => renderUserResultItem(item)}
      />
    );
  }, [searchLoading, searchResults, searchQuery, renderUserResultItem]);

  const TagsScene = useCallback(() => {
    if (tagSearchLoading) {
      return <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />;
    }
    if (tagSearchResults.length === 0) {
      return (
        <Text style={styles.noResultsText}>
          {searchQuery.trim().length >= 2 ? `No tags found for "${searchQuery}"` : ''}
        </Text>
      );
    }
    return (
      <FlatList
        data={tagSearchResults}
        keyExtractor={item => item.name}
        renderItem={renderTagResultItem}
      />
    );
  }, [tagSearchLoading, tagSearchResults, searchQuery, renderTagResultItem]);

  const renderScene = useCallback(
    ({ route }: { route: { key: string } }) => {
      switch (route.key) {
        case 'users':
          return <UsersScene />;
        case 'tags':
          return <TagsScene />;
        default:
          return null;
      }
    },
    [UsersScene, TagsScene]
  );

  const renderTabBar = useCallback(
    (props: any) => (
      <View style={{ paddingHorizontal: 15, backgroundColor: '#000' }}>
        <TabBar
          {...props}
          style={[styles.tabBar, { height: 48 }]}
          indicatorStyle={styles.tabIndicator}
          labelStyle={styles.tabLabel}
          activeColor="#FFF"
          inactiveColor="#666"
          pressColor="transparent"
          scrollEnabled={false}
        />
      </View>
    ),
    []
  );

  // ── Posts grid ────────────────────────────────────────────────────────────

  const renderPostsGrid = () => {
    if (loadingPosts && posts.length === 0) {
      return (
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 18 }).map((_, index) => (
            <View key={index} style={styles.skeletonPreview}>
              <ShimmerPlaceholder />
            </View>
          ))}
        </View>
      );
    }
    return (
      <FlatList
        data={posts}
        numColumns={3}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <PostGridItem item={item} onPress={() => router.push(`/view-post/${item.id}`)} />
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.7}
        ListFooterComponent={
          loadingPosts && posts.length > 0
            ? <ActivityIndicator style={{ margin: 20 }} size="small" color="#FFF" />
            : null
        }
      />
    );
  };

  return (
    <View style={globalStyles.container}>
      {/* Search bar */}
      <View style={[styles.searchBarView, { paddingTop: insets.top }]}>
        <TextInput
          placeholder="Search users and tags..."
          style={[styles.searchBar, { color: 'white' }]}
          onChangeText={handleSearch}
          value={searchQuery}
          placeholderTextColor="grey"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />
        {isSearching && (
          <TouchableOpacity style={styles.clearButton} onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <View style={[{ flex: 1, display: isSearching ? 'none' : 'flex' }]}>
          {renderPostsGrid()}
        </View>
        <View style={[{ flex: 1, display: isSearching ? 'flex' : 'none' }]}>
          <TabView
            navigationState={{ index: tabIndex, routes: TABS }}
            renderScene={renderScene}
            renderTabBar={renderTabBar}
            onIndexChange={setTabIndex}
            lazy
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBarView: {
    paddingTop: Platform.OS === 'android' ? 24 : 4,
    paddingHorizontal: 15,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#2e2e2e',
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingRight: 36,
    fontSize: 16,
    color: 'white',
  },
  clearButton: {
    position: 'absolute',
    right: 26,
  },
  tabBar: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  tabIndicator: {
    backgroundColor: ACCENT_COLOR,
    height: 3,
    borderRadius: 1.5,
    bottom: 0,
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'none',
    letterSpacing: 0.5,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  profilePic: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#555',
  },
  tagIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2e2e2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tagIconText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  resultTextContainer: {
    flex: 1,
  },
  displayName: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  username: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 1,
  },
  followButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8E8E93',
  },
  followButtonActive: {
    backgroundColor: '#2C2C2E',
    borderColor: '#3A3A3C',
  },
  followButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  followButtonTextActive: {
    color: '#8E8E93',
  },
  followLoading: {
    width: 70,
    alignSelf: 'center',
  },
  noResultsText: {
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 15,
  },
  postPreview: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 1,
  },
  postImage: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
  },
  skeletonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skeletonPreview: {
    width: '33.333%',
    aspectRatio: 1,
    padding: 1,
  },
  skeletonItem: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2e2e2e',
    borderRadius: 2,
    overflow: 'hidden',
  },
});
