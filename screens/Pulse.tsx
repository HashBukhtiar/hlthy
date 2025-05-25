import React, { useState } from 'react';
import { 
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { profileIcon, postImage, backArrow } from '@/assets/images';
import globalStyles from '@/styles/globalStyles';
import { useRouter } from 'expo-router';

// Helper function to display shortened string
const displayShortenedString = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
};

interface FollowRequest {
    username: string;
    time: string;
}

interface Activity {
    username: string;
    action: string;
    time: string;
    image: any; 
}

export default function Pulse() {
    const router = useRouter();

    function renderFollowRequests() {
        const followRequests: FollowRequest[] = [
            {
                username: 'skibidisigmafanumtaxohiogyatt',
                time: '46s'
            },
            {
                username: 'rizzlord80',
                time: '2h'
            },
            {
                username: 'test3',
                time: '5h'
            },
        ];

        let maxUsernameLength = 12;

    return (
        <View>
            <Text style={[globalStyles.subtitle, {marginLeft: 15, marginVertical: 20, fontWeight: 'bold', fontSize: 30}]}>Follow Requests</Text>
            <View style={activityStyles.activityView}>
                {followRequests.map((request, index) => (
                    <TouchableOpacity key={index} style={[activityStyles.activityElement, index !== followRequests.length - 1 && {borderBottomWidth: 1, borderBottomColor: 'grey'}]}>
                        <View style={activityStyles.activityPostImage}>
                            <Image source={profileIcon} style={activityStyles.activityImageStyle} />
                        </View>
                        <View style={{flex:1}}>
                            <Text style={activityStyles.activityDescription}>
                                <Text style={{fontWeight: 'bold'}}>@{displayShortenedString(request.username, maxUsernameLength)}</Text>
                                <Text style={{color:'grey'}}> · {request.time}</Text>
                            </Text>
                        </View>
                        <TouchableOpacity style={activityStyles.acceptButton}>
                            <Text style={{color: 'black'}}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={activityStyles.ignoreButton}>
                            <Text style={{color: 'white'}}>Ignore</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
    }

    function renderOtherActivity() {
        const activities: Activity[] = [
            {
                username: '@username2',
                action: 'has requested to follow you.',
                time: '20s',
                image: profileIcon
            },
            {
                username: '@username3',
                action: 'has reacted to your post with 🔥.',
                time: '2m',
                image: postImage
            },
            {
                username: '@username4',
                action: 'has reacted to your post with 🔥.',
                time: '2m',
                image: postImage
            },
            {
                username: '@username5',
                action: 'has requested to follow you.',
                time: '5m',
                image: profileIcon
            },
            {
                username: '@username6',
                action: 'has requested to follow you.',
                time: '6h',
                image: profileIcon
            },
        ];

        return (
            <View>
                <Text style={[globalStyles.subtitle, {marginLeft: 15, marginVertical: 20, fontWeight: 'bold', fontSize: 30}]}>Other Activity</Text>
                <View style={activityStyles.activityView}>
                    {activities.map((activity, index) => (
                        <TouchableOpacity key={index} onPress={() => {console.log("activity element pressed")}}>
                            <View style={[activityStyles.activityElement, index !== activities.length - 1 && {borderBottomWidth: 1, borderBottomColor: 'grey'}]}>
                                <View style={activityStyles.activityPostImage}>
                                    <Image source={activity.image} style={activityStyles.activityImageStyle} />
                                </View>
                                <View style={{flex:1}}>
                                    <Text style={activityStyles.activityDescription}>
                                        <Text style={{fontWeight: 'bold'}}>{activity.username}</Text> {activity.action}<Text style={{color:'grey'}}> {activity.time}</Text>
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    }

    function renderActivity() {
        return (
            <ScrollView>
                {renderFollowRequests()}
                {renderOtherActivity()}
            </ScrollView>
        );
    }

    return (
        <View style={globalStyles.container}>
            <View>
                <View style={{flexDirection:'row', alignItems:'center', marginLeft: 15}}>
                    <TouchableOpacity onPress={() => {
                            console.log("back arrow pressed");
                            router.back();
                            }}>
                        <Image source={backArrow} style={globalStyles.backArrowIcon} />
                    </TouchableOpacity>
                    <Text style={[globalStyles.title, {marginLeft: 10}]}>Pulse</Text>
                </View>
            </View>
            <View style={{flex:1}}>
                {renderActivity()}
            </View>
        </View>
    );
}

const activityStyles = StyleSheet.create({
    activityView: {
        paddingHorizontal: 5,
        marginHorizontal: 15,
        marginBottom: 10,
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: '#2e2e2e',
        borderRadius: 35,
    },
    activityElement: {
        paddingVertical: 10,
        paddingHorizontal: 5,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    activityPostImage: {
        marginRight: 10,
    },
    activityImageStyle: {
        width: 50, 
        height: 50, 
        borderRadius: 25,
        borderWidth: 2,
        borderColor: 'white',
    },
    activityDescription: {
        color: 'white',
        alignItems: 'center',
        width: '100%',
        fontSize: 16,
        flexShrink: 1,
    },
    acceptButton: {
        paddingHorizontal: 8,
        backgroundColor: '#ebebeb',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 5,
        borderRadius: 10,
        height: 30,
        marginRight: 5,
    },
    ignoreButton: {
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'grey',
        height: 30,
        marginLeft: 5
    },
});