import React, { useState, useEffect, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/context/AuthContext';
import { getCoverImageSource } from '@/utils/imageUtils';
import { icon } from '@/assets/images';
import { ACCENT_COLOR } from '@/constants/Colors';
import { useWorkoutList } from '@/features/workouts/ui/useWorkoutList';
import { WorkoutListItem } from '@/features/workouts/domain/WorkoutListItem';

const chunkArray = (array: WorkoutListItem[], size: number): WorkoutListItem[][] => {
  const chunkedArr: WorkoutListItem[][] = [];
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
    const { currentUser, userProfile } = useAuth();

    const {
        myWorkouts,
        favoriteWorkouts,
        followingWorkouts,
        trendingWorkouts,
        loadingMyWorkouts,
        loadingFavorites,
        loadingFollowingWorkouts,
        loadingTrending,
        refreshing,
        refresh,
    } = useWorkoutList();

    const [searchResults, setSearchResults] = useState<WorkoutListItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const suggestedWorkouts = useMemo(() => {
        // Combine following + trending into a deduplicated pool
        const seen = new Set<string>();
        const pool: WorkoutListItem[] = [];
        [...followingWorkouts, ...trendingWorkouts].forEach(w => {
            if (!seen.has(w.id)) {
                seen.add(w.id);
                pool.push(w);
            }
        });

        // Exclude workouts the user already owns or has saved
        const myIds = new Set(myWorkouts.map(w => w.id));
        const favIds = new Set(favoriteWorkouts.map(w => w.id));
        const filtered = pool.filter(w => !myIds.has(w.id) && !favIds.has(w.id));

        // Rank: archetype match first, then by save count
        const userArchetype = userProfile?.archetype?.toLowerCase();
        return filtered
            .sort((a, b) => {
                const aMatch = userArchetype && (a as any).archetype?.toLowerCase() === userArchetype ? 1 : 0;
                const bMatch = userArchetype && (b as any).archetype?.toLowerCase() === userArchetype ? 1 : 0;
                if (bMatch !== aMatch) return bMatch - aMatch;
                return (b.savedCount || 0) - (a.savedCount || 0);
            })
            .slice(0, 10);
    }, [myWorkouts, favoriteWorkouts, trendingWorkouts, followingWorkouts, userProfile?.archetype]);

    // Client-side search filter over the in-memory data — no Firestore queries.
    useEffect(() => {
        const lowerCaseQuery = searchQuery.toLowerCase().trim();

        if (!lowerCaseQuery) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);

        const allWorkoutsMap = new Map<string, WorkoutListItem>();
        myWorkouts.forEach(w => allWorkoutsMap.set(w.id, w));
        favoriteWorkouts.forEach(w => allWorkoutsMap.set(w.id, w));
        trendingWorkouts.forEach(w => allWorkoutsMap.set(w.id, w));

        const filtered = Array.from(allWorkoutsMap.values()).filter(
            w =>
                w.title.toLowerCase().includes(lowerCaseQuery) ||
                w.creatorUsername.toLowerCase().includes(lowerCaseQuery)
        );
        setSearchResults(filtered);
    }, [searchQuery, myWorkouts, favoriteWorkouts, trendingWorkouts]);

    const onRefresh = () => {
        setSearchQuery('');
        refresh();
    };

    function renderSearchBar() {
        return (
            <View style={styles.searchBarContainer}>
                <Ionicons name="search" size={24} color="grey" />
                <TextInput
                    style={styles.searchBar}
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    placeholder="Search Workouts by Title or Creator..."
                    placeholderTextColor="grey"
                />
                {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color="grey" />
                    </TouchableOpacity>
                ) : null}
            </View>
        );
    }

    const renderWorkoutCarouselItem = (item: WorkoutListItem, itemStyle: any, blurStyle: any) => {
        const hasCover = Boolean(item.thumbnailUrl?.trim() || item.coverImageUrl?.trim());

        return (
            <TouchableOpacity
                key={item.id}
                style={itemStyle}
                onPress={() => {
                    router.push(`/view-workout/${item.id}`);
                    setSearchQuery('');
                }}
            >
                {hasCover ? (
                    <>
                        <Image
                            source={getCoverImageSource(item.thumbnailUrl, item.coverImageUrl)}
                            style={[StyleSheet.absoluteFill, { backgroundColor: '#333', resizeMode: 'cover' }]}
                        />
                        <BlurView intensity={25} tint="dark" style={blurStyle}>
                            <Text style={styles.workoutNameText} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.workoutAuthorText} numberOfLines={1}>by {item.creatorUsername}</Text>
                        </BlurView>
                    </>
                ) : (
                    <>
                        <View style={[StyleSheet.absoluteFill, {
                            backgroundColor: '#222',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }]}>
                            <Image
                                source={icon}
                                style={{ width: '60%', height: '60%', resizeMode: 'contain' }}
                            />
                        </View>
                        <View style={blurStyle}>
                            <Text style={styles.workoutNameText} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.workoutAuthorText} numberOfLines={1}>by {item.creatorUsername}</Text>
                        </View>
                    </>
                )}
            </TouchableOpacity>
        );
    };

    const renderSearchResultItem = ({ item }: { item: WorkoutListItem }) => (
        <TouchableOpacity
            style={styles.searchResultItem}
            onPress={() => {
                router.push(`/view-workout/${item.id}`);
                setSearchQuery('');
            }}
        >
            <Image
                source={getCoverImageSource(item.thumbnailUrl, item.coverImageUrl)}
                style={styles.searchResultImage}
            />
            <View style={styles.searchResultTextContainer}>
                <Text style={styles.searchResultTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.searchResultCreator} numberOfLines={1}>by {item.creatorUsername}</Text>
            </View>
        </TouchableOpacity>
    );

    function renderMyWorkouts() {
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
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.myWorkoutsList}>
                        {myWorkouts.map(item => renderWorkoutCarouselItem(item, styles.myWorkoutsButton, styles.myWorkoutPreview))}
                    </ScrollView>
                )}
            </View>
        );
    }

    function renderFavoriteWorkouts() {
        if (!currentUser) {
            return <Text style={styles.placeholderText}>Login to see your favorite workouts.</Text>;
        }
        return (
            <View>
                <TouchableOpacity style={styles.myWorkoutsHeaderView} onPress={() => router.push('/favorite-workouts')}>
                    <Text style={styles.workoutsHeaders}>Favourite Workouts</Text>
                    <Ionicons name="chevron-forward-outline" size={24} color="grey" />
                </TouchableOpacity>
                {loadingFavorites && favoriteWorkouts.length === 0 ? (
                    <ActivityIndicator style={styles.listLoadingIndicator} size="small" color="white" />
                ) : favoriteWorkouts.length === 0 ? (
                    <Text style={styles.placeholderText}>No favorite workouts yet.</Text>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.followingWorkoutsList}>
                        {favoriteWorkouts.map(item => renderWorkoutCarouselItem(item, styles.followingWorkoutsButton, styles.workoutPreview))}
                    </ScrollView>
                )}
            </View>
        );
    }

    function renderFollowingWorkouts() {
        if (!currentUser) {
            return <Text style={styles.placeholderText}>Login to see workouts from people you follow.</Text>;
        }
        return (
            <View>
                <TouchableOpacity style={styles.myWorkoutsHeaderView} onPress={() => router.push('/following-workouts')}>
                    <Text style={styles.workoutsHeaders}>Workouts By People You Follow</Text>
                    <Ionicons name="chevron-forward-outline" size={24} color="grey" />
                </TouchableOpacity>
                {loadingFollowingWorkouts && followingWorkouts.length === 0 ? (
                    <ActivityIndicator style={styles.listLoadingIndicator} size="small" color="white" />
                ) : followingWorkouts.length === 0 ? (
                    <Text style={styles.placeholderText}>No workouts from people you follow yet.</Text>
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.followingWorkoutsList}>
                        {followingWorkouts.map(item => renderWorkoutCarouselItem(item, styles.followingWorkoutsButton, styles.workoutPreview))}
                    </ScrollView>
                )}
            </View>
        );
    }

    function renderSuggestedWorkouts() {
        if (!currentUser || suggestedWorkouts.length === 0) return null;
        return (
            <View>
                <View style={styles.myWorkoutsHeaderView}>
                    <Text style={styles.workoutsHeaders}>Suggested For You</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.followingWorkoutsList}>
                    {suggestedWorkouts.map(item => renderWorkoutCarouselItem(item, styles.followingWorkoutsButton, styles.workoutPreview))}
                </ScrollView>
            </View>
        );
    }

    function renderTrendingWorkouts() {
        const topTwelveWorkouts = trendingWorkouts.slice(0, 12);
        const columnsOfFour = chunkArray(topTwelveWorkouts, 4);

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
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.trendingHorizontalScrollView}
                        contentContainerStyle={styles.trendingHorizontalScrollContent}
                    >
                        {columnsOfFour.map((columnItems, columnIndex) => (
                            <View key={`column-${columnIndex}`} style={styles.trendingColumn}>
                                {columnItems.map(item => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={styles.trendingColumnItemCard}
                                        onPress={() => {
                                            router.push(`/view-workout/${item.id}`);
                                            setSearchQuery('');
                                        }}
                                    >
                                        <Image
                                            source={getCoverImageSource(item.thumbnailUrl, item.coverImageUrl)}
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
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="white" />
                    }
                >
                    {renderMyWorkouts()}
                    {renderFavoriteWorkouts()}
                    {renderFollowingWorkouts()}
                    {renderSuggestedWorkouts()}
                    {renderTrendingWorkouts()}
                    <View style={{ height: 30 }} />
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
        backgroundColor: ACCENT_COLOR,
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
    followingWorkoutsList: {
        paddingLeft: 15,
        paddingRight: 5,
        height: 170,
    },
    followingWorkoutsButton: {
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
});
