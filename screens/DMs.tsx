import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebaseConfig';
import { collection, getDocs, doc, getDoc, Timestamp, query, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

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
    participantUsernames?: { [key: string]: string };
    participantProfileImages?: { [key: string]: string };
    isPinnedAI?: boolean;
}

interface CombinedConversationItem extends UserConversationData, ConversationMetadata {
    id: string;
    isPinnedAI?: boolean; // Add isPinnedAI property
}

interface UserData {
    id: string;
    username: string;
    profileImageUrl?: string;
}

export default function DMs() {
    const { currentUser } = useAuth();
    const router = useRouter();
    const [conversations, setConversations] = useState<CombinedConversationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState<UserData[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const searchInputRef = useRef<TextInput>(null);

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
            const userConversationsRef = collection(db, `users/${currentUser.uid}/conversations`);
            const userConversationsSnap = await getDocs(userConversationsRef);

            const combinedDataPromises = userConversationsSnap.docs.map(async (userConvDoc) => {
                const userConvData = userConvDoc.data() as UserConversationData;
                const conversationId = userConvDoc.id;

                const conversationMetaRef = doc(db, 'conversations', conversationId);
                const conversationMetaSnap = await getDoc(conversationMetaRef);

                if (conversationMetaSnap.exists()) {
                    const conversationMetaData = conversationMetaSnap.data() as ConversationMetadata;
                    return {
                        id: conversationId,
                        ...userConvData,
                        ...conversationMetaData,
                    };
                }
                return null;
            });

            const fetchedConversations = (await Promise.all(combinedDataPromises))
                .filter(conv => conv !== null) as CombinedConversationItem[];

            // Create AI conversation object
            const aiConversation: CombinedConversationItem = {
                id: 'ai_conversation',
                isPinnedAI: true,
                lastMessageText: 'Ask me anything!',
            };

            // Prepend AI conversation to the list
            setConversations([aiConversation, ...fetchedConversations]);
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
                where('username', '<=', searchText.toLowerCase() + '\uf8ff')
            );

            const querySnapshot = await getDocs(q);
            const users: UserData[] = [];
            querySnapshot.forEach(doc => {
                if (doc.id !== currentUser?.uid) {
                    users.push({
                        id: doc.id,
                        username: doc.data().username,
                        profileImageUrl: doc.data().profileImageUrl,
                    });
                }
            });
            setSearchResults(users);
        } catch (error) {
            console.error("Error searching users: ", error);
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    }, [searchText, currentUser]);

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
                    lastMessageText: '', // Initialize as empty
                    participantUsernames: {
                        [currentUser.uid]: currentUser.displayName || currentUser.email || 'Current User', // Ensure username is available
                        [selectedUserId]: selectedUsername || 'User',
                    },
                    participantProfileImages: {
                        [currentUser.uid]: currentUser.photoURL || '',
                        [selectedUserId]: selectedProfileImage || '',
                    },
                    isPinnedAI: false, // Explicitly set for non-AI chats
                };

                await setDoc(conversationRef, newConversationData); // Use setDoc to create the main conversation with the generated ID

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

    const renderItem = ({ item }: { item: CombinedConversationItem }) => (
        <TouchableOpacity
            style={[
                styles.itemContainer,
                item.isPinnedAI ? styles.aiChatItem : null
            ]}
            onPress={() => {
                router.push(`/chat/${item.id}`);
            }}
        >
            <Image
                source={item.isPinnedAI ? require('@/assets/images/icon.png') : item.otherParticipantProfileImage ? { uri: item.otherParticipantProfileImage } : require('@/assets/images/profile-icon.png')}
                style={styles.profilePic}
            />
            <View style={styles.textContainer}>
                <Text style={styles.username}>{item.isPinnedAI ? "hlthy AI" : item.otherParticipantUsername || "Chat"}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessageText || "No messages yet"}</Text>
            </View>
            {item.lastMessageAt && <Text style={styles.time}>{item.lastMessageAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>}
        </TouchableOpacity>
    );

    const renderSearchItem = ({ item }: { item: UserData }) => (
        <TouchableOpacity
            style={styles.userItem}
            onPress={() => startConversation(item.id, item.username, item.profileImageUrl)}
        >
            <Image
                source={item.profileImageUrl ? { uri: item.profileImageUrl } : require('@/assets/images/profile-icon.png')}
                style={styles.profilePic}
            />
            <Text style={styles.username}>{item.username}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Messages</Text>
                <TouchableOpacity style={styles.composeButton} onPress={handleComposePress}>
                    <Ionicons name="pencil-sharp" size={30} color="white" />
                </TouchableOpacity>
            </View>
            {isSearching ? (
                <View style={styles.searchContainer}>
                    <TextInput
                        ref={searchInputRef}
                        style={styles.searchInput}
                        placeholder="Search for users..."
                        placeholderTextColor="#888"
                        value={searchText}
                        onChangeText={setSearchText}
                        onSubmitEditing={searchUsers}
                    />
                    <TouchableOpacity style={styles.cancelButton} onPress={() => {
                        setIsSearching(false);
                        setSearchText('');
                        setSearchResults([]);
                    }}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            ) : null}
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
    },
    itemContainer: {
        flexDirection: 'row',
        padding: 15,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#333'

    },
    profilePic: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
        backgroundColor: '#555'

    },
    textContainer: { flex: 1 },
    username: {
        fontWeight: 'bold',
        color: 'white',
        fontSize: 16

    },
    lastMessage: {
        color: 'gray',
        fontSize: 14

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
        borderColor: '#d466ff', 
        borderWidth: 2, 
    },
});