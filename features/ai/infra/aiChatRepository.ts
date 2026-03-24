/**
 * AI Chat Repository — SSE client + Firestore message storage.
 * This is the ONLY file that imports the SSE client and Firestore for AI chat.
 */
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from '@/features/infra/firestore';
import { db, auth } from '@/firebaseConfig';
import { API_BASE_URL } from '@/config/api';
import { parseSSEEvent } from '@/features/ai/domain/StreamEvent';
import type { StreamEvent } from '@/features/ai/domain/StreamEvent';
import type { AIMessage, AIMessageWrite } from '@/features/ai/domain/AIMessage';

// ── SSE Streaming ──────────────────────────────────────────────────────────

export type StreamCallback = (event: StreamEvent) => void;

/**
 * Send a message to the AI coach and stream the response via SSE.
 * Calls the callback for each event (token, structured, done, error).
 * Returns an abort function to cancel the stream.
 */
export function streamCoachMessage(
  message: string,
  conversationId: string,
  onEvent: StreamCallback,
): () => void {
  const controller = new AbortController();

  (async () => {
    try {
      // Get Firebase ID token for auth
      const user = auth.currentUser;
      if (!user) {
        onEvent({ type: 'error', message: 'Not authenticated' });
        return;
      }
      const idToken = await user.getIdToken();

      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ message, conversation_id: conversationId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        onEvent({ type: 'error', message: `Server error: ${response.status}` });
        return;
      }

      // Read the SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        // Fallback: read as text (non-streaming environments)
        const text = await response.text();
        _parseFallbackResponse(text, onEvent);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (eventType && data) {
              const event = parseSSEEvent(eventType, data);
              if (event) onEvent(event);
            }
            eventType = '';
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      onEvent({
        type: 'error',
        message: 'Connection to coach lost. Please try again.',
      });
    }
  })();

  return () => controller.abort();
}

/**
 * Fallback for environments where ReadableStream is not available.
 * Parses the complete response text as a series of SSE events.
 */
function _parseFallbackResponse(text: string, onEvent: StreamCallback): void {
  const lines = text.split('\n');
  let eventType = '';

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      eventType = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (eventType && data) {
        const event = parseSSEEvent(eventType, data);
        if (event) onEvent(event);
      }
      eventType = '';
    }
  }
}

// ── Firestore Message Storage ──────────────────────────────────────────────

/**
 * Save a message (user or AI) to the Firestore conversation.
 */
export async function saveMessage(
  conversationId: string,
  message: AIMessageWrite,
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'conversations', conversationId, 'messages'),
    message,
  );
  return ref.id;
}

/**
 * Load message history from Firestore for the AI conversation.
 * Normalizes old pre-streaming messages to the AIMessage shape.
 */
export function subscribeToMessages(
  conversationId: string,
  messageLimit: number,
  onMessages: (messages: AIMessage[]) => void,
): () => void {
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(messageLimit),
  );

  return onSnapshot(q, (snapshot) => {
    const messages: AIMessage[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      messages.push(_normalizeMessage(docSnap.id, data));
    });
    // Reverse to chronological order (query is desc for limit)
    onMessages(messages.reverse());
  });
}

/**
 * Normalize a Firestore message document to the AIMessage shape.
 * Handles both old pre-streaming and new message formats.
 */
function _normalizeMessage(id: string, data: Record<string, unknown>): AIMessage {
  const isAi = data.isAiResponse === true;
  const createdAt = data.createdAt instanceof Timestamp
    ? data.createdAt.toDate()
    : undefined;

  return {
    id,
    text: (data.text as string) ?? '',
    role: isAi ? 'model' : 'user',
    createdAt,
    isAiResponse: isAi,
    responseType: data.responseType as string | undefined,
    intent: data.intent as string | undefined,
    workoutPlan: data.workoutPlan as Record<string, unknown> | undefined,
    profileData: data.profileData as Record<string, unknown> | undefined,
  };
}

/**
 * Clear the AI conversation history.
 * Deletes all messages in the conversation's messages subcollection,
 * then deletes the conversation document itself.
 */
export async function clearConversationHistory(
  conversationId: string,
): Promise<boolean> {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const snapshot = await getDocs(messagesRef);

    // Batch delete all messages
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();

    // Delete the conversation document
    await deleteDoc(doc(db, 'conversations', conversationId));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the AI conversation ID for a user.
 * Deterministic: ai_coach_{uid}
 */
export function getAIConversationId(uid: string): string {
  return `${uid}_ai_conversation`;
}
