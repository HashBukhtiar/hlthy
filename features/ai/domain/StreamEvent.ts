/**
 * SSE event types for the streaming AI coach response.
 * Discriminated union — switch on `type` to get type-safe data access.
 */

export type StreamEvent =
  | StreamTokenEvent
  | StreamStructuredEvent
  | StreamDoneEvent
  | StreamErrorEvent;

/** A partial text token from the AI response. */
export interface StreamTokenEvent {
  type: 'token';
  text: string;
}

/** Structured data (workout plan, technique advice, etc.) sent after text streaming. */
export interface StreamStructuredEvent {
  type: 'structured';
  responseType: AIResponseType;
  data: Record<string, unknown>;
}

/** Stream completed successfully. */
export interface StreamDoneEvent {
  type: 'done';
  messageId?: string;
}

/** An error occurred during streaming. */
export interface StreamErrorEvent {
  type: 'error';
  message: string;
}

/** All structured response types the AI can return. */
export type AIResponseType =
  | 'workout_plan'
  | 'technique_advice'
  | 'schedule_plan'
  | 'explanation'
  | 'workout_confirmation'
  | 'progress_chart'
  | 'volume_breakdown'
  | 'strength_curve'
  | 'muscle_balance';

