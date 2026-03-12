import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, TextInput, StyleSheet, ActivityIndicator, Image, FlatList, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/globalStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { getOptimalImageUrl } from '@/utils/imageUtils';
import { OptimizedImageLight } from '@/components/OptimizedImage';
import { useExplore } from '@/features/explore/ui/useExplore';
import type { ExplorePost, UserSearchResult } from '@/features/explore/domain/ExploreTypes';

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

// ── Screen ───────────────────────────────────────────────────────────────────

export default function Explore() {
  const router = useRouter();
  const {
    searchQuery,
    searchResults,
    searchLoading,
    searchPerformed,
    handleSearch,
    posts,
    loadingPosts,
    loadMore,
  } = useExplore();

  const renderSearchBar = () => (
    <View style={styles.searchBarView}>
      <TextInput
        placeholder="Search users..."
        style={[styles.searchBar, { color: 'white' }]}
        onChangeText={handleSearch}
        value={searchQuery}
        placeholderTextColor="grey"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
      />
    </View>
  );

  const renderUserResultItem = (user: UserSearchResult) => (
    <TouchableOpacity
      key={user.id}
      style={styles.userResultItem}
      onPress={() => router.push(`/profile/${user.id}`)}
    >
      <Image
        source={{ uri: getOptimalImageUrl(user.profileThumbnailUrl || user.profilePictureUrl) }}
        style={styles.profilePic}
      />
      <View>
        <Text style={styles.displayName}>{user.displayName || user.username}</Text>
        {user.displayName && <Text style={styles.username}>@{user.username}</Text>}
      </View>
    </TouchableOpacity>
  );

  const renderSearchResultsView = () => {
    if (searchLoading) {
      return <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />;
    }
    if (!searchPerformed) return null;
    if (searchResults.length === 0 && searchQuery.trim().length >= 2) {
      return <Text style={styles.noResultsText}>No users found for "{searchQuery}"</Text>;
    }
    return (
      <FlatList
        data={searchResults}
        keyExtractor={item => item.id}
        renderItem={({ item }) => renderUserResultItem(item)}
      />
    );
  };

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
      <View style={styles.headerContainer}>
        <Text style={globalStyles.title}>Explore</Text>
      </View>
      {renderSearchBar()}
      <View style={{ flex: 1 }}>
        {searchQuery.trim().length > 0 || searchPerformed
          ? renderSearchResultsView()
          : renderPostsGrid()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: 10,
    paddingHorizontal: 15,
    paddingBottom: 5,
  },
  searchBarView: {
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  searchBar: {
    backgroundColor: '#2e2e2e',
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 15,
    fontSize: 16,
    color: 'white',
  },
  userResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#555',
  },
  displayName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    color: 'grey',
    fontSize: 14,
  },
  noResultsText: {
    color: 'grey',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
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
