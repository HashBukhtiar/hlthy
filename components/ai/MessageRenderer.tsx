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
import { ProfileConfirmationCard, ProfileConfirmationData, WorkoutPreferences } from './cards/ProfileConfirmationCard';
import { Colors, Layout, Typography, getIntentConfig } from '@/theme/ai';
import { safeParseAssistant, WorkoutPlanData, TechniqueAdviceData, SchedulePlanData, ExplanationData } from '@/utils/aiMessage';

interface MessageRendererProps {
  message: string;
  intent?: string;
  workoutPlan?: any;
  responseType?: string;
  profileData?: ProfileConfirmationData;
  onFormatAgain?: () => void;
  onSaveWorkout?: (data: WorkoutPlanData) => void;
  onStartWorkout?: (data: WorkoutPlanData) => void;
  onSaveSchedule?: (data: SchedulePlanData) => void;
  onExplainChoices?: () => void;
  onShowExamples?: () => void;
  onApplySubstitutions?: (data: TechniqueAdviceData) => void;
  onConfirmProfile?: (preferences: WorkoutPreferences) => void;
  onEditProfile?: () => void;
  onEditWorkout?: (data: WorkoutPlanData) => void;
}

export const MessageRenderer: React.FC<MessageRendererProps> = ({
  message,
  intent,
  workoutPlan,
  responseType,
  profileData,
  onFormatAgain,
  onSaveWorkout,
  onStartWorkout,
  onSaveSchedule,
  onExplainChoices,
  onShowExamples,
  onApplySubstitutions,
  onConfirmProfile,
  onEditProfile,
  onEditWorkout,
}) => {
  const intentConfig = getIntentConfig(intent);

  // Handle workout_confirmation type
  if (responseType === 'workout_confirmation' && profileData) {
    return (
      <ProfileConfirmationCard
        data={profileData}
        message={message}
        onConfirm={onConfirmProfile || (() => {})}
        onEdit={onEditProfile || (() => {})}
      />
    );
  }

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
  if (workoutPlan && (responseType === 'workout_plan' || responseType === 'workout')) {
    console.log('MessageRenderer: Processing workout plan', { workoutPlan, responseType });
    console.log('MessageRenderer: Checking for segments array:', workoutPlan.segments);
    console.log('MessageRenderer: Warm-up exercises:', workoutPlan.warm_up);
    console.log('MessageRenderer: Main workout exercises:', workoutPlan.main_workout);
    console.log('MessageRenderer: Cool-down exercises:', workoutPlan.cool_down);
    
    // Transform API response format to match WorkoutPlanData interface
    const segments = [];
    
    // First, check if segments already exist in the new format
    if (workoutPlan.segments && Array.isArray(workoutPlan.segments)) {
      console.log('MessageRenderer: Found segments array with', workoutPlan.segments.length, 'segments');
      
      workoutPlan.segments.forEach((segment: any, index: number) => {
        console.log(`MessageRenderer: Processing segment ${index}:`, {
          type: segment.type,
          hasExercises: !!segment.exercises,
          exerciseCount: segment.exercises?.length
        });
        
        if (segment.exercises && segment.exercises.length > 0) {
          const segmentName = segment.type === 'warm_up' ? 'Warm-up' : 
                             segment.type === 'cool_down' ? 'Cool-down' :
                             segment.type === 'cardio' ? 'Cardio' :
                             segment.type === 'main_workout' ? (workoutPlan.name || 'Main Workout') :
                             segment.name || segment.type || 'Workout';
          
          segments.push({
            name: segmentName,
            exercises: segment.exercises.map((exercise: any) => ({
              exerciseId: exercise.exercise_id || exercise.id || exercise.name || '',
              exerciseName: exercise.name || exercise.exercise_name || exercise.exerciseName || 'Unknown Exercise',
              sets: exercise.sets || 3,
              reps: exercise.reps || '8-12',
              load: exercise.load || '',
              restSec: exercise.rest_seconds || exercise.rest || 60,
              notes: exercise.notes || ''
            }))
          });
        }
      });
    }
    
    // Fallback: Add warm-up segment if present in old format
    if (segments.length === 0 && workoutPlan.warm_up && workoutPlan.warm_up.length > 0) {
      segments.push({
        name: 'Warm-up',
        exercises: workoutPlan.warm_up.map((exercise: any) => ({
          exerciseId: exercise.exercise_id || exercise.id || '',
          exerciseName: exercise.name || exercise.exercise_name || exercise.exerciseName || 'Unknown Exercise',
          sets: exercise.sets || 1,
          reps: exercise.reps || exercise.duration || '30 seconds',
          load: exercise.load || '',
          restSec: exercise.rest_seconds || exercise.rest || 30,
          notes: exercise.notes || ''
        }))
      });
    }
    
    // Fallback: Add main workout segment if present in old format
    if (segments.length === 0 && workoutPlan.main_workout && workoutPlan.main_workout.length > 0) {
      segments.push({
        name: 'Main Workout',
        exercises: workoutPlan.main_workout.map((exercise: any) => ({
          exerciseId: exercise.exercise_id || exercise.id || '',
          exerciseName: exercise.name || exercise.exercise_name || exercise.exerciseName || 'Unknown Exercise',
          sets: exercise.sets || 3,
          reps: exercise.reps || '8-12',
          load: exercise.load || '',
          restSec: exercise.rest_seconds || exercise.rest || 60,
          notes: exercise.notes || ''
        }))
      });
    }
    
    // Fallback for flat exercises array (old format or simple response)
    if (segments.length === 0 && workoutPlan.exercises && workoutPlan.exercises.length > 0) {
      console.log('MessageRenderer: Using flat exercises array, first exercise:', workoutPlan.exercises[0]);
      segments.push({
        name: workoutPlan.name || 'Main Workout',
        exercises: workoutPlan.exercises.map((exercise: any) => {
          // Try multiple field name variations
          const exerciseName = exercise.name || 
                               exercise.exercise_name || 
                               exercise.exerciseName || 
                               exercise.exercise || 
                               exercise.exerciseId ||
                               'Unknown Exercise';
          
          console.log('MessageRenderer: Mapping exercise:', { 
            original: exercise, 
            mapped: exerciseName 
          });

          return {
            exerciseId: exercise.exercise_id || exercise.id || exercise.name || '',
            exerciseName: exerciseName,
            sets: exercise.sets || 3,
            reps: exercise.reps || '8-12',
            load: exercise.load || '',
            restSec: exercise.rest_seconds || exercise.rest || 60,
            notes: exercise.notes || ''
          };
        })
      });
    }
    
    // Add cool-down segment if present
    if (workoutPlan.cool_down && workoutPlan.cool_down.length > 0) {
      segments.push({
        name: 'Cool-down',
        exercises: workoutPlan.cool_down.map((exercise: any) => ({
          exerciseId: exercise.exercise_id || exercise.id || '',
          exerciseName: exercise.name || exercise.exercise_name || exercise.exerciseName || 'Unknown Exercise',
          sets: exercise.sets || 1,
          reps: exercise.reps || exercise.duration || '30 seconds',
          load: exercise.load || '',
          restSec: exercise.rest_seconds || exercise.rest || 15,
          notes: exercise.notes || ''
        }))
      });
    }

    const workoutData: WorkoutPlanData = {
      dayType: workoutPlan.focus || 'Full Body',
      segments: segments,
      safetyNotes: workoutPlan.safety_considerations?.join('. ') || undefined
    };

    console.log('MessageRenderer: Created workout data', { workoutData, segments: segments.length });

    return (
      <WorkoutPlanCard
        data={workoutData}
        intent={intent}
        onSave={handleSaveWorkout}
        onExplain={handleExplainChoices}
        onEdit={onEditWorkout}
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
          onEdit={onEditWorkout}
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
