import {onCall, HttpsError} from "firebase-functions/v2/https";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";

const db = getFirestore();
const auth = getAuth();

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
      // Validate settings structure
      const allowedFields = [
        "displayName", "bio", "archetype", "dateOfBirth",
        "profileVisibility", "followPermission", "commentPermission", "messagePermission",
        "theme", "language", "units", "notifications", "twoFactorEnabled",
      ];

      const sanitizedSettings: any = {};
      for (const [key, value] of Object.entries(settings)) {
        if (allowedFields.includes(key)) {
          sanitizedSettings[key] = value;
        }
      }

      // Add metadata
      sanitizedSettings.lastModified = new Date();
      sanitizedSettings.version = 1;

      // Update user document
      await db.collection("users").doc(userId).update(sanitizedSettings);

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
      const batch = db.batch();

      // Add to current user's blocked list
      const currentUserRef = db.collection("users").doc(currentUserId);
      batch.update(currentUserRef, {
        blockedUsers: FieldValue.arrayUnion(targetUserId),
      });

      // Remove any existing follow relationships
      const currentUserFollowingRef = currentUserRef.collection("following").doc(targetUserId);
      const targetUserFollowersRef = db.collection("users").doc(targetUserId).collection("followers").doc(currentUserId);

      batch.delete(currentUserFollowingRef);
      batch.delete(targetUserFollowersRef);

      // Update follower/following counts
      batch.update(currentUserRef, {
        followingCount: FieldValue.increment(-1),
      });
      batch.update(db.collection("users").doc(targetUserId), {
        followerCount: FieldValue.increment(-1),
      });

      await batch.commit();

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
      await db.collection("users").doc(currentUserId).update({
        blockedUsers: FieldValue.arrayRemove(targetUserId),
      });

      return {success: true, message: "User unblocked successfully"};
    } catch (error) {
      console.error("Error unblocking user:", error);
      throw new HttpsError("internal", "Failed to unblock user");
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
      const batch = db.batch();

      // Delete user document
      batch.delete(db.collection("users").doc(userId));

      // Delete user's posts
      const postsSnapshot = await db.collection("posts").where("userId", "==", userId).get();
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
      const userRef = db.collection("users").doc(userId);

      if (dataType === "chatHistory") {
        // Clear chat messages
        const chatsSnapshot = await db.collection("chats").where("participants", "array-contains", userId).get();
        const batch = db.batch();
        chatsSnapshot.docs.forEach((doc) => {
          batch.update(doc.ref, {
            messages: [],
            lastMessage: null,
            lastMessageTime: null,
          });
        });

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
