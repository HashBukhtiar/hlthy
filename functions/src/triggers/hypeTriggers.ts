import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {getDb} from "../admin/firebaseAdmin";
import {awardHype, awardCappedHype, HYPE_POINTS} from "../services/hypeService";

const REGION = "northamerica-northeast2";

// These fire in parallel with the existing activity triggers on the same
// document paths, keeping Hype isolated. All awards are best-effort and never
// throw. See docs/hype.md.

// Like on a post → Hype to the author (received) + capped Hype to the liker.
export const hypeonpostlike = onDocumentCreated(
  {document: "posts/{postId}/likers/{userId}", region: REGION},
  async (event) => {
    const {postId, userId: likerId} = event.params;
    try {
      const postDoc = await getDb().collection("posts").doc(postId).get();
      const authorId = postDoc.data()?.authorId;
      if (authorId && authorId !== likerId) {
        await awardHype(authorId, HYPE_POINTS.LIKE_RECEIVED);
      }
      await awardCappedHype(likerId, HYPE_POINTS.ENGAGE_GIVEN);
    } catch (error) {
      console.error("hypeonpostlike failed:", error);
    }
  }
);

// Comment on a post → Hype to the author (received) + capped Hype to commenter.
export const hypeonpostcomment = onDocumentCreated(
  {document: "posts/{postId}/comments/{commentId}", region: REGION},
  async (event) => {
    const {postId} = event.params;
    const commenterId = event.data?.data()?.authorId;
    if (!commenterId) return;
    try {
      const postDoc = await getDb().collection("posts").doc(postId).get();
      const authorId = postDoc.data()?.authorId;
      if (authorId && authorId !== commenterId) {
        await awardHype(authorId, HYPE_POINTS.COMMENT_RECEIVED);
      }
      await awardCappedHype(commenterId, HYPE_POINTS.ENGAGE_GIVEN);
    } catch (error) {
      console.error("hypeonpostcomment failed:", error);
    }
  }
);

// Save/bookmark a post → Hype to the author (highest-intent signal).
export const hypeonpostsave = onDocumentCreated(
  {document: "users/{saverId}/savedPosts/{postId}", region: REGION},
  async (event) => {
    const {saverId, postId} = event.params;
    try {
      const postDoc = await getDb().collection("posts").doc(postId).get();
      const authorId = postDoc.data()?.authorId;
      if (authorId && authorId !== saverId) {
        await awardHype(authorId, HYPE_POINTS.SAVE_RECEIVED);
      }
    } catch (error) {
      console.error("hypeonpostsave failed:", error);
    }
  }
);

// New follower → Hype to the followed user.
export const hypeonfollow = onDocumentCreated(
  {document: "users/{userId}/followers/{followerId}", region: REGION},
  async (event) => {
    const {userId, followerId} = event.params;
    if (userId === followerId) return;
    await awardHype(userId, HYPE_POINTS.FOLLOW_RECEIVED);
  }
);

// Completed workout → grind Hype to the user.
export const hypeonworkoutcomplete = onDocumentCreated(
  {document: "users/{userId}/workout_logs/{logId}", region: REGION},
  async (event) => {
    await awardHype(event.params.userId, HYPE_POINTS.WORKOUT_COMPLETE);
  }
);

// New milestone post → grind Hype to the author.
export const hypeonmilestone = onDocumentCreated(
  {document: "posts/{postId}", region: REGION},
  async (event) => {
    const data = event.data?.data();
    if (data?.isMilestone && data.authorId) {
      await awardHype(data.authorId, HYPE_POINTS.MILESTONE);
    }
  }
);
