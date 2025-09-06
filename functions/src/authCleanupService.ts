import {admin} from "./firebaseAdmin";
import {onCall, HttpsError} from "firebase-functions/v2/https";

// NOTE: The scheduled, global scan approach was intentionally removed.
// We provide a per-account callable `cleanupUnverifiedAccount` which checks
// a single user by UID and deletes it only when 5+ minutes have passed since
// creation and the account is still unverified. This prevents bulk scanning
// and only targets the specific account in question.

// Legacy manual trigger removed. Use `cleanupUnverifiedAccount` callable to
// clean a specific account by UID when appropriate.

/**
 * Callable to cleanup a specific unverified account by UID.
 * The client should call this with the UID of the account that was created.
 * The function verifies the account's creation time and emailVerified status,
 * and deletes the account only if it's older than the configured threshold
 * and still unverified.
 */
export const cleanupUnverifiedAccount = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    console.log("cleanupUnverifiedAccount: Called by", request.auth?.uid);

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const {uid} = request.data || {};
    if (!uid || typeof uid !== "string") {
      throw new HttpsError("invalid-argument", "Missing or invalid \"uid\" in request.data");
    }

    // Only allow the same user to request deletion for their own account,
    // or allow an admin to request it. This prevents arbitrary authenticated
    // clients from deleting other users.
    const callerUid = request.auth.uid;
    const isAdmin = !!(request.auth.token && request.auth.token.admin);
    if (callerUid !== uid && !isAdmin) {
      throw new HttpsError("permission-denied", "Caller not authorized to delete this account");
    }

    const CLEANUP_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
    try {
      const userRecord = await admin.auth().getUser(uid);
      const createdAtMs = new Date(userRecord.metadata.creationTime || 0).getTime();
      const emailVerified = !!userRecord.emailVerified;

      console.log(`cleanupUnverifiedAccount: uid=${uid} createdAt=${createdAtMs} emailVerified=${emailVerified}`);

      if (emailVerified) {
        return {success: false, message: "Account already verified; no action taken."};
      }

      if (createdAtMs <= 0) {
        return {success: false, message: "Account creation time unknown; no action taken."};
      }

      const now = Date.now();
      if (createdAtMs > now - CLEANUP_THRESHOLD_MS) {
        // Not old enough yet
        return {success: false, message: "Account not old enough for cleanup."};
      }

      // Passed checks — delete the user
      try {
        await admin.auth().deleteUser(uid);
        console.log(`cleanupUnverifiedAccount: Deleted unverified user ${uid}`);
        return {success: true, message: "Account deleted."};
      } catch (deleteErr: any) {
        console.error("cleanupUnverifiedAccount: Failed to delete user", uid, deleteErr);
        throw new HttpsError("internal", "Failed to delete user.");
      }
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        return {success: false, message: "User not found."};
      }
      console.error("cleanupUnverifiedAccount: Error fetching user", uid, err);
      throw new HttpsError("internal", "Failed to check user.");
    }
  }
);
