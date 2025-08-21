import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SmartChatInput } from '@/components/SmartChatInput';
import { IntentBadge, IntentMessageWrapper } from '@/components/IntentBadge';
import { IntentClassificationResult } from '@/ai/ai_chat';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface DemoMessage {
  id: string;
  text: string;
  intent?: string;
  isUser: boolean;
  timestamp: Date;
}

export default function IntentDemoScreen() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<DemoMessage[]>([
    {
      id: '1',
      text: 'Hi! I can understand what type of fitness help you need. Try asking me something!',
      isUser: false,
      timestamp: new Date(),
    }
  ]);

  const handleSend = async (message: string, intentResult?: IntentClassificationResult) => {
    // Add user message
    const userMessage: DemoMessage = {
      id: Date.now().toString(),
      text: message,
      intent: intentResult?.intent,
      isUser: true,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Add AI response based on intent
    const aiResponse = getIntentResponse(intentResult?.intent || 'explain');
    const aiMessage: DemoMessage = {
      id: (Date.now() + 1).toString(),
      text: aiResponse,
      intent: intentResult?.intent,
      isUser: false,
      timestamp: new Date(),
    };
    
    setTimeout(() => {
      setMessages(prev => [...prev, aiMessage]);
    }, 1000);
  };

  const getIntentResponse = (intent: string): string => {
    const responses = {
      planner: "I'd be happy to create a workout plan for you! Let me design something that matches your goals and experience level.",
      technique: "Great question about technique! Proper form is crucial for safety and effectiveness. Let me break that down for you.",
      explain: "That's a fantastic topic to explore! Let me explain the science behind it in a way that's easy to understand.",
      schedule: "Timing is everything in fitness! Let me help you figure out the optimal schedule for your goals.",
      chit_chat: "Thanks for the friendly message! I'm here whenever you need fitness guidance. How can I help you today?",
    };
    return responses[intent as keyof typeof responses] || responses.explain;
  };

  const exampleMessages = [
    { text: "I need a leg workout", intent: "planner" },
    { text: "My shoulder hurts during bench press", intent: "technique" },
    { text: "What is progressive overload?", intent: "explain" },
    { text: "How often should I train?", intent: "schedule" },
    { text: "Thank you for your help!", intent: "chit_chat" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🧠 Smart Intent Demo</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>🎯 Intent Classification Demo</Text>
          <Text style={styles.introText}>
            This shows how the AI understands different types of fitness questions and provides specialized responses.
          </Text>
          
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeTitle}>Intent Types:</Text>
            <View style={styles.badgeRow}>
              <IntentBadge intent="planner" showLabel />
              <IntentBadge intent="technique" showLabel />
              <IntentBadge intent="explain" showLabel />
              <IntentBadge intent="schedule" showLabel />
              <IntentBadge intent="chit_chat" showLabel />
            </View>
          </View>
        </View>

        <View style={styles.examplesCard}>
          <Text style={styles.examplesTitle}>Try these examples:</Text>
          {exampleMessages.map((example, index) => (
            <TouchableOpacity
              key={index}
              style={styles.exampleButton}
              onPress={() => setInput(example.text)}
            >
              <IntentBadge intent={example.intent} size="small" />
              <Text style={styles.exampleText}>{example.text}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {messages.map((message) => (
          <IntentMessageWrapper
            key={message.id}
            intent={message.intent}
            isUserMessage={message.isUser}
            showIntentBadge={!!message.intent}
          >
            <View
              style={[
                styles.messageBubble,
                message.isUser ? styles.userMessage : styles.aiMessage,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.isUser ? styles.userText : styles.aiText,
                ]}
              >
                {message.text}
              </Text>
              <Text style={styles.timestamp}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </IntentMessageWrapper>
        ))}
      </ScrollView>

      <SmartChatInput
        value={input}
        onChangeText={setInput}
        onSend={handleSend}
        placeholder="Ask me anything about fitness..."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1E1E1E',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  introCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  introTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  introText: {
    color: '#CCC',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  badgeContainer: {
    marginBottom: 8,
  },
  badgeTitle: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  examplesCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  examplesTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  exampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  exampleText: {
    color: 'white',
    fontSize: 14,
    flex: 1,
  },
  messageBubble: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginVertical: 4,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: '#2A2A2A',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: 'white',
  },
  aiText: {
    color: 'white',
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
});
