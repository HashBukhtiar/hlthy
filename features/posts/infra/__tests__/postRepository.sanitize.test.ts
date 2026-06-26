/**
 * Repository-layer tests for postRepository's input-sanitization wiring.
 * Firebase is fully mocked — these assert that user-supplied text is sanitized
 * (control/zero-width stripped, trimmed) before it is written, and that
 * empty-after-sanitize input is rejected.
 */

jest.mock('@/firebaseConfig', () => ({ db: {} }));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({ __type: 'collection' })),
  doc: jest.fn(() => ({ id: 'generated-id' })),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  runTransaction: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TS'),
  Timestamp: { now: jest.fn(() => ({ seconds: 0, nanoseconds: 0 })) },
  increment: jest.fn((n: number) => ({ __increment: n })),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
  writeBatch: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
}));

import { PostRepository } from '../postRepository';

const firestore = jest.requireMock('firebase/firestore');
const { addDoc, setDoc, getDoc, runTransaction } = firestore;

// A string containing a zero-width space and surrounding whitespace.
const ZWSP = String.fromCharCode(0x200b);
const DIRTY = `  he${ZWSP}llo  `;
const CLEAN = 'hello';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('addComment sanitization', () => {
  it('writes sanitized text and returns it', async () => {
    addDoc.mockResolvedValue({ id: 'comment1' });
    const result = await PostRepository.addComment('post1', 'uid1', 'user1', DIRTY);

    expect(addDoc).toHaveBeenCalledTimes(1);
    const written = addDoc.mock.calls[0][1];
    expect(written.text).toBe(CLEAN);
    expect(result.text).toBe(CLEAN);
    expect(result.id).toBe('comment1');
  });

  it('rejects input that is empty after sanitizing', async () => {
    await expect(
      PostRepository.addComment('post1', 'uid1', 'user1', `   ${ZWSP}  `)
    ).rejects.toThrow('Comment cannot be empty');
    expect(addDoc).not.toHaveBeenCalled();
  });
});

describe('addReply sanitization', () => {
  const author = { uid: 'uid1', username: 'user1', profileImageUrl: '', profileThumbnailUrl: '' } as any;

  it('writes sanitized text inside the transaction', async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ authorId: 'parent' }) });
    const tx = { set: jest.fn(), update: jest.fn() };
    runTransaction.mockImplementation(async (_db: any, fn: any) => fn(tx));

    const result = await PostRepository.addReply('post1', 'comment1', author, DIRTY);

    expect(tx.set).toHaveBeenCalledTimes(1);
    const written = tx.set.mock.calls[0][1];
    expect(written.text).toBe(CLEAN);
    expect(result.text).toBe(CLEAN);
  });

  it('rejects reply that is empty after sanitizing', async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ authorId: 'parent' }) });
    await expect(
      PostRepository.addReply('post1', 'comment1', author, '   ')
    ).rejects.toThrow('Reply cannot be empty');
    expect(runTransaction).not.toHaveBeenCalled();
  });
});

describe('createRegularPost sanitization', () => {
  it('sanitizes the caption before writing', async () => {
    setDoc.mockResolvedValue(undefined);
    const id = await PostRepository.createRegularPost(
      { uid: 'uid1', username: 'user1' } as any,
      { caption: DIRTY, visibility: 'public' }
    );

    expect(setDoc).toHaveBeenCalledTimes(1);
    const written = setDoc.mock.calls[0][1];
    expect(written.caption).toBe(CLEAN);
    expect(id).toBe('generated-id');
  });
});
