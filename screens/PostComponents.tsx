import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    TouchableOpacity, 
    Text,
    TextInput,
    Image,
    Alert,
    Dimensions,
    StyleSheet,
    Modal,
    ActivityIndicator,
    ScrollView,
    FlatList
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/firebaseConfig';
import { collection, doc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { getCoverImageSource } from '@/utils/imageUtils';
import { useUnits } from '@/hooks/useUnits';
import { ACCENT_COLOR } from '@/constants/Colors';
import MentionTextInput from '@/components/MentionTextInput';
import { MentionData } from '@/features/mentions/domain/Mention';

// Secondary color and its variations - use centralized ACCENT_COLOR
export const SECONDARY_COLOR = ACCENT_COLOR;
export const SECONDARY_COLOR_LIGHT = 'rgba(255, 45, 85, 0.1)';
export const SECONDARY_COLOR_MEDIUM = 'rgba(255, 45, 85, 0.5)';

interface WorkoutItemData {
  id: string;
  title: string;
  creatorId?: string;
  creatorUsername?: string;
  coverImageUrl?: string | null;
  thumbnailUrl?: string | null;
  segments?: number;
  length?: string;
}

export interface WorkoutSelectionModalProps {
  workoutModalVisible: boolean;
  setWorkoutModalVisible: (visible: boolean) => void;
  selectWorkout: (workout: WorkoutItemData) => void;
}

// Common dropdown item interface
export interface DropdownItem {
    label: string;
    value: string;
    icon?: string;
    description?: string;
}

// Milestone-specific dropdown options
export const milestoneItems: DropdownItem[] = [
    { label: 'PR', value: 'PR' },
    { label: 'Weight Loss', value: 'weightLoss' },
    { label: 'Weight Gain', value: 'weightGain' }
];

export const weightUnitItems: DropdownItem[] = [
    { label: 'lbs', value: 'lbs' },
    { label: 'kg', value: 'kg' }
];

// Header component shared across all post types
export const PostHeader = ({ 
    title, 
    isSubmitting, 
    handleSubmitPost 
}: {
    title: string;
    isSubmitting: boolean;
    handleSubmitPost: () => void;
}) => (
    <View style={postComponentStyles.header}>
        <Text style={postComponentStyles.headerTitle}>{title}</Text>
        <TouchableOpacity 
            style={[postComponentStyles.postButton, isSubmitting && postComponentStyles.disabledButton]} 
            onPress={handleSubmitPost}
            disabled={isSubmitting}
        >
            {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFF" />
            ) : (
                <Text style={postComponentStyles.postButtonText}>Post</Text>
            )}
        </TouchableOpacity>
    </View>
);

// Error message component
export const ErrorMessage = ({ error }: { error: string | null }) => {
    if (!error) return null;
    
    return (
        <View style={postComponentStyles.errorContainer}>
            <Text style={postComponentStyles.errorText}>{error}</Text>
        </View>
    );
};

// Image picker hook (LOGIC ONLY)
export const useImagePicker = (onImageSelected: (uri: string) => void) => {
    const openCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera access is required to take photos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            onImageSelected(result.assets[0].uri);
        }
    };

    const openImageLibrary = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Media library access is required to select photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            onImageSelected(result.assets[0].uri);
        }
    };

    return { openCamera, openImageLibrary };
};

// Image Picker Modal (UI ONLY)
export const ImagePickerModal = ({
    visible,
    onClose,
    onTakePhoto,
    onChooseFromLibrary,
}: {
    visible: boolean;
    onClose: () => void;
    onTakePhoto: () => void;
    onChooseFromLibrary: () => void;
}) => (
    <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
    >
        <TouchableOpacity 
            style={postComponentStyles.modalOverlay}
            activeOpacity={1}
            onPress={onClose}
        >
            <View style={postComponentStyles.imageModalContent} onStartShouldSetResponder={() => true}>
                <Text style={postComponentStyles.imageModalTitle}>Add Photo</Text>
                
                <TouchableOpacity 
                    style={postComponentStyles.imageModalOption}
                    onPress={onTakePhoto}
                >
                    <Ionicons name="camera-outline" size={24} color={SECONDARY_COLOR} />
                    <Text style={postComponentStyles.imageModalOptionText}>Take a photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={postComponentStyles.imageModalOption}
                    onPress={onChooseFromLibrary}
                >
                    <Ionicons name="images-outline" size={24} color={SECONDARY_COLOR} />
                    <Text style={postComponentStyles.imageModalOptionText}>Choose from library</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[postComponentStyles.imageModalOption, { borderBottomWidth: 0 }]}
                    onPress={onClose}
                >
                    <Text style={[postComponentStyles.imageModalOptionText, { color: '#FF3B30' }]}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    </Modal>
);

// Image Section Component
export const ImageSection = ({ 
    imageUri, 
    setImageMenuVisible 
}: { 
    imageUri: string | null;
    setImageMenuVisible: (visible: boolean) => void;
}) => (
    <View style={postComponentStyles.imageSection}>
        {imageUri ? (
            <View style={postComponentStyles.selectedImageContainer}>
                <Image 
                    source={{ uri: imageUri }} 
                    style={postComponentStyles.selectedImage}
                />
                <TouchableOpacity 
                    style={postComponentStyles.changeImageButton}
                    onPress={() => setImageMenuVisible(true)}
                >
                    <Feather name="edit-2" size={16} color="#FFF" />
                </TouchableOpacity>
            </View>
        ) : (
            <TouchableOpacity 
                style={postComponentStyles.addImageButton}
                onPress={() => setImageMenuVisible(true)}
            >
                <Ionicons name="camera-outline" size={36} color="#FFF" />
                <Text style={postComponentStyles.addImageText}>Add Photo</Text>
            </TouchableOpacity>
        )}
    </View>
);

// Caption input component
export const CaptionInput = ({
    caption,
    setCaption,
    mentions,
    onMentionsChange,
}: {
    caption: string;
    setCaption: (text: string) => void;
    mentions: MentionData[];
    onMentionsChange: (mentions: MentionData[]) => void;
}) => (
    <View style={postComponentStyles.captionContainer}>
        <MentionTextInput
            style={postComponentStyles.captionInput}
            placeholder="Write a caption..."
            placeholderTextColor="#999"
            value={caption}
            onChangeText={setCaption}
            mentions={mentions}
            onMentionsChange={onMentionsChange}
            multiline={true}
            maxLength={2200}
            textAlignVertical="top"
        />
    </View>
);

// Workout attachment component
export const WorkoutAttachment = ({
    selectedWorkout,
    setWorkoutModalVisible,
    removeWorkout
}: {
    selectedWorkout: any;
    setWorkoutModalVisible: (visible: boolean) => void;
    removeWorkout: () => void;
}) => {
    const router = useRouter();
    
    return (
        <View style={postComponentStyles.sectionContainer}>
            <View style={postComponentStyles.sectionHeader}>
                <Ionicons name="flame" size={22} color="#FFF" />
                <Text style={postComponentStyles.sectionTitle}>Workout</Text>
            </View>
            
            {selectedWorkout ? (
                <View style={postComponentStyles.selectedWorkoutContainer}>
                    <TouchableOpacity 
                        style={postComponentStyles.attachedWorkoutContent}
                        onPress={() => router.push(`/view-workout/${selectedWorkout.id}`)}
                    >
                        <Image 
                            source={getCoverImageSource(selectedWorkout.thumbnailUrl, selectedWorkout.coverImageUrl)}
                            style={postComponentStyles.workoutThumbnail}
                        />
                        <View style={postComponentStyles.attachedWorkoutInfo}>
                            <Text style={postComponentStyles.attachedWorkoutTitle}>
                                {selectedWorkout.title}
                            </Text>
                            <Text style={postComponentStyles.attachedWorkoutDetails}>
                                {[
                                    selectedWorkout.creatorUsername ? `by ${selectedWorkout.creatorUsername}` : null,
                                    typeof selectedWorkout.segments === "number" ? `${selectedWorkout.segments} segments` : null,
                                    selectedWorkout.length ? selectedWorkout.length : null,
                                ].filter(Boolean).join(" • ")}
                            </Text>
                        </View>
                        <TouchableOpacity 
                            onPress={removeWorkout}
                            style={postComponentStyles.removeWorkoutButton}
                        >
                            <Ionicons name="close-circle" size={22} color={SECONDARY_COLOR} />
                        </TouchableOpacity>
                    </TouchableOpacity>
                </View>
            ) : (
                <TouchableOpacity 
                    style={postComponentStyles.attachWorkoutButton}
                    onPress={() => setWorkoutModalVisible(true)}
                >
                    <Text style={postComponentStyles.attachButtonText}>Select a workout</Text>
                    <Ionicons name="add-circle" size={20} color={SECONDARY_COLOR} />
                </TouchableOpacity>
            )}
        </View>
    );
};

function sumSegmentLengths(segments: any[]): string {
  if (!Array.isArray(segments)) return "";
  let totalMinutes = 0;
  for (const seg of segments) {
    if (typeof seg.length === "string") {
      const minMatch = seg.length.match(/(\d+)\s*min/);
      const hrMatch = seg.length.match(/(\d+)\s*hr/);
      let mins = minMatch ? parseInt(minMatch[1], 10) : 0;
      let hrs = hrMatch ? parseInt(hrMatch[1], 10) : 0;
      totalMinutes += hrs * 60 + mins;
    }
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
  }
  return minutes > 0 ? `${minutes} min` : "";
}

// Workout selection modal
export const WorkoutSelectionModal: React.FC<WorkoutSelectionModalProps> = ({
  workoutModalVisible,
  setWorkoutModalVisible,
  selectWorkout,
}) => {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [allUserWorkouts, setAllUserWorkouts] = useState<WorkoutItemData[]>([]);
  const [filteredWorkouts, setFilteredWorkouts] = useState<WorkoutItemData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUserWorkouts = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const fetchedWorkoutsMap = new Map<string, WorkoutItemData>();

      // Fetch created workouts
      const createdQuery = query(
        collection(db, 'workouts'),
        where('creatorId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      const createdSnapshot = await getDocs(createdQuery);
      createdSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedWorkoutsMap.set(docSnap.id, {
          id: docSnap.id,
          title: data.title,
          creatorId: data.creatorId,
          creatorUsername: data.creatorUsername,
          coverImageUrl: data.coverImageUrl,
          segments: Array.isArray(data.segments) ? data.segments.length : data.segments || 0,
          length: typeof data.length === "string" ? data.length : sumSegmentLengths(data.segments),
        });
      });

      // Fetch saved (favorited) workout IDs
      const savedWorkoutsRef = collection(db, `users/${currentUser.uid}/savedWorkouts`);
      const savedSnapshot = await getDocs(savedWorkoutsRef);
      const savedWorkoutIds = savedSnapshot.docs.map(doc => doc.id);

      // Fetch details for saved workouts
      for (const id of savedWorkoutIds) {
        if (!fetchedWorkoutsMap.has(id)) {
          const workoutDocRef = doc(db, 'workouts', id);
          const workoutDocSnap = await getDoc(workoutDocRef);
          if (workoutDocSnap.exists()) {
            const data = workoutDocSnap.data();
            fetchedWorkoutsMap.set(id, {
              id: id,
              title: data.title,
              creatorId: data.creatorId,
              creatorUsername: data.creatorUsername,
              coverImageUrl: data.coverImageUrl,
              segments: Array.isArray(data.segments) ? data.segments.length : data.segments || 0,
              length: typeof data.length === "string" ? data.length : sumSegmentLengths(data.segments),
            });
          }
        }
      }
      
      const combinedWorkouts = Array.from(fetchedWorkoutsMap.values());
      // You might want to sort them here, e.g., by title or with saved ones first
      // For example, to sort by title:
      // combinedWorkouts.sort((a, b) => a.title.localeCompare(b.title));
      setAllUserWorkouts(combinedWorkouts);
      setFilteredWorkouts(combinedWorkouts);

    } catch (error) {
      console.error("Error fetching user workouts:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (workoutModalVisible && currentUser) {
      fetchUserWorkouts();
    }
  }, [workoutModalVisible, currentUser, fetchUserWorkouts]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredWorkouts(allUserWorkouts);
      return;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    const filtered = allUserWorkouts.filter(
      (workout) =>
        workout.title.toLowerCase().includes(lowerCaseQuery) ||
        (workout.creatorUsername && workout.creatorUsername.toLowerCase().includes(lowerCaseQuery))
    );
    setFilteredWorkouts(filtered);
  }, [searchQuery, allUserWorkouts]);


  const renderWorkoutItem = ({ item }: { item: WorkoutItemData }) => (
    <TouchableOpacity
      style={postComponentStyles.workoutItem}
      onPress={() => {
        selectWorkout(item);
        setSearchQuery(''); 
          }}
        >
            <Image 
                source={getCoverImageSource(item.thumbnailUrl, item.coverImageUrl)}
                style={postComponentStyles.workoutThumbnailLarge}
            />
        <View style={postComponentStyles.workoutItemInfo}>
            <Text style={postComponentStyles.workoutItemTitle} numberOfLines={1}>{item.title}</Text>
            {item.creatorUsername && <Text style={postComponentStyles.workoutItemCreator} numberOfLines={1}>by {item.creatorUsername}</Text>}
        </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={workoutModalVisible}
      onRequestClose={() => {
        setWorkoutModalVisible(false);
        setSearchQuery(''); 
      }}
    >
      <View style={postComponentStyles.modalView}> 
        {/* This modalView centers its child */}
        <View style={postComponentStyles.centeredModalContent}> 
          {/* Use the new style here */}
          <View style={postComponentStyles.modalHeader}>
            <Text style={postComponentStyles.modalTitle}>Select Workout</Text>
            <TouchableOpacity
              onPress={() => {
                setWorkoutModalVisible(false);
                setSearchQuery(''); 
              }}
              style={postComponentStyles.closeButton}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={postComponentStyles.searchInputWide} 
            placeholder="Search your workouts..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {loading ? (
            <ActivityIndicator size="large" color={SECONDARY_COLOR} style={{ marginVertical: 20 }}/>
          ) : filteredWorkouts.length === 0 ? (
            <Text style={postComponentStyles.noWorkoutsText}>No workouts found.</Text>
          ) : (
            <FlatList
              data={filteredWorkouts}
              renderItem={renderWorkoutItem}
              keyExtractor={(item) => item.id}
              style={postComponentStyles.workoutListWide} 
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

// Milestone Field Components
export const PRFields = ({
    exerciseSearch,
    handleExerciseSearch,
    filteredExercises,
    setExerciseSearch,
    setFilteredExercises,
    amount,
    setAmount,
    weightUnit,
    setWeightUnit,
    itemsWeightUnit,
    reps,
    setReps
}: {
    exerciseSearch: string;
    handleExerciseSearch: (text: string) => void;
    filteredExercises: string[];
    setExerciseSearch: (text: string) => void;
    setFilteredExercises: (exercises: string[]) => void;
    amount: string;
    setAmount: (amount: string) => void;
    weightUnit: string | null;
    setWeightUnit: (unit: string) => void;
    itemsWeightUnit: DropdownItem[];
    reps: string;
    setReps: (reps: string) => void;
}) => (
    <View style={postComponentStyles.prContainer}>
        <View style={postComponentStyles.inputGroup}>
            <Text style={postComponentStyles.inputLabel}>Exercise</Text>
            <TextInput
                style={postComponentStyles.exerciseInput}
                placeholder="Search for exercise..."
                placeholderTextColor="#999"
                value={exerciseSearch}
                onChangeText={handleExerciseSearch}
            />
            {filteredExercises.length > 0 && (
                <View style={postComponentStyles.suggestionsContainer}>
                    <ScrollView 
                        style={postComponentStyles.suggestionsList}
                        nestedScrollEnabled={true}
                    >
                        {filteredExercises.map((exercise, index) => (
                            <TouchableOpacity
                                key={index}
                                onPress={() => {
                                    setExerciseSearch(exercise);
                                    setFilteredExercises([]);
                                }}
                                style={postComponentStyles.suggestionItem}
                            >
                                <Text style={postComponentStyles.suggestionText}>{exercise}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
        
        <View style={postComponentStyles.inputRow}>
            <View style={postComponentStyles.weightInput}>
                <Text style={postComponentStyles.inputLabel}>Weight</Text>
                <View style={postComponentStyles.weightInputGroup}>
                    <TextInput
                        style={postComponentStyles.numberInput}
                        placeholder="0"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />
                    <Dropdown
                        data={itemsWeightUnit}
                        labelField="label"
                        valueField="value"
                        placeholder="Unit"
                        value={weightUnit}
                        onChange={item => setWeightUnit(item.value)}
                        style={postComponentStyles.unitDropdown}
                        containerStyle={postComponentStyles.unitDropdownContainer}
                        placeholderStyle={postComponentStyles.dropdownPlaceholder}
                        selectedTextStyle={postComponentStyles.dropdownSelectedText}
                    />
                </View>
            </View>
            
            <View style={postComponentStyles.repsInput}>
                <Text style={postComponentStyles.inputLabel}>Reps</Text>
                <TextInput
                    style={postComponentStyles.numberInput}
                    placeholder="0"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={reps}
                    onChangeText={setReps}
                />
            </View>
        </View>
    </View>
);

export const WeightFields = ({
    newWeight,
    setNewWeight,
    newWeightUnit,
    setNewWeightUnit,
    itemsNewWeightUnit
}: {
    newWeight: string;
    setNewWeight: (weight: string) => void;
    newWeightUnit: string | null;
    setNewWeightUnit: (unit: string) => void;
    itemsNewWeightUnit: DropdownItem[];
}) => {
    const { getWeightUnit } = useUnits();
    
    return (
        <View style={postComponentStyles.weightMilestoneContainer}>
            <Text style={postComponentStyles.inputLabel}>New Weight ({getWeightUnit()})</Text>
            <View style={postComponentStyles.weightInputGroup}>
                <TextInput
                    style={postComponentStyles.numberInput}
                    placeholder="0"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={newWeight}
                    onChangeText={setNewWeight}
                />
                <Dropdown
                    data={[
                        { label: 'kg', value: 'kg' },
                        { label: 'lbs', value: 'lbs' }
                    ]}
                    labelField="label"
                    valueField="value"
                    placeholder="Unit"
                    value={newWeightUnit || getWeightUnit()}
                    onChange={item => setNewWeightUnit(item.value)}
                    style={postComponentStyles.unitDropdown}
                    containerStyle={postComponentStyles.unitDropdownContainer}
                    placeholderStyle={postComponentStyles.dropdownPlaceholder}
                    selectedTextStyle={postComponentStyles.dropdownSelectedText}
                />
            </View>
        </View>
    );
};

export const WeightRepsFields = ({
    amount,
    setAmount,
    weightUnit,
    setWeightUnit,
    reps,
    setReps,
    itemsWeightUnit
}: {
    amount: string;
    setAmount: (amount: string) => void;
    weightUnit: string | null;
    setWeightUnit: (unit: string) => void;
    reps: string;
    setReps: (reps: string) => void;
    itemsWeightUnit: DropdownItem[];
}) => {
    const { getWeightUnit } = useUnits();
    
    return (
        <View style={postComponentStyles.weightRepsContainer}>
            <View style={postComponentStyles.inputRow}>
                <View style={postComponentStyles.weightInput}>
                    <Text style={postComponentStyles.inputLabel}>Weight ({getWeightUnit()})</Text>
                    <View style={postComponentStyles.weightInputGroup}>
                        <TextInput
                            style={postComponentStyles.numberInput}
                            placeholder="0"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />
                        <Dropdown
                            data={[
                                { label: 'kg', value: 'kg' },
                                { label: 'lbs', value: 'lbs' }
                            ]}
                            labelField="label"
                            valueField="value"
                            placeholder="Unit"
                            value={weightUnit || getWeightUnit()}
                            onChange={item => setWeightUnit(item.value)}
                            style={postComponentStyles.unitDropdown}
                            containerStyle={postComponentStyles.unitDropdownContainer}
                            placeholderStyle={postComponentStyles.dropdownPlaceholder}
                            selectedTextStyle={postComponentStyles.dropdownSelectedText}
                        />
                    </View>
                </View>
                
                <View style={postComponentStyles.repsInput}>
                    <Text style={postComponentStyles.inputLabel}>Reps</Text>
                    <TextInput
                        style={postComponentStyles.numberInput}
                        placeholder="0"
                        placeholderTextColor="#999"
                        keyboardType="numeric"
                        value={reps}
                        onChangeText={setReps}
                    />
                </View>
            </View>
        </View>
    );
};

// Common styles used by all post components
const postComponentStyles = StyleSheet.create({
    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    postButton: {
        backgroundColor: SECONDARY_COLOR,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    postButtonText: {
        color: '#FFF',
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    },

    // Error display
    errorContainer: {
        backgroundColor: SECONDARY_COLOR_LIGHT,
        padding: 12,
        margin: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: SECONDARY_COLOR,
    },
    errorText: {
        color: SECONDARY_COLOR,
        fontSize: 14,
    },

    // Image section
    imageSection: {
        padding: 16,
        alignItems: 'center',
    },
    addImageButton: {
        width: Dimensions.get('window').width - 32,
        height: 200,
        backgroundColor: '#181818',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addImageText: {
        color: '#FFF',
        marginTop: 10,
        fontSize: 16,
    },
    selectedImageContainer: {
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        width: Dimensions.get('window').width - 32,
    },
    selectedImage: {
        width: '100%',
        height: 250,
        resizeMode: 'cover',
    },
    changeImageButton: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 8,
        borderRadius: 20,
    },

    // Caption section
    captionContainer: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    captionInput: {
        backgroundColor: '#222',
        color: '#FFF',
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        minHeight: 120,
        textAlignVertical: 'top',
    },

    // Common section styles
    sectionContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 8,
        borderTopWidth: 1,
        borderTopColor: '#222',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginLeft: 8,
    },

    // Workout selection
    attachWorkoutButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        backgroundColor: '#111',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    attachButtonText: {
        color: '#FFF',
        fontSize: 15,
    },
    selectedWorkoutContainer: {
        backgroundColor: '#111',
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
    },
    attachedWorkoutContent: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
    },
    workoutThumbnail: {
        width: 50,
        height: 50,
        borderRadius: 6,
    },
    attachedWorkoutInfo: {
        flex: 1,
        marginLeft: 12,
    },
    attachedWorkoutTitle: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 15,
    },
    attachedWorkoutDetails: {
        color: '#999',
        fontSize: 13,
        marginTop: 3,
    },
    removeWorkoutButton: {
        padding: 4,
    },

    // Milestone specific styles
    milestoneContent: {
        backgroundColor: '#111',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#222',
    },
    milestoneTypeContainer: {
        marginBottom: 16,
    },
    milestoneLabel: {
        fontSize: 16,
        color: '#FFF',
        marginBottom: 8,
        fontWeight: '500',
    },

    // Dropdown styles
    dropdown: {
        backgroundColor: '#222',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#444',
    },
    dropdownContainer: {
        backgroundColor: '#282828',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#444',
    },
    dropdownPlaceholder: {
        color: '#999',
    },
    dropdownSelectedText: {
        color: '#FFF',
    },

    // PR specific styles
    prContainer: {
        marginTop: 8,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 16,
        color: '#FFF',
        marginBottom: 8,
        fontWeight: '500',
    },
    exerciseInput: {
        backgroundColor: '#222',
        color: '#FFF',
        padding: 12,
        borderRadius: 8,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#333',
    },
    suggestionsContainer: {
        backgroundColor: '#222',
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 8,
        marginTop: 4,
        maxHeight: 150,
    },
    suggestionsList: {
        padding: 4,
    },
    suggestionItem: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    suggestionText: {
        color: '#FFF',
        fontSize: 14,
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    weightInput: {
        flex: 1,
        marginRight: 12,
    },
    repsInput: {
        flex: 1,
    },
    weightInputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    numberInput: {
        backgroundColor: '#222',
        color: '#FFF',
        padding: 12,
        borderRadius: 8,
        fontSize: 15,
        flex: 1,
        borderWidth: 1,
        borderColor: '#333',
    },
    unitDropdown: {
        backgroundColor: '#222',
        borderRadius: 8,
        padding: 6,
        borderWidth: 1,
        borderColor: '#333',
        width: 70,
        marginLeft: 8,
    },
    unitDropdownContainer: {
        backgroundColor: '#282828',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333',
    },

    // Weight milestone styles
    weightMilestoneContainer: {
        marginTop: 8,
    },

    // Weight reps container styles
    weightRepsContainer: {
        marginTop: 8,
    },

    // Image modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    imageModalContent: {
        backgroundColor: '#111',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    imageModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 20,
        textAlign: 'center',
    },
    imageModalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#1D1D1D',
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    imageModalOptionText: {
        color: '#FFF',
        fontSize: 16,
        marginLeft: 12,
        fontWeight: '500',
    },
    cancelButton: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#222',
        alignItems: 'center',
        marginTop: 8,
    },
    cancelButtonText: {
        color: SECONDARY_COLOR,
        fontSize: 16,
        fontWeight: '600',
    },

    // Workout modal
    workoutListWide: {
    },

    workoutItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    workoutThumbnailLarge: {
        width: 60,
        height: 60,
        borderRadius: 8,
        backgroundColor: '#3A3A3C',
    },
    workoutItemInfo: {
        flex: 1,
        marginLeft: 15, 
    },
    workoutItemTitle: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
    },
    workoutItemCreator: {
        color: '#999',
        fontSize: 14,
    },
    noWorkoutsText: {
        color: '#888',
        textAlign: 'center',
        marginVertical: 20,
        fontSize: 16,
        paddingHorizontal: 20,
    },

    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    modalContent: {
        backgroundColor: '#111',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 24,
        paddingBottom: 30,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 15,        
    },
    modalTitle: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 20,
    },
    closeButton: {
        padding: 5,
    },
    searchInputWide: {
        backgroundColor: '#2C2C2E',
        color: '#FFF',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        marginHorizontal: 20,
        marginBottom: 15,
    },
    workoutList: {
        paddingHorizontal: 20,
    },
    workoutItemDetails: {
        color: '#777',
        fontSize: 12,
        marginTop: 2,
    },
    modalView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    centeredModalContent: {
        width: '95%',
        maxHeight: '85%',
        backgroundColor: '#1C1C1E',
        borderRadius: 15,
        padding: 0,
        overflow: 'hidden',
    },
    searchInput: {
        backgroundColor: '#2C2C2E',
        color: '#FFF',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        marginBottom: 15,
    },

    // Milestone attachment
    milestoneIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 45, 85, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    milestoneDetailsContainer: {
        flex: 1,
    },
});

// Milestone attachment component
export const MilestoneAttachment = ({
    selectedMilestone,
    setMilestoneModalVisible,
    removeMilestone
}: {
    selectedMilestone: any;
    setMilestoneModalVisible: (visible: boolean) => void;
    removeMilestone: () => void;
}) => {
    const router = useRouter();
    
    return (
        <View style={postComponentStyles.sectionContainer}>
            <View style={postComponentStyles.sectionHeader}>
                <MaterialCommunityIcons name="trophy" size={22} color="#FFF" />
                <Text style={postComponentStyles.sectionTitle}>Milestone</Text>
            </View>
            
            {selectedMilestone ? (
                <View style={postComponentStyles.selectedWorkoutContainer}>
                    <View style={postComponentStyles.attachedWorkoutContent}>
                        <View style={postComponentStyles.milestoneIconContainer}>
                            {selectedMilestone.type === 'PR' ? (
                                <Ionicons name="flame" size={22} color={SECONDARY_COLOR} />
                            ) : (
                                <Ionicons name="fitness-outline" size={22} color={SECONDARY_COLOR} />
                            )}
                        </View>
                        <View style={postComponentStyles.attachedWorkoutInfo}>
                            <Text style={postComponentStyles.attachedWorkoutTitle}>
                                {selectedMilestone.title}
                            </Text>
                            <Text style={postComponentStyles.attachedWorkoutDetails}>
                                {selectedMilestone.details}
                            </Text>
                        </View>
                        <TouchableOpacity 
                            onPress={removeMilestone}
                            style={postComponentStyles.removeWorkoutButton}
                        >
                            <Ionicons name="close-circle" size={22} color={SECONDARY_COLOR} />
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <TouchableOpacity 
                    style={postComponentStyles.attachWorkoutButton}
                    onPress={() => setMilestoneModalVisible(true)}
                >
                    <Text style={postComponentStyles.attachButtonText}>Add a milestone</Text>
                    <Ionicons name="add-circle" size={20} color={SECONDARY_COLOR} />
                </TouchableOpacity>
            )}
        </View>
    );
};

// Milestone selection modal
export const MilestoneSelectionModal = ({
    milestoneModalVisible,
    setMilestoneModalVisible,
    selectMilestone,
    availableMilestones
}: {
    milestoneModalVisible: boolean;
    setMilestoneModalVisible: (visible: boolean) => void;
    selectMilestone: (milestone: any) => void;
    availableMilestones: any[];
}) => (
    <Modal
        animationType="slide"
        transparent={true}
        visible={milestoneModalVisible}
        onRequestClose={() => setMilestoneModalVisible(false)}
    >
        <View style={postComponentStyles.modalContainer}>
            <View style={postComponentStyles.modalContent}>
                <View style={postComponentStyles.modalHeader}>
                    <Text style={postComponentStyles.modalTitle}>Select Milestone</Text>
                    <TouchableOpacity 
                        onPress={() => setMilestoneModalVisible(false)}
                        style={postComponentStyles.closeButton}
                    >
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    style={postComponentStyles.workoutList}
                    showsVerticalScrollIndicator={false}
                >
                    {availableMilestones.map((milestone) => (
                        <TouchableOpacity 
                            key={milestone.id}
                            style={postComponentStyles.workoutItem}
                            onPress={() => selectMilestone(milestone)}
                        >
                            <View style={postComponentStyles.milestoneIconContainer}>
                                {milestone.type === 'PR' ? (
                                    <Ionicons name="flame" size={22} color={SECONDARY_COLOR} />
                                ) : milestone.type === 'weightLoss' ? (
                                    <Ionicons name="trending-down" size={22} color={SECONDARY_COLOR} />
                                ) : (
                                    <Ionicons name="trending-up" size={22} color={SECONDARY_COLOR} />
                                )}
                            </View>
                            <View style={postComponentStyles.workoutItemInfo}>
                                <Text style={postComponentStyles.workoutItemTitle}>{milestone.title}</Text>
                                <Text style={postComponentStyles.workoutItemCreator}>{milestone.date}</Text>
                                <Text style={postComponentStyles.workoutItemDetails}>
                                    {milestone.details}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    </Modal>
);

// Post attachment component
export const PostAttachment = ({
    selectedPost,
    setPostModalVisible,
    removePost
}: {
    selectedPost: any;
    setPostModalVisible: (visible: boolean) => void;
    removePost: () => void;
}) => {
    const router = useRouter();
    
    return (
        <View style={postComponentStyles.sectionContainer}>
            <View style={postComponentStyles.sectionHeader}>
                <Ionicons name="image" size={22} color="#FFF" />
                <Text style={postComponentStyles.sectionTitle}>Attach Post</Text>
            </View>
            
            {selectedPost ? (
                <View style={postComponentStyles.selectedWorkoutContainer}>
                    <View style={postComponentStyles.attachedWorkoutContent}>
                        {selectedPost.imageUrl ? (
                            <Image 
                                source={{ uri: selectedPost.imageUrl }}
                                style={postComponentStyles.workoutThumbnail}
                            />
                        ) : (
                            <View style={[postComponentStyles.workoutThumbnail, {backgroundColor: '#333', justifyContent: 'center', alignItems: 'center'}]}>
                                <Ionicons name="document-text" size={24} color="#666" />
                            </View>
                        )}
                        <View style={postComponentStyles.attachedWorkoutInfo}>
                            <Text style={postComponentStyles.attachedWorkoutTitle}>
                                {selectedPost.caption ? (selectedPost.caption.length > 30 ? selectedPost.caption.substring(0, 30) + '...' : selectedPost.caption) : 'Post'}
                            </Text>
                            <Text style={postComponentStyles.attachedWorkoutDetails}>
                                {selectedPost.date}
                            </Text>
                        </View>
                        <TouchableOpacity 
                            onPress={removePost}
                            style={postComponentStyles.removeWorkoutButton}
                        >
                            <Ionicons name="close-circle" size={22} color={SECONDARY_COLOR} />
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <TouchableOpacity 
                    style={postComponentStyles.attachWorkoutButton}
                    onPress={() => setPostModalVisible(true)}
                >
                    <Text style={postComponentStyles.attachButtonText}>Select a post</Text>
                    <Ionicons name="add-circle" size={20} color={SECONDARY_COLOR} />
                </TouchableOpacity>
            )}
        </View>
    );
};

// Post selection modal
export const PostSelectionModal = ({
    postModalVisible,
    setPostModalVisible,
    selectPost,
    availablePosts
}: {
    postModalVisible: boolean;
    setPostModalVisible: (visible: boolean) => void;
    selectPost: (post: any) => void;
    availablePosts: any[];
}) => (
    <Modal
        animationType="slide"
        transparent={true}
        visible={postModalVisible}
        onRequestClose={() => setPostModalVisible(false)}
    >
        <View style={postComponentStyles.modalContainer}>
            <View style={postComponentStyles.modalContent}>
                <View style={postComponentStyles.modalHeader}>
                    <Text style={postComponentStyles.modalTitle}>Select Post</Text>
                    <TouchableOpacity 
                        onPress={() => setPostModalVisible(false)}
                        style={postComponentStyles.closeButton}
                    >
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    style={postComponentStyles.workoutList}
                    showsVerticalScrollIndicator={false}
                >
                    {availablePosts.map((post) => (
                        <TouchableOpacity 
                            key={post.id}
                            style={postComponentStyles.workoutItem}
                            onPress={() => selectPost(post)}
                        >
                            {post.imageUrl ? (
                                <Image 
                                    source={{ uri: post.imageUrl }}
                                    style={postComponentStyles.workoutThumbnail}
                                />
                            ) : (
                                <View style={[postComponentStyles.workoutThumbnail, {backgroundColor: '#333', justifyContent: 'center', alignItems: 'center'}]}>
                                    <Ionicons name="document-text" size={24} color="#666" />
                                </View>
                            )}
                            <View style={postComponentStyles.workoutItemInfo}>
                                <Text style={postComponentStyles.workoutItemTitle}>{post.caption ? (post.caption.length > 30 ? post.caption.substring(0, 30) + '...' : post.caption) : 'Post'}</Text>
                                <Text style={postComponentStyles.workoutItemCreator}>{post.date}</Text>
                                <Text style={postComponentStyles.workoutItemDetails}>
                                    {post.likes} likes • {post.comments} comments
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    </Modal>
);