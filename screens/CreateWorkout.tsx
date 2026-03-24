import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/globalStyles';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { storage } from '@/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { WorkoutRepository } from '@/features/workouts/infra/workoutRepository';
import SelectExercise from './SelectExercise';
import { Exercise } from '@/data/exercises';
import { CustomSelector, SelectorItem } from '@/components/CustomSelector';
import { generateId, generateUniqueFilename } from '@/logic/idGenerator';
import { ACCENT_COLOR } from '@/constants/Colors';
import MentionTextInput from '@/components/MentionTextInput';
import { MentionData } from '@/features/mentions/domain/Mention';
import { TagInput } from '@/components/TagInput';

// Visibility options for workouts
const visibilityItems: SelectorItem[] = [
    { 
        label: 'Public', 
        value: 'public',
        icon: 'earth',
        description: 'Anyone can see this workout'
    },
    { 
        label: 'Followers Only', 
        value: 'followers',
        icon: 'people',
        description: 'Only your followers can see this workout'
    },
    { 
        label: 'Private', 
        value: 'private',
        icon: 'lock-closed',
        description: 'Only you can see this workout'
    }
];



import {
  WorkoutDraftExercise as WorkoutExercise,
  WorkoutDraftSegment as WorkoutSegment,
} from '@/features/workouts/domain/WorkoutDraft';

export default function CreateWorkout() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionMentions, setDescriptionMentions] = useState<MentionData[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [segments, setSegments] = useState<WorkoutSegment[]>([
    {
      id: generateId(),
      name: 'Warm Up',
      length: '15',
      exercises: []
    }
  ]);
  const [visibility, setVisibility] = useState<string>('public');
  const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null);
  const [titleFocused, setTitleFocused] = useState(false);
  const [descriptionFocused, setDescriptionFocused] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const borderAnimation = useRef(new Animated.Value(0)).current;
  const descriptionAnimation = useRef(new Animated.Value(0)).current;

  const animateBorderIn = () => {
    setTitleFocused(true);
    Animated.timing(borderAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const animateBorderOut = () => {
    setTitleFocused(false);
    Animated.timing(borderAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const animatedBorderOpacity = borderAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.8],
  });

  const animateDescriptionIn = () => {
    setDescriptionFocused(true);
    Animated.timing(descriptionAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const animateDescriptionOut = () => {
    setDescriptionFocused(false);
    Animated.timing(descriptionAnimation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const animatedDescriptionBorder = descriptionAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.3)'],
  });

  const animatedDescriptionBackground = descriptionAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.08)'],
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setCoverImage(result.assets[0].uri);
    }
  };

  const addExercise = (segmentId: string) => {
    setCurrentSegmentId(segmentId);
    setCurrentExerciseId(null); // null means adding new exercise
    setShowExerciseSelector(true);
  };

  const editExercise = (segmentId: string, exerciseId: string) => {
    setCurrentSegmentId(segmentId);
    setCurrentExerciseId(exerciseId); // specific ID means editing existing exercise
    setShowExerciseSelector(true);
  };

  const handleSelectExercise = (exercise: Exercise) => {
    if (!currentSegmentId) return;
    
    const updatedSegments = segments.map(segment => {
      if (segment.id === currentSegmentId) {
        if (currentExerciseId) {
          // Update existing exercise
          return {
            ...segment,
            exercises: segment.exercises.map(ex => 
              ex.id === currentExerciseId 
                ? { ...ex, name: exercise.name }
                : ex
            )
          };
        } else {
          // Add new exercise
          return {
            ...segment,
            exercises: [
              ...segment.exercises,
              {
                id: generateId(),
                name: exercise.name,
                sets: '',
                reps: ''
              }
            ]
          };
        }
      }
      return segment;
    });
    
    setSegments(updatedSegments);
    setShowExerciseSelector(false);
    setCurrentSegmentId(null);
    setCurrentExerciseId(null);
    
    // Scroll down after adding exercise
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const addSegment = () => {
    const newSegment = {
      id: generateId(),
      name: 'New Segment',
      length: '30',
      exercises: []
    };
    
    setSegments([...segments, newSegment]);
    
    // Scroll down after adding segment
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const updateExercise = (segmentId: string, exerciseId: string, field: 'name' | 'sets' | 'reps', value: string) => {
    const updatedSegments = segments.map(segment => {
      if (segment.id === segmentId) {
        return {
          ...segment,
          exercises: segment.exercises.map(exercise => {
            if (exercise.id === exerciseId) {
              return {
                ...exercise,
                [field]: value
              };
            }
            return exercise;
          })
        };
      }
      return segment;
    });
    
    setSegments(updatedSegments);
  };

  const updateSegment = (segmentId: string, field: 'name' | 'length', value: string) => {
    const updatedSegments = segments.map(segment => {
      if (segment.id === segmentId) {
        return {
          ...segment,
          [field]: field === 'length' ? value.replace(/[^0-9]/g, '') : value
        };
      }
      return segment;
    });
    
    setSegments(updatedSegments);
  };

  const removeExercise = (segmentId: string, exerciseId: string) => {
    const updatedSegments = segments.map(segment => {
      if (segment.id === segmentId) {
        return {
          ...segment,
          exercises: segment.exercises.filter(exercise => exercise.id !== exerciseId)
        };
      }
      return segment;
    });
    
    setSegments(updatedSegments);
  };

  const removeSegment = (segmentId: string) => {
    if (segments.length === 1) {
      Alert.alert('Cannot Remove', 'You need at least one segment in your workout.');
      return;
    }
    
    setSegments(segments.filter(segment => segment.id !== segmentId));
  };

  const saveWorkout = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'You must be logged in to create a workout.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Missing Information', 'Please add a title for your workout.');
      return;
    }
    const hasExercises = segments.some(segment => segment.exercises.length > 0 && segment.exercises.some(ex => ex.name.trim() !== ''));
    if (!hasExercises) {
      Alert.alert('Missing Information', 'Please add at least one exercise with a name to your workout.');
      return;
    }

    setIsSaving(true);

    try {
      const draft = {
        title: title.trim(),
        description: description.trim(),
        visibility: visibility as 'public' | 'followers' | 'private',
        segments,
        mentions: descriptionMentions.length > 0 ? descriptionMentions : undefined,
        tags: tags.length > 0 ? tags : undefined,
      };
      const username = (currentUser as any).username || currentUser.displayName || 'Anonymous';

      if (coverImage) {
        // Create the workout first to obtain the workoutId for Storage metadata.
        const workoutId = await WorkoutRepository.createDocument(currentUser.uid, username, draft);

        const response = await fetch(coverImage);
        const blob = await response.blob();
        const imageName = `workoutCovers/${currentUser.uid}/${generateUniqueFilename(title.replace(/\s+/g, '_'), 'jpg')}`;
        const storageRef = ref(storage, imageName);
        await uploadBytes(storageRef, blob, { customMetadata: { workoutId } });
        const coverImageUrl = await getDownloadURL(storageRef);
        await WorkoutRepository.updateCoverImageUrl(workoutId, coverImageUrl);
      } else {
        await WorkoutRepository.createDocument(currentUser.uid, username, draft);
      }

      Alert.alert(
        'Workout Created',
        'Your workout has been created successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error saving workout: ', error);
      Alert.alert('Error', 'Could not save workout. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} disabled={isSaving}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Workout</Text>
        <TouchableOpacity onPress={saveWorkout} disabled={isSaving}>
          <View style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}>
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 200 }}
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode='on-drag'
      >
        {/* Workout Details Section */}
        <View style={styles.mainSection}>
          {/* Cover Image */}
          <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.coverImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={40} color="#666" />
                <Text style={styles.placeholderText}>Add Cover Image</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Title Input */}
          <View style={styles.inputContainer}>
            <Animated.View
              style={[
                styles.transparentTextInput,
                {
                  borderBottomWidth: 2,
                  borderBottomColor: animatedBorderOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.8)']
                  })
                }
              ]}
            >
              <TextInput
                style={styles.animatedTextInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Workout Title"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                maxLength={40}
                onFocus={animateBorderIn}
                onBlur={animateBorderOut}
              />
            </Animated.View>
          </View>

          {/* Description Input */}
          <View style={styles.descriptionContainer}>
            <Animated.View 
              style={[
                styles.descriptionWrapper,
                {
                  borderColor: animatedDescriptionBorder,
                  backgroundColor: animatedDescriptionBackground,
                }
              ]}
            >
              <View style={styles.descriptionHeader}>
                <Ionicons name="document-text-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.descriptionLabel}>Description</Text>
                <Text style={styles.descriptionOptional}>Optional</Text>
              </View>
              <MentionTextInput
                inputRef={descriptionInputRef}
                style={styles.descriptionInput}
                value={description}
                onChangeText={setDescription}
                mentions={descriptionMentions}
                onMentionsChange={setDescriptionMentions}
                placeholder="Tell others what makes this workout special..."
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                multiline
                numberOfLines={4}
                maxLength={200}
                onFocus={animateDescriptionIn}
                onBlur={animateDescriptionOut}
              />
              <View style={styles.descriptionFooter}>
                <Text style={styles.characterCount}>
                  {description.length}/200
                </Text>
              </View>
            </Animated.View>
          </View>

          {/* Tags Section */}
          <View style={styles.tagsSection}>
            <TagInput tags={tags} onTagsChange={setTags} />
          </View>

          {/* Visibility Setting */}
          <View style={styles.visibilityContainer}>
            <CustomSelector
              items={visibilityItems}
              value={visibility}
              onSelect={setVisibility}
              placeholder="Select visibility"
              title="Visibility"
              icon="eye-outline"
              modalVisible={visibilityModalVisible}
              setModalVisible={setVisibilityModalVisible}
              variant="fullWidth"
            />
          </View>
        </View>
        
        {/* Workout Structure Section */}
        <View style={styles.mainSection}>
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="barbell-outline" size={20} color="#FFF" />
              <Text style={styles.sectionTitle}>Workout Structure</Text>
          </View>
        </View>

        {segments.map((segment, segmentIndex) => (
          <View key={segment.id} style={styles.segmentContainer}>
            {/* ... Segment Header (Name, Length, Remove Segment) ... */}
            <View style={styles.segmentHeader}>
              <View style={styles.segmentTitleContainer}>
                <Text style={styles.segmentLabel}>Segment {segmentIndex + 1}</Text>
                <TouchableOpacity onPress={() => !isSaving && removeSegment(segment.id)} disabled={isSaving}>
                    <Ionicons name="trash-outline" size={20} color={isSaving ? "#666" : ACCENT_COLOR} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.segmentInputRow}>
                <View style={styles.segmentInputContainer}>
                  <Text style={styles.segmentInputLabel}>Name</Text>
                  <TextInput
                    style={styles.segmentInput}
                    value={segment.name}
                    onChangeText={(value) => updateSegment(segment.id, 'name', value)}
                    placeholder="e.g., Warm Up"
                    placeholderTextColor="#666"
                    editable={!isSaving}
                  />
                </View>
                
                <View style={styles.segmentInputContainer}>
                  <Text style={styles.segmentInputLabel}>Length (minutes)</Text>
                  <TextInput
                    style={styles.segmentInput}
                    value={segment.length}
                    onChangeText={(value) => updateSegment(segment.id, 'length', value)}
                    placeholder="e.g., 15"
                    placeholderTextColor="#666"
                    editable={!isSaving}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

          {/* Exercises in this segment */}
            <View style={styles.exercisesContainer}>
              {segment.exercises.map((exercise, exerciseIndex) => (
                <View key={exercise.id} style={styles.exerciseItem}>
                  <View style={styles.exerciseNumberContainer}>
                    <Text style={styles.exerciseNumber}>{exerciseIndex + 1}</Text>
                  </View>
                  
                  <View style={styles.exerciseInputContainer}>
                    <TouchableOpacity 
                      onPress={() => !isSaving && editExercise(segment.id, exercise.id)}
                      disabled={isSaving}
                    >
                      <Text style={[styles.exerciseNameInput, !exercise.name && styles.exerciseNamePlaceholder]}>
                        {exercise.name || 'Tap to select exercise'}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.exerciseDetailsContainer}>
                      <TextInput
                        style={styles.exerciseDetailInput}
                        value={exercise.sets}
                        onChangeText={(value) => updateExercise(segment.id, exercise.id, 'sets', value)}
                        placeholder="Sets"
                        placeholderTextColor="#666"
                        keyboardType="number-pad"
                        editable={!isSaving}
                      />
                      <Text style={styles.exerciseDetailSeparator}>×</Text>
                      <TextInput
                        style={styles.exerciseDetailInput}
                        value={exercise.reps}
                        onChangeText={(value) => updateExercise(segment.id, exercise.id, 'reps', value)}
                        placeholder="Reps"
                        placeholderTextColor="#666"
                        keyboardType="number-pad"
                        editable={!isSaving}
                      />
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.removeExerciseButton}
                    onPress={() => !isSaving && removeExercise(segment.id, exercise.id)}
                    disabled={isSaving}
                  >
                    <Ionicons name="close-circle" size={20} color={isSaving ? "#666" :ACCENT_COLOR} />
                  </TouchableOpacity>
                </View>
              ))}
              
              <TouchableOpacity 
                style={[styles.addExerciseButton, isSaving && styles.disabledButton]}
                onPress={() => !isSaving && addExercise(segment.id)}
                disabled={isSaving}
              >
                <Ionicons name="search-outline" size={18} color="white" />
                <Text style={styles.addExerciseText}>Browse Exercises</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity 
          style={[styles.addSegmentButton, isSaving && styles.disabledButton]}
          onPress={() => !isSaving && addSegment()}
          disabled={isSaving}
        >
          <Ionicons name="add-circle-outline" size={20} color="white" />
          <Text style={styles.addSegmentText}>Add Segment</Text>
        </TouchableOpacity>
        </View>
        
        {/* Bottom space for scrolling */}
        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Exercise Selector Modal */}
      <Modal
        visible={showExerciseSelector}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SelectExercise
          onSelectExercise={handleSelectExercise}
          onBack={() => {
            setShowExerciseSelector(false);
            setCurrentSegmentId(null);
            setCurrentExerciseId(null);
          }}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#000',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: ACCENT_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'black'
  },
  mainSection: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  imageContainer: {
    width: '60%',
    aspectRatio: 1,
    alignSelf: 'center',
    marginVertical: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    marginTop: 10,
  },
  inputContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  descriptionContainer: {
    marginHorizontal: 20,
    marginBottom: 30,
    marginTop: 15,
  },
  descriptionWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 6,
    flex: 1,
  },
  descriptionOptional: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
  },
  descriptionInput: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    color: 'white',
    fontSize: 15,
    fontWeight: 'normal',
    minHeight: 80,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  descriptionFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  characterCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  inputLabel: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 15,
    color: 'white',
    fontSize: 16,
  },
  transparentTextInput: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  animatedTextInput: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: 'transparent',
    padding: 0,
  },
  transparentTextInputFocused: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.8)',
  },
  transparentTextAreaInput: {
    fontSize: 16,
    fontWeight: 'normal',
    minHeight: 100,
    textAlignVertical: 'top',
    borderBottomWidth: 0,
    paddingTop: 10,
  },
  textAreaInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  segmentContainer: {
    marginHorizontal: 20,
    marginBottom: 25,
    backgroundColor: '#222',
    borderRadius: 15,
    padding: 15,
  },
  segmentHeader: {
    marginBottom: 15,
  },
  segmentTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  segmentLabel: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  segmentInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  segmentInputContainer: {
    flex: 1,
    marginRight: 10,
  },
  segmentInputLabel: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 5,
  },
  segmentInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 10,
    color: 'white',
  },
  exercisesContainer: {
    marginTop: 10,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 10,
    marginBottom: 10,
    padding: 10,
  },
  exerciseNumberContainer: {
    width: 25,
    height: 25,
    borderRadius: 12,
    backgroundColor: '#909090',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  exerciseNumber: {
    fontSize: 14,
    color: 'black',
    fontWeight: 'bold',
  },
  exerciseInputContainer: {
    flex: 1,
  },
  exerciseNameInput: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
  },
  exerciseNamePlaceholder: {
    color: '#666',
    fontStyle: 'italic',
  },
  exerciseDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseDetailInput: {
    color: '#b7b7b7',
    width: 50,
    fontSize: 14,
  },
  exerciseDetailSeparator: {
    color: '#b7b7b7',
    marginHorizontal: 5,
  },
  removeExerciseButton: {
    padding: 5,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#444',
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
  },
  addExerciseText: {
    color: 'white',
    marginLeft: 5,
  },
  addSegmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 5,
    marginBottom: 15,
  },
  addSegmentText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
  },
  bottomSpace: {
    height: 100,
  },
  saveButtonDisabled: {
    backgroundColor: '#8c1a32',
  },
  disabledButton: {
    opacity: 0.5,
  },
  // Tags section styles
  tagsSection: {
    marginHorizontal: 20,
    marginBottom: 15,
  },
  // Visibility section styles
  visibilityContainer: {
    marginHorizontal: 20,
    marginBottom: 15,
  },
  // Section styles
  sectionContainer: {
    marginHorizontal: 20,
    marginBottom: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginLeft: 8,
  },
});