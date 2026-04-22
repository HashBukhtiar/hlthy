/**
 * Insights repository — reads the user's workout_logs + exercise_history
 * from Firestore. This is the ONLY place in the insights feature that
 * touches Firestore (per the layered architecture in CLAUDE.md).
 */
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from '@/features/infra/firestore';
import { db } from '@/firebaseConfig';
import { logger } from '@/shared/utils/logger';
import type { WorkoutLog, ExerciseHistory } from '@/types/workoutLog';

// Cap the read to avoid pulling huge histories on the client. Insight charts
// look at the last ~60 days max, and users rarely log more than 2-3/day.
const LOG_FETCH_LIMIT = 180;
const HISTORY_FETCH_LIMIT = 50;

export interface RawInsightsPayload {
  logs: WorkoutLog[];
  history: Record<string, ExerciseHistory>;
}

export const InsightsRepository = {
  async fetchAll(uid: string): Promise<RawInsightsPayload> {
    if (!uid) return { logs: [], history: {} };
    try {
      const [logs, history] = await Promise.all([
        _fetchLogs(uid),
        _fetchHistory(uid),
      ]);
      return { logs, history };
    } catch (err) {
      logger.error('InsightsRepository', 'fetchAll failed', err);
      return { logs: [], history: {} };
    }
  },
};

async function _fetchLogs(uid: string): Promise<WorkoutLog[]> {
  const ref = collection(db, 'users', uid, 'workout_logs');
  const q = query(ref, orderBy('completedAt', 'desc'), limit(LOG_FETCH_LIMIT));
  const snap = await getDocs(q);
  const out: WorkoutLog[] = [];
  snap.forEach((doc) => {
    out.push({ id: doc.id, ...(doc.data() as Omit<WorkoutLog, 'id'>) });
  });
  return out;
}

async function _fetchHistory(uid: string): Promise<Record<string, ExerciseHistory>> {
  const ref = collection(db, 'users', uid, 'exercise_history');
  const q = query(ref, limit(HISTORY_FETCH_LIMIT));
  const snap = await getDocs(q);
  const out: Record<string, ExerciseHistory> = {};
  snap.forEach((doc) => {
    const data = doc.data() as Omit<ExerciseHistory, 'id'>;
    out[doc.id] = { id: doc.id, ...data };
  });
  return out;
}
