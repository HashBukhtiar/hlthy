/**
 * RestTimer Component
 * 
 * Countdown timer between sets with haptic feedback and visual effects
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

interface RestTimerProps {
  isVisible: boolean;
  initialSeconds: number;
  onComplete: () => void;
  onDismiss: () => void;
  onSkip: () => void;
  nextExerciseName?: string;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  isVisible,
  initialSeconds,
  onComplete,
  onDismiss,
  onSkip,
  nextExerciseName,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Reset timer when visibility changes
  useEffect(() => {
    if (isVisible) {
      setSecondsRemaining(initialSeconds);
      setIsPaused(false);
      progressAnim.setValue(1);
    }
  }, [isVisible, initialSeconds]);
  
  // Countdown logic
  useEffect(() => {
    if (isVisible && !isPaused && secondsRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsRemaining(prev => {
          const newValue = prev - 1;
          
          // Haptic feedback at certain intervals
          if (newValue === 10 || newValue === 5 || newValue === 3 || newValue === 2 || newValue === 1) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          
          // Animate progress
          Animated.timing(progressAnim, {
            toValue: newValue / initialSeconds,
            duration: 1000,
            useNativeDriver: false,
          }).start();
          
          return newValue;
        });
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isVisible, isPaused, secondsRemaining]);
  
  // Timer complete
  useEffect(() => {
    if (secondsRemaining === 0 && isVisible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    }
  }, [secondsRemaining]);
  
  // Pulse animation for last 10 seconds
  useEffect(() => {
    if (secondsRemaining <= 10 && secondsRemaining > 0 && !isPaused) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [secondsRemaining]);
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const adjustTime = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSecondsRemaining(prev => Math.max(0, prev + delta));
  };
  
  const togglePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsPaused(!isPaused);
  };
  
  const progressRotation = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  const progressColor = secondsRemaining <= 10 
    ? '#FF6B6B' 
    : secondsRemaining <= 30 
      ? '#FFA726' 
      : '#ff2d55';
  
  if (!isVisible) return null;
  
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          
          {/* Timer Circle */}
          <View style={styles.timerContainer}>
            <View style={styles.timerCircle}>
              <Animated.View 
                style={[
                  styles.progressRing,
                  { 
                    borderColor: progressColor,
                    transform: [{ scale: pulseAnim }],
                  }
                ]}
              />
              <View style={styles.timerInner}>
                <Text style={[styles.timerLabel, secondsRemaining <= 10 && styles.timerLabelUrgent]}>
                  REST
                </Text>
                <Animated.Text 
                  style={[
                    styles.timerText,
                    secondsRemaining <= 10 && styles.timerTextUrgent,
                    { transform: [{ scale: pulseAnim }] }
                  ]}
                >
                  {formatTime(secondsRemaining)}
                </Animated.Text>
                {isPaused && (
                  <Text style={styles.pausedText}>PAUSED</Text>
                )}
              </View>
            </View>
          </View>
          
          {/* Time Adjustment */}
          <View style={styles.adjustmentRow}>
            <TouchableOpacity 
              style={styles.adjustButton}
              onPress={() => adjustTime(-15)}
            >
              <Text style={styles.adjustText}>-15s</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.pauseButton}
              onPress={togglePause}
            >
              <Ionicons 
                name={isPaused ? "play" : "pause"} 
                size={28} 
                color="#fff" 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.adjustButton}
              onPress={() => adjustTime(15)}
            >
              <Text style={styles.adjustText}>+15s</Text>
            </TouchableOpacity>
          </View>
          
          {/* Quick Presets */}
          <View style={styles.presetsRow}>
            {[60, 90, 120, 180].map(seconds => (
              <TouchableOpacity
                key={seconds}
                style={[
                  styles.presetButton,
                  secondsRemaining === seconds && styles.presetButtonActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSecondsRemaining(seconds);
                }}
              >
                <Text style={[
                  styles.presetText,
                  secondsRemaining === seconds && styles.presetTextActive,
                ]}>
                  {formatTime(seconds)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Next Exercise Preview */}
          {nextExerciseName && (
            <View style={styles.nextExercise}>
              <Text style={styles.nextLabel}>Up Next</Text>
              <Text style={styles.nextName}>{nextExerciseName}</Text>
            </View>
          )}
          
          {/* Skip Rest Button */}
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={onSkip}
          >
            <LinearGradient
              colors={['rgba(255, 45, 85, 0.3)', 'rgba(255, 45, 85, 0.1)']}
              style={styles.skipGradient}
            >
              <Ionicons name="play-skip-forward" size={20} color="#ff2d55" />
              <Text style={styles.skipText}>Skip Rest</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  progressRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#ff2d55',
  },
  timerInner: {
    alignItems: 'center',
  },
  timerLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
    marginBottom: 4,
  },
  timerLabelUrgent: {
    color: '#FF6B6B',
  },
  timerText: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timerTextUrgent: {
    color: '#FF6B6B',
  },
  pausedText: {
    color: '#FFA726',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
  },
  adjustmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 20,
  },
  adjustButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  adjustText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  pauseButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(139, 125, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  presetButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  presetButtonActive: {
    backgroundColor: 'rgba(255, 45, 85, 0.2)',
    borderColor: 'rgba(255, 45, 85, 0.5)',
  },
  presetText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
  presetTextActive: {
    color: '#ff2d55',
  },
  nextExercise: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
  },
  nextLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  nextName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  skipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  skipText: {
    color: '#ff2d55',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RestTimer;
