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
