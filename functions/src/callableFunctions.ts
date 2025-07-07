import {admin, getDb} from "./firebaseAdmin";
import {onCall, HttpsError} from "firebase-functions/v2/https";

// Useful for troubleshooting and debugging
export const minimaltestfunction = onCall(
  {region: "northamerica-northeast2"},
  (request) => {
    console.log("minimaltestfunction: Function triggered. Auth UID:", request.auth?.uid);
    const db = getDb();
    if (!db) {
      console.error("minimaltestfunction: Firestore db not initialized.");
      throw new HttpsError("internal", "Database not initialized.");
    }
    console.log("minimaltestfunction: db instance obtained. Data:", request.data);
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
    console.log("acceptfollowrequest: Function triggered:", JSON.stringify(request.data), "Auth UID:", request.auth?.uid);
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

    const activityDocSnap = await activityRef.get();
    console.log(`Activity doc ${activityId} exists: ${activityDocSnap.exists}`);

    const pendingFollowerDocSnap = await pendingFollowerDocRef.get();
    console.log(`Pending follower doc for ${requestingUserId} under ${targetUserId} exists: ${pendingFollowerDocSnap.exists}`);

    const targetUserSnap = await targetUserRef.get();
    console.log(`Target user doc ${targetUserId} exists: ${targetUserSnap.exists}`);

    const requestingUserSnap = await requestingUserRef.get();
    console.log(`Requesting user doc ${requestingUserId} exists: ${requestingUserSnap.exists}`);

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

export const cancelSentFollowRequest = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    const db = getDb();
    if (!db) {
      console.error("cancelSentFollowRequest: Firestore db not initialized.");
      throw new HttpsError("internal", "Database not initialized. Please try again.");
    }

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    const currentUserId = request.auth.uid;
    const {targetUserId} = request.data;

    if (!targetUserId || typeof targetUserId !== "string") {
      throw new HttpsError(
        "invalid-argument",
        "The function must be called with a valid 'targetUserId'."
      );
    }

    console.log(`cancelSentFollowRequest: User ${currentUserId} is cancelling request to ${targetUserId}`);

    const batch = db.batch();

    // 1. Delete the pending follower document from the target user's collection
    const pendingFollowerRef = db
      .collection("users")
      .doc(targetUserId)
      .collection("pendingFollowers")
      .doc(currentUserId);
    batch.delete(pendingFollowerRef);

    // 2. Find and update the corresponding activity item in targetUserId's activity feed
    // This activity item was created for targetUserId, indicating a request from currentUserId.
    // We need to find it to change its status so Pulse.tsx (listening for 'pending' status) removes it.
    const activityQuery = db
      .collection("activity")
      .doc(targetUserId)
      .collection("userActivity")
      .where("type", "==", "follow_request")
      .where("fromUserId", "==", currentUserId)
      .where("status", "==", "pending");

    try {
      const activitySnapshot = await activityQuery.get();

      if (!activitySnapshot.empty) {
        activitySnapshot.forEach((doc) => {
          console.log(`CSFR: Found activity ${doc.id} to update for target ${targetUserId} from sender ${currentUserId}`);
          batch.update(doc.ref, {status: "cancelled", isRead: true});
        });
      } else {
        console.log(
          `CSFR: No 'pending' follow_request activity found for target ${targetUserId} from sender ${currentUserId} to update.`
        );
      }

      await batch.commit();
      console.log(
        `cancelSentFollowRequest: Follow request from ${currentUserId} to ${targetUserId} cancelled and activity status updated.`
      );
      return {success: true, message: "Follow request cancelled successfully."};
    } catch (error) {
      console.error("Error cancelling sent follow request:", error);
      // If batch.commit() fails, the HttpsError will be thrown.
      // If query fails, it will also be caught here.
      throw new HttpsError(
        "internal",
        "Failed to cancel follow request.",
        error
      );
    }
  }
);

export const createMilestonePost = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    console.log("createMilestonePost: Function triggered. Auth UID:", request.auth?.uid, "Data:", JSON.stringify(request.data));
    const db = getDb();
    if (!db) {
      console.error("createMilestonePost: Firestore db not initialized.");
      throw new HttpsError("internal", "Database not initialized.");
    }

    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    const userId = request.auth.uid;
    const data = request.data;

    console.log("createMilestonePost received milestoneDetails:", JSON.stringify(data.milestoneDetails, null, 2));

    // Basic validation
    if (!data.milestoneDetails || !data.milestoneDetails.type) {
      throw new HttpsError(
        "invalid-argument",
        "Missing milestoneDetails or milestoneDetails.type."
      );
    }
    if (data.milestoneDetails.type === "PR" && (!data.milestoneDetails.exerciseName || !data.milestoneDetails.exerciseId)) {
      throw new HttpsError(
        "invalid-argument",
        "PR milestones require exerciseName and exerciseId."
      );
    }
    if ((data.milestoneDetails.type === "weightLoss" || data.milestoneDetails.type === "weightGain") && (data.milestoneDetails.newWeight === undefined || data.milestoneDetails.newWeight === null)) {
      throw new HttpsError(
        "invalid-argument",
        "Weight milestones require newWeight."
      );
    }
    if (!data.authorUsername) {
      console.warn("createMilestonePost: authorUsername not provided in request data. This is recommended.");
    }

    const postPayload: { [key: string]: any } = {
      authorId: userId,
      authorUsername: data.authorUsername || "User",
      authorProfileImageUrl: data.authorProfileImageUrl || null,
      caption: data.caption || "",
      imageUrl: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isMilestone: true,
      milestoneDetails: {
        type: data.milestoneDetails.type,
        exerciseName: data.milestoneDetails.exerciseName || null,
        exerciseId: data.milestoneDetails.exerciseId || null,
        value: data.milestoneDetails.value !== undefined ? data.milestoneDetails.value : null,
        reps: data.milestoneDetails.reps !== undefined ? data.milestoneDetails.reps : null,
        duration: data.milestoneDetails.duration !== undefined ? data.milestoneDetails.duration : null,
        level: data.milestoneDetails.level !== undefined ? data.milestoneDetails.level : null,
        newWeight: data.milestoneDetails.newWeight !== undefined ? data.milestoneDetails.newWeight : null,
        previousWeight: data.milestoneDetails.previousWeight !== undefined ? data.milestoneDetails.previousWeight : null,
        weightUnit: data.milestoneDetails.weightUnit || null,
        achievedAt: data.milestoneDetails.achievedAt ? admin.firestore.Timestamp.fromDate(new Date(data.milestoneDetails.achievedAt)) : admin.firestore.FieldValue.serverTimestamp(),
        improvementPercentage: data.milestoneDetails.improvementPercentage !== undefined ? data.milestoneDetails.improvementPercentage : null,
        previousValue: data.milestoneDetails.previousValue !== undefined ? data.milestoneDetails.previousValue : null,
        previousReps: data.milestoneDetails.previousReps !== undefined ? data.milestoneDetails.previousReps : null,
        previousDuration: data.milestoneDetails.previousDuration !== undefined ? data.milestoneDetails.previousDuration : null,
        previousLevel: data.milestoneDetails.previousLevel !== undefined ? data.milestoneDetails.previousLevel : null,
        previousDistance: data.milestoneDetails.previousDistance !== undefined ? data.milestoneDetails.previousDistance : null,
        totalLoss: data.milestoneDetails.totalLoss !== undefined ? data.milestoneDetails.totalLoss : null,
        totalGain: data.milestoneDetails.totalGain !== undefined ? data.milestoneDetails.totalGain : null,
      },
      reactionCount: 0,
      commentCount: 0,
      visibility: data.visibility || "public",
      workoutId: data.workoutId || null,
      authorArchetype: data.authorArchetype || null,
    };

    console.log("Final postPayload being saved: ", JSON.stringify(postPayload, null, 2));

    try {
      const docRef = await db.collection("posts").add(postPayload);
      console.log(`Milestone post created with ID: ${docRef.id} by user ${userId}`);
      return {success: true, postId: docRef.id};
    } catch (error) {
      console.error("Error creating milestone post:", error);
      throw new HttpsError("internal", "Failed to create milestone post.", error);
    }
  }
);
