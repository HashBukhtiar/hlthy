/**
 * Streaming AI chat hook.
 * Manages message state, SSE streaming, and Firestore persistence.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { logger } from '@/shared/utils/logger';
import {
  streamCoachMessage,
  saveMessage,
  subscribeToMessages,
  getAIConversationId,
  clearConversationHistory as clearHistory,
} from '@/features/ai/infra/aiChatRepository';
import type { AIMessage } from '@/features/ai/domain/AIMessage';
import type { StreamEvent } from '@/features/ai/domain/StreamEvent';

interface UseAIChatReturn {
  messages: AIMessage[];
  streamingText: string;
  isStreaming: boolean;
  structuredData: Record<string, unknown> | null;
  structuredType: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearConversation: () => Promise<void>;
  error: string | null;
}

const MESSAGE_LIMIT = 50;

export function useAIChat(): UseAIChatReturn {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const conversationId = uid ? getAIConversationId(uid) : '';

  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [structuredData, setStructuredData] = useState<Record<string, unknown> | null>(null);
  const [structuredType, setStructuredType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<(() => void) | null>(null);
  const streamTextRef = useRef('');

  // Subscribe to message history from Firestore
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = subscribeToMessages(
      conversationId,
      MESSAGE_LIMIT,
      (msgs) => setMessages(msgs),
    );

    return unsubscribe;
  }, [conversationId]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.();
    };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!uid || !conversationId || !text.trim() || isStreaming) return;

    setError(null);
    setStreamingText('');
    setStructuredData(null);
    setStructuredType(null);
    streamTextRef.current = '';

    // 1. Save user message to Firestore immediately
    await saveMessage(conversationId, {
      senderId: uid,
      text: text.trim(),
      isAiResponse: false,
    });

    // 2. Get ID token for auth
    let idToken: string;
    try {
      idToken = await currentUser.getIdToken();
    } catch {
      setError('Authentication failed. Please log in again.');
      return;
    }

    // 3. Start streaming
    setIsStreaming(true);

    // Local variables to avoid stale closure over React state
    let localStructuredType: string | null = null;
    let localStructuredData: Record<string, unknown> | null = null;

    const handleEvent = (event: StreamEvent) => {
      switch (event.type) {
        case 'token':
          streamTextRef.current += event.text;
          setStreamingText(streamTextRef.current);
          break;

        case 'structured':
          localStructuredData = event.data;
          localStructuredType = event.responseType;
          setStructuredData(event.data);
          setStructuredType(event.responseType);
          break;

        case 'done': {
          // Save the complete AI message to Firestore
          const fullText = streamTextRef.current;
          if (fullText) {
            const messageData: Parameters<typeof saveMessage>[1] = {
              senderId: uid,
              text: fullText,
              isAiResponse: true,
            };
            if (localStructuredType) messageData.responseType = localStructuredType;
            if (localStructuredType === 'workout_plan' && localStructuredData) messageData.workoutPlan = localStructuredData;
            if (localStructuredType === 'workout_confirmation' && localStructuredData) messageData.profileData = localStructuredData;
            saveMessage(conversationId, messageData).catch((err) => {
              logger.error('useAIChat', 'Failed to save AI message', err);
              setError('Failed to save response. Please try again.');
            });
          }
          setIsStreaming(false);
          setStreamingText('');
          streamTextRef.current = '';
          break;
        }

        case 'error':
          logger.error('useAIChat', 'Stream error', event.message);
          setError(event.message);
          setIsStreaming(false);
          setStreamingText('');
          streamTextRef.current = '';
          break;
      }
    };

    abortRef.current = streamCoachMessage(text.trim(), conversationId, idToken, handleEvent);
  }, [uid, currentUser, conversationId, isStreaming]);

  const clearConversation = useCallback(async () => {
    if (!conversationId) return;
    abortRef.current?.();
    setMessages([]);
    setStreamingText('');
    setIsStreaming(false);
    setStructuredData(null);
    setStructuredType(null);
    setError(null);
    await clearHistory(conversationId);
  }, [conversationId]);

  return {
    messages,
    streamingText,
    isStreaming,
    structuredData,
    structuredType,
    sendMessage,
    clearConversation,
    error,
  };
}
