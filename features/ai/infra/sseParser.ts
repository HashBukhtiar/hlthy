/**
 * SSE event parser — converts raw SSE event data into typed StreamEvent objects.
 * Lives in infra (not domain) because it contains parsing logic.
 */
import type { StreamEvent, AIResponseType } from '@/features/ai/domain/StreamEvent';

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
