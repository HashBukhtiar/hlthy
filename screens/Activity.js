import React, { useState } from 'react';
import { 
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView
} from 'react-native';
import { profileIcon, postImage } from '../assets/images';
import globalStyles from '../styles/globalStyles';
import { renderBottomButtons } from './HomeFeed';

export default function Activity() {
    const [activities, setActivities] = useState([]);
    const [selectedTab, setSelectedTab] = useState('Activity'); // Track which tab is selected (Activity or Milestones)

    // Add new activity
    const addActivity = (activity) => {
        setActivities(prevActivities => [...prevActivities, activity]);
    }

    function selectActivity() {
        console.log("Activity pressed");
        setSelectedTab('Activity');
    }

    function selectMilestones() {
        console.log("Milestones pressed");
        setSelectedTab('Milestones');
    }

    return (
        <View style={globalStyles.container}>
            <View>
                {renderHeaderButtons()}
            </View>
            <ScrollView contentContainerStyle={activityStyles.activityListContainer}>
                {/*
                {activities.map((activity, index) => (
                    <Text key={index}>{activity}</Text>
                ))}
                */}
                <View style={activityStyles.activityElement}>
                    <View style={activityStyles.activityPostImage}>
                        <Image source={profileIcon} style={activityStyles.postImageStyle} />
                    </View>
                    <View>
                        <Text style={activityStyles.activityDescription}>
                            <Text style={{fontWeight: 'bold'}}>@username1</Text> has requested to follow you.
                        </Text>
                    </View>
                    <View style={activityStyles.timestamp}>
                        <Text style={{color: 'grey'}}>20s</Text>
                    </View>
                </View>
            </ScrollView>
            <View styles={globalStyles.bottomButtonContainer}>
                {renderBottomButtons()}
            </View>
        </View>
    );

    function renderHeaderButtons() {
        return (
            <View style={activityStyles.tabHeaderButtonsContainer}>
                <TouchableOpacity activeOpacity={1} style={activityStyles.tabHeaderButton} onPress={() => selectActivity()}>
                    <Text style={selectedTab === 'Activity' ? activityStyles.selectedTabHeader : activityStyles.unselectedTabHeader}>Activity</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={1} style={activityStyles.tabHeaderButton} onPress={() => selectMilestones()}>
                    <Text style={selectedTab === 'Milestones' ? activityStyles.selectedTabHeader : activityStyles.unselectedTabHeader}>Milestones</Text>
                </TouchableOpacity>
            </View>
        );
    }
}

const activityStyles = StyleSheet.create({
    tabHeaderButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 5,
    },
    tabHeaderButton: {
        padding: 5,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedTabHeader: {
        fontSize: 20,
        color: 'white',
        fontFamily: 'System',
        paddingHorizontal: 10,
    },
    unselectedTabHeader: {
        fontSize: 20,
        color: 'grey',
        fontFamily: 'System',
        paddingHorizontal: 10,
    },
    activityListContainer: {
        flex: 1,
        borderWidth: 1, 
        padding: 5,
        borderColor: 'white',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    activityElement: {
        borderTopWidth: 1,
        borderColor: 'grey',
        padding: 5,
        flexDirection: 'row',
        width: '100%',
    },
    activityPostImage: {
        marginRight: 10,
    },
    postImageStyle: {
        width: 50, 
        height: 50, 
        borderRadius: 5
    },
    activityDescription: {
        color: 'white',
        alignItems: 'center',
        width: '100%',
    },
    timestamp:{
        color: 'grey',
        alignItems: 'center',
        alignSelf: 'flex-end',
        borderWidth: 1,
        borderColor: 'white',
    }
});