import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebaseConfig';

interface SmartChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  conversationId?: string;
  otherParticipantId?: string | null;
}

export const SmartChatInput: React.FC<SmartChatInputProps> = ({
  value,
  onChangeText,
  onSend,
  placeholder = "Type your message...",
  disabled = false,
  conversationId,
  otherParticipantId,
}) => {
  const { currentUser } = useAuth();
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!value.trim() || isSending || disabled) return;

    const messageText = value.trim();
    setIsSending(true);

    try {
      if (otherParticipantId && currentUser && conversationId) {
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
            // Normal message send
            onSend(messageText);
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
            onSend(messageText);
          }
        }
      } else {
        // Fallback to normal send
        onSend(messageText);
      }
    } catch (error) {
      console.error('Error in handleSend:', error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});
