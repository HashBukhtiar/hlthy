import React, { useState } from 'react';
import { View, 
    TouchableOpacity, 
    Image, 
    Text,
    TextInput,
} from 'react-native';

export default function Explore() {
    const [searchQuery, setSearchQuery] = useState('');
    const renderSearchBar = () => {
        return (
            <View style={exploreStyles.searchBar}>
                <TextInput 
                    placeholder="Search hlthy..." 
                    style={{flex: 1, color: 'white'}}
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
            <Text>Explore</Text>
        </View>
    );
}

const exploreStyles = {
    explorePage: {
        flex: 1,
        backgroundColor: 'black',
        alignItems: 'center',
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
    },
}