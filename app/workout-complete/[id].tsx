/**
 * Workout Complete Screen
 * 
 * Summary screen after completing a workout - shows stats, PRs, and allows feedback
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  Animated,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, updateDoc } from '@/features/infra/firestore';
import { db } from '@/firebaseConfig';
import { useAuth } from '@/context/AuthContext';
import { WorkoutCompletionSummary, WorkoutMood, PRSummary } from '@/types/workoutLog';
import ConfettiCannon from 'react-native-confetti-cannon';

const MOOD_OPTIONS: { value: WorkoutMood; emoji: string; label: string }[] = [
  { value: 'energized', emoji: '🔥', label: 'Energized' },
  { value: 'good', emoji: '💪', label: 'Good' },
  { value: 'neutral', emoji: '😐', label: 'Neutral' },
  { value: 'tired', emoji: '😓', label: 'Tired' },
  { value: 'exhausted', emoji: '😵', label: 'Exhausted' },
];

export default function WorkoutCompleteScreen() {
  const { id: logId, summary: summaryParam } = useLocalSearchParams<{ id: string; summary: string }>();
  const router = useRouter();
  const { currentUser } = useAuth();
  
  const [summary, setSummary] = useState<WorkoutCompletionSummary | null>(null);
  const [selectedMood, setSelectedMood] = useState<WorkoutMood | null>(null);
  const [difficulty, setDifficulty] = useState<number>(5);
  const [showConfetti, setShowConfetti] = useState(false);
  const [notes, setNotes] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const prBounceAnim = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef<any>(null);
  
  useEffect(() => {
    if (summaryParam) {
      try {
        const parsed = JSON.parse(summaryParam) as WorkoutCompletionSummary;
        setSummary(parsed);
        
        // Trigger confetti if PRs were hit
        if (parsed.prsHit && parsed.prsHit.length > 0) {
          setShowConfetti(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch (e) {
        console.error('Error parsing summary:', e);
      }
    }
    
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    
    // PR badge bounce animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(prBounceAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(prBounceAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [summaryParam]);
  
  const handleMoodSelect = async (mood: WorkoutMood) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMood(mood);
    
    // Save to Firebase
    if (logId && currentUser) {
      try {
        const logRef = doc(db, 'users', currentUser.uid, 'workout_logs', logId);
        await updateDoc(logRef, { mood });
      } catch (e) {
        console.error('Error saving mood:', e);
      }
    }
  };
  
  const handleDifficultyChange = async (value: number) => {
    setDifficulty(value);
    
    if (logId && currentUser) {
      try {
        const logRef = doc(db, 'users', currentUser.uid, 'workout_logs', logId);
        await updateDoc(logRef, { perceivedDifficulty: value });
      } catch (e) {
        console.error('Error saving difficulty:', e);
      }
    }
  };
  
  const handleShare = async () => {
    if (!summary) return;
    
    try {
      const message = `🏋️ Just crushed a workout!\n\n` +
        `⏱️ Duration: ${summary.duration}\n` +
        `💪 Exercises: ${summary.exercisesCompleted}\n` +
        `📊 Volume: ${summary.totalVolume.toLocaleString()} lbs\n` +
        (summary.prsHit.length > 0 ? `🏆 PRs Hit: ${summary.prsHit.length}\n` : '') +
        `\n#HLTHY #Fitness`;
      
      await Share.share({ message });
    } catch (e) {
      console.error('Error sharing:', e);
    }
  };
  
  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(tabs)');
  };
  
  const prBounceTransform = prBounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });
  
  if (!summary) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading summary...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Confetti */}
      {showConfetti && (
        <ConfettiCannon
          ref={confettiRef}
          count={200}
          origin={{ x: -10, y: 0 }}
          autoStart={true}
          fadeOut={true}
          explosionSpeed={350}
          fallSpeed={3000}
        />
      )}
      
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View 
            style={[
              styles.header,
              { 
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            <View style={styles.checkmarkContainer}>
              <LinearGradient
                colors={['#4CAF50', '#388E3C']}
                style={styles.checkmarkGradient}
              >
                <Ionicons name="checkmark" size={48} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Workout Complete!</Text>
            <Text style={styles.subtitle}>{summary.duration} • Great job!</Text>
          </Animated.View>
          
          {/* PRs Section */}
          {summary.prsHit && summary.prsHit.length > 0 && (
            <Animated.View 
              style={[
                styles.prSection,
                { transform: [{ scale: prBounceTransform }] }
              ]}
            >
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 193, 7, 0.1)']}
                style={styles.prGradient}
              >
                <View style={styles.prHeader}>
                  <Ionicons name="trophy" size={24} color="#FFD700" />
                  <Text style={styles.prTitle}>
                    {summary.prsHit.length} Personal Record{summary.prsHit.length > 1 ? 's' : ''}!
                  </Text>
                </View>
                
                {summary.prsHit.map((pr, index) => (
                  <View key={index} style={styles.prItem}>
                    <Text style={styles.prExercise}>{pr.exerciseName}</Text>
                    <Text style={styles.prValue}>
                      {pr.newValue} {pr.prType === 'reps' ? 'reps' : 'lbs'}
                      {pr.improvement && (
                        <Text style={styles.prImprovement}> ({pr.improvement})</Text>
                      )}
                    </Text>
                  </View>
                ))}
              </LinearGradient>
            </Animated.View>
          )}
          
          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="barbell-outline" size={24} color="#8B7DFF" />
              <Text style={styles.statValue}>{summary.totalVolume.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Volume (lbs)</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="layers-outline" size={24} color="#8B7DFF" />
              <Text style={styles.statValue}>{summary.totalSets}</Text>
              <Text style={styles.statLabel}>Total Sets</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="repeat-outline" size={24} color="#8B7DFF" />
              <Text style={styles.statValue}>{summary.totalReps}</Text>
              <Text style={styles.statLabel}>Total Reps</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="fitness-outline" size={24} color="#8B7DFF" />
              <Text style={styles.statValue}>{summary.exercisesCompleted}</Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </View>
          </View>
          
          {/* Muscles Worked */}
          {summary.musclesWorked && summary.musclesWorked.length > 0 && (
            <View style={styles.musclesSection}>
              <Text style={styles.sectionTitle}>Muscles Worked</Text>
              <View style={styles.musclesList}>
                {summary.musclesWorked.map((muscle, index) => (
                  <View key={index} style={styles.muscleBadge}>
                    <Text style={styles.muscleText}>{muscle}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {/* Mood Selection */}
          <View style={styles.moodSection}>
            <Text style={styles.sectionTitle}>How do you feel?</Text>
            <View style={styles.moodOptions}>
              {MOOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.moodButton,
                    selectedMood === option.value && styles.moodButtonSelected,
                  ]}
                  onPress={() => handleMoodSelect(option.value)}
                >
                  <Text style={styles.moodEmoji}>{option.emoji}</Text>
                  <Text style={[
                    styles.moodLabel,
                    selectedMood === option.value && styles.moodLabelSelected,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Difficulty Slider */}
          <View style={styles.difficultySection}>
            <Text style={styles.sectionTitle}>Perceived Difficulty</Text>
            <View style={styles.difficultyRow}>
              <Text style={styles.difficultyLabel}>Easy</Text>
              <View style={styles.difficultyDots}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.difficultyDot,
                      value <= difficulty && styles.difficultyDotActive,
                      value <= 3 && styles.difficultyDotEasy,
                      value >= 4 && value <= 7 && styles.difficultyDotMedium,
                      value >= 8 && styles.difficultyDotHard,
                    ]}
                    onPress={() => handleDifficultyChange(value)}
                  />
                ))}
              </View>
              <Text style={styles.difficultyLabel}>Hard</Text>
            </View>
            <Text style={styles.difficultyValue}>{difficulty}/10</Text>
          </View>
          
          {/* AI Insight */}
          {summary.aiInsight && (
            <View style={styles.aiInsightSection}>
              <LinearGradient
                colors={['rgba(139, 125, 255, 0.15)', 'rgba(139, 125, 255, 0.05)']}
                style={styles.aiInsightGradient}
              >
                <Ionicons name="sparkles" size={20} color="#8B7DFF" />
                <Text style={styles.aiInsightText}>{summary.aiInsight}</Text>
              </LinearGradient>
            </View>
          )}
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={20} color="#8B7DFF" />
              <Text style={styles.shareText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.doneButton}
              onPress={handleDone}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#8B7DFF', '#6B5DD3']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.doneGradient}
              >
                <Text style={styles.doneText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          <View style={styles.bottomPadding} />
        </ScrollView>
      </SafeAreaView>
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
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  checkmarkContainer: {
    marginBottom: 16,
  },
  checkmarkGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  prSection: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  prGradient: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  prTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '700',
  },
  prItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
  },
  prExercise: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  prValue: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  prImprovement: {
    color: '#4CAF50',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  musclesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  musclesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleBadge: {
    backgroundColor: 'rgba(139, 125, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  muscleText: {
    color: '#8B7DFF',
    fontSize: 13,
    fontWeight: '500',
  },
  moodSection: {
    marginBottom: 24,
  },
  moodOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minWidth: 60,
  },
  moodButtonSelected: {
    backgroundColor: 'rgba(139, 125, 255, 0.2)',
    borderColor: 'rgba(139, 125, 255, 0.5)',
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '500',
  },
  moodLabelSelected: {
    color: '#8B7DFF',
  },
  difficultySection: {
    marginBottom: 24,
  },
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  difficultyLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    width: 40,
  },
  difficultyDots: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  difficultyDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  difficultyDotActive: {
    borderColor: 'transparent',
  },
  difficultyDotEasy: {
    backgroundColor: '#4CAF50',
  },
  difficultyDotMedium: {
    backgroundColor: '#FFA726',
  },
  difficultyDotHard: {
    backgroundColor: '#FF6B6B',
  },
  difficultyValue: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  aiInsightSection: {
    marginBottom: 24,
  },
  aiInsightGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  aiInsightText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 125, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 125, 255, 0.3)',
    gap: 8,
  },
  shareText: {
    color: '#8B7DFF',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  doneGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 40,
  },
});
