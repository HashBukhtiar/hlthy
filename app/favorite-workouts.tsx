import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/globalStyles';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebaseConfig';
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { getCoverImageSource } from '@/utils/imageUtils';

interface WorkoutItemData {
  id: string;
  title: string;
  creatorId: string;
  creatorUsername: string;
  coverImageUrl?: string | null;
  thumbnailUrl?: string | null;
  savedCount: number;
  createdAt: string;
}

export default function FavoriteWorkouts() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState<WorkoutItemData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFavoriteWorkouts = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      // 1) grab savedWorkout IDs
      const snap = await getDocs(collection(db, `users/${currentUser.uid}/savedWorkouts`));
      const ids = snap.docs.map(d => d.id);
      if (!ids.length) {
        setFavorites([]);
        return;
      }

      const data: WorkoutItemData[] = [];
      for (const id of ids) {
        // get workout
        const wdoc = await getDoc(doc(db, 'workouts', id));
        if (!wdoc.exists()) continue;
        const wd = wdoc.data() as any;

        // get creator username
        const udoc = await getDoc(doc(db, 'users', wd.creatorId));
        const uname = udoc.exists() ? (udoc.data() as any).username : 'Unknown';

        data.push({
          id: wdoc.id,
          title: wd.title,
          creatorId: wd.creatorId,
          creatorUsername: uname,
          coverImageUrl: wd.coverImageUrl ?? null,
          thumbnailUrl: wd.thumbnailUrl ?? null,
          savedCount: wd.savedCount ?? 0,
          createdAt: wd.createdAt
            ? wd.createdAt.toDate().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })
            : '',
        });
      }

      setFavorites(data);
    } catch (err) {
      console.error('Error loading favorite workouts:', err);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchFavoriteWorkouts();
  }, [fetchFavoriteWorkouts]);

  const renderItem = ({ item }: { item: WorkoutItemData }) => (
    <TouchableOpacity
      style={styles.workoutItem}
      onPress={() => router.push(`/view-workout/${item.id}`)}
    >
      <Image
        source={getCoverImageSource(item.thumbnailUrl, item.coverImageUrl)}
        style={styles.workoutImage}
      />
      <View style={styles.workoutInfo}>
        <Text style={styles.workoutTitle}>{item.title}</Text>
        <Text style={styles.workoutAuthor}>by {item.creatorUsername}</Text>
        <Text style={styles.workoutDate}>{item.createdAt}</Text>
        <Text style={styles.workoutSaves}>{item.savedCount} saves</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={globalStyles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.header}>Favorite Workouts</Text>
      </View>

      {loading && favorites.length === 0 ? (
        <ActivityIndicator size="large" color="white" />
      ) : favorites.length === 0 ? (
        <Text style={styles.noFavoritesText}>No favorite workouts yet.</Text>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderItem}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
    marginBottom: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginLeft: 10,
  },
  backButton: {
    position: 'absolute',
    left: 10,
    zIndex: 1,
  },
  listContainer: {
    paddingBottom: 20,
  },
  workoutItem: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  workoutImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  workoutAuthor: {
    color: '#b7b7b7',
    fontSize: 14,
    marginBottom: 5,
  },
  workoutDate: {
    color: '#888',
    fontSize: 12,
  },
  workoutSaves: {
    color: '#888',
    fontSize: 12,
  },
  noFavoritesText: {
    color: 'grey',
    textAlign: 'center',
    marginTop: 20,
  },
});