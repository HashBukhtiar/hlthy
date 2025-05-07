import React, { useState } from 'react';
import { 
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/globalStyles';
import Icon from 'react-native-vector-icons/FontAwesome';
import { BlurView } from 'expo-blur';

export default function Workouts() {
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

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

    function renderMyWorkouts() {
        return (
            <View>
                <View style={styles.myWorkoutsHeaderView}>
                    <Text style={styles.workoutsHeaders}>My Workouts</Text>
                    <TouchableOpacity 
                        style={styles.createWorkoutButton}
                        onPress={() => {
                            console.log("Create Workout pressed");
                            router.push('/create-workout');
                        }}
                    >
                        <Text style={{
                            color: 'black', fontWeight: 'bold', fontSize: 23}}>+</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal={true} style={styles.myWorkoutsList} contentContainerStyle={{alignItems: 'center'}} showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity 
                        style={styles.myWorkoutsButton}
                        onPress={() => {
                            console.log("Workout pressed");
                            router.push('/view-workout/1'); // Ensure this route exists
                        }}
                    >
                        <Image 
                            source={{ uri: 'https://ca.gymshark.com/_next/image?url=https%3A%2F%2Fimages.ctfassets.net%2F8urtyqugdt2l%2FfIOvOyiWNuyVnlhs7LnFt%2F9d2b2df51fdce86e93c0d1b0d28afc1e%2Fdesktop-cbum-back-workout.jpg&w=3840&q=85' }}
                            style={StyleSheet.absoluteFill}
                        />
                        <BlurView intensity={100} tint="dark" style={styles.myWorkoutPreview}>
                            <Text style={styles.workoutNameText}>My Workout 1</Text>
                            <Text style={styles.workoutAuthorText}>John Doe</Text>
                        </BlurView>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.myWorkoutsButton}
                        onPress={() => {
                            console.log("Workout pressed");
                            router.push('/view-workout/2');
                        }}
                    >
                        <BlurView intensity={80} tint="dark" style={styles.myWorkoutPreview}>
                            <Text style={styles.workoutNameText}>My Workout 2</Text>
                            <Text style={styles.workoutAuthorText}>John Doe</Text>
                        </BlurView>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.myWorkoutsButton}
                        onPress={() => {
                            console.log("Workout pressed");
                            router.push('/view-workout/3');
                        }}
                    >
                        <BlurView intensity={80} tint="dark" style={styles.myWorkoutPreview}>
                            <Text style={styles.workoutNameText}>My Workout 3</Text>
                            <Text style={styles.workoutAuthorText}>John Pork</Text>
                        </BlurView>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    function renderFavoriteWorkouts() {
        return (
            <View>
                <View style={styles.myWorkoutsHeaderView}>
                    <Text style={styles.workoutsHeaders}>Favourite Workouts</Text>
                </View>
                <ScrollView horizontal={true} style={styles.friendsWorkoutsList} contentContainerStyle={{alignItems: 'center'}} showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity 
                        style={styles.friendsWorkoutsButton}
                        onPress={() => {
                            console.log("Workout pressed");
                            router.push('/view-workout/5'); // Ensure this route exists
                        }}
                    >
                        <BlurView intensity={80} tint="dark" style={styles.workoutPreview}>
                            <Text style={styles.workoutNameText}>Fav Workout 1</Text>
                            <Text style={styles.workoutAuthorText}>Jane Doe</Text>
                        </BlurView>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.friendsWorkoutsButton}
                        onPress={() => {
                            console.log("Workout pressed");
                            router.push('/view-workout/6');
                        }}
                    >
                        <BlurView intensity={80} tint="dark" style={styles.workoutPreview}>
                            <Text style={styles.workoutNameText}>Fav Workout 2</Text>
                            <Text style={styles.workoutAuthorText}>John Doe</Text>
                        </BlurView>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.friendsWorkoutsButton}
                        onPress={() => {
                            console.log("Workout pressed");
                            router.push('/view-workout/7');
                        }}
                    >
                        <BlurView intensity={80} tint="dark" style={styles.workoutPreview}>
                            <Text style={styles.workoutNameText}>Fav Workout 3</Text>
                            <Text style={styles.workoutAuthorText}>Tim Cheese</Text>
                        </BlurView>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    function renderFriendsWorkouts() {
        return (
            <View>
                <View style={styles.myWorkoutsHeaderView}>
                    <Text style={styles.workoutsHeaders}>Friends' Workouts</Text>
                </View>
                <ScrollView horizontal={true} style={styles.friendsWorkoutsList} contentContainerStyle={{alignItems: 'center'}} showsHorizontalScrollIndicator={false}>
                    <TouchableOpacity 
                        style={styles.friendsWorkoutsButton}
                        onPress={() => {
                            console.log("Workout pressed");
                            router.push('/view-workout/9'); // Ensure this route exists
                        }}
                    >
                        <BlurView intensity={80} tint="dark" style={styles.workoutPreview}>
                            <Text style={styles.workoutNameText}>Friend Workout 1</Text>
                            <Text style={styles.workoutAuthorText}>Jane Doe</Text>
                        </BlurView>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.friendsWorkoutsButton}
                        onPress={() => {
                            console.log("Workout pressed");
                            router.push('/view-workout/10');
                        }}
                    >
                        <BlurView intensity={80} tint="dark" style={styles.workoutPreview}>
                            <Text style={styles.workoutNameText}>Friend Workout 2</Text>
                            <Text style={styles.workoutAuthorText}>Bob Smith</Text>
                        </BlurView>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.friendsWorkoutsButton}
                        onPress={() => {
                            console.log("Workout pressed");
                            router.push('/view-workout/11');
                        }}
                    >
                        <BlurView intensity={80} tint="dark" style={styles.workoutPreview}>
                            <Text style={styles.workoutNameText}>Friend Workout 3</Text>
                            <Text style={styles.workoutAuthorText}>Kibutsuji Muzan</Text>
                        </BlurView>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    function renderTrendingWorkouts() {
        return (
            <View>
                <View style={styles.myWorkoutsHeaderView}>
                    <Text style={styles.workoutsHeaders}>Trending Workouts</Text>
                </View>
                <ScrollView horizontal={true} style={styles.trendingWorkoutsList} contentContainerStyle={{alignItems: 'center'}} showsHorizontalScrollIndicator={false}>
                    <View style={styles.trendingWorkouts4Group}>
                        <TouchableOpacity 
                                style={styles.trendingWorkoutsButton}
                                onPress={() => {
                                    console.log("Workout pressed");
                                    router.push('/view-workout/13');
                                }}
                            >
                            <View style={styles.trendingWorkoutsIcon}></View>
                            <View style={styles.trendingWorkoutsTextView}>
                                <Text style={[styles.trendingWorkoutsText, {fontWeight: 'bold'}]}>Golf Workout</Text>
                                <Text style={[styles.trendingWorkoutsText, {color: '#D0D0D0'}]}>Matt Martel</Text>
                            </View>
                            <TouchableOpacity style={styles.trendingWorkoutsMoreButton}>
                                <Icon name="ellipsis-h" size={20} color="white" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                        <TouchableOpacity 
                                style={styles.trendingWorkoutsButton}
                                onPress={() => {
                                    console.log("Workout pressed");
                                    router.push('/view-workout/14');
                                }}
                            >
                            <View style={styles.trendingWorkoutsIcon}></View>
                            <View style={styles.trendingWorkoutsTextView}>
                                <Text style={[styles.trendingWorkoutsText, {fontWeight: 'bold'}]}>Sock Workout</Text>
                                <Text style={[styles.trendingWorkoutsText, {color: '#D0D0D0'}]}>Matt Martel</Text>
                            </View>
                            <TouchableOpacity style={styles.trendingWorkoutsMoreButton}>
                                <Icon name="ellipsis-h" size={20} color="white" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                        <TouchableOpacity 
                                style={styles.trendingWorkoutsButton}
                                onPress={() => {
                                    console.log("Workout pressed");
                                    router.push('/view-workout/15');
                                }}
                            >
                            <View style={styles.trendingWorkoutsIcon}></View>
                            <View style={styles.trendingWorkoutsTextView}>
                                <Text style={[styles.trendingWorkoutsText, {fontWeight: 'bold'}]}>Push Day Torture</Text>
                                <Text style={[styles.trendingWorkoutsText, {color: '#D0D0D0'}]}>Matt Martel</Text>
                            </View>
                            <TouchableOpacity style={styles.trendingWorkoutsMoreButton}>
                                <Icon name="ellipsis-h" size={20} color="white" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                        <TouchableOpacity 
                                style={styles.trendingWorkoutsButton}
                                onPress={() => {
                                    console.log("Workout pressed");
                                    router.push('/view-workout/16');
                                }}
                            >
                            <View style={styles.trendingWorkoutsIcon}></View>
                            <View style={styles.trendingWorkoutsTextView}>
                                <Text style={[styles.trendingWorkoutsText, {fontWeight: 'bold'}]}>Basketball Workout</Text>
                                <Text style={[styles.trendingWorkoutsText, {color: '#D0D0D0'}]}>Matt Martel</Text>
                            </View>
                            <TouchableOpacity style={styles.trendingWorkoutsMoreButton}>
                                <Icon name="ellipsis-h" size={20} color="white" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.trendingWorkouts4Group}>
                    <TouchableOpacity 
                                style={styles.trendingWorkoutsButton}
                                onPress={() => {
                                    console.log("Workout pressed");
                                    router.push('/view-workout/17');
                                }}
                            >
                            <View style={styles.trendingWorkoutsIcon}></View>
                            <View style={styles.trendingWorkoutsTextView}>
                                <Text style={[styles.trendingWorkoutsText, {fontWeight: 'bold'}]}>Golf Workout</Text>
                                <Text style={[styles.trendingWorkoutsText, {color: '#D0D0D0'}]}>Matt Martel</Text>
                            </View>
                            <TouchableOpacity style={styles.trendingWorkoutsMoreButton}>
                                <Icon name="ellipsis-h" size={20} color="white" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                        <TouchableOpacity 
                                style={styles.trendingWorkoutsButton}
                                onPress={() => {
                                    console.log("Workout pressed");
                                    router.push('/view-workout/18');
                                }}
                            >
                            <View style={styles.trendingWorkoutsIcon}></View>
                            <View style={styles.trendingWorkoutsTextView}>
                                <Text style={[styles.trendingWorkoutsText, {fontWeight: 'bold'}]}>Sock Workout</Text>
                                <Text style={[styles.trendingWorkoutsText, {color: '#D0D0D0'}]}>Matt Martel</Text>
                            </View>
                            <TouchableOpacity style={styles.trendingWorkoutsMoreButton}>
                                <Icon name="ellipsis-h" size={20} color="white" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                        <TouchableOpacity 
                                style={styles.trendingWorkoutsButton}
                                onPress={() => {
                                    console.log("Workout pressed");
                                    router.push('/view-workout/19');
                                }}
                            >
                            <View style={styles.trendingWorkoutsIcon}></View>
                            <View style={styles.trendingWorkoutsTextView}>
                                <Text style={[styles.trendingWorkoutsText, {fontWeight: 'bold'}]}>Push Day Torture</Text>
                                <Text style={[styles.trendingWorkoutsText, {color: '#D0D0D0'}]}>Matt Martel</Text>
                            </View>
                            <TouchableOpacity style={styles.trendingWorkoutsMoreButton}>
                                <Icon name="ellipsis-h" size={20} color="white" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                        <TouchableOpacity 
                                style={styles.trendingWorkoutsButton}
                                onPress={() => {
                                    console.log("Workout pressed");
                                    router.push('/view-workout/20');
                                }}
                            >
                            <View style={styles.trendingWorkoutsIcon}></View>
                            <View style={styles.trendingWorkoutsTextView}>
                                <Text style={[styles.trendingWorkoutsText, {fontWeight: 'bold'}]}>Basketball Workout</Text>
                                <Text style={[styles.trendingWorkoutsText, {color: '#D0D0D0'}]}>Matt Martel</Text>
                            </View>
                            <TouchableOpacity style={styles.trendingWorkoutsMoreButton}>
                                <Icon name="ellipsis-h" size={20} color="white" />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
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
                showsVerticalScrollIndicator={false}>
                {renderMyWorkouts()}
                {renderFavoriteWorkouts()}
                {renderFriendsWorkouts()}
                {renderTrendingWorkouts()}
            </ScrollView>
        </View>
    )
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 30,
        fontWeight: 'bold',
        marginTop: 20,
    },
    myWorkoutsHeaderView: {
        flexDirection: 'row',
        padding: 10,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    createWorkoutButton: {
        backgroundColor: 'pink',
        borderRadius: 50,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    myWorkoutsList: {
        flexDirection: 'row',
        padding: 10,
        height: 210,
    },
    myWorkoutsButton: {
        overflow: 'hidden',
        width: 200,
        height: 200,
        borderRadius: 35,
        backgroundColor: 'grey',
        marginRight: 10,
        justifyContent: 'flex-end',
    },
    friendsWorkoutsList: {
        flexDirection: 'row',
        padding: 10,
        height: 160,
    },
    friendsWorkoutsButton: {
        overflow: 'hidden',
        width: 140,
        height: 140,
        borderRadius: 25,
        backgroundColor: 'grey',
        marginRight: 10,
        justifyContent: 'flex-end',
    },
    trendingWorkoutsList: {
        flexDirection: 'row',
        padding: 5,
        height: 220,
    },
    trendingWorkouts4Group: {
        flexDirection: 'column',
        width: Dimensions.get('window').width * 0.95,
        marginTop: 10,
        marginBottom: 10,
        alignItems: 'center'
    },  
    trendingWorkoutsButton: {
        flexDirection: 'row',
        width: '95%',
        paddingVertical: 5,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'grey',
    },
    trendingWorkoutsIcon: {
        width: 40,
        height: 40,
        borderRadius: 5,
        backgroundColor: 'grey',
    },
    trendingWorkoutsTextView: {
        justifyContent: 'center',
        alignItems: 'flex-start',
        flex: 1,
        paddingLeft: 5,
    },
    trendingWorkoutsText: {
        color: 'white',
    },
    trendingWorkoutsMoreButton: {
        justifyContent: 'center',
        paddingLeft: 10,
    },
    myWorkoutPreview: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    workoutPreview: {
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 5,
    },
    workoutNameText: {
        fontWeight: 'bold',
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
    },
    workoutAuthorText: {
        color: '#D0D0D0',
        fontSize: 12,
        textAlign: 'center',
    }
});