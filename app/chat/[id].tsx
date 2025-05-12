import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import globalStyles from '@/styles/globalStyles';
import { db } from '@/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { sendMessage } from '@/ai/ai_chat';

interface FirestoreMessageData {
  senderId: string;
  text: string;
  createdAt: Timestamp;
}

interface Message {
  id: string;
  text: string;
  user: 'user' | 'other' | 'ai';
  createdAt?: Date;
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

  useEffect(() => {
    if (!currentUser || !conversationId) return;

    // Set the chat title and profile image based on the conversation ID
    if (conversationId === 'ai_conversation') {
      setChatTitle('hlthy AI');
      setProfileImageUrl(null); // No profile image for AI
      // Initialize AI conversation with a default message
      setMessages([{
        id: 'ai_welcome',
        text: 'Hello! How can I help you today?',
        user: 'ai',
        createdAt: new Date(),
      }]);
      setLoading(false); // Set loading to false immediately
    } else {
      // Fetch messages from Firestore for other conversations
      setLoading(true);
      const messagesRef = collection(db, "conversations", conversationId, "messages");
      const q = query(messagesRef, orderBy("createdAt", "asc"));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedMessages: Message[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as FirestoreMessageData;
          const message: Message = {
            id: doc.id,
            text: data.text,
            user: data.senderId === currentUser.uid ? 'user' : 'other',
            createdAt: data.createdAt?.toDate(),
          };
          fetchedMessages.push(message);
        });
        setMessages(fetchedMessages);
        setLoading(false);
      });

      // Fetch the chat title and profile image from Firestore
      const conversationRef = doc(db, "conversations", conversationId);
      getDoc(conversationRef)
        .then((doc) => {
          if (doc.exists()) {
            const data = doc.data();
            const participantUsernames = data?.participantUsernames;
            const participantProfileImages = data?.participantProfileImages; // Get profile images
            if (participantUsernames && participantProfileImages) {
              // Get the other participant's username and profile image
              const otherUserId = Object.keys(participantUsernames).find(
                (uid) => uid !== currentUser.uid
              );
              if (otherUserId) {
                setChatTitle(participantUsernames[otherUserId] || 'Chat');
                setProfileImageUrl(participantProfileImages[otherUserId] || null); // Set profile image URL
              } else {
                setChatTitle('Chat');
                setProfileImageUrl(null);
              }
            } else {
              setChatTitle('Chat');
              setProfileImageUrl(null);
            }
          } else {
            setChatTitle('Chat');
            setProfileImageUrl(null);
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
      // Send message to AI service
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
        const messagesRef = collection(db, "conversations", conversationId, "messages");
        await addDoc(messagesRef, {
          senderId: currentUser.uid,
          text: textToSend,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error sending message to Firestore:', error);
      }
    }
  };

  const renderMessage: ListRenderItem<Message> = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.user === 'user' ? styles.currentUserMessage : item.user === 'other' ? styles.otherUserMessage : styles.aiMessage,
      ]}
    >
      <Text style={item.user === 'user' ? styles.currentUserText : item.user === 'other' ? styles.otherUserText : styles.aiText}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'black' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <SafeAreaView>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            {profileImageUrl ? ( // Conditionally render profile image
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
          />
        )}

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
    paddingTop: 15, 
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
});