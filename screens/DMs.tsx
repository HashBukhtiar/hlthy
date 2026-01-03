import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, TextInput, Alert, TouchableHighlight, RefreshControl, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebaseConfig';
import { collection, getDocs, doc, updateDoc, addDoc, getDoc, Timestamp, query, where, limit, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getOptimalImageUrl } from '@/utils/imageUtils';
import { useBlockEnforcement } from '@/utils/blockUtils';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebaseConfig';
import MessageRequestItem from '@/components/MessageRequestItem';

interface UserConversationData {
    // Fields from /users/{userId}/conversations/{conversationId}
    lastRead?: Timestamp;
    otherParticipantId?: string;
    otherParticipantUsername?: string;
    otherParticipantProfileImage?: string;
}

interface ConversationMetadata {
    // Fields from /conversations/{conversationId}
    participants?: string[];
    lastMessageAt?: Timestamp;
    lastMessageText?: string;
    lastMessageSenderId?: string;
    participantUsernames?: { [key: string]: string };
    participantProfileImages?: { [key: string]: string };
    isPinnedAI?: boolean;
}

interface CombinedConversationItem extends UserConversationData, ConversationMetadata {
    id: string;
    isPinnedAI?: boolean;
    isUnread?: boolean;
    otherParticipantThumbnailUrl?: string;
}

interface UserData {
    id: string;
    username: string;
    profileImageUrl?: string;
    profileThumbnailUrl?: string;
}

const ChatItem = ({
    item,
    setConversations,
    currentUser
}: {
    item: CombinedConversationItem,
    setConversations: React.Dispatch<React.SetStateAction<CombinedConversationItem[]>>,
    currentUser: any
}) => {
    const router = useRouter();
    const [isPressed, setIsPressed] = useState(false);

    // static assets
    const aiIcon   = require('@/assets/images/icon.png');
    const fallback = require('@/assets/images/profile-icon.png');

    // pick the best remote URL: full-size first, then thumbnail (or swap if your util is inverted)
    const remoteUrl = getOptimalImageUrl(
        item.otherParticipantThumbnailUrl,
        item.otherParticipantProfileImage
    );

    // build your source prop
    const source = item.isPinnedAI
        ? aiIcon             // pinned AI uses bundled icon
        : remoteUrl
        ? { uri: remoteUrl } // real user → network image
        : fallback;           // fallback → bundled default

    const handleDeleteConversation = async (conversationId: string, username: string) => {
        Alert.alert(
            "Delete Conversation",
            `Are you sure you want to delete this conversation with ${username}?`,
            [
            {
                text: "Cancel",
                style: "cancel"
            },
            {
                text: "Delete",
                onPress: async () => {
                try {
                    if (!currentUser) return;

                    // Delete only the user-specific conversation data
                    const userConvRef = doc(db, `users/${currentUser.uid}/conversations`, conversationId);
                    await deleteDoc(userConvRef);

                    // Update the conversations state to remove the deleted conversation
                    setConversations(prevConversations =>
                    prevConversations.filter(conv => conv.id !== conversationId)
                    );
                } catch (error) {
                    console.error("Error deleting conversation: ", error);
                }
                },
                style: 'destructive',
            }
            ],
            { cancelable: false }
        );
    };

    const handleLongPress = () => {
        if (!item.isPinnedAI) {
            handleDeleteConversation(item.id, item.otherParticipantUsername || 'User');
        }
    };

    const navigateToChat = () => {
        if (item.isPinnedAI) {
            // The AI conversation ID is already in the correct format
            router.push(`/chat/${item.id}`);
        } else {
            router.push(`/chat/${item.id}`);
        }
    };

    return (
        <TouchableHighlight 
            onPress={navigateToChat}
            onLongPress={handleLongPress}
            delayLongPress={500}
            underlayColor="#222"
            onShowUnderlay={() => setIsPressed(true)}
            onHideUnderlay={() => setIsPressed(false)}
        >
            <View style={[
                styles.itemContainer,
                item.isPinnedAI ? styles.aiChatItem : null,
                isPressed ? styles.pressedItem : null
            ]}>
                <Image
                    source={source}
                    style={styles.profilePic}
                />
                <View style={styles.textContainer}>
                    <View style={styles.usernameContainer}>
                        {item.isUnread && !item.isPinnedAI && <View style={styles.unreadDot} />}
                        <Text style={styles.username}>{item.isPinnedAI ? "hlthy AI" : item.otherParticipantUsername || "Chat"}</Text>
                    </View>
                    <Text 
                        style={[
                            styles.lastMessage, 
                            item.isUnread && !item.isPinnedAI && styles.unreadLastMessage
                        ]} 
                        numberOfLines={1}
                    >
                        {item.lastMessageText || "No messages yet"}
                    </Text>
                </View>
                {item.lastMessageAt && <Text style={styles.time}>{item.lastMessageAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>}
            </View>
        </TouchableHighlight>
    );
};

export default function DMs() {
    const { currentUser } = useAuth();
    const { canInteractWithUser } = useBlockEnforcement();
    const router = useRouter();
    const [conversations, setConversations] = useState<CombinedConversationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState<UserData[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const searchInputRef = useRef<TextInput>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [messageRequests, setMessageRequests] = useState<any[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(true);
    
    const handleComposePress = () => {
        setIsSearching(true);
        setTimeout(() => {
            searchInputRef.current?.focus();
        }, 0);
    };

    const fetchConversations = useCallback(async () => {
        if (!currentUser) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // 1. Fetch all of the current user's conversation references
            const userConversationsRef = collection(db, `users/${currentUser.uid}/conversations`);
            const userConversationsSnap = await getDocs(userConversationsRef);
            if (userConversationsSnap.empty) {
                setConversations([]);
                setLoading(false);
                return;
            }

            // 2. Collect all other participant IDs
            const participantIds = new Set<string>();
            userConversationsSnap.docs.forEach(doc => {
                const otherId = doc.data().otherParticipantId;
                if (otherId) participantIds.add(otherId);
            });

            // 3. Fetch all participant profiles in a single batched query
            const profiles: Record<string, UserData> = {};
            if (participantIds.size > 0) {
                const usersQuery = query(collection(db, 'users'), where('__name__', 'in', Array.from(participantIds)));
                const usersSnapshot = await getDocs(usersQuery);
                usersSnapshot.forEach(userDoc => {
                    const data = userDoc.data();
                    profiles[userDoc.id] = {
                        id: userDoc.id,
                        username: data.username,
                        profileImageUrl: data.profileImageUrl,
                        profileThumbnailUrl: data.profileThumbnailUrl,
                    };
                });
            }

            // 4. Fetch conversation metadata and combine with fresh profile data
            const combinedDataPromises = userConversationsSnap.docs.map(async (userConvDoc) => {
                const userConvData = userConvDoc.data() as UserConversationData;
                const conversationId = userConvDoc.id;
                const otherParticipantId = userConvData.otherParticipantId;

                const conversationMetaRef = doc(db, 'conversations', conversationId);
                const conversationMetaSnap = await getDoc(conversationMetaRef);

                if (conversationMetaSnap.exists() && otherParticipantId) {
                    const conversationMetaData = conversationMetaSnap.data() as ConversationMetadata;
                    const otherUserProfile = profiles[otherParticipantId];

                    const isUnread = conversationMetaData.lastMessageAt &&
                                    !conversationMetaData.isPinnedAI &&
                                    conversationMetaData.lastMessageSenderId !== currentUser.uid &&
                                    (!userConvData.lastRead || (userConvData.lastRead && conversationMetaData.lastMessageAt.toMillis() > userConvData.lastRead.toMillis()));

                    return {
                        id: conversationId,
                        ...userConvData,
                        ...conversationMetaData,
                        // Always use the fresh profile data
                        otherParticipantUsername: otherUserProfile?.username || userConvData.otherParticipantUsername || 'User',
                        otherParticipantProfileImage: otherUserProfile?.profileImageUrl,
                        otherParticipantThumbnailUrl: otherUserProfile?.profileThumbnailUrl,
                        isUnread,
                    };
                }
                return null;
            });

            const fetchedConversations = (await Promise.all(combinedDataPromises))
                .filter(conv => conv !== null) as CombinedConversationItem[];

            // Sort conversations: unread first, then by lastMessageAt
            fetchedConversations.sort((a, b) => {
                if (a.isUnread && !b.isUnread) return -1;
                if (!a.isUnread && b.isUnread) return 1;
                if (a.lastMessageAt && b.lastMessageAt) {
                    return b.lastMessageAt.toMillis() - a.lastMessageAt.toMillis();
                }
                if (a.lastMessageAt) return -1;
                if (b.lastMessageAt) return 1;
                return 0;
            });
            
            // Add the AI conversation at the top
            let finalConversations = [...fetchedConversations];
            if (currentUser) {
                const aiConversationId = `${currentUser.uid}_ai_conversation`;
                const aiConversation: CombinedConversationItem = {
                    id: aiConversationId,
                    isPinnedAI: true,
                    lastMessageText: 'Ask me anything about fitness!',
                    // isUnread will be undefined/false by default
                };
                finalConversations = [aiConversation, ...fetchedConversations];
            }

            setConversations(finalConversations);
        } catch (error) {
            console.error("Error fetching conversations: ", error);
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    useFocusEffect(
        React.useCallback(() => {
            fetchConversations();
        }, [fetchConversations])
    );

    useEffect(() => {
        if (!currentUser) {
            setMessageRequests([]);
            setLoadingRequests(false);
            return;
        }
        setLoadingRequests(true);
        const fetchRequests = async () => {
            try {
                const reqSnap = await getDocs(collection(db, "users", currentUser.uid, "messageRequests"));
                setMessageRequests(reqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error fetching message requests:", error);
                setMessageRequests([]);
            } finally {
                setLoadingRequests(false);
            }
        };
        fetchRequests();
    }, [currentUser]);

    const handleApproveRequest = async (req: any) => {
        try {
            const approveMessageRequest = httpsCallable(functions, 'approveMessageRequest');
            await approveMessageRequest({
            requestId: req.id,
            conversationId: req.conversationId,
            });

            // Remove from state
            setMessageRequests(msgs => msgs.filter(m => m.id !== req.id));
            
            // Refresh conversations to show the new chat
            await fetchConversations();
            
            Alert.alert("Request Approved", "You can now chat with this user.");
        } catch (error) {
            console.error("Error approving request:", error);
            Alert.alert("Error", "Failed to approve request.");
        }
    };

    const handleIgnoreRequest = async (req: any) => {
        try {
            const ignoreMessageRequest = httpsCallable(functions, 'ignoreMessageRequest');
            await ignoreMessageRequest({
            requestId: req.id,
            });

            setMessageRequests(msgs => msgs.filter(m => m.id !== req.id));
        } catch (error) {
            console.error("Error ignoring request:", error);
            Alert.alert("Error", "Failed to ignore request.");
        }
    };

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchConversations();
        setRefreshing(false);
    }, [fetchConversations]);

    const searchUsers = useCallback(async () => {
        if (!searchText.trim()) {
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        try {
            const usersRef = collection(db, 'users');
            const q = query(
                usersRef,
                where('username', '>=', searchText.toLowerCase()),
                where('username', '<=', searchText.toLowerCase() + '\uf8ff'),
                limit(20) // Fetch more to account for filtering
            );

            const querySnapshot = await getDocs(q);
            const users: UserData[] = [];
            
            querySnapshot.forEach(doc => {
                const userData = doc.data();
                const userId = doc.id;
                
                // Skip current user and blocked users
                if (userId === currentUser?.uid) return;
                
                // Check if we can interact with this user
                if (canInteractWithUser(userId, userData.blockedUsers)) {
                    users.push({
                        id: userId,
                        username: userData.username,
                        profileImageUrl: userData.profileImageUrl,
                        profileThumbnailUrl: userData.profileThumbnailUrl,
                    });
                }
            });
            
            // Limit final results
            setSearchResults(users.slice(0, 10));
        } catch (error) {
            console.error("Error searching users: ", error);
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    }, [searchText, currentUser, canInteractWithUser]);

    useEffect(() => {
        // Debounce the search function
        const delayDebounceFn = setTimeout(() => {
            searchUsers();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchText, searchUsers]);

    const startConversation = useCallback(async (selectedUserId: string, selectedUsername: string, selectedProfileImage?: string) => {
        if (!currentUser || selectedUserId === currentUser.uid) return;

        setSearchLoading(true);
        try {
            // Check if a conversation already exists between the two users
            const conversationId = generateConversationId(currentUser.uid, selectedUserId);
            const conversationRef = doc(db, 'conversations', conversationId);
            const conversationSnap = await getDoc(conversationRef);

            if (conversationSnap.exists()) {
                // Conversation already exists, navigate to it
                router.push(`/chat/${conversationId}`);
            } else {
                // Create a new conversation
                const newConversationData = {
                    participants: [currentUser.uid, selectedUserId],
                    lastMessageAt: serverTimestamp(),
                    lastMessageText: '',
                    participantUsernames: {
                        [currentUser.uid]: currentUser.displayName || currentUser.email || 'Current User',
                        [selectedUserId]: selectedUsername || 'User',
                    },
                    participantProfileImages: {
                        [currentUser.uid]: currentUser.photoURL || '',
                        [selectedUserId]: selectedProfileImage || '',
                    },
                    isPinnedAI: false,
                };

                await setDoc(conversationRef, newConversationData);
                // Link the conversation to both users using the same conversationId as the document ID
                const userConvDocRef1 = doc(db, `users/${currentUser.uid}/conversations`, conversationId);
                await setDoc(userConvDocRef1, {
                    otherParticipantId: selectedUserId,
                    otherParticipantUsername: selectedUsername || 'User',
                    otherParticipantProfileImage: selectedProfileImage || '',
                    // lastRead: serverTimestamp(), // Optionally initialize lastRead
                });

                const userConvDocRef2 = doc(db, `users/${selectedUserId}/conversations`, conversationId);
                await setDoc(userConvDocRef2, {
                    otherParticipantId: currentUser.uid,
                    otherParticipantUsername: currentUser.displayName || currentUser.email || 'Current User',
                    otherParticipantProfileImage: currentUser.photoURL || '',
                    // lastRead: serverTimestamp(), // Optionally initialize lastRead
                });

                // Navigate to the new conversation
                router.push(`/chat/${conversationId}`);
            }
        } catch (error) {
            console.error("Error starting conversation: ", error);
        } finally {
            setSearchLoading(false);
            setIsSearching(false);
            setSearchText('');
            setSearchResults([]);
        }
    }, [currentUser, router]);

    const generateConversationId = (userId1: string, userId2: string): string => {
        const sortedIds = [userId1, userId2].sort();
        return `${sortedIds[0]}_${sortedIds[1]}`;
    };

    const renderItem = ({ item }: { item: CombinedConversationItem }) => {
        return (
            <ChatItem
                item={item}
                setConversations={setConversations}
                currentUser={currentUser}
            />
        );
    };

    const renderSearchItem = ({ item }: { item: UserData }) => {
        const source = { uri: getOptimalImageUrl(item.profileThumbnailUrl, item.profileImageUrl) };

        return (
            <TouchableOpacity
                style={styles.userItem}
                onPress={() => startConversation(item.id, item.username, item.profileThumbnailUrl || item.profileImageUrl)}
            >
                <Image
                    source={source}
                    style={styles.profilePic}
                />
                <Text style={styles.username}>{item.username}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerText}>Messages</Text>
                <TouchableOpacity style={styles.composeButton} onPress={handleComposePress}>
                    <Ionicons name="pencil-sharp" size={30} color="white" />
                </TouchableOpacity>
            </View>
            {isSearching ? (
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={60}
                >
                    <View style={styles.searchContainer}>
                        <TextInput
                            ref={searchInputRef}
                            style={styles.searchInput}
                            placeholder="Search for users..."
                            placeholderTextColor="#888"
                            value={searchText}
                            onChangeText={setSearchText}
                            onSubmitEditing={searchUsers}
                            autoCorrect={false}
                            autoCapitalize="none"
                            autoComplete="off"
                            spellCheck={false}
                        />
                        <TouchableOpacity style={styles.cancelButton} onPress={() => {
                            setIsSearching(false);
                            setSearchText('');
                            setSearchResults([]);
                        }}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            ) : null}
            {(loadingRequests && !messageRequests.length) ? (
                <View style={styles.centered}><ActivityIndicator size="small" color="#fff" /></View>
                ) : messageRequests.length > 0 && (
                <View style={{ padding: 16 }}>
                    <View style={styles.requestsHeader}>
                    <Ionicons name="mail-outline" size={20} color="#4CD964" />
                    <Text style={styles.requestsHeaderText}>Message Requests</Text>
                    <View style={styles.requestsBadge}>
                        <Text style={styles.requestsBadgeText}>{messageRequests.length}</Text>
                    </View>
                    </View>
                    {messageRequests.map(req => (
                    <MessageRequestItem
                        key={req.id}
                        request={req}
                        onApprove={() => handleApproveRequest(req)}
                        onIgnore={() => handleIgnoreRequest(req)}
                    />
                    ))}
                </View>
            )}
            {loading ? (
                <View style={styles.centered}><ActivityIndicator size="large" color="#fff" /></View>
            ) : isSearching ? (
                searchLoading ? (
                    <View style={styles.centered}><ActivityIndicator size="large" color="#fff" /></View>
                ) : searchResults.length === 0 ? (
                    <View style={styles.centered}><Text style={styles.emptyText}>No users found.</Text></View>
                ) : (
                    <FlatList
                        data={searchResults}
                        renderItem={renderSearchItem}
                        keyExtractor={(item) => item.id}
                        style={{ backgroundColor: 'black' }}
                    />
                )
            ) : conversations.length === 0 ? (
                <View style={styles.centered}><Text style={styles.emptyText}>No conversations yet.</Text></View>
            ) : (
                <FlatList
                    data={conversations}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    style={{ backgroundColor: 'black' }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            colors={['#d466ff']} 
                            tintColor="#d466ff"
                            progressBackgroundColor="#1a0d26"
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        paddingVertical: 5,
        paddingHorizontal: 10,
    },
    backButton: {
        padding: 5,
        width: 40,
    },
    headerText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
    },
    composeButton: {
        padding: 5,
        width: 40,
    },
    itemContainer: {
        flexDirection: 'row',
        padding: 15,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        backgroundColor: 'black',
    },
    profilePic: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
        backgroundColor: '#555'

    },
    textContainer: { 
        flex: 1 
    },
    username: {
        fontWeight: 'bold',
        color: 'white',
        fontSize: 16
    },
    usernameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF',
        marginRight: 6,
    },
    lastMessage: {
        color: 'gray',
        fontSize: 14
    },
    unreadLastMessage: {
        color: 'white',
        fontWeight: 'bold',
    },
    time: {
        fontSize: 12,
        color: 'gray',
        marginLeft: 5

    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black'

    },
    emptyText: {
        color: 'gray',
        fontSize: 16

    },
    newConversationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    newConversationText: {
        color: 'white',
        fontSize: 16,
        marginLeft: 10,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#333',
        color: 'white',
        padding: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    cancelButton: {
        padding: 10,
    },
    cancelButtonText: {
        color: 'white',
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    aiChatItem: {
        backgroundColor: '#1a0d26',
        borderColor: '#d466ff',
        borderBottomColor: '#d466ff',
        borderWidth: 2,
        borderBottomWidth: 2,
        borderRadius: 10,
        marginVertical: 4,
    },
    swipeActions: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        backgroundColor: 'transparent',
    },
    actionButton: {
        width: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: 'red',
    },
    actionText: {
        color: 'white',
        fontSize: 16,
    },
    pressedItem: {
        backgroundColor: '#222', 
        borderLeftWidth: 3,
    },
    requestsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    requestsHeaderText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
        flex: 1,
    },
    requestsBadge: {
        backgroundColor: '#FF2D55',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        minWidth: 24,
        alignItems: 'center',
    },
    requestsBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
});