import React, { useState } from 'react';
import { 
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Animated,
    RefreshControl,
    Platform
} from 'react-native';
import { profileIcon } from '@/assets/images';
import globalStyles from '@/styles/globalStyles';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext'; 
import { app } from '@/firebaseConfig';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Timestamp } from 'firebase/firestore';
import { getOptimalImageUrl } from '@/utils/imageUtils';
import { usePulse } from '@/features/notifications/ui/usePulse';
import { OptimizedImageLight } from '@/components/OptimizedImage';
import { ACCENT_COLOR } from '@/constants/Colors';

// Helper function to display shortened string
const displayShortenedString = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
};

export type { ActivityItem } from '@/features/notifications/domain/ActivityItem';

export default function Pulse() {
    const router = useRouter();
    const authData = useAuth() as any;
    const currentUser = authData?.currentUser;
    const functions = getFunctions(app, 'northamerica-northeast2');
    const { canInteractWithUser, isUserBlocked } = useBlockEnforcement();

    const [followRequests, setFollowRequests] = useState<ActivityItem[]>([]);
    const [otherActivities, setOtherActivities] = useState<ActivityItem[]>([]);    
    const [loading, setLoading] = useState(true);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingRequestInfo, setProcessingRequestInfo] = useState<{ id: string, action: 'accept' | 'ignore' } | null>(null);
    const fadeAnim = new Animated.Value(1); // Start visible
    const slideAnim = new Animated.Value(0); // Start in position
    const acceptRequestFunction = httpsCallable(functions, 'acceptfollowrequest');

    // Pull to refresh handler
    const onRefresh = async () => {
        setRefreshing(true);
        // Refresh is handled by the real-time listeners, so just reset the refreshing state
        setTimeout(() => setRefreshing(false), 1000);
    };

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
            const seenUserIds = new Set<string>(); // Track unique fromUserId to prevent duplicates
            
            querySnapshot.forEach((doc) => {
                const activityData = doc.data() as ActivityItem;
                
                // Filter out follow requests from blocked users and duplicates
                if (!isUserBlocked(activityData.fromUserId) && !seenUserIds.has(activityData.fromUserId)) {
                    seenUserIds.add(activityData.fromUserId);
                    fetchedFollowRequests.push({ ...activityData, id: doc.id });
                }
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
    }, [currentUser?.uid, isUserBlocked]);

    useEffect(() => {
        if (!currentUser) {
            setLoadingActivities(false);
            setOtherActivities([]); 
            return;
        }

        setLoadingActivities(true);
        const activityRef = collection(db, 'activity', currentUser.uid, 'userActivity');

        const otherActivitiesQuery = query(
            activityRef,
            where('type', '!=', 'follow_request'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribeOtherActivities = onSnapshot(otherActivitiesQuery, (querySnapshot) => {
            const fetchedOtherActivities: ActivityItem[] = [];
            querySnapshot.forEach((doc) => {
                const activityData = doc.data();
                
                // Skip follow requests and blocked users
                if (activityData.type === 'follow_request') {
                    return;
                }
                
                // Filter out activities from blocked users
                if (!isUserBlocked(activityData.fromUserId)) {
                    fetchedOtherActivities.push({ ...activityData, id: doc.id } as ActivityItem);
                }
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
    }, [currentUser?.uid, isUserBlocked]);

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
        return (
            <View>
                <View style={activityStyles.sectionHeader}>
                    <View style={activityStyles.sectionTitleContainer}>
                        <MaterialIcons name="person-add" size={20} color={ACCENT_COLOR} />
                        <Text style={activityStyles.sectionTitle}>Follow Requests</Text>
                    </View>
                    {followRequests.length > 0 && (
                        <View style={activityStyles.badgeContainer}>
                            <Text style={activityStyles.badgeText}>{followRequests.length}</Text>
                        </View>
                    )}
                </View>

                {loadingRequests ? (
                    <View style={activityStyles.loadingContainer}>
                        <ActivityIndicator size="small" color={ACCENT_COLOR} />
                        <Text style={activityStyles.loadingText}>Loading requests...</Text>
                    </View>
                ) : followRequests.length === 0 ? (
                    <View style={activityStyles.emptyRequestsContainer}>
                        <MaterialIcons name="people" size={32} color={ACCENT_COLOR} style={activityStyles.emptyStateIcon} />
                        <Text style={activityStyles.emptyRequestsText}>No pending follow requests</Text>
                    </View>
                ) : (
                    <View style={activityStyles.activityView}>
                        {followRequests.map((request, index) => {
                            const maxUsernameLength = 12;
                            
                            // Additional check for blocked users (defensive programming)
                            if (isUserBlocked(request.fromUserId)) {
                                return null;
                            }
                            
                            return (
                                <View
                                    key={request.id}
                                    style={[
                                        activityStyles.activityElement,
                                        index !== followRequests.length - 1 && activityStyles.elementBorder
                                    ]}
                                >
                                    <TouchableOpacity
                                        style={activityStyles.mainRowContent}
                                        onPress={() => {
                                            // Check if we can interact before navigating
                                            if (request.fromUserId && !isUserBlocked(request.fromUserId)) {
                                                router.push({ pathname: "/profile/[userId]", params: { userId: request.fromUserId } });
                                            }
                                            console.log("Follow request: Row pressed, navigating to user:", request.fromUserId);
                                        }}
                                        activeOpacity={0.6}
                                    >
                                        <View style={activityStyles.activityPostImage}>
                                            <Image
                                                source={
                                                    getOptimalImageUrl(request.fromProfileThumbnailUrl, request.fromProfileImageUrl)
                                                    ? { uri: getOptimalImageUrl(request.fromProfileThumbnailUrl, request.fromProfileImageUrl) }
                                                    : profileIcon
                                                }
                                                style={activityStyles.profileImage}
                                            />
                                        </View>

                                        <View style={activityStyles.textContent}>
                                            <Text style={activityStyles.activityDescription} numberOfLines={2}>
                                                <Text style={activityStyles.usernameText}>
                                                    @{displayShortenedString(request.fromUsername, maxUsernameLength)}
                                                </Text>
                                            </Text>
                                            <Text style={activityStyles.timeText}>{formatTimeAgo(request.createdAt)}</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <View style={activityStyles.actionButtonsContainer}>
                                        <TouchableOpacity
                                            style={[
                                                activityStyles.actionButton,
                                                activityStyles.acceptButton,
                                                processingRequestInfo?.id === request.id && activityStyles.disabledButton
                                            ]}
                                            onPress={() => handleAcceptFollowRequest(request.id, request.fromUserId)}
                                            disabled={processingRequestInfo?.id === request.id}
                                        >
                                            {processingRequestInfo?.id === request.id && processingRequestInfo?.action === 'accept' ? (
                                                <ActivityIndicator size="small" color="#000" />
                                            ) : (
                                                <>
                                                    <MaterialIcons name="check" size={16} color="#000" />
                                                    <Text style={activityStyles.acceptButtonText}>Accept</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={[
                                                activityStyles.actionButton,
                                                activityStyles.ignoreButton,
                                                processingRequestInfo?.id === request.id && activityStyles.disabledButton
                                            ]}
                                            onPress={() => handleIgnoreFollowRequest(request.id, request.fromUserId)}
                                            disabled={processingRequestInfo?.id === request.id}
                                        >
                                            {processingRequestInfo?.id === request.id && processingRequestInfo?.action === 'ignore' ? (
                                                <ActivityIndicator size="small" color="#666" />
                                            ) : (
                                                <>
                                                    <MaterialIcons name="close" size={16} color="#666" />
                                                    <Text style={activityStyles.ignoreButtonText}>Ignore</Text>
                                                </>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        }).filter(Boolean)}
                    </View>
                )}
            </View>
        );
    }

    const handleAcceptFollowRequest = async (activityId: string, requestingUserId: string) => {
        if (!currentUser) {
            console.error("Pulse.tsx: No current user found to accept follow request.");
            return;
        }
        
        // Check if the user is blocked before accepting
        if (isUserBlocked(requestingUserId)) {
            console.log("Cannot accept follow request from blocked user:", requestingUserId);
            return;
        }
        
        setProcessingRequestInfo({ id: activityId, action: 'accept' });
        console.log(`Pulse.tsx: Attempting to accept follow request. activityId=${activityId}, requestingUserId=${requestingUserId}`);

        try {
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
            setProcessingRequestInfo(null);
        }
    };

    const handleIgnoreFollowRequest = async (activityId: string, requestingUserId: string) => {
        if (!currentUser) {
            console.error("No current user found to ignore follow request.");
            return;
        }
        
        // Check if the user is blocked before ignoring (though we should still allow ignoring blocked users)
        // Actually, let's allow ignoring even blocked users to clean up old requests
        
        setProcessingRequestInfo({ id: activityId, action: 'ignore' });
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
            setProcessingRequestInfo(null);
        }
    };    function renderOtherActivity() {
        if (loadingActivities && otherActivities.length === 0) {
            return (
                <View style={activityStyles.loadingContainer}>
                    <ActivityIndicator size="small" color={ACCENT_COLOR} />
                    <Text style={activityStyles.loadingText}>Loading activities...</Text>
                </View>
            );
        }

        if (!loadingActivities && otherActivities.length === 0) {
             return (
                <View style={activityStyles.emptyRequestsContainer}>
                    <MaterialIcons name="notifications-none" size={32} color="#888888" style={activityStyles.emptyStateIcon} />
                    <Text style={activityStyles.emptyRequestsText}>No recent activity</Text>
                </View>
             );
        }

        let maxUsernameLength = 15;
        let maxCommentLength = 30;
        let maxWorkoutTitleLength = 20;

        const getActivityIcon = (type: string) => {
            switch (type) {
                case 'post_like':
                return <MaterialIcons name="favorite" size={16} color={ACCENT_COLOR} />;
                case 'post_comment':
                return <MaterialIcons name="chat-bubble" size={16} color={ACCENT_COLOR} />;
                case 'comment_like':
                return <MaterialIcons name="favorite" size={16} color={ACCENT_COLOR} />;
                case 'reply_like':
                return <MaterialIcons name="favorite" size={16} color={ACCENT_COLOR} />;
                case 'comment_reply':
                return <MaterialIcons name="reply" size={16} color={ACCENT_COLOR} />;
                case 'workout_save':
                return <MaterialIcons name="bookmark" size={16} color={ACCENT_COLOR} />;
                case 'new_follower':
                return <MaterialIcons name="person-add" size={16} color={ACCENT_COLOR} />;
                case 'follow_accepted':
                return <MaterialIcons name="check-circle" size={16} color={ACCENT_COLOR} />;
                default:
                return <MaterialIcons name="notifications" size={16} color={ACCENT_COLOR} />;
            }
        };

        return (
            <View>
                <View style={activityStyles.sectionHeader}>
                    <View style={activityStyles.sectionTitleContainer}>
                        <MaterialIcons name="timeline" size={20} color={ACCENT_COLOR} />
                        <Text style={activityStyles.sectionTitle}>Recent Activity</Text>
                    </View>
                </View>
                <View style={activityStyles.activityView}>
                    {otherActivities.map((activity, index) => {
                        // Additional check for blocked users (defensive programming)
                        if (isUserBlocked(activity.fromUserId)) {
                            return null;
                        }
                        
                        return (
                            <View
                                key={activity.id}
                                style={[
                                    activityStyles.activityElement,
                                    index !== otherActivities.length - 1 && activityStyles.elementBorder
                                ]}
                            >
                                <TouchableOpacity
                                    style={activityStyles.mainRowContent}
                                    onPress={() => {
                                        // Check if we can interact before navigating
                                        if (isUserBlocked(activity.fromUserId)) {
                                            console.log("Cannot interact with blocked user:", activity.fromUserId);
                                            return;
                                        }
                                        
                                        if (activity.type === 'post_like' || activity.type === 'post_comment' || activity.type === 'comment_like' || activity.type === 'reply_like') {
                                            if (activity.postId) router.push({ pathname: "/view-post/[id]", params: { id: activity.postId } });
                                        } else if (activity.type === 'workout_save') {
                                            if (activity.workoutId) router.push({ pathname: "/view-workout/[id]", params: { id: activity.workoutId } });
                                        } else if (activity.type === 'new_follower' || activity.type === 'follow_accepted') {
                                            if (activity.fromUserId) router.push({ pathname: "/profile/[userId]", params: { userId: activity.fromUserId } });
                                        }
                                        console.log("Activity element pressed:", activity.type, activity.id);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <TouchableOpacity
                                        onPress={() => {
                                            // Check if we can interact before navigating to profile
                                            if (activity.fromUserId && !isUserBlocked(activity.fromUserId)) {
                                                router.push({ pathname: "/profile/[userId]", params: { userId: activity.fromUserId } });
                                            }
                                            console.log("Profile image pressed, navigating to user:", activity.fromUserId);
                                        }}
                                        style={activityStyles.activityPostImage}
                                    >
                                        <Image
                                            source={
                                                getOptimalImageUrl(activity.fromProfileThumbnailUrl, activity.fromProfileImageUrl)
                                                ? { uri: getOptimalImageUrl(activity.fromProfileThumbnailUrl, activity.fromProfileImageUrl) }
                                                : profileIcon
                                            }
                                            style={activityStyles.activityUserImageStyle}
                                        />
                                    </TouchableOpacity>

                                    <View style={activityStyles.textContent}>
                                        <Text style={activityStyles.activityDescription} numberOfLines={3}>
                                            <Text
                                                style={activityStyles.usernameText}
                                                onPress={() => {
                                                    // Check if we can interact before navigating to profile
                                                    if (activity.fromUserId && !isUserBlocked(activity.fromUserId)) {
                                                        router.push({ pathname: "/profile/[userId]", params: { userId: activity.fromUserId } });
                                                    }
                                                    console.log("Username pressed, navigating to user:", activity.fromUserId);
                                                }}
                                            >
                                                @{displayShortenedString(activity.fromUsername || 'User', maxUsernameLength)}
                                            </Text>
                                            <Text style={activityStyles.actionText}>
                                                {activity.type === 'post_like' && ' liked your post'}
                                                {activity.type === 'post_comment' && ` commented: "${displayShortenedString(activity.commentText || '', maxCommentLength)}"`}
                                                {activity.type === 'comment_like' && ` liked your comment: "${displayShortenedString(activity.commentText || '', maxCommentLength)}"`}
                                                {activity.type === 'reply_like' && ` liked your reply: "${displayShortenedString(activity.commentText || '', maxCommentLength)}"`}
                                                {activity.type === 'comment_reply' && ` replied to your comment: "${displayShortenedString(activity.commentText || '', maxCommentLength)}"`}
                                                {activity.type === 'workout_save' && ` saved your workout: ${displayShortenedString(activity.workoutTitle || 'Workout', maxWorkoutTitleLength)}`}
                                                {activity.type === 'new_follower' && ' started following you'}
                                                {activity.type === 'follow_accepted' && ' accepted your follow request'}
                                            </Text>
                                        </Text>
                                        <Text style={activityStyles.timeText}>{formatTimeAgo(activity.createdAt)}</Text>
                                    </View>
                                </TouchableOpacity>

                                {/* Content preview images with block checking */}
                                {(activity.type === 'post_like' || activity.type === 'post_comment' || activity.type === 'comment_like' || activity.type === 'reply_like') && (activity.postThumbnailUrl || activity.postImageUrl) && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            // Check if we can interact before navigating to post
                                            if (!isUserBlocked(activity.fromUserId) && activity.postId) {
                                                router.push({ pathname: "/view-post/[id]", params: { id: activity.postId } });
                                            }
                                        }}
                                        style={activityStyles.activityContentPreviewImageContainer}
                                    >
                                        <OptimizedImageLight
                                            thumbnailUrl={activity.postThumbnailUrl}
                                            originalUrl={activity.postImageUrl}
                                            style={activityStyles.activityContentPreviewImageStyle}
                                        />
                                    </TouchableOpacity>
                                )}

                                {activity.type === 'workout_save' && activity.workoutThumbnailUrl && (
                                    <TouchableOpacity
                                        onPress={() => {
                                            // Check if we can interact before navigating to workout
                                            if (!isUserBlocked(activity.fromUserId) && activity.workoutId) {
                                                router.push({ pathname: "/view-workout/[id]", params: { id: activity.workoutId } });
                                            }
                                        }}
                                        style={activityStyles.activityContentPreviewImageContainer}
                                    >
                                        <OptimizedImageLight
                                            thumbnailUrl={activity.workoutThumbnailUrl}
                                            originalUrl={activity.workoutThumbnailUrl}
                                            style={activityStyles.activityContentPreviewImageStyle}
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    }).filter(Boolean)}
                </View>
            </View>
        );
    }

    function renderActivity() {
        const isCompletelyLoading = loadingRequests && loadingActivities && followRequests.length === 0 && otherActivities.length === 0;
        const isCompletelyEmpty = !loadingRequests && !loadingActivities && followRequests.length === 0 && otherActivities.length === 0;

        if (isCompletelyLoading) {
            return (
                <View style={activityStyles.emptyStateContainer}>
                    <ActivityIndicator size="large" color={ACCENT_COLOR} />
                    <Text style={activityStyles.loadingText}>Checking your Pulse...</Text>
                </View>
            );
        }

        if (isCompletelyEmpty) {
            return (
                <View style={activityStyles.emptyStateContainer}>
                    <MaterialIcons name="notifications-none" size={64} color="#888888" style={activityStyles.emptyStateIcon} />
                    <Text style={activityStyles.emptyStateTitle}>Your Pulse is quiet</Text>
                    <Text style={activityStyles.emptyStateSubtitle}>
                        Connect with friends and start sharing your fitness journey to see activity here
                    </Text>
                </View>
            );
        }

        return (
            <ScrollView 
                contentContainerStyle={activityStyles.scrollViewContentContainer}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={ACCENT_COLOR}
                        colors={[ACCENT_COLOR]}
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {renderFollowRequests()}
                {renderOtherActivity()}
            </ScrollView>
        );
    }

    return (
        <View style={[globalStyles.container, { justifyContent: 'flex-start' }]}>
            {/* Enhanced Header */}
            <View style={activityStyles.headerGradient}>
                <View style={activityStyles.headerContainer}>
                    <TouchableOpacity 
                        onPress={() => router.back()} 
                        style={activityStyles.backButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-back" size={20} color="#fff" />
                    </TouchableOpacity>
                    <View style={activityStyles.titleContainer}>
                        <Text style={activityStyles.headerTitle}>Pulse</Text>
                        <Text style={activityStyles.headerSubtitle}>Stay connected</Text>
                    </View>
                    <TouchableOpacity 
                        style={activityStyles.settingsButton}
                        activeOpacity={0.7}
                    >
                        <MaterialIcons name="more-vert" size={18} color="#c0c0c0" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Main Content */}
            <View style={activityStyles.contentContainer}>
                {renderActivity()}
            </View>
        </View>
    );
}

const activityStyles = StyleSheet.create({
    // Loading states
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        backgroundColor: 'rgba(255, 45, 85, 0.05)',
        borderRadius: 12,
        marginHorizontal: 16,
        marginVertical: 8,
    },
    loadingText: {
        color: '#fff',
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
    },

    // Section headers
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginTop: 10,
        position: 'relative',
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 0,
        paddingVertical: 0,
        borderRadius: 0,
        backgroundColor: 'transparent',
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 6,
        letterSpacing: 0.3,
    },
    badgeContainer: {
        backgroundColor: ACCENT_COLOR,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        ...Platform.select({
            ios: {
                shadowColor: ACCENT_COLOR,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.5,
                shadowRadius: 4,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    badgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },

    // Activity container
    activityView: {
        marginHorizontal: 16,
        marginBottom: 25,
        backgroundColor: 'rgba(30, 30, 30, 0.95)',
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.4,
                shadowRadius: 20,
            },
            android: {
                elevation: 15,
            },
        }),
    },

    // Activity elements
    activityElement: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        position: 'relative',
    },
    elementBorder: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    mainRowContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },

    // Profile images
    activityPostImage: {
        marginRight: 12,
        position: 'relative',
    },
    profileImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        ...Platform.select({
            ios: {
                shadowColor: ACCENT_COLOR,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: -1,
        right: -1,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: ACCENT_COLOR,
        borderWidth: 2,
        borderColor: '#1a1a1a',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Text content
    textContent: {
        flex: 1,
        justifyContent: 'center',
    },
    activityDescription: {
        color: '#fff',
        fontSize: 15,
        lineHeight: 20,
        flexShrink: 1,
        fontWeight: '500',
    },
    usernameText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
    actionText: {
        color: '#e8e8e8',
        fontSize: 15,
        fontWeight: '400',
    },
    timeText: {
        color: '#888',
        fontSize: 12,
        marginTop: 4,
        fontWeight: '600',
    },

    // Action buttons
    actionButtonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
        gap: 6,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        minWidth: 70,
        justifyContent: 'center',
    },
    acceptButton: {
        backgroundColor: ACCENT_COLOR,
        borderWidth: 0,
        ...Platform.select({
            ios: {
                shadowColor: ACCENT_COLOR,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    acceptButtonText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 13,
        marginLeft: 4,
    },
    ignoreButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    ignoreButtonText: {
        color: '#e0e0e0',
        fontWeight: '700',
        fontSize: 13,
        marginLeft: 4,
    },
    disabledButton: {
        opacity: 0.5,
        transform: [{ scale: 0.95 }],
    },

    // Legacy styles for other activities
    activityImageStyle: {
        width: 50, 
        height: 50, 
        borderRadius: 25,        
    },
    activityUserImageStyle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        ...Platform.select({
            ios: {
                shadowColor: ACCENT_COLOR,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
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
        width: 40,
        height: 40,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        ...Platform.select({
            ios: {
                shadowColor: ACCENT_COLOR,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.3,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    activityUsernameText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },

    // Scroll view
    scrollViewContentContainer: {
        paddingBottom: 100,
    },

    // Header styles
    headerGradient: {
        paddingTop: Platform.OS === 'ios' ? 0 : 0,
        paddingBottom: 12,
        backgroundColor: 'transparent',
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 6,
        marginTop: 0,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 20,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        color: '#888',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 2,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    settingsButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    contentContainer: {
        flex: 1,
    },

    // Empty states
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        paddingHorizontal: 40,
        backgroundColor: 'rgba(255, 45, 85, 0.02)',
        marginHorizontal: 20,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 45, 85, 0.1)',
    },
    emptyStateIcon: {
        marginBottom: 24,
        opacity: 0.7,
    },
    emptyStateTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    emptyStateSubtitle: {
        color: '#b8b8b8',
        fontSize: 17,
        textAlign: 'center',
        lineHeight: 25,
        fontWeight: '500',
    },

    // Empty requests state
    emptyRequestsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(255, 45, 85, 0.05)',
        marginHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 45, 85, 0.1)',
    },
    emptyRequestsText: {
        color: '#b8b8b8',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 8,
        fontWeight: '500',
    },
});