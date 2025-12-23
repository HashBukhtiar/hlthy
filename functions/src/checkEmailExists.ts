import {onCall, HttpsError} from "firebase-functions/v2/https";
import {getAuth} from "./firebaseAdmin";

/**
 * Callable function used by the client to check whether an email is already registered.
 * Returns: { exists: boolean }
 */
export const checkEmailExists = onCall({region: "northamerica-northeast2"}, async (request) => {
  const auth = getAuth();
  if (!auth) {
    console.error("checkEmailExists: admin auth not initialized");
    throw new HttpsError("internal", "Server not initialized");
  }

  const data = request.data || {};
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : null;

  if (!email) {
    throw new HttpsError("invalid-argument", "Missing or invalid 'email' parameter");
  }

  try {
    // Try to fetch user by email. If found, exists=true. If not found, return exists=false.
    const userRecord = await auth.getUserByEmail(email);
    if (userRecord && userRecord.uid) {
      return {exists: true};
    }
    return {exists: false};
  } catch (err: any) {
    // If user not found, return exists=false. For other errors, throw HttpsError.
    const code = err?.code || err?.errorInfo?.code || null;
    if (code === "auth/user-not-found" || (typeof err?.message === "string" && err.message.includes("user-not-found"))) {
      return {exists: false};
    }

    console.error("checkEmailExists: unexpected error", err);
    throw new HttpsError("internal", "Failed to check email", err);
  }
});
