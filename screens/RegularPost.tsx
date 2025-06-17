import React, { useState } from 'react';
import { 
    View, 
    TouchableOpacity, 
    Text,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
    Modal,
    TextInput,
    ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePostsData } from '@/hooks/usePostsData';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Import shared components
import {
    SECONDARY_COLOR,
    useImagePicker,
    PostHeader,
    ErrorMessage,
    ImageSection,
    CaptionInput,
    WorkoutAttachment,
    MilestoneAttachment,
    MilestoneSelectionModal,
    WorkoutSelectionModal,
    VisibilitySelector,
    VisibilityModal,
    visibilityItems,
    milestoneItems,
    weightUnitItems,
    PRFields,
    WeightFields,
} from './PostComponents';

interface RegularPostProps {
    onBack?: () => void;
}

export default function RegularPost({ onBack }: RegularPostProps) {
    const router = useRouter();
    const { addPost } = usePostsData();
    // Using type assertion to fix TypeScript errors
    const auth = useAuth() as any;
    const currentUser = auth?.currentUser;
    const userProfile = auth?.userProfile;
    
    // Form state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [valueVisibility, setValueVisibility] = useState<string | null>('public');
    const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
    
    // Image picker
    const {
        imageUri, 
        imageMenuVisible,
        setImageMenuVisible,
        ImagePickerModal
    } = useImagePicker();
    
    // Workout attachment
    const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
    const [workoutModalVisible, setWorkoutModalVisible] = useState(false);

    // Milestone attachment
    const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
    const [milestoneModalVisible, setMilestoneModalVisible] = useState(false);
    const [valueMilestone, setValueMilestone] = useState<string | null>(null);
    const [milestoneDetailsModalVisible, setMilestoneDetailsModalVisible] = useState(false);
    
    // PR fields
    const [exerciseSearch, setExerciseSearch] = useState('');
    const [amount, setAmount] = useState('');
    const [weightUnit, setWeightUnit] = useState<string | null>('lbs');
    const [reps, setReps] = useState('');
    
    // Weight fields
    const [newWeight, setNewWeight] = useState('');
    const [newWeightUnit, setNewWeightUnit] = useState<string | null>('lbs');
    
    // Exercises database
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

    // Sample user milestone data
    const [availableMilestones] = useState([
        {
            id: 'm1',
            type: 'PR',
            title: 'Bench Press PR',
            details: '225 lbs × 5 reps',
            date: 'May 23, 2025',
            improvement: '9.7%'
        },
        {
            id: 'm2',
            type: 'PR',
            title: '10K Run PR',
            details: '42.5 min',
            date: 'May 24, 2025',
            improvement: '7.2%'
        },
        {
            id: 'm3',
            type: 'weightLoss',
            title: 'Weight Loss',
            details: '15 lbs (8.3%)',
            date: 'May 24, 2025'
        },
        {
            id: 'm4',
            type: 'PR',
            title: 'Squat PR',
            details: '315 lbs × 3 reps',
            date: 'May 25, 2025',
            improvement: '14.5%'
        }
    ]);


    const selectWorkout = (workout: any) => { // Consider typing workout to WorkoutItemData
        setSelectedWorkout(workout);
        setWorkoutModalVisible(false);
    };

    const removeWorkout = () => {
        setSelectedWorkout(null);
    };

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

    const selectMilestone = (milestone: any) => {
        setSelectedMilestone(milestone);
        setMilestoneModalVisible(false);
    };

    const removeMilestone = () => {
        setSelectedMilestone(null);
        setValueMilestone(null);
    };

    const handleSubmitPost = async () => {
        try {
            // Validation
            if (!imageUri && !caption.trim()) {
                setFormError("Please add an image or a caption");
                return;
            }
            
            setIsSubmitting(true);
            setFormError(null);
            
            const postData = {
                caption: caption.trim(),
                imageUri,
                isMilestone: false,
                milestoneDetails: selectedMilestone ? {
                    type: selectedMilestone.type,
                    title: selectedMilestone.title,
                    details: selectedMilestone.details
                } : null,
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
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.postPage}>
                    {/* Header with back button */}
                    <View style={styles.header}>
                        {onBack && (
                            <TouchableOpacity 
                                style={styles.backButton}
                                onPress={onBack}
                            >
                                <Ionicons name="chevron-back" size={24} color="#FFF" />
                            </TouchableOpacity>
                        )}
                        <Text style={styles.headerTitle}>New Post</Text>
                        <TouchableOpacity 
                            style={[styles.postButton, isSubmitting && styles.disabledButton]} 
                            onPress={handleSubmitPost}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={styles.postButtonText}>Post</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Error message if present */}
                    <ErrorMessage error={formError} />

                    <ScrollView 
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Image picker section */}
                        <ImageSection 
                            imageUri={imageUri}
                            setImageMenuVisible={setImageMenuVisible}
                        />

                        {/* Caption section */}
                        <CaptionInput
                            caption={caption}
                            setCaption={setCaption}
                        />

                        {/* Milestone attachment section */}
                        <MilestoneAttachment
                            selectedMilestone={selectedMilestone}
                            setMilestoneModalVisible={setMilestoneModalVisible}
                            removeMilestone={removeMilestone}
                        />

                        {/* Workout attachment section */}
                        <WorkoutAttachment
                            selectedWorkout={selectedWorkout}
                            setWorkoutModalVisible={setWorkoutModalVisible}
                            removeWorkout={removeWorkout}
                        />

                        {/* Visibility options */}
                        <VisibilitySelector
                            valueVisibility={valueVisibility}
                            setVisibilityModalVisible={setVisibilityModalVisible}
                            itemsVisibility={visibilityItems}
                        />
                    </ScrollView>
                </View>

                {/* Image picker modal */}
                <ImagePickerModal />

                {/* Workout selection modal */}
                <WorkoutSelectionModal
                    workoutModalVisible={workoutModalVisible}
                    setWorkoutModalVisible={setWorkoutModalVisible}
                    selectWorkout={selectWorkout}
                />

                {/* Visibility selection modal */}
                <VisibilityModal
                    visibilityModalVisible={visibilityModalVisible}
                    setVisibilityModalVisible={setVisibilityModalVisible}
                    valueVisibility={valueVisibility}
                    setValueVisibility={setValueVisibility}
                    itemsVisibility={visibilityItems}
                />

                {/* Milestone selection modal */}
                <MilestoneSelectionModal
                    milestoneModalVisible={milestoneModalVisible}
                    setMilestoneModalVisible={setMilestoneModalVisible}
                    selectMilestone={selectMilestone}
                    availableMilestones={availableMilestones}
                />
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
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
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        flex: 1,
        textAlign: 'center',
    },
    backButton: {
        padding: 5,
        zIndex: 1,
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 30,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#111',
        borderRadius: 8,
        padding: 16,
        elevation: 4,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 12,
        textAlign: 'center',
    },
    closeButton: {
        marginTop: 12,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: SECONDARY_COLOR,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#FFF',
        fontWeight: '600',
    },
    milestoneOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    milestoneOption: {
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: '#222',
        alignItems: 'center',
    },
    milestoneOptionText: {
        color: '#FFF',
        fontWeight: '500',
    },
    prFields: {
        marginBottom: 12,
    },
    fieldLabel: {
        color: '#FFF',
        fontWeight: '500',
        marginBottom: 4,
    },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#222',
        marginBottom: 12,
    },
    dropdownText: {
        color: '#FFF',
        fontWeight: '500',
    },
    exerciseList: {
        maxHeight: 200,
        backgroundColor: '#111',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 12,
    },
    exerciseItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    exerciseItemText: {
        color: '#FFF',
        fontWeight: '500',
    },
    weightFields: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    weightInput: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#222',
        color: '#FFF',
        fontWeight: '500',
        marginRight: 8,
    },
    repsInput: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#222',
        color: '#FFF',
        fontWeight: '500',
    },
});