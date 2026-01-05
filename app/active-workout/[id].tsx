/**
 * Active Workout Screen
 * 
 * Main workout logging interface - log sets, track PRs, complete workout
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/context/AuthContext';
import { 
  ActiveWorkoutState, 
  ActiveExerciseState, 
  SetLog,
  WorkoutLog,
} from '@/types/workoutLog';
import { 
  saveWorkoutLog, 
  getExerciseHistories,
} from '@/services/workoutLogging';
import { ActiveExerciseCard } from '@/components/workout/ActiveExerciseCard';
import { RestTimer } from '@/components/workout/RestTimer';

export default function ActiveWorkoutScreen() {
  const { id: workoutId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  
  const [workout, setWorkout] = useState<ActiveWorkoutState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(90);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const headerOpacity = useRef(new Animated.Value(0)).current;
  
  // Load workout and exercise history
  useEffect(() => {
    loadWorkout();
  }, [workoutId]);
  
  // Elapsed time counter
  useEffect(() => {
    if (workout && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [workout, isPaused]);
  
  const loadWorkout = async () => {
    if (!workoutId || !currentUser) return;
    
    try {
      setIsLoading(true);
      
      // Fetch workout from Firestore
      const workoutRef = doc(db, 'workouts', workoutId);
      const workoutDoc = await getDoc(workoutRef);
      
      if (!workoutDoc.exists()) {
        Alert.alert('Error', 'Workout not found');
        router.back();
        return;
      }
      
      const workoutData = workoutDoc.data();
      
      // Extract exercises from segments
      const exercises: ActiveExerciseState[] = [];
      const exerciseIds: string[] = [];
      
      if (workoutData.segments) {
        for (const segment of workoutData.segments) {
          if (segment.exercises) {
            for (const ex of segment.exercises) {
              const exerciseId = ex.exerciseId || ex.name?.toLowerCase().replace(/\s+/g, '_') || `exercise_${exercises.length}`;
              exerciseIds.push(exerciseId);
              
              const targetSets = ex.sets || 3;
              const sets: SetLog[] = Array(targetSets).fill(null).map((_, i) => ({
                setNumber: i + 1,
                weight: 0,
                reps: 0,
                completed: false,
                isWarmup: segment.type === 'warm_up',
              }));
              
              exercises.push({
                exerciseId,
                exerciseName: ex.name || ex.exerciseName || 'Unknown Exercise',
                targetSets,
                targetReps: ex.reps?.toString() || '10',
                suggestedWeight: ex.suggestedWeight,
                sets,
                isComplete: false,
                isSkipped: false,
              });
            }
          }
        }
      }
      
      // Fetch exercise history for suggestions
      const histories = await getExerciseHistories(currentUser.uid, exerciseIds);
      
      // Add last session data to exercises
      exercises.forEach(ex => {
        const history = histories.get(ex.exerciseId);
        if (history && history.recentSessions.length > 0) {
          ex.lastSessionData = history.recentSessions[0];
          // Auto-fill suggested weight from last session if not set
          if (!ex.suggestedWeight && history.recentSessions[0].bestSet) {
            ex.suggestedWeight = history.recentSessions[0].bestSet.weight;
          }
        }
      });
      
      setWorkout({
        workoutId,
        workoutName: workoutData.title || workoutData.name || 'Workout',
        workoutFocus: workoutData.focus || workoutData.dayType,
        startedAt: new Date(),
        exercises,
        currentExerciseIndex: 0,
        isPaused: false,
        elapsedSeconds: 0,
      });
      
    } catch (error) {
      console.error('Error loading workout:', error);
      Alert.alert('Error', 'Failed to load workout');
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatElapsedTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleExerciseUpdate = useCallback((index: number, updatedExercise: ActiveExerciseState) => {
    setWorkout(prev => {
      if (!prev) return prev;
      const newExercises = [...prev.exercises];
      newExercises[index] = updatedExercise;
      return { ...prev, exercises: newExercises };
    });
  }, []);
  
  const handleExerciseComplete = useCallback((index: number) => {
    setWorkout(prev => {
      if (!prev) return prev;
      // Move to next incomplete exercise
      const nextIndex = prev.exercises.findIndex((ex, i) => 
        i > index && !ex.isComplete && !ex.isSkipped
      );
      return {
        ...prev,
        currentExerciseIndex: nextIndex !== -1 ? nextIndex : prev.currentExerciseIndex,
      };
    });
  }, []);
  
  const handleExerciseSkip = useCallback((index: number) => {
    setWorkout(prev => {
      if (!prev) return prev;
      const nextIndex = prev.exercises.findIndex((ex, i) => 
        i > index && !ex.isComplete && !ex.isSkipped
      );
      return {
        ...prev,
        currentExerciseIndex: nextIndex !== -1 ? nextIndex : prev.currentExerciseIndex,
      };
    });
  }, []);
  
  const handleStartRestTimer = useCallback((seconds: number) => {
    setRestDuration(seconds);
    setShowRestTimer(true);
  }, []);
  
  const handleCompleteWorkout = async () => {
    if (!workout || !currentUser) return;
    
    const completedExercises = workout.exercises.filter(ex => !ex.isSkipped);
    const hasLoggedSets = completedExercises.some(ex => 
      ex.sets.some(s => s.completed)
    );
    
    if (!hasLoggedSets) {
      Alert.alert(
        'No Sets Logged',
        'You haven\'t logged any sets yet. Are you sure you want to finish?',
        [
          { text: 'Continue Workout', style: 'cancel' },
          { text: 'Finish Anyway', style: 'destructive', onPress: saveAndComplete },
        ]
      );
      return;
    }
    
    saveAndComplete();
  };
  
  const saveAndComplete = async () => {
    if (!workout || !currentUser) return;
    
    try {
      const workoutLog: Omit<WorkoutLog, 'id' | 'createdAt' | 'totalVolume' | 'totalSets' | 'totalReps' | 'exercisesCompleted' | 'exercisesSkipped' | 'prsHit'> = {
        userId: currentUser.uid,
        workoutId: workout.workoutId,
        workoutName: workout.workoutName,
        workoutFocus: workout.workoutFocus,
        startedAt: workout.startedAt,
        completedAt: new Date(),
        durationMinutes: Math.floor(elapsedTime / 60),
        exercises: workout.exercises.map(ex => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          targetSets: ex.targetSets,
          targetReps: ex.targetReps,
          targetWeight: ex.suggestedWeight,
          sets: ex.sets,
          skipped: ex.isSkipped,
        })),
        weightUnit: 'lbs', // TODO: Get from user preferences
      };
      
      const { logId, summary } = await saveWorkoutLog(currentUser.uid, workoutLog);
      
      // Navigate to completion screen
      router.replace({
        pathname: '/workout-complete/[id]',
        params: { 
          id: logId,
          summary: JSON.stringify(summary),
        },
      });
      
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    }
  };
  
  const handleCancelWorkout = () => {
    Alert.alert(
      'Cancel Workout',
      'Are you sure you want to cancel? Your progress will be lost.',
      [
        { text: 'Keep Going', style: 'cancel' },
        { 
          text: 'Cancel Workout', 
          style: 'destructive', 
          onPress: () => router.back(),
        },
      ]
    );
  };
  
  const togglePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPaused(!isPaused);
  };
  
  if (isLoading || !workout) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.loadingText}>Loading workout...</Text>
      </View>
    );
  }
  
  const completedCount = workout.exercises.filter(ex => ex.isComplete).length;
  const skippedCount = workout.exercises.filter(ex => ex.isSkipped).length;
  const progress = (completedCount + skippedCount) / workout.exercises.length;
  const nextExercise = workout.exercises[workout.currentExerciseIndex + 1];
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={handleCancelWorkout}
        >
          <Ionicons name="close" size={24} color="#FF6B6B" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.workoutName} numberOfLines={1}>
            {workout.workoutName}
          </Text>
          <View style={styles.timerRow}>
            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.6)" />
            <Text style={styles.timerText}>{formatElapsedTime(elapsedTime)}</Text>
            <TouchableOpacity onPress={togglePause}>
              <Ionicons 
                name={isPaused ? "play" : "pause"} 
                size={16} 
                color="#8B7DFF" 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.finishButton}
          onPress={handleCompleteWorkout}
        >
          <Text style={styles.finishText}>Finish</Text>
        </TouchableOpacity>
      </SafeAreaView>
      
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill,
              { width: `${progress * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {completedCount}/{workout.exercises.length} exercises
        </Text>
      </View>
      
      {/* Exercise List */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {workout.exercises.map((exercise, index) => (
          <ActiveExerciseCard
            key={`${exercise.exerciseId}-${index}`}
            exercise={exercise}
            exerciseIndex={index}
            isCurrentExercise={index === workout.currentExerciseIndex}
            onExerciseUpdate={(updated) => handleExerciseUpdate(index, updated)}
            onExerciseComplete={() => handleExerciseComplete(index)}
            onExerciseSkip={() => handleExerciseSkip(index)}
            onStartRestTimer={handleStartRestTimer}
            weightUnit="lbs"
          />
        ))}
        
        {/* Complete Workout Card */}
        <TouchableOpacity 
          style={styles.completeCard}
          onPress={handleCompleteWorkout}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#ff2d55', '#d91a40']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.completeGradient}
          >
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.completeCardText}>Complete Workout</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {/* Rest Timer Modal */}
      <RestTimer
        isVisible={showRestTimer}
        initialSeconds={restDuration}
        onComplete={() => setShowRestTimer(false)}
        onDismiss={() => setShowRestTimer(false)}
        onSkip={() => setShowRestTimer(false)}
        nextExerciseName={nextExercise?.exerciseName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  cancelButton: {
    width: 35,
    height: 35,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  workoutName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  finishButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  finishText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(80, 80, 80, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff2d55',
    borderRadius: 2,
  },
  progressText: {
    color: '#888888',
    fontSize: 12,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  completeCard: {
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  completeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  completeCardText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 100,
  },
});
