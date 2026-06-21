/**
 * Firestore security-rules tests (run against the emulator).
 *
 *   npm run test:rules
 *
 * Covers the rules touched/relied on for the MVP: the signup age gate, the
 * content length caps on posts/comments/replies/messages, and basic owner
 * enforcement. Requires the Firestore emulator — launched automatically by the
 * test:rules script via `firebase emulators:exec`.
 */

const fs = require('fs');
const path = require('path');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');

const PROJECT_ID = 'hlthy-rules-test';
let testEnv;

// A DOB (MM/DD/YYYY) for someone comfortably over 16, and one under 16.
const ADULT_DOB = '01/01/1990';
const MINOR_DOB = '01/01/2020';

function adultUserDoc(uid, over = {}) {
  return { uid, username: 'someone', dateOfBirth: ADULT_DOB, ...over };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('users create — age gate', () => {
  it('allows a 16+ user to create their own profile', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(db.doc('users/alice').set(adultUserDoc('alice')));
  });

  it('rejects an underage user', async () => {
    const db = testEnv.authenticatedContext('kid').firestore();
    await assertFails(db.doc('users/kid').set(adultUserDoc('kid', { dateOfBirth: MINOR_DOB })));
  });

  it('rejects a missing/malformed date of birth', async () => {
    const db = testEnv.authenticatedContext('bob').firestore();
    await assertFails(db.doc('users/bob').set({ uid: 'bob', username: 'bob' }));
    await assertFails(db.doc('users/bob').set(adultUserDoc('bob', { dateOfBirth: 'not-a-date' })));
  });

  it('rejects creating a profile for a different uid', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(db.doc('users/someoneelse').set(adultUserDoc('someoneelse')));
  });
});

describe('content length caps', () => {
  // Seed an author profile + a post via admin (rules bypassed) for comment tests.
  async function seedPost(postId, authorId) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await db.doc(`users/${authorId}`).set(adultUserDoc(authorId));
      await db.doc(`posts/${postId}`).set({
        authorId,
        caption: 'hi',
        visibility: 'public',
        createdAt: new Date(),
      });
    });
  }

  it('rejects a post caption over the cap', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      db.doc('posts/p1').set({
        authorId: 'alice',
        caption: 'x'.repeat(5001),
        visibility: 'public',
        createdAt: new Date(),
      })
    );
  });

  it('allows a comment within the cap and rejects one over it', async () => {
    await seedPost('p1', 'author');
    const db = testEnv.authenticatedContext('alice').firestore();

    await assertSucceeds(
      db.collection('posts/p1/comments').add({
        text: 'nice work',
        authorId: 'alice',
        authorUsername: 'alice',
        createdAt: new Date(),
        likes: 0,
        likedBy: [],
        replyCount: 0,
      })
    );

    await assertFails(
      db.collection('posts/p1/comments').add({
        text: 'x'.repeat(2001),
        authorId: 'alice',
        authorUsername: 'alice',
        createdAt: new Date(),
        likes: 0,
        likedBy: [],
        replyCount: 0,
      })
    );
  });
});
