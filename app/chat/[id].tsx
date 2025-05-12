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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import globalStyles from '@/styles/globalStyles';
import { db } from '@/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

interface FirestoreMessageData {
  senderId: string;
  text: string;
  createdAt: Timestamp;
}

interface Message {
  id: string;
  text: string;
  user: 'user' | 'other';
  createdAt?: Date;
}

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>(); // Type the params
  const conversationId = id as string;
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList | null>(null);

  useEffect(() => {
    if (!currentUser || !conversationId) return;

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

    return () => unsubscribe();
  }, [currentUser, conversationId]);

  const handleSend = async () => {
    Keyboard.dismiss();
    if (!input.trim() || !currentUser || !conversationId) return;

    const textToSend = input.trim();
    setInput('');

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
  };

  const renderMessage: ListRenderItem<Message> = ({ item }) => (
    <View
      style={[
        styles.messageBubble,
        item.user === 'user' ? styles.currentUserMessage : styles.otherUserMessage,
      ]}
    >
      <Text style={item.user === 'user' ? styles.currentUserText : styles.otherUserText}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'black' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[globalStyles.container, styles.container]}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
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
            contentContainerStyle={styles.messagesContainer}
            inverted={true}
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
  backButton: {
    position: 'absolute',
    top: 20,
    left: 10,
    zIndex: 1,
    padding: 10,
  },
  messagesContainer: {
    padding: 10,
    justifyContent: 'flex-end',
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
  currentUserText: {
    color: 'white',
  },
  otherUserText: {
    color: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
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