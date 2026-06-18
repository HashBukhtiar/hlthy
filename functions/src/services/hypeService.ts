import {admin, getDb} from "../admin/firebaseAdmin";

// ── Tunables (server side: awarding) ─────────────────────────────────────────
// Point values per Hype-earning event. Relative weights matter more than the
// absolutes; see docs/hype.md for the rationale.
export const HYPE_POINTS = {
  WORKOUT_COMPLETE: 15,
  MILESTONE: 40,
  SAVE_RECEIVED: 8,
  FOLLOW_RECEIVED: 10,
  COMMENT_RECEIVED: 5,
  LIKE_RECEIVED: 2,
  ENGAGE_GIVEN: 1,
} as const;

// Light anti-gaming guardrail: cap the Hype a user can earn per day from their
// own outbound engagement (liking/commenting on others). Received Hype is
// uncapped — you can't farm what other people choose to give you.
export const HYPE_GIVEN_DAILY_CAP = 20;

// We keep ~30 daily buckets (~2 half-lives); anything older has decayed to noise
// and is pruned on write. Mirrors HYPE_WINDOW_DAYS in logic/hype.ts.
const WINDOW_DAYS = 30;
const STALE_OFFSET_MS = (WINDOW_DAYS + 2) * 24 * 60 * 60 * 1000;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10); // yyyy-mm-dd (UTC)
}

/**
 * Award Hype to a user for a received / grind event. One write, zero reads:
 * increments today's bucket and prunes the bucket that just fell out of the
 * rolling window in the same write, so the doc stays bounded. Best-effort —
 * never throws, so a failure can't break the triggering action.
 */
export async function awardHype(uid: string, points: number): Promise<void> {
  if (!uid || points <= 0) return;
  try {
    const db = getDb();
    const today = dayKey(new Date());
    const stale = dayKey(new Date(Date.now() - STALE_OFFSET_MS));
    await db.collection("users").doc(uid).set(
      {
        hypeByDay: {
          [today]: admin.firestore.FieldValue.increment(points),
          [stale]: admin.firestore.FieldValue.delete(),
        },
      },
      {merge: true}
    );
  } catch (error) {
    console.error(`awardHype failed for ${uid}:`, error);
  }
}

/**
 * Award Hype for outbound engagement, capped per day. Costs one read (the
 * transaction) and is only used on giver-side actions, never on received Hype.
 * Awards nothing once the user hits HYPE_GIVEN_DAILY_CAP for the day.
 */
export async function awardCappedHype(uid: string, points: number): Promise<void> {
  if (!uid || points <= 0) return;
  try {
    const db = getDb();
    const ref = db.collection("users").doc(uid);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() || {};
      const today = dayKey(new Date());
      const usedToday = (data.hypeGiven && data.hypeGiven[today]) || 0;
      if (usedToday >= HYPE_GIVEN_DAILY_CAP) return;

      const award = Math.min(points, HYPE_GIVEN_DAILY_CAP - usedToday);
      const stale = dayKey(new Date(Date.now() - STALE_OFFSET_MS));
      tx.set(
        ref,
        {
          hypeByDay: {
            [today]: admin.firestore.FieldValue.increment(award),
            [stale]: admin.firestore.FieldValue.delete(),
          },
          hypeGiven: {
            [today]: admin.firestore.FieldValue.increment(award),
            [stale]: admin.firestore.FieldValue.delete(),
          },
        },
        {merge: true}
      );
    });
  } catch (error) {
    console.error(`awardCappedHype failed for ${uid}:`, error);
  }
}
