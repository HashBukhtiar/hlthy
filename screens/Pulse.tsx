import React, { useState, useEffect } from 'react';
import { 
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { profileIcon } from '@/assets/images';
import globalStyles from '@/styles/globalStyles';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext'; 
import { db } from '@/firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'; 


// Helper function to display shortened string
const displayShortenedString = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
};

/*
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
*/

export interface ActivityItem {
  id: string; 
  type: 'follow_request' | 'new_follower' | 'post_like' | 'post_comment' | 'workout_save' | string; // add more as needed
  fromUserId: string;
  fromUsername: string;
  fromProfileImageUrl?: string;
  postId?: string;
  postImageUrl?: string; 
  workoutId?: string; 
  workoutTitle?: string; 
  commentText?: string;
  createdAt: Timestamp;
  isRead: boolean;
  status?: 'pending' | 'accepted' | 'ignored'; 
}

export default function Pulse() {
    const router = useRouter();
    const { currentUser } = useAuth();
    const functions = getFunctions();

    const [followRequests, setFollowRequests] = useState<ActivityItem[]>([]);
    const [otherActivities, setOtherActivities] = useState<ActivityItem[]>([]);    
    const [loading, setLoading] = useState(true);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [loadingRequests, setLoadingRequests] = useState(true);

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const activityRef = collection(db, 'activity', currentUser.uid, 'userActivity');
        
        // Query for pending follow requests
        const followRequestsQuery = query(
            activityRef,
            where('type', '==', 'follow_request'),
            where('status', '==', 'pending'), // Only show pending requests
            orderBy('createdAt', 'desc')
        );

        const unsubscribeFollowRequests = onSnapshot(followRequestsQuery, (querySnapshot) => {
            const fetchedFollowRequests: ActivityItem[] = [];
            querySnapshot.forEach((doc) => {
                fetchedFollowRequests.push({ id: doc.id, ...doc.data() } as ActivityItem);
            });
            setFollowRequests(fetchedFollowRequests);
            setLoading(false); // Set loading to false after first fetch
        }, (error) => {
            console.error("Error fetching follow requests: ", error);
            setLoading(false);
        });
        
        // Placeholder for fetching other activities (we'll implement this query later)
        // const otherActivitiesQuery = query(
        //     activityRef,
        //     where('type', '!=', 'follow_request'), // Example: fetch everything else
        //     orderBy('createdAt', 'desc')
        // );
        // const unsubscribeOtherActivities = onSnapshot(otherActivitiesQuery, (querySnapshot) => {
        //     const fetchedOtherActivities: ActivityItem[] = [];
        //     querySnapshot.forEach((doc) => {
        //         fetchedOtherActivities.push({ id: doc.id, ...doc.data() } as ActivityItem);
        //     });
        //     setOtherActivities(fetchedOtherActivities);
        // });


        return () => {
            unsubscribeFollowRequests();
            // unsubscribeOtherActivities(); // Uncomment when implemented
        };
    }, [currentUser]);

    const formatTimeAgo = (timestamp: Timestamp | undefined): string => {
        if (!timestamp) return '';
        // This is a placeholder. Use a library like `date-fns` or `moment` for robust time ago formatting.
        // For example, with date-fns: formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
        const date = timestamp.toDate();
        const now = new Date();
        const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
        const minutes = Math.round(seconds / 60);
        const hours = Math.round(minutes / 60);
        const days = Math.round(hours / 24);

        if (seconds < 60) return `${seconds}s ago`;
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    function renderFollowRequests() {
        if (loading && followRequests.length === 0) {
            // return <ActivityIndicator size="small" color="#FFF" style={{ marginTop: 20 }} />; // Or some placeholder
            return <Text style={{color: 'white', textAlign: 'center', marginTop: 10}}>Loading requests...</Text>;
        }

        if (!loading && followRequests.length === 0) {
            return <Text style={{color: 'grey', textAlign: 'center', marginVertical: 20, marginLeft: 15}}>No new follow requests.</Text>;
        }
        
        let maxUsernameLength = 12;

        return (
            <View>
                <Text style={[globalStyles.subtitle, {marginLeft: 15, marginVertical: 20, fontWeight: 'bold', fontSize: 30}]}>Follow Requests</Text>
                <View style={activityStyles.activityView}>
                    {followRequests.map((request, index) => (
                        // The outer TouchableOpacity might not be needed if actions are only on buttons
                        <View key={request.id} style={[activityStyles.activityElement, index !== followRequests.length - 1 && {borderBottomWidth: 1, borderBottomColor: 'grey'}]}>
                            <View style={activityStyles.activityPostImage}>
                                <Image 
                                    source={request.fromProfileImageUrl ? { uri: request.fromProfileImageUrl } : profileIcon} 
                                    style={activityStyles.activityImageStyle} 
                                />
                            </View>
                            <View style={{flex:1, marginRight: 5}}>
                                <Text style={activityStyles.activityDescription} numberOfLines={2}>
                                    <Text style={{fontWeight: 'bold'}}>@{displayShortenedString(request.fromUsername, maxUsernameLength)}</Text>
                                    <Text> wants to follow you.</Text>
                                    <Text style={{color:'grey'}}> · {formatTimeAgo(request.createdAt)}</Text>
                                </Text>
                            </View>
                            <TouchableOpacity 
                                style={activityStyles.acceptButton}
                                onPress={() => handleAcceptFollowRequest(request.id, request.fromUserId)}
                            >
                                <Text style={{color: 'black', fontWeight: 'bold'}}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={activityStyles.ignoreButton}
                                onPress={() => handleIgnoreFollowRequest(request.id, request.fromUserId)}
                            >
                                <Text style={{color: 'white', fontWeight: 'bold'}}>Ignore</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    const handleAcceptFollowRequest = async (activityId: string, requestingUserId: string) => {
        if (!currentUser) {
            console.error("No current user found to accept follow request.");
            return;
        }
        console.log(`Attempting to accept follow request: activityId=${activityId}, requestingUserId=${requestingUserId}`);
        try {
            const acceptRequestFunction = httpsCallable(functions, 'acceptfollowrequest');
            const result = await acceptRequestFunction({ activityId, requestingUserId });
            console.log("Follow request accepted successfully:", result.data);
            // Optionally, you can optimistically remove the request from the UI
            // or rely on the onSnapshot listener to update the list.
            // For simplicity, we'll rely on onSnapshot for now.
        } catch (error) {
            console.error("Error accepting follow request:", error);
            // Handle error (e.g., show a message to the user)
        }
    };

    const handleIgnoreFollowRequest = async (activityId: string, requestingUserId: string) => {
        if (!currentUser) {
            console.error("No current user found to ignore follow request.");
            return;
        }
        console.log(`Attempting to ignore follow request: activityId=${activityId}, requestingUserId=${requestingUserId}`);
        try {
            const ignoreRequestFunction = httpsCallable(functions, 'ignorefollowrequest');
            const result = await ignoreRequestFunction({ activityId, requestingUserId });
            console.log("Follow request ignored successfully:", result.data);
            // Optionally, optimistically remove or rely on onSnapshot.
        } catch (error) {
            console.error("Error ignoring follow request:", error);
            // Handle error
        }
    };

    function renderOtherActivity() {
        if (loadingActivities && otherActivities.length === 0) {
            return <Text style={{color: 'white', textAlign: 'center', marginTop: 10}}>Loading activities...</Text>;
        }
        // Condition to show "No other recent activity" only if follow requests might be present or have loaded
        if (!loadingActivities && otherActivities.length === 0 && (followRequests.length > 0 || !loadingRequests)) {
             return <Text style={{color: 'grey', textAlign: 'center', marginVertical: 20, marginLeft: 15}}>No other recent activity.</Text>;
        }
        // If both sections are empty and done loading, renderActivity will handle the overall "No activity yet"
        if (!loadingActivities && otherActivities.length === 0 && followRequests.length === 0 && !loadingRequests) {
            return null;
        }

        let maxUsernameLength = 15;
        let maxCommentLength = 30;
        let maxWorkoutTitleLength = 20;

        return (
            <View>
                <Text style={[globalStyles.subtitle, {marginLeft: 15, marginVertical: 20, fontWeight: 'bold', fontSize: 30}]}>Other Activity</Text>
                <View style={activityStyles.activityView}>
                    {otherActivities.map((activity, index) => (
                        <TouchableOpacity 
                            key={activity.id} 
                            style={[activityStyles.activityElement, index !== otherActivities.length - 1 && {borderBottomWidth: 1, borderBottomColor: 'grey'}]}
                            onPress={() => {
                                if (activity.type === 'post_like' || activity.type === 'post_comment') {
                                    if (activity.postId) router.push(`/view-post/${activity.postId}`);
                                } else if (activity.type === 'workout_save') {
                                    if (activity.workoutId) router.push(`/view-workout/${activity.workoutId}`);
                                } else if (activity.type === 'new_follower' || activity.type === 'follow_accepted') {
                                    // Navigate to the profile of the user who initiated the action
                                    if (activity.fromUserId) router.push(`/profile/${activity.fromUserId}`);
                                }
                                // Potentially mark as read here: updateActivityAsRead(activity.id);
                                console.log("Activity element pressed:", activity.type, activity.id);
                            }}
                        >
                            <View style={activityStyles.activityPostImage}>
                                <Image 
                                    source={
                                        // Prefer specific content image, then user image, then fallback
                                        (activity.type === 'post_like' || activity.type === 'post_comment') && activity.postImageUrl ? { uri: activity.postImageUrl } :
                                        // activity.type === 'workout_save' && activity.workoutCoverImageUrl ? { uri: activity.workoutCoverImageUrl } : // If you add workoutCoverImageUrl
                                        activity.fromProfileImageUrl ? { uri: activity.fromProfileImageUrl } : 
                                        profileIcon // Your fallback profile icon
                                    } 
                                    style={activityStyles.activityImageStyle} // Ensure this style handles both square and round images gracefully or use different styles
                                />
                            </View>
                            <View style={{flex:1}}>
                                <Text style={activityStyles.activityDescription} numberOfLines={3}>
                                    <Text style={{fontWeight: 'bold'}}>@{displayShortenedString(activity.fromUsername || 'User', maxUsernameLength)}</Text>
                                    {` `}
                                    {activity.type === 'post_like' && 'liked your post.'}
                                    {activity.type === 'post_comment' && `commented: "${displayShortenedString(activity.commentText || '', maxCommentLength)}"`}
                                    {activity.type === 'workout_save' && `saved your workout: ${displayShortenedString(activity.workoutTitle || 'Workout', maxWorkoutTitleLength)}.`}
                                    {activity.type === 'new_follower' && 'started following you.'}
                                    {activity.type === 'follow_accepted' && 'accepted your follow request.'} 
                                    {/* Add more specific text for other types if needed */}
                                    <Text style={{color:'grey'}}> · {formatTimeAgo(activity.createdAt)}</Text>
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    }

    function renderActivity() {
        if (loadingRequests && loadingActivities && followRequests.length === 0 && otherActivities.length === 0) {
             return <Text style={{color: 'white', textAlign: 'center', marginTop: 50}}>Loading Pulse...</Text>;
        }
        // This condition means all loading is done, and both lists are empty.
        if (!loadingRequests && !loadingActivities && followRequests.length === 0 && otherActivities.length === 0) {
            return <Text style={{color: 'grey', textAlign: 'center', marginTop: 50, fontSize: 16}}>No activity yet.</Text>;
        }
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
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name="chevron-back" size={32} color="white" />
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