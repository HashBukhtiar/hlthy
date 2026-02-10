import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebaseConfig';
import { collection, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';

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
    id: string; // conversationId
}

export default function ConversationsListScreen() {
    const { currentUser } = useAuth();
    const router = useRouter();
    const [conversations, setConversations] = useState<CombinedConversationItem[]>([]);
    const [loading, setLoading] = useState(true);

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
            
            fetchedConversations.sort((a, b) => {
                const timeA = a.lastMessageAt?.toDate().getTime() || 0;
                const timeB = b.lastMessageAt?.toDate().getTime() || 0;
                return timeB - timeA;
            });

            setConversations(fetchedConversations);
        } catch (error) {
            console.error("Error fetching conversations: ", error);
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    const renderItem = ({ item }: { item: CombinedConversationItem }) => (
        <TouchableOpacity 
            style={styles.itemContainer} 
            onPress={() => router.push(`/chat/${item.id}`)}
        >
            <Image 
                source={item.otherParticipantProfileImage ? { uri: item.otherParticipantProfileImage } : require('@/assets/images/profile-icon.png')} 
                style={styles.profilePic} 
            />
            <View style={styles.textContainer}>
                <Text style={styles.username}>{item.otherParticipantUsername || "Chat"}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>{item.lastMessageText || "No messages yet"}</Text>
            </View>
            {item.lastMessageAt && <Text style={styles.time}>{item.lastMessageAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>}
        </TouchableOpacity>
    );

    if (loading) {
        return <View style={styles.centered}><ActivityIndicator size="large" color="#fff" /></View>;
    }

    if (conversations.length === 0) {
        return <View style={styles.centered}><Text style={styles.emptyText}>No conversations yet.</Text></View>;
    }

    return (
        <FlatList
            data={conversations}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            style={{backgroundColor: 'black'}}
        />
    );
}

const styles = StyleSheet.create({
    itemContainer: { flexDirection: 'row', padding: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#333' },
    profilePic: { width: 50, height: 50, borderRadius: 25, marginRight: 15, backgroundColor: '#555' },
    textContainer: { flex: 1 },
    username: { fontWeight: 'bold', color: 'white', fontSize: 16 },
    lastMessage: { color: 'gray', fontSize: 14 },
    time: { fontSize: 12, color: 'gray', marginLeft: 5 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' },
    emptyText: { color: 'gray', fontSize: 16 }
});