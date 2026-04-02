import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OptimizedImageLight } from '@/components/OptimizedImage';
import { useSocialGraph, SocialGraphItem } from '@/features/social/ui/useSocialGraph';
import { ACCENT_COLOR } from '@/constants/Colors';

type ExpandedSection = 'people' | 'tags';

export default function Following() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { entries, username, loading, error } = useSocialGraph(userId, 'following');
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>('people');

  const users = entries.filter(item => item.type === 'user');
  const tags = entries.filter(item => item.type === 'tag');

  const handleUserPress = useCallback(
    (pressedUserId: string) => {
      router.push(`/profile/${pressedUserId}`);
    },
    [router]
  );

  const handleTagPress = useCallback(
    (tagName: string) => {
      router.push(`/explore/tags/${tagName}`);
    },
    [router]
  );

  const renderUserItem = useCallback(
    ({ item }: { item: SocialGraphItem }) => {
      if (item.type !== 'user') return null;
      return (
        <TouchableOpacity
          style={styles.userItem}
          onPress={() => handleUserPress(item.id)}
        >
          <OptimizedImageLight
            thumbnailUrl={item.profileThumbnailUrl}
            originalUrl={item.profileImageUrl}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.name}>{item.displayName}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      );
    },
    [handleUserPress]
  );

  const renderTagItem = useCallback(
    ({ item }: { item: SocialGraphItem }) => {
      if (item.type !== 'tag') return null;
      return (
        <TouchableOpacity
          style={styles.tagItem}
          onPress={() => handleTagPress(item.name)}
        >
          <View style={styles.tagIconContainer}>
            <Text style={styles.tagIcon}>#</Text>
          </View>
          <View style={styles.tagInfo}>
            <Text style={styles.tagName}>#{item.name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#666" />
        </TouchableOpacity>
      );
    },
    [handleTagPress]
  );

  const toggleSection = (section: ExpandedSection) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="white" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header onBack={() => router.back()} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading following: {error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header onBack={() => router.back()} />
      <Text style={styles.subTitle}>{username}</Text>

      {/* People section */}
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection('people')}
      >
        <View style={styles.sectionTitleContainer}>
          <Ionicons
            name={expandedSection === 'people' ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="white"
          />
          <Text style={styles.sectionTitle}>
            {users.length} {users.length === 1 ? 'Person' : 'People'}
          </Text>
        </View>
      </TouchableOpacity>

      {expandedSection === 'people' && (
        <FlatList
          data={users}
          keyExtractor={item => item.id}
          renderItem={renderUserItem}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Not following anyone yet</Text>
            </View>
          }
        />
      )}

      {/* Hashtags section */}
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection('tags')}
      >
        <View style={styles.sectionTitleContainer}>
          <Ionicons
            name={expandedSection === 'tags' ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="white"
          />
          <Text style={styles.sectionTitle}>
            {tags.length} {tags.length === 1 ? 'Hashtag' : 'Hashtags'}
          </Text>
        </View>
      </TouchableOpacity>

      {expandedSection === 'tags' && (
        <FlatList
          data={tags}
          keyExtractor={item => item.id}
          renderItem={renderTagItem}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Not following any hashtags yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Following</Text>
      <View style={{ width: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  backButton: { padding: 5 },
  subTitle: { color: '#AAA', fontSize: 16, paddingHorizontal: 16, paddingVertical: 12, fontWeight: '600' },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#1C1C1E',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: { color: 'white', fontSize: 16, fontWeight: '600' },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  tagIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2e2e2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  tagIcon: {
    color: ACCENT_COLOR,
    fontSize: 24,
    fontWeight: '700',
  },
  tagInfo: { flex: 1 },
  tagName: { color: 'white', fontSize: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 16 },
  userInfo: { flex: 1 },
  username: { color: 'white', fontSize: 16, marginBottom: 3 },
  name: { color: '#999', fontSize: 14 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: '#FF5555', textAlign: 'center' },
  emptyContainer: { padding: 30, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#999', fontSize: 16, textAlign: 'center' },
});
