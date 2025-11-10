/**
 * WorkoutPlanCard - Displays workout plans matching the ViewWorkout screen style
 * Now with interactive editing: long-press menu for delete/edit, tap to edit inline
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, TextInput, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { WorkoutSaveModal } from '../modals/WorkoutSaveModal';
import { WorkoutPlanData } from '@/utils/aiMessage';

interface WorkoutPlanCardProps {
  data: WorkoutPlanData;
  intent?: string;
  onSave?: (data: WorkoutPlanData) => void;
  onAddToWorkouts?: (data: WorkoutPlanData) => void;
  onExplain?: () => void;
  onShare?: () => void;
  onEdit?: (workout: WorkoutPlanData) => void;
}

interface Exercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: number | string;
  load?: string;
  restSec?: number;
  notes?: string;
  safetyRating?: 'low' | 'medium' | 'high';
  equipmentNeeded?: string[];
}

interface EditingExercise {
  segmentIndex: number;
  exerciseIndex: number;
  exercise: Exercise;
}

export const WorkoutPlanCard: React.FC<WorkoutPlanCardProps> = ({
  data,
  intent,
  onSave,
  onAddToWorkouts,
  onExplain,
  onShare,
  onEdit,
}) => {
  const { currentUser } = useAuth();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<EditingExercise | null>(null);
  const [localWorkoutData, setLocalWorkoutData] = useState<WorkoutPlanData>(data);
  const [reorderMode, setReorderMode] = useState(false);

  // Helper functions
  const calculateTotalExercises = () => {
    return localWorkoutData.segments.reduce((total, segment) => total + segment.exercises.length, 0);
  };

  const calculateTotalDuration = () => {
    const totalExercises = calculateTotalExercises();
    return `${totalExercises * 5} minutes`;
  };

  // Delete exercise
  const handleDeleteExercise = (segmentIndex: number, exerciseIndex: number) => {
    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to remove this exercise?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const newData = { ...localWorkoutData };
            newData.segments[segmentIndex].exercises.splice(exerciseIndex, 1);
            setLocalWorkoutData(newData);
          },
        },
      ]
    );
  };

  // Open edit modal
  const handleEditExercise = (segmentIndex: number, exerciseIndex: number) => {
    const exercise = localWorkoutData.segments[segmentIndex].exercises[exerciseIndex];
    setEditingExercise({ segmentIndex, exerciseIndex, exercise: { ...exercise } });
  };

  // Save edited exercise
  const handleSaveEdit = () => {
    if (!editingExercise) return;
    
    const newData = { ...localWorkoutData };
    newData.segments[editingExercise.segmentIndex].exercises[editingExercise.exerciseIndex] = editingExercise.exercise;
    setLocalWorkoutData(newData);
    setEditingExercise(null);
  };

  // Move exercise up/down
  const handleMoveExercise = (segmentIndex: number, exerciseIndex: number, direction: 'up' | 'down') => {
    const newData = { ...localWorkoutData };
    const exercises = newData.segments[segmentIndex].exercises;
    const newIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;
    
    if (newIndex < 0 || newIndex >= exercises.length) return;
    
    const temp = exercises[exerciseIndex];
    exercises[exerciseIndex] = exercises[newIndex];
    exercises[newIndex] = temp;
    
    setLocalWorkoutData(newData);
  };

  const handleMenuAction = (action: string) => {
    switch (action) {
      case 'save':
        onSave?.(data);
        break;
      case 'add_to_workouts':
        if (!currentUser) {
          Alert.alert('Login Required', 'Please log in to save workouts.');
          return;
        }
        setShowSaveModal(true);
        break;
      case 'explain':
        onExplain?.();
        break;
      case 'share':
        onShare?.();
        break;
    }
  };

  return (
    <View style={{ marginVertical: 8 }}>
      {/* Workout Info Header */}
      <View style={{
        alignItems: 'center',
        paddingHorizontal: 15,
        marginBottom: 20,
      }}>
        <Text style={{
          color: '#ffffff',
          fontSize: 24,
          fontWeight: 'bold',
          textAlign: 'center',
        }}>
          {data.dayType} Workout
        </Text>
        <Text style={{
          color: '#888888',
          fontSize: 14,
          marginTop: 7,
          textAlign: 'center',
        }}>
          {calculateTotalExercises()} exercises  {calculateTotalDuration()}
        </Text>
      </View>

      {/* Segments */}
      {localWorkoutData.segments.map((segment, segmentIndex) => (
        <View key={segmentIndex} style={{
          marginBottom: 25,
          marginHorizontal: 20,
        }}>
          {/* Segment Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
            paddingHorizontal: 5,
          }}>
            <Text style={{
              color: '#ffffff',
              fontSize: 19,
              fontWeight: 'bold',
              textShadowColor: 'rgba(0, 0, 0, 0.75)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}>
              {segment.name}
            </Text>
            <View style={{
              backgroundColor: 'rgba(80, 80, 80, 0.2)',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 12,
            }}>
              <Text style={{
                color: '#b0b0b0',
                fontSize: 14,
                fontWeight: '500',
              }}>
                {segment.exercises.length} exercises
              </Text>
            </View>
          </View>

          {/* Segment Card with Exercises */}
          <View style={{
            backgroundColor: '#1e1e1e',
            borderRadius: 18,
            paddingVertical: 12,
            paddingHorizontal: 18,
            borderWidth: 1,
            borderColor: '#2a2a2a',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}>
            {segment.exercises.map((exercise, exerciseIndex) => (
              <View key={exerciseIndex} style={{ marginBottom: 4 }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                }}>
                  {/* Exercise Number Circle */}
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: '#ff2d55',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 15,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 3,
                  }}>
                    <Text style={{
                      fontSize: 16,
                      color: '#ffffff',
                      fontWeight: 'bold',
                    }}>
                      {exerciseIndex + 1}
                    </Text>
                  </View>

                  {/* Exercise Details */}
                  <TouchableOpacity 
                    style={{ flex: 1 }}
                    onPress={() => handleEditExercise(segmentIndex, exerciseIndex)}
                  >
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#ffffff',
                      marginBottom: 4,
                    }}>
                      {exercise.exerciseName}
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      color: '#b0b0b0',
                    }}>
                      {exercise.sets} sets × {exercise.reps} reps
                    </Text>
                    {exercise.notes && (
                      <Text style={{
                        fontSize: 13,
                        color: '#888888',
                        marginTop: 4,
                        fontStyle: 'italic',
                      }}>
                        {exercise.notes}
                      </Text>
                    )}
                  </TouchableOpacity>

                  {/* Action Buttons */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {/* Move Up */}
                    {exerciseIndex > 0 && (
                      <TouchableOpacity
                        onPress={() => handleMoveExercise(segmentIndex, exerciseIndex, 'up')}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: '#2a2a2a',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="chevron-up" size={18} color="#888888" />
                      </TouchableOpacity>
                    )}

                    {/* Move Down */}
                    {exerciseIndex < segment.exercises.length - 1 && (
                      <TouchableOpacity
                        onPress={() => handleMoveExercise(segmentIndex, exerciseIndex, 'down')}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 16,
                          backgroundColor: '#2a2a2a',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Ionicons name="chevron-down" size={18} color="#888888" />
                      </TouchableOpacity>
                    )}

                    {/* Delete */}
                    <TouchableOpacity
                      onPress={() => handleDeleteExercise(segmentIndex, exerciseIndex)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: 'rgba(255, 45, 85, 0.2)',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ff2d55" />
                    </TouchableOpacity>
                  </View>
                </View>
                {/* Divider between exercises */}
                {exerciseIndex < segment.exercises.length - 1 && (
                  <View style={{
                    height: 1,
                    backgroundColor: '#2a2a2a',
                    marginVertical: 4,
                  }} />
                )}
              </View>
            ))}
          </View>
        </View>
      ))}

      {/* Action Buttons */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 20,
      }}>
        {currentUser && (
          <TouchableOpacity
            onPress={() => handleMenuAction('add_to_workouts')}
            style={{
              flex: 1,
              backgroundColor: '#ff2d55',
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
              marginRight: 10,
              shadowColor: '#ff2d55',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="bookmark-outline" size={20} color="white" />
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontWeight: 'bold',
                marginLeft: 8,
              }}>
                Save
              </Text>
            </View>
          </TouchableOpacity>
        )}
        
        {onEdit && (
          <TouchableOpacity
            onPress={() => onEdit(data)}
            style={{
              flex: 1,
              backgroundColor: '#2a2a2a',
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#3a3a3a',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="create-outline" size={20} color="white" />
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontWeight: 'bold',
                marginLeft: 8,
              }}>
                Edit
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Safety Notes */}
      {data.safetyNotes && (
        <View style={{
          marginHorizontal: 20,
          marginBottom: 20,
          backgroundColor: 'rgba(255, 45, 85, 0.1)',
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: 'rgba(255, 45, 85, 0.3)',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="warning-outline" size={20} color="#ff2d55" />
            <Text style={{
              color: '#ff2d55',
              fontSize: 16,
              fontWeight: 'bold',
              marginLeft: 8,
            }}>
              Safety Notes
            </Text>
          </View>
          <Text style={{
            color: '#cccccc',
            fontSize: 14,
            lineHeight: 20,
          }}>
            {data.safetyNotes}
          </Text>
        </View>
      )}

      {/* Save Modal */}
      {showSaveModal && currentUser && (
        <WorkoutSaveModal
          visible={showSaveModal}
          workoutData={localWorkoutData}
          userId={currentUser.uid}
          username={currentUser.displayName || currentUser.email || 'User'}
          onClose={() => setShowSaveModal(false)}
          onSuccess={(workoutId) => {
            setShowSaveModal(false);
            Alert.alert('Success', 'Workout saved to your library!');
          }}
        />
      )}

      {/* Exercise Edit Modal */}
      {editingExercise && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEditingExercise(null)}
        >
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <View style={{
              backgroundColor: '#1e1e1e',
              borderRadius: 20,
              padding: 20,
              width: '90%',
              maxHeight: '80%',
              borderWidth: 1,
              borderColor: '#2a2a2a',
            }}>
              <ScrollView>
                {/* Modal Header */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 20,
                }}>
                  <Text style={{
                    color: '#ffffff',
                    fontSize: 20,
                    fontWeight: 'bold',
                  }}>
                    Edit Exercise
                  </Text>
                  <TouchableOpacity onPress={() => setEditingExercise(null)}>
                    <Ionicons name="close" size={28} color="#888888" />
                  </TouchableOpacity>
                </View>

                {/* Exercise Name */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.label}>Exercise Name</Text>
                  <TextInput
                    style={styles.input}
                    value={editingExercise.exercise.exerciseName}
                    onChangeText={(text) =>
                      setEditingExercise({
                        ...editingExercise,
                        exercise: { ...editingExercise.exercise, exerciseName: text },
                      })
                    }
                    placeholderTextColor="#666666"
                  />
                </View>

                {/* Sets and Reps Row */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Sets</Text>
                    <TextInput
                      style={styles.input}
                      value={String(editingExercise.exercise.sets)}
                      onChangeText={(text) =>
                        setEditingExercise({
                          ...editingExercise,
                          exercise: {
                            ...editingExercise.exercise,
                            sets: parseInt(text) || 0,
                          },
                        })
                      }
                      keyboardType="numeric"
                      placeholderTextColor="#666666"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Reps</Text>
                    <TextInput
                      style={styles.input}
                      value={String(editingExercise.exercise.reps)}
                      onChangeText={(text) =>
                        setEditingExercise({
                          ...editingExercise,
                          exercise: {
                            ...editingExercise.exercise,
                            reps: text,
                          },
                        })
                      }
                      placeholderTextColor="#666666"
                    />
                  </View>
                </View>

                {/* Load */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.label}>Load (optional)</Text>
                  <TextInput
                    style={styles.input}
                    value={editingExercise.exercise.load || ''}
                    onChangeText={(text) =>
                      setEditingExercise({
                        ...editingExercise,
                        exercise: { ...editingExercise.exercise, load: text },
                      })
                    }
                    placeholder="e.g., 135 lbs, bodyweight"
                    placeholderTextColor="#666666"
                  />
                </View>

                {/* Rest Time */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.label}>Rest Time (seconds)</Text>
                  <TextInput
                    style={styles.input}
                    value={String(editingExercise.exercise.restSec || '')}
                    onChangeText={(text) =>
                      setEditingExercise({
                        ...editingExercise,
                        exercise: {
                          ...editingExercise.exercise,
                          restSec: parseInt(text) || undefined,
                        },
                      })
                    }
                    keyboardType="numeric"
                    placeholder="e.g., 90"
                    placeholderTextColor="#666666"
                  />
                </View>

                {/* Notes */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={styles.label}>Notes (optional)</Text>
                  <TextInput
                    style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                    value={editingExercise.exercise.notes || ''}
                    onChangeText={(text) =>
                      setEditingExercise({
                        ...editingExercise,
                        exercise: { ...editingExercise.exercise, notes: text },
                      })
                    }
                    placeholder="Add any special instructions..."
                    placeholderTextColor="#666666"
                    multiline
                  />
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => setEditingExercise(null)}
                    style={{
                      flex: 1,
                      backgroundColor: '#2a2a2a',
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#3a3a3a',
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    style={{
                      flex: 1,
                      backgroundColor: '#ff2d55',
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold' }}>
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    color: '#b0b0b0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderRadius: 10,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
  },
});
