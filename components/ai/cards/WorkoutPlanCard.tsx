/**
 * WorkoutPlanCard - Premium card for workout plans with neon glass aesthetics
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { GradientSurface } from '../atoms/GradientSurface';
import { Tag } from '../atoms/Tag';
import { Chip } from '../atoms/Chip';
import { IconButton } from '../atoms/IconButton';
import { ProgressDots } from '../atoms/ProgressDots';
import { RPEGauge } from '../atoms/RPEGauge';
import { Colors, Layout, Typography, Gradients, getIntentConfig } from '@/theme/ai';
import { WorkoutPlanData, resolveExerciseName, parseRPE, formatRestTime } from '@/utils/aiMessage';
import { exercises } from '@/data/exercises';

interface WorkoutPlanCardProps {
  data: WorkoutPlanData;
  intent?: string;
  onSave?: (data: WorkoutPlanData) => void;
  onStart?: (data: WorkoutPlanData) => void;
  onExplain?: () => void;
  onShare?: () => void;
}

export const WorkoutPlanCard: React.FC<WorkoutPlanCardProps> = ({
  data,
  intent,
  onSave,
  onStart,
  onExplain,
  onShare,
}) => {
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set([0])); // First segment expanded by default
  const intentConfig = getIntentConfig(intent);

  const toggleSegment = (index: number) => {
    const newExpanded = new Set(expandedSegments);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSegments(newExpanded);
  };

  const handleMenuAction = (action: string) => {
    switch (action) {
      case 'save':
        onSave?.(data);
        break;
      case 'start':
        onStart?.(data);
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
    <GradientSurface
      gradient={['rgba(16, 17, 20, 0.95)', 'rgba(12, 12, 17, 0.98)']}
      borderGradient={[...intentConfig.gradient]}
      style={{ marginVertical: 8 }}
    >
      {/* Header */}
      <View style={{ padding: Layout.spacing.lg }}>
        <BlurView
          intensity={20}
          style={{
            borderRadius: Layout.radius.card,
            overflow: 'hidden',
            marginBottom: Layout.spacing.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: Layout.spacing.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: Colors.text,
                  fontSize: Typography.sizes.lg,
                  fontWeight: Typography.weights.bold,
                  marginBottom: 4,
                }}
              >
                {data.dayType}
              </Text>
              <ProgressDots 
                total={data.segments.length} 
                active={expandedSegments.size - 1}
                activeDotColor={intentConfig.primary}
              />
            </View>
            <IconButton
              icon={<Ionicons name="ellipsis-vertical" size={20} color={Colors.text} />}
              onPress={() => {
                Alert.alert('Workout Actions', 'Choose an action:', [
                  { text: 'Save', onPress: () => handleMenuAction('save') },
                  { text: 'Start', onPress: () => handleMenuAction('start') },
                  { text: 'Explain', onPress: () => handleMenuAction('explain') },
                  { text: 'Share', onPress: () => handleMenuAction('share') },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}
              size="small"
            />
          </View>
        </BlurView>

        {/* Segments */}
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          {data.segments.map((segment, segmentIndex) => (
            <View key={segmentIndex} style={{ marginBottom: Layout.spacing.md }}>
              {/* Segment Header */}
              <TouchableOpacity
                onPress={() => toggleSegment(segmentIndex)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: Layout.spacing.sm,
                  paddingHorizontal: Layout.spacing.md,
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: Layout.radius.chip,
                  marginBottom: Layout.spacing.sm,
                }}
              >
                <Tag
                  text={segment.name}
                  gradient={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
                  size="small"
                />
                <Ionicons
                  name={expandedSegments.has(segmentIndex) ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={Colors.subtext}
                />
              </TouchableOpacity>

              {/* Exercises */}
              {expandedSegments.has(segmentIndex) && (
                <View style={{ gap: Layout.gap.sm }}>
                  {segment.exercises.map((exercise, exerciseIndex) => {
                    const resolvedName = resolveExerciseName(exercise.exerciseId, exercises);
                    const rpe = parseRPE(exercise.load);
                    
                    return (
                      <TouchableOpacity
                        key={exerciseIndex}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: Layout.radius.button,
                          padding: Layout.spacing.md,
                          borderLeftWidth: 3,
                          borderLeftColor: intentConfig.primary,
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Layout.gap.md }}>
                          {/* Exercise Info */}
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                color: Colors.text,
                                fontSize: Typography.sizes.md,
                                fontWeight: Typography.weights.semibold,
                                marginBottom: 4,
                              }}
                            >
                              {resolvedName}
                            </Text>
                            
                            {/* Meta Row */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Layout.gap.sm }}>
                              <Text style={{ color: Colors.subtext, fontSize: Typography.sizes.sm }}>
                                {exercise.sets} × {exercise.reps}
                              </Text>
                              {exercise.load && (
                                <Text style={{ color: intentConfig.primary, fontSize: Typography.sizes.sm }}>
                                  • {exercise.load}
                                </Text>
                              )}
                              <Text style={{ color: Colors.subtext, fontSize: Typography.sizes.sm }}>
                                • {formatRestTime(exercise.restSec)}
                              </Text>
                            </View>

                            {exercise.notes && (
                              <Text
                                style={{
                                  color: Colors.subtext,
                                  fontSize: Typography.sizes.sm,
                                  fontStyle: 'italic',
                                  marginTop: 4,
                                }}
                              >
                                {exercise.notes}
                              </Text>
                            )}

                            {/* Safety Badge */}
                            {exercise.safetyRating && exercise.safetyRating !== 'low' && (
                              <Chip
                                text={`${exercise.safetyRating.toUpperCase()} RISK`}
                                style={{ alignSelf: 'flex-start', marginTop: 4 }}
                                gradient={
                                  exercise.safetyRating === 'high'
                                    ? [Colors.accent, Colors.accent]
                                    : [Colors.warn, Colors.warn]
                                }
                              />
                            )}
                          </View>

                          {/* RPE Gauge */}
                          {rpe !== null && (
                            <RPEGauge value={rpe} size={36} showLabel={false} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={{ marginTop: Layout.spacing.md }}>
          {data.safetyNotes && (
            <Text
              style={{
                color: Colors.subtext,
                fontSize: Typography.sizes.sm,
                lineHeight: 20,
                marginBottom: Layout.spacing.md,
              }}
            >
              {data.safetyNotes}
            </Text>
          )}

          {/* CTA Row */}
          <View style={{ flexDirection: 'row', gap: Layout.gap.md }}>
            <TouchableOpacity
              onPress={() => handleMenuAction('start')}
              style={{
                flex: 1,
                backgroundColor: intentConfig.primary,
                paddingVertical: Layout.spacing.md,
                paddingHorizontal: Layout.spacing.lg,
                borderRadius: Layout.radius.button,
                alignItems: 'center',
                shadowColor: intentConfig.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Text
                style={{
                  color: Colors.white,
                  fontSize: Typography.sizes.md,
                  fontWeight: Typography.weights.bold,
                }}
              >
                🚀 START
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleMenuAction('explain')}
              style={{
                paddingVertical: Layout.spacing.md,
                paddingHorizontal: Layout.spacing.lg,
                borderRadius: Layout.radius.button,
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: Colors.text,
                  fontSize: Typography.sizes.md,
                  fontWeight: Typography.weights.medium,
                }}
              >
                Explain
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </GradientSurface>
  );
};
