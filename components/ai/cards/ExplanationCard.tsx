/**
 * ExplanationCard - Neon notes for educational content
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientSurface } from '../atoms/GradientSurface';
import { Colors, Layout, Typography, getIntentConfig } from '@/theme/ai';
import { ExplanationData } from '@/utils/aiMessage';

interface ExplanationCardProps {
  data: ExplanationData;
  intent?: string;
  onShowExamples?: () => void;
}

export const ExplanationCard: React.FC<ExplanationCardProps> = ({
  data,
  intent,
  onShowExamples,
}) => {
  const intentConfig = getIntentConfig(intent);

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
            <Text style={{ fontSize: 18 }}>{intentConfig.icon}</Text>
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
              {data.topic}
            </Text>
            <Text
              style={{
                color: intentConfig.primary,
                fontSize: Typography.sizes.sm,
                fontWeight: Typography.weights.medium,
              }}
            >
              Educational Content
            </Text>
          </View>
        </View>

        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
          {/* Key Points */}
          <View style={{ marginBottom: Layout.spacing.lg }}>
            <Text
              style={{
                color: Colors.text,
                fontSize: Typography.sizes.md,
                fontWeight: Typography.weights.semibold,
                marginBottom: Layout.spacing.md,
              }}
            >
              🎯 Key Points
            </Text>
            <View style={{ gap: Layout.gap.sm }}>
              {data.keyPoints.map((point, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: Layout.radius.button,
                    padding: Layout.spacing.md,
                    borderLeftWidth: 3,
                    borderLeftColor: intentConfig.primary,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View
                      style={{
                        backgroundColor: intentConfig.primary,
                        borderRadius: 10,
                        width: 20,
                        height: 20,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: Layout.spacing.sm,
                        marginTop: 2,
                      }}
                    >
                      <Text
                        style={{
                          color: Colors.white,
                          fontSize: Typography.sizes.xs,
                          fontWeight: Typography.weights.bold,
                        }}
                      >
                        {index + 1}
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: Colors.text,
                        fontSize: Typography.sizes.sm,
                        lineHeight: 20,
                        flex: 1,
                      }}
                    >
                      {point}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Safety Considerations */}
          {data.safetyConsiderations && data.safetyConsiderations.length > 0 && (
            <View style={{ marginBottom: Layout.spacing.md }}>
              <Text
                style={{
                  color: Colors.text,
                  fontSize: Typography.sizes.md,
                  fontWeight: Typography.weights.semibold,
                  marginBottom: Layout.spacing.md,
                }}
              >
                ⚠️ Safety Considerations
              </Text>
              <View style={{ gap: Layout.gap.sm }}>
                {data.safetyConsiderations.map((consideration, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: 'rgba(255, 176, 32, 0.1)',
                      borderRadius: Layout.radius.button,
                      padding: Layout.spacing.md,
                      borderLeftWidth: 3,
                      borderLeftColor: Colors.warn,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <Ionicons
                        name="shield-checkmark"
                        size={16}
                        color={Colors.warn}
                        style={{ marginRight: Layout.spacing.sm, marginTop: 2 }}
                      />
                      <Text
                        style={{
                          color: Colors.text,
                          fontSize: Typography.sizes.sm,
                          lineHeight: 20,
                          flex: 1,
                        }}
                      >
                        {consideration}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* CTA */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: 'rgba(255, 255, 255, 0.1)',
            paddingTop: Layout.spacing.md,
          }}
        >
          <TouchableOpacity
            onPress={onShowExamples}
            style={{
              backgroundColor: 'transparent',
              paddingVertical: Layout.spacing.md,
              paddingHorizontal: Layout.spacing.lg,
              borderRadius: Layout.radius.button,
              borderWidth: 1,
              borderColor: intentConfig.primary,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: intentConfig.primary,
                fontSize: Typography.sizes.md,
                fontWeight: Typography.weights.medium,
              }}
            >
              💡 Show Examples
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </GradientSurface>
  );
};
