import {admin, getDb} from "./firebaseAdmin";
import {onCall, HttpsError, onRequest} from "firebase-functions/v2/https";

/**
 * Cloud Tasks cleanup system for unverified accounts.
 * 
 * Flow:
 * 1. Client creates account and calls scheduleCleanupTask
 * 2. Cloud Task is scheduled for 5 minutes later
 * 3. cleanupTaskHandler checks verification status and deletes if needed
 */

/**
 * @deprecated This function is deprecated and should not be used.
 * Use scheduleCleanupTask instead which uses Cloud Tasks for more reliable cleanup.
 * This function is kept temporarily to track any legacy usage.
 * 
 * Legacy callable to cleanup a specific unverified account by UID.
 * Will be removed in a future release.
 */
export const cleanupUnverifiedAccount = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    console.warn("⚠️ IF YOU GET THIS WARNING, PLEASE SEND A SCREENSHOT TO ANDREW ON THE HLTHY DISCORD!! ⚠️");
    console.warn("⚠️ DEPRECATED: cleanupUnverifiedAccount called - this function should no longer be used");
    console.warn("⚠️ Please update to use scheduleCleanupTask + Cloud Tasks instead");
    console.log("cleanupUnverifiedAccount: Called by", request.auth?.uid);
    console.log("cleanupUnverifiedAccount: Call timestamp:", new Date().toISOString());
    console.log("cleanupUnverifiedAccount: Request data:", JSON.stringify(request.data));

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const {uid} = request.data || {};
    if (!uid || typeof uid !== "string") {
      throw new HttpsError("invalid-argument", "Missing or invalid \"uid\" in request.data");
    }

    // Only allow the same user to request deletion for their own account,
    // or allow an admin to request it.
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

/**
 * HTTP handler invoked by Cloud Tasks to cleanup a specific unverified account.
 * Expects POST JSON body: { uid: string }
 */
export const cleanupTaskHandler = onRequest(
  {
    region: "us-central1",
    invoker: "public", // Allow Cloud Tasks to invoke without authentication
  },
  async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      console.error("cleanupTaskHandler: Firestore not initialized");
      res.status(500).send("db not initialized");
      return;
    }

    const {uid} = req.method === "POST" ? req.body || {} : {};
    if (!uid || typeof uid !== "string") {
      console.warn("cleanupTaskHandler: missing or invalid uid");
      res.status(400).send("missing uid");
      return;
    }

    try {
      const userRecord = await admin.auth().getUser(uid);
      if (userRecord.emailVerified) {
        await db.collection("usersPublic").doc(uid).update({isVerified: true});
        console.log("cleanupTaskHandler: user already verified, updated usersPublic", uid);
        res.status(200).send("verified");
        return;
      }
    } catch (err: any) {
      if (err.code === "auth/user-not-found") {
        console.log("cleanupTaskHandler: auth user not found, deleting usersPublic doc", uid);
        await db.collection("usersPublic").doc(uid).delete().catch((e) => console.error(e));
        res.status(200).send("user-not-found");
        return;
      }
      console.error("cleanupTaskHandler: error fetching user", uid, err);
    }

    // Not verified — delete auth user and usersPublic doc
    try {
      await admin.auth().deleteUser(uid);
      console.log("cleanupTaskHandler: deleted auth user", uid);
    } catch (delErr: any) {
      console.error("cleanupTaskHandler: failed to delete auth user", uid, delErr);
    }

    try {
      await db.collection("usersPublic").doc(uid).delete();
      console.log("cleanupTaskHandler: deleted usersPublic doc for uid", uid);
    } catch (delDocErr: any) {
      console.error("cleanupTaskHandler: failed to delete usersPublic doc for uid", uid, delDocErr);
    }

    res.status(200).send("deleted");
    return;
  } catch (err) {
    console.error("cleanupTaskHandler: unexpected error", err);
    res.status(500).send("error");
    return;
  }
});

/**
 * Schedules a Cloud Task to cleanup an account after a delay.
 * Called by client immediately after account creation.
 * Expects { uid: string, delaySeconds?: number }
 */
export const scheduleCleanupTask = onCall({region: "northamerica-northeast2"}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be authenticated");
  const {uid, delaySeconds} = request.data || {};
  if (!uid || typeof uid !== "string") throw new HttpsError("invalid-argument", "Missing uid");
  const delay = typeof delaySeconds === "number" ? delaySeconds : 300;

  const project = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || (process.env.FIREBASE_CONFIG && JSON.parse(process.env.FIREBASE_CONFIG).projectId);
  if (!project) throw new HttpsError("internal", "Project not detected");
  const location = "us-central1"; // Match the Cloud Tasks queue region
  const queue = "unverified-user-cleanup-queue";
  const url = `https://${location}-${project}.cloudfunctions.net/cleanupTaskHandler`;

  // Obtain access token from metadata server
  const metadataUrl = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";
  let tokenResp;
  try {
    tokenResp = await fetch(metadataUrl, {headers: {"Metadata-Flavor": "Google"}});
  } catch (err) {
    console.error("scheduleCleanupTask: failed to fetch metadata token", err);
    throw new HttpsError("internal", "Failed to obtain access token");
  }
  if (!tokenResp.ok) {
    console.error("scheduleCleanupTask: metadata token response not ok", tokenResp.status);
    throw new HttpsError("internal", "Failed to obtain access token");
  }
  const tokenBody = await tokenResp.json();
  const accessToken = tokenBody.access_token;

  const createTaskUrl = `https://cloudtasks.googleapis.com/v2/projects/${project}/locations/${location}/queues/${queue}/tasks`;
  const scheduleTime = {seconds: Math.floor(Date.now() / 1000) + Math.floor(delay)};
  
  // Since cleanupTaskHandler allows public invocation, we don't need OIDC token
  const httpRequest: any = {
    httpMethod: "POST",
    url,
    headers: {"Content-Type": "application/json"},
    body: Buffer.from(JSON.stringify({uid})).toString("base64"),
  };
  
  const taskBody = { task: { httpRequest, scheduleTime } };

  try {
    const resp = await fetch(createTaskUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(taskBody),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.error("scheduleCleanupTask: failed to create task", resp.status, txt);
      let errorMsg = `Failed to schedule task (${resp.status})`;
      try {
        const errorJson = JSON.parse(txt);
        if (errorJson.error?.message) {
          errorMsg = errorJson.error.message;
        }
      } catch (e) {
        // txt is not JSON
      }
      throw new HttpsError("internal", errorMsg, txt);
    }
    const data = await resp.json();
    console.log("scheduleCleanupTask: created task", data.name);
    return {success: true, name: data.name};
  } catch (err: any) {
    console.error("scheduleCleanupTask: failed to create task", err);
    if (err instanceof HttpsError) {
      throw err;
    }
    throw new HttpsError("internal", `Failed to schedule task: ${err.message}`);
  }
});
