import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useUnits } from '@/hooks/useUnits';

interface MilestoneDetails {
  exerciseName?: string;
  date: any;
  value?: number;
  weightUnit?: string;
  weight?: string;
  reps?: number;
  duration?: number;
  level?: number;
  distance?: number;
  distanceUnit?: string;
  newWeight?: number;
  newWeightUnit?: string;
}

interface MilestoneCardProps {
  milestoneType: string;
  details: MilestoneDetails;
  formatTimeAgo: (date: any) => string;
}

export const MilestoneCard: React.FC<MilestoneCardProps> = ({ milestoneType, details, formatTimeAgo }) => {
  const { getWeightUnit, getDistanceUnit } = useUnits();

  // Helper function to check if unit is a distance unit
  const isDistanceUnit = (unit?: string): boolean => {
    return unit === 'km' || unit === 'miles';
  };

  // Helper function to check if unit is a weight unit
  const isWeightUnit = (unit?: string): boolean => {
    return unit === 'kg' || unit === 'lbs';
  };

  // Helper function for duration formatting
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    
    return parts.join(' ');
  };

  // Helper function for weight conversion
  const convertAndFormatWeight = (value: number, unit: string) => {
    const userPreferredUnit = getWeightUnit();
    let convertedValue = value;
    let displayUnit = unit;
    
    if (unit !== userPreferredUnit) {
      if (unit === 'kg' && userPreferredUnit === 'lbs') {
        convertedValue = Math.round(value * 2.20462 * 10) / 10;
      } else if (unit === 'lbs' && userPreferredUnit === 'kg') {
        convertedValue = Math.round(value * 0.453592 * 10) / 10;
      }
      displayUnit = userPreferredUnit;
    }
    
    return { value: Math.round(convertedValue * 10) / 10, unit: displayUnit };
  };

  // Helper function for distance conversion
  const convertAndFormatDistance = (value: number, unit: string) => {
    const userPreferredUnit = getDistanceUnit();
    let convertedValue = value;
    let displayUnit = unit;
    
    if (unit !== userPreferredUnit) {
      if (unit === 'km' && userPreferredUnit === 'miles') {
        convertedValue = Math.round(value * 0.621371 * 10) / 10;
      } else if (unit === 'miles' && userPreferredUnit === 'km') {
        convertedValue = Math.round(value * 1.60934 * 10) / 10;
      }
      displayUnit = userPreferredUnit;
    }
    
    return { value: convertedValue, unit: displayUnit };
  };

  // Parse the weight string from useProfileData hook format
  const parseWeightString = (weightStr?: string) => {
    if (!weightStr) return { value: null, unit: null };
    const parts = weightStr.split(' ');
    const value = parseFloat(parts[0]);
    const unit = parts[1] || null;
    return { value: isNaN(value) ? null : value, unit };
  };

  if (milestoneType === 'PR') {
    // Handle both old format (weight string) and new format (value + weightUnit)
    const parsedWeight = parseWeightString(details.weight);
    const actualValue = details.value ?? parsedWeight.value;
    const actualWeightUnit = details.weightUnit ?? parsedWeight.unit;
    const actualReps = details.reps;
    const actualDuration = details.duration;
    const actualLevel = details.level;
    const actualDistance = details.distance;
    const actualDistanceUnit = details.distanceUnit;
    
    // Determine which metric type this PR uses
    const hasWeightReps = actualValue && actualReps && actualWeightUnit && isWeightUnit(actualWeightUnit);
    const hasBodyweightReps = actualReps && !actualValue && !actualDuration && !actualLevel;
    const hasDuration = actualDuration && !actualValue && !actualLevel;
    const hasDurationLevel = actualDuration && actualLevel && !actualValue;
    const hasDistance = (actualValue && actualWeightUnit && isDistanceUnit(actualWeightUnit) && !actualDuration) ||
                      (actualDistance && actualDistanceUnit && !actualDuration);
    const hasDistanceTime = ((actualValue && actualDuration && actualWeightUnit && isDistanceUnit(actualWeightUnit)) ||
                            (actualDistance && actualDistanceUnit && actualDuration));

    // Weight + Reps (e.g., Bench Press 225 lbs × 5 reps)
    if (hasWeightReps) {
      const converted = convertAndFormatWeight(actualValue!, actualWeightUnit!);
      
      return (
        <View style={styles.previousPRCard}>
          <View style={styles.previousPRHeader}>
            <MaterialCommunityIcons name="dumbbell" size={18} color="#FF5E69" />
            <Text style={styles.previousPRTitle}>
              {details.exerciseName || 'Strength PR'}
            </Text>
            <Text style={styles.previousPRDate}>{formatTimeAgo(details.date)}</Text>
          </View>
          
          <View style={styles.previousPRContent}>
            <View style={styles.prMetricsRow}>
              <View style={styles.prMetricGroup}>
                <Text style={styles.prMetricValue}>{converted.value}</Text>
                <Text style={styles.prMetricLabel}>{converted.unit}</Text>
              </View>
              <Text style={styles.prMetricSeparator}>×</Text>
              <View style={styles.prMetricGroup}>
                <Text style={styles.prMetricValue}>{actualReps}</Text>
                <Text style={styles.prMetricLabel}>reps</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Bodyweight Reps (e.g., Push-ups 50 reps)
    if (hasBodyweightReps) {
      return (
        <View style={styles.previousPRCard}>
          <View style={styles.previousPRHeader}>
            <MaterialCommunityIcons name="human-handsup" size={18} color="#FF5E69" />
            <Text style={styles.previousPRTitle}>
              {details.exerciseName || 'Bodyweight PR'}
            </Text>
            <Text style={styles.previousPRDate}>{formatTimeAgo(details.date)}</Text>
          </View>
          
          <View style={styles.previousPRContent}>
            <View style={styles.prMetricsRow}>
              <View style={styles.prMetricGroup}>
                <Text style={styles.prMetricValue}>{actualReps}</Text>
                <Text style={styles.prMetricLabel}>reps</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Duration Only (e.g., Plank 3m 45s)
    if (hasDuration) {
      return (
        <View style={styles.previousPRCard}>
          <View style={styles.previousPRHeader}>
            <MaterialCommunityIcons name="timer-outline" size={18} color="#FF5E69" />
            <Text style={styles.previousPRTitle}>
              {details.exerciseName || 'Endurance PR'}
            </Text>
            <Text style={styles.previousPRDate}>{formatTimeAgo(details.date)}</Text>
          </View>
          
          <View style={styles.previousPRContent}>
            <View style={styles.prMetricsRow}>
              <View style={styles.prMetricGroup}>
                <Text style={styles.prMetricValue}>{formatDuration(actualDuration)}</Text>
                <Text style={styles.prMetricLabel}>time</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Duration + Level (e.g., Plank Level 7: 2m 30s)
    if (hasDurationLevel) {
      return (
        <View style={styles.previousPRCard}>
          <View style={styles.previousPRHeader}>
            <MaterialCommunityIcons name="timer-sand" size={18} color="#FF5E69" />
            <Text style={styles.previousPRTitle}>
              {details.exerciseName || 'Endurance PR'}
            </Text>
            <Text style={styles.previousPRDate}>{formatTimeAgo(details.date)}</Text>
          </View>
          
          <View style={styles.previousPRContent}>
            <View style={styles.prMetricsRow}>
              <View style={styles.prMetricGroup}>
                <Text style={styles.prMetricValue}>{formatDuration(actualDuration)}</Text>
                <Text style={styles.prMetricLabel}>time</Text>
              </View>
            </View>
            <View style={styles.prMetricsRow}>
              <View style={styles.prMetricGroup}>
                <Text style={styles.prMetricValue}>Level {actualLevel}</Text>
                <Text style={styles.prMetricLabel}>difficulty</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Distance Only (e.g., Run 5.2 km)
    if (hasDistance) {
      const distValue = actualDistance || actualValue!;
      const distUnit = actualDistanceUnit || actualWeightUnit!;
      const converted = convertAndFormatDistance(distValue, distUnit);
      
      return (
        <View style={styles.previousPRCard}>
          <View style={styles.previousPRHeader}>
            <MaterialCommunityIcons name="run" size={18} color="#FF5E69" />
            <Text style={styles.previousPRTitle}>
              {details.exerciseName || 'Distance PR'}
            </Text>
            <Text style={styles.previousPRDate}>{formatTimeAgo(details.date)}</Text>
          </View>
          
          <View style={styles.previousPRContent}>
            <View style={styles.prMetricsRow}>
              <View style={styles.prMetricGroup}>
                <Text style={styles.prMetricValue}>{converted.value}</Text>
                <Text style={styles.prMetricLabel}>{converted.unit}</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Distance + Time (e.g., 5K in 23m 15s, pace: 4m 39s/km)
    if (hasDistanceTime) {
      const distValue = actualDistance || actualValue!;
      const distUnit = actualDistanceUnit || actualWeightUnit!;
      const converted = convertAndFormatDistance(distValue, distUnit);
      const pace = distValue > 0 ? Math.round(actualDuration! / distValue) : 0;
      const paceUnit = converted.unit.endsWith('s') ? converted.unit.slice(0, -1) : converted.unit;
      
      return (
        <View style={styles.previousPRCard}>
          <View style={styles.previousPRHeader}>
            <MaterialCommunityIcons name="run-fast" size={18} color="#FF5E69" />
            <Text style={styles.previousPRTitle}>
              {details.exerciseName || 'Cardio PR'}
            </Text>
            <Text style={styles.previousPRDate}>{formatTimeAgo(details.date)}</Text>
          </View>
          
          <View style={styles.previousPRContent}>
            <View style={styles.prMetricsRow}>
              <View style={styles.prMetricGroup}>
                <Text style={styles.prMetricValue}>{converted.value}</Text>
                <Text style={styles.prMetricLabel}>{converted.unit}</Text>
              </View>
            </View>
            <View style={styles.prMetricsRow}>
              <View style={styles.prMetricGroup}>
                <Text style={styles.prMetricValue}>{formatDuration(actualDuration!)}</Text>
                <Text style={styles.prMetricLabel}>time</Text>
              </View>
            </View>
            <View style={styles.prMetricsRow}>
              <View style={styles.prMetricGroup}>
                <Text style={styles.prMetricValue}>{formatDuration(pace)}</Text>
                <Text style={styles.prMetricLabel}>per {paceUnit}</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Fallback for unknown PR type
    return (
      <View style={styles.previousPRCard}>
        <View style={styles.previousPRHeader}>
          <MaterialCommunityIcons name="trophy-outline" size={18} color="#FF5E69" />
          <Text style={styles.previousPRTitle}>
            {details.exerciseName || 'Personal Record'}
          </Text>
          <Text style={styles.previousPRDate}>{formatTimeAgo(details.date)}</Text>
        </View>
      </View>
    );
  } else if (milestoneType === 'weightLoss' || milestoneType === 'weightGain') {
    const isLoss = milestoneType === 'weightLoss';
    
    // Parse old weight string format if it exists
    const weightString = details.weight || '';
    const weightParts = weightString.split(' ');
    const legacyWeightValue = parseFloat(weightParts[0]) || 0;
    const legacyWeightUnit = weightParts.length > 1 ? weightParts[1] : '';
    
    // Use new format if available, otherwise fall back to legacy
    const weightValue = details.newWeight || legacyWeightValue;
    const weightUnit = details.newWeightUnit || legacyWeightUnit || getWeightUnit();
    
    const converted = convertAndFormatWeight(weightValue, weightUnit);
    
    return (
      <View style={styles.previousPRCard}>
        <View style={styles.previousPRHeader}>
          <Ionicons name="fitness-outline" size={18} color="#FF5E69" />
          <Text style={styles.previousPRTitle}>{isLoss ? 'Weight Loss' : 'Weight Gain'}</Text>
          <Text style={styles.previousPRDate}>{formatTimeAgo(details.date)}</Text>
        </View>
        
        <View style={styles.previousPRContent}>
          <View style={styles.prMetricsRow}>
            <View style={styles.prMetricGroup}>
              <Text style={styles.prMetricValue}>{converted.value}</Text>
              <Text style={styles.prMetricLabel}>{converted.unit}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }
  
  return null;
};

const styles = StyleSheet.create({
  previousPRCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    overflow: 'hidden',
  },
  previousPRHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  previousPRTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
  previousPRDate: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
  previousPRContent: {
    padding: 16,
  },
  prMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  prMetricGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  prMetricValue: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '700',
  },
  prMetricLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    marginLeft: 6,
  },
  prMetricSeparator: {
    color: '#FF5E69',
    fontSize: 22,
    marginHorizontal: 10,
  },
});
