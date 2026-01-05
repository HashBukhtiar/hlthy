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
  onExerciseUpdate: (exercise: ActiveExerciseState) => void;
  onNextExercise: () => void;
  onPreviousExercise: () => void;
  onSkipExercise: () => void;
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
  isActive: boolean;
  weightUnit: string;
}

const SetRow: React.FC<SetRowProps> = ({
  set,
  setIndex,
  targetReps,
  lastSessionSet,
  onUpdate,
  onComplete,
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
  onExerciseUpdate,
  onNextExercise,
  onPreviousExercise,
  onSkipExercise,
  onStartRestTimer,
  weightUnit = 'lbs',
  isFirstExercise,
  isLastExercise,
}) => {
  const insets = useSafeAreaInsets();
  const [activeSetIndex, setActiveSetIndex] = useState(
    exercise.sets.findIndex(s => !s.completed)
  );
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  
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
  
  return (
    <View style={styles.container}>
      {/* Exercise Header */}
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseProgress}>
          <Text style={styles.exerciseCount}>
            Exercise {exerciseIndex + 1} of {totalExercises}
          </Text>
          <View style={styles.dotsContainer}>
            {Array(totalExercises).fill(0).map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.dot,
                  i === exerciseIndex && styles.dotActive,
                  i < exerciseIndex && styles.dotCompleted,
                ]} 
              />
            ))}
          </View>
        </View>
        
        <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
        
        <View style={styles.targetInfo}>
          <View style={styles.targetBadge}>
            <Text style={styles.targetText}>
              {exercise.targetSets} sets × {exercise.targetReps} reps
            </Text>
          </View>
          {exercise.suggestedWeight && (
            <View style={styles.suggestedBadge}>
              <Ionicons name="bulb" size={14} color="#ff2d55" />
              <Text style={styles.suggestedText}>
                {exercise.suggestedWeight} {weightUnit}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Sets List */}
      <ScrollView 
        style={styles.setsScroll}
        contentContainerStyle={styles.setsContent}
        showsVerticalScrollIndicator={false}
      >
        {exercise.sets.map((set, index) => (
          <SetRow
            key={index}
            set={set}
            setIndex={index}
            targetReps={exercise.targetReps}
            lastSessionSet={exercise.lastSessionData?.sets[index]}
            onUpdate={(updatedSet) => handleSetUpdate(index, updatedSet)}
            onComplete={() => handleSetComplete(index)}
            isActive={index === activeSetIndex}
            weightUnit={weightUnit}
          />
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
    color: '#ff2d55',
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
});

export default FocusedExerciseView;
