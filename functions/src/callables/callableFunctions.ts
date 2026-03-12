import {admin, getDb} from "../admin/firebaseAdmin";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {FieldValue} from "firebase-admin/firestore";

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

    // Check if either user has blocked the other before accepting
    const [targetUserDoc, requestingUserDoc] = await Promise.all([
      db.collection("users").doc(targetUserId).get(),
      db.collection("users").doc(requestingUserId).get(),
    ]);

    if (!targetUserDoc.exists || !requestingUserDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const targetUserData = targetUserDoc.data();
    const requestingUserData = requestingUserDoc.data();

    // Check if target user has blocked requesting user
    const targetUserBlockedUsers = targetUserData?.blockedUsers || [];
    if (targetUserBlockedUsers.includes(requestingUserId)) {
      // If blocked, just ignore the request instead of accepting
      const batch = db.batch();
      // Update activity status to ignored
      const activityRef = db.collection("activity").doc(targetUserId)
        .collection("userActivity").doc(activityId);
      batch.update(activityRef, {status: "ignored", isRead: true});

      // Delete pending follower document
      const pendingFollowerDocRef = db.collection("users").doc(targetUserId)
        .collection("pendingFollowers").doc(requestingUserId);
      batch.delete(pendingFollowerDocRef);

      await batch.commit();
      throw new HttpsError("failed-precondition", "Cannot accept follow request from a blocked user");
    }

    // Check if requesting user has blocked target user
    const requestingUserBlockedUsers = requestingUserData?.blockedUsers || [];
    if (requestingUserBlockedUsers.includes(targetUserId)) {
      // If the requester has blocked the target, ignore the request
      const batch = db.batch();
      // Update activity status to ignored
      const activityRef = db.collection("activity").doc(targetUserId)
        .collection("userActivity").doc(activityId);
      batch.update(activityRef, {status: "ignored", isRead: true});

      // Delete pending follower document
      const pendingFollowerDocRef = db.collection("users").doc(targetUserId)
        .collection("pendingFollowers").doc(requestingUserId);
      batch.delete(pendingFollowerDocRef);

      await batch.commit();
      throw new HttpsError("failed-precondition", "Cannot accept follow request - user has blocked you");
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
      "followerCount": admin.firestore.FieldValue.increment(1),
      "stats.followerCount": admin.firestore.FieldValue.increment(1),
    });

    const requestingUserRef = db.collection("users").doc(requestingUserId);
    batch.update(requestingUserRef, {
      "followingCount": admin.firestore.FieldValue.increment(1),
      "stats.followingCount": admin.firestore.FieldValue.increment(1),
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
    const acceptedActivityData = {
      type: "follow_accepted",
      fromUserId: targetUserId,
      fromUsername: targetUserData?.username || "Someone",
      fromProfileImageUrl: targetUserData?.profileImageUrl || "",
      fromProfileThumbnailUrl: targetUserData?.profileThumbnailUrl || "",
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

    const postPayload: Record<string, unknown> = {
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

export const followUser = onCall(
  {region: "northamerica-northeast2"},
  async (req) => {
    const uid = req.auth?.uid;
    const {targetUserId} = req.data;
    if (!uid || !targetUserId || uid === targetUserId) {
      throw new HttpsError("invalid-argument", "Invalid follow request");
    }
    const db = getDb();

    // Check if either user has blocked the other
    const [currentUserDoc, targetUserDoc] = await Promise.all([
      db.collection("users").doc(uid).get(),
      db.collection("users").doc(targetUserId).get(),
    ]);

    if (!currentUserDoc.exists || !targetUserDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const currentUserData = currentUserDoc.data();
    const targetUserData = targetUserDoc.data();

    // Check if current user has blocked target user
    const currentUserBlockedUsers = currentUserData?.blockedUsers || [];
    if (currentUserBlockedUsers.includes(targetUserId)) {
      throw new HttpsError("failed-precondition", "Cannot follow a user you have blocked");
    }

    // Check if target user has blocked current user
    const targetUserBlockedUsers = targetUserData?.blockedUsers || [];
    if (targetUserBlockedUsers.includes(uid)) {
      throw new HttpsError("failed-precondition", "Cannot follow a user who has blocked you");
    }

    const isPrivate = targetUserData?.profileVisibility === "private";

    if (isPrivate) {
      // For private accounts, create a pending follow request instead
      // But first check if there's already a pending request
      const pendingFollowerDoc = await db.collection("users").doc(targetUserId)
        .collection("pendingFollowers").doc(uid).get();
      if (pendingFollowerDoc.exists) {
        throw new HttpsError("already-exists", "Follow request already sent");
      }

      // Create the pending follow request
      // Note: The createactivityonfollowrequest trigger will automatically create the activity notification
      const batch = db.batch();
      // Add to pending followers
      const pendingFollowerRef = db.collection("users").doc(targetUserId)
        .collection("pendingFollowers").doc(uid);
      batch.set(pendingFollowerRef, {
        requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        requesterUsername: currentUserData?.username || "",
        requesterProfileImageUrl: currentUserData?.profileImageUrl || "",
      });

      await batch.commit();
      return {success: true, message: "Follow request sent (pending approval)."};
    }

    // Public account: proceed with immediate follow
    const batch = db.batch();

    // Check if already following to prevent duplicates
    const followingDoc = await db.collection("users").doc(uid)
      .collection("following").doc(targetUserId).get();
    if (followingDoc.exists) {
      throw new HttpsError("already-exists", "Already following this user");
    }

    batch.set(
      db.collection("users").doc(targetUserId).collection("followers").doc(uid),
      {followedAt: admin.firestore.FieldValue.serverTimestamp()}
    );
    batch.set(
      db.collection("users").doc(uid).collection("following").doc(targetUserId),
      {followedAt: admin.firestore.FieldValue.serverTimestamp()}
    );

    batch.update(db.collection("users").doc(targetUserId), {
      "followerCount": FieldValue.increment(1),
      "stats.followerCount": FieldValue.increment(1),
    });
    batch.update(db.collection("users").doc(uid), {
      "followingCount": FieldValue.increment(1),
      "stats.followingCount": FieldValue.increment(1),
    });

    // Create activity notification for new follower
    const activityRef = db.collection("activity").doc(targetUserId)
      .collection("userActivity").doc();
    batch.set(activityRef, {
      type: "new_follower",
      fromUserId: uid,
      fromUsername: currentUserData?.username || "Someone",
      fromProfileImageUrl: currentUserData?.profileImageUrl || "",
      fromProfileThumbnailUrl: currentUserData?.profileThumbnailUrl || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isRead: false,
    });

    await batch.commit();
    return {success: true, message: "Now following user."};
  }
);

export const unfollowUser = onCall(
  {region: "northamerica-northeast2"},
  async (req) => {
    const uid = req.auth?.uid;
    const {targetUserId} = req.data;
    if (!uid || !targetUserId || uid === targetUserId) {
      throw new HttpsError("invalid-argument", "Invalid unfollow request");
    }
    const db = getDb();
    // Check if the relationship exists before trying to remove it
    const followingDoc = await db.collection("users").doc(uid)
      .collection("following").doc(targetUserId).get();
    if (!followingDoc.exists) {
      throw new HttpsError("not-found", "Not currently following this user");
    }

    const batch = db.batch();

    // 1) Remove subcollection docs
    batch.delete(
      db.collection("users").doc(targetUserId).collection("followers").doc(uid)
    );
    batch.delete(
      db.collection("users").doc(uid).collection("following").doc(targetUserId)
    );

    // 2) Decrement top-level counts (but ensure they don't go below 0)
    batch.update(db.collection("users").doc(targetUserId), {
      "followerCount": FieldValue.increment(-1),
      "stats.followerCount": FieldValue.increment(-1),
    });
    batch.update(db.collection("users").doc(uid), {
      "followingCount": FieldValue.increment(-1),
      "stats.followingCount": FieldValue.increment(-1),
    });

    await batch.commit();
    return {success: true, message: "Successfully unfollowed user."};
  }
);

export const removeFollower = onCall(
  {region: "northamerica-northeast2"},
  async (req) => {
    const uid = req.auth?.uid;
    const {followerUserId} = req.data;
    if (!uid || !followerUserId || uid === followerUserId) {
      throw new HttpsError("invalid-argument", "Invalid remove follower request");
    }
    const db = getDb();

    // Verify the follower relationship exists
    const followerDoc = await db.collection("users").doc(uid)
      .collection("followers").doc(followerUserId).get();
    if (!followerDoc.exists) {
      throw new HttpsError("not-found", "This user is not following you");
    }

    const batch = db.batch();

    // 1) Remove followerUserId from uid's followers subcollection
    batch.delete(
      db.collection("users").doc(uid).collection("followers").doc(followerUserId)
    );
    // 2) Remove uid from followerUserId's following subcollection
    batch.delete(
      db.collection("users").doc(followerUserId).collection("following").doc(uid)
    );
    // 3) Decrement counts on both sides
    batch.update(db.collection("users").doc(uid), {
      "followerCount": FieldValue.increment(-1),
      "stats.followerCount": FieldValue.increment(-1),
    });
    batch.update(db.collection("users").doc(followerUserId), {
      "followingCount": FieldValue.increment(-1),
      "stats.followingCount": FieldValue.increment(-1),
    });

    await batch.commit();
    return {success: true, message: "Follower removed successfully."};
  }
);
