/**
 * WorkoutSaveModal - Modal for saving AI workouts to My Workouts
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { WorkoutPlanData } from '@/utils/aiMessage';
import { saveAIWorkoutToMyWorkouts, updateWorkoutVisibility } from '@/services/workoutService';
import { Colors, Layout, Typography } from '@/theme/ai';

interface WorkoutSaveModalProps {
  visible: boolean;
  onClose: () => void;
  workoutData: WorkoutPlanData;
  userId: string;
  username: string;
  onSuccess?: (workoutId: string) => void;
}

const visibilityOptions = [
  {
    value: 'private',
    label: 'Private',
    icon: 'lock-closed' as const,
    description: 'Only you can see this workout',
    color: '#666',
  },
  {
    value: 'followers',
    label: 'Followers Only',
    icon: 'people' as const,
    description: 'Only your followers can see this workout',
    color: '#4ECDC4',
  },
  {
    value: 'public',
    label: 'Public',
    icon: 'earth' as const,
    description: 'Anyone can see this workout',
    color: '#4CD964',
  },
];

export const WorkoutSaveModal: React.FC<WorkoutSaveModalProps> = ({
  visible,
  onClose,
  workoutData,
  userId,
  username,
  onSuccess,
}) => {
  const router = useRouter();
  const [title, setTitle] = useState(workoutData.dayType || 'AI Workout');
  const [description, setDescription] = useState(
    workoutData.safetyNotes || 'AI-generated workout plan tailored for you'
  );
  const [visibility, setVisibility] = useState<'private' | 'followers' | 'public'>('private');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your workout.');
      return;
    }

    setSaving(true);

    try {
      // Save the workout
      const result = await saveAIWorkoutToMyWorkouts(workoutData, userId, username);
      
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to save workout');
        return;
      }

      const workoutId = result.workoutId!;

      // Update visibility if not private (default)
      if (visibility !== 'private') {
        const visibilityResult = await updateWorkoutVisibility(workoutId, visibility, userId);
        if (!visibilityResult.success) {
          console.warn('Failed to update visibility:', visibilityResult.error);
          // Don't fail the whole operation for visibility update
        }
      }

      Alert.alert(
        'Workout Saved! 🎉',
        'Your AI workout has been added to "My Workouts". You can now edit it, share it, or change its visibility.',
        [
          {
            text: 'View in My Workouts',
            onPress: () => {
              onSuccess?.(workoutId);
              onClose();
              // Navigate to the workouts page
              router.push('/workouts');
            },
          },
          {
            text: 'Done',
            onPress: onClose,
            style: 'cancel',
          },
        ]
      );

    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetAndClose = () => {
    setTitle(workoutData.dayType || 'AI Workout');
    setDescription(workoutData.safetyNotes || 'AI-generated workout plan tailored for you');
    setVisibility('private');
    onClose();
  };

  const selectedVisibility = visibilityOptions.find(opt => opt.value === visibility)!;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={resetAndClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <BlurView intensity={20} style={styles.header}>
          <TouchableOpacity onPress={resetAndClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Add to My Workouts</Text>
          
          <TouchableOpacity 
            onPress={handleSave} 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </BlurView>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Workout Preview */}
          <View style={styles.previewSection}>
            <Text style={styles.sectionTitle}>📋 Workout Preview</Text>
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>{workoutData.dayType}</Text>
              <Text style={styles.previewMeta}>
                {workoutData.segments.length} segment{workoutData.segments.length !== 1 ? 's' : ''} • {' '}
                {workoutData.segments.reduce((total, seg) => total + seg.exercises.length, 0)} exercises
              </Text>
              
              <View style={styles.segmentsList}>
                {workoutData.segments.slice(0, 3).map((segment, index) => (
                  <View key={index} style={styles.segmentPreview}>
                    <Text style={styles.segmentName}>{segment.name}</Text>
                    <Text style={styles.segmentExercises}>
                      {segment.exercises.length} exercise{segment.exercises.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                ))}
                {workoutData.segments.length > 3 && (
                  <Text style={styles.moreSegments}>
                    +{workoutData.segments.length - 3} more segment{workoutData.segments.length - 3 !== 1 ? 's' : ''}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Customization */}
          <View style={styles.customizationSection}>
            <Text style={styles.sectionTitle}>✏️ Customize Your Workout</Text>
            
            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Workout Title</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter workout title..."
                placeholderTextColor={Colors.subtext}
                maxLength={100}
              />
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={description}
                onChangeText={setDescription}
                placeholder="Add a description..."
                placeholderTextColor={Colors.subtext}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </View>

            {/* Visibility Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Visibility</Text>
              <View style={styles.visibilityOptions}>
                {visibilityOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.visibilityOption,
                      visibility === option.value && styles.visibilityOptionSelected
                    ]}
                    onPress={() => setVisibility(option.value as 'private' | 'followers' | 'public')}
                  >
                    <View style={styles.visibilityIconContainer}>
                      <Ionicons 
                        name={option.icon} 
                        size={20} 
                        color={visibility === option.value ? option.color : Colors.subtext} 
                      />
                    </View>
                    <View style={styles.visibilityTextContainer}>
                      <Text style={[
                        styles.visibilityLabel,
                        visibility === option.value && { color: option.color }
                      ]}>
                        {option.label}
                      </Text>
                      <Text style={styles.visibilityDescription}>
                        {option.description}
                      </Text>
                    </View>
                    {visibility === option.value && (
                      <Ionicons name="checkmark-circle" size={20} color={option.color} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Note */}
          <View style={styles.noteSection}>
            <Text style={styles.noteText}>
              💡 <Text style={styles.noteHighlight}>Tip:</Text> After saving, you can edit exercises, 
              add photos, and customize your workout further in "My Workouts".
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
  },
  saveButton: {
    backgroundColor: '#4CD964',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Layout.radius.button,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Colors.subtext,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  previewSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: 16,
  },
  previewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Layout.radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewTitle: {
    color: Colors.text,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  previewMeta: {
    color: Colors.subtext,
    fontSize: Typography.sizes.sm,
    marginBottom: 16,
  },
  segmentsList: {
    gap: 8,
  },
  segmentPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Layout.radius.chip,
  },
  segmentName: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  segmentExercises: {
    color: Colors.subtext,
    fontSize: Typography.sizes.xs,
  },
  moreSegments: {
    color: Colors.subtext,
    fontSize: Typography.sizes.sm,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  customizationSection: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: Layout.radius.button,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: Typography.sizes.md,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  visibilityOptions: {
    gap: 12,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: Layout.radius.button,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  visibilityOptionSelected: {
    borderColor: '#4CD964',
    backgroundColor: 'rgba(76, 217, 100, 0.1)',
  },
  visibilityIconContainer: {
    marginRight: 12,
  },
  visibilityTextContainer: {
    flex: 1,
  },
  visibilityLabel: {
    color: Colors.text,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.medium,
    marginBottom: 2,
  },
  visibilityDescription: {
    color: Colors.subtext,
    fontSize: Typography.sizes.sm,
  },
  noteSection: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: Layout.radius.card,
    padding: 16,
    marginBottom: 32,
    borderLeftWidth: 3,
    borderLeftColor: '#4ECDC4',
  },
  noteText: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
  },
  noteHighlight: {
    color: '#4ECDC4',
    fontWeight: Typography.weights.semibold,
  },
});
