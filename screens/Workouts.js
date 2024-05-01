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

export default function Workouts() {
    const [searchQuery, setSearchQuery] = useState('');

    function renderSearchBar() {
        return (
            <TextInput
                style={styles.searchBar}
                onChangeText={(text) => {setSearchQuery(text)}}
                value={searchQuery}
                placeholder="Search workouts"
                placeholderTextColor="grey"
            />
        );
    }

    return (
        <View style={globalStyles.container}>
            <View style={styles.searchBarView}>
                {renderSearchBar()}
            </View>
            <ScrollView style={styles.workoutsContainer}>
                <Text style={{color: 'white'}}>workouts</Text>
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
    searchBar: {
        height: 40,
        backgroundColor: '#2e2e2e',
        borderRadius: 10,
        color: 'white',
        width: '95%',
        borderWidth: 1,
        paddingLeft: 10,
    },
    workoutsContainer: {
        flex: 1,
        borderWidth: 1,
        borderColor: 'white',
    }
});