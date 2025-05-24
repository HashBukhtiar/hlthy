import React, { useState } from 'react';
import { 
    View, 
    TouchableOpacity, 
    ScrollView, 
    Text,
    TextInput,
    Image,
    Switch,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Modal,
    ActivityIndicator,
    SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/globalStyles';
import * as ImagePicker from 'expo-image-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { postImage } from '@/assets/images';
import { usePostsData } from '@/hooks/usePostsData';
import { useAuth } from '@/context/AuthContext';

// Secondary color and its variations
const SECONDARY_COLOR = '#ff2d55';
const SECONDARY_COLOR_LIGHT = 'rgba(255, 45, 85, 0.1)';
const SECONDARY_COLOR_MEDIUM = 'rgba(255, 45, 85, 0.5)';

interface DropdownItem {
    label: string;
    value: string;
    icon?: string;
    description?: string;
}

export default function Post() {
    const { addPost } = usePostsData();
    const { currentUser, userProfile } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const router = useRouter();
    
    // Post type selection (regular post or milestone)
    const [postMode, setPostMode] = useState<'regular' | 'milestone'>('regular');

    // Common fields
    const [caption, setCaption] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    const [valueVisibility, setValueVisibility] = useState<string | null>('public');
    const [itemsVisibility] = useState<DropdownItem[]>([
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
    ]);
    
    // Milestone specific fields
    const [valueMilestone, setValueMilestone] = useState<string | null>(null);
    const [itemsMilestone] = useState<DropdownItem[]>([
        { label: 'PR', value: 'PR' },
        { label: 'Weight Loss', value: 'weightLoss' },
        { label: 'Weight Gain', value: 'weightGain' }
    ]);

    const [exerciseSearch, setExerciseSearch] = useState('');
    const [amount, setAmount] = useState('');
    const [weightUnit, setWeightUnit] = useState<string | null>('lbs');
    const [itemsWeightUnit] = useState<DropdownItem[]>([
        { label: 'lbs', value: 'lbs' },
        { label: 'kg', value: 'kg' }
    ]);
    const [reps, setReps] = useState('');
    const [newWeight, setNewWeight] = useState('');
    const [newWeightUnit, setNewWeightUnit] = useState<string | null>('lbs');
    const [itemsNewWeightUnit] = useState<DropdownItem[]>([
        { label: 'lbs', value: 'lbs' },
        { label: 'kg', value: 'kg' }
    ]);

    const [allExercises] = useState<string[]>([ 
        'Bench Press',
        'Squat',
        'Deadlift',
        'Overhead Press',
        'Pull Up',
        'Leg Press',
        'Bicep Curl',
        'Tricep Extension',
        'Lat Pulldown',
        'Shoulder Press',
        'Romanian Deadlift',
        'Hip Thrust',
        '400m Run',
        '5K Run',
        '10K Run',
        'Mile Run'
    ]);
    const [filteredExercises, setFilteredExercises] = useState<string[]>([]);

    // Workout attachment
    const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
    const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
    const [imageMenuVisible, setImageMenuVisible] = useState(false);
    const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);

    const [availableWorkouts] = useState([
        {
            id: '123',
            title: 'Impossible Leg Day',
            thumbnail: 'https://thecamerastore.com/cdn/shop/articles/GINAYEOLANDSCAPE-1_800x.jpg?v=1687296669',
            length: '1h 30min',
            segments: 2,
            creatorName: 'John Doe'
        },
        {
            id: '456',
            title: 'Morning HIIT',
            thumbnail: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
            length: '45min',
            segments: 3,
            creatorName: 'Sarah Smith'
        },
        {
            id: '789',
            title: 'Full Body Power',
            thumbnail: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
            length: '1h 15min',
            segments: 4,
            creatorName: 'Mike Johnson'
        },
    ]);

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
    
    const aspectRatio = imageDimensions.width && imageDimensions.height 
        ? imageDimensions.width / imageDimensions.height 
        : 1;

    const handleExerciseSearch = (text: string) => {
        setExerciseSearch(text);
        if (text) {
            const filtered = allExercises.filter(exercise =>
                exercise.toLowerCase().includes(text.toLowerCase())
            );
            setFilteredExercises(filtered);
        } else {
            setFilteredExercises([]);
        }
    };

    const selectWorkout = (workout) => {
        setSelectedWorkout(workout);
        setWorkoutModalVisible(false);
    };

    const removeWorkout = () => {
        setSelectedWorkout(null);
    };

    const resetForm = () => {
        setCaption('');
        setImageUri(null);
        setSelectedWorkout(null);
        setValueMilestone(null);
        setExerciseSearch('');
        setAmount('');
        setReps('');
        setNewWeight('');
        setFormError(null);
    };

    const renderVisibilityItem = (item: DropdownItem) => (
        <View style={postStyles.visibilityItem}>
            <View style={postStyles.visibilityItemLeft}>
                <Ionicons name={item.icon as any} size={20} color="#FFF" style={postStyles.visibilityIcon} />
                <Text style={postStyles.visibilityLabel}>{item.label}</Text>
            </View>
            <Text style={postStyles.visibilityDescription}>{item.description}</Text>
        </View>
    );

    const handleSubmitPost = async () => {
        try {
            // Validation based on post mode
            if (postMode === 'regular') {
                if (!imageUri && !caption.trim()) {
                    setFormError("Please add an image or a caption");
                    return;
                }
            } else if (postMode === 'milestone') {
                if (!valueMilestone) {
                    setFormError("Please select a milestone type");
                    return;
                }
                
                if (valueMilestone === 'PR') {
                    if (!exerciseSearch.trim() || !amount || !weightUnit || !reps) {
                        setFormError("Please complete all milestone fields");
                        return;
                    }
                } else if (valueMilestone === 'weightLoss' || valueMilestone === 'weightGain') {
                    if (!newWeight || !newWeightUnit) {
                        setFormError("Please enter your new weight");
                        return;
                    }
                }
            }
            
            setIsSubmitting(true);
            setFormError(null);
            
            // Prepare milestone details
            let milestoneDetails = null;
            if (postMode === 'milestone' && valueMilestone) {
                if (valueMilestone === 'PR') {
                    milestoneDetails = {
                        type: valueMilestone,
                        exercise: exerciseSearch,
                        value: amount,
                        weightUnit,
                        reps: parseInt(reps)
                    };
                } else if (valueMilestone === 'weightLoss' || valueMilestone === 'weightGain') {
                    milestoneDetails = {
                        type: valueMilestone,
                        newWeight,
                        newWeightUnit
                    };
                }
            }
            
            const postData = {
                caption: caption.trim(),
                imageUri,
                isMilestone: postMode === 'milestone',
                milestoneDetails,
                visibility: valueVisibility || 'public',
                workoutId: selectedWorkout?.id
            };
            
            const postId = await addPost(postData);
            console.log("Successfully created post with ID:", postId);
            Alert.alert('Success', 'Your post has been created!', [
                { text: 'OK', onPress: () => {
                    console.log("Navigating back to home after post creation");
                    router.push('/');
                }}
            ]);
        } catch (error) {
            console.error('Error creating post:', error);
            setFormError('Failed to create post. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={postStyles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={postStyles.postPage}>
                    {/* Header */}
                    <View style={postStyles.header}>
                        <View style={postStyles.postTypeSegmentedControl}>
                            <TouchableOpacity 
                                style={[
                                    postStyles.segmentButton, 
                                    postMode === 'regular' && postStyles.activeSegment
                                ]}
                                onPress={() => setPostMode('regular')}
                            >
                                <Ionicons 
                                    name="images-outline" 
                                    size={20} 
                                    color={postMode === 'regular' ? "#FFF" : "#999"}
                                />
                                <Text style={[
                                    postStyles.segmentText,
                                    postMode === 'regular' && postStyles.activeSegmentText
                                ]}>Post</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[
                                    postStyles.segmentButton,
                                    postMode === 'milestone' && postStyles.activeSegment
                                ]}
                                onPress={() => setPostMode('milestone')}
                            >
                                <MaterialCommunityIcons 
                                    name="trophy-outline" 
                                    size={20} 
                                    color={postMode === 'milestone' ? "#FFF" : "#999"}
                                />
                                <Text style={[
                                    postStyles.segmentText,
                                    postMode === 'milestone' && postStyles.activeSegmentText
                                ]}>Milestone</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity 
                            style={[postStyles.postButton, isSubmitting && postStyles.disabledButton]} 
                            onPress={handleSubmitPost}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={postStyles.postButtonText}>Post</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Error message if present */}
                    {formError ? (
                        <View style={postStyles.errorContainer}>
                            <Text style={postStyles.errorText}>{formError}</Text>
                        </View>
                    ) : null}

                    <ScrollView 
                        style={postStyles.scrollView}
                        contentContainerStyle={postStyles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Image picker section - always visible */}
                        <View style={postStyles.imageSection}>
                            {imageUri ? (
                                <View style={postStyles.selectedImageContainer}>
                                    <Image 
                                        source={{ uri: imageUri }} 
                                        style={postStyles.selectedImage}
                                    />
                                    <TouchableOpacity 
                                        style={postStyles.changeImageButton}
                                        onPress={() => setImageMenuVisible(true)}
                                    >
                                        <Feather name="edit-2" size={16} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    style={postStyles.addImageButton}
                                    onPress={() => setImageMenuVisible(true)}
                                >
                                    <Ionicons name="camera-outline" size={36} color="#FFF" />
                                    <Text style={postStyles.addImageText}>Add Photo</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Caption section - always visible */}
                        <View style={postStyles.captionContainer}>
                            <TextInput
                                style={postStyles.captionInput}
                                placeholder="Write a caption..."
                                placeholderTextColor="#999"
                                value={caption}
                                onChangeText={setCaption}
                                multiline={true}
                                maxLength={2200}
                                textAlignVertical="top"
                            />
                        </View>

                        {/* Milestone section - only visible in milestone mode */}
                        {postMode === 'milestone' && (
                            <View style={postStyles.sectionContainer}>
                                <View style={postStyles.sectionHeader}>
                                    <MaterialCommunityIcons name="trophy" size={22} color={SECONDARY_COLOR} />
                                    <Text style={postStyles.sectionTitle}>Milestone Details</Text>
                                </View>
                                
                                <View style={postStyles.milestoneContent}>
                                    <View style={postStyles.milestoneTypeContainer}>
                                        <Text style={postStyles.milestoneLabel}>Type</Text>
                                        <Dropdown
                                            data={itemsMilestone}
                                            labelField="label"
                                            valueField="value"
                                            placeholder="Select milestone type"
                                            value={valueMilestone}
                                            onChange={item => setValueMilestone(item.value)}
                                            style={postStyles.dropdown}
                                            containerStyle={postStyles.dropdownContainer}
                                            placeholderStyle={postStyles.dropdownPlaceholder}
                                            selectedTextStyle={postStyles.dropdownSelectedText}
                                            renderLeftIcon={() => (
                                                <MaterialCommunityIcons name="trophy" size={20} color={SECONDARY_COLOR} style={{marginRight: 10}} />
                                            )}
                                        />
                                    </View>
                                    
                                    {valueMilestone === 'PR' && (
                                        <View style={postStyles.prContainer}>
                                            <View style={postStyles.inputGroup}>
                                                <Text style={postStyles.inputLabel}>Exercise</Text>
                                                <TextInput
                                                    style={postStyles.exerciseInput}
                                                    placeholder="Search for exercise..."
                                                    placeholderTextColor="#999"
                                                    value={exerciseSearch}
                                                    onChangeText={handleExerciseSearch}
                                                />
                                                {filteredExercises.length > 0 && (
                                                    <View style={postStyles.suggestionsContainer}>
                                                        <ScrollView 
                                                            style={postStyles.suggestionsList}
                                                            nestedScrollEnabled={true}
                                                        >
                                                            {filteredExercises.map((exercise, index) => (
                                                                <TouchableOpacity
                                                                    key={index}
                                                                    onPress={() => {
                                                                        setExerciseSearch(exercise);
                                                                        setFilteredExercises([]);
                                                                    }}
                                                                    style={postStyles.suggestionItem}
                                                                >
                                                                    <Text style={postStyles.suggestionText}>{exercise}</Text>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </ScrollView>
                                                    </View>
                                                )}
                                            </View>
                                            
                                            <View style={postStyles.inputRow}>
                                                <View style={postStyles.weightInput}>
                                                    <Text style={postStyles.inputLabel}>Weight</Text>
                                                    <View style={postStyles.weightInputGroup}>
                                                        <TextInput
                                                            style={postStyles.numberInput}
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
                                                            style={postStyles.unitDropdown}
                                                            containerStyle={postStyles.unitDropdownContainer}
                                                            placeholderStyle={postStyles.dropdownPlaceholder}
                                                            selectedTextStyle={postStyles.dropdownSelectedText}
                                                        />
                                                    </View>
                                                </View>
                                                
                                                <View style={postStyles.repsInput}>
                                                    <Text style={postStyles.inputLabel}>Reps</Text>
                                                    <TextInput
                                                        style={postStyles.numberInput}
                                                        placeholder="0"
                                                        placeholderTextColor="#999"
                                                        keyboardType="numeric"
                                                        value={reps}
                                                        onChangeText={setReps}
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                    
                                    {(valueMilestone === 'weightLoss' || valueMilestone === 'weightGain') && (
                                        <View style={postStyles.weightMilestoneContainer}>
                                            <Text style={postStyles.inputLabel}>New Weight</Text>
                                            <View style={postStyles.weightInputGroup}>
                                                <TextInput
                                                    style={postStyles.numberInput}
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
                                                    style={postStyles.unitDropdown}
                                                    containerStyle={postStyles.unitDropdownContainer}
                                                    placeholderStyle={postStyles.dropdownPlaceholder}
                                                    selectedTextStyle={postStyles.dropdownSelectedText}
                                                />
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Workout attachment section - always available */}
                        <View style={postStyles.sectionContainer}>
                            <View style={postStyles.sectionHeader}>
                                <Ionicons name="barbell-outline" size={22} color="#FFF" />
                                <Text style={postStyles.sectionTitle}>Workout</Text>
                            </View>
                            
                            {selectedWorkout ? (
                                <View style={postStyles.selectedWorkoutContainer}>
                                    <TouchableOpacity 
                                        style={postStyles.attachedWorkoutContent}
                                        onPress={() => router.push(`/view-workout/${selectedWorkout.id}`)}
                                    >
                                        <Image 
                                            source={{ uri: selectedWorkout.thumbnail }}
                                            style={postStyles.workoutThumbnail}
                                        />
                                        <View style={postStyles.attachedWorkoutInfo}>
                                            <Text style={postStyles.attachedWorkoutTitle}>
                                                {selectedWorkout.title}
                                            </Text>
                                            <Text style={postStyles.attachedWorkoutDetails}>
                                                by {selectedWorkout.creatorName} • {selectedWorkout.segments} segments • {selectedWorkout.length}
                                            </Text>
                                        </View>
                                        <TouchableOpacity 
                                            onPress={removeWorkout}
                                            style={postStyles.removeWorkoutButton}
                                        >
                                            <Ionicons name="close-circle" size={22} color={SECONDARY_COLOR} />
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity 
                                    style={postStyles.attachWorkoutButton}
                                    onPress={() => setWorkoutModalVisible(true)}
                                >
                                    <Text style={postStyles.attachButtonText}>Select a workout</Text>
                                    <Ionicons name="add-circle" size={20} color={SECONDARY_COLOR} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Visibility options */}
                        <View style={postStyles.visibilityContainer}>
                            <View style={postStyles.visibilityHeader}>
                                <Ionicons name="eye-outline" size={20} color="#FFF" />
                                <Text style={postStyles.visibilityTitle}>Visibility</Text>
                            </View>
                            <TouchableOpacity 
                                style={postStyles.visibilitySelector}
                                onPress={() => setVisibilityModalVisible(true)}
                            >
                                <View style={postStyles.selectedVisibility}>
                                    <Ionicons 
                                        name={itemsVisibility.find(item => item.value === valueVisibility)?.icon as any || 'earth'} 
                                        size={18} 
                                        color="#FFF" 
                                    />
                                    <Text style={postStyles.selectedVisibilityText}>
                                        {itemsVisibility.find(item => item.value === valueVisibility)?.label || 'Public'}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-down" size={18} color="#999" />
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>

                {/* Image picker modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={imageMenuVisible}
                    onRequestClose={() => setImageMenuVisible(false)}
                >
                    <TouchableOpacity 
                        style={postStyles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setImageMenuVisible(false)}
                    >
                        <View style={postStyles.imageModalContent}>
                            <Text style={postStyles.imageModalTitle}>Add Photo</Text>
                            
                            <TouchableOpacity 
                                style={postStyles.imageModalOption}
                                onPress={openCamera}
                            >
                                <Ionicons name="camera-outline" size={24} color={SECONDARY_COLOR} />
                                <Text style={postStyles.imageModalOptionText}>Take a photo</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={postStyles.imageModalOption}
                                onPress={openImageLibrary}
                            >
                                <Ionicons name="images-outline" size={24} color={SECONDARY_COLOR} />
                                <Text style={postStyles.imageModalOptionText}>Choose from library</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={postStyles.cancelButton}
                                onPress={() => setImageMenuVisible(false)}
                            >
                                <Text style={postStyles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Workout selection modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={workoutModalVisible}
                    onRequestClose={() => setWorkoutModalVisible(false)}
                >
                    <View style={postStyles.modalContainer}>
                        <View style={postStyles.modalContent}>
                            <View style={postStyles.modalHeader}>
                                <Text style={postStyles.modalTitle}>Select Workout</Text>
                                <TouchableOpacity 
                                    onPress={() => setWorkoutModalVisible(false)}
                                    style={postStyles.closeButton}
                                >
                                    <Ionicons name="close" size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView 
                                style={postStyles.workoutList}
                                showsVerticalScrollIndicator={false}
                            >
                                {availableWorkouts.map((workout) => (
                                    <TouchableOpacity 
                                        key={workout.id}
                                        style={postStyles.workoutItem}
                                        onPress={() => selectWorkout(workout)}
                                    >
                                        <Image 
                                            source={{ uri: workout.thumbnail }}
                                            style={postStyles.workoutThumbnail}
                                        />
                                        <View style={postStyles.workoutItemInfo}>
                                            <Text style={postStyles.workoutItemTitle}>{workout.title}</Text>
                                            <Text style={postStyles.workoutItemCreator}>{workout.creatorName}</Text>
                                            <Text style={postStyles.workoutItemDetails}>
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

                {/* Visibility selection modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={visibilityModalVisible}
                    onRequestClose={() => setVisibilityModalVisible(false)}
                >
                    <TouchableOpacity 
                        style={postStyles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setVisibilityModalVisible(false)}
                    >
                        <View style={postStyles.visibilityModalContent}>
                            <Text style={postStyles.visibilityModalTitle}>Post Visibility</Text>
                            
                            {itemsVisibility.map((item) => (
                                <TouchableOpacity 
                                    key={item.value}
                                    style={[
                                        postStyles.visibilityModalOption,
                                        valueVisibility === item.value && postStyles.selectedVisibilityOption
                                    ]}
                                    onPress={() => {
                                        setValueVisibility(item.value);
                                        setVisibilityModalVisible(false);
                                    }}
                                >
                                    <View style={postStyles.visibilityOptionHeader}>
                                        <Ionicons name={item.icon as any} size={22} color={valueVisibility === item.value ? SECONDARY_COLOR : "#FFF"} />
                                        <Text style={[
                                            postStyles.visibilityOptionLabel,
                                            valueVisibility === item.value && postStyles.selectedVisibilityOptionText
                                        ]}>
                                            {item.label}
                                        </Text>
                                    </View>
                                    <Text style={postStyles.visibilityOptionDescription}>{item.description}</Text>
                                </TouchableOpacity>
                            ))}
                            
                            <TouchableOpacity 
                                style={postStyles.cancelButton}
                                onPress={() => setVisibilityModalVisible(false)}
                            >
                                <Text style={postStyles.cancelButtonText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const postStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    postPage: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    postTypeSegmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#111',
        borderRadius: 20,
        overflow: 'hidden',
    },
    segmentButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    activeSegment: {
        backgroundColor: SECONDARY_COLOR,
    },
    segmentText: {
        color: '#999',
        marginLeft: 6,
        fontWeight: '500',
    },
    activeSegmentText: {
        color: '#FFF',
    },
    postTitle: {
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 30,
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
        backgroundColor: '#111',
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
    
    // Milestone section
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
    disabledButton: {
        opacity: 0.5,
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