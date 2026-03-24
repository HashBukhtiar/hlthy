/**
 * Tests for parseSSEEvent — the pure SSE event parsing function.
 * This function has no dependencies (no Firebase, no React) so it is
 * tested directly with no mocking required.
 */
import { parseSSEEvent } from '../../infra/sseParser';
import type {
  StreamTokenEvent,
  StreamStructuredEvent,
  StreamDoneEvent,
  StreamErrorEvent,
} from '../StreamEvent';

// ── token events ─────────────────────────────────────────────────────────────

describe('parseSSEEvent — token', () => {
  it('parses a token event with text', () => {
    const result = parseSSEEvent('token', JSON.stringify({ text: 'Hello' }));
    expect(result).not.toBeNull();
    const event = result as StreamTokenEvent;
    expect(event.type).toBe('token');
    expect(event.text).toBe('Hello');
  });

  it('returns an empty string for text when text field is missing', () => {
    const result = parseSSEEvent('token', JSON.stringify({}));
    const event = result as StreamTokenEvent;
    expect(event.type).toBe('token');
    expect(event.text).toBe('');
  });

  it('returns an empty string for text when text field is null', () => {
    const result = parseSSEEvent('token', JSON.stringify({ text: null }));
    const event = result as StreamTokenEvent;
    expect(event.text).toBe('');
  });

  it('preserves whitespace and newlines in token text', () => {
    const result = parseSSEEvent('token', JSON.stringify({ text: ' line one\nline two ' }));
    const event = result as StreamTokenEvent;
    expect(event.text).toBe(' line one\nline two ');
  });

  it('handles an empty string token text explicitly', () => {
    const result = parseSSEEvent('token', JSON.stringify({ text: '' }));
    const event = result as StreamTokenEvent;
    expect(event.text).toBe('');
  });
});

// ── structured events ─────────────────────────────────────────────────────────

describe('parseSSEEvent — structured', () => {
  it('parses a structured event with type and data fields', () => {
    const payload = {
      type: 'workout_plan',
      data: { exercises: ['squat', 'deadlift'] },
    };
    const result = parseSSEEvent('structured', JSON.stringify(payload));
    expect(result).not.toBeNull();
    const event = result as StreamStructuredEvent;
    expect(event.type).toBe('structured');
    expect(event.responseType).toBe('workout_plan');
    expect(event.data).toEqual({ exercises: ['squat', 'deadlift'] });
  });

  it('falls back to the full parsed object when data field is absent', () => {
    // Server may send structured payload without a nested `data` key
    const payload = { type: 'technique_advice', tip: 'keep your back straight' };
    const result = parseSSEEvent('structured', JSON.stringify(payload));
    const event = result as StreamStructuredEvent;
    expect(event.responseType).toBe('technique_advice');
    expect(event.data).toEqual(payload);
  });

  it('handles a structured event with an empty data object', () => {
    const payload = { type: 'explanation', data: {} };
    const result = parseSSEEvent('structured', JSON.stringify(payload));
    const event = result as StreamStructuredEvent;
    expect(event.data).toEqual({});
  });

  it('handles all known AIResponseType values', () => {
    const types = [
      'workout_plan',
      'technique_advice',
      'schedule_plan',
      'explanation',
      'workout_confirmation',
    ] as const;

    for (const responseType of types) {
      const result = parseSSEEvent('structured', JSON.stringify({ type: responseType, data: {} }));
      const event = result as StreamStructuredEvent;
      expect(event.responseType).toBe(responseType);
    }
  });

  it('passes through an unknown responseType string without error', () => {
    // The cast to AIResponseType is runtime-unchecked; the function should not throw
    const result = parseSSEEvent('structured', JSON.stringify({ type: 'future_unknown_type', data: {} }));
    expect(result).not.toBeNull();
    const event = result as StreamStructuredEvent;
    expect(event.responseType).toBe('future_unknown_type');
  });
});

// ── done events ───────────────────────────────────────────────────────────────

describe('parseSSEEvent — done', () => {
  it('parses a done event with a message_id', () => {
    const result = parseSSEEvent('done', JSON.stringify({ message_id: 'msg-abc-123' }));
    expect(result).not.toBeNull();
    const event = result as StreamDoneEvent;
    expect(event.type).toBe('done');
    expect(event.messageId).toBe('msg-abc-123');
  });

  it('parses a done event when message_id is absent', () => {
    const result = parseSSEEvent('done', JSON.stringify({}));
    const event = result as StreamDoneEvent;
    expect(event.type).toBe('done');
    expect(event.messageId).toBeUndefined();
  });

  it('parses a done event when message_id is null', () => {
    const result = parseSSEEvent('done', JSON.stringify({ message_id: null }));
    const event = result as StreamDoneEvent;
    expect(event.type).toBe('done');
    expect(event.messageId).toBeNull();
  });
});

// ── error events ──────────────────────────────────────────────────────────────

describe('parseSSEEvent — error', () => {
  it('parses an error event with a message', () => {
    const result = parseSSEEvent('error', JSON.stringify({ message: 'Service unavailable' }));
    expect(result).not.toBeNull();
    const event = result as StreamErrorEvent;
    expect(event.type).toBe('error');
    expect(event.message).toBe('Service unavailable');
  });

  it('falls back to "Unknown error" when message field is missing', () => {
    const result = parseSSEEvent('error', JSON.stringify({}));
    const event = result as StreamErrorEvent;
    expect(event.message).toBe('Unknown error');
  });

  it('falls back to "Unknown error" when message field is null', () => {
    const result = parseSSEEvent('error', JSON.stringify({ message: null }));
    const event = result as StreamErrorEvent;
    expect(event.message).toBe('Unknown error');
  });

  it('preserves a multi-sentence error message', () => {
    const msg = 'Token limit exceeded. Please start a new conversation.';
    const result = parseSSEEvent('error', JSON.stringify({ message: msg }));
    const event = result as StreamErrorEvent;
    expect(event.message).toBe(msg);
  });
});

// ── unknown / unrecognised event types ────────────────────────────────────────

describe('parseSSEEvent — unknown event type', () => {
  it('returns null for an unrecognised event type', () => {
    const result = parseSSEEvent('ping', JSON.stringify({ text: 'keepalive' }));
    expect(result).toBeNull();
  });

  it('returns null for an empty string event type', () => {
    const result = parseSSEEvent('', JSON.stringify({ text: 'data' }));
    expect(result).toBeNull();
  });

  it('returns null for a mixed-case event type that does not match a known type', () => {
    // Event types are case-sensitive — "Token" is not "token"
    const result = parseSSEEvent('Token', JSON.stringify({ text: 'Hi' }));
    expect(result).toBeNull();
  });

  it('returns null for a numeric string event type', () => {
    const result = parseSSEEvent('123', JSON.stringify({}));
    expect(result).toBeNull();
  });
});

// ── malformed / invalid JSON data ────────────────────────────────────────────

describe('parseSSEEvent — invalid JSON', () => {
  it('returns null when data is not valid JSON', () => {
    const result = parseSSEEvent('token', 'not json at all');
    expect(result).toBeNull();
  });

  it('returns null when data is an empty string', () => {
    const result = parseSSEEvent('token', '');
    expect(result).toBeNull();
  });

  it('returns null when data is only whitespace', () => {
    const result = parseSSEEvent('token', '   ');
    expect(result).toBeNull();
  });

  it('returns null when data is a bare JSON string (not an object)', () => {
    // JSON.parse('"hello"') succeeds but parsed.text is undefined → falls back to ''
    // This still returns a valid token event with empty text, not null
    const result = parseSSEEvent('token', '"hello"');
    // parsed = "hello" (a string), parsed.text is undefined, so text = ''
    const event = result as StreamTokenEvent;
    expect(event.type).toBe('token');
    expect(event.text).toBe('');
  });

  it('returns null when data is a bare JSON number', () => {
    // JSON.parse('42') = 42 (a number). 42.text is undefined → text = ''
    const result = parseSSEEvent('token', '42');
    const event = result as StreamTokenEvent;
    expect(event.type).toBe('token');
    expect(event.text).toBe('');
  });

  it('returns null when data is a JSON array', () => {
    // JSON.parse('[]') = []. [].text is undefined → text = ''
    const result = parseSSEEvent('token', '[]');
    const event = result as StreamTokenEvent;
    expect(event.type).toBe('token');
    expect(event.text).toBe('');
  });

  it('returns null for truncated JSON', () => {
    const result = parseSSEEvent('token', '{"text": "partial');
    expect(result).toBeNull();
  });

  it('returns null for null literal as data', () => {
    // JSON.parse('null') = null. null.text throws → returns null
    const result = parseSSEEvent('token', 'null');
    expect(result).toBeNull();
  });

  it('returns null for undefined string as data (not valid JSON)', () => {
    const result = parseSSEEvent('done', 'undefined');
    expect(result).toBeNull();
  });

  it('returns null when data has unquoted keys (invalid JSON)', () => {
    const result = parseSSEEvent('done', '{message_id: "abc"}');
    expect(result).toBeNull();
  });

  it('returns null when data has a trailing comma (invalid JSON)', () => {
    const result = parseSSEEvent('error', '{"message": "oops",}');
    expect(result).toBeNull();
  });
});

// ── return type discriminant guards ──────────────────────────────────────────

describe('parseSSEEvent — discriminated union shape', () => {
  it('token result satisfies the StreamTokenEvent shape', () => {
    const result = parseSSEEvent('token', JSON.stringify({ text: 'hi' }));
    expect(result).toMatchObject({ type: 'token', text: 'hi' });
    // Ensure no extra `message` or `responseType` field bleeds in
    expect(result).not.toHaveProperty('message');
    expect(result).not.toHaveProperty('responseType');
  });

  it('done result satisfies the StreamDoneEvent shape', () => {
    const result = parseSSEEvent('done', JSON.stringify({ message_id: 'x' }));
    expect(result).toMatchObject({ type: 'done', messageId: 'x' });
  });

  it('error result satisfies the StreamErrorEvent shape', () => {
    const result = parseSSEEvent('error', JSON.stringify({ message: 'bad' }));
    expect(result).toMatchObject({ type: 'error', message: 'bad' });
  });

  it('structured result satisfies the StreamStructuredEvent shape', () => {
    const result = parseSSEEvent(
      'structured',
      JSON.stringify({ type: 'explanation', data: { detail: 'focus on form' } }),
    );
    expect(result).toMatchObject({
      type: 'structured',
      responseType: 'explanation',
      data: { detail: 'focus on form' },
    });
  });
});
