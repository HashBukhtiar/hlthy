/**
 * MessageRenderer - Main component that renders AI messages as premium cards or text
 */
import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientSurface } from './atoms/GradientSurface';
import { WorkoutPlanCard } from './cards/WorkoutPlanCard';
import { TechniqueAdviceCard } from './cards/TechniqueAdviceCard';
import { SchedulePlanCard } from './cards/SchedulePlanCard';
import { ExplanationCard } from './cards/ExplanationCard';
import { Colors, Layout, Typography, getIntentConfig } from '@/theme/ai';
import { safeParseAssistant, WorkoutPlanData, TechniqueAdviceData, SchedulePlanData, ExplanationData } from '@/utils/aiMessage';

interface MessageRendererProps {
  message: string;
  intent?: string;
  workoutPlan?: any;
  responseType?: string;
  onFormatAgain?: () => void;
  onSaveWorkout?: (data: WorkoutPlanData) => void;
  onStartWorkout?: (data: WorkoutPlanData) => void;
  onSaveSchedule?: (data: SchedulePlanData) => void;
  onExplainChoices?: () => void;
  onShowExamples?: () => void;
  onApplySubstitutions?: (data: TechniqueAdviceData) => void;
}

export const MessageRenderer: React.FC<MessageRendererProps> = ({
  message,
  intent,
  workoutPlan,
  responseType,
  onFormatAgain,
  onSaveWorkout,
  onStartWorkout,
  onSaveSchedule,
  onExplainChoices,
  onShowExamples,
  onApplySubstitutions,
}) => {
  const intentConfig = getIntentConfig(intent);

  // Fallback to parsing message text for most cases
  const parsed = safeParseAssistant(message);

  // Handle card actions
  const handleSaveWorkout = (data: WorkoutPlanData) => {
    onSaveWorkout?.(data);
    Alert.alert('Workout Saved', 'Your workout has been saved to your library!');
  };

  const handleStartWorkout = (data: WorkoutPlanData) => {
    onStartWorkout?.(data);
    Alert.alert('Starting Workout', 'Opening workout session...');
  };

  const handleSaveSchedule = (data: SchedulePlanData) => {
    onSaveSchedule?.(data);
    Alert.alert('Schedule Saved', 'Your training schedule has been saved!');
  };

  const handleExplainChoices = () => {
    onExplainChoices?.();
  };

  const handleShowExamples = () => {
    onShowExamples?.();
  };

  const handleApplySubstitutions = (data: TechniqueAdviceData) => {
    onApplySubstitutions?.(data);
    Alert.alert('Substitutions Applied', 'Your workout has been updated with safer alternatives.');
  };

  // If we have structured workout plan data from the API, use it directly
  if (workoutPlan && responseType === 'workout_plan') {
    const workoutData: WorkoutPlanData = {
      dayType: workoutPlan.dayType || 'Full Body',
      segments: workoutPlan.segments || [],
      safetyNotes: workoutPlan.safetyNotes || undefined
    };

    return (
      <WorkoutPlanCard
        data={workoutData}
        intent={intent}
        onSave={handleSaveWorkout}
        onExplain={handleExplainChoices}
      />
    );
  }

  // Render based on parsed type
  switch (parsed.type) {
    case 'workoutPlan':
      return (
        <WorkoutPlanCard
          data={parsed.data as WorkoutPlanData}
          intent={intent}
          onSave={handleSaveWorkout}
          onExplain={handleExplainChoices}
        />
      );

    case 'techniqueAdvice':
      return (
        <TechniqueAdviceCard
          data={parsed.data as TechniqueAdviceData}
          onApplySubstitutions={handleApplySubstitutions}
        />
      );

    case 'schedulePlan':
      return (
        <SchedulePlanCard
          data={parsed.data as SchedulePlanData}
          intent={intent}
          onSave={handleSaveSchedule}
        />
      );

    case 'explanation':
      return (
        <ExplanationCard
          data={parsed.data as ExplanationData}
          intent={intent}
          onShowExamples={handleShowExamples}
        />
      );

    case 'text':
    default:
      // Fallback to pretty text bubble
      return (
        <PrettyTextBubble
          message={message}
          intent={intent}
          onFormatAgain={onFormatAgain}
        />
      );
  }
};

// Pretty text bubble for fallback cases
interface PrettyTextBubbleProps {
  message: string;
  intent?: string;
  onFormatAgain?: () => void;
}

const PrettyTextBubble: React.FC<PrettyTextBubbleProps> = ({
  message,
  intent,
  onFormatAgain,
}) => {
  const intentConfig = getIntentConfig(intent);

  // Format message with better structure
  const formatMessage = (text: string) => {
    // Split into paragraphs and format
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map((paragraph, index) => {
      const trimmedParagraph = paragraph.trim();
      
      // Handle headers (short lines without punctuation)
      if (trimmedParagraph.length < 60 && !trimmedParagraph.includes('.') && index < paragraphs.length - 1) {
        return (
          <Text
            key={index}
            style={{
              color: intentConfig.primary,
              fontSize: Typography.sizes.md,
              fontWeight: Typography.weights.bold,
              marginBottom: Layout.spacing.sm,
              marginTop: index > 0 ? Layout.spacing.md : 0,
            }}
          >
            {trimmedParagraph}
          </Text>
        );
      }
      
      // Handle bullet points and lists
      if (trimmedParagraph.includes('•') || trimmedParagraph.includes('-') || /^\d+\./.test(trimmedParagraph)) {
        const lines = trimmedParagraph.split('\n').map(line => line.trim()).filter(line => line);
        return (
          <View key={index} style={{ marginBottom: Layout.spacing.sm }}>
            {lines.map((line, lineIndex) => {
              const cleanLine = line.replace(/^[•\-]\s*/, '').replace(/^\d+\.\s*/, '');
              const isNumbered = /^\d+\./.test(line);
              const bulletChar = isNumbered ? `${line.match(/^\d+/)?.[0]}.` : '•';
              
              return (
                <View
                  key={lineIndex}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    marginBottom: Layout.spacing.xs,
                  }}
                >
                  <Text
                    style={{
                      color: intentConfig.primary,
                      fontSize: Typography.sizes.sm,
                      fontWeight: Typography.weights.semibold,
                      marginRight: Layout.spacing.sm,
                      marginTop: 2,
                    }}
                  >
                    {bulletChar}
                  </Text>
                  <Text
                    style={{
                      color: Colors.text,
                      fontSize: Typography.sizes.sm,
                      lineHeight: 20,
                      flex: 1,
                    }}
                  >
                    {cleanLine}
                  </Text>
                </View>
              );
            })}
          </View>
        );
      }
      
      // Regular paragraphs
      return (
        <Text
          key={index}
          style={{
            color: Colors.text,
            fontSize: Typography.sizes.sm,
            lineHeight: 22,
            marginBottom: Layout.spacing.sm,
          }}
        >
          {trimmedParagraph}
        </Text>
      );
    });
  };

  return (
    <GradientSurface
      gradient={['rgba(16, 17, 20, 0.95)', 'rgba(12, 12, 17, 0.98)']}
      borderGradient={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.05)']}
      style={{ marginVertical: 8 }}
    >
      <View style={{ padding: Layout.spacing.lg }}>
        {/* Content */}
        <View style={{ marginBottom: Layout.spacing.md }}>
          {formatMessage(message)}
        </View>

        {/* Actions */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: 'rgba(255, 255, 255, 0.1)',
            paddingTop: Layout.spacing.md,
            flexDirection: 'row',
            justifyContent: 'center',
          }}
        >
          <TouchableOpacity
            onPress={onFormatAgain}
            style={{
              paddingVertical: Layout.spacing.sm,
              paddingHorizontal: Layout.spacing.md,
              borderRadius: Layout.radius.chip,
              borderWidth: 1,
              borderColor: intentConfig.primary,
              flexDirection: 'row',
              alignItems: 'center',
              gap: Layout.gap.xs,
            }}
          >
            <Ionicons name="refresh-outline" size={16} color={intentConfig.primary} />
            <Text
              style={{
                color: intentConfig.primary,
                fontSize: Typography.sizes.sm,
                fontWeight: Typography.weights.medium,
              }}
            >
              Format Again
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </GradientSurface>
  );
};
