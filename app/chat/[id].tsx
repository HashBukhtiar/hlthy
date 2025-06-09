import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ListRenderItem,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { db } from '@/firebaseConfig';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, updateDoc, deleteDoc, getDocs, setDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { sendMessage } from '@/ai/ai_chat';

interface FirestoreMessageData {
  senderId: string;
  text: string;
  createdAt: Timestamp;
  sharedPost?: {
    id: string;
    imageUrl: string | null;
    caption: string;
    authorUsername: string;
  };
  sharedMilestone?: {
    id: string;
    type: string;
    details: {
      exercise?: string;
      value?: number;
      weightUnit?: string;
      reps?: number;
      previousValue?: number;
      improvement?: string;
      newWeight?: number;
      newWeightUnit?: string;
      previousWeight?: number;
      totalLoss?: number;
      percentageLoss?: string;
    };
    username: string;
  };
  sharedWorkout?: {
    id: string;
    title: string;
    coverImageUrl?: string;
    creatorUsername: string;
  };
}

interface Message {
  id: string;
  text: string;
  user: 'user' | 'other' | 'ai';
  createdAt?: Date;
  sharedPost?: {
    id: string;
    imageUrl: string | null;
    caption: string;
    authorUsername: string;
  };
  sharedMilestone?: {
    id: string;
    type: string;
    details: {
      exercise?: string;
      value?: number;
      weightUnit?: string;
      reps?: number;
      previousValue?: number;
      improvement?: string;
      newWeight?: number;
      newWeightUnit?: string;
      previousWeight?: number;
      totalLoss?: number;
      percentageLoss?: string;
    };
    username: string;
  };
  sharedWorkout?: {
    id: string;
    title: string;
    coverImageUrl?: string;
    creatorUsername: string;
  };
  type?: 'message' | 'dateHeader';
}

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = id as string;
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList | null>(null);
  const [chatTitle, setChatTitle] = useState<string>('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [otherParticipantId, setOtherParticipantId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || !conversationId) return;

    const setupConversation = async () => {
      if (conversationId === 'ai_conversation') {
        setChatTitle('hlthy AI');
        setProfileImageUrl(Image.resolveAssetSource(require('@/assets/images/icon.png')).uri);
        setOtherParticipantId(null);
        setMessages([{
          id: 'ai_welcome',
          text: 'Hello! How can I help you today?',
          user: 'ai',
          createdAt: new Date(),
        }]);
        setLoading(false);
      } else {
        // Mark conversation as read for non-AI conversations
        try {
          const userConvRef = doc(db, `users/${currentUser.uid}/conversations`, conversationId);
          const userConvSnap = await getDoc(userConvRef);
          if (userConvSnap.exists()) {
            await updateDoc(userConvRef, {
              lastRead: serverTimestamp()
            });
          } else {
            console.log(`User conversation document users/${currentUser.uid}/conversations/${conversationId} does not exist. Cannot mark as read.`);
          }
        } catch (error) {
          console.error("Error marking conversation as read: ", error);
        }

        setLoading(true);
        const messagesRef = collection(db, "conversations", conversationId, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"));

        const unsubscribeMessages = onSnapshot(q, (querySnapshot) => {
          const fetchedMessages: Message[] = [];
          let currentDate: string | null = null;
          
          querySnapshot.forEach((doc) => {
            const data = doc.data() as FirestoreMessageData;
            const messageDate = data.createdAt?.toDate();
            
            if (messageDate) {
              const formattedDate = messageDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              });
              if (formattedDate !== currentDate) {
                currentDate = formattedDate;
                fetchedMessages.push({
                  id: `date-${messageDate.getTime()}`,
                  text: formattedDate,
                  user: 'other', 
                  type: 'dateHeader'
                });
              }
            }
            
            const message: Message = {
              id: doc.id,
              text: data.text,
              user: data.senderId === currentUser.uid ? 'user' : 'other',
              createdAt: messageDate,
              sharedPost: data.sharedPost,
              sharedWorkout: data.sharedWorkout,
              type: 'message'
            };
            fetchedMessages.push(message);
          });
          
          setMessages(fetchedMessages);
          setLoading(false);
        });

        const conversationRef = doc(db, "conversations", conversationId);
        const unsubscribeConversation = onSnapshot(conversationRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const participantUsernames = data?.participantUsernames;
            const participantProfileImages = data?.participantProfileImages;
            if (participantUsernames) {
              const otherUserId = Object.keys(participantUsernames).find(
                (uid) => uid !== currentUser.uid
              );
              if (otherUserId) {
                setChatTitle(participantUsernames[otherUserId] || 'Chat');
                setOtherParticipantId(otherUserId);
                
                let profileImg = null;
                if (participantProfileImages && participantProfileImages[otherUserId]) {
                  profileImg = participantProfileImages[otherUserId];
                }
                
                if (!profileImg || profileImg === '') {
                  const userRef = doc(db, 'users', otherUserId);
                  getDoc(userRef).then(userDoc => {
                    if (userDoc.exists() && userDoc.data().profileImageUrl) {
                      setProfileImageUrl(userDoc.data().profileImageUrl);
                      if (participantProfileImages) {
                        participantProfileImages[otherUserId] = userDoc.data().profileImageUrl;
                        updateDoc(conversationRef, {
                          participantProfileImages: participantProfileImages
                        }).catch(e => console.log("Error updating profile image in conversation:", e));
                      }
                    }
                  }).catch(err => console.error("Error fetching user data:", err));
                } else {
                  setProfileImageUrl(profileImg);
                }
              } else {
                setChatTitle('Chat'); setProfileImageUrl(null); setOtherParticipantId(null);
              }
            } else {
              setChatTitle('Chat'); setProfileImageUrl(null); setOtherParticipantId(null);
            }
          } else {
             // Conversation doc might not exist if it was deleted from the main collection
             // but the user still has a reference in their users/{uid}/conversations subcollection.
             console.warn(`Conversation document conversations/${conversationId} does not exist.`);
             setChatTitle('Chat Deleted');
             setProfileImageUrl(null);
             setOtherParticipantId(null);
             setMessages([]);
          }
        });
        
        return () => {
          unsubscribeMessages();
          unsubscribeConversation();
        };
      }
    };

    setupConversation();

  }, [currentUser, conversationId]);

  useEffect(() => {
    if (messages.length > 0 && !loading && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 200);
    }
  }, [messages, loading]);

  const handleSend = async () => {
    Keyboard.dismiss();
    if (!input.trim() || !currentUser || !conversationId) return;

    const textToSend = input.trim();

    const newMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      user: 'user', 
      createdAt: new Date(),
    };

    setInput('');
    setMessages(previousMessages => [...previousMessages, newMessage]);

    if (conversationId === 'ai_conversation') {
      // AI conversation handling
      try {
        const aiResponse = await sendMessage(textToSend);
        const aiMessage: Message = {
          id: Date.now().toString(), 
          text: aiResponse,
          user: 'ai',
          createdAt: new Date(),
        };
        setMessages(prevMessages => [...prevMessages, aiMessage]);
      } catch (error) {
        console.error('Error sending message to AI:', error);
      }
    } else {
      try {
        const conversationRef = doc(db, "conversations", conversationId);
        const conversationSnap = await getDoc(conversationRef);
        
        if (!conversationSnap.exists()) {
          console.log("Conversation document not found, recreating...");
          const userConvRef = doc(db, `users/${currentUser.uid}/conversations`, conversationId);
          const userConvSnap = await getDoc(userConvRef);
          
          if (userConvSnap.exists()) {
            const userData = userConvSnap.data();
            const otherUserId = userData.otherParticipantId;
            
            if (otherUserId) {
              const otherUserRef = doc(db, 'users', otherUserId);
              const otherUserSnap = await getDoc(otherUserRef);
              let otherUsername = userData.otherParticipantUsername || 'User';
              let otherProfileImg = userData.otherParticipantProfileImage || '';
              if (otherUserSnap.exists()) {
                const otherUserData = otherUserSnap.data();
                if (otherUserData.username) otherUsername = otherUserData.username;
                if (otherUserData.profileImageUrl) otherProfileImg = otherUserData.profileImageUrl;
              }
              
              await setDoc(conversationRef, {
                participants: [currentUser.uid, otherUserId],
                lastMessageAt: serverTimestamp(),
                lastMessageText: textToSend,
                lastMessageSenderId: currentUser.uid, // Set sender of the first message
                participantUsernames: {
                  [currentUser.uid]: currentUser.displayName || currentUser.email || 'User',
                  [otherUserId]: otherUsername,
                },
                participantProfileImages: {
                  [currentUser.uid]: currentUser.photoURL || '',
                  [otherUserId]: otherProfileImg,
                },
              });
            } else { throw new Error("Could not find other participant ID"); }
          } else { throw new Error("User conversation reference not found"); }
        }
        
        const messagesRef = collection(db, "conversations", conversationId, "messages");
        await addDoc(messagesRef, {
          text: textToSend,
          createdAt: serverTimestamp(),
          senderId: currentUser.uid,
        });

        await updateDoc(conversationRef, {
          lastMessageAt: serverTimestamp(),
          lastMessageText: textToSend,
          lastMessageSenderId: currentUser.uid, // Update sender of the last message
        });

        // Update user conversation refs (userConvRef1 for current user)
        const userConvRef1 = doc(db, `users/${currentUser.uid}/conversations`, conversationId);
        const userConvSnap1 = await getDoc(userConvRef1);
        const conversationDataForUserRef = (await getDoc(conversationRef)).data(); // Re-fetch to ensure data consistency

        if (!userConvSnap1.exists()) {
          const otherParticipantForUserRef = conversationDataForUserRef?.participants?.find((uid: string) => uid !== currentUser.uid);
          if (otherParticipantForUserRef) {
            await setDoc(userConvRef1, {
              otherParticipantId: otherParticipantForUserRef,
              otherParticipantUsername: conversationDataForUserRef?.participantUsernames?.[otherParticipantForUserRef] || 'User',
              otherParticipantProfileImage: conversationDataForUserRef?.participantProfileImages?.[otherParticipantForUserRef] || '',
              lastMessageAt: serverTimestamp(), // Use serverTimestamp for consistency
              lastMessageText: textToSend,
              // lastRead: serverTimestamp() // Current user just sent, so it's "read" by them
            });
          }
        } else {
          await updateDoc(userConvRef1, {
            lastMessageAt: serverTimestamp(),
            lastMessageText: textToSend,
            // lastRead: serverTimestamp() // Current user just sent, so it's "read" by them
          });
        }

        // Update other user's conversation reference (userConvRef2)
        const otherUserId = conversationDataForUserRef?.participants?.find((uid: string) => uid !== currentUser.uid);
        if (otherUserId) {
          const userConvRef2 = doc(db, `users/${otherUserId}/conversations`, conversationId);
          const userConvSnap2 = await getDoc(userConvRef2);
          const currentUserDataForOtherUserRef = (await getDoc(doc(db, 'users', currentUser.uid))).data();

          if (!userConvSnap2.exists()) {
             if (currentUserDataForOtherUserRef) {
                await setDoc(userConvRef2, {
                    otherParticipantId: currentUser.uid,
                    otherParticipantUsername: currentUserDataForOtherUserRef?.username || currentUser.displayName || 'User',
                    otherParticipantProfileImage: currentUserDataForOtherUserRef?.profileImageUrl || currentUser.photoURL || '',
                    lastMessageAt: serverTimestamp(),
                    lastMessageText: textToSend,
                });
             }
          } else {
            await updateDoc(userConvRef2, {
              lastMessageAt: serverTimestamp(),
              lastMessageText: textToSend,
            });
          }
        }
      } catch (error) {
        console.error('Error sending message to Firestore:', error);
        Alert.alert(
          "Error", 
          "Failed to send message. Please try again or restart the conversation."
        );
      }
    }
  };

  const handleDeleteMessage = async () => {
    if (!selectedMessage || !currentUser || !conversationId || conversationId === 'ai_conversation' || selectedMessage.user !== 'user') {
      setDeleteModalVisible(false);
      setSelectedMessage(null);
      return;
    }
    
    try {
      const messageRef = doc(db, "conversations", conversationId, "messages", selectedMessage.id);
      await deleteDoc(messageRef);
      
      setDeleteModalVisible(false);
      setSelectedMessage(null);
      
      const messagesQuery = query(
        collection(db, "conversations", conversationId, "messages"),
        orderBy("createdAt", "desc"),
        limit(1) // We only need the new last message
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const conversationRef = doc(db, "conversations", conversationId);
      let newLastMessageText = "Message deleted";
      let newLastMessageSenderId = null; // Or keep previous if no messages left? For now, null.
      let newLastMessageAt: any = serverTimestamp(); // Default to now if no messages left

      if (!messagesSnapshot.empty) {
        const lastMessageData = messagesSnapshot.docs[0].data() as FirestoreMessageData;
        newLastMessageText = lastMessageData.text || "Message deleted";
        newLastMessageSenderId = lastMessageData.senderId;
        newLastMessageAt = lastMessageData.createdAt; // Use actual timestamp of the new last message
      } else {
        // No messages left, perhaps clear or set to a specific state
        newLastMessageText = ""; // Or "No messages yet"
        // newLastMessageSenderId remains null
        // newLastMessageAt can be serverTimestamp() or null depending on desired behavior
      }
        
      await updateDoc(conversationRef, {
        lastMessageText: newLastMessageText,
        lastMessageSenderId: newLastMessageSenderId, // Update sender ID
        lastMessageAt: newLastMessageAt // Update timestamp
      });
        
      const userConvRef1 = doc(db, `users/${currentUser.uid}/conversations`, conversationId);
      await updateDoc(userConvRef1, {
        lastMessageText: newLastMessageText,
        lastMessageAt: newLastMessageAt
      });
        
      const conversationSnap = await getDoc(conversationRef);
      const conversationData = conversationSnap.data();
      const otherUserId = conversationData?.participants?.find((uid: string) => uid !== currentUser.uid);
        
      if (otherUserId) {
        const userConvRef2 = doc(db, `users/${otherUserId}/conversations`, conversationId);
        // Ensure the other user's ref exists before trying to update
        const otherUserConvSnap = await getDoc(userConvRef2);
        if (otherUserConvSnap.exists()) {
            await updateDoc(userConvRef2, {
                lastMessageText: newLastMessageText,
                lastMessageAt: newLastMessageAt
            });
        }
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      Alert.alert("Error", "Failed to delete message. Please try again.");
    }
  };

  const handleLongPress = (message: Message) => {
    // Only allow deleting your own messages
    if (message.user === 'user' && message.type !== 'dateHeader') {
      setSelectedMessage(message);
      setDeleteModalVisible(true);
    }
  };

  const navigateToUserProfile = () => {
    if (conversationId !== 'ai_conversation' && otherParticipantId) {
      router.push(`/profile/${otherParticipantId}`);
    }
  };

  const renderMessage: ListRenderItem<Message> = ({ item }) => {
    // Render date header
    if (item.type === 'dateHeader') {
      return (
        <View style={styles.dateHeaderContainer}>
          <Text style={styles.dateHeaderText}>{item.text}</Text>
        </View>
      );
    }

    if (item.sharedPost) {
      return (
        <TouchableOpacity 
          style={[
            item.user === 'user' ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }
          ]}
          onLongPress={() => handleLongPress(item)}
          delayLongPress={500} // Set delay for long press
        >
          <TouchableOpacity 
            style={styles.sharedPostContainer}
            onPress={() => router.push(`/view-post/${item.sharedPost?.id}`)}
          >
            <View style={styles.sharedPostHeader}>
              <Ionicons name="share-social-outline" size={16} color="#FFF" style={{marginRight: 5}} />
              <Text style={styles.sharedPostHeaderText}>Shared Post by {item.sharedPost.authorUsername}</Text>
            </View>
            
            {item.sharedPost.imageUrl && (
              <Image 
                source={{uri: item.sharedPost.imageUrl}} 
                style={styles.sharedPostImage} 
                resizeMode="cover"
              />
            )}
            
            {item.sharedPost.caption ? <Text style={styles.sharedPostCaption} numberOfLines={2}>{item.sharedPost.caption}</Text> : null}
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }

    if (item.sharedMilestone) {
      return (
        <TouchableOpacity
          style={[
            item.user === 'user' ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }
          ]}
          onLongPress={() => handleLongPress(item)}
          delayLongPress={500}
        >
          <TouchableOpacity
            style={styles.sharedMilestoneContainer}
            onPress={() => router.push(`/view-milestone/${item.sharedMilestone?.id}`)}
          >
            <View style={styles.sharedMilestoneHeader}>
              <Ionicons 
                name="trophy-outline" 
                size={16} 
                color="#FFF" 
                style={{ marginRight: 5 }} 
              />
              <Text style={styles.sharedMilestoneHeaderText}>
                Milestone by {item.sharedMilestone.username}
              </Text>
            </View>

            {item.sharedMilestone.type === 'PR' ? (
              <View style={styles.sharedMilestoneContent}>
                <Text style={styles.sharedMilestoneType}>
                  {item.sharedMilestone.details.exercise}
                </Text>
                <View style={styles.milestoneStatsRow}>
                  <Text style={styles.milestoneValue}>
                    {item.sharedMilestone.details.value}{item.sharedMilestone.details.weightUnit}
                    {item.sharedMilestone.details.reps > 1 ? ` × ${item.sharedMilestone.details.reps}` : ''}
                  </Text>
                  <Text style={styles.milestonePrevious}>
                    from {item.sharedMilestone.details.previousValue}
                    {item.sharedMilestone.details.weightUnit}
                  </Text>
                  <Text style={styles.milestoneImprovement}>
                    ↑ {item.sharedMilestone.details.improvement}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.weightMilestoneContent}>
                <Text style={styles.sharedMilestoneType}>
                  {item.sharedMilestone.type === 'weightLoss' ? 'Weight Loss' : 'Weight Gain'}
                </Text>
                <Text style={styles.weightChangeValue}>
                  {item.sharedMilestone.type === 'weightLoss' ? '↓' : '↑'} {
                    item.sharedMilestone.details.totalLoss
                  } {item.sharedMilestone.details.newWeightUnit}
                </Text>
                <Text style={styles.weightChangeDetails}>
                  {item.sharedMilestone.details.previousWeight} → {item.sharedMilestone.details.newWeight} {
                    item.sharedMilestone.details.newWeightUnit
                  }
                </Text>
                <Text style={styles.milestoneImprovement}>
                  {item.sharedMilestone.details.percentageLoss} change
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }

    if (item.sharedWorkout) {
      return (
        <TouchableOpacity
          style={[item.user === 'user' ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}
          onLongPress={() => handleLongPress(item)}
          delayLongPress={500}
        >
          <TouchableOpacity
            style={styles.sharedWorkoutContainer}
            onPress={() => router.push(`/view-workout/${item.sharedWorkout?.id}`)}
          >
            <View style={styles.sharedWorkoutHeader}>
              <Ionicons name="share-social-outline" size={16} color="#FFF" style={{ marginRight: 5 }} />
              <Text style={styles.sharedWorkoutHeaderText}>Shared Workout by {item.sharedWorkout.creatorUsername}</Text>
            </View>
            {item.sharedWorkout.coverImageUrl && (
              <Image
                source={{ uri: item.sharedWorkout.coverImageUrl }}
                style={styles.sharedWorkoutImage}
                resizeMode="cover"
              />
            )}
            <Text style={styles.sharedWorkoutTitle} numberOfLines={2}>
              {item.sharedWorkout.title}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }
    
    // Render regular message
    return (
      <TouchableOpacity 
        style={[
          styles.messageBubble,
          item.user === 'user' ? styles.currentUserMessage : item.user === 'other' ? styles.otherUserMessage : styles.aiMessage,
        ]}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500} 
        activeOpacity={0.7}
      >
        <Text style={item.user === 'user' ? styles.currentUserText : item.user === 'other' ? styles.otherUserText : styles.aiText}>
          {item.text}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'black' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <SafeAreaView style={{ backgroundColor: '#1E1E1E' }}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerUserInfoContainer}
              onPress={navigateToUserProfile}
              disabled={conversationId === 'ai_conversation' || !otherParticipantId}
            >
              {profileImageUrl ? (
                <Image source={{ uri: profileImageUrl }} style={styles.profilePic} />
              ) : (
                <Image source={require('@/assets/images/profile-icon.png')} style={styles.profilePic} />
              )}
              <Text style={styles.headerText} numberOfLines={1} ellipsizeMode="tail">
                {chatTitle}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            style={{ flex: 1 }}
            contentContainerStyle={styles.messagesContainer}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        {/* Delete Message Modal */}
        <Modal
          transparent={true}
          visible={deleteModalVisible}
          animationType="fade"
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setDeleteModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Delete Message</Text>
                <Text style={styles.modalText}>Are you sure you want to delete this message?</Text>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setDeleteModalVisible(false)}
                  >
                    <Text style={styles.buttonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.deleteButton]}
                    onPress={handleDeleteMessage}
                  >
                    <Text style={styles.buttonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type your message..."
            placeholderTextColor="#888"
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Ionicons name="send" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  backButton: {
    padding: 5,
    marginRight: 5,
  },
  headerUserInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 5,
  },
  profilePic: { 
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  messagesContainer: {
    padding: 10,
    justifyContent: 'flex-start',
    flexGrow: 1, 
  },
  messageBubble: {
    maxWidth: '70%',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginVertical: 5,
  },
  currentUserMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    backgroundColor: '#4A4A4A',
    alignSelf: 'flex-start',
  },
  aiMessage: {
    backgroundColor: '#d466ff',
    alignSelf: 'flex-start',
  },
  currentUserText: {
    color: 'white',
  },
  otherUserText: {
    color: 'white',
  },
  aiText: {
    color: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#1E1E1E',
  },
  input: {
    flex: 1,
    backgroundColor: '#333',
    color: 'white',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    padding: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sharedPostContainer: {
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 30, 30, 0.8)',
    borderWidth: 1,
    borderColor: '#333',
  },
  sharedPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sharedPostHeaderText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  sharedPostImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#333',
  },
  sharedPostCaption: {
    color: '#FFF',
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  dateHeaderContainer: {
    alignItems: 'center',
    marginVertical: 15,
    paddingVertical: 5,
  },
  dateHeaderText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#222',
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 20,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    color: '#DDD',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#444',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sharedMilestoneContainer: {
    marginVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 60, 100, 0.8)',
    borderWidth: 2,
    borderColor: '#0bb',
    overflow: 'hidden',
    width: 280,
  },
  sharedMilestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#0bb',
    backgroundColor: 'rgba(15, 45, 80, 0.9)',
  },
  sharedMilestoneHeaderText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  sharedMilestoneContent: {
    padding: 12,
  },
  sharedMilestoneType: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  milestoneStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  milestoneValue: {
    color: '#4CD964',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  milestonePrevious: {
    color: '#999',
    fontSize: 14,
  },
  milestoneImprovement: {
    color: '#4CD964',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 'auto',
  },
  weightMilestoneContent: {
    padding: 12,
  },
  weightChangeValue: {
    color: '#4CD964',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  weightChangeDetails: {
    color: '#999',
    fontSize: 14,
  },
  sharedWorkoutContainer: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(100, 20, 20, 0.8)',
    borderWidth: 2,
    borderColor: '#b00',
    overflow: 'hidden',
  },
  sharedWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#b00',
    backgroundColor: 'rgba(80, 20, 20, 0.9)', 
  },
  sharedWorkoutHeaderText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  sharedWorkoutImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#333',
  },
  sharedWorkoutTitle: {
    color: '#FFF',
    fontSize: 14,
    padding: 10,
    textAlign: 'center',
  },
});