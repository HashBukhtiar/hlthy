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
  getDoc,
  setDoc,
  query,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  onSnapshot,
  Timestamp,
} from '@/features/infra/firestore';
import { db } from '@/firebaseConfig';
import { logger } from '@/shared/utils/logger';
import { API_BASE_URL } from '@/config/api';
import { parseSSEEvent } from '@/features/ai/infra/sseParser';
import type { StreamEvent } from '@/features/ai/domain/StreamEvent';
import type { AIMessage, AIMessageWrite } from '@/features/ai/domain/AIMessage';

// ── SSE Streaming ──────────────────────────────────────────────────────────

export type StreamCallback = (event: StreamEvent) => void;

/**
 * Send a message to the AI coach and stream the response via SSE.
 * Calls the callback for each event (token, structured, done, error).
 * Returns an abort function to cancel the stream.
 *
 * @param idToken - Firebase ID token (obtained by the caller via auth.currentUser.getIdToken())
 */
export function streamCoachMessage(
  message: string,
  conversationId: string,
  idToken: string,
  onEvent: StreamCallback,
): () => void {
  const controller = new AbortController();

  (async () => {
    try {

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

/** Track which conversations we've already verified exist in this session. */
const _verifiedConversations = new Set<string>();

/**
 * Ensure the AI conversation document exists with the user in participants.
 * Only checks Firestore once per session per conversation.
 */
async function _ensureConversationExists(
  conversationId: string,
  uid: string,
): Promise<void> {
  if (_verifiedConversations.has(conversationId)) return;

  const convRef = doc(db, 'conversations', conversationId);
  const snap = await getDoc(convRef);

  if (!snap.exists()) {
    await setDoc(convRef, {
      participants: [uid],
      createdAt: serverTimestamp(),
      isAiConversation: true,
    });
  }

  _verifiedConversations.add(conversationId);
}

/**
 * Save a message (user or AI) to the Firestore conversation.
 * Ensures the conversation document exists before saving.
 */
export async function saveMessage(
  conversationId: string,
  message: Omit<AIMessageWrite, 'createdAt'>,
): Promise<string> {
  // Ensure conversation doc exists (uses sender's uid for participants)
  await _ensureConversationExists(conversationId, message.senderId);

  const ref = await addDoc(
    collection(db, 'conversations', conversationId, 'messages'),
    { ...message, createdAt: serverTimestamp() },
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

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: AIMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        messages.push(_normalizeMessage(docSnap.id, data));
      });
      // Reverse to chronological order (query is desc for limit)
      onMessages(messages.reverse());
    },
    (error) => {
      logger.error('aiChatRepository', 'Message listener error', error);
    },
  );
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

    // Batch delete in chunks of 400 (Firestore limit is 500)
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const chunk = docs.slice(i, i + 400);
      const batch = writeBatch(db);
      chunk.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
    }

    // Delete the conversation document
    await deleteDoc(doc(db, 'conversations', conversationId));
    _verifiedConversations.delete(conversationId);
    return true;
  } catch (err) {
    logger.error('aiChatRepository', 'Failed to clear conversation', err);
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
