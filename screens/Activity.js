import React, { useState } from 'react';
import { 
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView
 } from 'react-native';
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
                {activities.map((activity, index) => (
                    <Text key={index}>{activity}</Text>
                ))}
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
        padding: 10,
    },
    tabHeaderButton: {
        padding: 5,
        borderRadius: 5,
        margin: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedTabHeader: {
        fontSize: 30,
        color: 'white',
        fontFamily: 'System',
        paddingHorizontal: 10,
    },
    unselectedTabHeader: {
        fontSize: 30,
        color: 'grey',
        fontFamily: 'System',
        paddingHorizontal: 10,
    },
    activityListContainer: {
        flex: 1,
        borderWidth: 1, 
        borderColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
    }
});