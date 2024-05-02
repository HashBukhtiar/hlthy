import React, { useState } from 'react';
import { 
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    TextInput,
    ScrollView,

} from 'react-native';
import globalStyles from '../styles/globalStyles';
import Icon from 'react-native-vector-icons/FontAwesome';

export default function Workouts() {
    const [searchQuery, setSearchQuery] = useState('');

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
                    <TouchableOpacity style={styles.createWorkoutButton}>
                        <Text style={{color: 'white', fontSize: 20}}>+</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal={true} style={styles.myWorkoutsList} contentContainerStyle={{alignItems: 'center'}}>
                    <TouchableOpacity style={styles.myWorkoutsButton}>
                        <View style={styles.workoutPreview}>
                            <Text style={styles.workoutNameText}>My Workout 1</Text>
                            <Text style={styles.workoutAuthorText}>John Doe</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.myWorkoutsButton}>
                        <View style={styles.workoutPreview}>
                            <Text style={styles.workoutNameText}>My Workout 2</Text>
                            <Text style={styles.workoutAuthorText}>John Doe</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.myWorkoutsButton}>
                        <View style={styles.workoutPreview}>
                            <Text style={styles.workoutNameText}>My Workout 3</Text>
                            <Text style={styles.workoutAuthorText}>John Doe</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.myWorkoutsButton}>
                        <View style={styles.workoutPreview}>
                            <Text style={styles.workoutNameText}>My Workout 4</Text>
                            <Text style={styles.workoutAuthorText}>John Doe</Text>
                        </View>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={globalStyles.container}>
            <View style={styles.searchBarView}>
                {renderSearchBar()}
            </View>
            <ScrollView style={styles.workoutsContainer}>
                {renderMyWorkouts()}
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
        borderRadius: 10,
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
        borderWidth: 1,
        borderColor: 'white',
    },
    workoutsHeaders: {
        color: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 30,
        fontWeight: 'bold',
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
        height: 160,
    },
    myWorkoutsButton: {
        width: 140,
        height: 140,
        borderRadius: 25,
        backgroundColor: 'grey',
        marginRight: 10,
        justifyContent: 'flex-end',
    },
    workoutPreview: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(50, 50, 50, 0.5)',
        padding: 5
    },
    workoutNameText: {
        fontWeight: 'bold',
        color: 'white',
    },
    workoutAuthorText: {
        color: 'white',
    }
});