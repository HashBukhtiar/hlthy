/**
 * SetLogger Component
 * 
 * Input component for logging individual sets with weight, reps, and RPE
 * Features: auto-fill from last session, real-time PR detection, haptic feedback
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SetLog } from '@/types/workoutLog';
import { LinearGradient } from 'expo-linear-gradient';

interface SetLoggerProps {
  setNumber: number;
  targetReps?: string;
  suggestedWeight?: number;
  lastSessionSet?: SetLog;
  currentSet: SetLog;
  onSetUpdate: (set: SetLog) => void;
  onSetComplete: () => void;
  isActive: boolean;
  isPotentialPR?: boolean;
  weightUnit?: 'lbs' | 'kg';
}

export const SetLogger: React.FC<SetLoggerProps> = ({
  setNumber,
  targetReps,
  suggestedWeight,
  lastSessionSet,
  currentSet,
  onSetUpdate,
  onSetComplete,
  isActive,
  isPotentialPR = false,
  weightUnit = 'lbs',
}) => {
  const [weight, setWeight] = useState(currentSet.weight?.toString() || '');
  const [reps, setReps] = useState(currentSet.reps?.toString() || '');
  const [rpe, setRpe] = useState(currentSet.rpe?.toString() || '');
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prGlowAnim = useRef(new Animated.Value(0)).current;
  
  // Auto-fill from last session or suggestion
  useEffect(() => {
    if (!currentSet.weight && !weight) {
      if (suggestedWeight) {
        setWeight(suggestedWeight.toString());
      } else if (lastSessionSet?.weight) {
        setWeight(lastSessionSet.weight.toString());
      }
    }
    if (!currentSet.reps && !reps && lastSessionSet?.reps) {
      setReps(lastSessionSet.reps.toString());
    }
  }, [suggestedWeight, lastSessionSet]);
  
  // PR glow animation
  useEffect(() => {
    if (isPotentialPR && isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(prGlowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(prGlowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      prGlowAnim.setValue(0);
    }
  }, [isPotentialPR, isActive]);
  
  const handleWeightChange = (value: string) => {
    // Allow only numbers and decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    setWeight(cleaned);
    onSetUpdate({
      ...currentSet,
      weight: parseFloat(cleaned) || 0,
    });
  };
  
  const handleRepsChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    setReps(cleaned);
    onSetUpdate({
      ...currentSet,
      reps: parseInt(cleaned) || 0,
    });
  };
  
  const handleRpeChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const numValue = parseFloat(cleaned);
    if (numValue <= 10 || cleaned === '') {
      setRpe(cleaned);
      onSetUpdate({
        ...currentSet,
        rpe: numValue || undefined,
      });
    }
  };
  
  const handleComplete = () => {
    if (parseFloat(weight) > 0 && parseInt(reps) > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSetUpdate({
        ...currentSet,
        weight: parseFloat(weight),
        reps: parseInt(reps),
        rpe: rpe ? parseFloat(rpe) : undefined,
        completed: true,
      });
      onSetComplete();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };
  
  const incrementWeight = (amount: number) => {
    const current = parseFloat(weight) || 0;
    setWeight((current + amount).toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSetUpdate({
      ...currentSet,
      weight: current + amount,
    });
  };
  
  const incrementReps = (amount: number) => {
    const current = parseInt(reps) || 0;
    const newValue = Math.max(0, current + amount);
    setReps(newValue.toString());
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSetUpdate({
      ...currentSet,
      reps: newValue,
    });
  };
  
  const prBorderColor = prGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 215, 0, 0.3)', 'rgba(255, 215, 0, 0.8)'],
  });
  
  return (
    <Animated.View 
      style={[
        styles.container,
        isActive && styles.activeContainer,
        currentSet.completed && styles.completedContainer,
        isPotentialPR && isActive && { borderColor: prBorderColor, borderWidth: 2 },
      ]}
    >
      {/* Set Number & Status */}
      <View style={styles.setHeader}>
        <View style={styles.setNumberContainer}>
          <Text style={styles.setNumber}>Set {setNumber}</Text>
          {currentSet.isWarmup && (
            <View style={styles.warmupBadge}>
              <Text style={styles.warmupText}>Warmup</Text>
            </View>
          )}
        </View>
        {currentSet.completed && (
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
        )}
        {isPotentialPR && !currentSet.completed && (
          <View style={styles.prBadge}>
            <Ionicons name="trophy" size={14} color="#FFD700" />
            <Text style={styles.prText}>PR?</Text>
          </View>
        )}
      </View>
      
      {/* Last Session Reference */}
      {lastSessionSet && !currentSet.completed && (
        <View style={styles.lastSessionRow}>
          <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.5)" />
          <Text style={styles.lastSessionText}>
            Last: {lastSessionSet.weight} × {lastSessionSet.reps}
            {lastSessionSet.rpe && ` @ RPE ${lastSessionSet.rpe}`}
          </Text>
        </View>
      )}
      
      {/* Input Row */}
      <View style={styles.inputRow}>
        {/* Weight Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Weight</Text>
          <View style={styles.inputWithButtons}>
            <TouchableOpacity 
              style={styles.adjustButton}
              onPress={() => incrementWeight(-5)}
              disabled={currentSet.completed}
            >
              <Ionicons name="remove" size={20} color="#8B7DFF" />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, currentSet.completed && styles.inputCompleted]}
              value={weight}
              onChangeText={handleWeightChange}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="rgba(255,255,255,0.3)"
              editable={!currentSet.completed}
            />
            <TouchableOpacity 
              style={styles.adjustButton}
              onPress={() => incrementWeight(5)}
              disabled={currentSet.completed}
            >
              <Ionicons name="add" size={20} color="#8B7DFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.unitLabel}>{weightUnit}</Text>
        </View>
        
        {/* Reps Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Reps</Text>
          <View style={styles.inputWithButtons}>
            <TouchableOpacity 
              style={styles.adjustButton}
              onPress={() => incrementReps(-1)}
              disabled={currentSet.completed}
            >
              <Ionicons name="remove" size={20} color="#8B7DFF" />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, currentSet.completed && styles.inputCompleted]}
              value={reps}
              onChangeText={handleRepsChange}
              keyboardType="number-pad"
              placeholder={targetReps || '0'}
              placeholderTextColor="rgba(255,255,255,0.3)"
              editable={!currentSet.completed}
            />
            <TouchableOpacity 
              style={styles.adjustButton}
              onPress={() => incrementReps(1)}
              disabled={currentSet.completed}
            >
              <Ionicons name="add" size={20} color="#8B7DFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.unitLabel}>reps</Text>
        </View>
        
        {/* RPE Input */}
        <View style={styles.inputGroupSmall}>
          <Text style={styles.inputLabel}>RPE</Text>
          <TextInput
            style={[styles.inputSmall, currentSet.completed && styles.inputCompleted]}
            value={rpe}
            onChangeText={handleRpeChange}
            keyboardType="decimal-pad"
            placeholder="7"
            placeholderTextColor="rgba(255,255,255,0.3)"
            maxLength={4}
            editable={!currentSet.completed}
          />
          <Text style={styles.unitLabel}>/10</Text>
        </View>
      </View>
      
      {/* Complete Button */}
      {!currentSet.completed && isActive && (
        <TouchableOpacity 
          style={styles.completeButton}
          onPress={handleComplete}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#8B7DFF', '#6B5DD3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.completeGradient}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.completeText}>Complete Set</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeContainer: {
    backgroundColor: 'rgba(139, 125, 255, 0.1)',
    borderColor: 'rgba(139, 125, 255, 0.3)',
  },
  completedContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
    opacity: 0.8,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  setNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  warmupBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  warmupText: {
    color: '#FFC107',
    fontSize: 10,
    fontWeight: '600',
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  prText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '700',
  },
  lastSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  lastSessionText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
    alignItems: 'center',
  },
  inputGroupSmall: {
    width: 70,
    alignItems: 'center',
  },
  inputLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '500',
  },
  inputWithButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adjustButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 125, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputSmall: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    width: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputCompleted: {
    opacity: 0.7,
  },
  unitLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
    marginTop: 4,
  },
  completeButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  completeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  completeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SetLogger;
