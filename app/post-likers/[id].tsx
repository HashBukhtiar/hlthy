import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '@/firebaseConfig';
import { collection, query, orderBy, getDocs, doc, getDoc, where } from '@/features/infra/firestore';
import { Ionicons } from '@expo/vector-icons';
// Make sure profileIcon is a valid image source, e.g., require('./path/to/image.png')
// If it's just a string path, it needs to be wrapped in require() here or in the assets/images file.
import { profileIcon } from '@/assets/images';
import { head } from 'lodash';
import { OptimizedImageLight } from '@/components/OptimizedImage';

interface Liker {
  id: string;
  username: string;
  profileImageUrl?: string;
  profileThumbnailUrl?: string;
}

export default function PostLikersScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  // Ensure you are using 'id' if your filename is [id].tsx
  const postId = params.id ? String(params.id) : '';

  const [likers, setLikers] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchLikersCallback = useCallback(async () => {
    if (!postId) {
      setFetchError("Post ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);
    setLikers([]); // Clear previous likers

    try {
      const postRef = doc(db, "posts", postId);
      const postSnap = await getDoc(postRef);

      if (!postSnap.exists()) {
        setFetchError("Post not found.");
        setLoading(false);
        return;
      }

      // Assuming likes are stored in posts/{postId}/likers/{userId}
      // And each document in 'likers' has a 'likedAt' timestamp field.
      const likersRef = collection(db, "posts", postId, "likers");
      const q = query(likersRef, orderBy("likedAt", "desc"));
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setLoading(false);
        return; // No likers, likers state remains empty
      }

      const fetchedLikersPromises = querySnapshot.docs.map(async (likerDocSnapshot) => {
        // const likerDocData = likerDocSnapshot.data(); // Contains 'likedAt', etc.
        const userId = likerDocSnapshot.id;

        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          return {
            id: userId,
            username: userData.username || 'Unknown User',
            profileImageUrl: userData.profileImageUrl,
            profileThumbnailUrl: userData.profileThumbnailUrl,
          } as Liker;
        } else {
          // Fallback if user document is missing
          return {
            id: userId,
            username: 'User (Profile Missing)',
            profileImageUrl: undefined,
            profileThumbnailUrl: undefined,
          } as Liker;
        }
      });

      const resolvedLikers = (await Promise.all(fetchedLikersPromises)).filter(Boolean) as Liker[];
      setLikers(resolvedLikers);

    } catch (err: any) {
      console.error("Error fetching likers:", err);
      setFetchError(err.message || "Failed to fetch likers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchLikersCallback();
  }, [fetchLikersCallback]);

  const handleUserPress = (userId: string) => {
    router.push({ pathname: "/profile/[userId]", params: { userId } });
  };

  const renderLikerItem = ({ item }: { item: Liker }) => (
    <TouchableOpacity style={styles.likerItem} onPress={() => handleUserPress(item.id)}>
      <OptimizedImageLight 
        thumbnailUrl={item.profileThumbnailUrl}
        originalUrl={item.profileImageUrl}
        style={styles.avatar} 
      />
      <Text style={styles.username}>{item.username}</Text>
    </TouchableOpacity>
  );

  const ListHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Likes</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ListHeader />
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color="#FFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (fetchError) {
    return (
      <SafeAreaView style={styles.container}>
        <ListHeader />
        <View style={styles.centeredContent}>
          <Text style={styles.errorText}>{fetchError}</Text>
          <TouchableOpacity onPress={fetchLikersCallback} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        style={styles.flatList}
        data={likers}
        renderItem={renderLikerItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<ListHeader />}
        ListEmptyComponent={
          <View style={styles.listEmptyContainer}> 
            <Text style={styles.emptyText}>No likes yet.</Text>
          </View>
        }
        contentContainerStyle={likers.length === 0 ? styles.contentContainerEmpty : styles.contentContainerDefault}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  flatList: {
    flex: 1,
  },
  contentContainerDefault: {
    // Add any specific styling for when the list has content, e.g., paddingBottom
  },
  contentContainerEmpty: {
    flexGrow: 1,
  },
  listEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15, 
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: 'black',
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1, 
    textAlign: 'center', 
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 34, 
  },
  centeredContent: {
    flex: 1, 
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  likerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 12,
    backgroundColor: '#333', 
  },
  username: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyText: {
    color: 'grey',
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#555',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
  },
});