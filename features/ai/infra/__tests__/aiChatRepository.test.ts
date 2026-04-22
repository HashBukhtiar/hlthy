/**
 * Tests for pure, side-effect-free exports of aiChatRepository.
 *
 * Firebase and network dependencies are mocked at the module level so the
 * repository module can be imported safely in a Jest environment.
 *
 * Only `getAIConversationId` is tested here because it is the only export
 * that is a pure function with no I/O. SSE streaming and Firestore operations
 * require integration-level tests that are out of scope for this suite.
 */

// ── Module-level mocks (must come before any imports) ────────────────────────

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  addDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  writeBatch: jest.fn(() => ({ delete: jest.fn(), commit: jest.fn() })),
  serverTimestamp: jest.fn(() => ({ seconds: 0, nanoseconds: 0 })),
  onSnapshot: jest.fn(),
  Timestamp: {
    now: jest.fn(),
    fromDate: jest.fn(),
    prototype: { toDate: jest.fn() },
  },
}));

jest.mock('@/features/infra/firestore', () => {
  // Timestamp needs to be a constructor because the repository uses
  // `value instanceof Timestamp` — an object literal breaks instanceof.
  class MockTimestamp {
    seconds: number;
    nanoseconds: number;
    constructor(seconds: number, nanoseconds: number) {
      this.seconds = seconds;
      this.nanoseconds = nanoseconds;
    }
    toDate() {
      return new Date(this.seconds * 1000 + this.nanoseconds / 1e6);
    }
    static now = jest.fn();
    static fromDate = jest.fn();
  }
  return {
    collection: jest.fn(),
    doc: jest.fn(),
    addDoc: jest.fn(),
    deleteDoc: jest.fn(),
    getDoc: jest.fn(),
    setDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    writeBatch: jest.fn(() => ({ delete: jest.fn(), commit: jest.fn() })),
    serverTimestamp: jest.fn(() => ({ seconds: 0, nanoseconds: 0 })),
    onSnapshot: jest.fn(),
    Timestamp: MockTimestamp,
  };
});

jest.mock('@/firebaseConfig', () => ({
  db: {},
  auth: { currentUser: null },
  storage: {},
  functions: {},
}));

jest.mock('@/config/api', () => ({
  API_BASE_URL: 'https://test.example.com',
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { getAIConversationId, subscribeToMessages } from '../aiChatRepository';
import type { AIMessage } from '@/features/ai/domain/AIMessage';
import { onSnapshot } from '@/features/infra/firestore';

// ── getAIConversationId ───────────────────────────────────────────────────────

describe('getAIConversationId', () => {
  it('returns a deterministic ID for a given uid', () => {
    expect(getAIConversationId('user-abc')).toBe('user-abc_ai_conversation');
  });

  it('returns the same value on repeated calls with the same uid', () => {
    const uid = 'user-xyz';
    expect(getAIConversationId(uid)).toBe(getAIConversationId(uid));
  });

  it('returns different IDs for different uids', () => {
    expect(getAIConversationId('user-1')).not.toBe(getAIConversationId('user-2'));
  });

  it('handles a uid that already contains an underscore', () => {
    expect(getAIConversationId('org_admin')).toBe('org_admin_ai_conversation');
  });

  it('handles a uid with special characters', () => {
    // Firebase UIDs are alphanumeric but the function imposes no constraints
    expect(getAIConversationId('abc-123')).toBe('abc-123_ai_conversation');
  });

  it('handles an empty string uid', () => {
    // Edge case: if uid is empty the function should still be deterministic
    expect(getAIConversationId('')).toBe('_ai_conversation');
  });

  it('handles a very long uid without throwing', () => {
    const longUid = 'u'.repeat(128);
    expect(getAIConversationId(longUid)).toBe(`${longUid}_ai_conversation`);
  });

  it('always ends with the _ai_conversation suffix', () => {
    const uids = ['abc', 'XYZ', '123456', 'a-b-c', 'user_1'];
    for (const uid of uids) {
      expect(getAIConversationId(uid)).toMatch(/_ai_conversation$/);
    }
  });

  it('always starts with the supplied uid', () => {
    const uid = 'myUserId42';
    expect(getAIConversationId(uid)).toMatch(new RegExp(`^${uid}`));
  });
});

// ── _normalizeMessage (exercised through subscribeToMessages) ───────────────

describe('subscribeToMessages → _normalizeMessage', () => {
  beforeEach(() => {
    (onSnapshot as jest.Mock).mockReset();
  });

  const makeSnapshotDocs = (docs: Array<{ id: string; data: Record<string, unknown> }>) => ({
    forEach(cb: (doc: { id: string; data: () => Record<string, unknown> }) => void) {
      // Firestore's desc order + reverse in the subscriber means tests should
      // pass docs in newest-first order to get chronological out.
      docs.forEach((d) => cb({ id: d.id, data: () => d.data }));
    },
  });

  it('passes volumeData, strengthCurveData, and balanceData through from Firestore', () => {
    let captured: AIMessage[] = [];
    (onSnapshot as jest.Mock).mockImplementation((_q, onNext) => {
      onNext(
        makeSnapshotDocs([
          {
            id: 'msg-1',
            data: {
              text: 'coach reply',
              isAiResponse: true,
              responseType: 'volume_breakdown',
              volumeData: {
                title: 'Week',
                unit: 'lbs',
                entries: [{ label: 'Chest', value: 100 }],
              },
              strengthCurveData: {
                exercise_name: 'Squat',
                metric: 'weight',
                unit: 'lbs',
                points: [
                  { date: '2026-01-01', value: 300 },
                  { date: '2026-02-01', value: 315 },
                ],
              },
              balanceData: {
                title: 'Balance',
                unit: 'sets',
                axes: [
                  { label: 'Push', user_value: 10, target_value: 10 },
                  { label: 'Pull', user_value: 5, target_value: 10 },
                  { label: 'Legs', user_value: 12, target_value: 10 },
                ],
              },
            },
          },
        ]),
      );
      return () => {};
    });

    subscribeToMessages('conv-1', 50, (msgs) => {
      captured = msgs;
    });

    expect(captured).toHaveLength(1);
    const m = captured[0];
    expect(m.volumeData).toBeDefined();
    expect((m.volumeData as { title: string }).title).toBe('Week');
    expect(m.strengthCurveData).toBeDefined();
    expect((m.strengthCurveData as { exercise_name: string }).exercise_name).toBe('Squat');
    expect(m.balanceData).toBeDefined();
    expect((m.balanceData as { title: string }).title).toBe('Balance');
    expect(m.responseType).toBe('volume_breakdown');
  });

  it('leaves new chart fields undefined on messages that do not carry them', () => {
    let captured: AIMessage[] = [];
    (onSnapshot as jest.Mock).mockImplementation((_q, onNext) => {
      onNext(
        makeSnapshotDocs([
          {
            id: 'msg-plain',
            data: { text: 'hi', isAiResponse: false },
          },
        ]),
      );
      return () => {};
    });

    subscribeToMessages('conv-1', 50, (msgs) => {
      captured = msgs;
    });

    expect(captured).toHaveLength(1);
    expect(captured[0].volumeData).toBeUndefined();
    expect(captured[0].strengthCurveData).toBeUndefined();
    expect(captured[0].balanceData).toBeUndefined();
    expect(captured[0].chartData).toBeUndefined();
  });

  it('reverses Firestore desc order into chronological', () => {
    let captured: AIMessage[] = [];
    (onSnapshot as jest.Mock).mockImplementation((_q, onNext) => {
      onNext(
        makeSnapshotDocs([
          { id: 'b', data: { text: 'second' } }, // newest first from query
          { id: 'a', data: { text: 'first' } },
        ]),
      );
      return () => {};
    });

    subscribeToMessages('conv-1', 50, (msgs) => {
      captured = msgs;
    });

    expect(captured.map((m) => m.id)).toEqual(['a', 'b']);
  });
});
