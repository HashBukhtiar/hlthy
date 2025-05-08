import React, { useState, useEffect, useCallback } from 'react';
import { 
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/globalStyles';
import Icon from 'react-native-vector-icons/FontAwesome';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebaseConfig';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc as getFirestoreDoc } from 'firebase/firestore';

interface WorkoutItemData {
    id: string;
    title: string;
    creatorId: string;
    creatorUsername: string;
    coverImageUrl?: string | null;
    savedCount?: number;
  }

export default function Workouts() {
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();
    const { currentUser } = useAuth();

    const [myWorkouts, setMyWorkouts] = useState<WorkoutItemData[]>([]);
    const [favoriteWorkouts, setFavoriteWorkouts] = useState<WorkoutItemData[]>([]);
    const [trendingWorkouts, setTrendingWorkouts] = useState<WorkoutItemData[]>([]);
    
    const [loadingMyWorkouts, setLoadingMyWorkouts] = useState(false);
    const [loadingFavorites, setLoadingFavorites] = useState(false);
    const [loadingTrending, setLoadingTrending] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMyWorkouts = useCallback(async () => {
        if (!currentUser) return;
        setLoadingMyWorkouts(true);
        try {
            const q = query(
                collection(db, 'workouts'), 
                where('creatorId', '==', currentUser.uid),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const workoutsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutItemData));
            setMyWorkouts(workoutsData);
        } catch (error) {
            console.error("Error fetching my workouts: ", error);
        } finally {
            setLoadingMyWorkouts(false);
        }
    }, [currentUser]);

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
            
            // Firestore 'in' query is limited to 10 items. If more, batch or fetch individually.
            // For simplicity, fetching individually here. For many favorites, batching is better.
            const favWorkoutsData: WorkoutItemData[] = [];
            for (const id of workoutIds) {
                const workoutDocRef = doc(db, 'workouts', id);
                const workoutDocSnap = await getFirestoreDoc(workoutDocRef);
                if (workoutDocSnap.exists()) {
                    favWorkoutsData.push({ id: workoutDocSnap.id, ...workoutDocSnap.data() } as WorkoutItemData);
                }
            }
            setFavoriteWorkouts(favWorkoutsData);

        } catch (error) {
            console.error("Error fetching favorite workouts: ", error);
        } finally {
            setLoadingFavorites(false);
        }
    }, [currentUser]);

    const fetchTrendingWorkouts = useCallback(async () => {
        setLoadingTrending(true);
        try {
            const q = query(
                collection(db, 'workouts'),
                where('isPublic', '==', true), 
                orderBy('savedCount', 'desc'), 
                limit(10) 
            );
            const querySnapshot = await getDocs(q);
            const workoutsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutItemData));
            setTrendingWorkouts(workoutsData);
        } catch (error) {
            console.error("Error fetching trending workouts: ", error);
        } finally {
            setLoadingTrending(false);
        }
    }, []);


    useEffect(() => {
        if (currentUser) {
            fetchMyWorkouts();
            fetchFavoriteWorkouts();
        }
        fetchTrendingWorkouts();
    }, [currentUser, fetchMyWorkouts, fetchFavoriteWorkouts, fetchTrendingWorkouts]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        Promise.all([
            currentUser ? fetchMyWorkouts() : Promise.resolve(),
            currentUser ? fetchFavoriteWorkouts() : Promise.resolve(),
            fetchTrendingWorkouts()
        ]).finally(() => setRefreshing(false));
    }, [currentUser, fetchMyWorkouts, fetchFavoriteWorkouts, fetchTrendingWorkouts]);

    function renderSearchBar() {
        return (
            <View style={styles.searchBarContainer}>
                <Icon name="search" size={20} color="grey" />
                <TextInput
                    style={styles.searchBar}
                    onChangeText={(text) => {setSearchQuery(text)}}
                    value={searchQuery}
                    placeholder="Search Workouts..."
                    placeholderTextColor="grey"
                />
                {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Icon name="times-circle" size={20} color="grey" />
                    </TouchableOpacity>
                ) : null}
            </View>
        );
    }

    const renderWorkoutItem = (item: WorkoutItemData, itemStyle: any, blurStyle: any) => (
        <TouchableOpacity 
            key={item.id}
            style={itemStyle}
            onPress={() => router.push(`/view-workout/${item.id}`)}
        >
            <Image 
                source={item.coverImageUrl ? { uri: item.coverImageUrl } : require('@/assets/images/default_workout_cover.png')}
                style={StyleSheet.absoluteFill}
            />
            <BlurView intensity={80} tint="dark" style={blurStyle}>
                <Text style={styles.workoutNameText} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.workoutAuthorText} numberOfLines={1}>by {item.creatorUsername}</Text>
            </BlurView>
        </TouchableOpacity>
    );


    function renderMyWorkouts() {
        if (loadingMyWorkouts && myWorkouts.length === 0) {
            return <ActivityIndicator style={styles.listLoadingIndicator} size="small" color="white" />;
        }
        if (!currentUser) {
            return <Text style={styles.placeholderText}>Login to see your workouts.</Text>;
        }
        if (myWorkouts.length === 0 && !loadingMyWorkouts) {
            return (
                <View>
                    <View style={styles.myWorkoutsHeaderView}>
                        <Text style={styles.workoutsHeaders}>My Workouts</Text>
                        <TouchableOpacity 
                            style={styles.createWorkoutButton}
                            onPress={() => router.push('/create-workout')}
                        >
                            <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 23 }}>+</Text>
                        </TouchableOpacity>
                        </View>
                    <Text style={styles.placeholderText}>You haven't created any workouts yet.</Text>
                </View>
            );
        }
        return (
            <View>
                <View style={styles.myWorkoutsHeaderView}>
                    <Text style={styles.workoutsHeaders}>My Workouts</Text>
                    <TouchableOpacity 
                        style={styles.createWorkoutButton}
                        onPress={() => router.push('/create-workout')}
                    >
                        <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 23 }}>+</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal={true} style={styles.myWorkoutsList} showsHorizontalScrollIndicator={false}>
                    {myWorkouts.map(item => renderWorkoutItem(item, styles.myWorkoutsButton, styles.myWorkoutPreview))}
                </ScrollView>
            </View>
        );
    }

    function renderFavoriteWorkouts() {
        if (loadingFavorites && favoriteWorkouts.length === 0) {
            return <ActivityIndicator style={styles.listLoadingIndicator} size="small" color="white" />;
        }
        if (!currentUser) {
            return <Text style={styles.placeholderText}>Login to see your favorite workouts.</Text>;
        }
        if (favoriteWorkouts.length === 0 && !loadingFavorites) {
            return (
                <View>
                    <View style={styles.myWorkoutsHeaderView}>
                        <Text style={styles.workoutsHeaders}>Favourite Workouts</Text>
                    </View>
                    <Text style={styles.placeholderText}>No favorite workouts yet.</Text>
                </View>
            );
        }
        return (
            <View>
                <View style={styles.myWorkoutsHeaderView}>
                    <Text style={styles.workoutsHeaders}>Favourite Workouts</Text>
                </View>
                <ScrollView horizontal={true} style={styles.friendsWorkoutsList} showsHorizontalScrollIndicator={false}>
                    {favoriteWorkouts.map(item => renderWorkoutItem(item, styles.friendsWorkoutsButton, styles.workoutPreview))}
                </ScrollView>
            </View>
        );
    }
    
    // Placeholder for Friends' Workouts
    function renderFriendsWorkouts() {
        return (
            <View>
                <View style={styles.myWorkoutsHeaderView}>
                    <Text style={styles.workoutsHeaders}>Friends' Workouts</Text>
                </View>
                <Text style={styles.placeholderText}>Friends' workouts coming soon!</Text>
            </View>
        );
    }

    function renderTrendingWorkouts() {
        if (loadingTrending && trendingWorkouts.length === 0) {
             return <ActivityIndicator style={styles.listLoadingIndicator} size="small" color="white" />;
        }
         if (trendingWorkouts.length === 0 && !loadingTrending) {
            return <Text style={styles.placeholderText}>No trending workouts available.</Text>;
        }
        
        return (
            <View>
                <View style={styles.myWorkoutsHeaderView}>
                    <Text style={styles.workoutsHeaders}>Trending Workouts</Text>
                </View>
                <View style={styles.trendingWorkoutsVerticalList}>
                    {trendingWorkouts.map((item) => (
                        <TouchableOpacity 
                            key={item.id}
                            style={styles.trendingWorkoutsButton}
                            onPress={() => router.push(`/view-workout/${item.id}`)}
                        >
                            <Image 
                                source={item.coverImageUrl ? { uri: item.coverImageUrl } : require('@/assets/images/default_workout_cover.png')}
                                style={styles.trendingWorkoutsIcon} 
                            />
                            <View style={styles.trendingWorkoutsTextView}>
                                <Text style={[styles.trendingWorkoutsText, {fontWeight: 'bold'}]} numberOfLines={1}>{item.title}</Text>
                                <Text style={[styles.trendingWorkoutsText, {color: '#D0D0D0'}]} numberOfLines={1}>by {item.creatorUsername}</Text>
                            </View>
                            
                            <Text style={styles.trendingSavedCount}>{item.savedCount || 0} saves</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    }

    return (
        <View style={globalStyles.container}>
            <View style={styles.searchBarView}>
                {renderSearchBar()}
            </View>
            <ScrollView 
                style={styles.workoutsContainer} 
                contentContainerStyle={globalStyles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="white"/>
                }
            >
                {renderMyWorkouts()}
                {renderFavoriteWorkouts()}
                {renderFriendsWorkouts()} 
                {renderTrendingWorkouts()}
                <View style={{height: 30}} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    searchBarView: {
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2e2e2e',
        borderRadius: 20,
        height: 40,
        paddingLeft: 10,
        paddingRight: 10,
        width: '95%',
    },
    searchBar: {
        flex: 1,
        color: 'white',
        marginLeft: 10,
    },
    workoutsContainer: {
        flex: 1,
    },
    workoutsHeaders: {
        color: 'white',
        fontSize: 24, 
        fontWeight: 'bold',
    },
    myWorkoutsHeaderView: {
        flexDirection: 'row',
        paddingHorizontal: 15, 
        paddingVertical: 10,
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10, 
    },
    createWorkoutButton: {
        backgroundColor: '#ff2d55', 
        borderRadius: 20, 
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    myWorkoutsList: { 
        paddingLeft: 15, 
        paddingRight: 5, 
        height: 210, 
    },
    myWorkoutsButton: { 
        overflow: 'hidden', 
        width: 180, 
        height: 180, 
        borderRadius: 20, 
        backgroundColor: '#333', 
        marginRight: 10,
        justifyContent: 'flex-end', 
    },
    myWorkoutPreview: { 
        width: '100%', 
        justifyContent: 'center',
        alignItems: 'flex-start', 
        padding: 12, 
    },
    workoutNameText: {
        fontWeight: 'bold',
        color: 'white',
        fontSize: 15, 
        marginBottom: 2,
    },
    workoutAuthorText: {
        color: '#E0E0E0', 
        fontSize: 11,
    },
    friendsWorkoutsList: { 
        paddingLeft: 15,
        paddingRight: 5,
        height: 170, 
    },
    friendsWorkoutsButton: { 
        overflow: 'hidden',
        width: 150, 
        height: 150,
        borderRadius: 15,
        backgroundColor: '#333', 
        marginRight: 10,
        justifyContent: 'flex-end',
    },
    workoutPreview: { 
        width: '100%',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: 10,
    },
    trendingWorkoutsList: { 
        flexDirection: 'row',
        padding: 5,
        height: 220,
    },
    trendingWorkoutsButton: { 
        flexDirection: 'row',
        width: '100%', 
        paddingVertical: 10,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
        alignItems: 'center',
    },
    trendingWorkoutsTextView: {
        justifyContent: 'center',
        alignItems: 'flex-start',
        flex: 1, 
    },
    trendingWorkoutsText: {
        color: 'white',
    },
    trendingWorkouts4Group: {
        flexDirection: 'column',
        width: Dimensions.get('window').width * 0.95,
        marginTop: 10,
        marginBottom: 10,
        alignItems: 'center'
    },  
    trendingWorkoutsIcon: { 
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: '#333',
        marginRight: 10,
    },
    trendingWorkoutsMoreButton: {
        justifyContent: 'center',
        paddingLeft: 10,
    },
    placeholderText: {
        color: 'grey',
        textAlign: 'center',
        marginVertical: 20,
        marginHorizontal: 10,
        fontSize: 14,
    },
    listLoadingIndicator: {
        marginVertical: 20,
    },
    trendingWorkoutsVerticalList: { 
        paddingHorizontal: 10,
    },
    trendingSavedCount: {
        color: '#aaa',
        fontSize: 12,
        marginLeft: 10,
    }, 
});