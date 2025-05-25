import React, { useState } from 'react';
import { 
    View, 
    Text,
    Alert,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePostsData } from '@/hooks/usePostsData';
import { useAuth } from '@/context/AuthContext';
import { Dropdown } from 'react-native-element-dropdown';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// Import shared components
import {
    SECONDARY_COLOR,
    SECONDARY_COLOR_LIGHT,
    PostHeader,
    ErrorMessage,
    VisibilitySelector,
    VisibilityModal,
    visibilityItems,
    milestoneItems,
    weightUnitItems,
    PRFields,
    WeightFields,
    PostAttachment,
    PostSelectionModal
} from './PostComponents';

interface MilestoneOnlyPostProps {
    onBack?: () => void;
}

export default function MilestoneOnlyPost({ onBack }: MilestoneOnlyPostProps) {
    const router = useRouter();
    const { addPost } = usePostsData();
    const auth = useAuth() as any;
    const currentUser = auth?.currentUser;
    const userProfile = auth?.userProfile;
    
    // Form state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [valueVisibility, setValueVisibility] = useState<string | null>('public');
    const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
    
    // Milestone specific fields
    const [valueMilestone, setValueMilestone] = useState<string | null>(null);
    
    // PR fields
    const [exerciseSearch, setExerciseSearch] = useState('');
    const [amount, setAmount] = useState('');
    const [weightUnit, setWeightUnit] = useState<string | null>('lbs');
    const [reps, setReps] = useState('');
    
    // Weight fields
    const [newWeight, setNewWeight] = useState('');
    const [newWeightUnit, setNewWeightUnit] = useState<string | null>('lbs');
    
    // Post attachment
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [postModalVisible, setPostModalVisible] = useState(false);
    
    // Sample user posts data
    const [availablePosts] = useState([
        {
            id: 'p1',
            caption: 'Great workout today! Feeling pumped.',
            imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            date: 'May 24, 2025',
            likes: 45,
            comments: 12
        },
        {
            id: 'p2',
            caption: 'Sunday morning run with amazing views',
            imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            date: 'May 23, 2025',
            likes: 32,
            comments: 8
        },
        {
            id: 'p3',
            caption: 'New workout gear has arrived!',
            imageUrl: 'https://images.unsplash.com/photo-1556817411-31ae72fa3ea0?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
            date: 'May 22, 2025',
            likes: 28,
            comments: 5
        },
        {
            id: 'p4',
            caption: 'Thoughts on my training plan?',
            imageUrl: null,
            date: 'May 20, 2025',
            likes: 15,
            comments: 23
        }
    ]);
    
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
    
    const selectPost = (post: any) => {
        setSelectedPost(post);
        setPostModalVisible(false);
    };

    const removePost = () => {
        setSelectedPost(null);
    };

    const handleSubmitPost = async () => {
        try {
            // Validation for milestone fields
            if (!valueMilestone) {
                setFormError("Please select a milestone type");
                return;
            }
                
            if (valueMilestone === 'PR') {
                if (!exerciseSearch.trim() || !amount || !weightUnit || !reps) {
                    setFormError("Please complete all PR milestone fields");
                    return;
                }
            } else if (valueMilestone === 'weightLoss' || valueMilestone === 'weightGain') {
                if (!newWeight || !newWeightUnit) {
                    setFormError("Please enter your new weight");
                    return;
                }
            }
            
            setIsSubmitting(true);
            setFormError(null);
            
            // Prepare milestone details
            let milestoneDetails = null;
            if (valueMilestone) {
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
                caption: '', // No caption for milestone-only posts
                imageUri: null, // No image for milestone-only posts
                isMilestone: true,
                milestoneDetails,
                visibility: valueVisibility || 'public',
            };
            
            const postId = await addPost(postData);
            console.log("Successfully created milestone with ID:", postId);
            Alert.alert('Success', 'Your milestone has been shared!', [
                { text: 'OK', onPress: () => {
                    console.log("Navigating back to home after milestone creation");
                    router.push('/');
                }}
            ]);
        } catch (error) {
            console.error('Error creating milestone:', error);
            setFormError('Failed to share milestone. Please try again.');
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
                        <Text style={styles.headerTitle}>New Milestone</Text>
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
                        {/* Milestone Type Selection */}
                        <View style={styles.milestoneSection}>
                            <View style={styles.sectionHeader}>
                                <MaterialCommunityIcons name="trophy" size={22} color={SECONDARY_COLOR} />
                                <Text style={styles.sectionTitle}>Achievement Type</Text>
                            </View>
                            
                            <View style={styles.milestoneContent}>
                                <View style={styles.milestoneTypeContainer}>
                                    <Dropdown
                                        data={milestoneItems}
                                        labelField="label"
                                        valueField="value"
                                        placeholder="Select milestone type"
                                        value={valueMilestone}
                                        onChange={item => setValueMilestone(item.value)}
                                        style={styles.dropdown}
                                        containerStyle={styles.dropdownContainer}
                                        placeholderStyle={styles.dropdownPlaceholder}
                                        selectedTextStyle={styles.dropdownSelectedText}
                                        renderLeftIcon={() => (
                                            <MaterialCommunityIcons name="trophy" size={20} color={SECONDARY_COLOR} style={{marginRight: 10}} />
                                        )}
                                    />
                                </View>
                                
                                {/* PR Fields */}
                                {valueMilestone === 'PR' && (
                                    <PRFields
                                        exerciseSearch={exerciseSearch}
                                        handleExerciseSearch={handleExerciseSearch}
                                        filteredExercises={filteredExercises}
                                        setExerciseSearch={setExerciseSearch}
                                        setFilteredExercises={setFilteredExercises}
                                        amount={amount}
                                        setAmount={setAmount}
                                        weightUnit={weightUnit}
                                        setWeightUnit={setWeightUnit}
                                        itemsWeightUnit={weightUnitItems}
                                        reps={reps}
                                        setReps={setReps}
                                    />
                                )}
                                
                                {/* Weight Fields */}
                                {(valueMilestone === 'weightLoss' || valueMilestone === 'weightGain') && (
                                    <WeightFields
                                        newWeight={newWeight}
                                        setNewWeight={setNewWeight}
                                        newWeightUnit={newWeightUnit}
                                        setNewWeightUnit={setNewWeightUnit}
                                        itemsNewWeightUnit={weightUnitItems}
                                    />
                                )}
                            </View>

                            {/* Achievement Note - shown only when a milestone type is selected */}
                            {valueMilestone && (
                                <View style={styles.achievementNoteContainer}>
                                    <Text style={styles.achievementNoteLabel}>
                                        {valueMilestone === 'PR' ? 'PR Achievement Note:' : 'Weight Achievement Note:'}
                                    </Text>
                                    <View style={styles.achievementNoteContent}>
                                        <Ionicons name="information-circle-outline" size={22} color={SECONDARY_COLOR} />
                                        <Text style={styles.achievementNoteText}>
                                            {valueMilestone === 'PR' 
                                                ? 'Your personal record will be saved to your profile and will be visible to your followers.' 
                                                : 'Your weight milestone will be saved to track your progress over time.'}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Post attachment section */}
                        <PostAttachment
                            selectedPost={selectedPost}
                            setPostModalVisible={setPostModalVisible}
                            removePost={removePost}
                        />

                        {/* Visibility options */}
                        <VisibilitySelector
                            valueVisibility={valueVisibility}
                            setVisibilityModalVisible={setVisibilityModalVisible}
                            itemsVisibility={visibilityItems}
                        />
                    </ScrollView>
                </View>

                {/* Visibility selection modal */}
                <VisibilityModal
                    visibilityModalVisible={visibilityModalVisible}
                    setVisibilityModalVisible={setVisibilityModalVisible}
                    valueVisibility={valueVisibility}
                    setValueVisibility={setValueVisibility}
                    itemsVisibility={visibilityItems}
                />

                {/* Post selection modal */}
                <PostSelectionModal
                    postModalVisible={postModalVisible}
                    setPostModalVisible={setPostModalVisible}
                    selectPost={selectPost}
                    availablePosts={availablePosts}
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
    milestoneSection: {
        paddingHorizontal: 16,
        paddingVertical: 16,
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
    // Achievement note styles
    achievementNoteContainer: {
        marginTop: 16,
        backgroundColor: SECONDARY_COLOR_LIGHT,
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 3,
        borderLeftColor: SECONDARY_COLOR,
    },
    achievementNoteLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
    },
    achievementNoteContent: {
        flexDirection: 'row',
    },
    achievementNoteText: {
        color: '#FFF',
        marginLeft: 8,
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
});