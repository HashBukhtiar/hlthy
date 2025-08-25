import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Exercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number | string;
  load?: string;
  restSec: number;
  notes?: string;
  safetyRating?: string;
  equipmentNeeded?: string[];
}

interface WorkoutSegment {
  name: string;
  exercises: Exercise[];
}

interface WorkoutPlan {
  dayType: string;
  segments: WorkoutSegment[];
  safetyNotes?: string;
  duration?: string;
  difficulty?: string;
}

interface WorkoutRendererProps {
  workoutData: WorkoutPlan;
  onSaveWorkout?: () => void;
  onShareWorkout?: () => void;
}

export const WorkoutRenderer: React.FC<WorkoutRendererProps> = ({ 
  workoutData, 
  onSaveWorkout,
  onShareWorkout 
}) => {
  const getRepsDisplay = (reps: number | string): string => {
    if (typeof reps === 'string') return reps;
    return reps.toString();
  };

  const getRestDisplay = (restSec: number): string => {
    if (restSec >= 60) {
      const mins = Math.floor(restSec / 60);
      const secs = restSec % 60;
      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    }
    return `${restSec}s`;
  };

  const getSafetyColor = (rating?: string): string => {
    switch (rating?.toLowerCase()) {
      case 'low': return '#4CD964';
      case 'medium': return '#FF9500';
      case 'high': return '#FF3B30';
      default: return '#4CD964';
    }
  };

  const getSafetyIcon = (rating?: string): string => {
    switch (rating?.toLowerCase()) {
      case 'low': return 'shield-checkmark';
      case 'medium': return 'shield-half';
      case 'high': return 'shield-outline';
      default: return 'shield-checkmark';
    }
  };

  return (
    <View style={styles.workoutContainer}>
      {/* Workout Header */}
      <View style={styles.workoutHeader}>
        <View style={styles.workoutTitleRow}>
          <Text style={styles.workoutTitle}>{workoutData.dayType} Workout</Text>
          <View style={styles.workoutActions}>
            {onSaveWorkout && (
              <TouchableOpacity style={styles.actionButton} onPress={onSaveWorkout}>
                <Ionicons name="bookmark-outline" size={20} color="#4CD964" />
              </TouchableOpacity>
            )}
            {onShareWorkout && (
              <TouchableOpacity style={styles.actionButton} onPress={onShareWorkout}>
                <Ionicons name="share-outline" size={20} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {(workoutData.duration || workoutData.difficulty) && (
          <View style={styles.workoutMeta}>
            {workoutData.duration && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color="#888" />
                <Text style={styles.metaText}>{workoutData.duration}</Text>
              </View>
            )}
            {workoutData.difficulty && (
              <View style={styles.metaItem}>
                <Ionicons name="fitness-outline" size={14} color="#888" />
                <Text style={styles.metaText}>{workoutData.difficulty}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <ScrollView style={styles.workoutContent} showsVerticalScrollIndicator={false}>
        {/* Workout Segments */}
        {workoutData.segments.map((segment, segmentIndex) => (
          <View key={segmentIndex} style={styles.segment}>
            <View style={styles.segmentHeader}>
              <Text style={styles.segmentTitle}>{segment.name}</Text>
              <View style={styles.segmentBadge}>
                <Text style={styles.segmentBadgeText}>{segment.exercises.length} exercises</Text>
              </View>
            </View>

            {segment.exercises.map((exercise, exerciseIndex) => (
              <View key={exerciseIndex} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                    <View style={styles.exerciseDetailsRow}>
                      <View style={styles.exerciseDetail}>
                        <Ionicons name="repeat" size={14} color="#888" />
                        <Text style={styles.exerciseDetailText}>
                          {exercise.sets} × {getRepsDisplay(exercise.reps)}
                        </Text>
                      </View>
                      {exercise.load && (
                        <View style={styles.exerciseDetail}>
                          <Ionicons name="barbell" size={14} color="#888" />
                          <Text style={styles.exerciseDetailText}>{exercise.load}</Text>
                        </View>
                      )}
                      <View style={styles.exerciseDetail}>
                        <Ionicons name="timer" size={14} color="#888" />
                        <Text style={styles.exerciseDetailText}>{getRestDisplay(exercise.restSec)}</Text>
                      </View>
                    </View>
                  </View>
                  
                  {exercise.safetyRating && (
                    <View style={[styles.safetyBadge, { borderColor: getSafetyColor(exercise.safetyRating) }]}>
                      <Ionicons 
                        name={getSafetyIcon(exercise.safetyRating) as any}
                        size={12} 
                        color={getSafetyColor(exercise.safetyRating)} 
                      />
                      <Text style={[styles.safetyText, { color: getSafetyColor(exercise.safetyRating) }]}>
                        {exercise.safetyRating?.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>

                {exercise.notes && (
                  <View style={styles.exerciseNotes}>
                    <Ionicons name="information-circle-outline" size={14} color="#666" />
                    <Text style={styles.notesText}>{exercise.notes}</Text>
                  </View>
                )}

                {exercise.equipmentNeeded && exercise.equipmentNeeded.length > 0 && (
                  <View style={styles.equipmentRow}>
                    <Ionicons name="hardware-chip-outline" size={14} color="#666" />
                    <Text style={styles.equipmentText}>
                      {exercise.equipmentNeeded.join(', ')}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}

        {/* Safety Notes */}
        {workoutData.safetyNotes && (
          <View style={styles.safetyNotesContainer}>
            <View style={styles.safetyNotesHeader}>
              <Ionicons name="shield-checkmark" size={16} color="#FF9500" />
              <Text style={styles.safetyNotesTitle}>Safety Notes</Text>
            </View>
            <Text style={styles.safetyNotesText}>{workoutData.safetyNotes}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  workoutContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
    overflow: 'hidden',
    maxWidth: '100%',
  },
  workoutHeader: {
    backgroundColor: '#2A2A2A',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  workoutTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  workoutActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  workoutMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#888',
    fontSize: 14,
  },
  workoutContent: {
    // Removed maxHeight to allow full workout display
  },
  segment: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  segmentTitle: {
    color: '#4CD964',
    fontSize: 16,
    fontWeight: '600',
  },
  segmentBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  segmentBadgeText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  exerciseCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CD964',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  exerciseDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  exerciseDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseDetailText: {
    color: '#CCC',
    fontSize: 14,
    fontWeight: '500',
  },
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(76, 217, 100, 0.1)',
  },
  safetyText: {
    fontSize: 10,
    fontWeight: '600',
  },
  exerciseNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 6,
  },
  notesText: {
    color: '#CCC',
    fontSize: 14,
    fontStyle: 'italic',
    flex: 1,
  },
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  equipmentText: {
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
  },
  safetyNotesContainer: {
    margin: 16,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  safetyNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  safetyNotesTitle: {
    color: '#FF9500',
    fontSize: 14,
    fontWeight: '600',
  },
  safetyNotesText: {
    color: '#CCC',
    fontSize: 14,
    lineHeight: 20,
  },
});
