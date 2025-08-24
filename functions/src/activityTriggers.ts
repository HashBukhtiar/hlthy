import {admin, getDb} from "./firebaseAdmin";
import {onDocumentCreated, onDocumentWritten} from "firebase-functions/v2/firestore";

export const createactivityonfollowrequest = onDocumentCreated(
  {
    document: "users/{targetUserId}/pendingFollowers/{requestingUserId}",
    region: "northamerica-northeast2",
  },
  async (event) => {
    console.log(`CAOFR triggered for target: ${event.params.targetUserId}, from: ${event.params.requestingUserId}`);
    const db = getDb();
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event for createactivityonfollowrequest");
      return;
    }

    const {targetUserId, requestingUserId} = event.params;

    if (targetUserId === requestingUserId) {
      console.log("User cannot request to follow themselves. Skipping activity creation.");
      return;
    }

    try {
      const requestingUserDoc = await db
        .collection("users")
        .doc(requestingUserId)
        .get();
      if (!requestingUserDoc.exists) {
        console.error(
          `Requesting user ${requestingUserId} not found for follow request. Cannot create activity.`
        );
        return;
      }
      const requestingUserData = requestingUserDoc.data();

      const activityData = {
        type: "follow_request",
        fromUserId: requestingUserId,
        fromUsername: requestingUserData?.username || "Unknown User",
        fromProfileImageUrl: requestingUserData?.profileImageUrl || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
        status: "pending",
      };

      console.log(`Attempting to write activity data for ${targetUserId}:`, JSON.stringify(activityData));

      await db
        .collection("activity")
        .doc(targetUserId)
        .collection("userActivity")
        .add(activityData);

      console.log(
        `Follow request activity created in /activity/${targetUserId}/userActivity for ${targetUserId} from ${requestingUserId}`
      );
    } catch (error) {
      console.error(
        "Error in createactivityonfollowrequest:",
        error
      );
    }
  }
);

export const createactivityonpostlike = onDocumentCreated(
  {
    document: "posts/{postId}/likers/{userId}",
    region: "northamerica-northeast2",
  },
  async (event) => {
    const db = getDb();
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event for createactivityonpostlike");
      return;
    }

    const {postId, userId: reactingUserId} = event.params;

    try {
      const postDoc = await db.collection("posts").doc(postId).get();
      if (!postDoc.exists) {
        console.error(`Post ${postId} not found for like activity.`);
        return;
      }
      const postData = postDoc.data();
      const postAuthorId = postData?.authorId;

      // Do not create activity if the user likes their own post
      if (postAuthorId === reactingUserId) {
        console.log(`User ${reactingUserId} liked their own post ${postId}. No activity created.`);
        return;
      }

      const reactingUserDoc = await db.collection("users").doc(reactingUserId).get();
      if (!reactingUserDoc.exists) {
        console.error(`Reacting user ${reactingUserId} not found for like activity.`);
        return;
      }
      const reactingUserData = reactingUserDoc.data();

      const activityData = {
        type: "post_like",
        fromUserId: reactingUserId,
        fromUsername: reactingUserData?.username || "Someone",
        fromProfileImageUrl: reactingUserData?.profileImageUrl || "",
        postId: postId,
        postImageUrl: postData?.imageUrl || postData?.thumbnailUrl || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
      };

      await db
        .collection("activity")
        .doc(postAuthorId)
        .collection("userActivity")
        .add(activityData);

      console.log(
        `'post_like' activity created for ${postAuthorId} from ${reactingUserId} for post ${postId}`
      );
    } catch (error) {
      console.error("Error creating 'post_like' activity:", error);
    }
  }
);

export const createactivityonpostcomment = onDocumentCreated(
  {
    document: "posts/{postId}/comments/{commentId}",
    region: "northamerica-northeast2",
  },
  async (event) => {
    const db = getDb();
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event for createactivityonpostcomment");
      return;
    }
    const commentData = snapshot.data();
    const {postId, commentId} = event.params;
    const commentAuthorId = commentData.authorId;

    try {
      const postDoc = await db.collection("posts").doc(postId).get();
      if (!postDoc.exists) {
        console.error(`Post ${postId} not found for comment activity.`);
        return;
      }
      const postData = postDoc.data();
      const postAuthorId = postData?.authorId;

      // Do not create activity if the user comments on their own post
      if (postAuthorId === commentAuthorId) {
        console.log(`User ${commentAuthorId} commented on their own post ${postId}. No activity created.`);
        return;
      }

      const commentAuthorDoc = await db.collection("users").doc(commentAuthorId).get();
      if (!commentAuthorDoc.exists) {
        console.error(`Comment author ${commentAuthorId} not found for comment activity.`);
        return;
      }
      const commentAuthorData = commentAuthorDoc.data();

      const activityData = {
        type: "post_comment",
        fromUserId: commentAuthorId,
        fromUsername: commentAuthorData?.username || "Someone",
        fromProfileImageUrl: commentAuthorData?.profileImageUrl || "",
        postId: postId,
        postImageUrl: postData?.imageUrl || postData?.thumbnailUrl || "",
        commentId: commentId,
        commentText: commentData.text ? commentData.text.substring(0, 100) : "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
      };

      await db
        .collection("activity")
        .doc(postAuthorId)
        .collection("userActivity")
        .add(activityData);

      console.log(
        `'post_comment' activity created for ${postAuthorId} from ${commentAuthorId} for post ${postId}`
      );
    } catch (error) {
      console.error("Error creating 'post_comment' activity:", error);
    }
  }
);

export const createactivityoncommentlike = onDocumentWritten(
  {
    document: "posts/{postId}/comments/{commentId}",
    region: "northamerica-northeast2",
  },
  async (event) => {
    const db = getDb();
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    if (!beforeData || !afterData) return;

    const {postId, commentId} = event.params;

    // Check if likedBy array was updated (someone liked the comment)
    const beforeLikedBy = beforeData.likedBy || [];
    const afterLikedBy = afterData.likedBy || [];

    if (afterLikedBy.length > beforeLikedBy.length) {
      // Someone liked the comment
      const newLiker = afterLikedBy.find((userId: string) => !beforeLikedBy.includes(userId));
      if (!newLiker) return;

      const commentAuthorId = afterData.authorId;

      // Don't create activity if user likes their own comment
      if (commentAuthorId === newLiker) return;

      try {
        const likerUserDoc = await db.collection("users").doc(newLiker).get();
        if (!likerUserDoc.exists) return;
        const likerUserData = likerUserDoc.data();

        const activityData = {
          type: "comment_like",
          fromUserId: newLiker,
          fromUsername: likerUserData?.username || "Someone",
          fromProfileImageUrl: likerUserData?.profileImageUrl || "",
          postId: postId,
          commentId: commentId,
          commentText: afterData.text ? afterData.text.substring(0, 50) + (afterData.text.length > 50 ? "..." : "") : "",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          isRead: false,
        };

        await db
          .collection("activity")
          .doc(commentAuthorId)
          .collection("userActivity")
          .add(activityData);

        console.log(`'comment_like' activity created for ${commentAuthorId} from ${newLiker}`);
      } catch (error) {
        console.error("Error creating comment like activity:", error);
      }
    }
  }
);

export const createactivityoncommentreply = onDocumentCreated(
  {
    document: "posts/{postId}/comments/{commentId}/replies/{replyId}",
    region: "northamerica-northeast2",
  },
  async (event) => {
    const db = getDb();
    const snapshot = event.data;
    if (!snapshot) return;

    const replyData = snapshot.data();
    const {postId, commentId, replyId} = event.params;
    const replyAuthorId = replyData.authorId;
    const parentCommentAuthorId = replyData.replyToUserId;

    // Don't create activity if user replies to their own comment
    if (replyAuthorId === parentCommentAuthorId) return;

    try {
      const replyAuthorDoc = await db.collection("users").doc(replyAuthorId).get();
      if (!replyAuthorDoc.exists) return;
      const replyAuthorData = replyAuthorDoc.data();

      const activityData = {
        type: "comment_reply",
        fromUserId: replyAuthorId,
        fromUsername: replyAuthorData?.username || "Someone",
        fromProfileImageUrl: replyAuthorData?.profileImageUrl || "",
        postId: postId,
        commentId: commentId,
        replyId: replyId,
        commentText: replyData.text ? replyData.text.substring(0, 50) + (replyData.text.length > 50 ? "..." : "") : "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
      };

      await db
        .collection("activity")
        .doc(parentCommentAuthorId)
        .collection("userActivity")
        .add(activityData);

      console.log(`'comment_reply' activity created for ${parentCommentAuthorId} from ${replyAuthorId}`);
    } catch (error) {
      console.error("Error creating comment reply activity:", error);
    }
  }
);

export const createactivityonreplylike = onDocumentWritten(
  {
    document: "posts/{postId}/comments/{commentId}/replies/{replyId}",
    region: "northamerica-northeast2",
  },
  async (event) => {
    const db = getDb();
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    if (!beforeData || !afterData) return;

    const {postId, commentId, replyId} = event.params;

    // Check if likedBy array was updated (someone liked the reply)
    const beforeLikedBy = beforeData.likedBy || [];
    const afterLikedBy = afterData.likedBy || [];

    if (afterLikedBy.length > beforeLikedBy.length) {
      // Someone liked the reply
      const newLiker = afterLikedBy.find((userId: string) => !beforeLikedBy.includes(userId));
      if (!newLiker) return;

      const replyAuthorId = afterData.authorId;

      // Don't create activity if user likes their own reply
      if (replyAuthorId === newLiker) return;

      try {
        const likerUserDoc = await db.collection("users").doc(newLiker).get();
        if (!likerUserDoc.exists) return;
        const likerUserData = likerUserDoc.data();

        const activityData = {
          type: "reply_like",
          fromUserId: newLiker,
          fromUsername: likerUserData?.username || "Someone",
          fromProfileImageUrl: likerUserData?.profileImageUrl || "",
          postId: postId,
          commentId: commentId,
          replyId: replyId,
          commentText: afterData.text ? afterData.text.substring(0, 50) + (afterData.text.length > 50 ? "..." : "") : "",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          isRead: false,
        };

        await db
          .collection("activity")
          .doc(replyAuthorId)
          .collection("userActivity")
          .add(activityData);

        console.log(`'reply_like' activity created for ${replyAuthorId} from ${newLiker}`);
      } catch (error) {
        console.error("Error creating reply like activity:", error);
      }
    }
  }
);

export const createactivityonworkoutsave = onDocumentCreated(
  {
    document: "users/{saverUserId}/savedWorkouts/{workoutId}",
    region: "northamerica-northeast2",
  },
  async (event) => {
    const db = getDb();
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event for createactivityonworkoutsave");
      return;
    }

    const {saverUserId, workoutId} = event.params;

    try {
      // Get the original workout details to find the creator
      const workoutDoc = await db.collection("workouts").doc(workoutId).get();
      if (!workoutDoc.exists) {
        console.error(`Workout ${workoutId} not found for save activity.`);
        return;
      }
      const workoutData = workoutDoc.data();
      const workoutCreatorId = workoutData?.creatorId;
      const workoutTitle = workoutData?.title || "a workout";

      // Do not create activity if the user saves their own workout
      if (workoutCreatorId === saverUserId) {
        console.log(`User ${saverUserId} saved their own workout ${workoutId}. No activity created.`);
        return;
      }

      // Get the saver's user data
      const saverUserDoc = await db.collection("users").doc(saverUserId).get();
      if (!saverUserDoc.exists) {
        console.error(`Saver user ${saverUserId} not found for workout save activity.`);
        return;
      }
      const saverUserData = saverUserDoc.data();

      const activityData = {
        type: "workout_save",
        fromUserId: saverUserId,
        fromUsername: saverUserData?.username || "Someone",
        fromProfileImageUrl: saverUserData?.profileImageUrl || "",
        workoutId: workoutId,
        workoutTitle: workoutTitle,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
      };

      // Create activity for the workout creator
      if (workoutCreatorId) {
        await db
          .collection("activity")
          .doc(workoutCreatorId)
          .collection("userActivity")
          .add(activityData);
        console.log(
          `'workout_save' activity created for ${workoutCreatorId} from ${saverUserId} for workout ${workoutId}`
        );
      } else {
        console.log(`Workout creator ID not found for workout ${workoutId}. No activity created.`);
      }
    } catch (error) {
      console.error("Error creating 'workout_save' activity:", error);
    }
  }
);

export const bumpCommentCount = onDocumentCreated({
  document: "posts/{postId}/comments/{commentId}",
  region: "northamerica-northeast2",
}, async (event) => {
  const db = getDb();
  const {postId} = event.params;

  await db.collection("posts").doc(postId).update({
    commentCount: admin.firestore.FieldValue.increment(1),
  });
});
