/**
 * WorkoutPlanCard - Displays workout plans matching the ViewWorkout screen style
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
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

  const calculateTotalExercises = () => {
    return data.segments.reduce((total, segment) => total + segment.exercises.length, 0);
  };

  const calculateTotalDuration = () => {
    // Rough estimate: 5 min per exercise
    const totalExercises = calculateTotalExercises();
    return `${totalExercises * 5} minutes`;
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
      {data.segments.map((segment, segmentIndex) => (
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
                  <View style={{ flex: 1 }}>
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
                      {exercise.sets} sets  {exercise.reps} reps
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
      {showSaveModal && (
        <WorkoutSaveModal
          visible={showSaveModal}
          workoutData={data}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </View>
  );
};
