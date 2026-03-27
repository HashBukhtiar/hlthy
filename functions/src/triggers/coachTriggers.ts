/**
 * Coach triggers — proactive AI coaching actions.
 * - analyzeWorkoutOnCreate: post-workout analysis on workout log creation
 * - weeklyCoachSummary: scheduled weekly training summary (Sunday 6pm ET)
 */
import {getDb} from "../admin/firebaseAdmin";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {logger} from "firebase-functions";
import {sendPushNotificationHelper} from "../services/notificationService";

const AI_BACKEND_URL = process.env.AI_BACKEND_URL ||
  "https://hlthy-ai-coach-375457000023.northamerica-northeast2.run.app";
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET || "";

const FETCH_TIMEOUT_MS = 30_000;

interface WorkoutAnalysis {
  /** Must stay in sync with ai/models/schemas.py:WorkoutAnalysis */
  insight: string;
  highlights: string[];
  recommendations: string[];
  sentiment: "positive" | "neutral" | "needs_attention";
}

/**
 * Pick only the fields the AI analyzer needs from a workout log.
 * Prevents forwarding internal metadata or unexpected fields.
 */
function pickAnalysisFields(data: Record<string, unknown>): Record<string, unknown> {
  return {
    workoutName: data.workoutName ?? "Workout",
    durationMinutes: data.durationMinutes ?? 0,
    totalVolume: data.totalVolume ?? 0,
    totalSets: data.totalSets ?? 0,
    totalReps: data.totalReps ?? 0,
    exercisesCompleted: data.exercisesCompleted ?? 0,
    exercisesSkipped: data.exercisesSkipped ?? 0,
    prsHit: data.prsHit ?? 0,
    mood: data.mood ?? null,
    perceivedDifficulty: data.perceivedDifficulty ?? null,
    exercises: Array.isArray(data.exercises)
      ? (data.exercises as Record<string, unknown>[]).slice(0, 20).map((ex) => ({
        exerciseName: String(ex.exerciseName ?? "").slice(0, 100),
        skipped: ex.skipped ?? false,
        sets: Array.isArray(ex.sets)
          ? (ex.sets as Record<string, unknown>[]).slice(0, 20).map((s) => ({
            weight: s.weight ?? 0,
            reps: s.reps ?? 0,
            completed: s.completed ?? false,
            isPR: s.isPR ?? false,
          }))
          : [],
      }))
      : [],
  };
}

/**
 * Triggers when a workout log is created.
 * Calls the AI backend to generate a post-workout analysis,
 * saves the insight to Firestore, and sends a push notification.
 *
 * This is best-effort — if the AI call fails, the workout log is unaffected.
 */
export const analyzeWorkoutOnCreate = onDocumentCreated(
  {
    document: "users/{userId}/workout_logs/{logId}",
    region: "northamerica-northeast2",
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (event) => {
    const {userId, logId} = event.params;
    const snapshot = event.data;

    if (!snapshot) {
      logger.warn("No data for workout log creation event");
      return;
    }

    const workoutData = snapshot.data();
    if (!workoutData) {
      logger.warn(`Empty workout log data for ${logId}`);
      return;
    }

    if (!INTERNAL_API_SECRET) {
      logger.error("INTERNAL_API_SECRET not configured, skipping workout analysis");
      return;
    }

    // Deduplication: check if insight already exists for this workout log
    const db = getDb();
    if (!db) {
      logger.error("Database not initialized");
      return;
    }

    const existingInsights = await db.collection("users").doc(userId)
      .collection("coach_insights")
      .where("workoutLogId", "==", logId)
      .limit(1)
      .get();

    if (!existingInsights.empty) {
      logger.info(`Insight already exists for workout ${logId}, skipping`);
      return;
    }

    logger.info(`Analyzing workout ${logId} for user ${userId.substring(0, 8)}...`);

    try {
      // Pick only relevant fields (prevents forwarding internal metadata)
      const filteredData = pickAnalysisFields(workoutData);

      // Call AI backend for analysis (with timeout)
      const analysis = await callAIBackend(userId, filteredData);

      // Save insight to Firestore
      await db.collection("users").doc(userId)
        .collection("coach_insights").add({
          workoutLogId: logId,
          workoutName: String(workoutData.workoutName ?? "Workout").slice(0, 100),
          insight: analysis.insight,
          highlights: analysis.highlights,
          recommendations: analysis.recommendations,
          sentiment: analysis.sentiment,
          createdAt: new Date(),
          read: false,
        });

      // Send push notification with generic body (avoids sensitive data on lock screen)
      const notifTitle = getNotificationTitle(analysis.sentiment, workoutData);
      await sendPushNotificationHelper(
        userId,
        notifTitle,
        "Your post-workout analysis is ready. Tap to view.",
        "coach_insight",
        {type: "coach_insight"},
      );

      logger.info(`Workout analysis saved for ${userId.substring(0, 8)}`);
    } catch (error) {
      // Best-effort — log and move on, never fail the trigger
      logger.error(`Workout analysis failed for ${userId.substring(0, 8)}:`, error);
    }
  }
);

/**
 * Call the AI backend's internal workout analysis endpoint with a timeout.
 */
async function callAIBackend(
  uid: string,
  workoutLog: Record<string, unknown>,
): Promise<WorkoutAnalysis> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_BACKEND_URL}/api/internal/analyze-workout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": INTERNAL_API_SECRET,
      },
      body: JSON.stringify({uid, workout_log: workoutLog}),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      throw new Error(`AI backend returned ${response.status}: ${text}`);
    }

    return await response.json() as WorkoutAnalysis;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Scheduled weekly training summary.
 * Runs every Sunday at 6pm Eastern Time.
 * Queries users who logged at least one workout in the past 7 days,
 * generates a weekly summary for each, and sends a push notification.
 */
export const weeklyCoachSummary = onSchedule(
  {
    schedule: "0 18 * * 0", // Sunday 6pm
    timeZone: "America/New_York",
    region: "northamerica-northeast2",
    timeoutSeconds: 540,
    memory: "256MiB",
    retryCount: 1,
  },
  async () => {
    if (!INTERNAL_API_SECRET) {
      logger.error("INTERNAL_API_SECRET not configured, skipping weekly summaries");
      return;
    }

    const db = getDb();
    if (!db) {
      logger.error("Database not initialized");
      return;
    }

    // Find users who logged workouts in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeUserIds = await getActiveUserIds(db, sevenDaysAgo);

    if (activeUserIds.length === 0) {
      logger.info("No active users found for weekly summary");
      return;
    }

    // Safety cap to prevent runaway costs; fan-out to Cloud Tasks if this limit is regularly hit
    const MAX_USERS = 200;
    if (activeUserIds.length > MAX_USERS) {
      logger.warn(`${activeUserIds.length} active users exceeds cap of ${MAX_USERS}, processing first ${MAX_USERS}`);
    }
    const usersToProcess = activeUserIds.slice(0, MAX_USERS);

    logger.info(`Generating weekly summaries for ${usersToProcess.length} active users`);

    // Process in small batches for throughput while being gentle on the AI backend
    const BATCH_SIZE = 5;
    let successCount = 0;
    let failCount = 0;
    const weekStart = getWeekStartDate();

    for (let i = 0; i < usersToProcess.length; i += BATCH_SIZE) {
      const batch = usersToProcess.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((userId) => processWeeklySummary(db, userId, weekStart)),
      );

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          successCount++;
        } else if (result.status === "rejected") {
          failCount++;
        }
      }
    }

    logger.info(`Weekly summaries complete: ${successCount} sent, ${failCount} failed`);
  }
);

/**
 * Process a single user's weekly summary: dedup check, AI call, save, notify.
 * Returns true if a summary was generated, false if skipped (already exists).
 */
async function processWeeklySummary(
  db: FirebaseFirestore.Firestore,
  userId: string,
  weekStart: Date,
): Promise<boolean> {
  // Dedup: check if a weekly summary already exists for this week
  const existing = await db.collection("users").doc(userId)
    .collection("coach_insights")
    .where("type", "==", "weekly_summary")
    .where("createdAt", ">=", weekStart)
    .limit(1)
    .get();

  if (!existing.empty) {
    logger.info(`Weekly summary already exists for ${userId.substring(0, 8)}, skipping`);
    return false;
  }

  const analysis = await callWeeklySummary(userId);

  await db.collection("users").doc(userId)
    .collection("coach_insights").add({
      type: "weekly_summary",
      insight: analysis.insight,
      highlights: analysis.highlights,
      recommendations: analysis.recommendations,
      sentiment: analysis.sentiment,
      createdAt: new Date(),
      read: false,
    });

  await sendPushNotificationHelper(
    userId,
    "Your weekly training summary is ready",
    "Tap to see how your week went.",
    "coach_insight",
    {type: "coach_insight"},
  );

  return true;
}

/**
 * Query for user IDs who have at least one workout log after the given date.
 * Uses collectionGroup query on workout_logs.
 *
 * Scaling note: This reads every workout_logs doc from the past 7 days.
 * For large user bases (500+), consider maintaining a `lastWorkoutAt` timestamp
 * on the user document and querying `users` directly instead.
 */
async function getActiveUserIds(
  db: FirebaseFirestore.Firestore,
  since: Date,
): Promise<string[]> {
  // Query workout_logs across all users
  const snapshot = await db.collectionGroup("workout_logs")
    .where("completedAt", ">=", since)
    .select("userId")
    .get();

  // Deduplicate user IDs
  const userIds = new Set<string>();
  for (const doc of snapshot.docs) {
    const userId = doc.data().userId;
    if (userId && typeof userId === "string") {
      userIds.add(userId);
    }
  }

  return Array.from(userIds);
}

/**
 * Get the start of the current week (Sunday midnight).
 */
function getWeekStartDate(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Call the AI backend's weekly summary endpoint.
 */
async function callWeeklySummary(uid: string): Promise<WorkoutAnalysis> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_BACKEND_URL}/api/internal/weekly-summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": INTERNAL_API_SECRET,
      },
      body: JSON.stringify({uid}),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      throw new Error(`AI backend returned ${response.status}: ${text}`);
    }

    return await response.json() as WorkoutAnalysis;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Generate a notification title based on workout sentiment.
 */
function getNotificationTitle(
  sentiment: string,
  workoutData: Record<string, unknown>,
): string {
  const prs = (workoutData.prsHit as number) || 0;
  const name = String(workoutData.workoutName ?? "Workout").slice(0, 50);

  if (prs > 0) {
    return `New PR${prs > 1 ? "s" : ""}! ${name} complete`;
  }

  switch (sentiment) {
  case "positive":
    return `Great ${name} session!`;
  case "neutral":
    return `${name} complete`;
  case "needs_attention":
    return `${name} — Coach has a note`;
  default:
    return `${name} complete — Coach's take`;
  }
}
