import {admin, getDb} from "../admin/firebaseAdmin";
import {onDocumentCreated, onDocumentWritten} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions";

interface MentionData {
  userId: string;
  username: string;
}

/**
 * Returns the set of userIds that are in newMentions but not in oldMentions.
 * Used to notify only newly-added mentions on edits.
 */
function getNewMentionUserIds(
  oldMentions: MentionData[],
  newMentions: MentionData[]
): string[] {
  const oldIds = new Set(oldMentions.map((m) => m.userId));
  return newMentions
    .filter((m) => !oldIds.has(m.userId))
    .map((m) => m.userId);
}

/**
 * Creates mention activity items for a list of mentioned user IDs.
 * Skips self-mentions and deduplicates by userId.
 */
async function createMentionActivities(
  db: admin.firestore.Firestore,
  mentionedUserIds: string[],
  actorId: string,
  actorDoc: admin.firestore.DocumentData,
  activityExtras: Record<string, unknown>
): Promise<void> {
  const seen = new Set<string>();
  const batch = db.batch();

  for (const mentionedUserId of mentionedUserIds) {
    if (mentionedUserId === actorId) continue; // skip self-mention
    if (seen.has(mentionedUserId)) continue;   // deduplicate
    seen.add(mentionedUserId);

    const activityRef = db
      .collection("activity")
      .doc(mentionedUserId)
      .collection("userActivity")
      .doc();

    batch.set(activityRef, {
      type: "mention",
      fromUserId: actorId,
      fromUsername: actorDoc.username || "Someone",
      fromProfileImageUrl: actorDoc.profileImageUrl || "",
      fromProfileThumbnailUrl: actorDoc.profileThumbnailUrl || "",
      ...activityExtras,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isRead: false,
    });
  }

  await batch.commit();
}

// ── Post mention trigger ────────────────────────────────────────────────────

export const createactivityonpostmention = onDocumentCreated(
  {
    document: "posts/{postId}",
    region: "northamerica-northeast2",
  },
  async (event) => {
    const db = getDb();
    const snapshot = event.data;
    if (!snapshot) return;

    const postData = snapshot.data();
    const mentions: MentionData[] = postData.mentions || [];
    if (mentions.length === 0) return;

    const {postId} = event.params;
    const actorId = postData.authorId;

    try {
      const actorDoc = await db.collection("users").doc(actorId).get();
      if (!actorDoc.exists) return;

      await createMentionActivities(
        db,
        mentions.map((m) => m.userId),
        actorId,
        actorDoc.data() as admin.firestore.DocumentData,
        {
          postId,
          postImageUrl: postData.imageUrl || "",
          postThumbnailUrl: postData.thumbnailUrl || "",
          mentionContext: "post_caption",
        }
      );

      logger.info(`Created mention activities for post ${postId}`);
    } catch (error) {
      logger.error("Error creating post mention activities:", error);
    }
  }
);

// ── Comment mention trigger ─────────────────────────────────────────────────

export const createactivityoncommentmention = onDocumentCreated(
  {
    document: "posts/{postId}/comments/{commentId}",
    region: "northamerica-northeast2",
  },
  async (event) => {
    const db = getDb();
    const snapshot = event.data;
    if (!snapshot) return;

    const commentData = snapshot.data();
    const mentions: MentionData[] = commentData.mentions || [];
    if (mentions.length === 0) return;

    const {postId, commentId} = event.params;
    const actorId = commentData.authorId;

    try {
      const [actorDoc, postDoc] = await Promise.all([
        db.collection("users").doc(actorId).get(),
        db.collection("posts").doc(postId).get(),
      ]);

      if (!actorDoc.exists) return;

      const postData = postDoc.exists ? postDoc.data() : null;

      await createMentionActivities(
        db,
        mentions.map((m) => m.userId),
        actorId,
        actorDoc.data() as admin.firestore.DocumentData,
        {
          postId,
          postImageUrl: postData?.imageUrl || "",
          postThumbnailUrl: postData?.thumbnailUrl || "",
          commentId,
          commentText: commentData.text
            ? commentData.text.substring(0, 100)
            : "",
          mentionContext: "comment",
        }
      );

      logger.info(`Created mention activities for comment ${commentId}`);
    } catch (error) {
      logger.error("Error creating comment mention activities:", error);
    }
  }
);

// ── Reply mention trigger ───────────────────────────────────────────────────

export const createactivityonreplymention = onDocumentCreated(
  {
    document: "posts/{postId}/comments/{commentId}/replies/{replyId}",
    region: "northamerica-northeast2",
  },
  async (event) => {
    const db = getDb();
    const snapshot = event.data;
    if (!snapshot) return;

    const replyData = snapshot.data();
    const mentions: MentionData[] = replyData.mentions || [];
    if (mentions.length === 0) return;

    const {postId, commentId, replyId} = event.params;
    const actorId = replyData.authorId;

    try {
      const [actorDoc, postDoc] = await Promise.all([
        db.collection("users").doc(actorId).get(),
        db.collection("posts").doc(postId).get(),
      ]);

      if (!actorDoc.exists) return;

      const postData = postDoc.exists ? postDoc.data() : null;

      await createMentionActivities(
        db,
        mentions.map((m) => m.userId),
        actorId,
        actorDoc.data() as admin.firestore.DocumentData,
        {
          postId,
          postImageUrl: postData?.imageUrl || "",
          postThumbnailUrl: postData?.thumbnailUrl || "",
          commentId,
          replyId,
          commentText: replyData.text
            ? replyData.text.substring(0, 100)
            : "",
          mentionContext: "reply",
        }
      );

      logger.info(`Created mention activities for reply ${replyId}`);
    } catch (error) {
      logger.error("Error creating reply mention activities:", error);
    }
  }
);

// ── Workout mention trigger (create + edit diff) ────────────────────────────

export const createactivityonworkoutmention = onDocumentCreated(
  {
    document: "workouts/{workoutId}",
    region: "northamerica-northeast2",
  },
  async (event) => {
    const db = getDb();
    const snapshot = event.data;
    if (!snapshot) return;

    const workoutData = snapshot.data();
    const mentions: MentionData[] = workoutData.mentions || [];
    if (mentions.length === 0) return;

    const {workoutId} = event.params;
    const actorId = workoutData.creatorId;

    try {
      const actorDoc = await db.collection("users").doc(actorId).get();
      if (!actorDoc.exists) return;

      await createMentionActivities(
        db,
        mentions.map((m) => m.userId),
        actorId,
        actorDoc.data() as admin.firestore.DocumentData,
        {
          workoutId,
          workoutTitle: workoutData.title || "",
          workoutThumbnailUrl: workoutData.thumbnailUrl || workoutData.coverImageUrl || "",
          mentionContext: "workout_description",
        }
      );

      logger.info(`Created mention activities for new workout ${workoutId}`);
    } catch (error) {
      logger.error("Error creating workout mention activities:", error);
    }
  }
);

export const updateactivityonworkoutmentionedit = onDocumentWritten(
  {
    document: "workouts/{workoutId}",
    region: "northamerica-northeast2",
  },
  async (event) => {
    const db = getDb();
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    // Only process updates (not creates or deletes)
    if (!beforeData || !afterData) return;

    const oldMentions: MentionData[] = beforeData.mentions || [];
    const newMentions: MentionData[] = afterData.mentions || [];

    // Find mentions added since last save
    const newMentionUserIds = getNewMentionUserIds(oldMentions, newMentions);
    if (newMentionUserIds.length === 0) return;

    const {workoutId} = event.params;
    const actorId = afterData.creatorId;

    try {
      const actorDoc = await db.collection("users").doc(actorId).get();
      if (!actorDoc.exists) return;

      // Filter to only new mention entries
      const newMentionEntries = newMentions.filter((m) =>
        newMentionUserIds.includes(m.userId)
      );

      await createMentionActivities(
        db,
        newMentionEntries.map((m) => m.userId),
        actorId,
        actorDoc.data() as admin.firestore.DocumentData,
        {
          workoutId,
          workoutTitle: afterData.title || "",
          workoutThumbnailUrl: afterData.thumbnailUrl || afterData.coverImageUrl || "",
          mentionContext: "workout_description",
        }
      );

      logger.info(
        `Created mention activities for ${newMentionUserIds.length} new mention(s) in workout edit ${workoutId}`
      );
    } catch (error) {
      logger.error("Error creating workout edit mention activities:", error);
    }
  }
);
