import {admin, getDb} from "./firebaseAdmin";
import {onDocumentCreated} from "firebase-functions/v2/firestore";

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
    document: "posts/{postId}/reactions/{userId}",
    region: "northamerica-northeast2",
  },
  async (event) => {
    const db = getDb();
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event for createactivityonpostlike");
      return;
    }
    const reactionData = snapshot.data();
    const {postId, userId: reactingUserId} = event.params;

    // Only create activity for "like" type reactions
    if (reactionData.type !== "like") {
      console.log(`Reaction type is '${reactionData.type}', not 'like'. No activity created for post ${postId}.`);
      return;
    }

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
    const commentAuthorId = commentData.userId;

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
