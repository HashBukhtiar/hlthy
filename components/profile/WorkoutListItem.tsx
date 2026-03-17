import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

  const segmentsCount = Array.isArray(workout.segments) ? workout.segments.length : 0;
  const exercisesCount = Array.isArray(workout.segments)
    ? workout.segments.reduce((count: number, segment: any) => count + (Array.isArray(segment?.exercises) ? segment.exercises.length : 0), 0)
    : 0;

  const estimatedMinutes = Array.isArray(workout.segments)
    ? workout.segments.reduce((total: number, segment: any) => {
        const value = Number.parseInt(segment?.length, 10);
        return Number.isFinite(value) ? total + value : total;
      }, 0)
    : 0;

  const visibilityText = workout.visibility === 'followers'
    ? 'Followers'
    : workout.isPublic
      ? 'Public'
      : 'Private';

  const visibilityIcon = workout.visibility === 'followers'
    ? 'people-outline'
    : workout.isPublic
      ? 'earth-outline'
      : 'lock-closed-outline';

  return (
    <TouchableOpacity 
      onPress={() => onPress(workout.id)} 
      style={styles.workoutListItemRowStyle}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.015)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.workoutListItemImageWrap}>
          <Image
            source={getCoverImageSource(workout.thumbnailUrl, workout.coverImageUrl)}
            style={styles.workoutListItemImageStyle}
          />
          <View style={styles.visibilityBadge}>
            <Ionicons name={visibilityIcon} size={11} color="rgba(255,255,255,0.92)" style={styles.visibilityBadgeIcon} />
            <Text style={styles.visibilityBadgeText}>{visibilityText}</Text>
          </View>
        </View>

        <View style={styles.workoutListItemTextContainerStyle}>
          <Text style={styles.workoutListItemTitleStyle} numberOfLines={2}>
            {workout.title || 'Unnamed Workout'}
          </Text>
          <Text style={styles.workoutListItemDescriptionStyle} numberOfLines={2}>
            {workout.description || 'Tap to view details and start this workout.'}
          </Text>

          <View style={styles.metaChipsRow}>
            <View style={styles.metaChip}>
              <Ionicons name="barbell-outline" size={12} color="rgba(255,255,255,0.72)" style={styles.metaChipIcon} />
              <Text style={styles.metaChipText}>{exercisesCount} exercises</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="albums-outline" size={12} color="rgba(255,255,255,0.72)" style={styles.metaChipIcon} />
              <Text style={styles.metaChipText}>{segmentsCount} segments</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="bookmark-outline" size={12} color="rgba(255,255,255,0.72)" style={styles.metaChipIcon} />
              <Text style={styles.metaChipText}>{workout.savedCount || 0} saves</Text>
            </View>
            {estimatedMinutes > 0 && (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.72)" style={styles.metaChipIcon} />
                <Text style={styles.metaChipText}>{estimatedMinutes} min</Text>
              </View>
            )}
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.workoutListItemMetaStyle}>{formattedDate}</Text>
            <View style={styles.footerAction}>
              <Text style={styles.footerActionText}>Open</Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.65)" style={styles.footerActionIcon} />
            </View>
          </View>
        </View>
      </LinearGradient>

      {workout.isPublic !== true && isOwnProfile && (
        <View style={styles.privateCornerBadge}>
          <Ionicons name="lock-closed" size={14} color="rgba(255,255,255,0.88)" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  workoutListItemRowStyle: {
    flexDirection: 'row',
    borderRadius: 18,
    marginBottom: 12,
    alignItems: 'stretch',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#141416',
    position: 'relative',
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 12,
    flex: 1,
    width: '100%',
  },
  workoutListItemImageWrap: {
    position: 'relative',
    marginRight: 12,
  },
  workoutListItemImageStyle: {
    width: 92,
    height: 92,
    borderRadius: 14,
    backgroundColor: '#2C2C2E',
  },
  visibilityBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.58)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  visibilityBadgeIcon: {
    marginRight: 4,
  },
  visibilityBadgeText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 10,
    fontWeight: '600',
  },
  workoutListItemTextContainerStyle: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 2,
    minWidth: 0,
  },
  workoutListItemTitleStyle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  workoutListItemDescriptionStyle: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  metaChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    marginHorizontal: -3,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 3,
    marginBottom: 6,
  },
  metaChipIcon: {
    marginRight: 4,
  },
  metaChipText: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 11,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutListItemMetaStyle: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 12,
    fontWeight: '500',
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerActionIcon: {
    marginLeft: 2,
  },
  footerActionText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '600',
  },
  privateCornerBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
