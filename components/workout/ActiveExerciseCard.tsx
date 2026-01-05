/**
 * ActiveExerciseCard Component
 * 
 * Expandable card showing exercise with sets logging, last session data, and AI suggestions
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SetLogger } from './SetLogger';
import { ActiveExerciseState, SetLog, RecentSession } from '@/types/workoutLog';
import { LinearGradient } from 'expo-linear-gradient';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ActiveExerciseCardProps {
  exercise: ActiveExerciseState;
  exerciseIndex: number;
  isCurrentExercise: boolean;
  onExerciseUpdate: (exercise: ActiveExerciseState) => void;
  onExerciseComplete: () => void;
  onExerciseSkip: () => void;
  onStartRestTimer: (seconds: number) => void;
  weightUnit?: 'lbs' | 'kg';
}

export const ActiveExerciseCard: React.FC<ActiveExerciseCardProps> = ({
  exercise,
  exerciseIndex,
  isCurrentExercise,
  onExerciseUpdate,
  onExerciseComplete,
  onExerciseSkip,
  onStartRestTimer,
  weightUnit = 'lbs',
}) => {
  const [isExpanded, setIsExpanded] = useState(isCurrentExercise);
  const [activeSetIndex, setActiveSetIndex] = useState(
    exercise.sets.findIndex(s => !s.completed) 
  );
  
  const expandAnim = useRef(new Animated.Value(isCurrentExercise ? 1 : 0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  // Expand/collapse animation
  useEffect(() => {
    Animated.timing(expandAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isExpanded]);
  
  // Progress animation
  useEffect(() => {
    const completedSets = exercise.sets.filter(s => s.completed).length;
    const progress = completedSets / exercise.targetSets;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [exercise.sets]);
  
  // Auto-expand current exercise
  useEffect(() => {
    if (isCurrentExercise && !isExpanded) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsExpanded(true);
    }
  }, [isCurrentExercise]);
  
  const toggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };
  
  const handleSetUpdate = (setIndex: number, updatedSet: SetLog) => {
    const newSets = [...exercise.sets];
    newSets[setIndex] = updatedSet;
    onExerciseUpdate({ ...exercise, sets: newSets });
  };
  
  const handleSetComplete = (setIndex: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Move to next set or complete exercise
    const nextIncompleteSet = exercise.sets.findIndex((s, i) => i > setIndex && !s.completed);
    
    if (nextIncompleteSet !== -1) {
      setActiveSetIndex(nextIncompleteSet);
      // Start rest timer
      onStartRestTimer(90); // Default 90 seconds, could be customized
    } else {
      // All sets complete
      onExerciseUpdate({ ...exercise, isComplete: true });
      onExerciseComplete();
    }
  };
  
  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onExerciseUpdate({ ...exercise, isSkipped: true });
    onExerciseSkip();
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
  
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });
  
  return (
    <Animated.View 
      style={[
        styles.container,
        exercise.isComplete && styles.completedContainer,
        exercise.isSkipped && styles.skippedContainer,
        isCurrentExercise && styles.currentContainer,
      ]}
    >
      {/* Header - Always Visible */}
      <TouchableOpacity 
        style={styles.header} 
        onPress={toggleExpand}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <View style={styles.exerciseNumberBadge}>
            <Text style={styles.exerciseNumber}>{exerciseIndex + 1}</Text>
          </View>
          <View style={styles.exerciseInfo}>
            <Text style={styles.exerciseName} numberOfLines={1}>
              {exercise.exerciseName}
            </Text>
            <Text style={styles.exerciseTarget}>
              {exercise.targetSets} × {exercise.targetReps}
              {exercise.suggestedWeight && ` @ ${exercise.suggestedWeight} ${weightUnit}`}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          {exercise.isComplete && (
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          )}
          {exercise.isSkipped && (
            <Ionicons name="close-circle" size={24} color="#FF6B6B" />
          )}
          {!exercise.isComplete && !exercise.isSkipped && (
            <View style={styles.progressBadge}>
              <Text style={styles.progressText}>
                {completedSets}/{exercise.targetSets}
              </Text>
            </View>
          )}
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color="rgba(255,255,255,0.5)" 
          />
        </View>
      </TouchableOpacity>
      
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View 
          style={[
            styles.progressBar,
            { width: progressWidth },
            exercise.isComplete && styles.progressBarComplete,
          ]} 
        />
      </View>
      
      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Last Session Reference */}
          {exercise.lastSessionData && (
            <View style={styles.lastSessionCard}>
              <View style={styles.lastSessionHeader}>
                <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.6)" />
                <Text style={styles.lastSessionTitle}>Previous Session</Text>
              </View>
              <Text style={styles.lastSessionStats}>
                Best set: {exercise.lastSessionData.bestSet.weight} × {exercise.lastSessionData.bestSet.reps}
                {' • '}Volume: {exercise.lastSessionData.totalVolume}
              </Text>
            </View>
          )}
          
          {/* AI Suggestion */}
          {exercise.suggestedWeight && !exercise.lastSessionData && (
            <View style={styles.aiSuggestionCard}>
              <LinearGradient
                colors={['rgba(255, 45, 85, 0.2)', 'rgba(255, 45, 85, 0.05)']}
                style={styles.aiGradient}
              >
                <Ionicons name="bulb-outline" size={16} color="#ff2d55" />
                <Text style={styles.aiSuggestionText}>
                  AI suggests: Start with {exercise.suggestedWeight} {weightUnit}
                </Text>
              </LinearGradient>
            </View>
          )}
          
          {/* Sets */}
          <View style={styles.setsContainer}>
            {exercise.sets.map((set, index) => (
              <SetLogger
                key={index}
                setNumber={set.setNumber}
                targetReps={exercise.targetReps}
                suggestedWeight={exercise.suggestedWeight}
                lastSessionSet={exercise.lastSessionData?.sets[index]}
                currentSet={set}
                onSetUpdate={(updatedSet) => handleSetUpdate(index, updatedSet)}
                onSetComplete={() => handleSetComplete(index)}
                isActive={index === activeSetIndex && !exercise.isComplete && !exercise.isSkipped}
                weightUnit={weightUnit}
              />
            ))}
          </View>
          
          {/* Action Buttons */}
          {!exercise.isComplete && !exercise.isSkipped && (
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.addSetButton}
                onPress={addSet}
              >
                <Ionicons name="add" size={18} color="#ff2d55" />
                <Text style={styles.addSetText}>Add Set</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.skipButton}
                onPress={handleSkip}
              >
                <Ionicons name="play-skip-forward" size={18} color="#FF6B6B" />
                <Text style={styles.skipText}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Volume Summary */}
          {completedSets > 0 && (
            <View style={styles.volumeSummary}>
              <Text style={styles.volumeLabel}>Session Volume</Text>
              <Text style={styles.volumeValue}>
                {totalVolume.toLocaleString()} {weightUnit}
              </Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  currentContainer: {
    borderColor: 'rgba(255, 45, 85, 0.3)',
    backgroundColor: 'rgba(255, 45, 85, 0.05)',
  },
  completedContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  skippedContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
    borderColor: 'rgba(255, 107, 107, 0.2)',
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  exerciseNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 45, 85, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseNumber: {
    color: '#ff2d55',
    fontSize: 14,
    fontWeight: '700',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  exerciseTarget: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBadge: {
    backgroundColor: 'rgba(255, 45, 85, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    color: '#ff2d55',
    fontSize: 13,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#ff2d55',
    borderRadius: 2,
  },
  progressBarComplete: {
    backgroundColor: '#4CAF50',
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },
  lastSessionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  lastSessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  lastSessionTitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
  lastSessionStats: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  aiSuggestionCard: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  aiGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  aiSuggestionText: {
    color: '#ff2d55',
    fontSize: 13,
    fontWeight: '500',
  },
  setsContainer: {
    gap: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  addSetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 45, 85, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  addSetText: {
    color: '#ff2d55',
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  skipText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '600',
  },
  volumeSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  volumeLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },
  volumeValue: {
    color: '#ff2d55',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ActiveExerciseCard;
