/**
 * WorkoutPlanCard - Displays workout plans matching the ViewWorkout screen style
 * Now with interactive editing: long-press menu for delete/edit, tap to edit inline
 */
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, TextInput, Modal, ScrollView, StyleSheet, Animated, LayoutAnimation, Platform, UIManager, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { WorkoutSaveModal } from '../modals/WorkoutSaveModal';
import { WorkoutPlanData } from '@/utils/aiMessage';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface WorkoutPlanCardProps {
  data: WorkoutPlanData;
  intent?: string;
  onSave?: (data: WorkoutPlanData) => void;
  onAddToWorkouts?: (data: WorkoutPlanData) => void;
  onExplain?: () => void;
  onShare?: () => void;
  onEdit?: (workout: WorkoutPlanData) => void;
  onSwipeActiveChange?: (isActive: boolean) => void;
}

interface Exercise {
  exerciseId?: string;
  exerciseName?: string;
  name?: string;  // Backend sometimes uses 'name' instead of 'exerciseName'
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
  onSwipeActiveChange,
}) => {
  const { currentUser } = useAuth();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingExercise, setEditingExercise] = useState<EditingExercise | null>(null);
  const [localWorkoutData, setLocalWorkoutData] = useState<WorkoutPlanData>(data);
  const [reorderMode, setReorderMode] = useState(false);
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  
  // Notify parent when swipe state changes
  const updateSwipeActive = (active: boolean) => {
    setIsSwipeActive(active);
    onSwipeActiveChange?.(active);
  };
  
  // Store animated values for swipe gestures - one per exercise
  const swipeAnimations = useRef<Map<string, Animated.Value>>(new Map()).current;

  // Helper to get exercise name (handles both 'name' and 'exerciseName' fields)
  const getExerciseName = (exercise: any): string => {
    return exercise.exerciseName || exercise.name || 'Unknown Exercise';
  };

  // Helper to set exercise name (updates both fields for compatibility)
  const setExerciseName = (exercise: any, newName: string): any => {
    return {
      ...exercise,
      exerciseName: newName,
      name: newName,  // Keep both for compatibility
    };
  };

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

  // Move exercise up/down with smooth animation
  const handleMoveExercise = (segmentIndex: number, exerciseIndex: number, direction: 'up' | 'down') => {
    const segment = localWorkoutData.segments[segmentIndex];
    const targetIndex = direction === 'up' ? exerciseIndex - 1 : exerciseIndex + 1;
    
    // Validate move
    if (targetIndex < 0 || targetIndex >= segment.exercises.length) {
      return;
    }

    // Use spring animation preset for smooth, natural movement
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    // Swap the data - LayoutAnimation will handle the smooth transition
    const newData = { ...localWorkoutData };
    const temp = newData.segments[segmentIndex].exercises[exerciseIndex];
    newData.segments[segmentIndex].exercises[exerciseIndex] = newData.segments[segmentIndex].exercises[targetIndex];
    newData.segments[segmentIndex].exercises[targetIndex] = temp;
    
    setLocalWorkoutData(newData);
  };  const handleMenuAction = (action: string) => {
    switch (action) {
      case 'save':
        onSave?.(normalizeWorkoutData(localWorkoutData));
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

  // Normalize workout data to ensure both 'name' and 'exerciseName' fields exist
  const normalizeWorkoutData = (workout: WorkoutPlanData): WorkoutPlanData => {
    return {
      ...workout,
      segments: workout.segments.map(segment => ({
        ...segment,
        exercises: segment.exercises.map(exercise => {
          const name = getExerciseName(exercise);
          return {
            ...exercise,
            name: name,
            exerciseName: name,
          };
        }),
      })),
    };
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
            {segment.exercises.map((exercise, exerciseIndex) => {
              // Create a stable unique key based on exercise content, not index
              const exerciseKey = `${segmentIndex}-${getExerciseName(exercise)}-${exercise.sets}-${exercise.reps}-${exerciseIndex}`;
              
              // Get or create animated value for this exercise
              if (!swipeAnimations.has(exerciseKey)) {
                swipeAnimations.set(exerciseKey, new Animated.Value(0));
              }
              const translateX = swipeAnimations.get(exerciseKey)!;
              
              // Create PanResponder for swipe gestures
              const panResponder = PanResponder.create({
                onStartShouldSetPanResponder: () => false, // Don't capture on initial touch
                onStartShouldSetPanResponderCapture: () => false,
                onMoveShouldSetPanResponder: (_, gestureState) => {
                  // Only capture if it's a clear horizontal swipe (more horizontal than vertical)
                  const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
                  if (isHorizontal) {
                    updateSwipeActive(true);
                  }
                  return isHorizontal;
                },
                onMoveShouldSetPanResponderCapture: (_, gestureState) => {
                  // Only capture if it's a clear horizontal swipe
                  const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
                  return isHorizontal;
                },
                onPanResponderGrant: () => {
                  // Locked - ScrollView cannot scroll now
                  updateSwipeActive(true);
                },
                onPanResponderMove: (_, gestureState) => {
                  // ONLY track horizontal movement (left swipes only)
                  if (gestureState.dx <= 0) {
                    translateX.setValue(gestureState.dx);
                  }
                },
                onPanResponderRelease: (_, gestureState) => {
                  // UNLOCK: Release the lock when finger is lifted
                  updateSwipeActive(false);
                  
                  // Only look at horizontal distance
                  if (gestureState.dx < -80) {
                    Animated.timing(translateX, {
                      toValue: -500,
                      duration: 250,
                      useNativeDriver: true,
                    }).start(() => {
                      handleDeleteExercise(segmentIndex, exerciseIndex);
                      translateX.setValue(0);
                    });
                  } else {
                    // Spring back to original position with bounce
                    Animated.spring(translateX, {
                      toValue: 0,
                      useNativeDriver: true,
                      tension: 65,
                      friction: 7,
                    }).start();
                  }
                },
                onPanResponderTerminate: () => {
                  // UNLOCK: Release if gesture is cancelled
                  updateSwipeActive(false);
                  
                  // Spring back
                  Animated.spring(translateX, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 7,
                  }).start();
                },
                onShouldBlockNativeResponder: () => true,
              });
              
              // Scale animation for trash icon (small when barely swiping, large when fully swiped)
              const trashIconScale = translateX.interpolate({
                inputRange: [-80, -20, 0],
                outputRange: [1.2, 0.5, 0.3],
                extrapolate: 'clamp',
              });
              
              return (
                <View 
                  key={exerciseKey}
                  style={{ 
                    marginBottom: 4, 
                    overflow: 'hidden',
                    position: 'relative',
                    backgroundColor: '#ff3b30', // Red background behind the card (like Gmail)
                  }}
                >
                  {/* Trash Icon - positioned on the red background */}
                  <Animated.View 
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      right: 20,
                      top: 0,
                      bottom: 0,
                      justifyContent: 'center',
                      alignItems: 'center',
                      transform: [{ scale: trashIconScale }],
                    }}
                  >
                    <Ionicons name="trash" size={24} color="#ffffff" />
                  </Animated.View>

                  {/* Swipeable exercise content */}
                  <Animated.View 
                    {...panResponder.panHandlers}
                    style={{
                      transform: [{ translateX }],
                      backgroundColor: '#1e1e1e',
                    }}
                  >
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
                        {getExerciseName(exercise)}
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

                    {/* Action Buttons - Stacked Vertically */}
                    <View style={{ flexDirection: 'column', gap: 4 }}>
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
                    </View>
                  </View>

                  {/* Divider between exercises - INSIDE Animated.View so it moves with the card */}
                  {exerciseIndex < segment.exercises.length - 1 && (
                    <View style={{
                      height: 1,
                      backgroundColor: '#2a2a2a',
                      marginVertical: 4,
                    }} />
                  )}
                </Animated.View>
              </View>
            );
            })}
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
          workoutData={normalizeWorkoutData(localWorkoutData)}
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
                    value={getExerciseName(editingExercise.exercise)}
                    onChangeText={(text) =>
                      setEditingExercise({
                        ...editingExercise,
                        exercise: setExerciseName(editingExercise.exercise, text),
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
