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

  useEffect(() => {
    if (!currentUser || !conversationId) return;
    if (conversationId === 'ai_conversation') {
      setChatTitle('hlthy AI');
      setProfileImageUrl(Image.resolveAssetSource(require('@/assets/images/icon.png')).uri);
      setMessages([{
        id: 'ai_welcome',
        text: 'Hello! How can I help you today?',
        user: 'ai',
        createdAt: new Date(),
      }]);
      setLoading(false);
    } else {
      // Fetch messages from Firestore for other conversations
      setLoading(true);
      const messagesRef = collection(db, "conversations", conversationId, "messages");
      const q = query(messagesRef, orderBy("createdAt", "asc"));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedMessages: Message[] = [];
        let currentDate: string | null = null;
        
        querySnapshot.forEach((doc) => {
          const data = doc.data() as FirestoreMessageData;
          const messageDate = data.createdAt?.toDate();
          
          if (messageDate) {
            // Format the date as "Month Date Year"
            const formattedDate = messageDate.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            });
            
            // If this is a new date, add a date header
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

      // Fetch the chat title and profile image from Firestore
      const conversationRef = doc(db, "conversations", conversationId);
      getDoc(conversationRef)
        .then((docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const participantUsernames = data?.participantUsernames;
            const participantProfileImages = data?.participantProfileImages;
            if (participantUsernames) {
              // Get the other participant's username and profile image
              const otherUserId = Object.keys(participantUsernames).find(
                (uid) => uid !== currentUser.uid
              );
              if (otherUserId) {
                setChatTitle(participantUsernames[otherUserId] || 'Chat');
                
                // Try to get the profile image from participantProfileImages
                let profileImg = null;
                if (participantProfileImages && participantProfileImages[otherUserId]) {
                  profileImg = participantProfileImages[otherUserId];
                }
                
                // If still null, try to fetch the user's profile directly
                if (!profileImg || profileImg === '') {
                  const userRef = doc(db, 'users', otherUserId);
                  getDoc(userRef).then(userDoc => {
                    if (userDoc.exists() && userDoc.data().profileImageUrl) {
                      setProfileImageUrl(userDoc.data().profileImageUrl);
                      
                      // Update the conversation with the correct image
                      try {
                        if (participantProfileImages) {
                          participantProfileImages[otherUserId] = userDoc.data().profileImageUrl;
                          updateDoc(conversationRef, {
                            participantProfileImages: participantProfileImages
                          });
                        }
                      } catch (e) {
                        console.log("Error updating profile image in conversation:", e);
                      }
                    }
                  }).catch(err => console.error("Error fetching user data:", err));
                } else {
                  setProfileImageUrl(profileImg);
                }
              } else {
                setChatTitle('Chat');
                setProfileImageUrl(null);
              }
            } else {
              setChatTitle('Chat');
              setProfileImageUrl(null);
            }
          }
        })
        .catch((error) => {
          console.error("Error fetching conversation data:", error);
          setChatTitle('Chat');
          setProfileImageUrl(null);
        });

      return () => unsubscribe();
    }
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
        
        // If conversation doesn't exist, recreate it
        if (!conversationSnap.exists()) {
          console.log("Conversation document not found, recreating...");
          
          // Check if we have a reference to this conversation
          const userConvRef = doc(db, `users/${currentUser.uid}/conversations`, conversationId);
          const userConvSnap = await getDoc(userConvRef);
          
          if (userConvSnap.exists()) {
            const userData = userConvSnap.data();
            const otherUserId = userData.otherParticipantId;
            
            if (otherUserId) {
              // Get the other user's data to ensure we have their current profile info
              const otherUserRef = doc(db, 'users', otherUserId);
              const otherUserSnap = await getDoc(otherUserRef);
              
              let otherUsername = userData.otherParticipantUsername || 'User';
              let otherProfileImg = userData.otherParticipantProfileImage || '';
              
              // If we can get the other user's current data, use that
              if (otherUserSnap.exists()) {
                const otherUserData = otherUserSnap.data();
                if (otherUserData.username) otherUsername = otherUserData.username;
                if (otherUserData.profileImageUrl) otherProfileImg = otherUserData.profileImageUrl;
              }
              
              // Recreate the conversation document
              await setDoc(conversationRef, {
                participants: [currentUser.uid, otherUserId],
                lastMessageAt: serverTimestamp(),
                lastMessageText: textToSend,
                participantUsernames: {
                  [currentUser.uid]: currentUser.displayName || currentUser.email || 'User',
                  [otherUserId]: otherUsername,
                },
                participantProfileImages: {
                  [currentUser.uid]: currentUser.photoURL || '',
                  [otherUserId]: otherProfileImg,
                },
              });
            } else {
              throw new Error("Could not find other participant ID");
            }
          } else {
            throw new Error("User conversation reference not found");
          }
        }
        
        // Proceed with adding the message
        const messagesRef = collection(db, "conversations", conversationId, "messages");
        await addDoc(messagesRef, {
          text: textToSend,
          createdAt: serverTimestamp(),
          senderId: currentUser.uid,
        });

        // Update conversation metadata
        await updateDoc(conversationRef, {
          lastMessageAt: serverTimestamp(),
          lastMessageText: textToSend,
        });

        // Update user conversation refs
        const userConvRef1 = doc(db, `users/${currentUser.uid}/conversations`, conversationId);
        const userConvSnap1 = await getDoc(userConvRef1);

        if (!userConvSnap1.exists()) {
          // Recreate the user's conversation reference
          const otherUserData = conversationData?.participants?.find(uid => uid !== currentUser.uid);
          await setDoc(userConvRef1, {
            otherParticipantId: otherUserData,
            otherParticipantUsername: conversationData?.participantUsernames[otherUserData],
            otherParticipantProfileImage: conversationData?.participantProfileImages[otherUserData] || '',
            lastMessageAt: serverTimestamp(),
            lastMessageText: textToSend,
          });
        } else {
          await updateDoc(userConvRef1, {
            lastMessageAt: serverTimestamp(),
            lastMessageText: textToSend,
          });
        }

        // Get the other user's ID and update their reference too
        const conversationData = (await getDoc(conversationRef)).data();
        const otherUserId = conversationData?.participants?.find((uid) => uid !== currentUser.uid);

        if (otherUserId) {
          const userConvRef2 = doc(db, `users/${otherUserId}/conversations`, conversationId);
          
          // Check if the other user's conversation reference exists
          const userConvSnap2 = await getDoc(userConvRef2);
          
          if (userConvSnap2.exists()) {
            // If it exists, update it
            await updateDoc(userConvRef2, {
              lastMessageAt: serverTimestamp(),
              lastMessageText: textToSend,
            });
          } else {
            // If it doesn't exist, create it
            // Get current user's data
            const currentUserRef = doc(db, 'users', currentUser.uid);
            const currentUserSnap = await getDoc(currentUserRef);
            
            if (currentUserSnap.exists()) {
              const currentUserData = currentUserSnap.data();
              
              await setDoc(userConvRef2, {
                otherParticipantId: currentUser.uid,
                otherParticipantUsername: currentUserData?.username || currentUser.displayName || currentUser.email || 'User',
                otherParticipantProfileImage: currentUserData?.profileURL || '',
                lastMessageAt: serverTimestamp(),
                lastMessageText: textToSend,
              });
            } else {
              console.log("Could not find current user's data to recreate other user's conv ref");
            }
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
    if (!selectedMessage || !currentUser || !conversationId || conversationId === 'ai_conversation') {
      setDeleteModalVisible(false);
      setSelectedMessage(null);
      return;
    }
    
    try {
      // Only allow deleting your own messages
      if (selectedMessage.user !== 'user') {
        Alert.alert("Cannot Delete", "You can only delete your own messages.");
        setDeleteModalVisible(false);
        setSelectedMessage(null);
        return;
      }
      
      // Delete the message from Firestore
      const messageRef = doc(db, "conversations", conversationId, "messages", selectedMessage.id);
      await deleteDoc(messageRef);
      
      // Close modal and clear selection
      setDeleteModalVisible(false);
      setSelectedMessage(null);
      
      // If we just deleted the last message, update the conversation metadata
      const messagesQuery = query(
        collection(db, "conversations", conversationId, "messages"),
        orderBy("createdAt", "desc")
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      
      if (!messagesSnapshot.empty) {
        const lastMessage = messagesSnapshot.docs[0].data() as FirestoreMessageData;
        
        // Update lastMessageText in conversations/{conversationId}
        const conversationRef = doc(db, "conversations", conversationId);
        await updateDoc(conversationRef, {
          lastMessageText: lastMessage.text || "Message deleted",
        });
        
        // Update lastMessageText in both users' conversation references
        const userConvRef1 = doc(db, `users/${currentUser.uid}/conversations`, conversationId);
        await updateDoc(userConvRef1, {
          lastMessageText: lastMessage.text || "Message deleted",
        });
        
        // Get the other user's ID and update their conversation reference too
        const conversationSnap = await getDoc(conversationRef);
        const conversationData = conversationSnap.data();
        const otherUserId = conversationData?.participants?.find((uid: string) => uid !== currentUser.uid);
        
        if (otherUserId) {
          const userConvRef2 = doc(db, `users/${otherUserId}/conversations`, conversationId);
          await updateDoc(userConvRef2, {
            lastMessageText: lastMessage.text || "Message deleted",
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
            {profileImageUrl ? (
              <Image source={{ uri: profileImageUrl }} style={styles.profilePic} />
            ) : (
              <Image source={require('@/assets/images/profile-icon.png')} style={styles.profilePic} /> // Default profile icon
            )}
            <Text style={styles.headerText}>{chatTitle}</Text>
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
    marginLeft: 10,
  },
  backButton: {
    padding: 10,
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