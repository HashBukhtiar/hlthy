/**
 * Account deletion — full-purge of a user's data across Firestore + Storage.
 *
 * ── HOW TO EXTEND (read this before adding a feature that stores user data) ──
 *
 * 1. Data stored UNDER `users/{uid}/<subcollection>` needs NO change here.
 *    `recursiveDelete(users/{uid})` wipes the user document and every
 *    subcollection beneath it (settings, savedPosts, savedWorkouts, feedState,
 *    workout_logs, exercise_history, coach_insights, coach_memory, ai_profile,
 *    conversations refs, followers, following, etc.). Keep storing per-user data
 *    under the user doc and it is purged automatically.
 *
 * 2. A NEW TOP-LEVEL collection keyed by an ownership field (like `posts` keyed
 *    by `authorId`) → add one entry to FIRESTORE_TARGETS below.
 *
 * 3. A NEW Storage path namespaced by uid (like `posts/{uid}/...`) → add one
 *    entry to STORAGE_TARGETS below.
 *
 * 4. Anything bespoke (shared docs, reverse graph edges) → add a handler and
 *    call it from deleteAllUserData().
 *
 * Counts (followerCount / followingCount) are reconciled automatically by the
 * countTriggers that fire on `users/{x}/followers/{y}` deletions — see
 * cleanupSocialGraphEdges for the ordering that makes this work.
 *
 * NOT purged, by design:
 *  - `reports` referencing the user — retained for moderation/safety.
 *  - `analytics` / `notificationLogs` — non-PII operational logs.
 *  - Reverse `pendingFollowers` edges the user created on OTHER users — there is
 *    no per-user source list to derive them from; left as a known best-effort gap.
 */

import {admin, getDb} from "../admin/firebaseAdmin";

type Uid = string;
type Db = admin.firestore.Firestore;

interface FirestoreTarget {
  label: string;
  // userRootDoc / ownedDoc: recursiveDelete the doc (+ any subcollections).
  // queryDeep: recursiveDelete every doc where `field` == uid (has subcollections).
  // queryShallow: delete every doc where `field` == uid (no subcollections).
  kind: "userRootDoc" | "ownedDoc" | "queryDeep" | "queryShallow";
  path?: (uid: Uid) => string;
  collection?: string;
  field?: string;
}

interface StorageTarget {
  label: string;
  prefix: (uid: Uid) => string;
}

/** Declarative registry — ADD NEW TOP-LEVEL USER-OWNED COLLECTIONS HERE. */
export const FIRESTORE_TARGETS: FirestoreTarget[] = [
  // Per-user document roots. recursiveDelete removes the doc AND every
  // subcollection beneath it, which covers the bulk of AI/workout/social data.
  {label: "user root", kind: "userRootDoc", path: (u) => `users/${u}`},
  {label: "home feed", kind: "userRootDoc", path: (u) => `feeds/${u}`},
  {label: "activity log", kind: "userRootDoc", path: (u) => `activity/${u}`},

  // Public profile mirror.
  {label: "public profile", kind: "ownedDoc", path: (u) => `usersPublic/${u}`},

  // Top-level collections keyed by an ownership field.
  {label: "posts", kind: "queryDeep", collection: "posts", field: "authorId"},
  {label: "milestones", kind: "queryShallow", collection: "milestones", field: "authorId"},
  {label: "workouts", kind: "queryShallow", collection: "workouts", field: "creatorId"},

  // --- New top-level user-owned collections go here (one line each). ---
];

/** Storage prefixes namespaced by uid — ADD NEW PER-USER STORAGE PATHS HERE. */
export const STORAGE_TARGETS: StorageTarget[] = [
  {label: "profile images", prefix: (u) => `profileImages/${u}/`},
  {label: "post media", prefix: (u) => `posts/${u}/`},
  {label: "workout covers", prefix: (u) => `workoutCovers/${u}/`},
];

/**
 * Remove the user from the social graph edges that live on OTHER users' docs.
 * Must run BEFORE the user root is deleted (it reads the user's following /
 * followers / mentionBlocks lists).
 *
 * Counts: deleting `users/{other}/followers/{uid}` fires countTriggers which
 * decrement that user's followerCount and the deleted user's followingCount.
 * The deleted user's own `followers/*` docs are removed later by
 * recursiveDelete(users/{uid}), firing the trigger that decrements each
 * follower's followingCount. We additionally delete the stale denormalized
 * `users/{follower}/following/{uid}` docs (no trigger watches `following/*`).
 */
async function cleanupSocialGraphEdges(db: Db, uid: Uid): Promise<void> {
  const [followingSnap, followersSnap, mentionBlocksSnap] = await Promise.all([
    db.collection(`users/${uid}/following`).get(),
    db.collection(`users/${uid}/followers`).get(),
    db.collection(`users/${uid}/mentionBlocks`).get(),
  ]);

  const writer = db.bulkWriter();
  writer.onWriteError((err) => err.failedAttempts < 5);

  // Users this account follows → drop this account from their followers list.
  for (const d of followingSnap.docs) {
    writer.delete(db.doc(`users/${d.id}/followers/${uid}`));
  }
  // Users who follow this account → drop the stale following edge they hold.
  for (const d of followersSnap.docs) {
    writer.delete(db.doc(`users/${d.id}/following/${uid}`));
  }
  // Reverse mention-block edges.
  for (const d of mentionBlocksSnap.docs) {
    writer.delete(db.doc(`users/${d.id}/mentionBlockedBy/${uid}`));
  }

  await writer.close();
}

/**
 * Delete the direct-message threads this user participates in, including the
 * messages subcollection and any uploaded conversation photos.
 *
 * NOTE: a conversation is shared between two participants. Full-purge deletes
 * the whole thread, which also removes the other participant's copy. If you
 * later prefer to preserve the other side, switch this to anonymize the user's
 * messages + remove them from `participants` instead.
 */
async function deleteUserConversations(db: Db, uid: Uid): Promise<void> {
  const snap = await db
    .collection("conversations")
    .where("participants", "array-contains", uid)
    .get();

  const bucket = admin.storage().bucket();
  for (const conv of snap.docs) {
    await db.recursiveDelete(conv.ref);
    await bucket
      .deleteFiles({prefix: `conversations/${conv.id}/`})
      .catch((e) => console.error(`accountDeletion: conv photos cleanup failed (${conv.id})`, e));
  }
}

async function deleteFirestoreTargets(db: Db, uid: Uid): Promise<void> {
  for (const t of FIRESTORE_TARGETS) {
    if (t.kind === "userRootDoc" || t.kind === "ownedDoc") {
      await db.recursiveDelete(db.doc(t.path!(uid)));
    } else {
      const snap = await db.collection(t.collection!).where(t.field!, "==", uid).get();
      if (t.kind === "queryDeep") {
        for (const d of snap.docs) await db.recursiveDelete(d.ref);
      } else {
        const writer = db.bulkWriter();
        writer.onWriteError((err) => err.failedAttempts < 5);
        snap.docs.forEach((d) => writer.delete(d.ref));
        await writer.close();
      }
    }
  }
}

async function deleteStorage(uid: Uid): Promise<void> {
  const bucket = admin.storage().bucket();
  for (const t of STORAGE_TARGETS) {
    await bucket
      .deleteFiles({prefix: t.prefix(uid)})
      .catch((e) => console.error(`accountDeletion: storage cleanup failed (${t.label})`, e));
  }
}

/**
 * Purge all data owned by `uid`. Does NOT delete the Firebase Auth user — the
 * caller should do that last, after this resolves.
 */
export async function deleteAllUserData(uid: Uid): Promise<void> {
  const db = getDb();
  if (!db) throw new Error("Firestore not initialized");

  // Order matters: read-then-delete the social graph before the user root goes.
  await cleanupSocialGraphEdges(db, uid);
  await deleteUserConversations(db, uid);
  await deleteFirestoreTargets(db, uid);
  await deleteStorage(uid);
}
