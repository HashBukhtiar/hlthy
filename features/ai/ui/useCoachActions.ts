/**
 * Coach action hooks — save workout plans, apply suggestions, etc.
 * Consumes structured data from useAIChat and performs app-level actions.
 */
import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

interface UseCoachActionsReturn {
  saveWorkoutPlan: (workoutData: Record<string, unknown>) => Promise<void>;
}

export function useCoachActions(): UseCoachActionsReturn {
  const { currentUser } = useAuth();
  const router = useRouter();

  const saveWorkoutPlan = useCallback(async (workoutData: Record<string, unknown>) => {
    if (!currentUser) return;

    // Navigate to workout save flow with the AI-generated data
    // The WorkoutSaveModal handles the actual Firestore write
    router.push({
      pathname: '/create-workout',
      params: {
        aiWorkout: JSON.stringify(workoutData),
        source: 'ai_coach',
      },
    });
  }, [currentUser, router]);

  return {
    saveWorkoutPlan,
  };
}
