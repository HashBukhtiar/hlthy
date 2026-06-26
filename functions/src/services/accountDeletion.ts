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
 * IDENTITY IS TOMBSTONED, NOT DELETED. `users/{uid}` and `usersPublic/{uid}`
 * keep a PII-stripped marker ({ deleted: true, displayName: 'Deleted User' })
 * so the many denormalized references to a user (comments, mentions, profile
 * links) resolve gracefully to "Deleted User" instead of crashing. All
 * subcollections and personal fields are still purged.
 *
 * NOT purged, by design:
 *  - `reports` referencing the user — retained for moderation/safety.
 *  - `analytics` / `notificationLogs` — non-PII operational logs.
 *  - Reverse `pendingFollowers` edges the user created on OTHER users — there is
 *    no per-user source list to derive them from; left as a known best-effort gap.
 *  - Mentions of the user inside OTHER users' posts keep the @username text
 *    (no feasible query to find them); the tombstone makes tapping them safe.
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

// PII-stripped marker left in place of the deleted user's identity docs.
const TOMBSTONE = {
  deleted: true,
  username: "deleted_user",
  displayName: "Deleted User",
} as const;

/** Declarative registry — ADD NEW TOP-LEVEL USER-OWNED COLLECTIONS HERE. */
export const FIRESTORE_TARGETS: FirestoreTarget[] = [
  // Per-user document roots. recursiveDelete removes the doc AND every
  // subcollection beneath it, which covers the bulk of AI/workout/social data.
  // NOTE: `users/{uid}` is NOT here — it is tombstoned (see tombstoneUserIdentity).
  {label: "home feed", kind: "userRootDoc", path: (u) => `feeds/${u}`},
  {label: "activity log", kind: "userRootDoc", path: (u) => `activity/${u}`},

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
 * Delete the direct-message threads this user participates in — on BOTH sides.
 * Removes the top-level conversation + messages, each participant's per-user
 * conversation ref (`users/{p}/conversations/{id}`), uploaded conversation
 * photos, and any pending message requests this user sent to others.
 *
 * Full-purge deletes the whole thread, so the surviving participant also loses
 * the history. If you later prefer to keep their side, tombstone the thread
 * instead (mark the conversation deleted + block replies).
 */
async function deleteUserConversations(db: Db, uid: Uid): Promise<void> {
  const snap = await db
    .collection("conversations")
    .where("participants", "array-contains", uid)
    .get();

  // Remove every participant's per-user conversation ref so the thread
  // disappears from their DM list (this was the dangling-thread bug).
  const refWriter = db.bulkWriter();
  refWriter.onWriteError((err) => err.failedAttempts < 5);
  for (const conv of snap.docs) {
    const participants: string[] = conv.get("participants") || [];
    for (const p of participants) {
      refWriter.delete(db.doc(`users/${p}/conversations/${conv.id}`));
    }
  }
  await refWriter.close();

  // Delete the shared conversation docs + messages + uploaded photos.
  const bucket = admin.storage().bucket();
  for (const conv of snap.docs) {
    await db.recursiveDelete(conv.ref);
    await bucket
      .deleteFiles({prefix: `conversations/${conv.id}/`})
      .catch((e) => console.error(`accountDeletion: conv photos cleanup failed (${conv.id})`, e));
  }

  // Pending message requests this user sent that live under other users.
  const reqSnap = await db
    .collectionGroup("messageRequests")
    .where("fromUserId", "==", uid)
    .get();
  if (!reqSnap.empty) {
    const reqWriter = db.bulkWriter();
    reqWriter.onWriteError((err) => err.failedAttempts < 5);
    reqSnap.docs.forEach((d) => reqWriter.delete(d.ref));
    await reqWriter.close();
  }
}

/**
 * Replace the author identity in the user's own comments and replies (which
 * live inside OTHER users' posts and can't be deleted) with a "Deleted User"
 * marker, so the original username stops appearing. Avatars are hydrated live
 * from the user doc, so the tombstone handles those automatically.
 *
 * Requires collection-group indexes on comments.authorId / replies.authorId
 * (see firestore.indexes.json).
 */
async function scrubAuthoredComments(db: Db, uid: Uid): Promise<void> {
  for (const group of ["comments", "replies"]) {
    const snap = await db.collectionGroup(group).where("authorId", "==", uid).get();
    if (snap.empty) continue;
    const writer = db.bulkWriter();
    writer.onWriteError((err) => err.failedAttempts < 5);
    snap.docs.forEach((d) => {
      writer.update(d.ref, {
        authorUsername: TOMBSTONE.displayName,
        authorProfileImageUrl: "",
        authorProfileThumbnailUrl: "",
        authorDeleted: true,
      });
    });
    await writer.close();
  }
}

/**
 * Tombstone the user's identity docs: purge every subcollection and overwrite
 * the doc with a PII-stripped marker. Must run AFTER the social graph is read
 * (cleanupSocialGraphEdges), since it removes followers/following subcollections.
 */
async function tombstoneUserIdentity(db: Db, uid: Uid): Promise<void> {
  const tombstone = {
    ...TOMBSTONE,
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  for (const path of [`users/${uid}`, `usersPublic/${uid}`]) {
    const ref = db.doc(path);
    const subcollections = await ref.listCollections();
    for (const sub of subcollections) {
      await db.recursiveDelete(sub);
    }
    await ref.set(tombstone); // overwrite (no merge) strips all prior fields
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

  // Order matters: read the social graph before the user's subcollections are
  // removed, and tombstone the identity last so reads above still see the user.
  await cleanupSocialGraphEdges(db, uid);
  await deleteUserConversations(db, uid);
  await scrubAuthoredComments(db, uid);
  await deleteFirestoreTargets(db, uid);
  await tombstoneUserIdentity(db, uid);
  await deleteStorage(uid);
}
