/**
 * Coach triggers — proactive AI coaching actions.
 * Triggers on workout log creation to generate post-workout analysis.
 */
import {getDb} from "../admin/firebaseAdmin";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
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
