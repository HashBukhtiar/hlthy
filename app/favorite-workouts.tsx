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
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

interface WorkoutItemData {
    id: string;
    title: string;
    creatorId: string;
    creatorUsername: string;
    coverImageUrl?: string | null;
    savedCount?: number;
    createdAt?: any;
}

export default function FavoriteWorkouts() {
    const router = useRouter();
    const { currentUser } = useAuth();
    const [favoriteWorkouts, setFavoriteWorkouts] = useState<WorkoutItemData[]>([]);
    const [loadingFavorites, setLoadingFavorites] = useState(false);

    const fetchFavoriteWorkouts = useCallback(async () => {
        if (!currentUser) return;
        setLoadingFavorites(true);
        try {
            const savedWorkoutsRef = collection(db, `users/${currentUser.uid}/savedWorkouts`);
            const savedSnapshot = await getDocs(savedWorkoutsRef);
            const workoutIds = savedSnapshot.docs.map(doc => doc.id);

            if (workoutIds.length === 0) {
                setFavoriteWorkouts([]);
                setLoadingFavorites(false);
                return;
            }
            
            const favWorkoutsData: WorkoutItemData[] = [];
            for (const id of workoutIds) { 
                const workoutDocRef = doc(db, 'workouts', id);
                const workoutDocSnap = await getDoc(workoutDocRef);
                if (workoutDocSnap.exists()) {
                    const workoutData = workoutDocSnap.data();

                    // Fetch creator's profile picture
                    const creatorDocRef = doc(db, 'users', workoutData.creatorId);
                    const creatorDocSnap = await getDoc(creatorDocRef);
                    const creatorData = creatorDocSnap.data();

                    favWorkoutsData.push({ 
                        id: workoutDocSnap.id, 
                        ...workoutData,
                        createdAt: workoutData.createdAt?.toDate().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        }),
                    } as WorkoutItemData);
                }
            }
            setFavoriteWorkouts(favWorkoutsData); 
        } catch (error) {
            console.error("Error fetching favorite workouts: ", error);
            setFavoriteWorkouts([]);
        } finally {
            setLoadingFavorites(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchFavoriteWorkouts();
    }, [fetchFavoriteWorkouts]);

    const renderItem = ({ item }: { item: WorkoutItemData }) => (
        <TouchableOpacity style={styles.workoutItem} onPress={() => router.push(`/view-workout/${item.id}`)}>
            <Image source={item.coverImageUrl ? { uri: item.coverImageUrl } : require('@/assets/images/default_workout_cover.png')} style={styles.workoutImage} />
            <View style={styles.workoutInfo}>
                <Text style={styles.workoutTitle}>{item.title}</Text>
                <Text style={styles.workoutAuthor}>by {item.creatorUsername}</Text>
                <Text style={styles.workoutDate}>{item.createdAt}</Text>
                <Text style={styles.workoutSaves}>{item.savedCount || 0} saves</Text>
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
            {loadingFavorites && favoriteWorkouts.length === 0 ? (
                <ActivityIndicator size="large" color="white" />
            ) : favoriteWorkouts.length === 0 ? (
                <Text style={styles.noFavoritesText}>No favorite workouts yet.</Text>
            ) : (
                <FlatList
                    data={favoriteWorkouts}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
        padding: 10,
    },
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