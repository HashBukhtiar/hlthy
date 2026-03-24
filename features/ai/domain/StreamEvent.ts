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
  | 'workout_confirmation';

/**
 * Parse a raw SSE event into a typed StreamEvent.
 * Returns null if the event cannot be parsed.
 */
export function parseSSEEvent(eventType: string, data: string): StreamEvent | null {
  try {
    const parsed = JSON.parse(data);

    switch (eventType) {
      case 'token':
        return { type: 'token', text: parsed.text ?? '' };

      case 'structured':
        return {
          type: 'structured',
          responseType: parsed.type as AIResponseType,
          data: parsed.data ?? parsed,
        };

      case 'done':
        return { type: 'done', messageId: parsed.message_id };

      case 'error':
        return { type: 'error', message: parsed.message ?? 'Unknown error' };

      default:
        return null;
    }
  } catch {
    return null;
  }
}
