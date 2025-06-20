import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    TextInput,
    Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePostsData } from '@/hooks/usePostsData';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import SelectExercise from './SelectExercise';
import { Exercise, MetricType } from '@/data/exercises';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { fetchPreviousPRService, PreviousPRData } from '@/services/milestoneService';

// Import shared components
import {
    SECONDARY_COLOR,
    useImagePicker,
    ErrorMessage,
    ImageSection,
    CaptionInput,
    WorkoutAttachment,
    WorkoutSelectionModal,
    VisibilitySelector,
    VisibilityModal,
    visibilityItems
} from './PostComponents';

interface MilestoneWithPostProps {
    onBack?: () => void;
}

export default function MilestoneWithPost({ onBack }: MilestoneWithPostProps) {
    const router = useRouter();
    const { addPost } = usePostsData();
    const auth = useAuth() as any;
    const currentUser = auth?.currentUser;
    const userProfile = auth?.userProfile;
    
    // Form state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [valueVisibility, setValueVisibility] = useState<string | null>('public');
    const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
    
    // Previous PR data
    const [previousPR, setPreviousPR] = useState<PreviousPRData | null>(null);
    const [loadingPreviousPR, setLoadingPreviousPR] = useState(false);
    
    // Image picker
    const {
        imageUri, 
        imageMenuVisible,
        setImageMenuVisible,
        ImagePickerModal
    } = useImagePicker();

    // Achievement metric fields
    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('');
    const [distance, setDistance] = useState('');
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [seconds, setSeconds] = useState('');
    const [level, setLevel] = useState('');

    // Exercise selection
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [showExerciseSelector, setShowExerciseSelector] = useState(false);
    
    // Animation values for field transitions
    const [fadeAnim] = useState(new Animated.Value(0));
    const [prFadeAnim] = useState(new Animated.Value(0));
    
    // Workout attachment
    const [selectedWorkout, setSelectedWorkout] = useState<any>(null); // Consider typing this
    const [workoutModalVisible, setWorkoutModalVisible] = useState(false);

    // Fetch the previous PR for the selected exercise (using fake data for now)
    const fetchPreviousPR = async (exercise: Exercise) => {
        if (!currentUser) return;

        setLoadingPreviousPR(true);
        setPreviousPR(null);

        try {
            const prData = await fetchPreviousPRService(currentUser.uid, exercise);
            setPreviousPR(prData);
        } catch (error) {
            // The service already logs the error, but we can log here too if needed
            console.error("Error in component while fetching previous PR:", error);
            setPreviousPR(null);
        } finally {
            setLoadingPreviousPR(false);
            Animated.timing(prFadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true
            }).start();
        }
    };
    
    // Check if current input might be a PR
    useEffect(() => {
        if (!previousPR || !selectedExercise) return;
        
        let isPotentialPR = false;
        
        switch (selectedExercise.metricType) {
            case 'weight_reps':
                if (previousPR.weight && previousPR.reps) {
                    const currentWeight = parseFloat(weight || '0');
                    const currentReps = parseInt(reps || '0');
                    
                    // Check if either weight is higher with same/more reps, or same weight with more reps
                    if ((currentWeight > previousPR.weight && currentReps >= previousPR.reps) ||
                        (currentWeight === previousPR.weight && currentReps > previousPR.reps)) {
                        isPotentialPR = true;
                    }
                }
                break;
            case 'bodyweight_reps':
                if (previousPR.reps) {
                    const currentReps = parseInt(reps || '0');
                    if (currentReps > previousPR.reps) {
                        isPotentialPR = true;
                    }
                }
                break;
            case 'distance':
                if (previousPR.distance) {
                    const currentDistance = parseFloat(distance || '0');
                    if (currentDistance > previousPR.distance) {
                        isPotentialPR = true;
                    }
                }
                break;
            case 'duration':
                if (previousPR.duration) {
                    const currentDuration = 
                        (parseInt(hours || '0') * 3600) + 
                        (parseInt(minutes || '0') * 60) + 
                        parseInt(seconds || '0');
                    // For duration, longer is better
                    if (currentDuration > previousPR.duration) {
                        isPotentialPR = true;
                    }
                }
                break;
            case 'distance_time':
                if (previousPR.distance && previousPR.duration) {
                    const currentDistance = parseFloat(distance || '0');
                    const currentDuration = 
                        (parseInt(hours || '0') * 3600) + 
                        (parseInt(minutes || '0') * 60) + 
                        parseInt(seconds || '0');
                    
                    // For distance/time, faster pace is better
                    // Calculate pace (seconds per mile)
                    const previousPace = previousPR.duration / previousPR.distance;
                    const currentPace = currentDistance > 0 ? currentDuration / currentDistance : Infinity;
                    
                    if (currentPace < previousPace) {
                        isPotentialPR = true;
                    }
                }
                break;
            case 'duration_level':
                if (previousPR.duration && previousPR.level) {
                    const currentDuration = 
                        (parseInt(hours || '0') * 3600) + 
                        (parseInt(minutes || '0') * 60) + 
                        parseInt(seconds || '0');
                    const currentLevel = parseInt(level || '0');
                    
                    // For duration_level, either longer duration at same level or same duration at higher level is better
                    if ((currentDuration > previousPR.duration && currentLevel >= previousPR.level) ||
                        (currentDuration >= previousPR.duration && currentLevel > previousPR.level)) {
                        isPotentialPR = true;
                    }
                }
                break;
        }
        
        // Only update if necessary to avoid infinite update cycle
        if (previousPR && previousPR.isPR !== !isPotentialPR) {
            setPreviousPR(prev => prev ? {...prev, isPR: !isPotentialPR} : null);
        }
        
    }, [weight, reps, distance, hours, minutes, seconds, level, selectedExercise]);
    
    // Handle exercise selection from SelectExercise screen
    const handleExerciseSelect = (exercise: Exercise) => {
        setSelectedExercise(exercise);
        setShowExerciseSelector(false);
        
        // Reset form values when changing exercises
        setWeight('');
        setReps('');
        setDistance('');
        setHours('');
        setMinutes('');
        setSeconds('');
        setLevel('');
        setPreviousPR(null);
        
        // Reset PR fade animation
        prFadeAnim.setValue(0);
        
        // Fetch previous PR for this exercise
        fetchPreviousPR(exercise);
        
        // Animate the new fields
        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true
            })
        ]).start();
    };

    const selectWorkout = (workout: any) => {
        setSelectedWorkout(workout);
        setWorkoutModalVisible(false);
    };

    const removeWorkout = () => {
        setSelectedWorkout(null);
    };

    // Format duration in seconds to a human-readable string
    const formatDuration = (durationSeconds: number) => {
        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        const seconds = durationSeconds % 60;
        
        let result = '';
        if (hours > 0) result += `${hours}h `;
        if (minutes > 0 || hours > 0) result += `${minutes}m `;
        result += `${seconds}s`;
        
        return result.trim();
    };

    // Render previous PR card
    const renderPreviousPRCard = () => {
        if (!selectedExercise) return null;
        
        return (
            <Animated.View 
                style={[
                    styles.previousPRCard,
                    { opacity: prFadeAnim }
                ]}
            >
                {loadingPreviousPR ? (
                    <View style={styles.loadingPRContainer}>
                        <ActivityIndicator size="small" color={SECONDARY_COLOR} />
                        <Text style={styles.loadingPRText}>Loading previous record...</Text>
                    </View>
                ) : previousPR ? (
                    <>
                        <View style={styles.previousPRHeader}>
                            <MaterialCommunityIcons name="trophy-outline" size={18} color={SECONDARY_COLOR} />
                            <Text style={styles.previousPRTitle}>Previous Best</Text>
                            <Text style={styles.previousPRDate}>{previousPR.date}</Text>
                        </View>
                        
                        <View style={styles.previousPRContent}>
                            {selectedExercise.metricType === 'weight_reps' && previousPR.weight !== undefined && previousPR.reps !== undefined && (
                                <View style={styles.prMetricsRow}>
                                    <View style={styles.prMetricGroup}>
                                        <Text style={styles.prMetricValue}>{previousPR.weight}</Text>
                                        <Text style={styles.prMetricLabel}>lbs</Text>
                                    </View>
                                    <Text style={styles.prMetricSeparator}>×</Text>
                                    <View style={styles.prMetricGroup}>
                                        <Text style={styles.prMetricValue}>{previousPR.reps}</Text>
                                        <Text style={styles.prMetricLabel}>reps</Text>
                                    </View>
                                </View>
                            )}
                            
                            {selectedExercise.metricType === 'bodyweight_reps' && previousPR.reps !== undefined && (
                                <View style={styles.prMetricsRow}>
                                    <View style={styles.prMetricGroup}>
                                        <Text style={styles.prMetricValue}>{previousPR.reps}</Text>
                                        <Text style={styles.prMetricLabel}>reps</Text>
                                    </View>
                                </View>
                            )}
                            
                            {selectedExercise.metricType === 'duration' && previousPR.duration !== undefined && (
                                <View style={styles.prMetricsRow}>
                                    <View style={styles.prMetricGroup}>
                                        <Text style={styles.prMetricValue}>{formatDuration(previousPR.duration)}</Text>
                                        <Text style={styles.prMetricLabel}>duration</Text>
                                    </View>
                                </View>
                            )}
                            
                            {selectedExercise.metricType === 'distance' && previousPR.distance !== undefined && (
                                <View style={styles.prMetricsRow}>
                                    <View style={styles.prMetricGroup}>
                                        <Text style={styles.prMetricValue}>{previousPR.distance}</Text>
                                        <Text style={styles.prMetricLabel}>miles</Text>
                                    </View>
                                </View>
                            )}
                            
                            {selectedExercise.metricType === 'distance_time' && 
                             previousPR.distance !== undefined && 
                             previousPR.duration !== undefined && (
                                <View style={styles.prMetricsColumn}>
                                    <View style={styles.prMetricsRow}>
                                        <View style={styles.prMetricGroup}>
                                            <Text style={styles.prMetricValue}>{previousPR.distance}</Text>
                                            <Text style={styles.prMetricLabel}>miles</Text>
                                        </View>
                                    </View>
                                    <View style={styles.prMetricsRow}>
                                        <View style={styles.prMetricGroup}>
                                            <Text style={styles.prMetricValue}>{formatDuration(previousPR.duration)}</Text>
                                            <Text style={styles.prMetricLabel}>time</Text>
                                        </View>
                                    </View>
                                    <View style={styles.prMetricsRow}>
                                        <View style={styles.prMetricGroup}>
                                            <Text style={styles.prMetricValue}>
                                                {formatDuration(Math.round(previousPR.duration / previousPR.distance))}
                                            </Text>
                                            <Text style={styles.prMetricLabel}>per mile</Text>
                                        </View>
                                    </View>
                                </View>
                            )}
                            
                            {selectedExercise.metricType === 'duration_level' && 
                             previousPR.duration !== undefined && 
                             previousPR.level !== undefined && (
                                <View style={styles.prMetricsColumn}>
                                    <View style={styles.prMetricsRow}>
                                        <View style={styles.prMetricGroup}>
                                            <Text style={styles.prMetricValue}>{formatDuration(previousPR.duration)}</Text>
                                            <Text style={styles.prMetricLabel}>duration</Text>
                                        </View>
                                    </View>
                                    <View style={styles.prMetricsRow}>
                                        <View style={styles.prMetricGroup}>
                                            <Text style={styles.prMetricValue}>{previousPR.level}</Text>
                                            <Text style={styles.prMetricLabel}>level</Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {!previousPR.isPR && !!weight && !!reps && (
                                <View style={styles.potentialPRBadge}>
                                    <Text style={styles.potentialPRText}>Potential PR!</Text>
                                </View>
                            )}
                        </View>
                    </>
                ) : (
                    <View style={styles.noPreviousPRContainer}>
                        <Text style={styles.noPreviousPRText}>No previous record found</Text>
                        <Text style={styles.noPreviousPRSubtext}>This will be your first recorded PR!</Text>
                    </View>
                )}
            </Animated.View>
        );
    };

    // Validate and prepare achievement data based on exercise type
    const validateAndPrepareAchievementData = () => {
        if (!selectedExercise) {
            setFormError("Please select an exercise first");
            return null;
        }
        
        const metricType = selectedExercise.metricType;
        // Ensure this matches the ClientMilestoneDetails interface in usePostsData.tsx
        const achievementData: { 
            type: 'PR' | 'weightLoss' | 'weightGain';
            exerciseName?: string;
            exerciseId?: string;
            value?: number | string | null;
            reps?: number | null;
            duration?: number | null;
            level?: string | null;
            newWeight?: number | string | null;
            previousWeight?: number | string | null;
            weightUnit?: string | null;
            achievedAt?: string | null;
            previousValue?: number | null;
            previousReps?: number | null;
            previousDuration?: number | null;
            previousLevel?: number | null;
            previousDistance?: number | null;
        } = {
            type: 'PR',
            exerciseName: selectedExercise.name,
            exerciseId: selectedExercise.id,
            achievedAt: new Date().toISOString(),
        };
            switch (metricType) {
            case 'weight_reps':
                if (!weight || !reps) {
                    setFormError("Please enter both weight and reps");
                    return null;
                }
                achievementData.value = parseFloat(weight);
                achievementData.reps = parseInt(reps);
                achievementData.weightUnit = 'lbs';
                break;
                
            case 'bodyweight_reps':
                if (!reps) {
                    setFormError("Please enter number of reps");
                    return null;
                }
                achievementData.reps = parseInt(reps);
                
                break;
                
            case 'duration':
                if (!hours && !minutes && !seconds) {
                    setFormError("Please enter a duration");
                    return null;
                }
                const totalSeconds = 
                    (parseInt(hours || '0') * 3600) + 
                    (parseInt(minutes || '0') * 60) + 
                    parseInt(seconds || '0');
                achievementData.duration = totalSeconds;
                achievementData.value = totalSeconds;
                break;
                
            case 'distance':
                if (!distance) {
                    setFormError("Please enter a distance");
                    return null;
                }
                achievementData.value = parseFloat(distance);
                achievementData.weightUnit = 'miles';
                break;
                
            case 'distance_time':
                if (!distance) {
                    setFormError("Please enter a distance");
                    return null;
                }
                if (!hours && !minutes && !seconds) {
                    setFormError("Please enter a time");
                    return null;
                }
                const timeSeconds = 
                    (parseInt(hours || '0') * 3600) + 
                    (parseInt(minutes || '0') * 60) + 
                    parseInt(seconds || '0');
                achievementData.value = parseFloat(distance);
                achievementData.duration = timeSeconds;
                achievementData.weightUnit = 'miles';
                break;
                
            case 'duration_level':
                if (!hours && !minutes && !seconds) {
                    setFormError("Please enter a duration");
                    return null;
                }
                if (!level) {
                    setFormError("Please enter a difficulty level");
                    return null;
                }
                const durationSeconds = 
                    (parseInt(hours || '0') * 3600) + 
                    (parseInt(minutes || '0') * 60) + 
                    parseInt(seconds || '0');
                achievementData.duration = durationSeconds;
                achievementData.level = level;
                achievementData.value = durationSeconds;
                break;
                
            default:
                setFormError("Unsupported exercise type");
                return null;
        } 
        
        if (previousPR) {
            switch (metricType) {
                case 'weight_reps':
                    achievementData.previousValue = previousPR.weight;
                    achievementData.previousReps = previousPR.reps;
                    break;
                case 'bodyweight_reps':
                    achievementData.previousReps = previousPR.reps;
                    break;
                case 'duration':
                    achievementData.previousDuration = previousPR.duration;
                    break;
                case 'distance':
                    achievementData.previousDistance = previousPR.distance;
                    break;
                case 'distance_time':
                    achievementData.previousDistance = previousPR.distance;
                    achievementData.previousDuration = previousPR.duration;
                    break;
                case 'duration_level':
                    achievementData.previousDuration = previousPR.duration;
                    achievementData.previousLevel = previousPR.level;
                    break;
            }
        }

        return achievementData;
    };

    const handleSubmitPost = async () => {
        try {
            // Validation for both post and achievement fields
            if (!imageUri && !caption.trim()) {
                setFormError("Please add an image or a caption for your post");
                return;
            }
            
            const achievementDetails = validateAndPrepareAchievementData();
            if (!achievementDetails) {
                return;
            }
            
            setIsSubmitting(true);
            setFormError(null);
            
            // Ensure postData matches NewPostData interface from usePostsData
            const postData: {
                caption?: string;
                imageUri?: string;
                isMilestone: boolean;
                milestoneDetails?: typeof achievementDetails;
                visibility: 'public' | 'followers';
                workoutId?: string | null;
            } = {
                caption: caption.trim(),
                imageUri: imageUri ?? undefined,
                isMilestone: true,
                milestoneDetails: achievementDetails,
                visibility: (valueVisibility as 'public' | 'followers') || 'public',
                workoutId: selectedWorkout?.id || null
            };
            
            const postId = await addPost(postData);
            console.log("Successfully created achievement post with ID:", postId);
            Alert.alert('Success', 'Your achievement has been shared!', [
                { text: 'OK', onPress: () => {
                    console.log("Navigating back to home after achievement post creation");
                    router.push('/');
                }}
            ]);
        } catch (error) {
            console.error('Error creating achievement post:', error);
            setFormError('Failed to share achievement. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Dynamic metric fields based on exercise type
    const renderMetricFields = () => {
        if (!selectedExercise) return null;

        return (
            <Animated.View style={[styles.metricFieldsContainer, { opacity: fadeAnim }]}>
                {/* Previous PR Card */}
                {renderPreviousPRCard()}

                {selectedExercise.metricType === 'weight_reps' && (
                    <>
                        <View style={styles.metricRow}>
                            <View style={styles.metricField}>
                                <Text style={styles.metricLabel}>Weight (lbs)</Text>
                                <View style={styles.inputWithIcon}>
                                    <TextInput
                                        style={styles.metricInput}
                                        value={weight}
                                        onChangeText={setWeight}
                                        placeholder="0"
                                        placeholderTextColor="#666"
                                        keyboardType="numeric"
                                    />
                                    <MaterialCommunityIcons name="weight-pound" size={18} color="#777" style={styles.inputIcon} />
                                </View>
                            </View>
                            
                            <View style={styles.metricField}>
                                <Text style={styles.metricLabel}>Reps</Text>
                                <View style={styles.inputWithIcon}>
                                    <TextInput
                                        style={styles.metricInput}
                                        value={reps}
                                        onChangeText={setReps}
                                        placeholder="0"
                                        placeholderTextColor="#666"
                                        keyboardType="numeric"
                                    />
                                    <FontAwesome5 name="redo" size={14} color="#777" style={styles.inputIcon} />
                                </View>
                            </View>
                        </View>
                    </>
                )}

                {selectedExercise.metricType === 'bodyweight_reps' && (
                    <View style={styles.metricField}>
                        <Text style={styles.metricLabel}>Reps</Text>
                        <View style={styles.inputWithIcon}>
                            <TextInput
                                style={styles.metricInput}
                                value={reps}
                                onChangeText={setReps}
                                placeholder="0"
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                            />
                            <FontAwesome5 name="redo" size={14} color="#777" style={styles.inputIcon} />
                        </View>
                    </View>
                )}

                {(selectedExercise.metricType === 'duration' || selectedExercise.metricType === 'duration_level') && (
                    <View style={styles.metricContainer}>
                        <Text style={styles.metricLabel}>Duration</Text>
                        <View style={styles.timeInputContainer}>
                            <View style={styles.timeInputField}>
                                <TextInput
                                    style={styles.timeInput}
                                    value={hours}
                                    onChangeText={setHours}
                                    placeholder="0"
                                    placeholderTextColor="#666"
                                    keyboardType="numeric"
                                    maxLength={2}
                                />
                                <Text style={styles.timeUnit}>h</Text>
                            </View>
                            <Text style={styles.timeSeparator}>:</Text>
                            <View style={styles.timeInputField}>
                                <TextInput
                                    style={styles.timeInput}
                                    value={minutes}
                                    onChangeText={(text) => {
                                        const val = parseInt(text);
                                        if (isNaN(val) || val < 60) setMinutes(text);
                                    }}
                                    placeholder="00"
                                    placeholderTextColor="#666"
                                    keyboardType="numeric"
                                    maxLength={2}
                                />
                                <Text style={styles.timeUnit}>m</Text>
                            </View>
                            <Text style={styles.timeSeparator}>:</Text>
                            <View style={styles.timeInputField}>
                                <TextInput
                                    style={styles.timeInput}
                                    value={seconds}
                                    onChangeText={(text) => {
                                        const val = parseInt(text);
                                        if (isNaN(val) || val < 60) setSeconds(text);
                                    }}
                                    placeholder="00"
                                    placeholderTextColor="#666"
                                    keyboardType="numeric"
                                    maxLength={2}
                                />
                                <Text style={styles.timeUnit}>s</Text>
                            </View>
                        </View>

                        {selectedExercise.metricType === 'duration_level' && (
                            <View style={[styles.metricField, {marginTop: 16}]}>
                                <Text style={styles.metricLabel}>Difficulty Level</Text>
                                <View style={styles.inputWithIcon}>
                                    <TextInput
                                        style={styles.metricInput}
                                        value={level}
                                        onChangeText={setLevel}
                                        placeholder="1-10"
                                        placeholderTextColor="#666"
                                        keyboardType="numeric"
                                        maxLength={2}
                                    />
                                    <MaterialCommunityIcons name="signal-cellular-3" size={18} color="#777" style={styles.inputIcon} />
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {selectedExercise.metricType === 'distance' && (
                    <View style={styles.metricField}>
                        <Text style={styles.metricLabel}>Distance (miles)</Text>
                        <View style={styles.inputWithIcon}>
                            <TextInput
                                style={styles.metricInput}
                                value={distance}
                                onChangeText={setDistance}
                                placeholder="0.0"
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                            />
                            <MaterialCommunityIcons name="map-marker-distance" size={18} color="#777" style={styles.inputIcon} />
                        </View>
                    </View>
                )}

                {selectedExercise.metricType === 'distance_time' && (
                    <View style={styles.metricContainer}>
                        <View style={styles.metricField}>
                            <Text style={styles.metricLabel}>Distance (miles)</Text>
                            <View style={styles.inputWithIcon}>
                                <TextInput
                                    style={styles.metricInput}
                                    value={distance}
                                    onChangeText={setDistance}
                                    placeholder="0.0"
                                    placeholderTextColor="#666"
                                    keyboardType="numeric"
                                />
                                <MaterialCommunityIcons name="map-marker-distance" size={18} color="#777" style={styles.inputIcon} />
                            </View>
                        </View>

                        <View style={[styles.metricField, {marginTop: 16}]}>
                            <Text style={styles.metricLabel}>Time</Text>
                            <View style={styles.timeInputContainer}>
                                <View style={styles.timeInputField}>
                                    <TextInput
                                        style={styles.timeInput}
                                        value={hours}
                                        onChangeText={setHours}
                                        placeholder="0"
                                        placeholderTextColor="#666"
                                        keyboardType="numeric"
                                        maxLength={2}
                                    />
                                    <Text style={styles.timeUnit}>h</Text>
                                </View>
                                <Text style={styles.timeSeparator}>:</Text>
                                <View style={styles.timeInputField}>
                                    <TextInput
                                        style={styles.timeInput}
                                        value={minutes}
                                        onChangeText={(text) => {
                                            const val = parseInt(text);
                                            if (isNaN(val) || val < 60) setMinutes(text);
                                        }}
                                        placeholder="00"
                                        placeholderTextColor="#666"
                                        keyboardType="numeric"
                                        maxLength={2}
                                    />
                                    <Text style={styles.timeUnit}>m</Text>
                                </View>
                                <Text style={styles.timeSeparator}>:</Text>
                                <View style={styles.timeInputField}>
                                    <TextInput
                                        style={styles.timeInput}
                                        value={seconds}
                                        onChangeText={(text) => {
                                            const val = parseInt(text);
                                            if (isNaN(val) || val < 60) setSeconds(text);
                                        }}
                                        placeholder="00"
                                        placeholderTextColor="#666"
                                        keyboardType="numeric"
                                        maxLength={2}
                                    />
                                    <Text style={styles.timeUnit}>s</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}
            </Animated.View>
        );
    };

    // Render the exercise selection screen if active
    if (showExerciseSelector) {
        return <SelectExercise 
            onSelectExercise={handleExerciseSelect}
            onBack={() => setShowExerciseSelector(false)}
        />;
    }

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
                        <Text style={styles.headerTitle}>Achievement Post</Text>
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

                        {/* Achievement Section */}
                        <View style={styles.achievementSection}>
                            <View style={styles.sectionHeader}>
                                <MaterialCommunityIcons name="trophy-outline" size={24} color={SECONDARY_COLOR} />
                                <Text style={styles.sectionTitle}>Personal Record</Text>
                            </View>
                            
                            <View style={styles.achievementContent}>
                                {/* Exercise Selector */}
                                <View style={styles.exerciseContainer}>
                                    <Text style={styles.exerciseLabel}>Exercise</Text>
                                    <TouchableOpacity 
                                        style={styles.exerciseSelectButton}
                                        onPress={() => setShowExerciseSelector(true)}
                                    >
                                        {selectedExercise ? (
                                            <View style={styles.selectedExerciseContent}>
                                                <View style={styles.exerciseIconContainer}>
                                                    {selectedExercise.category === 'strength' && <MaterialCommunityIcons name="weight-lifter" size={20} color="#FFF" />}
                                                    {selectedExercise.category === 'cardio' && <MaterialCommunityIcons name="heart-pulse" size={20} color="#FFF" />}
                                                    {selectedExercise.category === 'bodyweight' && <MaterialCommunityIcons name="human" size={20} color="#FFF" />}
                                                    {selectedExercise.category === 'flexibility' && <MaterialCommunityIcons name="yoga" size={20} color="#FFF" />}
                                                    {selectedExercise.category === 'sports' && <Ionicons name="basketball" size={20} color="#FFF" />}
                                                </View>
                                                <View style={styles.exerciseInfo}>
                                                    <Text style={styles.exerciseTitle}>{selectedExercise.name}</Text>
                                                    <Text style={styles.exerciseCategory}>{selectedExercise.category.charAt(0).toUpperCase() + selectedExercise.category.slice(1)}</Text>
                                                </View>
                                                <Feather name="edit" size={18} color="#777" />
                                            </View>
                                        ) : (
                                            <View style={styles.exercisePlaceholder}>
                                                <Text style={styles.exercisePlaceholderText}>Select an exercise</Text>
                                                <Ionicons name="search" size={20} color="#777" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                                
                                {/* Dynamic Metric Fields */}
                                {renderMetricFields()}
                            </View>
                        </View>

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
        borderBottomWidth: 1,
        borderBottomColor: '#222',
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
        borderRadius: 20,
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
    achievementSection: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#222',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFF',
        marginLeft: 10,
    },
    achievementContent: {
        backgroundColor: '#111',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#222',
    },
    
    // Exercise selector styles
    exerciseContainer: {
        marginBottom: 20,
    },
    exerciseLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 8,
    },
    exerciseSelectButton: {
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        overflow: 'hidden',
    },
    exercisePlaceholder: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    exercisePlaceholderText: {
        color: '#777',
        fontSize: 16,
    },
    selectedExerciseContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    exerciseIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: SECONDARY_COLOR,
        justifyContent: 'center',
        alignItems: 'center',
    },
    exerciseInfo: {
        flex: 1,
        marginLeft: 12,
    },
    exerciseTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    exerciseCategory: {
        color: '#777',
        fontSize: 14,
        marginTop: 2,
    },

    // Metric fields styles
    metricFieldsContainer: {
        marginTop: 8,
    },
    metricContainer: {
        marginBottom: 8,
    },
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metricField: {
        flex: 1,
        marginHorizontal: 4,
    },
    metricLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#FFF',
        marginBottom: 8,
    },
    metricInput: {
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 10,
        color: '#FFF',
        padding: 12,
        fontSize: 16,
        flex: 1,
        paddingRight: 40, // Space for the icon
    },
    inputWithIcon: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
    },
    inputIcon: {
        position: 'absolute',
        right: 12,
    },
    
    // Time input styles
    timeInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeInputField: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 10,
        padding: 8,
        flex: 1,
    },
    timeInput: {
        color: '#FFF',
        fontSize: 16,
        textAlign: 'center',
        flex: 1,
    },
    timeUnit: {
        color: '#777',
        fontSize: 14,
        marginLeft: 4,
    },
    timeSeparator: {
        color: '#FFF',
        fontSize: 20,
        marginHorizontal: 8,
        fontWeight: 'bold',
    },

    // Previous PR card styles
    previousPRCard: {
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#333',
        overflow: 'hidden',
    },
    previousPRHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        backgroundColor: '#222',
    },
    previousPRTitle: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 6,
        flex: 1,
    },
    previousPRDate: {
        color: '#999',
        fontSize: 12,
    },
    previousPRContent: {
        padding: 12,
    },
    loadingPRContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    loadingPRText: {
        color: '#999',
        marginLeft: 8,
    },
    noPreviousPRContainer: {
        padding: 16,
        alignItems: 'center',
    },
    noPreviousPRText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '500',
    },
    noPreviousPRSubtext: {
        color: '#999',
        fontSize: 13,
        marginTop: 4,
    },
    prMetricsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 4,
    },
    prMetricsColumn: {
        alignItems: 'center',
    },
    prMetricGroup: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    prMetricValue: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '700',
    },
    prMetricLabel: {
        color: '#999',
        fontSize: 14,
        marginLeft: 4,
    },
    prMetricSeparator: {
        color: SECONDARY_COLOR,
        fontSize: 18,
        marginHorizontal: 8,
    },
    potentialPRBadge: {
        backgroundColor: SECONDARY_COLOR,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        alignSelf: 'center',
        marginTop: 10,
    },
    potentialPRText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 13,
    },
});