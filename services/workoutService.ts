/**
 * Workout Service - Handles workout CRUD operations
 */
import { db } from '@/firebaseConfig';
import { 
  addDoc, 
  collection, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  increment,
  getDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { WorkoutPlanData } from '@/utils/aiMessage';
import { generateId } from '@/logic/idGenerator';

export interface SavedWorkout {
  id?: string;
  creatorId: string;
  creatorUsername: string;
  title: string;
  description: string;
  coverImageUrl?: string | null;
  segments: WorkoutSegment[];
  createdAt: any;
  isPublic: boolean;
  visibility: 'public' | 'followers' | 'private';
  savedCount: number;
  tags: string[];
  source?: 'ai_generated' | 'user_created';
  originalAIData?: WorkoutPlanData; // Store original AI response for reference
}

export interface WorkoutSegment {
  id: string;
  name: string;
  length: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
  load?: string;
  restSec?: number;
  notes?: string;
  safetyRating?: 'low' | 'medium' | 'high';
}

/**
 * Converts AI WorkoutPlanData to our saved workout format
 */
export function convertAIWorkoutToDatabaseFormat(
  aiWorkout: WorkoutPlanData,
  userId: string,
  username: string
): Omit<SavedWorkout, 'id'> {
  // Convert AI segments to our format
  const segments: WorkoutSegment[] = aiWorkout.segments.map((aiSegment, index) => ({
    id: generateId(),
    name: aiSegment.name,
    length: '15', // Default segment length, can be customized later
    exercises: aiSegment.exercises.map((aiExercise) => ({
      id: generateId(),
      name: aiExercise.exerciseId, // Use the exercise name/ID from AI
      sets: aiExercise.sets.toString(),
      reps: typeof aiExercise.reps === 'number' ? aiExercise.reps.toString() : aiExercise.reps,
      load: aiExercise.load,
      restSec: aiExercise.restSec,
      notes: aiExercise.notes,
      safetyRating: aiExercise.safetyRating,
    }))
  }));

  return {
    creatorId: userId,
    creatorUsername: username,
    title: `${aiWorkout.dayType}`, // Use the day type as title
    description: aiWorkout.safetyNotes || 'AI-generated workout plan',
    coverImageUrl: null,
    segments,
    createdAt: serverTimestamp(),
    isPublic: false, // Default to private for AI workouts
    visibility: 'private',
    savedCount: 0,
    tags: ['ai-generated'],
    source: 'ai_generated',
    originalAIData: aiWorkout,
  };
}

/**
 * Saves an AI-generated workout to the user's "My Workouts" collection
 */
export async function saveAIWorkoutToMyWorkouts(
  aiWorkout: WorkoutPlanData,
  userId: string,
  username: string
): Promise<{ success: boolean; workoutId?: string; error?: string }> {
  try {
    // Convert AI workout to database format
    const workoutData = convertAIWorkoutToDatabaseFormat(aiWorkout, userId, username);

    // Save to workouts collection
    const workoutDocRef = await addDoc(collection(db, 'workouts'), workoutData);
    const workoutId = workoutDocRef.id;

    // Update user's workout count
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      'stats.workoutCount': increment(1)
    });

    console.log('AI workout saved with ID:', workoutId);
    return { success: true, workoutId };

  } catch (error) {
    console.error('Error saving AI workout:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save workout' 
    };
  }
}

/**
 * Adds a workout to user's saved workouts (favorites)
 */
export async function addWorkoutToSavedWorkouts(
  workoutId: string,
  userId: string,
  workoutTitle: string,
  workoutCoverUrl?: string | null,
  creatorUsername?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userFavoriteDocRef = doc(db, `users/${userId}/savedWorkouts`, workoutId);
    const workoutDocRef = doc(db, 'workouts', workoutId);

    // Add to user's saved workouts
    await setDoc(userFavoriteDocRef, {
      workoutId: workoutId,
      title: workoutTitle,
      coverImageUrl: workoutCoverUrl || null,
      creatorUsername: creatorUsername || 'Unknown',
      savedAt: Timestamp.now()
    });

    // Increment saved count on the workout
    await updateDoc(workoutDocRef, {
      savedCount: increment(1)
    });

    return { success: true };

  } catch (error) {
    console.error('Error saving workout to favorites:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save workout to favorites' 
    };
  }
}

/**
 * Updates workout visibility settings
 */
export async function updateWorkoutVisibility(
  workoutId: string,
  visibility: 'public' | 'followers' | 'private',
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const workoutDocRef = doc(db, 'workouts', workoutId);
    
    // Verify ownership
    const workoutDoc = await getDoc(workoutDocRef);
    if (!workoutDoc.exists()) {
      return { success: false, error: 'Workout not found' };
    }

    const workoutData = workoutDoc.data();
    if (workoutData.creatorId !== userId) {
      return { success: false, error: 'You can only modify your own workouts' };
    }

    // Update visibility
    await updateDoc(workoutDocRef, {
      visibility,
      isPublic: visibility === 'public'
    });

    return { success: true };

  } catch (error) {
    console.error('Error updating workout visibility:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update visibility' 
    };
  }
}
