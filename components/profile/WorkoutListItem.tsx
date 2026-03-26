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

export const WorkoutListItem: React.FC<WorkoutListItemProps> = ({ workout, onPress }) => {
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
      activeOpacity={0.82}
    >
      <View style={styles.accentBar} />
      <LinearGradient
        colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
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
            <Ionicons name={visibilityIcon} size={10} color="rgba(255,255,255,0.92)" style={styles.visibilityBadgeIcon} />
            <Text style={styles.visibilityBadgeText}>{visibilityText}</Text>
          </View>
        </View>

        <View style={styles.workoutListItemTextContainerStyle}>
          <Text style={styles.workoutListItemTitleStyle} numberOfLines={1}>
            {workout.title || 'Unnamed Workout'}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons name="barbell-outline" size={11} color="rgba(255,255,255,0.48)" />
            <Text style={styles.metaText}>{exercisesCount}</Text>
            {estimatedMinutes > 0 && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.48)" />
                <Text style={styles.metaText}>{estimatedMinutes} min</Text>
              </>
            )}
            {(workout.savedCount || 0) > 0 && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Ionicons name="bookmark-outline" size={11} color="rgba(255,255,255,0.48)" />
                <Text style={styles.metaText}>{workout.savedCount} saves</Text>
              </>
            )}
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.workoutListItemMetaStyle}>{formattedDate}</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.25)" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  workoutListItemRowStyle: {
    flexDirection: 'row',
    borderRadius: 14,
    alignItems: 'stretch',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#141416',
  },
  accentBar: {
    width: 3,
    backgroundColor: '#FF2D55',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    flex: 1,
    width: '100%',
  },
  workoutListItemImageWrap: {
    position: 'relative',
    marginRight: 11,
  },
  workoutListItemImageStyle: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: '#2C2C2E',
  },
  visibilityBadge: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  visibilityBadgeIcon: {
    marginRight: 3,
  },
  visibilityBadgeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 9,
    fontWeight: '600',
  },
  workoutListItemTextContainerStyle: {
    flex: 1,
    justifyContent: 'center',
    gap: 5,
    minWidth: 0,
  },
  workoutListItemTitleStyle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
  },
  metaDot: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutListItemMetaStyle: {
    color: 'rgba(255,255,255,0.32)',
    fontSize: 11,
    fontWeight: '500',
  },
});
