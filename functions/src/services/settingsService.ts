import {onCall, HttpsError} from "firebase-functions/v2/https";
import {admin, getDb, getAuth} from "../admin/firebaseAdmin";

// Update user settings
export const updateUserSettings = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const {settings} = request.data;

    if (!settings) {
      throw new HttpsError("invalid-argument", "Settings object is required");
    }

    try {
      const db = getDb();
      if (!db) {
        throw new HttpsError("internal", "Database not initialized");
      }

      // Validate settings structure
      const allowedFields = [
        "displayName", "bio", "archetype", "dateOfBirth", "profileImageUrl",
        "profileVisibility", "followPermission", "commentPermission", "messagePermission",
        "theme", "language", "units", "notifications", "twoFactorEnabled",
        "socialLinks",
      ];

      const sanitizedSettings: any = {};
      for (const [key, value] of Object.entries(settings)) {
        if (allowedFields.includes(key)) {
          sanitizedSettings[key] = value;
        }
      }

      // Validate socialLinks if present
      if (settings.socialLinks) {
        const validPlatforms = [
          "instagram", "facebook", "twitter", "tiktok", "youtube",
          "linkedin", "spotify", "snapchat", "twitch", "github",
          "customUrl", "customLabel", "showLinksToFollowersOnly",
        ];
        Object.keys(settings.socialLinks).forEach((key) => {
          if (!validPlatforms.includes(key)) {
            throw new HttpsError("invalid-argument", `Invalid social link platform: ${key}`);
          }
        });
      }

      // Add metadata
      sanitizedSettings.lastModified = admin.firestore.FieldValue.serverTimestamp();
      sanitizedSettings.version = 1;

      // Update user document
      await db.collection("users").doc(userId).update(sanitizedSettings);

      console.log(`Settings updated successfully for user ${userId}`);
      return {success: true, message: "Settings updated successfully"};
    } catch (error) {
      console.error("Error updating user settings:", error);
      throw new HttpsError("internal", "Failed to update settings");
    }
  }
);

// Block a user
export const blockUser = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const currentUserId = request.auth.uid;
    const {targetUserId} = request.data;

    if (!targetUserId) {
      throw new HttpsError("invalid-argument", "Target user ID is required");
    }

    if (currentUserId === targetUserId) {
      throw new HttpsError("invalid-argument", "Cannot block yourself");
    }

    try {
      const db = getDb();
      if (!db) {
        throw new HttpsError("internal", "Database not initialized");
      }

      const batch = db.batch();

      // Add to current user's blocked list
      const currentUserRef = db.collection("users").doc(currentUserId);
      batch.update(currentUserRef, {
        blockedUsers: admin.firestore.FieldValue.arrayUnion(targetUserId),
      });

      // Remove any existing follow relationships
      const currentUserFollowingRef = currentUserRef.collection("following").doc(targetUserId);
      const targetUserFollowersRef = db.collection("users").doc(targetUserId).collection("followers").doc(currentUserId);

      batch.delete(currentUserFollowingRef);
      batch.delete(targetUserFollowersRef);

      // Update follower/following counts
      batch.update(currentUserRef, {
        followingCount: admin.firestore.FieldValue.increment(-1),
      });
      batch.update(db.collection("users").doc(targetUserId), {
        followerCount: admin.firestore.FieldValue.increment(-1),
      });

      // Clean up activity feed entries
      const currentUserActivityRef = db.collection("activity").doc(currentUserId).collection("userActivity");
      const targetUserActivityRef = db.collection("activity").doc(targetUserId).collection("userActivity");

      // Remove activities where the blocked user was the actor in current user's feed
      const blockedUserActivitiesQuery = await currentUserActivityRef
        .where("actorId", "==", targetUserId)
        .get();

      blockedUserActivitiesQuery.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Remove activities where current user was the actor in blocked user's feed
      const currentUserActivitiesQuery = await targetUserActivityRef
        .where("actorId", "==", currentUserId)
        .get();

      currentUserActivitiesQuery.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Remove mutual interaction activities
      const mutualActivitiesQuery1 = await currentUserActivityRef
        .where("targetUserId", "==", targetUserId)
        .get();

      mutualActivitiesQuery1.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      const mutualActivitiesQuery2 = await targetUserActivityRef
        .where("targetUserId", "==", currentUserId)
        .get();

      mutualActivitiesQuery2.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(`User ${targetUserId} blocked successfully by ${currentUserId} with activity cleanup`);
      return {success: true, message: "User blocked successfully"};
    } catch (error) {
      console.error("Error blocking user:", error);
      throw new HttpsError("internal", "Failed to block user");
    }
  }
);

// Unblock a user
export const unblockUser = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const currentUserId = request.auth.uid;
    const {targetUserId} = request.data;

    if (!targetUserId) {
      throw new HttpsError("invalid-argument", "Target user ID is required");
    }

    try {
      const db = getDb();
      if (!db) {
        throw new HttpsError("internal", "Database not initialized");
      }

      await db.collection("users").doc(currentUserId).update({
        blockedUsers: admin.firestore.FieldValue.arrayRemove(targetUserId),
      });

      return {success: true, message: "User unblocked successfully"};
    } catch (error) {
      console.error("Error unblocking user:", error);
      throw new HttpsError("internal", "Failed to unblock user");
    }
  }
);

export const cleanupBlockedUserActivity = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const currentUserId = request.auth.uid;
    const {targetUserId} = request.data;

    if (!targetUserId) {
      throw new HttpsError("invalid-argument", "Target user ID is required");
    }

    if (currentUserId === targetUserId) {
      throw new HttpsError("invalid-argument", "Cannot cleanup own activity");
    }

    try {
      const db = getDb();
      if (!db) {
        throw new HttpsError("internal", "Database not initialized");
      }

      const batch = db.batch();

      // Clean up current user's activity feed
      // Remove activities where the blocked user was the actor
      const currentUserActivityRef = db.collection("activity").doc(currentUserId).collection("userActivity");
      const blockedUserActivitiesQuery = await currentUserActivityRef
        .where("actorId", "==", targetUserId)
        .get();

      blockedUserActivitiesQuery.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Clean up blocked user's activity feed
      // Remove activities where current user was the actor
      const targetUserActivityRef = db.collection("activity").doc(targetUserId).collection("userActivity");
      const currentUserActivitiesQuery = await targetUserActivityRef
        .where("actorId", "==", currentUserId)
        .get();

      currentUserActivitiesQuery.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Also clean up any mutual interactions in activity feeds
      // Remove likes, comments, follows, etc. between the two users
      const mutualActivitiesQuery1 = await currentUserActivityRef
        .where("targetUserId", "==", targetUserId)
        .get();

      mutualActivitiesQuery1.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      const mutualActivitiesQuery2 = await targetUserActivityRef
        .where("targetUserId", "==", currentUserId)
        .get();

      mutualActivitiesQuery2.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(`Activity cleanup completed between users ${currentUserId} and ${targetUserId}`);
      return {success: true, message: "Activity feed cleaned up successfully"};
    } catch (error) {
      console.error("Error cleaning up blocked user activity:", error);
      throw new HttpsError("internal", "Failed to cleanup activity feed");
    }
  }
);

// Delete user account
export const deleteUserAccount = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const {confirmationToken} = request.data;

    // Add a confirmation token check for extra security
    if (!confirmationToken || confirmationToken !== `DELETE_${userId}`) {
      throw new HttpsError("invalid-argument", "Invalid confirmation token");
    }

    try {
      const db = getDb();
      const auth = getAuth();
      if (!db || !auth) {
        throw new HttpsError("internal", "Database or Auth not initialized");
      }

      const batch = db.batch();

      // Delete user document
      batch.delete(db.collection("users").doc(userId));

      // Delete user's posts
      const postsSnapshot = await db.collection("posts").where("authorId", "==", userId).get();
      postsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete user's activities
      const activitiesSnapshot = await db.collection("activity").doc(userId).collection("userActivity").get();
      activitiesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete following/followers collections
      const followingSnapshot = await db.collection("users").doc(userId).collection("following").get();
      followingSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      const followersSnapshot = await db.collection("users").doc(userId).collection("followers").get();
      followersSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      // Delete from Firebase Auth
      await auth.deleteUser(userId);

      return {success: true, message: "Account deleted successfully"};
    } catch (error) {
      console.error("Error deleting user account:", error);
      throw new HttpsError("internal", "Failed to delete account");
    }
  }
);

// Clear user data (chat history, search history)
export const clearUserData = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const {dataType} = request.data;

    if (!dataType || !["chatHistory", "searchHistory"].includes(dataType)) {
      throw new HttpsError("invalid-argument", "Invalid data type");
    }

    try {
      const db = getDb();
      if (!db) {
        throw new HttpsError("internal", "Database not initialized");
      }

      const userRef = db.collection("users").doc(userId);

      if (dataType === "chatHistory") {
        // Clear chat messages - updated to match your conversation structure
        const conversationsSnapshot = await db.collection("conversations")
          .where("participants", "array-contains", userId).get();
        const batch = db.batch();
        conversationsSnapshot.docs.forEach((doc) => {
          batch.update(doc.ref, {
            lastMessage: null,
            lastMessageAt: null,
          });
        });

        // Also delete messages subcollection
        for (const convDoc of conversationsSnapshot.docs) {
          const messagesSnapshot = await convDoc.ref.collection("messages").get();
          messagesSnapshot.docs.forEach((msgDoc) => {
            batch.delete(msgDoc.ref);
          });
        }

        await batch.commit();
      } else if (dataType === "searchHistory") {
        // Clear search history
        await userRef.update({
          searchHistory: [],
        });
      }

      return {success: true, message: `${dataType} cleared successfully`};
    } catch (error) {
      console.error(`Error clearing ${dataType}:`, error);
      throw new HttpsError("internal", `Failed to clear ${dataType}`);
    }
  }
);
