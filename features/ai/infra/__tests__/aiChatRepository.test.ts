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

jest.mock('@/features/infra/firestore', () => ({
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
  },
}));

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

import { getAIConversationId } from '../aiChatRepository';

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
