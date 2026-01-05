/**
 * Workout Logging Service
 * 
 * Handles saving workout logs, updating exercise history, and PR detection
 */

import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  orderBy, 
  limit, 
  where,
  Timestamp,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import {
  WorkoutLog,
  ExerciseLog,
  ExerciseHistory,
  PersonalRecord,
  RecentSession,
  SetLog,
  PRType,
  WorkoutCompletionSummary,
  PRSummary,
  TrendDirection,
  calculateOneRepMax,
  calculateExerciseVolume,
  calculateWorkoutVolume,
  calculateSetVolume,
  formatDuration,
  checkForPR
} from '@/types/workoutLog';

// ============================================
// WORKOUT LOG OPERATIONS
// ============================================

/**
 * Save a completed workout log to Firebase
 * Note: totalVolume, totalSets, totalReps, exercisesCompleted, exercisesSkipped, and prsHit
 * are calculated automatically and don't need to be provided
 */
export async function saveWorkoutLog(
  userId: string, 
  workoutLog: Omit<WorkoutLog, 'id' | 'createdAt' | 'totalVolume' | 'totalSets' | 'totalReps' | 'exercisesCompleted' | 'exercisesSkipped' | 'prsHit'>
): Promise<{ logId: string; summary: WorkoutCompletionSummary }> {
  try {
    const logsRef = collection(db, 'users', userId, 'workout_logs');
    const logDoc = doc(logsRef);
    
    // Calculate summary stats
    const totalVolume = calculateWorkoutVolume(workoutLog.exercises);
    const totalSets = workoutLog.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(s => s.completed && !s.isWarmup).length, 
      0
    );
    const totalReps = workoutLog.exercises.reduce(
      (sum, ex) => sum + ex.sets.filter(s => s.completed && !s.isWarmup).reduce((r, s) => r + s.reps, 0),
      0
    );
    const exercisesCompleted = workoutLog.exercises.filter(ex => !ex.skipped).length;
    const exercisesSkipped = workoutLog.exercises.filter(ex => ex.skipped).length;
    
    // Detect PRs and update exercise history
    const prResults = await detectAndSavePRs(userId, workoutLog.exercises, logDoc.id, workoutLog.weightUnit);
    const prsHit = prResults.filter(pr => pr !== null).length;
    
    // Prepare full log document
    const fullLog: WorkoutLog = {
      ...workoutLog,
      id: logDoc.id,
      totalVolume,
      totalSets,
      totalReps,
      exercisesCompleted,
      exercisesSkipped,
      prsHit,
      createdAt: serverTimestamp() as Timestamp,
    };
    
    await setDoc(logDoc, fullLog);
    
    // Generate completion summary
    const summary: WorkoutCompletionSummary = {
      workoutLogId: logDoc.id,
      duration: formatDuration(workoutLog.durationMinutes),
      totalVolume,
      totalSets,
      totalReps,
      exercisesCompleted,
      prsHit: prResults.filter((pr): pr is PRSummary => pr !== null),
      musclesWorked: extractMusclesWorked(workoutLog.exercises),
    };
    
    console.log('✅ Workout log saved:', logDoc.id);
    return { logId: logDoc.id, summary };
    
  } catch (error) {
    console.error('❌ Error saving workout log:', error);
    throw error;
  }
}

/**
 * Get recent workout logs for a user
 */
export async function getWorkoutLogs(
  userId: string, 
  limitCount: number = 20
): Promise<WorkoutLog[]> {
  try {
    const logsRef = collection(db, 'users', userId, 'workout_logs');
    const q = query(logsRef, orderBy('completedAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as WorkoutLog[];
    
  } catch (error) {
    console.error('❌ Error fetching workout logs:', error);
    return [];
  }
}

/**
 * Get workout logs filtered by focus/muscle group
 */
export async function getWorkoutLogsByFocus(
  userId: string, 
  focus: string,
  limitCount: number = 10
): Promise<WorkoutLog[]> {
  try {
    const logsRef = collection(db, 'users', userId, 'workout_logs');
    const q = query(
      logsRef, 
      where('workoutFocus', '==', focus.toLowerCase()),
      orderBy('completedAt', 'desc'), 
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as WorkoutLog[];
    
  } catch (error) {
    console.error('❌ Error fetching workout logs by focus:', error);
    return [];
  }
}

// ============================================
// EXERCISE HISTORY OPERATIONS
// ============================================

/**
 * Get exercise history for a specific exercise
 */
export async function getExerciseHistory(
  userId: string, 
  exerciseId: string
): Promise<ExerciseHistory | null> {
  try {
    const historyRef = doc(db, 'users', userId, 'exercise_history', exerciseId);
    const historyDoc = await getDoc(historyRef);
    
    if (historyDoc.exists()) {
      return { id: historyDoc.id, ...historyDoc.data() } as ExerciseHistory;
    }
    return null;
    
  } catch (error) {
    console.error('❌ Error fetching exercise history:', error);
    return null;
  }
}

/**
 * Get history for multiple exercises (for workout preview)
 */
export async function getExerciseHistories(
  userId: string, 
  exerciseIds: string[]
): Promise<Map<string, ExerciseHistory>> {
  const historyMap = new Map<string, ExerciseHistory>();
  
  try {
    // Fetch all in parallel
    const promises = exerciseIds.map(id => getExerciseHistory(userId, id));
    const results = await Promise.all(promises);
    
    results.forEach((history, index) => {
      if (history) {
        historyMap.set(exerciseIds[index], history);
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching exercise histories:', error);
  }
  
  return historyMap;
}

/**
 * Update exercise history after a workout
 */
export async function updateExerciseHistory(
  userId: string,
  exerciseLog: ExerciseLog,
  workoutLogId: string,
  weightUnit: 'lbs' | 'kg'
): Promise<{ prType: PRType | null; prSummary: PRSummary | null }> {
  try {
    const historyRef = doc(db, 'users', userId, 'exercise_history', exerciseLog.exerciseId);
    const historyDoc = await getDoc(historyRef);
    
    const completedSets = exerciseLog.sets.filter(s => s.completed && !s.isWarmup);
    if (completedSets.length === 0) {
      return { prType: null, prSummary: null };
    }
    
    // Calculate session stats
    const bestSet = completedSets.reduce((best, set) => {
      const setVolume = calculateSetVolume(set);
      const bestVolume = best.weight * best.reps;
      return setVolume > bestVolume ? { weight: set.weight, reps: set.reps, volume: setVolume } : best;
    }, { weight: 0, reps: 0, volume: 0 });
    
    const totalVolume = calculateExerciseVolume(exerciseLog);
    const avgRPE = completedSets.filter(s => s.rpe).reduce((sum, s) => sum + (s.rpe || 0), 0) / 
      completedSets.filter(s => s.rpe).length || undefined;
    
    const newSession: RecentSession = {
      date: serverTimestamp() as Timestamp,
      workoutLogId,
      sets: completedSets,
      bestSet,
      totalVolume,
      avgRPE,
    };
    
    let prType: PRType | null = null;
    let prSummary: PRSummary | null = null;
    
    if (historyDoc.exists()) {
      // Update existing history
      const history = historyDoc.data() as ExerciseHistory;
      
      // Check for PRs
      for (const set of completedSets) {
        const pr = checkForPR(set, history.personalRecords);
        if (pr) {
          prType = pr;
          prSummary = createPRSummary(exerciseLog.exerciseName, pr, set, history.personalRecords, weightUnit);
          break; // Only record first/best PR
        }
      }
      
      // Update PRs if needed
      const updatedPRs = updatePersonalRecords(history.personalRecords, completedSets, workoutLogId);
      
      // Keep only last 10 sessions
      const recentSessions = [newSession, ...history.recentSessions].slice(0, 10);
      
      // Calculate trends
      const trends = calculateTrends(recentSessions, prType ? serverTimestamp() as Timestamp : history.trends.lastPR);
      
      await updateDoc(historyRef, {
        personalRecords: updatedPRs,
        recentSessions,
        trends,
        updatedAt: serverTimestamp(),
      });
      
    } else {
      // Create new history document
      const estimated1RM = calculateOneRepMax(bestSet.weight, bestSet.reps);
      
      const newHistory: Omit<ExerciseHistory, 'id'> = {
        exerciseId: exerciseLog.exerciseId,
        exerciseName: exerciseLog.exerciseName,
        userId,
        personalRecords: {
          maxWeight: { value: bestSet.weight, date: serverTimestamp() as Timestamp, workoutLogId },
          maxReps: { value: bestSet.reps, weight: bestSet.weight, date: serverTimestamp() as Timestamp, workoutLogId },
          maxVolume: { value: bestSet.volume, weight: bestSet.weight, reps: bestSet.reps, date: serverTimestamp() as Timestamp, workoutLogId },
          estimatedOneRepMax: { value: Math.round(estimated1RM), date: serverTimestamp() as Timestamp, workoutLogId },
        },
        recentSessions: [newSession],
        trends: {
          volumeTrend: 'insufficient_data',
          strengthTrend: 'insufficient_data',
          consistencyScore: 10,
          lastPerformed: serverTimestamp() as Timestamp,
          timesPerformed: 1,
          lastPR: serverTimestamp() as Timestamp,
        },
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
        weightUnit,
      };
      
      await setDoc(historyRef, newHistory);
      
      // First time is always a PR!
      prType = 'weight';
      prSummary = {
        exerciseName: exerciseLog.exerciseName,
        prType: 'weight',
        newValue: bestSet.weight,
        improvement: 'First time!',
      };
    }
    
    return { prType, prSummary };
    
  } catch (error) {
    console.error('❌ Error updating exercise history:', error);
    return { prType: null, prSummary: null };
  }
}

// ============================================
// PR DETECTION & CELEBRATION
// ============================================

/**
 * Detect PRs across all exercises in a workout and update histories
 */
async function detectAndSavePRs(
  userId: string,
  exercises: ExerciseLog[],
  workoutLogId: string,
  weightUnit: 'lbs' | 'kg'
): Promise<(PRSummary | null)[]> {
  const results: (PRSummary | null)[] = [];
  
  for (const exercise of exercises) {
    if (exercise.skipped) {
      results.push(null);
      continue;
    }
    
    const { prSummary } = await updateExerciseHistory(userId, exercise, workoutLogId, weightUnit);
    results.push(prSummary);
  }
  
  return results;
}

/**
 * Check if a potential set would be a PR (for real-time feedback)
 */
export async function wouldBePR(
  userId: string,
  exerciseId: string,
  weight: number,
  reps: number
): Promise<{ isPR: boolean; prType: PRType | null; currentRecord?: number }> {
  const history = await getExerciseHistory(userId, exerciseId);
  
  if (!history) {
    return { isPR: true, prType: 'weight' }; // First time is always a PR
  }
  
  const mockSet: SetLog = { setNumber: 1, weight, reps, completed: true };
  const prType = checkForPR(mockSet, history.personalRecords);
  
  if (prType) {
    let currentRecord: number | undefined;
    switch (prType) {
      case 'weight':
        currentRecord = history.personalRecords.maxWeight?.value;
        break;
      case 'volume':
        currentRecord = history.personalRecords.maxVolume?.value;
        break;
      case 'one_rep_max':
        currentRecord = history.personalRecords.estimatedOneRepMax?.value;
        break;
    }
    return { isPR: true, prType, currentRecord };
  }
  
  return { isPR: false, prType: null };
}

// ============================================
// AI CONTEXT HELPERS
// ============================================

/**
 * Get exercise history summary for AI context
 * Returns recent performance data in a format suitable for AI prompts
 */
export async function getExerciseHistoryForAI(
  userId: string,
  exerciseIds: string[]
): Promise<string> {
  const histories = await getExerciseHistories(userId, exerciseIds);
  
  if (histories.size === 0) {
    return "No exercise history available for this user.";
  }
  
  let context = "USER'S EXERCISE HISTORY:\n";
  
  for (const [exerciseId, history] of histories) {
    const lastSession = history.recentSessions[0];
    const pr = history.personalRecords;
    
    context += `\n${history.exerciseName}:\n`;
    context += `  - Times performed: ${history.trends.timesPerformed}\n`;
    
    if (lastSession) {
      context += `  - Last session: ${lastSession.bestSet.weight} × ${lastSession.bestSet.reps}`;
      if (lastSession.avgRPE) {
        context += ` @ RPE ${lastSession.avgRPE.toFixed(1)}`;
      }
      context += '\n';
    }
    
    if (pr.maxWeight) {
      context += `  - PR (max weight): ${pr.maxWeight.value}\n`;
    }
    if (pr.estimatedOneRepMax) {
      context += `  - Estimated 1RM: ${pr.estimatedOneRepMax.value}\n`;
    }
    
    context += `  - Trend: ${history.trends.strengthTrend}\n`;
  }
  
  return context;
}

/**
 * Get recent workout summary for AI context
 */
export async function getRecentWorkoutSummaryForAI(
  userId: string,
  days: number = 14
): Promise<string> {
  const logs = await getWorkoutLogs(userId, 20);
  
  if (logs.length === 0) {
    return "No recent workout history.";
  }
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const recentLogs = logs.filter(log => {
    const completedAt = log.completedAt instanceof Timestamp 
      ? log.completedAt.toDate() 
      : log.completedAt;
    return completedAt >= cutoffDate;
  });
  
  if (recentLogs.length === 0) {
    return `No workouts in the last ${days} days.`;
  }
  
  let summary = `RECENT WORKOUT HISTORY (last ${days} days):\n`;
  summary += `Total workouts: ${recentLogs.length}\n\n`;
  
  // Group by focus
  const byFocus: { [key: string]: number } = {};
  recentLogs.forEach(log => {
    const focus = log.workoutFocus || 'general';
    byFocus[focus] = (byFocus[focus] || 0) + 1;
  });
  
  summary += "Workout distribution:\n";
  for (const [focus, count] of Object.entries(byFocus)) {
    summary += `  - ${focus}: ${count} sessions\n`;
  }
  
  // Last 3 workouts detail
  summary += "\nLast 3 workouts:\n";
  recentLogs.slice(0, 3).forEach((log, i) => {
    const date = log.completedAt instanceof Timestamp 
      ? log.completedAt.toDate().toLocaleDateString()
      : new Date(log.completedAt).toLocaleDateString();
    summary += `  ${i + 1}. ${log.workoutName} (${log.workoutFocus || 'general'}) - ${date}\n`;
    summary += `     Volume: ${log.totalVolume} | Sets: ${log.totalSets} | PRs: ${log.prsHit}\n`;
  });
  
  return summary;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function updatePersonalRecords(
  currentPRs: ExerciseHistory['personalRecords'],
  sets: SetLog[],
  workoutLogId: string
): ExerciseHistory['personalRecords'] {
  const updatedPRs = { ...currentPRs };
  
  for (const set of sets) {
    const setVolume = calculateSetVolume(set);
    const estimated1RM = calculateOneRepMax(set.weight, set.reps);
    const now = serverTimestamp() as Timestamp;
    
    // Max weight
    if (!updatedPRs.maxWeight || set.weight > updatedPRs.maxWeight.value) {
      updatedPRs.maxWeight = { value: set.weight, date: now, workoutLogId };
    }
    
    // Max volume
    if (!updatedPRs.maxVolume || setVolume > updatedPRs.maxVolume.value) {
      updatedPRs.maxVolume = { 
        value: setVolume, 
        weight: set.weight, 
        reps: set.reps, 
        date: now, 
        workoutLogId 
      };
    }
    
    // Estimated 1RM
    if (!updatedPRs.estimatedOneRepMax || estimated1RM > updatedPRs.estimatedOneRepMax.value) {
      updatedPRs.estimatedOneRepMax = { value: Math.round(estimated1RM), date: now, workoutLogId };
    }
    
    // Max reps (at same or higher weight than current max weight PR)
    if (updatedPRs.maxWeight && set.weight >= updatedPRs.maxWeight.value) {
      if (!updatedPRs.maxReps || set.reps > updatedPRs.maxReps.value) {
        updatedPRs.maxReps = { 
          value: set.reps, 
          weight: set.weight, 
          date: now, 
          workoutLogId 
        };
      }
    }
  }
  
  return updatedPRs;
}

function calculateTrends(
  sessions: RecentSession[],
  lastPR: Timestamp | Date | null
): ExerciseHistory['trends'] {
  const now = serverTimestamp() as Timestamp;
  
  if (sessions.length < 3) {
    return {
      volumeTrend: 'insufficient_data',
      strengthTrend: 'insufficient_data',
      consistencyScore: sessions.length * 10,
      lastPerformed: now,
      timesPerformed: sessions.length,
      lastPR,
    };
  }
  
  // Calculate volume trend (compare last 3 vs previous 3)
  const recent3 = sessions.slice(0, 3);
  const previous3 = sessions.slice(3, 6);
  
  const recentAvgVolume = recent3.reduce((sum, s) => sum + s.totalVolume, 0) / recent3.length;
  
  let volumeTrend: TrendDirection = 'stable';
  if (previous3.length >= 2) {
    const previousAvgVolume = previous3.reduce((sum, s) => sum + s.totalVolume, 0) / previous3.length;
    const volumeChange = (recentAvgVolume - previousAvgVolume) / previousAvgVolume;
    
    if (volumeChange > 0.05) volumeTrend = 'increasing';
    else if (volumeChange < -0.05) volumeTrend = 'decreasing';
  }
  
  // Calculate strength trend (based on best set weight)
  const recentBestWeight = Math.max(...recent3.map(s => s.bestSet.weight));
  let strengthTrend: TrendDirection = 'stable';
  if (previous3.length >= 2) {
    const previousBestWeight = Math.max(...previous3.map(s => s.bestSet.weight));
    if (recentBestWeight > previousBestWeight) strengthTrend = 'increasing';
    else if (recentBestWeight < previousBestWeight) strengthTrend = 'decreasing';
  }
  
  return {
    volumeTrend,
    strengthTrend,
    consistencyScore: Math.min(100, sessions.length * 10),
    lastPerformed: now,
    timesPerformed: sessions.length,
    lastPR,
  };
}

function createPRSummary(
  exerciseName: string,
  prType: PRType,
  set: SetLog,
  previousPRs: ExerciseHistory['personalRecords'],
  weightUnit: 'lbs' | 'kg'
): PRSummary {
  let newValue: number;
  let previousValue: number | undefined;
  let improvement: string | undefined;
  
  switch (prType) {
    case 'weight':
      newValue = set.weight;
      previousValue = previousPRs.maxWeight?.value;
      if (previousValue) {
        improvement = `+${newValue - previousValue} ${weightUnit}`;
      }
      break;
    case 'reps':
      newValue = set.reps;
      previousValue = previousPRs.maxReps?.value;
      if (previousValue) {
        improvement = `+${newValue - previousValue} reps`;
      }
      break;
    case 'volume':
      newValue = calculateSetVolume(set);
      previousValue = previousPRs.maxVolume?.value;
      if (previousValue) {
        improvement = `+${newValue - previousValue} volume`;
      }
      break;
    case 'one_rep_max':
      newValue = Math.round(calculateOneRepMax(set.weight, set.reps));
      previousValue = previousPRs.estimatedOneRepMax?.value;
      if (previousValue) {
        improvement = `+${newValue - previousValue} ${weightUnit} est. 1RM`;
      }
      break;
  }
  
  return {
    exerciseName,
    prType,
    newValue,
    previousValue,
    improvement,
  };
}

function extractMusclesWorked(exercises: ExerciseLog[]): string[] {
  // This could be enhanced by mapping exerciseId to muscle groups
  // For now, extract from workout focus or exercise names
  const muscles = new Set<string>();
  
  exercises.forEach(ex => {
    const name = ex.exerciseName.toLowerCase();
    if (name.includes('bench') || name.includes('chest') || name.includes('fly')) muscles.add('Chest');
    if (name.includes('row') || name.includes('pull') || name.includes('lat')) muscles.add('Back');
    if (name.includes('shoulder') || name.includes('press') || name.includes('delt')) muscles.add('Shoulders');
    if (name.includes('bicep') || name.includes('curl')) muscles.add('Biceps');
    if (name.includes('tricep') || name.includes('pushdown') || name.includes('extension')) muscles.add('Triceps');
    if (name.includes('squat') || name.includes('leg') || name.includes('quad')) muscles.add('Legs');
    if (name.includes('deadlift') || name.includes('hip') || name.includes('glute')) muscles.add('Glutes');
    if (name.includes('calf')) muscles.add('Calves');
    if (name.includes('core') || name.includes('ab') || name.includes('plank')) muscles.add('Core');
  });
  
  return Array.from(muscles);
}
// ============================================
// AI WORKOUT HISTORY HELPER
// ============================================

export interface WorkoutHistoryForAI {
  recent_workouts: Array<{
    date: string;
    name: string;
    totalVolume: number;
    prsHit: number;
    durationMinutes: number;
  }>;
  exercise_history: Record<string, {
    prWeight: number;
    prReps: number;
    pr1RM: number;
    lastWeight: number;
    lastReps: number;
    totalSessions: number;
    trend: 'improving' | 'declining' | 'stable' | 'new';
  }>;
  weekly_stats: {
    workoutsThisWeek: number;
    volumeThisWeek: number;
  };
}

/**
 * Get comprehensive workout history formatted for AI coaching
 * This includes recent workouts, exercise performance trends, and weekly stats
 */
export async function getWorkoutHistoryForAI(userId: string): Promise<WorkoutHistoryForAI> {
  try {
    // Get recent workout logs
    const logsRef = collection(db, 'users', userId, 'workout_logs');
    const logsQuery = query(logsRef, orderBy('completedAt', 'desc'), limit(10));
    const logsSnapshot = await getDocs(logsQuery);
    
    const recentWorkouts: WorkoutHistoryForAI['recent_workouts'] = [];
    let volumeThisWeek = 0;
    let workoutsThisWeek = 0;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    logsSnapshot.forEach(doc => {
      const log = doc.data() as WorkoutLog;
      const completedDate = log.completedAt instanceof Timestamp 
        ? log.completedAt.toDate() 
        : new Date(log.completedAt);
      
      recentWorkouts.push({
        date: completedDate.toLocaleDateString('en-US', { 
          weekday: 'short', 
          month: 'short', 
          day: 'numeric' 
        }),
        name: log.workoutName,
        totalVolume: log.totalVolume,
        prsHit: log.prsHit,
        durationMinutes: log.durationMinutes,
      });
      
      // Count this week's stats
      if (completedDate >= oneWeekAgo) {
        workoutsThisWeek++;
        volumeThisWeek += log.totalVolume;
      }
    });
    
    // Get exercise history
    const historyRef = collection(db, 'users', userId, 'exercise_history');
    const historySnapshot = await getDocs(historyRef);
    
    const exerciseHistory: WorkoutHistoryForAI['exercise_history'] = {};
    
    historySnapshot.forEach(doc => {
      const history = doc.data() as ExerciseHistory;
      const lastSession = history.recentSessions?.[0];
      
      exerciseHistory[history.exerciseName] = {
        prWeight: history.personalRecords.maxWeight?.value || 0,
        prReps: history.personalRecords.maxReps?.value || 0,
        pr1RM: history.personalRecords.estimatedOneRepMax?.value || 0,
        lastWeight: lastSession?.bestSet?.weight || 0,
        lastReps: lastSession?.bestSet?.reps || 0,
        totalSessions: history.trends?.timesPerformed || 0,
        trend: mapTrendDirection(history.trends?.strengthTrend || 'stable'),
      };
    });
    
    return {
      recent_workouts: recentWorkouts,
      exercise_history: exerciseHistory,
      weekly_stats: {
        workoutsThisWeek,
        volumeThisWeek,
      },
    };
    
  } catch (error) {
    console.error('Error fetching workout history for AI:', error);
    return {
      recent_workouts: [],
      exercise_history: {},
      weekly_stats: { workoutsThisWeek: 0, volumeThisWeek: 0 },
    };
  }
}

function mapTrendDirection(trend: TrendDirection | string): 'improving' | 'declining' | 'stable' | 'new' {
  switch (trend) {
    case 'increasing': return 'improving';
    case 'decreasing': return 'declining';
    case 'stable': return 'stable';
    case 'insufficient_data': return 'new';
    default: return 'stable';
  }
}