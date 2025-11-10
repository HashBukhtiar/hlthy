/**
 * ProfileConfirmationCard - Displays user profile information for confirmation before workout generation
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientSurface } from '../atoms/GradientSurface';
import { Colors, Layout, Typography } from '@/theme/ai';

export interface WorkoutPreferences {
  includeWarmup: boolean;
  includeCooldown: boolean;
  includeCardio: boolean;
}

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
  onConfirm: (preferences: WorkoutPreferences) => void;
  onEdit: () => void;
}

export const ProfileConfirmationCard: React.FC<ProfileConfirmationCardProps> = ({
  data,
  message,
  onConfirm,
  onEdit,
}) => {
  const [preferences, setPreferences] = useState<WorkoutPreferences>({
    includeWarmup: true,
    includeCooldown: true,
    includeCardio: false,
  });
  const renderProfileItem = (icon: string, label: string, value: string | string[] | undefined, iconColor: string) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    
    const displayValue = Array.isArray(value) ? value.join(', ') : value;
    
    return (
      <View style={{ 
        flexDirection: 'row', 
        alignItems: 'center',
        marginBottom: Layout.spacing.sm,
        paddingVertical: Layout.spacing.sm,
        paddingHorizontal: Layout.spacing.md,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: Layout.radius.chip,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
      }}>
        <View style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: iconColor + '20',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: Layout.spacing.sm,
        }}>
          <Ionicons 
            name={icon as any} 
            size={16} 
            color={iconColor} 
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: Typography.sizes.xs,
            fontWeight: Typography.weights.medium,
            marginBottom: 1,
          }}>
            {label}
          </Text>
          <Text style={{
            color: Colors.text,
            fontSize: Typography.sizes.sm,
            fontWeight: Typography.weights.semibold,
            lineHeight: 18,
          }}>
            {displayValue}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ 
      marginVertical: 8, 
      maxWidth: '92%', 
      alignSelf: 'flex-start',
      backgroundColor: '#0E0E12',
      borderRadius: Layout.radius.card,
      borderWidth: 1,
      borderColor: 'rgba(139, 125, 255, 0.3)',
      overflow: 'hidden',
      shadowColor: '#8B7DFF',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
    }}>
      <View style={{ padding: Layout.spacing.xl }}>
        {/* Compact Header */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center',
          marginBottom: Layout.spacing.lg,
        }}>
          <View style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#8B7DFF',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: Layout.spacing.sm,
            shadowColor: '#8B7DFF',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: 8,
          }}>
            <Ionicons name="fitness" size={20} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{
              color: Colors.text,
              fontSize: Typography.sizes.md,
              fontWeight: Typography.weights.bold,
              letterSpacing: 0.3,
            }}>
              Ready to Build Your Workout?
            </Text>
            <Text style={{
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: Typography.sizes.xs,
              marginTop: 2,
            }}>
              Quick profile check
            </Text>
          </View>
        </View>

        {/* Profile Information - Compact Grid */}
        <View style={{ marginBottom: Layout.spacing.md }}>
          {renderProfileItem('barbell-outline', 'Experience', data.experience, '#FF6B6B')}
          {renderProfileItem('calendar-outline', 'Training Frequency', data.trainingFrequency, '#4ECDC4')}
          {renderProfileItem('trophy-outline', 'Goals', data.goals, '#FFD93D')}
          {renderProfileItem('close-circle-outline', 'Dislikes', data.dislikes, '#FF8C42')}
          {renderProfileItem('medical-outline', 'Injuries', data.injuries, '#FF6B9D')}
          {renderProfileItem('fitness-outline', 'Equipment', data.equipment, '#6BCF7F')}
          {renderProfileItem('heart-outline', 'Preferences', data.preferences, '#A78BFA')}
        </View>

        {/* Workout Type Callout */}
        {data.workoutType && (
          <View style={{
            backgroundColor: 'rgba(139, 125, 255, 0.12)',
            borderRadius: Layout.radius.chip,
            padding: Layout.spacing.md,
            marginBottom: Layout.spacing.md,
            borderWidth: 1,
            borderColor: 'rgba(139, 125, 255, 0.25)',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="barbell" size={16} color="#8B7DFF" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: 'rgba(139, 125, 255, 0.7)',
                  fontSize: Typography.sizes.xs,
                  fontWeight: Typography.weights.medium,
                  marginBottom: 2,
                }}>
                  Generating for
                </Text>
                <Text style={{
                  color: '#8B7DFF',
                  fontSize: Typography.sizes.md,
                  fontWeight: Typography.weights.bold,
                }}>
                  {data.workoutType}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Workout Structure Preferences */}
        <View style={{
          marginTop: Layout.spacing.md,
          marginBottom: Layout.spacing.md,
        }}>
          <Text style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: Typography.sizes.sm,
            fontWeight: Typography.weights.semibold,
            marginBottom: Layout.spacing.sm,
          }}>
            Workout Structure
          </Text>
          
          <View style={{ gap: Layout.gap.xs }}>
            <TouchableOpacity
              onPress={() => setPreferences({...preferences, includeWarmup: !preferences.includeWarmup})}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: Layout.spacing.sm,
                paddingHorizontal: Layout.spacing.md,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRadius: Layout.radius.chip,
                borderWidth: 1,
                borderColor: preferences.includeWarmup ? 'rgba(139, 125, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <Ionicons
                name={preferences.includeWarmup ? "checkbox" : "square-outline"}
                size={22}
                color={preferences.includeWarmup ? '#8B7DFF' : 'rgba(255, 255, 255, 0.3)'}
                style={{ marginRight: Layout.spacing.sm }}
              />
              <Text style={{
                color: preferences.includeWarmup ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)',
                fontSize: Typography.sizes.sm,
                fontWeight: Typography.weights.medium,
              }}>
                Include warm-up exercises
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setPreferences({...preferences, includeCooldown: !preferences.includeCooldown})}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: Layout.spacing.sm,
                paddingHorizontal: Layout.spacing.md,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRadius: Layout.radius.chip,
                borderWidth: 1,
                borderColor: preferences.includeCooldown ? 'rgba(139, 125, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <Ionicons
                name={preferences.includeCooldown ? "checkbox" : "square-outline"}
                size={22}
                color={preferences.includeCooldown ? '#8B7DFF' : 'rgba(255, 255, 255, 0.3)'}
                style={{ marginRight: Layout.spacing.sm }}
              />
              <Text style={{
                color: preferences.includeCooldown ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)',
                fontSize: Typography.sizes.sm,
                fontWeight: Typography.weights.medium,
              }}>
                Include cool-down/stretching
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setPreferences({...preferences, includeCardio: !preferences.includeCardio})}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: Layout.spacing.sm,
                paddingHorizontal: Layout.spacing.md,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRadius: Layout.radius.chip,
                borderWidth: 1,
                borderColor: preferences.includeCardio ? 'rgba(139, 125, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)',
              }}
            >
              <Ionicons
                name={preferences.includeCardio ? "checkbox" : "square-outline"}
                size={22}
                color={preferences.includeCardio ? '#8B7DFF' : 'rgba(255, 255, 255, 0.3)'}
                style={{ marginRight: Layout.spacing.sm }}
              />
              <Text style={{
                color: preferences.includeCardio ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)',
                fontSize: Typography.sizes.sm,
                fontWeight: Typography.weights.medium,
              }}>
                Include cardio finisher
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirmation Message */}
        <Text style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: Typography.sizes.xs,
          lineHeight: 18,
          marginBottom: Layout.spacing.md,
          textAlign: 'center',
        }}>
          Confirm to generate or type your changes naturally
        </Text>

        {/* Action Buttons - Modern Style */}
        <View style={{ 
          flexDirection: 'row', 
          gap: Layout.gap.sm,
        }}>
          <TouchableOpacity
            onPress={onEdit}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: Layout.radius.button,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
            }}
          >
            <Ionicons name="create-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
            <Text style={{
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: Typography.sizes.sm,
              fontWeight: Typography.weights.semibold,
            }}>
              Edit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onConfirm(preferences)}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: Layout.radius.button,
              backgroundColor: '#8B7DFF',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 6,
              shadowColor: '#8B7DFF',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 10,
              elevation: 10,
            }}
          >
            <Ionicons name="checkmark-circle" size={18} color="white" />
            <Text style={{
              color: 'white',
              fontSize: Typography.sizes.sm,
              fontWeight: Typography.weights.bold,
            }}>
              Confirm
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
