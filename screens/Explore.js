import React, { useState } from 'react';
import { View, 
    TouchableOpacity, 
    ScrollView, 
    Text,
    TextInput,
} from 'react-native';

export default function Explore() {
    const [searchQuery, setSearchQuery] = useState('');
    const renderSearchBar = () => {
        return (
            <View style={exploreStyles.searchBarView}>
                <TextInput 
                    placeholder="Search hlthy..." 
                    style={exploreStyles.searchBar}
                    onChangeText={(text) => {setSearchQuery(text)}}
                    value={searchQuery}
                    placeholderTextColor="grey"
                />
            </View>
        );
    }

    return(
        <View style={exploreStyles.explorePage}>
            {renderSearchBar()}
            <ScrollView contentContainerStyle={exploreStyles.pageContent}>
                <Text style={{color:'white'}}>Explore</Text>
            </ScrollView>
        </View>
    );
}

const exploreStyles = {
    explorePage: {
        flex: 1,
        backgroundColor: 'black',
        borderWidth: 1,
        borderColor: 'blue',
    },
    searchBarView: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'white',
    },
    searchBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#2e2e2e',
        width: '95%',
        height: 40,
        borderRadius: 20,
        marginTop: 10,
        marginBottom: 10,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: 'white',
    },
    pageContent: {
        flex: 1,
        width: '100%',
        backgroundColor: 'black',
        alignItems: 'center',
        justifyContent: 'center',
    },
}