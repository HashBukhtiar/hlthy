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
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/globalStyles';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/AuthContext';
import { db, storage } from '@/firebaseConfig';
import { addDoc, collection, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import SelectExercise from './SelectExercise';
import { Exercise } from '@/data/exercises';

// Visibility options for workouts
interface DropdownItem {
    label: string;
    value: string;
    icon?: string;
    description?: string;
}

const visibilityItems: DropdownItem[] = [
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

// Visibility selector component for workouts
const VisibilitySelector = ({
    valueVisibility,
    setVisibilityModalVisible,
    itemsVisibility
}: {
    valueVisibility: string | null;
    setVisibilityModalVisible: (visible: boolean) => void;
    itemsVisibility: DropdownItem[];
}) => (
    <View style={styles.visibilityContainer}>
        <View style={styles.visibilityHeader}>
            <Ionicons name="eye-outline" size={20} color="#FFF" />
            <Text style={styles.visibilityTitle}>Visibility</Text>
        </View>
        <TouchableOpacity 
            style={styles.visibilitySelector}
            onPress={() => setVisibilityModalVisible(true)}
        >
            <View style={styles.selectedVisibility}>
                <Ionicons 
                    name={itemsVisibility.find(item => item.value === valueVisibility)?.icon as any || 'earth'} 
                    size={18} 
                    color="#FFF" 
                />
                <Text style={styles.selectedVisibilityText}>
                    {itemsVisibility.find(item => item.value === valueVisibility)?.label || 'Public'}
                </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#999" />
        </TouchableOpacity>
    </View>
);

// Visibility Modal component for workouts
const VisibilityModal = ({
    visibilityModalVisible,
    setVisibilityModalVisible,
    valueVisibility,
    setValueVisibility,
    itemsVisibility
}: {
    visibilityModalVisible: boolean;
    setVisibilityModalVisible: (visible: boolean) => void;
    valueVisibility: string | null;
    setValueVisibility: (value: string) => void;
    itemsVisibility: DropdownItem[];
}) => (
    <Modal
        animationType="slide"
        transparent={true}
        visible={visibilityModalVisible}
        onRequestClose={() => setVisibilityModalVisible(false)}
    >
        <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setVisibilityModalVisible(false)}
        >
            <View style={styles.visibilityModalContent}>
                <Text style={styles.visibilityModalTitle}>Workout Visibility</Text>
                
                {itemsVisibility.map((item) => (
                    <TouchableOpacity 
                        key={item.value}
                        style={[
                            styles.visibilityModalOption,
                            valueVisibility === item.value && styles.selectedVisibilityOption
                        ]}
                        onPress={() => {
                            setValueVisibility(item.value);
                            setVisibilityModalVisible(false);
                        }}
                    >
                        <View style={styles.visibilityOptionHeader}>
                            <Ionicons name={item.icon as any} size={22} color={valueVisibility === item.value ? '#ff2d55' : "#FFF"} />
                            <Text style={[
                                styles.visibilityOptionLabel,
                                valueVisibility === item.value && styles.selectedVisibilityOptionText
                            ]}>
                                {item.label}
                            </Text>
                        </View>
                        <Text style={styles.visibilityOptionDescription}>{item.description}</Text>
                    </TouchableOpacity>
                ))}
                
                <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => setVisibilityModalVisible(false)}
                >
                    <Text style={styles.cancelButtonText}>Close</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    </Modal>
);

interface WorkoutExercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
}

interface WorkoutSegment {
  id: string;
  name: string;
  length: string;
  exercises: WorkoutExercise[];
}

export default function CreateWorkout() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [segments, setSegments] = useState<WorkoutSegment[]>([
    {
      id: Date.now().toString(),
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

  const animatedBorderWidth = borderAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 2], // Keep consistent width
  });

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
                id: Date.now().toString(),
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
      id: Date.now().toString(),
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
    let coverImageUrl = '';

    try {
      // 1. Upload cover image if selected
      if (coverImage) {
        const response = await fetch(coverImage);
        const blob = await response.blob();
        const imageName = `workoutCovers/${currentUser.uid}/${Date.now()}-${title.replace(/\s+/g, '_')}.jpg`;
        const storageRef = ref(storage, imageName);
        await uploadBytes(storageRef, blob);
        coverImageUrl = await getDownloadURL(storageRef);
      }

      // 2. Prepare workout data
      const workoutData = {
        creatorId: currentUser.uid,
        creatorUsername: currentUser.username || currentUser.displayName || 'Anonymous',
        title: title.trim(),
        description: description.trim(),
        coverImageUrl: coverImageUrl || null,
        segments: segments.map(segment => ({ // Ensure segments and exercises have necessary data
          id: segment.id,
          name: segment.name.trim(),
          length: segment.length.trim(),
          exercises: segment.exercises.map(ex => ({
            id: ex.id,
            name: ex.name.trim(),
            sets: ex.sets.trim(),
            reps: ex.reps.trim(),
          })).filter(ex => ex.name.trim() !== '') // Filter out empty exercises
        })).filter(seg => seg.exercises.length > 0 || seg.name.trim() !== ''), // Filter out segments with no name and no exercises
        createdAt: serverTimestamp(),
        isPublic: visibility === 'public',
        visibility: visibility,
        savedCount: 0,
        tags: [], // Placeholder for future tag functionality
        // Add any other fields as per your DBDESIGN.md for workouts
      };

      // 3. Save workout to Firestore
      const workoutDocRef = await addDoc(collection(db, 'workouts'), workoutData);
      console.log('Workout saved with ID: ', workoutDocRef.id);

      // 4. Update user's workout count (denormalization)
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        'stats.workoutCount': increment(1)
      });
      // If 'stats' or 'workoutCount' might not exist, we might need a transaction or set with merge:true
      // For simplicity, increment assumes the path exists or can be created by Firestore.

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
                  borderBottomWidth: animatedBorderWidth,
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
              <TextInput
                style={styles.descriptionInput}
                value={description}
                onChangeText={setDescription}
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
          
          {/* Visibility Setting */}
          <View style={styles.visibilityStandaloneContainer}>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => setVisibilityModalVisible(true)}
            >
              <View style={styles.settingLabelContainer}>
                <Ionicons name="eye-outline" size={18} color="#ccc" />
                <Text style={styles.settingLabel}>Visibility</Text>
              </View>
              <View style={styles.settingValueContainer}>
                <View style={styles.settingValue}>
                  <Ionicons 
                    name={visibilityItems.find(item => item.value === visibility)?.icon as any || 'earth'} 
                    size={16} 
                    color="#FFF" 
                  />
                  <Text style={styles.settingValueText}>
                    {visibilityItems.find(item => item.value === visibility)?.label || 'Public'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#999" />
              </View>
            </TouchableOpacity>
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
                  <Ionicons name="trash-outline" size={20} color={isSaving ? "#666" : "#ff6b6b"} />
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
                    <Ionicons name="close-circle" size={20} color={isSaving ? "#666" :"#ff6b6b"} />
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

      {/* Visibility Modal */}
      <VisibilityModal
        visibilityModalVisible={visibilityModalVisible}
        setVisibilityModalVisible={setVisibilityModalVisible}
        valueVisibility={visibility}
        setValueVisibility={setVisibility}
        itemsVisibility={visibilityItems}
      />
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
    backgroundColor: '#ff2d55',
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
  // Visibility section styles
  visibilityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 0,
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
  // Settings styles
  visibilityStandaloneContainer: {
    marginHorizontal: 20,
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    color: '#FFF',
    marginLeft: 8,
  },
  settingValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  settingValueText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 6,
  },
  visibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visibilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
  visibilitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  selectedVisibility: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  selectedVisibilityText: {
    color: '#FFF',
    marginLeft: 6,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  visibilityModalContent: {
    backgroundColor: '#222',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  visibilityModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  visibilityModalOption: {
    padding: 16,
    backgroundColor: '#333',
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  selectedVisibilityOption: {
    borderColor: '#ff2d55',
    backgroundColor: 'rgba(255, 45, 85, 0.1)',
  },
  visibilityOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  visibilityOptionLabel: {
    color: 'white',
    marginLeft: 10,
    fontSize: 16,
  },
  selectedVisibilityOptionText: {
    fontWeight: 'bold',
  },
  visibilityOptionDescription: {
    color: '#ccc',
    fontSize: 14,
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#ff2d55',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});