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
import { collection, query, getDocs, doc, getDoc, where, orderBy } from 'firebase/firestore';
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

export default function FollowingWorkouts() {
    const router = useRouter();
    const { currentUser } = useAuth();
    const [followingWorkouts, setFollowingWorkouts] = useState<WorkoutItemData[]>([]);
    const [loadingFollowingWorkouts, setLoadingFollowingWorkouts] = useState(false);

    const fetchFollowingWorkouts = useCallback(async () => {
        if (!currentUser) return;
        setLoadingFollowingWorkouts(true);
        try {
            const followingRef = collection(db, `users/${currentUser.uid}/following`);
            const followingSnapshot = await getDocs(followingRef);
            const followingIds = followingSnapshot.docs.map(doc => doc.id);

            if (followingIds.length === 0) {
                setFollowingWorkouts([]);
                setLoadingFollowingWorkouts(false);
                return;
            }
            
            const q = query(
                collection(db, 'workouts'),
                where('creatorId', 'in', followingIds),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const workoutsData = querySnapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                }),
            } as WorkoutItemData));
            setFollowingWorkouts(workoutsData);
        } catch (error) {
            console.error("Error fetching workouts from people you follow: ", error);
            setFollowingWorkouts([]);
        } finally {
            setLoadingFollowingWorkouts(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchFollowingWorkouts();
    }, [fetchFollowingWorkouts]);

    const renderItem = ({ item }: { item: WorkoutItemData }) => (
        <TouchableOpacity style={styles.workoutItem} onPress={() => router.push(`/view-workout/${item.id}`)}>
            <Image source={item.coverImageUrl ? { uri: item.coverImageUrl } : require('@/assets/images/default_workout_cover.png')} style={styles.workoutImage} />
            <View style={styles.workoutInfo}>
                <Text style={styles.workoutTitle}>{item.title}</Text>
                <Text style={styles.workoutAuthor}>by {item.creatorUsername}</Text>
                <Text style={styles.workoutDate}>Created: {item.createdAt}</Text>
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
                <Text style={styles.header}>Workouts By People You Follow</Text>
            </View>
            {loadingFollowingWorkouts && followingWorkouts.length === 0 ? (
                <ActivityIndicator size="large" color="white" />
            ) : followingWorkouts.length === 0 ? (
                <Text style={styles.noWorkoutsText}>No workouts from people you follow yet.</Text>
            ) : (
                <FlatList
                    data={followingWorkouts}
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
    noWorkoutsText: {
        color: 'grey',
        textAlign: 'center',
        marginTop: 20,
    },
});