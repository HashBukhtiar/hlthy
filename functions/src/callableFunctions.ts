import {admin, getDb} from "./firebaseAdmin";
import {onCall, HttpsError} from "firebase-functions/v2/https";

export const minimaltestfunction = onCall(
  {region: "northamerica-northeast2"},
  (request) => {
    const db = getDb();
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

export const acceptfollowrequest = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    const db = getDb();
    if (!db) {
      console.error("Firestore db not initialized for acceptfollowrequest. This should not happen if onInit ran.");
      throw new HttpsError("internal", "Database not initialized. Please try again.");
    }
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

    // 3. Update follower/following counts
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

    // 5. Delete the pendingFollower document
    const pendingFollowerDocRef = db
      .collection("users")
      .doc(targetUserId)
      .collection("pendingFollowers")
      .doc(requestingUserId);
    batch.delete(pendingFollowerDocRef);

    // 6. Create activity for the requesting user
    const targetUserDoc = await db.collection("users").doc(targetUserId).get();
    const targetUserData = targetUserDoc.data();

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
    const db = getDb();
    if (!db) {
      console.error("callableFunctions: db not initialized for ignorefollowrequest");
      throw new HttpsError("internal", "Database not initialized. Please try again.");
    }

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

    // Update the original follow_request activity status to "ignored"
    const activityRef = db
      .collection("activity")
      .doc(targetUserId)
      .collection("userActivity")
      .doc(activityId);
    batch.update(activityRef, {status: "ignored", isRead: true});

    // Delete the pendingFollower document
    const pendingFollowerDocRef = db
      .collection("users")
      .doc(targetUserId)
      .collection("pendingFollowers")
      .doc(requestingUserId);
    batch.delete(pendingFollowerDocRef);

    try {
      await batch.commit();
      console.log(
        `Follow request activity ${activityId} (from ${requestingUserId}) ignored by ${targetUserId}.`
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
