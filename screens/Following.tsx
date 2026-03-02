import React from 'react';
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
import { useSocialGraph } from '@/features/social/ui/useSocialGraph';

export default function Following() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { entries, username, loading, error } = useSocialGraph(userId, 'following');

  const handleUserPress = (pressedUserId: string) => {
    router.push(`/profile/${pressedUserId}`);
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
      <Text style={styles.subTitle}>Users {username} follows ({entries.length})</Text>
      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.userItem} onPress={() => handleUserPress(item.id)}>
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
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Not following anyone yet</Text>
          </View>
        }
      />
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
  subTitle: { color: '#AAA', fontSize: 14, paddingHorizontal: 16, paddingVertical: 10 },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
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
