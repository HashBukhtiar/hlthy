import React, { useState, useEffect } from 'react';
import { 
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator
} from 'react-native';
import { profileIcon } from '@/assets/images';
import globalStyles from '@/styles/globalStyles';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext'; 
import { db, app } from '@/firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore'; 


// Helper function to display shortened string
const displayShortenedString = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
};

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
    const functions = getFunctions(app, 'northamerica-northeast2');

    const [followRequests, setFollowRequests] = useState<ActivityItem[]>([]);
    const [otherActivities, setOtherActivities] = useState<ActivityItem[]>([]);    
    const [loading, setLoading] = useState(true);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
    const acceptRequestFunction = httpsCallable(functions, 'acceptfollowrequest');

    // useEffect for Follow Requests
    useEffect(() => {
        if (!currentUser) {
            setLoadingRequests(false);
            setFollowRequests([]);
            return;
        }

        setLoadingRequests(true);
        const activityRef = collection(db, 'activity', currentUser.uid, 'userActivity');
        
        const followRequestsQuery = query(
            activityRef,
            where('type', '==', 'follow_request'),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribeFollowRequests = onSnapshot(followRequestsQuery, (querySnapshot) => {
            const fetchedFollowRequests: ActivityItem[] = [];
            querySnapshot.forEach((doc) => {
                fetchedFollowRequests.push({ id: doc.id, ...doc.data() } as ActivityItem);
            });
            setFollowRequests(fetchedFollowRequests);
            setLoadingRequests(false);
        }, (error) => {
            console.error("Error fetching follow requests: ", error);
            setLoadingRequests(false);
        });
        
        return () => {
            unsubscribeFollowRequests();
        };
    }, [currentUser]);

    // useEffect for Other Activities
    useEffect(() => {
        if (!currentUser) {
            setLoadingActivities(false);
            setOtherActivities([]); 
            return;
        }

        setLoadingActivities(true);
        const activityRef = collection(db, 'activity', currentUser.uid, 'userActivity');

        // Query for activities that are NOT pending follow requests.
        const otherActivitiesQuery = query(
            activityRef,
            where('status', '!=', 'pending'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribeOtherActivities = onSnapshot(otherActivitiesQuery, (querySnapshot) => {
            const fetchedOtherActivities: ActivityItem[] = [];
            querySnapshot.forEach((doc) => {
                const activityData = doc.data();
                if (activityData.type === 'follow_request') {
                    return;
                }

                fetchedOtherActivities.push({ id: doc.id, ...activityData } as ActivityItem);
            });
            setOtherActivities(fetchedOtherActivities);
            setLoadingActivities(false);
        }, (error) => {
            console.error("Error fetching other activities: ", error);
            setLoadingActivities(false);
        });

        return () => {
            unsubscribeOtherActivities();
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
        if (loadingRequests) { 
            if (followRequests.length === 0) {
                return <Text style={{color: 'white', textAlign: 'center', marginTop: 10}}>Loading requests...</Text>;
            }
        }

        if (followRequests.length === 0) {
            return null; 
        }
        
        let maxUsernameLength = 12;

        return (
            <View>
                <Text style={[globalStyles.subtitle, {marginLeft: 15, marginVertical: 20, fontWeight: 'bold', fontSize: 30}]}>Follow Requests</Text>
                <View style={activityStyles.activityView}>
                    {followRequests.map((request, index) => (
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
                                disabled={processingRequestId === request.id}
                            >
                                {processingRequestId === request.id ? (
                                    <ActivityIndicator size="small" color="black" />
                                ) : (
                                    <Text style={{color: 'black', fontWeight: 'bold'}}>Accept</Text>
                                )}
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={activityStyles.ignoreButton}
                                onPress={() => handleIgnoreFollowRequest(request.id, request.fromUserId)}
                                disabled={processingRequestId === request.id}
                            >
                                {processingRequestId === request.id ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={{color: 'white', fontWeight: 'bold'}}>Ignore</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            </View>
        );
    }

    const handleAcceptFollowRequest = async (activityId: string, requestingUserId: string) => {
        if (!currentUser) {
            console.error("Pulse.tsx: No current user found to accept follow request.");
            return;
        }
        setProcessingRequestId(activityId);
        console.log(`Pulse.tsx: Attempting to accept follow request. activityId=${activityId}, requestingUserId=${requestingUserId}`);
        
        if (!functions) { 
            console.error("Pulse.tsx: Firebase Functions instance is not initialized (this shouldn't happen if getFunctions was called correctly)!");
            setProcessingRequestId(null);
            return;
        }
        console.log("Pulse.tsx: Firebase Functions instance seems okay (region specified).");

        try {
            // 'acceptfollowrequest' is already defined using httpsCallable at the component level in your full file,
            // so you might not need to redefine it here if `acceptRequestFunction` is already available.
            // If `acceptRequestFunction` is defined outside this handler (as seen in your full file):
            // const result = await acceptRequestFunction({ activityId, requestingUserId }); 
            // If defining it locally:
            const callableFunc = httpsCallable(functions, 'acceptfollowrequest');
            console.log("Pulse.tsx: Calling 'acceptfollowrequest' cloud function...");
            const result = await callableFunc({ activityId, requestingUserId });
            console.log("Pulse.tsx: Follow request accepted successfully by cloud function:", result.data);
        } catch (error: any) {
            console.error("Pulse.tsx: Error accepting follow request (raw):", error);
            if (error.code && error.message) {
                console.error("Pulse.tsx: Error accepting follow request (Firebase): Code:", error.code, "Message:", error.message, "Details:", error.details);
            }
        } finally {
            setProcessingRequestId(null);
        }
    };

    const handleIgnoreFollowRequest = async (activityId: string, requestingUserId: string) => {
        if (!currentUser) {
            console.error("No current user found to ignore follow request.");
            return;
        }
        setProcessingRequestId(activityId);
        console.log(`Attempting to ignore follow request: activityId=${activityId}, requestingUserId=${requestingUserId}`);
        try {
            const ignoreRequestFunction = httpsCallable(functions, 'ignorefollowrequest');
            const result = await ignoreRequestFunction({ activityId, requestingUserId });
            console.log("Follow request ignored successfully:", result.data);
        } catch (error: any) {
            console.error("Error ignoring follow request (raw):", error);
            if (error.code && error.message) {
                console.error("Error ignoring follow request (Firebase): Code:", error.code, "Message:", error.message, "Details:", error.details);
            }
        } finally {
            setProcessingRequestId(null);
        }
    };

    function renderOtherActivity() {
        if (loadingActivities && otherActivities.length === 0) {
            return <Text style={{color: 'white', textAlign: 'center', marginTop: 10}}>Loading activities...</Text>;
        }
        // Adjusted condition: Show "No other recent activity" only if there are follow requests OR if follow requests are done loading and empty.
        if (!loadingActivities && otherActivities.length === 0 && (followRequests.length > 0 || (!loadingRequests && followRequests.length === 0))) {
             return <Text style={{color: 'grey', textAlign: 'center', marginVertical: 20, marginLeft: 15}}>No other recent activity.</Text>;
        }
        // This condition is for when everything is loaded and both lists are empty.
        // It's handled by renderActivity, so this specific check might be redundant here if renderActivity has a global empty state.
        // For safety, keeping a local null return if otherActivities is truly empty and not loading.
        if (!loadingActivities && otherActivities.length === 0) {
            return null;
        }

        let maxUsernameLength = 15;
        let maxCommentLength = 30;
        let maxWorkoutTitleLength = 20;

        return (
            <View>
                <Text style={[globalStyles.subtitle, {marginLeft: 15, marginVertical: 20, fontWeight: 'bold', fontSize: 30}]}>Activity</Text>
                <View style={activityStyles.activityView}>
                    {otherActivities.map((activity, index) => (
                        <TouchableOpacity
                            key={activity.id}
                            style={[activityStyles.activityElement, index !== otherActivities.length - 1 && {borderBottomWidth: 1, borderBottomColor: 'grey'}]}
                            onPress={() => {
                                // General row click navigation (fallback or for non-specific parts of the row)
                                if (activity.type === 'post_like' || activity.type === 'post_comment') {
                                    if (activity.postId) router.push({ pathname: "/view-post/[id]", params: { id: activity.postId } });
                                } else if (activity.type === 'workout_save') {
                                    if (activity.workoutId) router.push({ pathname: "/view-workout/[id]", params: { id: activity.workoutId } });
                                } else if (activity.type === 'new_follower' || activity.type === 'follow_accepted') {
                                    // For these types, the whole row click can also go to profile,
                                    // but specific clicks on image/name are handled below.
                                    if (activity.fromUserId) router.push({ pathname: "/profile/[userId]", params: { userId: activity.fromUserId } });
                                }
                                console.log("Activity element (outer) pressed:", activity.type, activity.id);
                            }}
                            // activeOpacity={0.7} // Optional: to give feedback on press
                        >
                            <TouchableOpacity
                                onPress={() => {
                                    if (activity.fromUserId) router.push({ pathname: "/profile/[userId]", params: { userId: activity.fromUserId } });
                                    console.log("Profile image pressed, navigating to user:", activity.fromUserId);
                                }}
                                style={activityStyles.activityPostImage} // Ensure this style allows touch
                            >
                                <Image
                                    source={
                                        (activity.type === 'post_like' || activity.type === 'post_comment')
                                            ? (activity.fromProfileImageUrl ? { uri: activity.fromProfileImageUrl } : profileIcon)
                                        : activity.fromProfileImageUrl ? { uri: activity.fromProfileImageUrl }
                                        : profileIcon
                                    }
                                    style={
                                        (activity.type === 'post_like' || activity.type === 'post_comment' || activity.type === 'new_follower' || activity.type === 'follow_accepted')
                                            ? activityStyles.activityUserImageStyle
                                            : activityStyles.activityContentImageStyle
                                    }
                                />
                            </TouchableOpacity>
                            <View style={{flex:1}}>
                                <Text style={activityStyles.activityDescription} numberOfLines={3}>
                                    <Text
                                        style={activityStyles.activityUsernameText}
                                        onPress={() => {
                                            if (activity.fromUserId) router.push({ pathname: "/profile/[userId]", params: { userId: activity.fromUserId } });
                                            console.log("Username pressed, navigating to user:", activity.fromUserId);
                                        }}
                                    >
                                        @{displayShortenedString(activity.fromUsername || 'User', maxUsernameLength)}
                                    </Text>
                                    {` `}
                                    {activity.type === 'post_like' && 'liked your post.'}
                                    {activity.type === 'post_comment' && `commented: "${displayShortenedString(activity.commentText || '', maxCommentLength)}"`}
                                    {activity.type === 'workout_save' && (
                                        <>
                                            {'saved your workout: '}
                                            <TouchableOpacity onPress={() => {
                                                if (activity.workoutId) router.push({ pathname: "/view-workout/[id]", params: { id: activity.workoutId } });
                                            }}>
                                                <Text style={{textDecorationLine: 'underline'}}>{displayShortenedString(activity.workoutTitle || 'Workout', maxWorkoutTitleLength)}</Text>
                                            </TouchableOpacity>
                                            {'.'}
                                        </>
                                    )}
                                    {activity.type === 'new_follower' && 'started following you.'}
                                    {activity.type === 'follow_accepted' && 'accepted your follow request.'}
                                    <Text style={{color:'grey'}}> · {formatTimeAgo(activity.createdAt)}</Text>
                                </Text>
                            </View>
                            {(activity.type === 'post_like' || activity.type === 'post_comment') && activity.postImageUrl && (
                                <TouchableOpacity
                                    onPress={() => {
                                        if (activity.postId) router.push({ pathname: "/view-post/[id]", params: { id: activity.postId } });
                                    }}
                                    style={activityStyles.activityContentPreviewImageContainer}
                                >
                                    <Image
                                        source={{ uri: activity.postImageUrl }}
                                        style={activityStyles.activityContentPreviewImageStyle}
                                    />
                                </TouchableOpacity>
                            )}
                            {activity.type === 'workout_save' && activity.postImageUrl && ( // Assuming postImageUrl might be used for workout image
                                <TouchableOpacity
                                    onPress={() => {
                                        if (activity.workoutId) router.push({ pathname: "/view-workout/[id]", params: { id: activity.workoutId } });
                                    }}
                                    style={activityStyles.activityContentPreviewImageContainer}
                                >
                                    <Image
                                        source={{ uri: activity.postImageUrl }} // Or a specific workoutImageUrl if available
                                        style={activityStyles.activityContentPreviewImageStyle}
                                    />
                                </TouchableOpacity>
                            )}
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
            <ScrollView contentContainerStyle={activityStyles.scrollViewContentContainer}>
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
    },
    activityUserImageStyle: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    activityContentImageStyle: {
        width: 50,
        height: 50,
        borderRadius: 8,
    },
    activityContentPreviewImageContainer: {
        marginLeft: 10,
    },
    activityContentPreviewImageStyle: {
        width: 45,
        height: 45,
        borderRadius: 5,
    },
    activityDescription: {
        color: 'white',
        // alignItems: 'center', // This might not be needed here if text is aligned by parent
        // width: '100%', // This might be too restrictive, let flexbox handle width
        fontSize: 16,
        flexShrink: 1, // Good for allowing text to shrink if needed
        // Add lineHeight if you want to control spacing between lines of text
        // lineHeight: 20, 
    },
    activityUsernameText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
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
    scrollViewContentContainer: {
        paddingBottom: 70,
    },
});