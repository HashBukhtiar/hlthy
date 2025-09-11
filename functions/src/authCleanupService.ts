import {admin, getDb} from "./firebaseAdmin";
import {onCall, HttpsError, onRequest} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";

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
// Note: scheduledCleanupUsersPublic removed. Per-account Cloud Tasks handle cleanup.

/**
 * HTTP handler for a single cleanup task. Called by Cloud Tasks.
 * Expects POST JSON body: { uid: string }
 */
export const cleanupTaskHandler = onRequest(async (req, res) => {
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
 * Callable that schedules a Cloud Task to call the `cleanupTaskHandler` after a delay.
 * Expects { uid: string, delaySeconds?: number }
 */
export const scheduleCleanupTask = onCall({region: "northamerica-northeast2"}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Must be authenticated");
  const {uid, delaySeconds} = request.data || {};
  if (!uid || typeof uid !== "string") throw new HttpsError("invalid-argument", "Missing uid");
  const delay = typeof delaySeconds === "number" ? delaySeconds : 300;

  const project = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || (process.env.FIREBASE_CONFIG && JSON.parse(process.env.FIREBASE_CONFIG).projectId);
  if (!project) throw new HttpsError("internal", "Project not detected");
  const location = "us-central1";
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
  // Prefer Cloud Tasks to produce a fresh OIDC token at delivery time by
  // requesting an oidcToken with a service account. Set the service account
  // email in the CLEANUP_TASK_SA environment variable. If not set, we will
  // still attempt to create the task but it may fail if the function requires
  // authenticated requests.
  const taskServiceAccount = process.env.CLEANUP_TASK_SA;
  const httpRequest: any = {
    httpMethod: "POST",
    url,
    headers: {"Content-Type": "application/json"},
    body: Buffer.from(JSON.stringify({uid})).toString("base64"),
  };

  if (taskServiceAccount) {
    httpRequest.oidcToken = {
      serviceAccountEmail: taskServiceAccount,
      audience: url,
    };
  } else {
    console.warn("scheduleCleanupTask: CLEANUP_TASK_SA not set — creating task without oidcToken; target must allow unauthenticated requests or delivery will fail");
  }

  const taskBody = {httpRequest, scheduleTime};

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
      throw new HttpsError("internal", "Failed to schedule task");
    }
    const data = await resp.json();
    console.log("scheduleCleanupTask: created task", data.name);
    return {success: true, name: data.name};
  } catch (err) {
    console.error("scheduleCleanupTask: failed to create task", err);
    throw new HttpsError("internal", "Failed to schedule task");
  }
});
