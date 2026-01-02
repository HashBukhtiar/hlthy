/**
 * TechniqueAdviceCard - Caution panel for technique and safety advice
 */
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientSurface } from '../atoms/GradientSurface';
import { Chip } from '../atoms/Chip';
import { Colors, Layout, Typography } from '@/theme/ai';
import { TechniqueAdviceData, resolveExerciseName } from '@/utils/aiMessage';
import { exercises } from '@/data/exercises';

interface TechniqueAdviceCardProps {
  data: TechniqueAdviceData;
  onApplySubstitutions?: (data: TechniqueAdviceData) => void;
}

export const TechniqueAdviceCard: React.FC<TechniqueAdviceCardProps> = ({
  data,
  onApplySubstitutions,
}) => {
  const cautionColor = Colors.warn;

  return (
    <GradientSurface
      gradient={['rgba(16, 17, 20, 0.95)', 'rgba(12, 12, 17, 0.98)']}
      borderGradient={[cautionColor, 'rgba(255, 176, 32, 0.3)']}
      style={{ marginVertical: 8 }}
    >
      <View style={{ padding: Layout.spacing.lg }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.lg }}>
          <View
            style={{
              backgroundColor: `${cautionColor}20`,
              borderRadius: 20,
              padding: 8,
              marginRight: Layout.spacing.md,
            }}
          >
            <Ionicons name="warning" size={20} color={cautionColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: Colors.text,
                fontSize: Typography.sizes.lg,
                fontWeight: Typography.weights.bold,
                marginBottom: 2,
              }}
            >
              Technique Advisory
            </Text>
            <Text
              style={{
                color: cautionColor,
                fontSize: Typography.sizes.sm,
                fontWeight: Typography.weights.medium,
              }}
            >
              {data.issue}
            </Text>
          </View>
        </View>

        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
          {/* Risk Assessment */}
          {data.riskAssessment && (
            <View style={{ marginBottom: Layout.spacing.lg }}>
              <Text
                style={{
                  color: Colors.text,
                  fontSize: Typography.sizes.md,
                  fontWeight: Typography.weights.semibold,
                  marginBottom: Layout.spacing.sm,
                }}
              >
                Risk Assessment
              </Text>
              <View
                style={{
                  backgroundColor: 'rgba(255, 176, 32, 0.1)',
                  borderRadius: Layout.radius.button,
                  padding: Layout.spacing.md,
                  borderLeftWidth: 3,
                  borderLeftColor: cautionColor,
                }}
              >
                <Text
                  style={{
                    color: Colors.text,
                    fontSize: Typography.sizes.sm,
                    lineHeight: 20,
                  }}
                >
                  {data.riskAssessment}
                </Text>
              </View>
            </View>
          )}

          {/* Avoid Exercises */}
          {data.avoidExercises && data.avoidExercises.length > 0 && (
            <View style={{ marginBottom: Layout.spacing.lg }}>
              <Text
                style={{
                  color: Colors.text,
                  fontSize: Typography.sizes.md,
                  fontWeight: Typography.weights.semibold,
                  marginBottom: Layout.spacing.sm,
                }}
              >
                ⚠️ Avoid These Exercises
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Layout.gap.sm }}>
                {data.avoidExercises.map((exerciseId, index) => (
                  <Chip
                    key={index}
                    text={resolveExerciseName(exerciseId, exercises)}
                    gradient={[Colors.accent, 'rgba(255, 45, 85, 0.7)']}
                    textStyle={{ fontSize: Typography.sizes.sm }}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Safe Alternatives */}
          {data.safeAlternatives && data.safeAlternatives.length > 0 && (
            <View style={{ marginBottom: Layout.spacing.lg }}>
              <Text
                style={{
                  color: Colors.text,
                  fontSize: Typography.sizes.md,
                  fontWeight: Typography.weights.semibold,
                  marginBottom: Layout.spacing.sm,
                }}
              >
                ✅ Safe Alternatives
              </Text>
              <View style={{ gap: Layout.gap.sm }}>
                {data.safeAlternatives.map((alternative, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: 'rgba(62, 230, 140, 0.1)',
                      borderRadius: Layout.radius.button,
                      padding: Layout.spacing.md,
                      borderLeftWidth: 3,
                      borderLeftColor: Colors.success,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Layout.gap.md }}>
                      <Text style={{ color: Colors.success, fontSize: Typography.sizes.lg }}>→</Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: Colors.text,
                            fontSize: Typography.sizes.md,
                            fontWeight: Typography.weights.semibold,
                            marginBottom: 2,
                          }}
                        >
                          {resolveExerciseName(alternative.exerciseId, exercises)}
                        </Text>
                        <Text
                          style={{
                            color: Colors.subtext,
                            fontSize: Typography.sizes.sm,
                            lineHeight: 18,
                          }}
                        >
                          {alternative.reason}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Technique Cues */}
          {data.techniqueCues && data.techniqueCues.length > 0 && (
            <View style={{ marginBottom: Layout.spacing.md }}>
              <Text
                style={{
                  color: Colors.text,
                  fontSize: Typography.sizes.md,
                  fontWeight: Typography.weights.semibold,
                  marginBottom: Layout.spacing.sm,
                }}
              >
                🎯 Technique Cues
              </Text>
              <View style={{ gap: Layout.gap.xs }}>
                {data.techniqueCues.map((cue, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      paddingVertical: Layout.spacing.xs,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: Colors.success,
                        borderRadius: 8,
                        width: 16,
                        height: 16,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: Layout.spacing.sm,
                        marginTop: 2,
                      }}
                    >
                      <Ionicons name="checkmark" size={10} color={Colors.white} />
                    </View>
                    <Text
                      style={{
                        color: Colors.text,
                        fontSize: Typography.sizes.sm,
                        lineHeight: 20,
                        flex: 1,
                      }}
                    >
                      {cue}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* CTA */}
        {data.safeAlternatives && data.safeAlternatives.length > 0 && (
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: 'rgba(255, 255, 255, 0.1)',
              paddingTop: Layout.spacing.md,
            }}
          >
            <Text
              style={{
                color: Colors.subtext,
                fontSize: Typography.sizes.sm,
                textAlign: 'center',
                marginBottom: Layout.spacing.sm,
              }}
            >
              Apply these substitutions for a safer workout
            </Text>
          </View>
        )}
      </View>
    </GradientSurface>
  );
};
