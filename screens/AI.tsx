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

// Assuming sendMessage function exists in this file path
// You may need to adjust the import path based on your actual project structure
import { sendMessage } from '@/ai/ai_chat';

interface Message {
  id: string;
  text: string;
  user: 'user' | 'ai';
}

type Plan = 'Workout Plan' | 'Diet Plan' | 'Both Plans' | '';

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

export default function AI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I am your AI Trainer. How can I help you today?',
      user: 'ai',
    },
  ]);
  const [input, setInput] = useState<string>('');
  const [plan, setPlan] = useState<Plan>('');
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const navigation = useNavigation();
  const flatListRef = useRef<FlatList | null>(null);

  const handleSend = async () => {
    Keyboard.dismiss();
    if (!input.trim()) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      user: 'user',
    };
    
    setMessages((prev) => [...prev, newMessage]);
    setInput('');

    // Show typing indicator
    setIsTyping(true);
    try {
      const aiReply = await sendMessage(input.trim());
      setIsTyping(false);
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: aiReply,
        user: 'ai',
      };
      
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      setIsTyping(false);
      console.error('Error calling AI:', error);
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
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
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
        <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center' }}>
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
  }
});