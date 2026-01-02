/**
 * SchedulePlanCard - Neon week grid for training schedules
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientSurface } from '../atoms/GradientSurface';
import { Tag } from '../atoms/Tag';
import { Colors, Layout, Typography, getIntentConfig } from '@/theme/ai';
import { SchedulePlanData } from '@/utils/aiMessage';

interface SchedulePlanCardProps {
  data: SchedulePlanData;
  intent?: string;
  onSave?: (data: SchedulePlanData) => void;
}

export const SchedulePlanCard: React.FC<SchedulePlanCardProps> = ({
  data,
  intent,
  onSave,
}) => {
  const intentConfig = getIntentConfig(intent);
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Create a map of day to focus for easy lookup
  const dayFocusMap = data.split.reduce((acc, item) => {
    acc[item.day.toLowerCase()] = item.focus;
    return acc;
  }, {} as Record<string, string>);

  // Get focus color based on content
  const getFocusColor = (focus: string): [string, string] => {
    const lowerFocus = focus.toLowerCase();
    if (lowerFocus.includes('push') || lowerFocus.includes('chest') || lowerFocus.includes('upper')) {
      return ['#FF6B35', '#F7931E'];
    } else if (lowerFocus.includes('pull') || lowerFocus.includes('back')) {
      return ['#4ECDC4', '#45B7D1'];
    } else if (lowerFocus.includes('leg') || lowerFocus.includes('lower')) {
      return ['#45B7D1', '#96CEB4'];
    } else if (lowerFocus.includes('cardio')) {
      return ['#96CEB4', '#FFEAA7'];
    } else {
      return ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)'];
    }
  };

  return (
    <GradientSurface
      gradient={['rgba(16, 17, 20, 0.95)', 'rgba(12, 12, 17, 0.98)']}
      borderGradient={[...intentConfig.gradient]}
      style={{ marginVertical: 8 }}
    >
      <View style={{ padding: Layout.spacing.lg }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: Layout.spacing.lg }}>
          <View
            style={{
              backgroundColor: `${intentConfig.primary}20`,
              borderRadius: 20,
              padding: 8,
              marginRight: Layout.spacing.md,
            }}
          >
            <Ionicons name="calendar" size={20} color={intentConfig.primary} />
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
              Training Schedule
            </Text>
            <Tag
              text={`${data.daysPerWeek} days per week`}
              gradient={[intentConfig.primary, intentConfig.primary]}
              size="small"
            />
          </View>
        </View>

        {/* Week Grid */}
        <View style={{ marginBottom: Layout.spacing.lg }}>
          <Text
            style={{
              color: Colors.text,
              fontSize: Typography.sizes.md,
              fontWeight: Typography.weights.semibold,
              marginBottom: Layout.spacing.md,
            }}
          >
            Weekly Split
          </Text>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 4,
            }}
          >
            {daysOfWeek.map((day) => {
              const dayKey = day.toLowerCase();
              const focus = dayFocusMap[dayKey] || dayFocusMap[day.toLowerCase().slice(0, 3)];
              const isAssigned = !!focus;
              
              return (
                <View
                  key={day}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    borderRadius: Layout.radius.button,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: isAssigned ? intentConfig.primary : 'rgba(255, 255, 255, 0.2)',
                  }}
                >
                  {isAssigned ? (
                    <GradientSurface
                      gradient={getFocusColor(focus)}
                      style={{ flex: 1, padding: 0 }}
                    >
                      <View
                        style={{
                          flex: 1,
                          justifyContent: 'center',
                          alignItems: 'center',
                          padding: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: Colors.white,
                            fontSize: Typography.sizes.xs,
                            fontWeight: Typography.weights.bold,
                            textAlign: 'center',
                            marginBottom: 2,
                          }}
                        >
                          {day}
                        </Text>
                        <Text
                          style={{
                            color: 'rgba(255, 255, 255, 0.9)',
                            fontSize: 8,
                            fontWeight: Typography.weights.medium,
                            textAlign: 'center',
                          }}
                          numberOfLines={2}
                        >
                          {focus}
                        </Text>
                      </View>
                    </GradientSurface>
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      <Text
                        style={{
                          color: Colors.subtext,
                          fontSize: Typography.sizes.xs,
                          fontWeight: Typography.weights.medium,
                        }}
                      >
                        {day}
                      </Text>
                      <Text
                        style={{
                          color: 'rgba(255, 255, 255, 0.3)',
                          fontSize: 8,
                          marginTop: 2,
                        }}
                      >
                        Rest
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Guidelines */}
        {data.deloadGuidelines && data.deloadGuidelines.length > 0 && (
          <View style={{ marginBottom: Layout.spacing.lg }}>
            <Text
              style={{
                color: Colors.text,
                fontSize: Typography.sizes.md,
                fontWeight: Typography.weights.semibold,
                marginBottom: Layout.spacing.sm,
              }}
            >
              📋 Guidelines
            </Text>
            <View style={{ gap: Layout.gap.xs }}>
              {data.deloadGuidelines.map((guideline, index) => (
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
                      backgroundColor: intentConfig.primary,
                      borderRadius: 6,
                      width: 12,
                      height: 12,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginRight: Layout.spacing.sm,
                      marginTop: 4,
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.white,
                        fontSize: 8,
                        fontWeight: Typography.weights.bold,
                      }}
                    >
                      •
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: Colors.text,
                      fontSize: Typography.sizes.sm,
                      lineHeight: 18,
                      flex: 1,
                    }}
                  >
                    {guideline}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          onPress={() => onSave?.(data)}
          style={{
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
            📅 Save Week Plan
          </Text>
        </TouchableOpacity>
      </View>
    </GradientSurface>
  );
};
