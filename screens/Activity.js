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

    function renderActivityList() {
        return (
            <ScrollView contentContainerStyle={activityStyles.activityListContainer}>
                {/* Dynamically add activities (will need this eventually but not for now)
                {activities.map((activity, index) => (
                    <Text key={index}>{activity}</Text>
                ))}
            */}
                
                <TouchableOpacity onPress={() => {console.log("activity element pressed")}}>
                    <View style={activityStyles.activityElement}>
                        <View style={activityStyles.activityPostImage}>
                            <Image source={profileIcon} style={activityStyles.activityImageStyle} />
                        </View>
                        <View style={{flex:1}}>
                            <Text style={activityStyles.activityDescription}>
                                <Text style={{fontWeight: 'bold'}}>@skibidisigmafanumtaxohiogyatt</Text> has requested to follow you.<Text style={{color:'grey'}}> 20s</Text>
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {console.log("activity element pressed")}}>
                    <View style={activityStyles.activityElement}>
                        <View style={activityStyles.activityPostImage}>
                            <Image source={postImage} style={activityStyles.activityImageStyle} />
                        </View>
                        <View style={{flex:1}}>
                            <Text style={activityStyles.activityDescription}>
                                <Text style={{fontWeight: 'bold'}}>@tangoholic</Text> has reacted to your post with 💪.<Text style={{color:'grey'}}> 2m</Text>
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {console.log("activity element pressed")}}>
                    <View style={activityStyles.activityElement}>
                        <View style={activityStyles.activityPostImage}>
                            <Image source={postImage} style={activityStyles.activityImageStyle} />
                        </View>
                        <View style={{flex:1}}>
                            <Text style={activityStyles.activityDescription}>
                                <Text style={{fontWeight: 'bold'}}>@neCHAD</Text> has reacted to your post with 🔥.<Text style={{color:'grey'}}> 54m</Text>
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {console.log("activity element pressed")}}>
                    <View style={activityStyles.activityElement}>
                        <View style={activityStyles.activityPostImage}>
                            <Image source={profileIcon} style={activityStyles.activityImageStyle} />
                        </View>
                        <View style={{flex:1}}>
                            <Text style={activityStyles.activityDescription}>
                                <Text style={{fontWeight: 'bold'}}>@neCHAD</Text> has requested to follow you.<Text style={{color:'grey'}}> 2h</Text>
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {console.log("activity element pressed")}}>
                    <View style={activityStyles.activityElement}>
                        <View style={activityStyles.activityPostImage}>
                            <Image source={profileIcon} style={activityStyles.activityImageStyle} />
                        </View>
                        <View style={{flex:1}}>
                            <Text style={activityStyles.activityDescription}>
                                <Text style={{fontWeight: 'bold'}}>@skibidisigmafanumtaxohiogyatt</Text> has requested to follow you.<Text style={{color:'grey'}}> 20s</Text>
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {console.log("activity element pressed")}}>
                    <View style={activityStyles.activityElement}>
                        <View style={activityStyles.activityPostImage}>
                            <Image source={postImage} style={activityStyles.activityImageStyle} />
                        </View>
                        <View style={{flex:1}}>
                            <Text style={activityStyles.activityDescription}>
                                <Text style={{fontWeight: 'bold'}}>@tangoholic</Text> has reacted to your post with 💪.<Text style={{color:'grey'}}> 2m</Text>
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {console.log("activity element pressed")}}>
                    <View style={activityStyles.activityElement}>
                        <View style={activityStyles.activityPostImage}>
                            <Image source={postImage} style={activityStyles.activityImageStyle} />
                        </View>
                        <View style={{flex:1}}>
                            <Text style={activityStyles.activityDescription}>
                                <Text style={{fontWeight: 'bold'}}>@neCHAD</Text> has reacted to your post with 🔥.<Text style={{color:'grey'}}> 54m</Text>
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {console.log("activity element pressed")}}>
                    <View style={activityStyles.activityElement}>
                        <View style={activityStyles.activityPostImage}>
                            <Image source={profileIcon} style={activityStyles.activityImageStyle} />
                        </View>
                        <View style={{flex:1}}>
                            <Text style={activityStyles.activityDescription}>
                                <Text style={{fontWeight: 'bold'}}>@neCHAD</Text> has requested to follow you.<Text style={{color:'grey'}}> 2h</Text>
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {console.log("activity element pressed")}}>
                    <View style={activityStyles.activityElement}>
                        <View style={activityStyles.activityPostImage}>
                            <Image source={profileIcon} style={activityStyles.activityImageStyle} />
                        </View>
                        <View style={{flex:1}}>
                            <Text style={activityStyles.activityDescription}>
                                <Text style={{fontWeight: 'bold'}}>@skibidisigmafanumtaxohiogyatt</Text> has requested to follow you.<Text style={{color:'grey'}}> 20s</Text>
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {console.log("activity element pressed")}}>
                    <View style={activityStyles.activityElement}>
                        <View style={activityStyles.activityPostImage}>
                            <Image source={postImage} style={activityStyles.activityImageStyle} />
                        </View>
                        <View style={{flex:1}}>
                            <Text style={activityStyles.activityDescription}>
                                <Text style={{fontWeight: 'bold'}}>@tangoholic</Text> has reacted to your post with 💪.<Text style={{color:'grey'}}> 2m</Text>
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {console.log("activity element pressed")}}>
                    <View style={activityStyles.activityElement}>
                        <View style={activityStyles.activityPostImage}>
                            <Image source={postImage} style={activityStyles.activityImageStyle} />
                        </View>
                        <View style={{flex:1}}>
                            <Text style={activityStyles.activityDescription}>
                                <Text style={{fontWeight: 'bold'}}>@neCHAD</Text> has reacted to your post with 🔥.<Text style={{color:'grey'}}> 54m</Text>
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {console.log("activity element pressed")}}>
                    <View style={activityStyles.activityElement}>
                        <View style={activityStyles.activityPostImage}>
                            <Image source={profileIcon} style={activityStyles.activityImageStyle} />
                        </View>
                        <View style={{flex:1}}>
                            <Text style={activityStyles.activityDescription}>
                                <Text style={{fontWeight: 'bold'}}>@neCHAD</Text> has requested to follow you.<Text style={{color:'grey'}}> 2h</Text>
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </ScrollView>
        );
    }

    function renderMilestonesList() {
        return (
            <ScrollView contentContainerStyle={activityStyles.activityListContainer}>
                {/* Dynamically add activities (will need this eventually but not for now)
                {activities.map((activity, index) => (
                    <Text key={index}>{activity}</Text>
                ))}
            */}
            
                <TouchableOpacity onPress={() => {console.log("milestone element pressed")}}>
                    <View style={activityStyles.milestonesElement}>
                        {/** PFP Image View */}
                        <View style={activityStyles.milestonesPFPImage}>
                            <Image source={profileIcon} style={activityStyles.milestonesImageStyle} />
                        </View>

                        {/** Description View */}
                        <View style={activityStyles.milestonesDescription}>
                            <Text style={{fontWeight: 'bold', color: 'white', fontSize: 20}}>@sungjinwoo</Text>
                            <Text style={{fontSize: 18}}>
                                <Text style={{color: 'white'}}>Bench Press: </Text> 
                                <Text style={{color: 'orange'}}>225 lbs</Text>
                            </Text>
                        </View>

                        {/** Optional Post Image View */}
                        <View style={activityStyles.milestonesPostImage}>
                            <Image source={postImage} style={activityStyles.milestonesImageStyle} />
                        </View>
                    </View>
                </TouchableOpacity>
            </ScrollView>
        );
    }

    return (
        <View style={globalStyles.container}>
            <View>
                {renderHeaderButtons()}
            </View>
            {/* Alternate between Activity and Milestones8*/}
            <View style={{flex:1}}>
                {selectedTab === 'Activity' ? (
                    renderActivityList()
                ) : (
                    renderMilestonesList()
                )}
            </View>
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
        padding: 5,
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    activityElement: {
        borderTopWidth: 1,
        borderColor: 'grey',
        padding: 5,
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    activityPostImage: {
        marginRight: 10,
    },
    activityImageStyle: {
        width: 50, 
        height: 50, 
        borderRadius: 5
    },
    activityDescription: {
        color: 'white',
        alignItems: 'center',
        width: '100%',
        fontSize: 16,
        flexShrink: 1,
    },
    milestonesElement: {
        borderTopWidth: 1,
        borderColor: 'grey',
        padding: 5,
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    milestonesDescription: {
        color: 'white',
        alignItems: 'left',
        width: '100%',
        fontSize: 20,
        flexShrink: 1,
    },
    milestonesPFPImage: {
        marginRight: 5,
        borderRadius: 5,
    },
    milestonesPostImage: {
        marginLeft: 5,
    },
    milestonesImageStyle: {
        width: 70, 
        height: 70, 
        borderRadius: 5,
    },
    timestamp:{
        color: 'grey',
        alignItems: 'center',
        alignSelf: 'flex-end',
    }
});