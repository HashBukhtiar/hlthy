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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import globalStyles from '@/styles/globalStyles';
import { db } from '@/firebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

interface FirestoreMessageData {
  senderId: string;
  text: string;
  createdAt: Timestamp;
}

interface Message {
  id: string;
  text: string;
  user: 'user' | 'ai';
}

type Plan = 'Workout Plan' | 'Diet Plan' | 'Both Plans' | '';

// Placeholder for the actual AI conversation ID and AI's sender ID
// These would typically be fetched or defined in a config
const AI_CONVERSATION_ID = "your_pinned_ai_conversation_id"; 
const AI_SENDER_ID = "ai_system_sender_id";

function TypingIndicator() {
  const [dots, setDots] = useState<string>('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + '.' : ''));
    }, 500);
    return () => clearInterval(interval);
  }, []);
  
  return <Text style={styles.typingAnimation}>{dots}</Text>;
}

export default function DMs() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>('');
  const [plan, setPlan] = useState<Plan>('');
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const navigation = useNavigation();
  const flatListRef = useRef<FlatList | null>(null);

  useEffect(() => {
    if (!currentUser || !AI_CONVERSATION_ID) return;

    // Listen for messages in the AI conversation
    const messagesRef = collection(db, "conversations", AI_CONVERSATION_ID, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: Message[] = [];
      let hasNewAIMessage = false;
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirestoreMessageData;
        const message: Message = {
          id: doc.id,
          text: data.text,
          user: data.senderId === currentUser.uid ? 'user' : (data.senderId === AI_SENDER_ID ? 'ai' : 'user'),
          createdAt: data.createdAt?.toDate(),
        };
        fetchedMessages.push(message);
        if (data.senderId === AI_SENDER_ID && (!messages.find(m => m.id === doc.id))) {
            hasNewAIMessage = true;
        }
      });
      setMessages(fetchedMessages);
      if (hasNewAIMessage) {
        setIsTyping(false); 
      }
    });

    return () => unsubscribe();
  }, [currentUser, messages]); 



  const handleSend = async () => {
    Keyboard.dismiss();
    if (!input.trim() || !currentUser) return;
    
    const textToSend = input.trim();
    setInput(''); // Clear input immediately

    // Add user's message to Firestore
    try {
      const messagesRef = collection(db, "conversations", AI_CONVERSATION_ID, "messages");
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        text: textToSend,
        createdAt: serverTimestamp(),
      });
      // User message will appear via the onSnapshot listener.
      // A Cloud Function listening to this collection would trigger the AI service.
      // The AI's response would then be added to Firestore by that Cloud Function.
      setIsTyping(true); // Assume AI starts "typing" after user sends a message
    } catch (error) {
      console.error('Error sending message to Firestore:', error);
      // Optionally, re-add the input to the text field or show an error
      // setInput(textToSend); 
    }
  };

  // Scroll to bottom whenever content size changes (including when the typing indicator is rendered)
  const scrollToBottom = () => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const togglePlanDropdown = () => setShowDropdown(!showDropdown);

  const selectPlan = (planType: Plan) => {
    setPlan(planType);
    setShowDropdown(false);
    if (planType === 'Workout Plan') {
      navigation.navigate('WorkoutPlan' as never);
    } else if (planType === 'Diet Plan') {
      navigation.navigate('DietPlan' as never);
    }
  };

  const renderMessage: ListRenderItem<Message> = ({ item }) => (
    <View
      style={[
        { marginVertical: 4 },
        { alignSelf: item.user === 'user' ? 'flex-end' : 'flex-start' },
      ]}
    >
      <Text
        style={
          item.user === 'user'
            ? styles.userMessageBubble
            : styles.aiMessageBubble
        }
      >
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
        {/* Current Plan Dropdown */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>hlthy AI</Text>
          <View style={styles.dropdownContainer}>
            <TouchableOpacity onPress={togglePlanDropdown}>
              <Text style={styles.planDropdown}>
                Current Plan: {plan || 'None'}
              </Text>
            </TouchableOpacity>
            {showDropdown && (
              <View style={styles.dropdown}>
                {(['Workout Plan', 'Diet Plan', 'Both Plans'] as Plan[]).map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => selectPlan(option)}
                    style={styles.dropdownItem}
                  >
                    <Text>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Chat History with Typing Indicator as Footer */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          ListFooterComponent={isTyping ? <TypingIndicator /> : null}
          onContentSizeChange={scrollToBottom}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 }}
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.promptInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your AI trainer..."
            placeholderTextColor="white"
          />
          <TouchableOpacity
            onPress={handleSend}
            style={styles.sendButton}
          >
            <Text style={{ color: 'black' }}>Send</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  dropdownContainer: {
    alignItems: 'flex-end',
  },
  planDropdown: {
    fontSize: 16,
    color: 'white',
  },
  dropdown: {
    backgroundColor: '#ddd',
    padding: 8,
    marginTop: 4,
    borderRadius: 4,
  },
  dropdownItem: {
    paddingVertical: 4,
  },
  userMessageBubble: { 
    backgroundColor: '#f9ccff',
    padding: 8,
    borderRadius: 4
  },
  aiMessageBubble: { 
    backgroundColor: '#ddd',
    padding: 8, 
    borderRadius: 4 
  },
  typingAnimation: { 
    backgroundColor: 'black', 
    color: 'white', 
    padding: 8, 
    borderRadius: 4, 
    fontSize: 50, 
    textAlign: 'center'
  },
  promptInput: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 4, 
    padding: 8, 
    color: 'white' 
  },
  sendButton: { 
    marginLeft: 8, 
    padding: 8, 
    backgroundColor: '#f9ccff', 
    borderRadius: 4 
  },
  inputContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 60,
    alignItems: 'center',
  },
});