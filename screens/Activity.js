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

    // Add new activity
    const addActivity = (activity) => {
        setActivities(prevActivities => [...prevActivities, activity]);
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
                <TouchableOpacity style={activityStyles.tabHeaderButton} onPress={() => {console.log("Activity pressed")}}>
                    <Text style={activityStyles.tabHeader}>Activity</Text>
                </TouchableOpacity>
                <TouchableOpacity style={activityStyles.tabHeaderButton} onPress={() => {console.log("Milestones pressed")}}>
                    <Text style={activityStyles.tabHeader}>Milestones</Text>
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
    tabHeader: {
        fontSize: 30,
        color: 'white',
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