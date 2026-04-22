/**
 * Domain types for AI coach messages.
 * This is a superset of the existing FirestoreMessageData schema
 * to maintain backward compatibility with pre-streaming messages.
 */

/** An AI coach message as displayed in the chat. */
export interface AIMessage {
  id: string;
  text: string;
  role: 'user' | 'model';
  createdAt?: Date;

  /** AI response metadata */
  isAiResponse?: boolean;
  responseType?: string;
  intent?: string;

  /** Structured data from AI (workout plans, technique advice, etc.) */
  workoutPlan?: Record<string, unknown>;
  profileData?: Record<string, unknown>;
  chartData?: Record<string, unknown>;

  /** Streaming state (only during active stream) */
  isStreaming?: boolean;
}

/** Minimal message data for sending to Firestore.
 *  createdAt is set automatically by the repository via serverTimestamp(). */
export interface AIMessageWrite {
  senderId: string;
  text: string;
  isAiResponse: boolean;
  responseType?: string;
  workoutPlan?: Record<string, unknown>;
  profileData?: Record<string, unknown>;
}
