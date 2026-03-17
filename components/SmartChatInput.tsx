import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Animated,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebaseConfig';
import { classifyIntent, IntentClassificationResult } from '@/ai/ai_chat';
import MentionTextInput from '@/components/MentionTextInput';
import { MentionData } from '@/features/mentions/domain/Mention';

interface SmartChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (message: string, intent?: IntentClassificationResult, mentions?: MentionData[]) => void;
  placeholder?: string;
  disabled?: boolean;
  conversationId?: string;
  otherParticipantId?: string | null;
  isAiConversation?: boolean;
}

// Intent configurations for UI
const intentConfigs = {
  planner: {
    icon: '🏋️',
    color: '#FF6B35',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    label: 'WORKOUT PLANNER',
  },
  technique: {
    icon: '🎯',
    color: '#F7931E', 
    backgroundColor: 'rgba(247, 147, 30, 0.15)',
    label: 'TECHNIQUE HELP',
  },
  explain: {
    icon: '📚',
    color: '#4ECDC4',
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    label: 'EDUCATION',
  },
  schedule: {
    icon: '📅',
    color: '#45B7D1',
    backgroundColor: 'rgba(69, 183, 209, 0.15)',
    label: 'SCHEDULING',
  },
  chit_chat: {
    icon: '💬',
    color: '#96CEB4',
    backgroundColor: 'rgba(150, 206, 180, 0.15)',
    label: 'CHAT',
  },
} as const;

export const SmartChatInput: React.FC<SmartChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  placeholder = "Ask me anything about fitness...",
  disabled = false,
  conversationId,
  otherParticipantId,
  isAiConversation = false,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [currentIntent, setCurrentIntent] = useState<IntentClassificationResult | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [mentions, setMentions] = useState<MentionData[]>([]);
  const [intentOpacity] = useState(new Animated.Value(0));
  const [inputBorderColor] = useState(new Animated.Value(0));

  // Only run intent classification for AI conversations
  useEffect(() => {
    if (!isAiConversation || !value.trim() || value.length < 3) {
      setCurrentIntent(null);
      hideIntentIndicator();
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsClassifying(true);
      try {
        const result = await classifyIntent(value);
        setCurrentIntent(result);
        showIntentIndicator();
        animateBorderColor(result.intent);
      } catch (error) {
        console.error('Intent classification failed:', error);
        setCurrentIntent(null);
        hideIntentIndicator();
      } finally {
        setIsClassifying(false);
      }
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [value, isAiConversation]);

  const showIntentIndicator = () => {
    Animated.timing(intentOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const hideIntentIndicator = () => {
    Animated.timing(intentOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    
    Animated.timing(inputBorderColor, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const animateBorderColor = (intent: string) => {
    Animated.timing(inputBorderColor, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleSend = async () => {
    if (!value.trim() || isSending || disabled) return;

    const messageText = value.trim();
    setIsSending(true);

    try {
      if (isAiConversation) {
        // Handle AI conversation with intent
        const intentToPass = currentIntent?.intent ? currentIntent : undefined;
        onSend(messageText, intentToPass);
        setMentions([]);
      } else if (otherParticipantId && currentUser && conversationId) {
        // Handle user-to-user conversation with permission check
        const sendMessageRequest = httpsCallable(functions, 'sendMessageRequest');
        
        try {
          const result = await sendMessageRequest({
            recipientId: otherParticipantId,
            messageText,
            conversationId,
          });

          const { requestNeeded } = result.data as { requestNeeded: boolean };

          if (requestNeeded) {
            Alert.alert(
              "Message Request Sent",
              "Your message was sent as a request. The user must approve it before you can continue messaging.",
              [{ text: "OK" }]
            );
            onChangeText(''); // Clear input
          } else {
            // Normal message send — pass mentions for DM highlight/tap support
            onSend(messageText, undefined, mentions);
            setMentions([]);
          }
        } catch (error: any) {
          // Only log errors that aren't expected fallback scenarios
          if (error.code !== 'functions/not-found' && error.message !== 'not-found') {
            console.error('Error sending message:', error);
          }
          
          if (error.code === 'functions/already-exists') {
            Alert.alert(
              "Request Already Sent",
              "You've already sent a message request to this user. Please wait for them to respond."
            );
          } else if (error.code === 'functions/failed-precondition') {
            Alert.alert(
              "Cannot Send Message",
              "You're unable to message this user."
            );
          } else {
            // Fallback to normal send if cloud function fails or isn't available
            onSend(messageText, undefined, mentions);
            setMentions([]);
          }
        }
      } else {
        // Fallback to normal send
        onSend(messageText, undefined, mentions);
        setMentions([]);
      }
    } catch (error) {
      console.error('Error in handleSend:', error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const getPlaceholder = () => {
    if (isAiConversation) {
      return "Ask me anything about fitness...";
    }
    return "Type your message...";
  };

  const shouldShowIntentIndicator = isAiConversation && (isClassifying || currentIntent);

  const config = currentIntent ? intentConfigs[currentIntent.intent] : null;
  
  const borderColor = inputBorderColor.interpolate({
    inputRange: [0, 1],
    outputRange: ['#333', config?.color || '#333'],
  });

  return (
    <View style={styles.container}>
      {/* Intent Indicator - Only show for AI conversations */}
      {shouldShowIntentIndicator && (
        <Animated.View 
          style={[
            styles.intentIndicator,
            {
              opacity: intentOpacity,
              backgroundColor: config?.backgroundColor || 'transparent',
            }
          ]}
        >
          {isClassifying ? (
            <View style={styles.classifyingContainer}>
              <ActivityIndicator size="small" color="#4ECDC4" />
              <Text style={styles.classifyingText}>Understanding...</Text>
            </View>
          ) : config ? (
            <View style={styles.intentContent}>
              <Text style={styles.intentIcon}>{config.icon}</Text>
              <Text style={[styles.intentLabel, { color: config.color }]}>
                {config.label}
              </Text>
              {currentIntent?.confidence && (
                <Text style={styles.confidenceText}>
                  {Math.round(currentIntent.confidence * 100)}%
                </Text>
              )}
            </View>
          ) : null}
        </Animated.View>
      )}

      {/* Input Row */}
      <Animated.View 
        style={[
          styles.inputRow,
          { borderColor: isAiConversation ? borderColor : '#333' }
        ]}
      >
        <MentionTextInput
          containerStyle={{ flex: 1 }}
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          mentions={mentions}
          onMentionsChange={setMentions}
          placeholder={getPlaceholder()}
          placeholderTextColor="#888"
          multiline
          maxLength={500}
          editable={!disabled && !isSending}
          autoCorrect
          spellCheck
          autoCapitalize="sentences"
        />
        
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: value.trim() && !disabled && !isSending ? '#007AFF' : '#444',
            }
          ]}
          onPress={handleSend}
          disabled={!value.trim() || disabled || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons 
              name="send" 
              size={20} 
              color={value.trim() && !disabled && !isSending ? 'white' : '#888'} 
            />
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Error indicator - Only show for AI conversations */}
      {isAiConversation && currentIntent?.error && (
        <Text style={styles.errorText}>
          Classification unavailable • Continuing without smart features
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  intentIndicator: {
    marginBottom: 8,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    minHeight: 28,
    justifyContent: 'center',
  },
  classifyingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  classifyingText: {
    color: '#4ECDC4',
    fontSize: 12,
    fontWeight: '600',
  },
  intentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  intentIcon: {
    fontSize: 14,
  },
  intentLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confidenceText: {
    fontSize: 10,
    color: '#888',
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingRight: 15,
    paddingVertical: 8,
    gap: 10,
  },
  textInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 4,
  },
  sendButton: {
    padding: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
  },
  errorText: {
    color: '#888',
    fontSize: 10,
    marginTop: 4,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
