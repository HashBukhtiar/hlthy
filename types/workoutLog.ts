/**
 * Workout Logging Types
 * 
 * Firebase Collections:
 * - users/{userId}/workout_logs/{logId} - Individual workout sessions
 * - users/{userId}/exercise_history/{exerciseId} - Per-exercise stats & PRs
 */

import { Timestamp } from 'firebase/firestore';

// ============================================
// SET & EXERCISE LOGGING
// ============================================

/**
 * Individual set within an exercise
 */
export interface SetLog {
  setNumber: number;
  weight: number;           // in user's preferred unit (lbs/kg)
  reps: number;
  rpe?: number;             // Rate of Perceived Exertion (1-10)
  completed: boolean;
  isWarmup?: boolean;
  isDropSet?: boolean;
  isPR?: boolean;           // Flag if this set was a PR
  notes?: string;
}

/**
 * Single exercise within a workout log
 */
export interface ExerciseLog {
  exerciseId: string;       // Canonical ID (e.g., "barbell_bench_press")
  exerciseName: string;     // Display name
  targetSets?: number;      // What was prescribed
  targetReps?: string;      // e.g., "8-10" or "12"
  targetWeight?: number;    // AI suggested weight
  sets: SetLog[];
  restSeconds?: number;     // Rest between sets
  notes?: string;
  skipped?: boolean;        // User skipped this exercise
  personalRecordType?: PRType | null;  // What type of PR was hit
}

// ============================================
// WORKOUT LOG (Main Document)
// ============================================

export type WorkoutMood = 'energized' | 'good' | 'neutral' | 'tired' | 'exhausted';
export type PRType = 'weight' | 'reps' | 'volume' | 'one_rep_max';

/**
 * Complete workout session log
 * Stored at: users/{userId}/workout_logs/{logId}
 */
export interface WorkoutLog {
  id?: string;
  
  // References
  userId: string;
  workoutId?: string;       // Reference to saved workout template (if any)
  workoutName: string;
  workoutFocus?: string;    // e.g., "push", "pull", "legs", "upper"
  
  // Timing
  startedAt: Timestamp | Date;
  completedAt: Timestamp | Date;
  durationMinutes: number;
  
  // Exercise Data
  exercises: ExerciseLog[];
  
  // Summary Stats (computed on save)
  totalVolume: number;      // Total weight × reps across all exercises
  totalSets: number;
  totalReps: number;
  exercisesCompleted: number;
  exercisesSkipped: number;
  prsHit: number;           // Count of PRs in this session
  
  // User Feedback
  mood?: WorkoutMood;
  perceivedDifficulty?: number;  // 1-10 scale
  energyLevel?: number;          // 1-10 scale
  notes?: string;
  
  // Metadata
  createdAt: Timestamp | Date;
  updatedAt?: Timestamp | Date;
  
  // Unit preference at time of logging
  weightUnit: 'lbs' | 'kg';
}

// ============================================
// EXERCISE HISTORY & PERSONAL RECORDS
// ============================================

/**
 * Personal record for a specific exercise
 */
export interface PersonalRecord {
  value: number;            // Weight, reps, or volume depending on type
  weight?: number;          // For volume PRs: the weight used
  reps?: number;            // For volume PRs: the reps performed
  date: Timestamp | Date;
  workoutLogId: string;     // Reference to the workout where PR was set
}

/**
 * Recent session summary for an exercise
 */
export interface RecentSession {
  date: Timestamp | Date;
  workoutLogId: string;
  sets: SetLog[];
  bestSet: {
    weight: number;
    reps: number;
    volume: number;         // weight × reps
  };
  totalVolume: number;
  avgRPE?: number;
}

export type TrendDirection = 'increasing' | 'stable' | 'decreasing' | 'insufficient_data';

/**
 * Exercise history document
 * Stored at: users/{userId}/exercise_history/{exerciseId}
 */
export interface ExerciseHistory {
  id?: string;
  exerciseId: string;
  exerciseName: string;
  userId: string;
  
  // Personal Records
  personalRecords: {
    maxWeight: PersonalRecord | null;      // Heaviest weight lifted for any reps
    maxReps: PersonalRecord | null;        // Most reps at any weight
    maxVolume: PersonalRecord | null;      // Best single set volume (weight × reps)
    estimatedOneRepMax: PersonalRecord | null;  // Calculated 1RM
  };
  
  // Recent Performance (last 10 sessions)
  recentSessions: RecentSession[];
  
  // Trend Analysis (calculated periodically)
  trends: {
    volumeTrend: TrendDirection;
    strengthTrend: TrendDirection;
    consistencyScore: number;    // 0-100, based on how often exercise is performed
    lastPerformed: Timestamp | Date;
    timesPerformed: number;
    lastPR: Timestamp | Date | null;
  };
  
  // AI Suggestions (updated after each workout)
  aiSuggestion?: {
    nextWeight: number;
    nextReps: string;           // e.g., "8-10"
    reasoning: string;          // e.g., "You hit all reps at RPE 7, ready to increase"
    updatedAt: Timestamp | Date;
  };
  
  // Metadata
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  weightUnit: 'lbs' | 'kg';
}

// ============================================
// ACTIVE WORKOUT STATE (Client-side only)
// ============================================

/**
 * State for active workout in progress (not persisted until complete)
 */
export interface ActiveWorkoutState {
  workoutId?: string;
  workoutName: string;
  workoutFocus?: string;
  startedAt: Date;
  exercises: ActiveExerciseState[];
  currentExerciseIndex: number;
  isPaused: boolean;
  elapsedSeconds: number;
}

export interface ActiveExerciseState {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: string;
  suggestedWeight?: number;
  lastSessionData?: RecentSession;
  sets: SetLog[];
  isComplete: boolean;
  isSkipped: boolean;
  notes?: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * Response from AI for exercise suggestions
 */
export interface ExerciseSuggestionResponse {
  exerciseId: string;
  suggestedWeight: number;
  suggestedReps: string;
  reasoning: string;
  lastSession?: {
    weight: number;
    reps: number;
    rpe?: number;
    date: string;
  };
  prAlert?: {
    type: PRType;
    currentRecord: number;
    targetToBreak: number;
  };
}

/**
 * Summary returned after completing a workout
 */
export interface WorkoutCompletionSummary {
  workoutLogId: string;
  duration: string;          // Formatted: "45 min"
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  exercisesCompleted: number;
  prsHit: PRSummary[];
  musclesWorked: string[];
  comparison?: {
    volumeChange: number;    // Percentage vs last similar workout
    volumeTrend: TrendDirection;
  };
  aiInsight?: string;        // "Great session! You increased volume by 8% on chest exercises"
}

export interface PRSummary {
  exerciseName: string;
  prType: PRType;
  newValue: number;
  previousValue?: number;
  improvement?: string;      // "+10 lbs" or "+2 reps"
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate estimated 1RM using Brzycki formula
 */
export function calculateOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps > 12) return weight * (1 + reps / 30); // Less accurate for high reps
  return weight * (36 / (37 - reps));
}

/**
 * Calculate total volume for a set
 */
export function calculateSetVolume(set: SetLog): number {
  return set.weight * set.reps;
}

/**
 * Calculate total volume for an exercise
 */
export function calculateExerciseVolume(exercise: ExerciseLog): number {
  return exercise.sets
    .filter(set => set.completed && !set.isWarmup)
    .reduce((total, set) => total + calculateSetVolume(set), 0);
}

/**
 * Calculate total workout volume
 */
export function calculateWorkoutVolume(exercises: ExerciseLog[]): number {
  return exercises.reduce((total, ex) => total + calculateExerciseVolume(ex), 0);
}

/**
 * Format duration in minutes to readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format weight with unit
 */
export function formatWeight(weight: number, unit: 'lbs' | 'kg'): string {
  return `${weight} ${unit}`;
}

/**
 * Check if a set beats a personal record
 */
export function checkForPR(
  set: SetLog, 
  currentPRs: ExerciseHistory['personalRecords']
): PRType | null {
  const setVolume = calculateSetVolume(set);
  const estimated1RM = calculateOneRepMax(set.weight, set.reps);
  
  // Check max weight
  if (!currentPRs.maxWeight || set.weight > currentPRs.maxWeight.value) {
    return 'weight';
  }
  
  // Check max volume (single set)
  if (!currentPRs.maxVolume || setVolume > currentPRs.maxVolume.value) {
    return 'volume';
  }
  
  // Check estimated 1RM
  if (!currentPRs.estimatedOneRepMax || estimated1RM > currentPRs.estimatedOneRepMax.value) {
    return 'one_rep_max';
  }
  
  // Check max reps at same or higher weight
  if (currentPRs.maxWeight && set.weight >= currentPRs.maxWeight.value) {
    if (!currentPRs.maxReps || set.reps > currentPRs.maxReps.value) {
      return 'reps';
    }
  }
  
  return null;
}
