/**
 * HLTHY Coach Intent Classification - React Native Components
 * Ready-to-use components for intent classification integration
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';

// API Configuration
const API_BASE = 'http://localhost:5001'; // Change to your production URL
const CLASSIFY_ENDPOINT = `${API_BASE}/api/classify-intent`;
const CHAT_ENDPOINT = `${API_BASE}/api/chat`;

/**
 * Type definitions for intent classification
 */
export interface IntentResult {
  intent: 'planner' | 'technique' | 'explain' | 'schedule' | 'chit_chat';
  message: string;
  timestamp: string;
  status: string;
}

export interface IntentError {
  error: string;
}

/**
 * Classify user intent API function
 */
export async function classifyUserIntent(message: string): Promise<IntentResult | IntentError> {
  try {
    const response = await fetch(CLASSIFY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Intent classification failed:', error);
    return { error: (error as Error).message };
  }
}

/**
 * Enhanced chat function with intent classification
 */
export async function sendChatWithIntent(
  message: string, 
  history: any[], 
  user_id?: string
): Promise<any> {
  try {
    // First, classify the user's intent
    const intentResult = await classifyUserIntent(message);
    
    // Send to main chat endpoint
    const chatResponse = await fetch(CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        history: [...history, { role: 'user', text: message }],
        user_id
      }),
    });

    if (!chatResponse.ok) {
      throw new Error(`Chat failed: ${chatResponse.status}`);
    }

    const result = await chatResponse.json();
    
    return {
      ...result,
      intent: 'error' in intentResult ? 'unknown' : intentResult.intent
    };
  } catch (error) {
    console.error('Chat request failed:', error);
    throw error;
  }
}

/**
 * UI configuration for each intent type
 */
export function getIntentUIConfig(intent: string) {
  const configs = {
    planner: {
      icon: '🏋️',
      color: '#FF6B35',
      backgroundColor: '#FFF4F2',
      placeholder: "Ask about workouts, exercises, or routines...",
      examples: ["I need a leg workout", "Design a push/pull split", "What exercises for chest?"]
    },
    technique: {
      icon: '🎯',
      color: '#F7931E',
      backgroundColor: '#FFF8F0',
      placeholder: "Ask about form, injuries, or substitutions...",
      examples: ["My shoulder hurts during bench", "How to fix squat form?", "Substitute for deadlifts?"]
    },
    explain: {
      icon: '📚',
      color: '#4ECDC4',
      backgroundColor: '#F0FFFE',
      placeholder: "Ask for definitions or educational content...",
      examples: ["What is progressive overload?", "Explain compound exercises", "Define RPE"]
    },
    schedule: {
      icon: '📅',
      color: '#45B7D1',
      backgroundColor: '#F0F8FF',
      placeholder: "Ask about training frequency or scheduling...",
      examples: ["When to deload?", "How many rest days?", "Best training frequency?"]
    },
    chit_chat: {
      icon: '💬',
      color: '#96CEB4',
      backgroundColor: '#F5FFF7',
      placeholder: "Say hello or chat casually...",
      examples: ["Hello!", "Thank you!", "Have a great day!"]
    }
  };
  
  return configs[intent as keyof typeof configs] || {
    icon: '❓',
    color: '#95A5A6',
    backgroundColor: '#F8F9FA',
    placeholder: "Ask your fitness question...",
    examples: []
  };
}

/**
 * Custom hook for intent classification
 */
export function useIntentClassification() {
  const [isClassifying, setIsClassifying] = useState(false);
  const [lastIntent, setLastIntent] = useState<string | null>(null);

  const classify = useCallback(async (message: string) => {
    if (!message.trim()) return 'explain';
    
    setIsClassifying(true);
    try {
      const result = await classifyUserIntent(message);
      if ('intent' in result) {
        setLastIntent(result.intent);
        return result.intent;
      } else {
        console.error('Classification error:', result.error);
        setLastIntent('explain');
        return 'explain';
      }
    } catch (error) {
      console.error('Classification failed:', error);
      setLastIntent('explain');
      return 'explain';
    } finally {
      setIsClassifying(false);
    }
  }, []);

  return { classify, isClassifying, lastIntent };
}

/**
 * Smart Chat Input Component with Intent Classification
 */
export function SmartChatInput({ 
  onSendMessage,
  placeholder = "Ask your fitness question...",
  style = {}
}: {
  onSendMessage: (message: string, intent: string) => void;
  placeholder?: string;
  style?: any;
}) {
  const [message, setMessage] = useState('');
  const { classify, isClassifying, lastIntent } = useIntentClassification();
  const [showExamples, setShowExamples] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || isClassifying) return;
    
    const intent = await classify(message);
    onSendMessage(message, intent);
    setMessage('');
    setShowExamples(false);
  };

  const handleExamplePress = (example: string) => {
    setMessage(example);
    setShowExamples(false);
  };

  const config = lastIntent ? getIntentUIConfig(lastIntent) : getIntentUIConfig('explain');

  return (
    <View style={[styles.chatInputContainer, style]}>
      {/* Intent Indicator */}
      {lastIntent && (
        <View style={[styles.intentIndicator, { backgroundColor: config.backgroundColor }]}>
          <Text style={[styles.intentIcon, { color: config.color }]}>
            {config.icon}
          </Text>
          <Text style={[styles.intentLabel, { color: config.color }]}>
            {lastIntent.toUpperCase()}
          </Text>
        </View>
      )}

      {/* Input Row */}
      <View style={[styles.inputRow, { borderColor: config.color }]}>
        <TextInput
          style={[styles.textInput]}
          value={message}
          onChangeText={setMessage}
          placeholder={config.placeholder}
          placeholderTextColor="#999"
          multiline
          editable={!isClassifying}
          onFocus={() => setShowExamples(true)}
        />
        
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: config.color }]}
          onPress={handleSend}
          disabled={!message.trim() || isClassifying}
        >
          {isClassifying ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Example Suggestions */}
      {showExamples && config.examples.length > 0 && (
        <View style={styles.examplesContainer}>
          <Text style={styles.examplesTitle}>Try asking:</Text>
          {config.examples.map((example, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.exampleButton, { borderColor: config.color }]}
              onPress={() => handleExamplePress(example)}
            >
              <Text style={[styles.exampleText, { color: config.color }]}>
                {example}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Classification Status */}
      {isClassifying && (
        <View style={styles.classifyingIndicator}>
          <ActivityIndicator size="small" color={config.color} />
          <Text style={[styles.classifyingText, { color: config.color }]}>
            Understanding your question...
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Intent-Aware Response Renderer
 */
export function IntentResponseRenderer({ 
  response, 
  intent 
}: { 
  response: any; 
  intent: string;
}) {
  const config = getIntentUIConfig(intent);

  return (
    <View style={[styles.responseContainer, { borderLeftColor: config.color }]}>
      {/* Intent Header */}
      <View style={[styles.responseHeader, { backgroundColor: config.backgroundColor }]}>
        <Text style={styles.responseIcon}>{config.icon}</Text>
        <Text style={[styles.responseType, { color: config.color }]}>
          {intent.charAt(0).toUpperCase() + intent.slice(1)} Response
        </Text>
      </View>

      {/* Response Content */}
      <View style={styles.responseContent}>
        {typeof response === 'string' ? (
          <Text style={styles.responseText}>{response}</Text>
        ) : (
          <Text style={styles.responseText}>
            {JSON.stringify(response, null, 2)}
          </Text>
        )}
      </View>
    </View>
  );
}

/**
 * Complete Chat Screen with Intent Classification
 */
export function IntentAwareChatScreen() {
  const [messages, setMessages] = useState<Array<{
    text: string;
    role: 'user' | 'coach';
    intent?: string;
    timestamp: Date;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (message: string, intent: string) => {
    // Add user message
    const userMessage = {
      text: message,
      role: 'user' as const,
      intent,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Send to AI and get response
    setIsLoading(true);
    try {
      const response = await sendChatWithIntent(message, messages, 'demo_user');
      
      const coachMessage = {
        text: response.text || response.response || 'No response received',
        role: 'coach' as const,
        intent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, coachMessage]);
    } catch (error) {
      Alert.alert('Error', 'Failed to get response from coach');
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.chatScreen}>
      {/* Messages List */}
      <ScrollView style={styles.messagesList} showsVerticalScrollIndicator={false}>
        {messages.map((msg, index) => (
          <View key={index} style={[
            styles.messageContainer,
            msg.role === 'user' ? styles.userMessage : styles.coachMessage
          ]}>
            {msg.role === 'coach' ? (
              <IntentResponseRenderer response={msg.text} intent={msg.intent || 'explain'} />
            ) : (
              <View style={styles.userMessageContent}>
                <Text style={styles.userMessageText}>{msg.text}</Text>
                {msg.intent && (
                  <Text style={styles.userIntentLabel}>
                    {getIntentUIConfig(msg.intent).icon} {msg.intent}
                  </Text>
                )}
              </View>
            )}
          </View>
        ))}
        
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>Coach is thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Smart Input */}
      <SmartChatInput
        onSendMessage={handleSendMessage}
        style={styles.inputContainer}
      />
    </View>
  );
}

/**
 * Styles for all components
 */
const styles = StyleSheet.create({
  chatScreen: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  coachMessage: {
    alignItems: 'flex-start',
  },
  userMessageContent: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 18,
    maxWidth: '80%',
  },
  userMessageText: {
    color: 'white',
    fontSize: 16,
  },
  userIntentLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  chatInputContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E1E5E9',
  },
  intentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    marginBottom: 8,
  },
  intentIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  intentLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 2,
    borderRadius: 24,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  examplesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  exampleButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 6,
    backgroundColor: 'white',
  },
  exampleText: {
    fontSize: 14,
  },
  classifyingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  classifyingText: {
    marginLeft: 8,
    fontSize: 14,
    fontStyle: 'italic',
  },
  responseContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: '90%',
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  responseIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  responseType: {
    fontWeight: '600',
    fontSize: 14,
  },
  responseContent: {
    padding: 16,
  },
  responseText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  inputContainer: {
    backgroundColor: 'white',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
});
