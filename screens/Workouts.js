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
        borderWidth: 1,
        borderColor: 'white',
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
    }
});