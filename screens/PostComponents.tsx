import React, { useState } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Secondary color and its variations
export const SECONDARY_COLOR = '#ff2d55';
export const SECONDARY_COLOR_LIGHT = 'rgba(255, 45, 85, 0.1)';
export const SECONDARY_COLOR_MEDIUM = 'rgba(255, 45, 85, 0.5)';

// Common dropdown item interface
export interface DropdownItem {
    label: string;
    value: string;
    icon?: string;
    description?: string;
}

// Visibility options for all post types
export const visibilityItems: DropdownItem[] = [
    { 
        label: 'Public', 
        value: 'public',
        icon: 'earth',
        description: 'Anyone can see this post'
    },
    { 
        label: 'Followers Only', 
        value: 'followers',
        icon: 'people',
        description: 'Only your followers can see this post'
    },
    { 
        label: 'Private', 
        value: 'private',
        icon: 'lock-closed',
        description: 'Only you can see this post'
    }
];

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

// Image picker modal and functions
export const useImagePicker = () => {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    const [imageMenuVisible, setImageMenuVisible] = useState(false);

    const openCamera = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera access is required to take photos.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const uri = result.assets[0].uri;
            const { width, height } = result.assets[0];
            setImageUri(uri);
            setImageDimensions({ width, height });
            setImageMenuVisible(false);
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
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            const uri = result.assets[0].uri;
            const { width, height } = result.assets[0];
            setImageUri(uri);
            setImageDimensions({ width, height });
            setImageMenuVisible(false);
        }
    };

    const ImagePickerModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={imageMenuVisible}
            onRequestClose={() => setImageMenuVisible(false)}
        >
            <TouchableOpacity 
                style={postComponentStyles.modalOverlay}
                activeOpacity={1}
                onPress={() => setImageMenuVisible(false)}
            >
                <View style={postComponentStyles.imageModalContent}>
                    <Text style={postComponentStyles.imageModalTitle}>Add Photo</Text>
                    
                    <TouchableOpacity 
                        style={postComponentStyles.imageModalOption}
                        onPress={openCamera}
                    >
                        <Ionicons name="camera-outline" size={24} color={SECONDARY_COLOR} />
                        <Text style={postComponentStyles.imageModalOptionText}>Take a photo</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={postComponentStyles.imageModalOption}
                        onPress={openImageLibrary}
                    >
                        <Ionicons name="images-outline" size={24} color={SECONDARY_COLOR} />
                        <Text style={postComponentStyles.imageModalOptionText}>Choose from library</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={postComponentStyles.cancelButton}
                        onPress={() => setImageMenuVisible(false)}
                    >
                        <Text style={postComponentStyles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    return {
        imageUri,
        setImageUri,
        imageDimensions,
        setImageDimensions,
        imageMenuVisible,
        setImageMenuVisible,
        openCamera,
        openImageLibrary,
        ImagePickerModal
    };
};

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
    setCaption 
}: { 
    caption: string;
    setCaption: (text: string) => void;
}) => (
    <View style={postComponentStyles.captionContainer}>
        <TextInput
            style={postComponentStyles.captionInput}
            placeholder="Write a caption..."
            placeholderTextColor="#999"
            value={caption}
            onChangeText={setCaption}
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
                            source={{ uri: selectedWorkout.thumbnail }}
                            style={postComponentStyles.workoutThumbnail}
                        />
                        <View style={postComponentStyles.attachedWorkoutInfo}>
                            <Text style={postComponentStyles.attachedWorkoutTitle}>
                                {selectedWorkout.title}
                            </Text>
                            <Text style={postComponentStyles.attachedWorkoutDetails}>
                                by {selectedWorkout.creatorName} • {selectedWorkout.segments} segments • {selectedWorkout.length}
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

// Workout selection modal
export const WorkoutSelectionModal = ({
    workoutModalVisible,
    setWorkoutModalVisible,
    selectWorkout,
    availableWorkouts
}: {
    workoutModalVisible: boolean;
    setWorkoutModalVisible: (visible: boolean) => void;
    selectWorkout: (workout: any) => void;
    availableWorkouts: any[];
}) => (
    <Modal
        animationType="slide"
        transparent={true}
        visible={workoutModalVisible}
        onRequestClose={() => setWorkoutModalVisible(false)}
    >
        <View style={postComponentStyles.modalContainer}>
            <View style={postComponentStyles.modalContent}>
                <View style={postComponentStyles.modalHeader}>
                    <Text style={postComponentStyles.modalTitle}>Select Workout</Text>
                    <TouchableOpacity 
                        onPress={() => setWorkoutModalVisible(false)}
                        style={postComponentStyles.closeButton}
                    >
                        <Ionicons name="close" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    style={postComponentStyles.workoutList}
                    showsVerticalScrollIndicator={false}
                >
                    {availableWorkouts.map((workout) => (
                        <TouchableOpacity 
                            key={workout.id}
                            style={postComponentStyles.workoutItem}
                            onPress={() => selectWorkout(workout)}
                        >
                            <Image 
                                source={{ uri: workout.thumbnail }}
                                style={postComponentStyles.workoutThumbnail}
                            />
                            <View style={postComponentStyles.workoutItemInfo}>
                                <Text style={postComponentStyles.workoutItemTitle}>{workout.title}</Text>
                                <Text style={postComponentStyles.workoutItemCreator}>{workout.creatorName}</Text>
                                <Text style={postComponentStyles.workoutItemDetails}>
                                    {workout.segments} segments • {workout.length}
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

// Visibility selector component
export const VisibilitySelector = ({
    valueVisibility,
    setVisibilityModalVisible,
    itemsVisibility
}: {
    valueVisibility: string | null;
    setVisibilityModalVisible: (visible: boolean) => void;
    itemsVisibility: DropdownItem[];
}) => (
    <View style={postComponentStyles.visibilityContainer}>
        <View style={postComponentStyles.visibilityHeader}>
            <Ionicons name="eye-outline" size={20} color="#FFF" />
            <Text style={postComponentStyles.visibilityTitle}>Visibility</Text>
        </View>
        <TouchableOpacity 
            style={postComponentStyles.visibilitySelector}
            onPress={() => setVisibilityModalVisible(true)}
        >
            <View style={postComponentStyles.selectedVisibility}>
                <Ionicons 
                    name={itemsVisibility.find(item => item.value === valueVisibility)?.icon as any || 'earth'} 
                    size={18} 
                    color="#FFF" 
                />
                <Text style={postComponentStyles.selectedVisibilityText}>
                    {itemsVisibility.find(item => item.value === valueVisibility)?.label || 'Public'}
                </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color="#999" />
        </TouchableOpacity>
    </View>
);

// Visibility Modal component
export const VisibilityModal = ({
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
            style={postComponentStyles.modalOverlay}
            activeOpacity={1}
            onPress={() => setVisibilityModalVisible(false)}
        >
            <View style={postComponentStyles.visibilityModalContent}>
                <Text style={postComponentStyles.visibilityModalTitle}>Post Visibility</Text>
                
                {itemsVisibility.map((item) => (
                    <TouchableOpacity 
                        key={item.value}
                        style={[
                            postComponentStyles.visibilityModalOption,
                            valueVisibility === item.value && postComponentStyles.selectedVisibilityOption
                        ]}
                        onPress={() => {
                            setValueVisibility(item.value);
                            setVisibilityModalVisible(false);
                        }}
                    >
                        <View style={postComponentStyles.visibilityOptionHeader}>
                            <Ionicons name={item.icon as any} size={22} color={valueVisibility === item.value ? SECONDARY_COLOR : "#FFF"} />
                            <Text style={[
                                postComponentStyles.visibilityOptionLabel,
                                valueVisibility === item.value && postComponentStyles.selectedVisibilityOptionText
                            ]}>
                                {item.label}
                            </Text>
                        </View>
                        <Text style={postComponentStyles.visibilityOptionDescription}>{item.description}</Text>
                    </TouchableOpacity>
                ))}
                
                <TouchableOpacity 
                    style={postComponentStyles.cancelButton}
                    onPress={() => setVisibilityModalVisible(false)}
                >
                    <Text style={postComponentStyles.cancelButtonText}>Close</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    </Modal>
);

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
}) => (
    <View style={postComponentStyles.weightMilestoneContainer}>
        <Text style={postComponentStyles.inputLabel}>New Weight</Text>
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
                data={itemsNewWeightUnit}
                labelField="label"
                valueField="value"
                placeholder="Unit"
                value={newWeightUnit}
                onChange={item => setNewWeightUnit(item.value)}
                style={postComponentStyles.unitDropdown}
                containerStyle={postComponentStyles.unitDropdownContainer}
                placeholderStyle={postComponentStyles.dropdownPlaceholder}
                selectedTextStyle={postComponentStyles.dropdownSelectedText}
            />
        </View>
    </View>
);

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

    // Visibility section
    visibilityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#222',
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
        backgroundColor: '#111',
        borderRadius: 8,
        padding: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#333',
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
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    modalTitle: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 20,
    },
    closeButton: {
        padding: 5,
    },
    workoutList: {
        paddingHorizontal: 20,
    },
    workoutItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
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
    workoutItemDetails: {
        color: '#777',
        fontSize: 12,
        marginTop: 2,
    },

    // Visibility modal styles
    visibilityModalContent: {
        backgroundColor: '#111',
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
        backgroundColor: '#1D1D1D',
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    selectedVisibilityOption: {
        borderColor: SECONDARY_COLOR,
        backgroundColor: SECONDARY_COLOR_LIGHT,
    },
    visibilityOptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    visibilityOptionLabel: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    selectedVisibilityOptionText: {
        color: SECONDARY_COLOR,
    },
    visibilityOptionDescription: {
        color: '#999',
        fontSize: 14,
        marginLeft: 32,
    },
    visibilityItem: {
        padding: 12,
        flexDirection: 'column',
    },
    visibilityItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    visibilityIcon: {
        marginRight: 8,
    },
    visibilityLabel: {
        color: '#FFF',
        fontSize: 16,
    },
    visibilityDescription: {
        color: '#999',
        fontSize: 12,
        paddingLeft: 28,
    },
});

// Create a ScrollView that is exported
export const ScrollView = require('react-native').ScrollView;