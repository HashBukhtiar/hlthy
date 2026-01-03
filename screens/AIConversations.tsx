import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface AIConversation {
    id: string;
    title: string;
    lastMessage: string;
    timestamp: Date;
}

export default function AIConversations() {
    const { currentUser } = useAuth();
    const router = useRouter();
    
    // For now, we'll use a default conversation. In the future, you can fetch multiple AI conversations from Firestore
    const [conversations, setConversations] = useState<AIConversation[]>([
        {
            id: currentUser ? `${currentUser.uid}_ai_conversation` : 'default_ai',
            title: 'hlthy AI',
            lastMessage: 'Ask me anything about fitness and health!',
            timestamp: new Date(),
        }
    ]);

    const handleNewChat = () => {
        // TODO: Create a new AI conversation
        // For now, just navigate to the default AI chat
        if (currentUser) {
            const aiConversationId = `${currentUser.uid}_ai_conversation`;
            router.push(`/chat/${aiConversationId}`);
        }
    };

    const renderItem = ({ item }: { item: AIConversation }) => (
        <TouchableOpacity 
            style={styles.itemContainer} 
            onPress={() => router.push(`/chat/${item.id}`)}
        >
            <View style={styles.iconContainer}>
                <Ionicons name="sparkles" size={28} color="#d466ff" />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.lastMessage} numberOfLines={1}>
                    {item.lastMessage}
                </Text>
            </View>
            {item.timestamp && (
                <Text style={styles.time}>
                    {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>AI Conversations</Text>
                <TouchableOpacity style={styles.composeButton} onPress={handleNewChat}>
                    <Ionicons name="add" size={32} color="white" />
                </TouchableOpacity>
            </View>
            
            <FlatList
                data={conversations}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="sparkles-outline" size={64} color="#666" />
                        <Text style={styles.emptyText}>No AI conversations yet</Text>
                        <TouchableOpacity style={styles.startButton} onPress={handleNewChat}>
                            <Text style={styles.startButtonText}>Start New Chat</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        paddingVertical: 5,
        paddingHorizontal: 15,
    },
    headerText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
    },
    composeButton: {
        padding: 5,
    },
    listContent: {
        flexGrow: 1,
    },
    itemContainer: {
        flexDirection: 'row',
        padding: 15,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        backgroundColor: '#1a0d26',
        borderLeftWidth: 3,
        borderLeftColor: '#d466ff',
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#2a1a3a',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontWeight: 'bold',
        color: 'white',
        fontSize: 16,
        marginBottom: 4,
    },
    lastMessage: {
        color: '#ccc',
        fontSize: 14,
    },
    time: {
        fontSize: 12,
        color: 'gray',
        marginLeft: 5,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        color: 'gray',
        fontSize: 16,
        marginTop: 20,
        marginBottom: 30,
    },
    startButton: {
        backgroundColor: '#d466ff',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
    },
    startButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
