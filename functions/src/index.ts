import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onInit} from "firebase-functions/v2";

let db: admin.firestore.Firestore;

// Use onInit to initialize Firebase Admin SDK
export const initializeadmin = onInit(async () => {
  console.log("onInit: Initializing Firebase Admin SDK (minimal test)...");
  // Check if already initialized (though onInit should handle this for instance startup)
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  db = admin.firestore();
  console.log("onInit: Firebase Admin SDK initialized successfully (minimal test).");
});

// A single, very simple callable function
export const minimaltestfunction = onCall(
  {region: "northamerica-northeast2"},
  (request) => {
    if (!db) {
      console.error("Firestore db not initialized for minimaltestfunction.");
      throw new HttpsError("internal", "Database not initialized.");
    }
    console.log("minimaltestfunction called with data:", request.data);
    return {
      success: true,
      message: "Minimal test function executed successfully!",
      receivedData: request.data,
    };
  }
);

export const createactivityonfollowrequest = onDocumentCreated(
  {
    document: "users/{targetUserId}/pendingFollowers/{requestingUserId}",
    region: "northamerica-northeast2",
    // You can also specify other options like memory, timeoutSeconds, etc.
    // memory: "256MiB",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return;
    }
    // const data = snapshot.data(); // The data of the document

    const {targetUserId, requestingUserId} = event.params;

    if (targetUserId === requestingUserId) {
      console.log("User cannot request to follow themselves.");
      return;
    }

    try {
      const requestingUserDoc = await db
        .collection("users")
        .doc(requestingUserId)
        .get();
      if (!requestingUserDoc.exists) {
        console.error(
          `Requesting user ${requestingUserId} not found.`
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

      await db
        .collection("activity")
        .doc(targetUserId)
        .collection("userActivity")
        .add(activityData);

      console.log(
        `Follow request activity created for ${targetUserId} from ${requestingUserId}`
      );
    } catch (error) {
      console.error(
        "Error creating follow request activity:",
        error
      );
    }
  });

export const acceptfollowrequest = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    const targetUserId = request.auth?.uid;
    const {requestingUserId, activityId} = request.data;

    if (!targetUserId) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    if (!requestingUserId || !activityId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing 'requestingUserId' or 'activityId' parameter."
      );
    }

    const batch = db.batch();

    // 1. Add to targetUser's followers
    const targetFollowersRef = db
      .collection("users")
      .doc(targetUserId)
      .collection("followers")
      .doc(requestingUserId);
    batch.set(targetFollowersRef, {
      followedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Add to requestingUser's following
    const requestingFollowingRef = db
      .collection("users")
      .doc(requestingUserId)
      .collection("following")
      .doc(targetUserId);
    batch.set(requestingFollowingRef, {
      followedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 3. Update follower/following counts (simplified, consider transactions for accuracy)
    const targetUserRef = db.collection("users").doc(targetUserId);
    batch.update(targetUserRef, {
      followerCount: admin.firestore.FieldValue.increment(1),
    });

    const requestingUserRef = db.collection("users").doc(requestingUserId);
    batch.update(requestingUserRef, {
      followingCount: admin.firestore.FieldValue.increment(1),
    });

    // 4. Update the original follow_request activity status
    const activityRef = db
      .collection("activity")
      .doc(targetUserId)
      .collection("userActivity")
      .doc(activityId);
    batch.update(activityRef, {status: "accepted", isRead: true});

    // 5. (Optional) Delete the pendingFollower document if you created one
    const pendingFollowerDocRef = db
      .collection("users")
      .doc(targetUserId)
      .collection("pendingFollowers")
      .doc(requestingUserId);
    batch.delete(pendingFollowerDocRef);

    // 6. (Optional) Create activity for the requesting user that their request was accepted
    const requestingUserDoc = await db.collection("users").doc(targetUserId).get();
    const targetUserData = requestingUserDoc.data();

    const acceptedActivityData = {
      type: "follow_accepted",
      fromUserId: targetUserId,
      fromUsername: targetUserData?.username || "Someone",
      fromProfileImageUrl: targetUserData?.profileImageUrl || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isRead: false,
    };
    const newActivityForRequesterRef = db.collection("activity").doc(requestingUserId).collection("userActivity").doc();
    batch.set(newActivityForRequesterRef, acceptedActivityData);


    try {
      await batch.commit();
      console.log(
        `Follow request from ${requestingUserId} accepted by ${targetUserId}. Activity ${activityId} updated.`
      );
      return {success: true, message: "Follow request accepted."};
    } catch (error) {
      console.error("Error accepting follow request:", error);
      throw new HttpsError(
        "internal",
        "Failed to accept follow request."
      );
    }
  }
);

export const ignorefollowrequest = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    const targetUserId = request.auth?.uid;
    const {activityId, requestingUserId} = request.data;

    if (!targetUserId) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    if (!activityId || !requestingUserId) {
      throw new HttpsError(
        "invalid-argument",
        "Missing 'activityId' or 'requestingUserId' parameter."
      );
    }

    const batch = db.batch();

    const activityRef = db
      .collection("activity")
      .doc(targetUserId)
      .collection("userActivity")
      .doc(activityId);
    batch.update(activityRef, {status: "ignored", isRead: true});

    // (Optional) Delete the pendingFollower document
    const pendingFollowerDocRef = db
      .collection("users")
      .doc(targetUserId)
      .collection("pendingFollowers")
      .doc(requestingUserId);
    batch.delete(pendingFollowerDocRef);

    try {
      await batch.commit();
      console.log(
        `Follow request activity ${activityId} ignored by ${targetUserId}.`
      );
      return {success: true, message: "Follow request ignored."};
    } catch (error) {
      console.error("Error ignoring follow request:", error);
      throw new HttpsError(
        "internal",
        "Failed to ignore follow request."
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
    const snapshot = event.data;
    if (!snapshot) return;

    const {postId, userId: reactingUserId} = event.params;
    const reactionData = snapshot.data();

    // Assuming reactionType 'like' is what we care about for this activity
    if (reactionData.type !== "like") {
      console.log(`Reaction type ${reactionData.type} on post ${postId}, not creating 'like' activity.`);
      return;
    }

    try {
      const postDoc = await db.collection("posts").doc(postId).get();
      if (!postDoc.exists) {
        console.error(`Post ${postId} not found.`);
        return;
      }
      const postData = postDoc.data();
      const postAuthorId = postData?.authorId;

      if (postAuthorId === reactingUserId) {
        console.log("User liked their own post, no activity created.");
        return;
      }

      const reactingUserDoc = await db.collection("users").doc(reactingUserId).get();
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

      await db.collection("activity").doc(postAuthorId).collection("userActivity").add(activityData);
      console.log(`'post_like' activity created for ${postAuthorId} from ${reactingUserId} for post ${postId}`);
    } catch (error) {
      console.error("Error creating 'post_like' activity:", error);
    }
  }
);
/*
// Activity on Post Comment
export const createactivityonpostcomment = onDocumentCreated(
  "posts/{postId}/comments/{commentId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const {postId, commentId} = event.params;
    const commentData = snapshot.data();
    const commentAuthorId = commentData.userId;

    try {
      const postDoc = await db.collection("posts").doc(postId).get();
      if (!postDoc.exists) {
        console.error(`Post ${postId} not found.`);
        return;
      }
      const postData = postDoc.data();
      const postAuthorId = postData?.authorId;

      if (postAuthorId === commentAuthorId) {
        console.log("User commented on their own post, no activity created.");
        return;
      }

      const commentAuthorDoc = await db.collection("users").doc(commentAuthorId).get();
      const commentAuthorData = commentAuthorDoc.data();

      const activityData = {
        type: "post_comment",
        fromUserId: commentAuthorId,
        fromUsername: commentAuthorData?.username || "Someone",
        fromProfileImageUrl: commentAuthorData?.profileImageUrl || "",
        postId: postId,
        postImageUrl: postData?.imageUrl || postData?.thumbnailUrl || "",
        commentId: commentId,
        commentText: commentData.text || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
      };

      await db.collection("activity").doc(postAuthorId).collection("userActivity").add(activityData);
      console.log(`'post_comment' activity created for ${postAuthorId} from ${commentAuthorId} for post ${postId}`);
    } catch (error) {
      console.error("Error creating 'post_comment' activity:", error);
    }
  }
);

// Activity on Workout Save
export const createactivityonworkoutsave = onDocumentCreated(
  "users/{saverUserId}/savedWorkouts/{workoutId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const {saverUserId, workoutId} = event.params;
    // const savedWorkoutData = snapshot.data();

    try {
      // Fetch the workout to get its creatorId and title
      const workoutDoc = await db.collection("workouts").doc(workoutId).get();
      if (!workoutDoc.exists) {
        console.error(`Workout ${workoutId} not found.`);
        return;
      }
      const workoutData = workoutDoc.data();
      const workoutCreatorId = workoutData?.creatorId;
      const workoutTitle = workoutData?.title || "a workout";

      if (workoutCreatorId === saverUserId) {
        console.log("User saved their own workout, no activity created.");
        return; // Don't notify for self-saves
      }

      const saverUserDoc = await db.collection("users").doc(saverUserId).get();
      const saverUserData = saverUserDoc.data();

      const activityData = {
        type: "workout_save",
        fromUserId: saverUserId,
        fromUsername: saverUserData?.username || "Someone",
        fromProfileImageUrl: saverUserData?.profileImageUrl || "",
        workoutId: workoutId,
        workoutTitle: workoutTitle,
        // workoutCoverImageUrl: workoutData?.coverImageUrl || "", // Optional
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
      };

      await db.collection("activity").doc(workoutCreatorId).collection("userActivity").add(activityData);
      console.log(`'workout_save' activity created for ${workoutCreatorId} from ${saverUserId} for workout ${workoutId}`);
    } catch (error) {
      console.error("Error creating 'workout_save' activity:", error);
    }
  }
);
*/
