/**
 * Active Workout Screen
 * 
 * Focused workout logging - one exercise per page for better UX
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  SafeAreaView,
  Dimensions,
  FlatList,
  ViewToken,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
import { FocusedExerciseView } from '@/components/workout/FocusedExerciseView';
import { RestTimer } from '@/components/workout/RestTimer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ActiveWorkoutScreen() {
  const { id: workoutId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  
  const [workout, setWorkout] = useState<ActiveWorkoutState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [restDuration, setRestDuration] = useState(90);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flatListRef = useRef<FlatList>(null);
  
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
      
      const workoutRef = doc(db, 'workouts', workoutId);
      const workoutDoc = await getDoc(workoutRef);
      
      if (!workoutDoc.exists()) {
        Alert.alert('Error', 'Workout not found');
        router.back();
        return;
      }
      
      const workoutData = workoutDoc.data();
      
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
      
      const histories = await getExerciseHistories(currentUser.uid, exerciseIds);
      
      exercises.forEach(ex => {
        const history = histories.get(ex.exerciseId);
        if (history && history.recentSessions.length > 0) {
          ex.lastSessionData = history.recentSessions[0];
          if (!ex.suggestedWeight && history.recentSessions[0].bestSet) {
            ex.suggestedWeight = history.recentSessions[0].bestSet.weight;
          }
        }
      });
      
      setWorkout({
        workoutId,
        workoutName: workoutData.title || workoutData.name || 'Workout',
        workoutFocus: workoutData.focus || workoutData.dayType || 'General',
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
  
  // Handle viewable items change from FlatList swipe
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      const newIndex = viewableItems[0].index;
      if (newIndex !== currentExerciseIndex) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCurrentExerciseIndex(newIndex);
      }
    }
  }, [currentExerciseIndex]);
  
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;
  
  const handleNextExercise = useCallback(() => {
    if (!workout) return;
    
    if (currentExerciseIndex < workout.exercises.length - 1) {
      flatListRef.current?.scrollToIndex({ 
        index: currentExerciseIndex + 1, 
        animated: true 
      });
    } else {
      handleCompleteWorkout();
    }
  }, [workout, currentExerciseIndex]);
  
  const handlePreviousExercise = useCallback(() => {
    if (currentExerciseIndex > 0) {
      flatListRef.current?.scrollToIndex({ 
        index: currentExerciseIndex - 1, 
        animated: true 
      });
    }
  }, [currentExerciseIndex]);
  
  const handleSkipExercise = useCallback(() => {
    if (!workout) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setWorkout(prev => {
      if (!prev) return prev;
      const newExercises = [...prev.exercises];
      newExercises[currentExerciseIndex] = {
        ...newExercises[currentExerciseIndex],
        isSkipped: true,
      };
      return { ...prev, exercises: newExercises };
    });
    
    if (currentExerciseIndex < workout.exercises.length - 1) {
      flatListRef.current?.scrollToIndex({ 
        index: currentExerciseIndex + 1, 
        animated: true 
      });
    } else {
      handleCompleteWorkout();
    }
  }, [workout, currentExerciseIndex]);
  
  const handleJumpToExercise = useCallback((index: number) => {
    if (!workout || index === currentExerciseIndex) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    flatListRef.current?.scrollToIndex({ 
      index, 
      animated: true 
    });
  }, [workout, currentExerciseIndex]);
  
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
      // Build workout log, filtering out undefined values
      const workoutLogData: any = {
        userId: currentUser.uid,
        workoutName: workout.workoutName,
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
        weightUnit: 'lbs',
      };
      
      // Only add optional fields if they have values
      if (workout.workoutId) {
        workoutLogData.workoutId = workout.workoutId;
      }
      if (workout.workoutFocus) {
        workoutLogData.workoutFocus = workout.workoutFocus;
      }
      
      const workoutLog = workoutLogData as Omit<WorkoutLog, 'id' | 'createdAt' | 'totalVolume' | 'totalSets' | 'totalReps' | 'exercisesCompleted' | 'exercisesSkipped' | 'prsHit'>;
      
      const { logId, summary } = await saveWorkoutLog(currentUser.uid, workoutLog);
      
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
        <View style={styles.loadingContent}>
          <Ionicons name="barbell" size={48} color="#ff2d55" />
          <Text style={styles.loadingText}>Preparing your workout...</Text>
        </View>
      </View>
    );
  }
  
  const currentExercise = workout.exercises[currentExerciseIndex];
  const completedCount = workout.exercises.filter(ex => ex.isComplete || ex.sets.some(s => s.completed)).length;
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Compact Header */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={handleCancelWorkout}
        >
          <Ionicons name="close" size={22} color="#FF6B6B" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.workoutName} numberOfLines={1}>
            {workout.workoutName}
          </Text>
          <View style={styles.timerRow}>
            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={styles.timerText}>{formatElapsedTime(elapsedTime)}</Text>
            <TouchableOpacity onPress={togglePause} style={styles.pauseBtn}>
              <Ionicons 
                name={isPaused ? "play" : "pause"} 
                size={14} 
                color={isPaused ? "#ff2d55" : "rgba(255,255,255,0.5)"} 
              />
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.finishButton}
          onPress={handleCompleteWorkout}
        >
          <Text style={styles.finishText}>Done</Text>
        </TouchableOpacity>
      </SafeAreaView>
      
      {/* Horizontal Paging Exercise Views */}
      <FlatList
        ref={flatListRef}
        data={workout.exercises}
        keyExtractor={(item, index) => `exercise-${index}-${item.exerciseId}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialScrollIndex={currentExerciseIndex}
        getItemLayout={(data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        renderItem={({ item, index }) => (
          <View style={styles.exerciseContainer}>
            <FocusedExerciseView
              exercise={item}
              exerciseIndex={index}
              totalExercises={workout.exercises.length}
              allExercises={workout.exercises}
              onExerciseUpdate={(updatedExercise) => handleExerciseUpdate(index, updatedExercise)}
              onNextExercise={handleNextExercise}
              onPreviousExercise={handlePreviousExercise}
              onSkipExercise={handleSkipExercise}
              onJumpToExercise={handleJumpToExercise}
              onStartRestTimer={handleStartRestTimer}
              weightUnit="lbs"
              isFirstExercise={index === 0}
              isLastExercise={index === workout.exercises.length - 1}
            />
          </View>
        )}
      />
      
      {/* Rest Timer Modal */}
      <RestTimer
        isVisible={showRestTimer}
        initialSeconds={restDuration}
        onComplete={() => setShowRestTimer(false)}
        onDismiss={() => setShowRestTimer(false)}
        onSkip={() => setShowRestTimer(false)}
        nextExerciseName={workout.exercises[currentExerciseIndex + 1]?.exerciseName}
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
  loadingContent: {
    alignItems: 'center',
    gap: 16,
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  cancelButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  pauseBtn: {
    padding: 4,
  },
  finishButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 45, 85, 0.15)',
  },
  finishText: {
    color: '#ff2d55',
    fontSize: 14,
    fontWeight: '600',
  },
  exerciseContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
  },
});