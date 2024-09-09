import React, { useState } from 'react';
import { View, 
    TouchableOpacity, 
    ScrollView, 
    Text,
    TextInput,
    Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { cameraRollIcon } from '../assets/images';

export default function Post() {
    const navigation = useNavigation();
    return (
        <View style={postStyles.postPage}>
            <View style={postStyles.header}>
                <TouchableOpacity style={postStyles.button} onPress={() => {
                        console.log("back arrow pressed");
                        navigation.goBack();
                    }}>
                    <Text style={postStyles.buttonText} >Back</Text>
                </TouchableOpacity>
                <Text style={postStyles.postTitle}>Create Post</Text>
                <TouchableOpacity style={postStyles.button} onPress={() => {
                        console.log("POST button pressed");;
                    }}>
                    <Text style={postStyles.buttonText}>Post</Text>
                </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={postStyles.postPageScroll}>
                <View style={postStyles.photoOptionsView}>
                    <TouchableOpacity style={postStyles.cameraButton}>
                        <Text style={postStyles.postButtonText}>Open Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={postStyles.cameraRollButton}>
                        <Image source={cameraRollIcon} style={{ width: 55, height: 55 }}/>
                    </TouchableOpacity>
                </View>
                <Text style={postStyles.postText}>image preview below</Text>
            </ScrollView>
        </View>
    );
};

const postStyles = ({
    postPage: {
        flex: 1,
        backgroundColor: 'black'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'white'
    },
    button: {
        padding: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
    },
    postTitle: {
        fontSize: 34,
        fontWeight: 'bold',
        color: 'white',
    },
    postText: {
        color: 'white',
    },
    postPageScroll: {
        padding: 10,
        borderBottomWidth: 1,
        borderColor: 'white'
    },
    photoOptionsView: {
        flexDirection: 'row'
    },
    cameraButton: {
        backgroundColor: 'white',
        borderRadius: 50,
        fontFamily: 'System',
        fontWeight: 'bold',
        paddingHorizontal: 20,
        paddingVertical: 10,
        width: '80%',
        alignItems: 'center',
        marginRight: 20
    },
    cameraRollButton: {
        backgroundColor: 'white',
        borderRadius: 30,
        fontFamily: 'System',
        fontWeight: 'bold',
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10
    },
    postButtonText: {
        fontSize: 30,
        color: 'black'
    }
});