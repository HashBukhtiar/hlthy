/**
 * AI Coach Chat Screen — dedicated streaming chat with the AI coach.
 * Separate from the DM chat screen (app/chat/[id].tsx).
 */
import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ACCENT_COLOR } from '@/constants/Colors';
import { useAIChat } from '@/features/ai/ui/useAIChat';
import { StreamingBubble } from '@/components/chat/StreamingBubble';
import { MessageRenderer } from '@/components/ai/MessageRenderer';
import type { AIMessage } from '@/features/ai/domain/AIMessage';
import { isProgressChartData } from '@/features/ai/domain/ProgressChart';

export default function AIChatScreen() {
  const router = useRouter();
  const {
    messages,
    streamingText,
    isStreaming,
    structuredData,
    structuredType,
    sendMessage,
    error,
  } = useAIChat();

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isStreaming) return;
    setInputText('');
    await sendMessage(text);
  }, [inputText, isStreaming, sendMessage]);

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const renderMessage = useCallback(({ item }: { item: AIMessage }) => {
    const isUser = item.role === 'user';

    if (!isUser && item.responseType && item.responseType !== 'conversational') {
      // Render structured AI response via MessageRenderer
      const chartData = isProgressChartData(item.chartData) ? item.chartData : undefined;
      return (
        <View style={styles.aiMessageContainer}>
          <MessageRenderer
            message={item.text}
            responseType={item.responseType}
            workoutPlan={item.workoutPlan}
            profileData={item.profileData as any}
            chartData={chartData}
          />
        </View>
      );
    }

    return (
      <View style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.aiBubble,
      ]}>
        <Text style={[
          styles.messageText,
          isUser ? styles.userText : styles.aiText,
        ]}>
          {item.text}
        </Text>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="sparkles" size={20} color="#d466ff" />
          <Text style={styles.headerTitle}>Coach</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={scrollToBottom}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="sparkles" size={48} color="#333" />
              <Text style={styles.emptyTitle}>Hey! I'm your Coach.</Text>
              <Text style={styles.emptySubtitle}>
                Ask me to build a workout, review your form, or help plan your training.
              </Text>
            </View>
          }
          ListFooterComponent={
            <>
              {isStreaming && streamingText ? (
                <StreamingBubble text={streamingText} />
              ) : isStreaming ? (
                <View style={styles.thinkingContainer}>
                  <ActivityIndicator size="small" color="#d466ff" />
                  <Text style={styles.thinkingText}>Coach is thinking...</Text>
                </View>
              ) : null}
              {structuredData && structuredType && !isStreaming && (
                <View style={styles.aiMessageContainer}>
                  <MessageRenderer
                    message=""
                    responseType={structuredType}
                    workoutPlan={structuredType === 'workout_plan' ? structuredData : undefined}
                    profileData={structuredType === 'workout_confirmation' ? structuredData as any : undefined}
                    chartData={
                      structuredType === 'progress_chart' && isProgressChartData(structuredData)
                        ? structuredData
                        : undefined
                    }
                  />
                </View>
              )}
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </>
          }
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message Coach..."
            placeholderTextColor="#666"
            multiline
            maxLength={5000}
            returnKeyType="default"
            editable={!isStreaming}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || isStreaming}
            style={[
              styles.sendButton,
              (!inputText.trim() || isStreaming) && styles.sendButtonDisabled,
            ]}
          >
            <Ionicons
              name="arrow-up-circle"
              size={32}
              color={inputText.trim() && !isStreaming ? ACCENT_COLOR : '#333'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  flex: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#222',
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  headerRight: {
    width: 36,
  },
  // Messages
  messageList: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  messageBubble: {
    marginVertical: 4,
    marginHorizontal: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: ACCENT_COLOR,
    borderTopRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#fff',
  },
  aiMessageContainer: {
    marginHorizontal: 12,
    marginVertical: 4,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  // Streaming
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 8,
  },
  thinkingText: {
    color: '#888',
    fontSize: 14,
  },
  // Error
  errorContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    backgroundColor: '#1a0000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF2D55',
  },
  errorText: {
    color: '#FF2D55',
    fontSize: 14,
  },
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#222',
    backgroundColor: '#000',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 12,
    color: '#fff',
    fontSize: 16,
    maxHeight: 120,
    marginRight: 8,
  },
  sendButton: {
    padding: 2,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
