import React, { useState } from 'react';
import { 
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from 'react-native';
import { profileIcon, postImage, backArrow } from '../assets/images';
import globalStyles from '../styles/globalStyles';
import { useNavigation } from '@react-navigation/native';
import { displayShortenedString } from '../logic/formattingFunctions'


export default function Pulse() {
    const [selectedTab, setSelectedTab] = useState('Activity'); // Track which tab is selected (Activity or Milestones)
    const navigation = useNavigation();

    function formatCount(num) {
        if (num >= 1000000) {
            return Math.floor(num / 1000000) + 'M';
        } else if (num >= 1000) {
            return Math.floor(num / 1000) + 'K';
        } else {
            return num;
        }
    }

    const [milestones, setMilestones] = useState([
        {
            username: '@sungjinwoo',
            time: '2m',
            activity: 'Bench Press',
            weight: '225 lbs',
            profileIcon: profileIcon,
            postImage: postImage,
            heartCount: { count: 999, selected: false },
            strongCount: { count: 999999, selected: false },
            fireCount: { count: 0, selected: false }
        },
        {
            username: '@username2',
            time: '5m',
            activity: 'Deadlift',
            weight: '30,000 lbs',
            profileIcon: profileIcon,
            // postImage: postImage,
            heartCount: { count: 0, selected: false },
            strongCount: { count: -1, selected: false },
            fireCount: { count: 0, selected: false }
        },
    ]);

    function renderFollowRequests() {
        const followRequests = [
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
        const activities = [
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

    function handleReactionPress(index, reaction) {
        setMilestones(prevMilestones => {
            const newMilestones = [...prevMilestones];
            const milestone = newMilestones[index];
            milestone[reaction] = {
                count: milestone[reaction].selected ? milestone[reaction].count - 1 : milestone[reaction].count + 1,
                selected: !milestone[reaction].selected
            };
            return newMilestones;
        });
    }

    function renderMilestonesList() {
        return (
            <ScrollView contentContainerStyle={activityStyles.milestonesView}>
                {milestones.map((milestone, index) => (
                    <TouchableOpacity key={index} onPress={() => {console.log("milestone element pressed")}}>
                        <View style={activityStyles.milestonesElement}>
                            <View style={activityStyles.milestonesPFPImage}>
                                <Image source={milestone.profileIcon} style={activityStyles.milestonesPFPStyle} />
                            </View>

                            <View style={activityStyles.milestonesDescription}>
                                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                    <Text style={{fontWeight: 'bold', color: 'white', fontSize: 20, marginLeft: 3}}>{milestone.username}</Text>
                                    <Text style={{fontSize: 12, color: 'gray', marginLeft: 5, marginTop: 4}}> · {milestone.time}</Text>
                                </View>
                                <Text style={{fontSize: 18, marginLeft: 5}}>
                                    <Text style={{color: 'white'}}>{milestone.activity}: </Text> 
                                    <Text style={{color: 'orange'}}>{milestone.weight}</Text>
                                </Text>

                                <View style={activityStyles.reactionButtons}>
                                <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(index, 'heartCount')} style={milestone.heartCount.selected ? activityStyles.reactionButtonClicked : activityStyles.reactionButtonUnclicked}>
                                    <Text style={milestone.heartCount.selected ? activityStyles.reactionTextClicked : activityStyles.reactionTextUnclicked}>❤️ {formatCount(milestone.heartCount.count)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(index, 'strongCount')} style={milestone.strongCount.selected ? activityStyles.reactionButtonClicked : activityStyles.reactionButtonUnclicked}>
                                    <Text style={milestone.strongCount.selected ? activityStyles.reactionTextClicked : activityStyles.reactionTextUnclicked}>💪 {formatCount(milestone.strongCount.count)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(index, 'fireCount')} style={milestone.fireCount.selected ? activityStyles.reactionButtonClicked : activityStyles.reactionButtonUnclicked}>
                                    <Text style={milestone.fireCount.selected ? activityStyles.reactionTextClicked : activityStyles.reactionTextUnclicked}>🔥 {formatCount(milestone.fireCount.count)}</Text>
                                </TouchableOpacity>
                                </View>

                            </View>

                            {milestone.postImage && (
                                <View style={activityStyles.milestonesPostImage}>
                                    <Image source={milestone.postImage} style={activityStyles.milestonesPostStyle} />
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    }

    return (
        <View style={globalStyles.container}>
            <View>
                <View style={{flexDirection:'row', alignItems:'center', marginLeft: 15}}>
                    <TouchableOpacity onPress={() => {
                            console.log("back arrow pressed");
                            navigation.goBack();
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
        borderRadius: 10,
        borderColor: 'grey',
        height: 30,
        marginLeft: 5
    },
    milestonesView: {
        paddingHorizontal: 5,
        marginHorizontal: 15,
        marginBottom: 10,
    },
    milestonesElement: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: '#2e2e2e',
        borderRadius: 30,
        marginVertical: 5,
    },
    milestonesDescription: {
        color: 'white',
        alignItems: 'left',
        width: '100%',
        fontSize: 20,
        flexShrink: 1,
    },
    milestonesPFPImage: {
        justifyContent: 'center',
        marginRight: 5,
        borderRadius: 5,
    },
    milestonesPostImage: {
        justifyContent: 'center',
        marginLeft: 5,
    },
    milestonesPFPStyle: {
        width: 50, 
        height: 50, 
        borderRadius: 25,
        borderWidth: 2,
        borderColor: 'white',
    },
    milestonesPostStyle: {
        width: 50, 
        height: 50, 
        borderRadius: 5,
    },
    timestamp:{
        color: 'grey',
        alignItems: 'center',
        alignSelf: 'flex-end',
    },
    reactionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    reactionButtonUnclicked: {
        padding: 7,
        minWidth: 55,
        minHeight: 34,
        fontSize: 16,
        color: 'white',
        marginHorizontal: 5,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: 'grey',
    },
    reactionButtonClicked: {
        padding: 7,
        minWidth: 55,
        minHeight: 34,
        fontSize: 16,
        backgroundColor: 'white',
        color: 'black',
        marginHorizontal: 5,
        borderRadius: 5,
    },
    reactionTextUnclicked: {
        color: 'white',
    },
    reactionTextClicked: {
        color: 'black',
    },
});