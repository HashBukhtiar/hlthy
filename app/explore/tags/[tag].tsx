import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { OptimizedImageLight } from '@/components/OptimizedImage';
import { useTagFeed } from '@/features/tags/ui/useTagFeed';
import { useTagFollow } from '@/features/tags/ui/useTagFollow';
import { ACCENT_COLOR } from '@/constants/Colors';
import type { ExplorePost } from '@/features/explore/domain/ExploreTypes';

// ── Sub-components ───────────────────────────────────────────────────────────

const ShimmerPlaceholder = () => {
  const animatedValue = new Animated.Value(0);

  React.useEffect(() => {
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

function formatPostCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M posts`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k posts`;
  if (count === 1) return '1 post';
  return `${count} posts`;
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function TagFeedScreen() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const router = useRouter();
  const tagName = Array.isArray(tag) ? tag[0] : tag;

  const { posts, loading, allLoaded, loadMore, postCount } = useTagFeed(tagName);
  const { isFollowing, toggle, loading: followLoading } = useTagFollow(tagName);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-back" size={24} color="#FFF" />
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <Text style={styles.headerTagName}>#{tagName}</Text>
        {postCount > 0 && (
          <Text style={styles.headerPostCount}>{formatPostCount(postCount)}</Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.followButton, isFollowing && styles.followButtonActive]}
        onPress={toggle}
        disabled={followLoading}
        activeOpacity={0.8}
      >
        {followLoading ? (
          <ActivityIndicator size="small" color="#8E8E93" />
        ) : (
          <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  if (loading && posts.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.skeletonContainer}>
          {Array.from({ length: 18 }).map((_, i) => (
            <View key={i} style={styles.skeletonPreview}>
              <ShimmerPlaceholder />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (!loading && posts.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No posts with #{tagName} yet.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
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
          loading && posts.length > 0
            ? <ActivityIndicator style={{ margin: 20 }} size="small" color="#FFF" />
            : allLoaded && posts.length > 0
            ? <Text style={styles.allLoadedText}>All posts loaded</Text>
            : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  backButton: {
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTagName: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
  },
  headerPostCount: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 2,
  },
  followButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#8E8E93',
    minWidth: 90,
    alignItems: 'center',
  },
  followButtonActive: {
    backgroundColor: '#2C2C2E',
    borderColor: '#3A3A3C',
  },
  followButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  followButtonTextActive: {
    color: '#8E8E93',
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
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    color: '#8E8E93',
    fontSize: 16,
    textAlign: 'center',
  },
  allLoadedText: {
    color: '#636366',
    fontSize: 13,
    textAlign: 'center',
    padding: 20,
  },
});
