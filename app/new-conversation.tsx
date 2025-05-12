import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface UserData {
    id: string;
    username: string;
    profileImageUrl?: string;
}

export default function NewConversationScreen() {
    const { currentUser } = useAuth();
    const router = useRouter();
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(false);

    const searchUsers = useCallback(async () => {
        if (!searchText.trim()) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
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
            setLoading(false);
        }
    }, [searchText, currentUser]);

    const startConversation = useCallback(async (selectedUserId: string, selectedUsername: string, selectedProfileImage?: string) => {
        if (!currentUser || selectedUserId === currentUser.uid) return;

        setLoading(true);
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
                        [currentUser.uid]: currentUser.username || 'Unknown', 
                        [selectedUserId]: selectedUsername || 'Unknown', 
                    },
                    participantProfileImages: {
                        [currentUser.uid]: currentUser.profileImageUrl || '', 
                        [selectedUserId]: selectedProfileImage || '', 
                    },
                };

                await addDoc(collection(db, 'conversations'), newConversationData);

                // Link the conversation to both users
                const userConversationsRef1 = collection(db, `users/${currentUser.uid}/conversations`);
                await addDoc(userConversationsRef1, {
                    conversationId: conversationId,
                    otherParticipantId: selectedUserId,
                    otherParticipantUsername: selectedUsername || 'Unknown', 
                    otherParticipantProfileImage: selectedProfileImage || '', 
                });

                const userConversationsRef2 = collection(db, `users/${selectedUserId}/conversations`);
                await addDoc(userConversationsRef2, {
                    conversationId: conversationId,
                    otherParticipantId: currentUser.uid,
                    otherParticipantUsername: currentUser.username || 'Unknown', 
                    otherParticipantProfileImage: currentUser.profileImageUrl || '', 
                });

                // Navigate to the new conversation
                router.push(`/chat/${conversationId}`);
            }
        } catch (error) {
            console.error("Error starting conversation: ", error);
        } finally {
            setLoading(false);
        }
    }, [currentUser, router]);

    const generateConversationId = (userId1: string, userId2: string): string => {
        const sortedIds = [userId1, userId2].sort();
        return `${sortedIds[0]}_${sortedIds[1]}`;
    };

    const renderItem = ({ item }: { item: UserData }) => (
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
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search for users..."
                    placeholderTextColor="#888"
                    value={searchText}
                    onChangeText={setSearchText}
                    onSubmitEditing={searchUsers}
                />
                <TouchableOpacity style={styles.searchButton} onPress={searchUsers}>
                    <Ionicons name="search" size={24} color="white" />
                </TouchableOpacity>
            </View>
            {loading ? (
                <View style={styles.centered}><ActivityIndicator size="large" color="#fff" /></View>
            ) : searchResults.length === 0 ? (
                <View style={styles.centered}><Text style={styles.emptyText}>No users found.</Text></View>
            ) : (
                <FlatList
                    data={searchResults}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    style={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
        padding: 10,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        marginTop: 30,
    },
    searchInput: {
        flex: 1,
        backgroundColor: '#333',
        color: 'white',
        padding: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    searchButton: {
        backgroundColor: '#555',
        padding: 10,
        borderRadius: 5,
    },
    list: {
        flex: 1,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    profilePic: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 15,
    },
    username: {
        color: 'white',
        fontSize: 16,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: 'gray',
        fontSize: 16,
    },
});