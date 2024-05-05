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
//import DoubleTap from 'react-native-double-tap';
import { profileIcon, postImage } from '../assets/images';
import globalStyles from '../styles/globalStyles';
import Icon from 'react-native-vector-icons/FontAwesome'
import { useNavigation } from '@react-navigation/native';


export default function Activity() {
    //const [activities, setActivities] = useState([]);
    const [selectedTab, setSelectedTab] = useState('Activity'); // Track which tab is selected (Activity or Milestones)
    const [heartCount, setHeartCount] = useState({ count: 999999, selected: false });
    const [strongCount, setStrongCount] = useState({ count: 999, selected: false });
    const [fireCount, setFireCount] = useState({ count: 0, selected: false });
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

    // Add new activity
    const addActivity = (activity) => {
        setActivities(prevActivities => [...prevActivities, activity]);
    }

    function renderHeaderButtons() {
        return (
            <View style={activityStyles.tabHeaderButtonsContainer}>
                <TouchableOpacity activeOpacity={1} style={selectedTab === 'Activity' ? activityStyles.selectedTabHeaderButton : activityStyles.unselectedTabHeaderButton} onPress={() => selectActivity()}>
                    <View>
                        <Text style={selectedTab === 'Activity' ? activityStyles.selectedTabHeader : activityStyles.unselectedTabHeader}>Activity</Text>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={1} style={selectedTab === 'Milestones' ? activityStyles.selectedTabHeaderButton : activityStyles.unselectedTabHeaderButton} onPress={() => selectMilestones()}>
                    <Text style={selectedTab === 'Milestones' ? activityStyles.selectedTabHeader : activityStyles.unselectedTabHeader}>Milestones</Text>
                </TouchableOpacity>
            </View>
        );
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

    function handleReactionPress(setReaction) {
        setReaction(prevState => ({
            count: prevState.selected ? prevState.count - 1 : prevState.count + 1,
            selected: !prevState.selected
        }));
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
                    {/** WILL EVENTUALLY NEED TO ADD THESE DYNAMICALLY, LIKE ACTIVITIES */}

                    <View style={activityStyles.milestonesElement}>
                        {/** PFP Image View */}
                        <View style={activityStyles.milestonesPFPImage}>
                            <Image source={profileIcon} style={activityStyles.milestonesImageStyle} />
                        </View>

                        {/** Description View */}
                        <View style={activityStyles.milestonesDescription}>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                <Text style={{fontWeight: 'bold', color: 'white', fontSize: 20}}>@sungjinwoo</Text>
                                <Text style={{fontSize: 12, color: 'gray', marginLeft: 5, marginTop: 4}}>2m</Text>
                            </View>
                            <Text style={{fontSize: 18}}>
                                <Text style={{color: 'white'}}>Bench Press: </Text> 
                                <Text style={{color: 'orange'}}>225 lbs</Text>
                            </Text>

                            {/* Reaction buttons */}
                            <View style={activityStyles.reactionButtons}>
                                <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(setHeartCount)} style={heartCount.selected ? activityStyles.reactionButtonClicked : activityStyles.reactionButtonUnclicked}>
                                    <Text style={heartCount.selected ? activityStyles.reactionTextClicked : activityStyles.reactionTextUnclicked}>❤️ {formatCount(heartCount.count)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(setStrongCount)} style={strongCount.selected ? activityStyles.reactionButtonClicked : activityStyles.reactionButtonUnclicked}>
                                    <Text style={strongCount.selected ? activityStyles.reactionTextClicked : activityStyles.reactionTextUnclicked}>💪 {formatCount(strongCount.count)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(setFireCount)} style={fireCount.selected ? activityStyles.reactionButtonClicked : activityStyles.reactionButtonUnclicked}>
                                    <Text style={fireCount.selected ? activityStyles.reactionTextClicked : activityStyles.reactionTextUnclicked}>🔥 {formatCount(fireCount.count)}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/** Optional Post Image View */}
                        <View style={activityStyles.milestonesPostImage}>
                            <Image source={postImage} style={activityStyles.milestonesImageStyle} />
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {console.log("milestone element pressed")}}>
                    {/** WILL EVENTUALLY NEED TO ADD THESE DYNAMICALLY, LIKE ACTIVITIES */}

                    <View style={activityStyles.milestonesElement}>
                        {/** PFP Image View */}
                        <View style={activityStyles.milestonesPFPImage}>
                            <Image source={profileIcon} style={activityStyles.milestonesImageStyle} />
                        </View>

                        {/** Description View */}
                        <View style={activityStyles.milestonesDescription}>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                <Text style={{fontWeight: 'bold', color: 'white', fontSize: 20}}>@mai123</Text>
                                <Text style={{fontSize: 12, color: 'gray', marginLeft: 5, marginTop: 4}}>6h</Text>
                            </View>
                            <Text style={{fontSize: 18}}>
                                <Text style={{color: 'white'}}>Squat: </Text> 
                                <Text style={{color: 'orange'}}>355 lbs</Text>
                            </Text>

                            {/* Reaction buttons */}
                            <View style={activityStyles.reactionButtons}>
                                <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(setHeartCount)} style={heartCount.selected ? activityStyles.reactionButtonClicked : activityStyles.reactionButtonUnclicked}>
                                    <Text style={heartCount.selected ? activityStyles.reactionTextClicked : activityStyles.reactionTextUnclicked}>❤️ {formatCount(heartCount.count)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(setStrongCount)} style={strongCount.selected ? activityStyles.reactionButtonClicked : activityStyles.reactionButtonUnclicked}>
                                    <Text style={strongCount.selected ? activityStyles.reactionTextClicked : activityStyles.reactionTextUnclicked}>💪 {formatCount(strongCount.count)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(setFireCount)} style={fireCount.selected ? activityStyles.reactionButtonClicked : activityStyles.reactionButtonUnclicked}>
                                    <Text style={fireCount.selected ? activityStyles.reactionTextClicked : activityStyles.reactionTextUnclicked}>🔥 {formatCount(fireCount.count)}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/** Optional Post Image View */}
                        <View style={activityStyles.milestonesPostImage}>
                            <Image source={postImage} style={activityStyles.milestonesImageStyle} />
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {console.log("milestone element pressed")}}>
                    {/** WILL EVENTUALLY NEED TO ADD THESE DYNAMICALLY, LIKE ACTIVITIES */}

                    <View style={activityStyles.milestonesElement}>
                        {/** PFP Image View */}
                        <View style={activityStyles.milestonesPFPImage}>
                            <Image source={profileIcon} style={activityStyles.milestonesImageStyle} />
                        </View>

                        {/** Description View */}
                        <View style={activityStyles.milestonesDescription}>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                <Text style={{fontWeight: 'bold', color: 'white', fontSize: 20}}>@woodthefarmer</Text>
                                <Text style={{fontSize: 12, color: 'gray', marginLeft: 5, marginTop: 4}}>3d</Text>
                            </View>
                            <Text style={{fontSize: 18}}>
                                <Text style={{color: 'white'}}>Farmer Carry: </Text> 
                                <Text style={{color: 'orange'}}>5M lbs</Text>
                            </Text>

                            {/* Reaction buttons */}
                            <View style={activityStyles.reactionButtons}>
                                <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(setHeartCount)} style={heartCount.selected ? activityStyles.reactionButtonClicked : activityStyles.reactionButtonUnclicked}>
                                    <Text style={heartCount.selected ? activityStyles.reactionTextClicked : activityStyles.reactionTextUnclicked}>❤️ {formatCount(heartCount.count)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(setStrongCount)} style={strongCount.selected ? activityStyles.reactionButtonClicked : activityStyles.reactionButtonUnclicked}>
                                    <Text style={strongCount.selected ? activityStyles.reactionTextClicked : activityStyles.reactionTextUnclicked}>💪 {formatCount(strongCount.count)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(setFireCount)} style={fireCount.selected ? activityStyles.reactionButtonClicked : activityStyles.reactionButtonUnclicked}>
                                    <Text style={fireCount.selected ? activityStyles.reactionTextClicked : activityStyles.reactionTextUnclicked}>🔥 {formatCount(fireCount.count)}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/** Optional Post Image View */}
                        <View style={activityStyles.milestonesPostImage}>
                            <Image source={postImage} style={activityStyles.milestonesImageStyle} />
                        </View>
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {console.log("milestone element pressed")}}>
                    {/** WILL EVENTUALLY NEED TO ADD THESE DYNAMICALLY, LIKE ACTIVITIES */}

                    <View style={activityStyles.milestonesElement}>
                        {/** PFP Image View */}
                        <View style={activityStyles.milestonesPFPImage}>
                            <Image source={profileIcon} style={activityStyles.milestonesImageStyle} />
                        </View>

                        {/** Description View */}
                        <View style={activityStyles.milestonesDescription}>
                            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                                <Text style={{fontWeight: 'bold', color: 'white', fontSize: 20}}>@tangoderango</Text>
                                <Text style={{fontSize: 12, color: 'gray', marginLeft: 5, marginTop: 4}}>1w</Text>
                            </View>
                            <Text style={{fontSize: 18}}>
                                <Text style={{color: 'white'}}>Bicep Curl: </Text> 
                                <Text style={{color: 'orange'}}>1 lbs</Text>
                            </Text>

                            {/* Reaction buttons */}
                            <View style={activityStyles.reactionButtons}>
                                <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(setHeartCount)} style={heartCount.selected ? activityStyles.reactionButtonClicked : activityStyles.reactionButtonUnclicked}>
                                    <Text style={heartCount.selected ? activityStyles.reactionTextClicked : activityStyles.reactionTextUnclicked}>❤️ {formatCount(heartCount.count)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(setStrongCount)} style={strongCount.selected ? activityStyles.reactionButtonClicked : activityStyles.reactionButtonUnclicked}>
                                    <Text style={strongCount.selected ? activityStyles.reactionTextClicked : activityStyles.reactionTextUnclicked}>💪 {formatCount(strongCount.count)}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity activeOpacity={1} onPress={() => handleReactionPress(setFireCount)} style={fireCount.selected ? activityStyles.reactionButtonClicked : activityStyles.reactionButtonUnclicked}>
                                    <Text style={fireCount.selected ? activityStyles.reactionTextClicked : activityStyles.reactionTextUnclicked}>🔥 {formatCount(fireCount.count)}</Text>
                                </TouchableOpacity>
                            </View>
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
                <View style={{flexDirection:'row', alignItems:'center', marginLeft: 15}}>
                    <TouchableOpacity onPress={() => {
                        console.log("back arrow pressed");
                        navigation.goBack();
                        }}>
                        <Icon name="arrow-left" size={25} color="white" />
                    </TouchableOpacity>
                    <Text style={[globalStyles.title, {marginLeft: 15}]}>Pulse</Text>
                </View>
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
        </View>
    );
}

const activityStyles = StyleSheet.create({
    tabHeaderButtonsContainer: {
        backgroundColor: '#2e2e2e',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 15,
        marginHorizontal: 15,
        borderRadius: '50%',
        height: Dimensions.get('window').height * 0.05,
    },
    selectedTabHeaderButton: {
        flex: 1,
        padding: 5,
        borderRadius: '50%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    unselectedTabHeaderButton: {
        flex: 1,
        padding: 5,
        borderRadius: '50%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabHeaderButton: {
        flex: 1,
        padding: 5,
        borderRadius: '50%',
        justifyContent: 'center',
        alignItems: 'center',

    },
    selectedTabHeader: {
        fontSize: 20,
        color: 'black',
        fontFamily: 'System',
        fontWeight: 'bold',
        paddingHorizontal: 10,
    },
    unselectedTabHeader: {
        fontSize: 20,
        color: 'white',
        fontFamily: 'System',
        fontWeight: 'bold',
        paddingHorizontal: 10,
    },
    activityListContainer: {
        padding: 5,
        marginHorizontal: 15,
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: '#2e2e2e',
        borderRadius: 35,
    },
    activityElement: {
        borderBottomWidth: 1,
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
        justifyContent: 'center',
        marginRight: 5,
        borderRadius: 5,
    },
    milestonesPostImage: {
        justifyContent: 'center',
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
        backgroundColor: 'black',
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