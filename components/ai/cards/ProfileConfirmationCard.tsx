/**
 * ProfileConfirmationCard - Displays user profile information for confirmation before workout generation
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientSurface } from '../atoms/GradientSurface';
import { Colors, Layout, Typography } from '@/theme/ai';

export interface ProfileConfirmationData {
  experience?: string;
  trainingFrequency?: string;
  goals?: string[];
  dislikes?: string[];
  injuries?: string[];
  equipment?: string[];
  preferences?: string[];
  workoutType?: string;
}

interface ProfileConfirmationCardProps {
  data: ProfileConfirmationData;
  message: string;
  onConfirm: () => void;
  onEdit: () => void;
}

export const ProfileConfirmationCard: React.FC<ProfileConfirmationCardProps> = ({
  data,
  message,
  onConfirm,
  onEdit,
}) => {
  const renderProfileItem = (icon: string, label: string, value: string | string[] | undefined, iconColor: string) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    
    const displayValue = Array.isArray(value) ? value.join(', ') : value;
    
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'flex-start',
        marginBottom: Layout.spacing.md,
        paddingVertical: Layout.spacing.sm,
        paddingHorizontal: Layout.spacing.md,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: Layout.radius.small,
        borderLeftWidth: 3,
        borderLeftColor: iconColor,
      }}>
        <Ionicons 
          name={icon as any} 
          size={20} 
          color={iconColor} 
          style={{ marginRight: Layout.spacing.sm, marginTop: 2 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: Typography.sizes.xs,
            fontWeight: Typography.weights.medium,
            marginBottom: 2,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            {label}
          </Text>
          <Text style={{
            color: Colors.text,
            fontSize: Typography.sizes.sm,
            fontWeight: Typography.weights.medium,
            lineHeight: 20,
          }}>
            {displayValue}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <GradientSurface
      gradient={['rgba(100, 70, 255, 0.15)', 'rgba(50, 35, 150, 0.1)']}
      borderGradient={['rgba(150, 120, 255, 0.4)', 'rgba(100, 70, 255, 0.2)']}
      style={{ marginVertical: 8 }}
    >
      <View style={{ padding: Layout.spacing.lg }}>
        {/* Header */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center',
          marginBottom: Layout.spacing.lg,
          paddingBottom: Layout.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(100, 70, 255, 0.2)',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: Layout.spacing.md,
          }}>
            <Ionicons name="checkmark-circle" size={24} color="#8B7DFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{
              color: Colors.text,
              fontSize: Typography.sizes.lg,
              fontWeight: Typography.weights.bold,
            }}>
              Confirm Your Profile
            </Text>
            <Text style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: Typography.sizes.xs,
              marginTop: 2,
            }}>
              Let's make sure everything is correct
            </Text>
          </View>
        </View>

        {/* Profile Information Grid */}
        <View style={{ marginBottom: Layout.spacing.lg }}>
          {renderProfileItem('barbell-outline', 'Experience Level', data.experience, '#FF6B6B')}
          {renderProfileItem('calendar-outline', 'Training Frequency', data.trainingFrequency, '#4ECDC4')}
          {renderProfileItem('trophy-outline', 'Primary Goals', data.goals, '#FFD93D')}
          {renderProfileItem('close-circle-outline', 'Exercise Dislikes', data.dislikes, '#FF8C42')}
          {renderProfileItem('medical-outline', 'Injuries/Limitations', data.injuries, '#FF6B9D')}
          {renderProfileItem('fitness-outline', 'Available Equipment', data.equipment, '#6BCF7F')}
          {renderProfileItem('heart-outline', 'Preferences', data.preferences, '#A78BFA')}
        </View>

        {/* Workout Type Callout */}
        {data.workoutType && (
          <View style={{
            backgroundColor: 'rgba(139, 125, 255, 0.15)',
            borderRadius: Layout.radius.button,
            padding: Layout.spacing.md,
            marginBottom: Layout.spacing.lg,
            borderWidth: 1,
            borderColor: 'rgba(139, 125, 255, 0.3)',
          }}>
            <Text style={{
              color: '#8B7DFF',
              fontSize: Typography.sizes.xs,
              fontWeight: Typography.weights.bold,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}>
              Generating Workout For
            </Text>
            <Text style={{
              color: Colors.text,
              fontSize: Typography.sizes.md,
              fontWeight: Typography.weights.bold,
            }}>
              {data.workoutType}
            </Text>
          </View>
        )}

        {/* Confirmation Message */}
        <Text style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: Typography.sizes.sm,
          lineHeight: 20,
          marginBottom: Layout.spacing.lg,
          textAlign: 'center',
        }}>
          Does this look correct? I'll use this information to create your personalized workout.{'\n'}
          <Text style={{ fontSize: Typography.sizes.xs, color: 'rgba(255, 255, 255, 0.5)' }}>
            (You can also type your response naturally)
          </Text>
        </Text>

        {/* Action Buttons */}
        <View style={{ 
          flexDirection: 'row', 
          gap: Layout.gap.md,
        }}>
          <TouchableOpacity
            onPress={onEdit}
            style={{
              flex: 1,
              paddingVertical: Layout.spacing.md,
              borderRadius: Layout.radius.button,
              borderWidth: 2,
              borderColor: 'rgba(255, 255, 255, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: Layout.gap.xs,
            }}
          >
            <Ionicons name="create-outline" size={18} color="rgba(255, 255, 255, 0.7)" />
            <Text style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: Typography.sizes.sm,
              fontWeight: Typography.weights.semibold,
            }}>
              Make Changes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onConfirm}
            style={{
              flex: 1,
              paddingVertical: Layout.spacing.md,
              borderRadius: Layout.radius.button,
              backgroundColor: '#8B7DFF',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: Layout.gap.xs,
              shadowColor: '#8B7DFF',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={{
              color: 'white',
              fontSize: Typography.sizes.sm,
              fontWeight: Typography.weights.bold,
            }}>
              Looks Good!
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </GradientSurface>
  );
};
