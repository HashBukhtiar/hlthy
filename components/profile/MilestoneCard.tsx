import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useUnits } from '@/hooks/useUnits';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Theme configurations for different milestone types
const MILESTONE_THEMES = {
  strength: {
    primary: '#FF6B6B',
    secondary: '#FF8E53',
    gradient: ['#FF6B6B', '#FF8E53'] as const,
    bgGradient: ['rgba(255,107,107,0.15)', 'rgba(255,142,83,0.08)', 'rgba(0,0,0,0)'] as const,
    icon: 'dumbbell' as const,
    iconComponent: 'MaterialCommunityIcons' as const,
  },
  bodyweight: {
    primary: '#4ECDC4',
    secondary: '#44A08D',
    gradient: ['#4ECDC4', '#44A08D'] as const,
    bgGradient: ['rgba(78,205,196,0.15)', 'rgba(68,160,141,0.08)', 'rgba(0,0,0,0)'] as const,
    icon: 'human-handsup' as const,
    iconComponent: 'MaterialCommunityIcons' as const,
  },
  endurance: {
    primary: '#A78BFA',
    secondary: '#8B5CF6',
    gradient: ['#A78BFA', '#8B5CF6'] as const,
    bgGradient: ['rgba(167,139,250,0.15)', 'rgba(139,92,246,0.08)', 'rgba(0,0,0,0)'] as const,
    icon: 'timer-outline' as const,
    iconComponent: 'MaterialCommunityIcons' as const,
  },
  cardio: {
    primary: '#3B82F6',
    secondary: '#06B6D4',
    gradient: ['#3B82F6', '#06B6D4'] as const,
    bgGradient: ['rgba(59,130,246,0.15)', 'rgba(6,182,212,0.08)', 'rgba(0,0,0,0)'] as const,
    icon: 'run-fast' as const,
    iconComponent: 'MaterialCommunityIcons' as const,
  },
  distance: {
    primary: '#10B981',
    secondary: '#059669',
    gradient: ['#10B981', '#059669'] as const,
    bgGradient: ['rgba(16,185,129,0.15)', 'rgba(5,150,105,0.08)', 'rgba(0,0,0,0)'] as const,
    icon: 'run' as const,
    iconComponent: 'MaterialCommunityIcons' as const,
  },
  weightChange: {
    primary: '#F59E0B',
    secondary: '#EF4444',
    gradient: ['#F59E0B', '#EF4444'] as const,
    bgGradient: ['rgba(245,158,11,0.15)', 'rgba(239,68,68,0.08)', 'rgba(0,0,0,0)'] as const,
    icon: 'fitness-outline' as const,
    iconComponent: 'Ionicons' as const,
  },
  default: {
    primary: '#FF5E69',
    secondary: '#FF8A65',
    gradient: ['#FF5E69', '#FF8A65'] as const,
    bgGradient: ['rgba(255,94,105,0.15)', 'rgba(255,138,101,0.08)', 'rgba(0,0,0,0)'] as const,
    icon: 'trophy' as const,
    iconComponent: 'MaterialCommunityIcons' as const,
  },
};

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

// Metric display component for consistent styling
const MetricPill: React.FC<{
  value: string | number;
  label: string;
  accentColor: string;
  large?: boolean;
}> = ({ value, label, accentColor, large = false }) => (
  <View style={styles.metricPill}>
    <Text style={[
      styles.metricValue,
      large && styles.metricValueLarge,
      { color: '#FFF' }
    ]}>
      {value}
    </Text>
    <Text style={[styles.metricLabel, { color: accentColor }]}>{label}</Text>
  </View>
);

// Icon component that handles both Ionicons and MaterialCommunityIcons
const ThemeIcon: React.FC<{
  iconComponent: 'MaterialCommunityIcons' | 'Ionicons';
  icon: string;
  color: string;
  size?: number;
}> = ({ iconComponent, icon, color, size = 20 }) => {
  if (iconComponent === 'Ionicons') {
    return <Ionicons name={icon as any} size={size} color={color} />;
  }
  return <MaterialCommunityIcons name={icon as any} size={size} color={color} />;
};

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
      const theme = MILESTONE_THEMES.strength;
      
      return (
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={theme.bgGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          />
          
          {/* Decorative accent line */}
          <LinearGradient
            colors={[...theme.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentLine}
          />
          
          <View style={styles.cardContent}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
                <ThemeIcon 
                  iconComponent={theme.iconComponent} 
                  icon={theme.icon} 
                  color={theme.primary} 
                  size={22}
                />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {details.exerciseName || 'Strength PR'}
                </Text>
                <View style={styles.dateContainer}>
                  <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.dateText}>{formatTimeAgo(details.date)}</Text>
                </View>
              </View>
              <View style={[styles.prBadge, { backgroundColor: `${theme.primary}25` }]}>
                <Text style={[styles.prBadgeText, { color: theme.primary }]}>PR</Text>
              </View>
            </View>

            {/* Metrics */}
            <View style={styles.metricsContainer}>
              <View style={styles.metricCard}>
                <Text style={[styles.metricValueLarge, { color: theme.primary }]}>
                  {converted.value}
                </Text>
                <Text style={styles.metricLabelSmall}>{converted.unit}</Text>
              </View>
              
              <View style={styles.separatorContainer}>
                <LinearGradient
                  colors={[...theme.gradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.separatorLine}
                />
                <Text style={[styles.separatorText, { color: theme.primary }]}>×</Text>
                <LinearGradient
                  colors={[...theme.gradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.separatorLine}
                />
              </View>
              
              <View style={styles.metricCard}>
                <Text style={[styles.metricValueLarge, { color: theme.secondary }]}>
                  {actualReps}
                </Text>
                <Text style={styles.metricLabelSmall}>reps</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Bodyweight Reps (e.g., Push-ups 50 reps)
    if (hasBodyweightReps) {
      const theme = MILESTONE_THEMES.bodyweight;
      
      return (
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={theme.bgGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          />
          
          <LinearGradient
            colors={[...theme.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentLine}
          />
          
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
                <ThemeIcon 
                  iconComponent={theme.iconComponent} 
                  icon={theme.icon} 
                  color={theme.primary} 
                  size={22}
                />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {details.exerciseName || 'Bodyweight PR'}
                </Text>
                <View style={styles.dateContainer}>
                  <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.dateText}>{formatTimeAgo(details.date)}</Text>
                </View>
              </View>
              <View style={[styles.prBadge, { backgroundColor: `${theme.primary}25` }]}>
                <Text style={[styles.prBadgeText, { color: theme.primary }]}>PR</Text>
              </View>
            </View>

            <View style={styles.singleMetricContainer}>
              <View style={[styles.singleMetricCard, { borderColor: `${theme.primary}30` }]}>
                <Text style={[styles.singleMetricValue, { color: theme.primary }]}>
                  {actualReps}
                </Text>
                <Text style={styles.singleMetricLabel}>repetitions</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Duration Only (e.g., Plank 3m 45s)
    if (hasDuration) {
      const theme = MILESTONE_THEMES.endurance;
      
      return (
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={theme.bgGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          />
          
          <LinearGradient
            colors={[...theme.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentLine}
          />
          
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
                <ThemeIcon 
                  iconComponent={theme.iconComponent} 
                  icon={theme.icon} 
                  color={theme.primary} 
                  size={22}
                />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {details.exerciseName || 'Endurance PR'}
                </Text>
                <View style={styles.dateContainer}>
                  <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.dateText}>{formatTimeAgo(details.date)}</Text>
                </View>
              </View>
              <View style={[styles.prBadge, { backgroundColor: `${theme.primary}25` }]}>
                <Text style={[styles.prBadgeText, { color: theme.primary }]}>PR</Text>
              </View>
            </View>

            <View style={styles.singleMetricContainer}>
              <View style={[styles.singleMetricCard, { borderColor: `${theme.primary}30` }]}>
                <MaterialCommunityIcons name="clock-outline" size={20} color={theme.primary} style={{ marginBottom: 4 }} />
                <Text style={[styles.singleMetricValue, { color: theme.primary }]}>
                  {formatDuration(actualDuration)}
                </Text>
                <Text style={styles.singleMetricLabel}>duration</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Duration + Level (e.g., Plank Level 7: 2m 30s)
    if (hasDurationLevel) {
      const theme = MILESTONE_THEMES.endurance;
      
      return (
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={theme.bgGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          />
          
          <LinearGradient
            colors={[...theme.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentLine}
          />
          
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
                <MaterialCommunityIcons name="timer-sand" size={22} color={theme.primary} />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {details.exerciseName || 'Endurance PR'}
                </Text>
                <View style={styles.dateContainer}>
                  <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.dateText}>{formatTimeAgo(details.date)}</Text>
                </View>
              </View>
              <View style={[styles.prBadge, { backgroundColor: `${theme.primary}25` }]}>
                <Text style={[styles.prBadgeText, { color: theme.primary }]}>PR</Text>
              </View>
            </View>

            <View style={styles.metricsContainer}>
              <View style={styles.metricCard}>
                <MaterialCommunityIcons name="clock-outline" size={18} color={theme.primary} style={{ marginBottom: 2 }} />
                <Text style={[styles.metricValueLarge, { color: theme.primary, fontSize: 22 }]}>
                  {formatDuration(actualDuration!)}
                </Text>
                <Text style={styles.metricLabelSmall}>duration</Text>
              </View>
              
              <View style={styles.metricDivider} />
              
              <View style={styles.metricCard}>
                <MaterialCommunityIcons name="signal-cellular-3" size={18} color={theme.secondary} style={{ marginBottom: 2 }} />
                <Text style={[styles.metricValueLarge, { color: theme.secondary, fontSize: 22 }]}>
                  {actualLevel}
                </Text>
                <Text style={styles.metricLabelSmall}>level</Text>
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
      const theme = MILESTONE_THEMES.distance;
      
      return (
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={theme.bgGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          />
          
          <LinearGradient
            colors={[...theme.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentLine}
          />
          
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
                <ThemeIcon 
                  iconComponent={theme.iconComponent} 
                  icon={theme.icon} 
                  color={theme.primary} 
                  size={22}
                />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {details.exerciseName || 'Distance PR'}
                </Text>
                <View style={styles.dateContainer}>
                  <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.dateText}>{formatTimeAgo(details.date)}</Text>
                </View>
              </View>
              <View style={[styles.prBadge, { backgroundColor: `${theme.primary}25` }]}>
                <Text style={[styles.prBadgeText, { color: theme.primary }]}>PR</Text>
              </View>
            </View>

            <View style={styles.singleMetricContainer}>
              <View style={[styles.singleMetricCard, { borderColor: `${theme.primary}30` }]}>
                <Text style={[styles.singleMetricValue, { color: theme.primary }]}>
                  {converted.value}
                </Text>
                <Text style={styles.singleMetricLabel}>{converted.unit}</Text>
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
      const theme = MILESTONE_THEMES.cardio;
      
      return (
        <View style={styles.cardContainer}>
          <LinearGradient
            colors={theme.bgGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          />
          
          <LinearGradient
            colors={[...theme.gradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentLine}
          />
          
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
                <ThemeIcon 
                  iconComponent={theme.iconComponent} 
                  icon={theme.icon} 
                  color={theme.primary} 
                  size={22}
                />
              </View>
              <View style={styles.headerTextContainer}>
                <Text style={styles.exerciseName} numberOfLines={1}>
                  {details.exerciseName || 'Cardio PR'}
                </Text>
                <View style={styles.dateContainer}>
                  <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.dateText}>{formatTimeAgo(details.date)}</Text>
                </View>
              </View>
              <View style={[styles.prBadge, { backgroundColor: `${theme.primary}25` }]}>
                <Text style={[styles.prBadgeText, { color: theme.primary }]}>PR</Text>
              </View>
            </View>

            <View style={styles.cardioMetricsRow}>
              <View style={styles.cardioMetricItem}>
                <MaterialCommunityIcons name="map-marker-distance" size={16} color={theme.primary} />
                <Text style={[styles.cardioMetricValue, { color: theme.primary }]}>
                  {converted.value} <Text style={styles.cardioMetricUnit}>{converted.unit}</Text>
                </Text>
              </View>
              <View style={[styles.cardioMetricItem, styles.cardioMetricMiddle]}>
                <MaterialCommunityIcons name="clock-fast" size={16} color={theme.secondary} />
                <Text style={[styles.cardioMetricValue, { color: theme.secondary }]}>
                  {formatDuration(actualDuration!)}
                </Text>
              </View>
              <View style={styles.cardioMetricItem}>
                <MaterialCommunityIcons name="speedometer" size={16} color="#64748B" />
                <Text style={[styles.cardioMetricValue, { color: '#94A3B8' }]}>
                  {formatDuration(pace)}<Text style={styles.cardioMetricUnit}>/{paceUnit}</Text>
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    // Fallback for unknown PR type
    const theme = MILESTONE_THEMES.default;
    return (
      <View style={styles.cardContainer}>
        <LinearGradient
          colors={theme.bgGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        />
        
        <LinearGradient
          colors={[...theme.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accentLine}
        />
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}20` }]}>
              <MaterialCommunityIcons name="trophy" size={22} color={theme.primary} />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.exerciseName} numberOfLines={1}>
                {details.exerciseName || 'Personal Record'}
              </Text>
              <View style={styles.dateContainer}>
                <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.4)" />
                <Text style={styles.dateText}>{formatTimeAgo(details.date)}</Text>
              </View>
            </View>
            <View style={[styles.prBadge, { backgroundColor: `${theme.primary}25` }]}>
              <Text style={[styles.prBadgeText, { color: theme.primary }]}>PR</Text>
            </View>
          </View>
        </View>
      </View>
    );
  } else if (milestoneType === 'weightLoss' || milestoneType === 'weightGain') {
    const isLoss = milestoneType === 'weightLoss';
    const theme = MILESTONE_THEMES.weightChange;
    
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
      <View style={styles.cardContainer}>
        <LinearGradient
          colors={isLoss 
            ? ['rgba(16,185,129,0.15)', 'rgba(5,150,105,0.08)', 'rgba(0,0,0,0)'] 
            : theme.bgGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        />
        
        <LinearGradient
          colors={isLoss ? ['#10B981', '#059669'] : [...theme.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.accentLine}
        />
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={[
              styles.iconContainer, 
              { backgroundColor: isLoss ? 'rgba(16,185,129,0.2)' : `${theme.primary}20` }
            ]}>
              <Ionicons 
                name={isLoss ? "trending-down" : "trending-up"} 
                size={22} 
                color={isLoss ? '#10B981' : theme.primary} 
              />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.exerciseName}>
                {isLoss ? 'Weight Loss' : 'Weight Gain'}
              </Text>
              <View style={styles.dateContainer}>
                <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.4)" />
                <Text style={styles.dateText}>{formatTimeAgo(details.date)}</Text>
              </View>
            </View>
            <View style={[
              styles.prBadge, 
              { backgroundColor: isLoss ? 'rgba(16,185,129,0.25)' : `${theme.primary}25` }
            ]}>
              <Ionicons 
                name={isLoss ? "arrow-down" : "arrow-up"} 
                size={12} 
                color={isLoss ? '#10B981' : theme.primary} 
              />
            </View>
          </View>

          <View style={styles.singleMetricContainer}>
            <View style={[
              styles.singleMetricCard, 
              { borderColor: isLoss ? 'rgba(16,185,129,0.3)' : `${theme.primary}30` }
            ]}>
              <Text style={[
                styles.singleMetricValue, 
                { color: isLoss ? '#10B981' : theme.primary }
              ]}>
                {converted.value}
              </Text>
              <Text style={styles.singleMetricLabel}>{converted.unit}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }
  
  return null;
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#0D0D0F',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  exerciseName: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: '500',
  },
  prBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  prBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
  },
  metricValueLarge: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  metricLabelSmall: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  separatorLine: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  separatorText: {
    fontSize: 20,
    fontWeight: '700',
    marginHorizontal: 6,
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  singleMetricContainer: {
    alignItems: 'center',
  },
  singleMetricCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 48,
    borderWidth: 1,
  },
  singleMetricValue: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1.5,
  },
  singleMetricLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  cardioMetricsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 12,
  },
  cardioMetricItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  cardioMetricMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardioMetricValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  cardioMetricUnit: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
  // Legacy styles kept for compatibility
  metricPill: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
