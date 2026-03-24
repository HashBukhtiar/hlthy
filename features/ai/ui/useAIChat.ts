/**
 * Streaming AI chat hook.
 * Manages message state, SSE streaming, and Firestore persistence.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { serverTimestamp } from '@/features/infra/firestore';
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
      createdAt: serverTimestamp(),
      isAiResponse: false,
    });

    // 2. Start streaming
    setIsStreaming(true);

    const handleEvent = (event: StreamEvent) => {
      switch (event.type) {
        case 'token':
          streamTextRef.current += event.text;
          setStreamingText(streamTextRef.current);
          break;

        case 'structured':
          setStructuredData(event.data);
          setStructuredType(event.responseType);
          break;

        case 'done':
          // Save the complete AI message to Firestore
          const fullText = streamTextRef.current;
          if (fullText) {
            saveMessage(conversationId, {
              senderId: 'ai_coach',
              text: fullText,
              createdAt: serverTimestamp(),
              isAiResponse: true,
              responseType: structuredType ?? undefined,
              workoutPlan: structuredType === 'workout_plan' ? structuredData ?? undefined : undefined,
              profileData: structuredType === 'workout_confirmation' ? structuredData ?? undefined : undefined,
            });
          }
          setIsStreaming(false);
          setStreamingText('');
          streamTextRef.current = '';
          break;

        case 'error':
          setError(event.message);
          setIsStreaming(false);
          setStreamingText('');
          streamTextRef.current = '';
          break;
      }
    };

    abortRef.current = streamCoachMessage(text.trim(), conversationId, handleEvent);
  }, [uid, conversationId, isStreaming, structuredType, structuredData]);

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
