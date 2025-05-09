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
    FlatList,
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

const chunkArray = (array: WorkoutItemData[], size: number): WorkoutItemData[][] => {
  const chunkedArr: WorkoutItemData[][] = [];
  let index = 0;
  while (index < array.length) {
    chunkedArr.push(array.slice(index, size + index));
    index += size;
  }
  return chunkedArr;
};

export default function Workouts() {
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();
    const { currentUser } = useAuth();

    const [myWorkouts, setMyWorkouts] = useState<WorkoutItemData[]>([]);
    const [favoriteWorkouts, setFavoriteWorkouts] = useState<WorkoutItemData[]>([]);
    const [trendingWorkouts, setTrendingWorkouts] = useState<WorkoutItemData[]>([]);
    
    const [searchResults, setSearchResults] = useState<WorkoutItemData[]>([]);
    
    const [loadingMyWorkouts, setLoadingMyWorkouts] = useState(false);
    const [loadingFavorites, setLoadingFavorites] = useState(false);
    const [loadingTrending, setLoadingTrending] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

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
            setMyWorkouts([]); 
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
            
            const favWorkoutsData: WorkoutItemData[] = [];
            for (const id of workoutIds.slice(0, 30)) { 
                const workoutDocRef = doc(db, 'workouts', id);
                const workoutDocSnap = await getFirestoreDoc(workoutDocRef);
                if (workoutDocSnap.exists()) {
                    favWorkoutsData.push({ id: workoutDocSnap.id, ...workoutDocSnap.data() } as WorkoutItemData);
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

    const fetchTrendingWorkouts = useCallback(async () => {
        setLoadingTrending(true);
        try {
            const q = query(
                collection(db, 'workouts'),
                where('isPublic', '==', true), 
                orderBy('savedCount', 'desc'), 
                limit(50) 
            );
            const querySnapshot = await getDocs(q);
            const workoutsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkoutItemData));
            setTrendingWorkouts(workoutsData); 
        } catch (error) {
            console.error("Error fetching trending workouts: ", error);
            setTrendingWorkouts([]); 
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

    useEffect(() => {
        const lowerCaseQuery = searchQuery.toLowerCase().trim();

        if (!lowerCaseQuery) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);

        // Combine all workouts and deduplicate
        const allWorkoutsMap = new Map<string, WorkoutItemData>();
        myWorkouts.forEach(workout => allWorkoutsMap.set(workout.id, workout));
        favoriteWorkouts.forEach(workout => allWorkoutsMap.set(workout.id, workout));
        trendingWorkouts.forEach(workout => allWorkoutsMap.set(workout.id, workout));
        
        const uniqueWorkouts = Array.from(allWorkoutsMap.values());

        const filtered = uniqueWorkouts.filter(
            (workout) =>
                workout.title.toLowerCase().includes(lowerCaseQuery) ||
                workout.creatorUsername.toLowerCase().includes(lowerCaseQuery)
        );
        setSearchResults(filtered);
    }, [searchQuery, myWorkouts, favoriteWorkouts, trendingWorkouts]);


    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setSearchQuery('');
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
                    onChangeText={(text) => setSearchQuery(text)}
                    value={searchQuery}
                    placeholder="Search Workouts by Title or Creator..."
                    placeholderTextColor="grey"
                    // onFocus={() => setIsSearching(true)} // Can be used if you want overlay on focus
                    // onBlur={() => !searchQuery && setIsSearching(false)} // Hide if query is empty on blur
                />
                {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Icon name="times-circle" size={20} color="grey" />
                    </TouchableOpacity>
                ) : null}
            </View>
        );
    }

    const renderWorkoutCarouselItem = (item: WorkoutItemData, itemStyle: any, blurStyle: any) => (
        <TouchableOpacity 
            key={item.id}
            style={itemStyle}
            onPress={() => {
                router.push(`/view-workout/${item.id}`);
                setSearchQuery('');
            }}
        >
            <Image 
                source={item.coverImageUrl ? { uri: item.coverImageUrl } : require('@/assets/images/default_workout_cover.png')}
                style={StyleSheet.absoluteFill}
            />
            <BlurView intensity={25} tint="dark" style={blurStyle}>
                <Text style={styles.workoutNameText} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.workoutAuthorText} numberOfLines={1}>by {item.creatorUsername}</Text>
            </BlurView>
        </TouchableOpacity>
    );

    // New item renderer for search results list
    const renderSearchResultItem = ({ item }: { item: WorkoutItemData }) => (
        <TouchableOpacity
            style={styles.searchResultItem}
            onPress={() => {
                router.push(`/view-workout/${item.id}`);
                setSearchQuery('');
            }}
        >
            <Image
                source={item.coverImageUrl ? { uri: item.coverImageUrl } : require('@/assets/images/default_workout_cover.png')}
                style={styles.searchResultImage}
            />
            <View style={styles.searchResultTextContainer}>
                <Text style={styles.searchResultTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.searchResultCreator} numberOfLines={1}>by {item.creatorUsername}</Text>
            </View>
            {/* Optionally, add savedCount or other info */}
        </TouchableOpacity>
    );

    function renderMyWorkouts() {
        // This section is now only rendered if not searching
        if (!currentUser) {
            return <Text style={styles.placeholderText}>Login to see your workouts.</Text>;
        }
        return (
            <View>
                <View style={styles.myWorkoutsHeaderView}>
                    <Text style={styles.workoutsHeaders}>My Workouts</Text>
                    <TouchableOpacity 
                        style={styles.createWorkoutButton}
                        onPress={() => router.push('/create-workout')}
                    >
                        <Text style={{ color: 'black', fontWeight: 'bold', fontSize: 18 }}>+ Create New</Text>
                    </TouchableOpacity>
                </View>
                {loadingMyWorkouts && myWorkouts.length === 0 ? (
                    <ActivityIndicator style={styles.listLoadingIndicator} size="small" color="white" />
                ) : myWorkouts.length === 0 ? (
                    <Text style={styles.placeholderText}>You haven't created any workouts yet.</Text>
                ) : (
                    <ScrollView horizontal={true} style={styles.myWorkoutsList} showsHorizontalScrollIndicator={false}>
                        {myWorkouts.map(item => renderWorkoutCarouselItem(item, styles.myWorkoutsButton, styles.myWorkoutPreview))}
                    </ScrollView>
                )}
            </View>
        );
    }

    function renderFavoriteWorkouts() {
        // This section is now only rendered if not searching
        if (!currentUser) {
            return <Text style={styles.placeholderText}>Login to see your favorite workouts.</Text>;
        }
        return (
            <View>
                <View style={styles.myWorkoutsHeaderView}>
                    <Text style={styles.workoutsHeaders}>Favourite Workouts</Text>
                </View>
                {loadingFavorites && favoriteWorkouts.length === 0 ? (
                     <ActivityIndicator style={styles.listLoadingIndicator} size="small" color="white" />
                ) : favoriteWorkouts.length === 0 ? (
                    <Text style={styles.placeholderText}>No favorite workouts yet.</Text>
                ) : (
                    <ScrollView horizontal={true} style={styles.friendsWorkoutsList} showsHorizontalScrollIndicator={false}>
                        {favoriteWorkouts.map(item => renderWorkoutCarouselItem(item, styles.friendsWorkoutsButton, styles.workoutPreview))}
                    </ScrollView>
                )}
            </View>
        );
    }
    
    function renderFriendsWorkouts() {
        // This section is now only rendered if not searching
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
        const topTwelveWorkouts = trendingWorkouts.slice(0, 12);
        const columnsOfFour = chunkArray(topTwelveWorkouts, 4); // Group into 3 columns of 4 items

        return (
            <View>
                <View style={styles.myWorkoutsHeaderView}>
                    <Text style={styles.workoutsHeaders}>Trending Workouts</Text>
                </View>
                {loadingTrending && topTwelveWorkouts.length === 0 ? (
                    <ActivityIndicator style={styles.listLoadingIndicator} size="small" color="white" />
                ) : topTwelveWorkouts.length === 0 ? (
                    <Text style={styles.placeholderText}>No trending workouts available.</Text>
                ) : (
                    <ScrollView 
                        horizontal={true} 
                        showsHorizontalScrollIndicator={false}
                        style={styles.trendingHorizontalScrollView}
                        contentContainerStyle={styles.trendingHorizontalScrollContent}
                    >
                        {columnsOfFour.map((columnItems, columnIndex) => (
                            <View key={`column-${columnIndex}`} style={styles.trendingColumn}>
                                {columnItems.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.trendingColumnItemCard}
                                        onPress={() => {
                                            router.push(`/view-workout/${item.id}`);
                                            setSearchQuery('');
                                        }}
                                    >
                                        <Image
                                            source={item.coverImageUrl ? { uri: item.coverImageUrl } : require('@/assets/images/default_workout_cover.png')}
                                            style={styles.trendingColumnItemImage}
                                        />
                                        <View style={styles.trendingColumnItemTextContainer}>
                                            <Text style={styles.trendingColumnItemTitle} numberOfLines={1}>{item.title}</Text>
                                            <Text style={styles.trendingColumnItemCreator} numberOfLines={1}>by {item.creatorUsername}</Text>
                                            <Text style={styles.trendingColumnItemSaves} numberOfLines={1}>{item.savedCount || 0} saves</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>
        );
    }
    return (
        <View style={globalStyles.container}>
            <View style={styles.searchBarView}>
                {renderSearchBar()}
            </View>

            {isSearching ? (
                <View style={styles.searchResultsContainer}>
                    {searchResults.length > 0 ? (
                        <FlatList
                            data={searchResults}
                            renderItem={renderSearchResultItem}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.searchResultsList}
                        />
                    ) : (
                        <Text style={styles.placeholderText}>No results found for "{searchQuery}"</Text>
                    )}
                </View>
            ) : (
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
            )}
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
    searchResultsContainer: {
        flex: 1, 
        backgroundColor: 'black', 
    },
    searchResultsList: {
        paddingHorizontal: 10,
        paddingTop: 10,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#2C2C2E',
    },
    searchResultImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: '#333', 
    },
    searchResultTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    searchResultTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    searchResultCreator: {
        color: '#AEAEB2', 
        fontSize: 13,
        marginTop: 2,
    },
    placeholderText: { 
        color: 'grey',
        textAlign: 'center',
        marginVertical: 20,
        marginHorizontal: 10,
        fontSize: 14,
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
    },
    listLoadingIndicator: {
        marginVertical: 20,
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
    },
    createWorkoutButton: {
        backgroundColor: '#ff2d55', 
        borderRadius: 5, 
        width: 140,
        height: 30,
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
    trendingWorkoutsVerticalList: { 
        paddingHorizontal: 10,
    },
    trendingSavedCount: {
        color: '#aaa',
        fontSize: 12,
        marginLeft: 10,
    }, 
    trendingHorizontalScrollView: {
        paddingVertical: 10, 
    },
    trendingHorizontalScrollContent: {
        paddingHorizontal: 15, 
    },
    trendingColumn: {
        width: Dimensions.get('window').width * 0.9, 
        marginRight: 15, 
        borderRadius: 10,
    },
    trendingColumnItemCard: {
        backgroundColor: '#2C2C2E', 
        borderRadius: 12,
        marginBottom: 12, 
        overflow: 'hidden', 
        flexDirection: 'row',
        alignItems: 'center',
        padding: 5,
    },
    trendingColumnItemImage: {
        width: 60, 
        height: 60,
        borderRadius: 8,
        marginRight: 10,
        backgroundColor: '#3A3A3C',
    },
    trendingColumnItemTextContainer: {
        flex: 1, 
        justifyContent: 'center',
    },
    trendingColumnItemTitle: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    trendingColumnItemCreator: {
        color: '#b0b0b0',
        fontSize: 11,
        marginBottom: 3,
    },
    trendingColumnItemSaves: {
        color: '#888888',
        fontSize: 10,
    },
})