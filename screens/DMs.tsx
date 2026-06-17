import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, TextInput, Alert, TouchableHighlight, RefreshControl, KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getOptimalImageUrl } from '@/utils/imageUtils';
import { useBlockEnforcement } from '@/utils/blockUtils';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebaseConfig';
import MessageRequestItem from '@/components/MessageRequestItem';
import { ACCENT_COLOR } from '@/constants/Colors';
import { useDMs } from '@/features/messaging/ui/useDMs';
import { Conversation } from '@/features/messaging/domain/Conversation';
import GlassBackButton from '@/components/GlassBackButton';
import BottomActionMenu, { BottomActionMenuItem } from '@/components/BottomActionMenu';

const ChatItem = ({
    item,
    onLongPress,
}: {
    item: Conversation;
    onLongPress: (item: Conversation) => void;
}) => {
    const router = useRouter();
    const [isPressed, setIsPressed] = useState(false);

    const aiIcon = require('@/assets/images/icon.png');
    const fallback = require('@/assets/images/profile-icon.png');

    const remoteUrl = getOptimalImageUrl(
        item.otherParticipantThumbnailUrl,
        item.otherParticipantProfileImage
    );

    const source = item.isPinnedAI
        ? aiIcon
        : remoteUrl
        ? { uri: remoteUrl }
        : fallback;

    const navigateToChat = () => {
        router.push(`/chat/${item.id}`);
    };

    return (
        <TouchableHighlight
            onPress={navigateToChat}
            onLongPress={() => !item.isPinnedAI && onLongPress(item)}
            delayLongPress={500}
            underlayColor="#222"
            onShowUnderlay={() => setIsPressed(true)}
            onHideUnderlay={() => setIsPressed(false)}
        >
            <View style={[
                styles.itemContainer,
                isPressed ? styles.pressedItem : null
            ]}>
                <Image
                    source={source}
                    style={styles.profilePic}
                />
                <View style={styles.textContainer}>
                    <View style={styles.usernameContainer}>
                        {item.isUnread && <View style={styles.unreadDot} />}
                        <Text style={styles.username}>{item.otherParticipantUsername || "Chat"}</Text>
                    </View>
                    <Text
                        style={[
                            styles.lastMessage,
                            item.isUnread && styles.unreadLastMessage
                        ]}
                        numberOfLines={1}
                    >
                        {item.lastMessageText || "No messages yet"}
                    </Text>
                </View>
                <View style={styles.metaContainer}>
                    <View style={styles.indicatorRow}>
                        {item.isPinned && <Ionicons name="pin" size={14} color="#8E8E93" style={styles.indicator} />}
                        {item.isMuted && <Ionicons name="notifications-off" size={14} color="#8E8E93" style={styles.indicator} />}
                    </View>
                    {item.lastMessageAt && (
                        <Text style={styles.time}>
                            {item.lastMessageAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    )}
                </View>
            </View>
        </TouchableHighlight>
    );
};

export default function DMs() {
    const { currentUser } = useAuth();
    const { canInteractWithUser } = useBlockEnforcement();
    const router = useRouter();

    const {
        conversations,
        loading,
        refreshing,
        refresh,
        deleteConversation,
        togglePin,
        toggleMute,
        messageRequests,
        loadingRequests,
        rawRecipientResults,
        searchLoading,
        searchRecipients,
        clearRecipientSearch,
        findOrCreateConversation,
    } = useDMs();

    const [isSearching, setIsSearching] = useState(false);
    const [searchText, setSearchText] = useState('');
    const searchInputRef = useRef<TextInput>(null);
    const [actionMenuVisible, setActionMenuVisible] = useState(false);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

    const handleConversationLongPress = useCallback((item: Conversation) => {
        setSelectedConversation(item);
        setActionMenuVisible(true);
    }, []);

    const actionMenuItems: BottomActionMenuItem[] = selectedConversation ? [
        {
            icon: selectedConversation.isPinned ? 'pin-outline' : 'pin',
            label: selectedConversation.isPinned ? 'Unpin' : 'Pin',
            sublabel: selectedConversation.isPinned ? 'Remove from top of list' : 'Keep at top of list',
            color: '#FFD60A',
            backgroundColor: 'rgba(255, 214, 10, 0.22)',
            onPress: () => togglePin(selectedConversation.id),
        },
        {
            icon: selectedConversation.isMuted ? 'notifications' : 'notifications-off',
            label: selectedConversation.isMuted ? 'Unmute' : 'Mute',
            sublabel: selectedConversation.isMuted ? 'Turn on notifications' : 'Turn off notifications',
            color: '#0A84FF',
            backgroundColor: 'rgba(10, 132, 255, 0.22)',
            onPress: () => toggleMute(selectedConversation.id),
        },
        {
            icon: 'trash',
            label: 'Delete',
            sublabel: 'Remove this conversation',
            color: '#FF453A',
            backgroundColor: 'rgba(255, 69, 58, 0.22)',
            destructive: true,
            onPress: () => {
                Alert.alert(
                    'Delete Conversation',
                    `Are you sure you want to delete this conversation with ${selectedConversation.otherParticipantUsername || 'User'}?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', onPress: () => deleteConversation(selectedConversation.id), style: 'destructive' },
                    ]
                );
            },
        },
    ] : [];

    // Apply block enforcement filter to raw search results before display.
    const searchResults = rawRecipientResults.filter(user =>
        canInteractWithUser(user.id, user.blockedUsers)
    );

    const handleComposePress = () => {
        setIsSearching(true);
        setTimeout(() => {
            searchInputRef.current?.focus();
        }, 0);
    };

    // Debounce the search input.
    useEffect(() => {
        const timer = setTimeout(() => {
            searchRecipients(searchText);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchText, searchRecipients]);

    const handleApproveRequest = async (req: any) => {
        try {
            const approveMessageRequest = httpsCallable(functions, 'approveMessageRequest');
            await approveMessageRequest({
                requestId: req.id,
                conversationId: req.conversationId,
            });
            // Refresh conversations to show the new chat.
            await refresh();
            Alert.alert("Request Approved", "You can now chat with this user.");
        } catch (error) {
            console.error("Error approving request:", error);
            Alert.alert("Error", "Failed to approve request.");
        }
    };

    const handleIgnoreRequest = async (req: any) => {
        try {
            const ignoreMessageRequest = httpsCallable(functions, 'ignoreMessageRequest');
            await ignoreMessageRequest({ requestId: req.id });
        } catch (error) {
            console.error("Error ignoring request:", error);
            Alert.alert("Error", "Failed to ignore request.");
        }
    };

    const startConversation = useCallback(
        async (selectedUserId: string, selectedUsername: string, selectedProfileImage?: string) => {
            if (!currentUser || selectedUserId === currentUser.uid) return;
            try {
                const conversationId = await findOrCreateConversation(
                    selectedUserId,
                    selectedUsername,
                    selectedProfileImage
                );
                router.push(`/chat/${conversationId}`);
            } catch (error) {
                console.error("Error starting conversation:", error);
            } finally {
                setIsSearching(false);
                setSearchText('');
                clearRecipientSearch();
            }
        },
        [currentUser, router, findOrCreateConversation, clearRecipientSearch]
    );

    const renderItem = ({ item }: { item: Conversation }) => (
        <ChatItem
            item={item}
            onLongPress={handleConversationLongPress}
        />
    );

    const renderSearchItem = ({ item }: { item: typeof searchResults[0] }) => {
        const source = { uri: getOptimalImageUrl(item.profileThumbnailUrl, item.profileImageUrl) };
        return (
            <TouchableOpacity
                style={styles.userItem}
                onPress={() => startConversation(item.id, item.username, item.profileThumbnailUrl || item.profileImageUrl)}
            >
                <Image source={source} style={styles.profilePic} />
                <Text style={styles.username}>{item.username}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
            <View style={styles.header}>
                <GlassBackButton />
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
                            autoCorrect={false}
                            autoCapitalize="none"
                            autoComplete="off"
                            spellCheck={false}
                        />
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                                setIsSearching(false);
                                setSearchText('');
                                clearRecipientSearch();
                            }}
                        >
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
                            onRefresh={refresh}
                            colors={['#d466ff']}
                            tintColor="#d466ff"
                            progressBackgroundColor="#1a0d26"
                        />
                    }
                />
            )}
            <BottomActionMenu
                visible={actionMenuVisible}
                onClose={() => setActionMenuVisible(false)}
                items={actionMenuItems}
            />
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
        backgroundColor: '#555',
    },
    textContainer: {
        flex: 1,
    },
    username: {
        fontWeight: 'bold',
        color: 'white',
        fontSize: 16,
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
        fontSize: 14,
    },
    unreadLastMessage: {
        color: 'white',
        fontWeight: 'bold',
    },
    metaContainer: {
        alignItems: 'flex-end',
        marginLeft: 8,
    },
    indicatorRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    indicator: {
        marginLeft: 4,
    },
    time: {
        fontSize: 12,
        color: 'gray',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
    emptyText: {
        color: 'gray',
        fontSize: 16,
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
        backgroundColor: ACCENT_COLOR,
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
