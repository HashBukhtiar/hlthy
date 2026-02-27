import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCoverImageSource } from '@/utils/imageUtils';

interface WorkoutListItemProps {
  workout: any;
  onPress: (workoutId: number) => void;
  isOwnProfile: boolean;
}

export const WorkoutListItem: React.FC<WorkoutListItemProps> = ({ workout, onPress, isOwnProfile }) => {
  let formattedDate = "Date N/A";
  try {
    if (workout.createdAt) {
      const workoutDate = workout.createdAt?.toDate ? workout.createdAt.toDate() : new Date(workout.createdAt);
      formattedDate = workoutDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  } catch (error) { 
    formattedDate = "Invalid Date"; 
  }

  return (
    <TouchableOpacity 
      onPress={() => onPress(workout.id)} 
      style={styles.workoutListItemRowStyle}
      activeOpacity={0.85}
    >
      <Image
        source={getCoverImageSource(workout.thumbnailUrl, workout.coverImageUrl)}
        style={styles.workoutListItemImageStyle}
      />
      <View style={styles.workoutListItemTextContainerStyle}>
        <Text style={styles.workoutListItemTitleStyle} numberOfLines={2}>
          {workout.title || 'Unnamed Workout'}
        </Text>
        <Text style={styles.workoutListItemMetaStyle}>{formattedDate}</Text>
        <Text style={styles.workoutListItemMetaStyle}>
          {workout.savedCount || 0} saves
        </Text>
      </View>
      {workout.isPublic !== true && isOwnProfile && (
        <Ionicons name="lock-closed" size={24} color="#888" />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  workoutListItemRowStyle: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  workoutListItemImageStyle: {
    width: 72,
    height: 72,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: '#2C2C2E',
  },
  workoutListItemTextContainerStyle: {
    flex: 1,
    justifyContent: 'center',
  },
  workoutListItemTitleStyle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  workoutListItemMetaStyle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginBottom: 2,
  },
});
