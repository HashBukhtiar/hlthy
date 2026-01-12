/**
 * FocusedExerciseView Component
 * 
 * Full-screen focused view for a single exercise with set logging
 * Designed for one exercise at a time, swipeable workout flow
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActiveExerciseState, SetLog } from '@/types/workoutLog';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FocusedExerciseViewProps {
  exercise: ActiveExerciseState;
  exerciseIndex: number;
  totalExercises: number;
  allExercises: ActiveExerciseState[];
  onExerciseUpdate: (exercise: ActiveExerciseState) => void;
  onNextExercise: () => void;
  onPreviousExercise: () => void;
  onSkipExercise: () => void;
  onJumpToExercise: (index: number) => void;
  onStartRestTimer: (seconds: number) => void;
  weightUnit?: 'lbs' | 'kg';
  isFirstExercise: boolean;
  isLastExercise: boolean;
}

interface SetRowProps {
  set: SetLog;
  setIndex: number;
  targetReps: string;
  lastSessionSet?: SetLog;
  onUpdate: (set: SetLog) => void;
  onComplete: () => void;
  onEdit: () => void;
  isActive: boolean;
  weightUnit: string;
  isTimed?: boolean;
  targetDuration?: number;
}

// Helper to detect if this is a timed exercise based on targetReps
const isTimedExercise = (targetReps: string): boolean => {
  const lower = targetReps.toLowerCase();
  return lower.includes('sec') || lower.includes('min') || lower.includes('s)') || 
         lower.includes('hold') || /^\d+s$/.test(lower);
};

// Parse duration from string like "30 seconds" or "30s" or "1 min"
const parseDuration = (targetReps: string): number => {
  const lower = targetReps.toLowerCase();
  const minMatch = lower.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1]) * 60;
  const secMatch = lower.match(/(\d+)\s*(sec|s\b)/);
  if (secMatch) return parseInt(secMatch[1]);
  return 30; // default 30 seconds
};

// Countdown overlay component
const CountdownOverlay: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [count, setCount] = useState(3);
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    
    const interval = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onComplete();
          return 0;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Pulse animation
        scaleAnim.setValue(0.8);
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <View style={styles.countdownOverlay}>
      <Animated.View style={[
        styles.countdownCircle,
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim }
      ]}>
        <Text style={styles.countdownText}>{count}</Text>
        <Text style={styles.countdownLabel}>GET READY</Text>
      </Animated.View>
    </View>
  );
};

// Timer Set Row Component
const TimedSetRow: React.FC<SetRowProps> = ({
  set,
  setIndex,
  targetReps,
  lastSessionSet,
  onUpdate,
  onComplete,
  onEdit,
  isActive,
  weightUnit,
  targetDuration = 30,
}) => {
  const [weight, setWeight] = useState(set.weight?.toString() || '');
  const [useWeight, setUseWeight] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(targetDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [timeLogged, setTimeLogged] = useState(set.duration || 0);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (isActive) {
      Animated.spring(scaleAnim, {
        toValue: 1.02,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive]);
  
  useEffect(() => {
    if (isRunning && !isPaused && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsPaused(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, isPaused]);
  
  const handleWeightChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    setWeight(cleaned);
  };
  
  const initiateTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowCountdown(true);
  };
  
  const startTimerAfterCountdown = () => {
    setShowCountdown(false);
    setTimerSeconds(targetDuration);
    setIsRunning(true);
  };
  
  const pauseTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPaused(true);
  };
  
  const resumeTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPaused(false);
  };
  
  const stopTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRunning(false);
    setIsPaused(false);
    const elapsed = targetDuration - timerSeconds;
    setTimeLogged(elapsed);
  };
  
  const resetTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRunning(false);
    setIsPaused(false);
    setShowCountdown(false);
    setTimerSeconds(targetDuration);
  };
  
  const handleComplete = () => {
    const loggedDuration = isRunning ? (targetDuration - timerSeconds) : (timeLogged || targetDuration);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onUpdate({ 
      ...set, 
      weight: useWeight ? parseFloat(weight) || 0 : 0,
      reps: 1, // Mark as 1 rep for timed sets
      duration: loggedDuration,
      completed: true 
    });
    onComplete();
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };
  
  if (set.completed) {
    return (
      <View style={styles.setRowCompleted}>
        <View style={styles.setNumberBadge}>
          <Ionicons name="checkmark" size={16} color="#4CAF50" />
        </View>
        <View style={styles.completedStats}>
          <Ionicons name="timer-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.completedWeight}>{formatTime(set.duration || targetDuration)}</Text>
          {set.weight > 0 && (
            <>
              <Text style={styles.completedX}>@</Text>
              <Text style={styles.completedReps}>{set.weight} {weightUnit}</Text>
            </>
          )}
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Ionicons name="pencil" size={16} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <Animated.View 
      style={[
        styles.setRow,
        isActive && styles.setRowActive,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      {/* Timer Display */}
      <View style={styles.timerContainer}>
        <Text style={[
          styles.timerDisplay,
          isRunning && styles.timerDisplayActive,
          timerSeconds === 0 && styles.timerDisplayComplete,
        ]}>
          {formatTime(timerSeconds)}
        </Text>
        
        <View style={styles.timerButtons}>
          {!isRunning && !showCountdown ? (
            <TouchableOpacity 
              style={styles.timerStartBtn}
              onPress={initiateTimer}
            >
              <Ionicons name="play" size={24} color="#fff" />
              <Text style={styles.timerBtnText}>Start</Text>
            </TouchableOpacity>
          ) : showCountdown ? (
            <View style={styles.timerStartBtn}>
              <Ionicons name="hourglass-outline" size={24} color="#fff" />
              <Text style={styles.timerBtnText}>Ready...</Text>
            </View>
          ) : isPaused ? (
            <TouchableOpacity 
              style={styles.timerStartBtn}
              onPress={resumeTimer}
            >
              <Ionicons name="play" size={24} color="#fff" />
              <Text style={styles.timerBtnText}>Resume</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.timerPauseBtn}
              onPress={pauseTimer}
            >
              <Ionicons name="pause" size={24} color="#fff" />
              <Text style={styles.timerBtnText}>Pause</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.timerStopBtn}
            onPress={stopTimer}
          >
            <Ionicons name="stop" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.timerResetBtn}
            onPress={resetTimer}
          >
            <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Countdown Overlay */}
      {showCountdown && (
        <CountdownOverlay onComplete={startTimerAfterCountdown} />
      )}
      
      {/* Optional Weight Toggle */}
      <TouchableOpacity 
        style={styles.weightToggle}
        onPress={() => setUseWeight(!useWeight)}
      >
        <View style={[styles.checkbox, useWeight && styles.checkboxChecked]}>
          {useWeight && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
        <Text style={styles.weightToggleText}>Log weight (optional)</Text>
      </TouchableOpacity>
      
      {/* Weight Input (if toggled) */}
      {useWeight && (
        <View style={styles.weightInputRow}>
          <Text style={styles.inputLabel}>WEIGHT</Text>
          <TextInput
            style={styles.weightInputSmall}
            value={weight}
            onChangeText={handleWeightChange}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />
          <Text style={styles.unitLabel}>{weightUnit}</Text>
        </View>
      )}
      
      {/* Complete Set Button */}
      {isActive && (
        <TouchableOpacity 
          style={styles.completeSetBtn}
          onPress={handleComplete}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#ff2d55', '#d91a40']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.completeSetGradient}
          >
            <Ionicons name="checkmark" size={22} color="#fff" />
            <Text style={styles.completeSetText}>Done</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

// Regular Set Row Component
const SetRow: React.FC<SetRowProps> = ({
  set,
  setIndex,
  targetReps,
  lastSessionSet,
  onUpdate,
  onComplete,
  onEdit,
  isActive,
  weightUnit,
}) => {
  const [weight, setWeight] = useState(set.weight?.toString() || '');
  const [reps, setReps] = useState(set.reps?.toString() || '');
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (isActive) {
      Animated.spring(scaleAnim, {
        toValue: 1.02,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive]);
  
  // Auto-fill from last session
  useEffect(() => {
    if (!set.weight && !weight && lastSessionSet?.weight) {
      setWeight(lastSessionSet.weight.toString());
    }
    if (!set.reps && !reps && lastSessionSet?.reps) {
      setReps(lastSessionSet.reps.toString());
    }
  }, [lastSessionSet]);
  
  const handleWeightChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    setWeight(cleaned);
    onUpdate({ ...set, weight: parseFloat(cleaned) || 0 });
  };
  
  const handleRepsChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setReps(cleaned);
    onUpdate({ ...set, reps: parseInt(cleaned) || 0 });
  };
  
  const incrementWeight = (amount: number) => {
    const current = parseFloat(weight) || 0;
    const newWeight = Math.max(0, current + amount);
    setWeight(newWeight.toString());
    onUpdate({ ...set, weight: newWeight });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const incrementReps = (amount: number) => {
    const current = parseInt(reps) || 0;
    const newReps = Math.max(0, current + amount);
    setReps(newReps.toString());
    onUpdate({ ...set, reps: newReps });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const handleComplete = () => {
    if (parseFloat(weight) > 0 && parseInt(reps) > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUpdate({ ...set, weight: parseFloat(weight), reps: parseInt(reps), completed: true });
      onComplete();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };
  
  if (set.completed) {
    return (
      <View style={styles.setRowCompleted}>
        <View style={styles.setNumberBadge}>
          <Ionicons name="checkmark" size={16} color="#4CAF50" />
        </View>
        <View style={styles.completedStats}>
          <Text style={styles.completedWeight}>{set.weight} {weightUnit}</Text>
          <Text style={styles.completedX}>×</Text>
          <Text style={styles.completedReps}>{set.reps} reps</Text>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Ionicons name="pencil" size={16} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <Animated.View 
      style={[
        styles.setRow,
        isActive && styles.setRowActive,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <View style={styles.setHeader}>
        <View style={styles.setNumberBadge}>
          <Text style={styles.setNumber}>{set.setNumber}</Text>
        </View>
        {lastSessionSet && (
          <Text style={styles.lastSession}>
            Last: {lastSessionSet.weight} × {lastSessionSet.reps}
          </Text>
        )}
      </View>
      
      <View style={styles.inputsRow}>
        {/* Weight Input */}
        <View style={styles.inputBlock}>
          <Text style={styles.inputLabel}>WEIGHT</Text>
          <View style={styles.inputWithControls}>
            <TouchableOpacity 
              style={styles.controlBtn}
              onPress={() => incrementWeight(-5)}
            >
              <Ionicons name="remove" size={20} color="#ff2d55" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={handleWeightChange}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
            <TouchableOpacity 
              style={styles.controlBtn}
              onPress={() => incrementWeight(5)}
            >
              <Ionicons name="add" size={20} color="#ff2d55" />
            </TouchableOpacity>
          </View>
          <Text style={styles.unitLabel}>{weightUnit}</Text>
        </View>
        
        {/* Reps Input */}
        <View style={styles.inputBlock}>
          <Text style={styles.inputLabel}>REPS</Text>
          <View style={styles.inputWithControls}>
            <TouchableOpacity 
              style={styles.controlBtn}
              onPress={() => incrementReps(-1)}
            >
              <Ionicons name="remove" size={20} color="#ff2d55" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={reps}
              onChangeText={handleRepsChange}
              keyboardType="number-pad"
              placeholder={targetReps}
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
            <TouchableOpacity 
              style={styles.controlBtn}
              onPress={() => incrementReps(1)}
            >
              <Ionicons name="add" size={20} color="#ff2d55" />
            </TouchableOpacity>
          </View>
          <Text style={styles.unitLabel}>reps</Text>
        </View>
      </View>
      
      {/* Complete Set Button */}
      {isActive && (
        <TouchableOpacity 
          style={styles.completeSetBtn}
          onPress={handleComplete}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#ff2d55', '#d91a40']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.completeSetGradient}
          >
            <Ionicons name="checkmark" size={22} color="#fff" />
            <Text style={styles.completeSetText}>Log Set</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

export const FocusedExerciseView: React.FC<FocusedExerciseViewProps> = ({
  exercise,
  exerciseIndex,
  totalExercises,
  allExercises,
  onExerciseUpdate,
  onNextExercise,
  onPreviousExercise,
  onSkipExercise,
  onJumpToExercise,
  onStartRestTimer,
  weightUnit = 'lbs',
  isFirstExercise,
  isLastExercise,
}) => {
  const insets = useSafeAreaInsets();
  const [activeSetIndex, setActiveSetIndex] = useState(
    exercise.sets.findIndex(s => !s.completed)
  );
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null);
  const [forceTimedMode, setForceTimedMode] = useState<boolean | null>(null); // null = auto-detect
  
  // Update active set when exercise changes
  useEffect(() => {
    const nextIncomplete = exercise.sets.findIndex(s => !s.completed);
    setActiveSetIndex(nextIncomplete !== -1 ? nextIncomplete : exercise.sets.length - 1);
  }, [exercise.exerciseId]);
  
  const handleSetUpdate = (setIndex: number, updatedSet: SetLog) => {
    const newSets = [...exercise.sets];
    newSets[setIndex] = updatedSet;
    onExerciseUpdate({ ...exercise, sets: newSets });
  };
  
  const handleSetComplete = (setIndex: number) => {
    const nextIncomplete = exercise.sets.findIndex((s, i) => i > setIndex && !s.completed);
    
    if (nextIncomplete !== -1) {
      setActiveSetIndex(nextIncomplete);
      onStartRestTimer(90);
    } else {
      // All sets complete
      onExerciseUpdate({ ...exercise, isComplete: true });
      if (!isLastExercise) {
        // Auto-advance after short delay
        setTimeout(() => {
          onNextExercise();
        }, 500);
      }
    }
  };
  
  const addSet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const newSet: SetLog = {
      setNumber: exercise.sets.length + 1,
      weight: lastSet?.weight || 0,
      reps: lastSet?.reps || 0,
      completed: false,
    };
    onExerciseUpdate({ 
      ...exercise, 
      sets: [...exercise.sets, newSet],
      targetSets: exercise.targetSets + 1,
    });
  };
  
  const completedSets = exercise.sets.filter(s => s.completed).length;
  const totalVolume = exercise.sets
    .filter(s => s.completed)
    .reduce((sum, s) => sum + (s.weight * s.reps), 0);
  
  // Check if this is a timed exercise (with override support)
  const autoDetectedTimed = isTimedExercise(exercise.targetReps);
  const isTimed = forceTimedMode !== null ? forceTimedMode : autoDetectedTimed;
  const targetDuration = isTimed ? parseDuration(exercise.targetReps) : 30;
  
  // Reset mode override when exercise changes
  useEffect(() => {
    setForceTimedMode(null);
  }, [exercise.exerciseId]);
  
  const handleEditSet = (setIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Mark the set as incomplete to allow re-editing
    const newSets = [...exercise.sets];
    newSets[setIndex] = { ...newSets[setIndex], completed: false };
    onExerciseUpdate({ ...exercise, sets: newSets, isComplete: false });
    setActiveSetIndex(setIndex);
  };
  
  const toggleTimedMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (forceTimedMode === null) {
      // Currently auto-detect, switch to opposite of detected
      setForceTimedMode(!autoDetectedTimed);
    } else {
      // Toggle between forced modes or back to auto
      setForceTimedMode(forceTimedMode ? false : null);
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Exercise Header */}
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseProgress}>
          <TouchableOpacity 
            style={styles.exercisePickerBtn}
            onPress={() => setShowExercisePicker(true)}
          >
            <Text style={styles.exerciseCount}>
              Exercise {exerciseIndex + 1} of {totalExercises}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#888" />
          </TouchableOpacity>
          <View style={styles.dotsContainer}>
            {allExercises.map((ex, i) => (
              <View 
                key={i} 
                style={[
                  styles.dot,
                  i === exerciseIndex && styles.dotActive,
                  ex.isComplete || ex.sets.every(s => s.completed) ? styles.dotCompleted : styles.dotIncomplete,
                ]} 
              />
            ))}
          </View>
        </View>
        
        <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
        
        <View style={styles.targetInfo}>
          <View style={[styles.targetBadge, isTimed && styles.timedTargetBadge]}>
            {isTimed && <Ionicons name="timer-outline" size={14} color="#ff2d55" style={{ marginRight: 4 }} />}
            <Text style={styles.targetText}>
              {isTimed 
                ? `${exercise.targetSets} sets × ${exercise.targetReps}` 
                : `${exercise.targetSets} sets × ${exercise.targetReps} reps`}
            </Text>
          </View>
          {exercise.suggestedWeight && !isTimed && (
            <View style={styles.suggestedBadge}>
              <Ionicons name="bulb" size={14} color="#ff2d55" />
              <Text style={styles.suggestedText}>
                {exercise.suggestedWeight} {weightUnit}
              </Text>
            </View>
          )}
          
          {/* Mode Toggle */}
          <TouchableOpacity 
            style={styles.modeToggle}
            onPress={toggleTimedMode}
          >
            <Ionicons 
              name={isTimed ? "timer" : "barbell"} 
              size={14} 
              color={forceTimedMode !== null ? "#ff2d55" : "rgba(255,255,255,0.5)"} 
            />
            <Text style={[
              styles.modeToggleText,
              forceTimedMode !== null && styles.modeToggleTextActive
            ]}>
              {isTimed ? 'Timed' : 'Reps'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Sets List */}
      <ScrollView 
        style={styles.setsScroll}
        contentContainerStyle={styles.setsContent}
        showsVerticalScrollIndicator={false}
      >
        {exercise.sets.map((set, index) => (
          isTimed ? (
            <TimedSetRow
              key={index}
              set={set}
              setIndex={index}
              targetReps={exercise.targetReps}
              lastSessionSet={exercise.lastSessionData?.sets[index]}
              onUpdate={(updatedSet) => handleSetUpdate(index, updatedSet)}
              onComplete={() => handleSetComplete(index)}
              onEdit={() => handleEditSet(index)}
              isActive={index === activeSetIndex}
              weightUnit={weightUnit}
              targetDuration={targetDuration}
            />
          ) : (
            <SetRow
              key={index}
              set={set}
              setIndex={index}
              targetReps={exercise.targetReps}
              lastSessionSet={exercise.lastSessionData?.sets[index]}
              onUpdate={(updatedSet) => handleSetUpdate(index, updatedSet)}
              onComplete={() => handleSetComplete(index)}
              onEdit={() => handleEditSet(index)}
              isActive={index === activeSetIndex}
              weightUnit={weightUnit}
            />
          )
        ))}
        
        {/* Add Set Button */}
        <TouchableOpacity 
          style={styles.addSetBtn}
          onPress={addSet}
        >
          <Ionicons name="add-circle-outline" size={24} color="#ff2d55" />
          <Text style={styles.addSetText}>Add Set</Text>
        </TouchableOpacity>
        
        {/* Session Stats */}
        {completedSets > 0 && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{completedSets}/{exercise.targetSets}</Text>
              <Text style={styles.statLabel}>Sets Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalVolume.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Volume ({weightUnit})</Text>
            </View>
          </View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {/* Navigation Footer */}
      <View style={[styles.navFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity 
          style={[styles.navBtn, isFirstExercise && styles.navBtnDisabled]}
          onPress={onPreviousExercise}
          disabled={isFirstExercise}
        >
          <Ionicons 
            name="chevron-back" 
            size={24} 
            color={isFirstExercise ? 'rgba(255,255,255,0.2)' : '#fff'} 
          />
          <Text style={[styles.navBtnText, isFirstExercise && styles.navBtnTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.skipBtn}
          onPress={onSkipExercise}
        >
          <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navBtn}
          onPress={onNextExercise}
        >
          <Text style={styles.navBtnText}>
            {isLastExercise ? 'Finish' : 'Next'}
          </Text>
          <Ionicons name="chevron-forward" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Exercise Picker Modal */}
      <Modal
        visible={showExercisePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExercisePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.exercisePickerModal, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.exercisePickerHeader}>
              <Text style={styles.exercisePickerTitle}>Jump to Exercise</Text>
              <TouchableOpacity 
                style={styles.closeModalBtn}
                onPress={() => setShowExercisePicker(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.exercisePickerList}>
              {allExercises.map((ex, idx) => {
                const exerciseCompleted = ex.sets.filter(s => s.completed).length;
                const exerciseTotal = ex.sets.length;
                const isCurrent = idx === exerciseIndex;
                const isDone = ex.isComplete;
                
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.exercisePickerItem,
                      isCurrent && styles.exercisePickerItemActive,
                      isDone && styles.exercisePickerItemDone,
                    ]}
                    onPress={() => {
                      onJumpToExercise(idx);
                      setShowExercisePicker(false);
                    }}
                  >
                    <View style={styles.exercisePickerItemLeft}>
                      <View style={[
                        styles.exercisePickerNumber,
                        isCurrent && styles.exercisePickerNumberActive,
                        isDone && styles.exercisePickerNumberDone,
                      ]}>
                        {isDone ? (
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        ) : (
                          <Text style={styles.exercisePickerNumberText}>{idx + 1}</Text>
                        )}
                      </View>
                      <Text style={[
                        styles.exercisePickerItemName,
                        isCurrent && styles.exercisePickerItemNameActive,
                      ]}>
                        {ex.exerciseName}
                      </Text>
                    </View>
                    <Text style={styles.exercisePickerItemProgress}>
                      {exerciseCompleted}/{exerciseTotal}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  exerciseHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  exerciseProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseCount: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: '#ff2d55',
    width: 24,
  },
  dotCompleted: {
    backgroundColor: '#4CAF50',
  },
  dotIncomplete: {
    backgroundColor: '#ff2d55',
  },
  exerciseName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  targetInfo: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  targetBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  targetText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  suggestedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 45, 85, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  suggestedText: {
    color: '#ff2d55',
    fontSize: 14,
    fontWeight: '600',
  },
  setsScroll: {
    flex: 1,
  },
  setsContent: {
    padding: 20,
  },
  setRow: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  setRowActive: {
    backgroundColor: 'rgba(255, 45, 85, 0.08)',
    borderColor: 'rgba(255, 45, 85, 0.3)',
  },
  setRowCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  setNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 45, 85, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumber: {
    color: '#ff2d55',
    fontSize: 16,
    fontWeight: '700',
  },
  lastSession: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  completedStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedWeight: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  completedX: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
  },
  completedReps: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  inputBlock: {
    flex: 1,
    alignItems: 'center',
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputWithControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 45, 85, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  unitLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 6,
  },
  completeSetBtn: {
    marginTop: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  completeSetGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  completeSetText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.3)',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addSetText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: '600',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  statValue: {
    color: '#ff2d55',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
  navFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#222',
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  navBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  navBtnTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  skipBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  // Timed exercise styles
  timedTargetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 45, 85, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timedBadgeText: {
    color: '#ff2d55',
    fontSize: 13,
    fontWeight: '500',
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  timerDisplay: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginBottom: 16,
  },
  timerDisplayActive: {
    color: '#ff2d55',
  },
  timerDisplayComplete: {
    color: '#4CAF50',
  },
  timerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ff2d55',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  timerPauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ff9500',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  timerStopBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3A3A3C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerResetBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3A3A3C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  weightToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#ff2d55',
    borderColor: '#ff2d55',
  },
  weightToggleText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  weightInputSmall: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    width: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  // Edit button for completed sets
  editBtn: {
    padding: 8,
    marginLeft: 'auto',
  },
  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    marginLeft: 'auto',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 45, 85, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modeToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modeToggleTextActive: {
    color: '#ff2d55',
  },
  // Exercise picker button
  exercisePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // Countdown overlay
  countdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    borderRadius: 16,
  },
  countdownCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ff2d55',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownText: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '800',
  },
  countdownLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: -4,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  exercisePickerModal: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  exercisePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  exercisePickerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeModalBtn: {
    padding: 4,
  },
  exercisePickerList: {
    padding: 16,
  },
  exercisePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  exercisePickerItemActive: {
    backgroundColor: 'rgba(255, 45, 85, 0.2)',
    borderWidth: 1,
    borderColor: '#ff2d55',
  },
  exercisePickerItemDone: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  exercisePickerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  exercisePickerNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exercisePickerNumberActive: {
    backgroundColor: '#ff2d55',
  },
  exercisePickerNumberDone: {
    backgroundColor: '#4CAF50',
  },
  exercisePickerNumberText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  exercisePickerItemName: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  exercisePickerItemNameActive: {
    color: '#fff',
    fontWeight: '600',
  },
  exercisePickerItemProgress: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default FocusedExerciseView;
