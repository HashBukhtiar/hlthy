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
import { doc, getDoc, setDoc } from '@/features/infra/firestore';
import { db } from '@/firebaseConfig';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import SelectExercise from './SelectExercise';
import { Exercise, MetricType } from '@/data/exercises';
import { fetchPreviousPRService, PreviousPRData, fetchLastKnownWeight } from '@/services/milestoneService';
import {
    SECONDARY_COLOR,
    useMediaPicker,
    ErrorMessage,
    MediaSection,
    MediaPickerModal,
    CaptionInput,
    WorkoutAttachment,
    WorkoutSelectionModal,
} from './PostComponents';
import type { MediaResult } from './PostComponents';
import { MentionData } from '@/features/mentions/domain/Mention';
import { useUnits } from '@/hooks/useUnits';

interface MilestoneWithPostProps {
    onBack?: () => void;
}

export default function MilestoneWithPost({ onBack }: MilestoneWithPostProps) {
    const router = useRouter();
    const { addPost } = usePostsData();
    const { currentUser } = useAuth();
    const userProfile = currentUser?.userProfile;

    // Form state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [captionMentions, setCaptionMentions] = useState<MentionData[]>([]);
    const { getWeightUnit, getDistanceUnit } = useUnits();
    
    // Previous PR data
    const [previousPR, setPreviousPR] = useState<PreviousPRData | null>(null);
    const [loadingPreviousPR, setLoadingPreviousPR] = useState(false);
    
    // Media state
    const [selectedMedia, setSelectedMedia] = useState<MediaResult | null>(null);
    const [mediaMenuVisible, setMediaMenuVisible] = useState(false);

    // Media picker hook
    const { openCamera, openMediaLibrary, isProcessing } = useMediaPicker((result) => {
        setSelectedMedia(result);
        setMediaMenuVisible(false);
    });

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
    
    // Milestone type selection
    const [milestoneType, setMilestoneType] = useState<'PR' | 'weightLoss' | 'weightGain'>('PR');
    
    // Weight milestone fields
    const [newBodyWeight, setNewBodyWeight] = useState('');
    const [previousBodyWeight, setPreviousBodyWeight] = useState('');
    
    // Track if this is user's first weight milestone
    const [isFirstWeightMilestone, setIsFirstWeightMilestone] = useState(false);
    const [loadingLastWeight, setLoadingLastWeight] = useState(false);
    
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

    // Fetch last known weight when milestone type changes to weight loss/gain
    useEffect(() => {
        const fetchAndSetLastWeight = async () => {
            if (milestoneType === 'weightLoss' || milestoneType === 'weightGain') {
                if (!currentUser) {
                    return;
                }
                
                setLoadingLastWeight(true);
                try {
                    const lastWeight = await fetchLastKnownWeight(currentUser.uid);
                    
                    if (lastWeight) {
                        // Convert to user's current unit preference if needed
                        const userUnit = getWeightUnit();
                        let weightValue = lastWeight.weight;
                        
                        if (lastWeight.unit !== userUnit) {
                            if (lastWeight.unit === 'kg' && userUnit === 'lbs') {
                                weightValue = Math.round(lastWeight.weight * 2.20462 * 10) / 10;
                            } else if (lastWeight.unit === 'lbs' && userUnit === 'kg') {
                                weightValue = Math.round(lastWeight.weight * 0.453592 * 10) / 10;
                            }
                        }
                        
                        setPreviousBodyWeight(weightValue.toString());
                        setIsFirstWeightMilestone(false);
                    } else {
                        // No previous weight found - this is their first weight milestone
                        setPreviousBodyWeight('');
                        setIsFirstWeightMilestone(true);
                    }
                } catch (error) {
                    console.error('Error fetching last weight:', error);
                    setIsFirstWeightMilestone(true);
                } finally {
                    setLoadingLastWeight(false);
                }
            } else {
                // Reset when switching back to PR
                setPreviousBodyWeight('');
                setIsFirstWeightMilestone(false);
            }
        };

        fetchAndSetLastWeight();
    }, [milestoneType, currentUser]);

    useEffect(() => {
        if (milestoneType === 'PR' || !newBodyWeight || !previousBodyWeight) {
            return;
        }
        
        const newWeightNum = parseFloat(newBodyWeight);
        const prevWeightNum = parseFloat(previousBodyWeight);
        
        if (isNaN(newWeightNum) || isNaN(prevWeightNum)) {
            return;
        }
        
        // Show warning but don't block submission yet
        if (milestoneType === 'weightLoss' && newWeightNum >= prevWeightNum) {
            setFormError("Weight loss should show a decrease");
        } else if (milestoneType === 'weightGain' && newWeightNum <= prevWeightNum) {
            setFormError("Weight gain should show an increase");
        } else {
            setFormError(null);
        }
    }, [newBodyWeight, previousBodyWeight, milestoneType]);
    
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

    const handleSubmitPost = async () => {
        // Validation for both post and achievement fields
        if (!selectedMedia && !caption.trim()) {
            setFormError("Please add media or a caption for your post");
            return;
        }
        
        // Type-based validation
        if (milestoneType === 'PR') {
            if (!selectedExercise) {
                setFormError("Please select an exercise first");
                return;
            }
        } else {
            // Weight milestone validation
            if (!newBodyWeight) {
                setFormError("Please enter your new body weight");
                return;
            }
            
            // Previous weight is now ALWAYS required
            if (!previousBodyWeight) {
                setFormError("Please enter your previous weight");
                return;
            }
            
            const newWeightNum = parseFloat(newBodyWeight);
            const prevWeightNum = parseFloat(previousBodyWeight);
            
            if (isNaN(newWeightNum) || isNaN(prevWeightNum)) {
                setFormError("Please enter valid weight values");
                return;
            }
            
            if (milestoneType === 'weightLoss' && newWeightNum >= prevWeightNum) {
                setFormError("For weight loss, new weight must be less than previous weight");
                return;
            }
            
            if (milestoneType === 'weightGain' && newWeightNum <= prevWeightNum) {
                setFormError("For weight gain, new weight must be greater than previous weight");
                return;
            }
        }

        setIsSubmitting(true);
        setFormError(null);

        try {
            const milestoneDetails: any = {};

            // Handle weight milestones
            if (milestoneType === 'weightLoss' || milestoneType === 'weightGain') {
                milestoneDetails.type = milestoneType;
                milestoneDetails.newWeight = parseFloat(newBodyWeight);
                milestoneDetails.newWeightUnit = getWeightUnit();
                milestoneDetails.achievedAt = new Date().toISOString();

                if (previousBodyWeight) {
                    milestoneDetails.previousWeight = parseFloat(previousBodyWeight);
                    const weightDiff = milestoneDetails.newWeight - milestoneDetails.previousWeight;
                    milestoneDetails.totalLoss = Math.abs(weightDiff);
                    milestoneDetails.percentageLoss = (Math.abs(weightDiff) / milestoneDetails.previousWeight) * 100;
                }
            } else {
                // Handle PR milestones (existing logic)
                const metricType = selectedExercise!.metricType;
                milestoneDetails.type = 'PR';
                milestoneDetails.exerciseName = selectedExercise!.name;
                milestoneDetails.exerciseId = selectedExercise!.id;
                milestoneDetails.achievedAt = new Date().toISOString();
                milestoneDetails.previousValue = null;
                milestoneDetails.previousReps = null;
                milestoneDetails.previousDuration = null;
                milestoneDetails.previousLevel = null;
                milestoneDetails.previousDistance = null;

                // Validate and assign metric-specific values
                switch (metricType) {
                    case 'weight_reps':
                        if (!weight || !reps) {
                            throw new Error("Please enter both weight and reps");
                        }
                        milestoneDetails.value = parseFloat(weight);
                        milestoneDetails.reps = parseInt(reps, 10);
                        milestoneDetails.weightUnit = getWeightUnit();
                        if (previousPR) {
                            milestoneDetails.previousValue = previousPR.weight;
                            milestoneDetails.previousReps = previousPR.reps;
                        }
                        break;
                    case 'bodyweight_reps':
                        if (!reps) {
                            throw new Error("Please enter number of reps");
                        }
                        milestoneDetails.reps = parseInt(reps, 10);
                        if (previousPR) {
                            milestoneDetails.previousReps = previousPR.reps;
                        }
                        break;
                    case 'duration':
                    case 'duration_level':
                        const durationSeconds = (parseInt(hours || '0') * 3600) + (parseInt(minutes || '0') * 60) + parseInt(seconds || '0');
                        if (durationSeconds <= 0) {
                            throw new Error("Please enter a valid duration");
                        }
                        milestoneDetails.duration = durationSeconds;
                        milestoneDetails.value = durationSeconds;
                        if (metricType === 'duration_level') {
                            if (!level) {
                                throw new Error("Please enter a difficulty level");
                            }
                            milestoneDetails.level = level;
                        }
                        if (previousPR) {
                            milestoneDetails.previousDuration = previousPR.duration;
                            milestoneDetails.previousLevel = previousPR.level;
                        }
                        break;
                    case 'distance':
                    case 'distance_time':
                        if (!distance) {
                            throw new Error("Please enter a distance");
                        }
                        milestoneDetails.value = parseFloat(distance);
                        milestoneDetails.weightUnit = getDistanceUnit();
                        if (metricType === 'distance_time') {
                            const timeSeconds = (parseInt(hours || '0') * 3600) + (parseInt(minutes || '0') * 60) + parseInt(seconds || '0');
                            if (timeSeconds <= 0) {
                                throw new Error("Please enter a valid time for the distance");
                            }
                            milestoneDetails.duration = timeSeconds;
                        }
                        if (previousPR) {
                            milestoneDetails.previousDistance = previousPR.distance;
                            milestoneDetails.previousDuration = previousPR.duration;
                        }
                        break;
                    default:
                        throw new Error("Unsupported exercise type");
                }
            }

            let authorArchetype = null;
            let userVisibility = 'public'; // Default visibility
            
            if (currentUser) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    authorArchetype = userData.archetype || null;
                    // Get user's default visibility preference from profile
                    userVisibility = userData.defaultVisibility || 'public';
                }
            }

            const postData = {
                caption: caption.trim(),
                imageUri: selectedMedia?.type === 'image' ? selectedMedia.uri : undefined,
                videoUri: selectedMedia?.type === 'video' ? selectedMedia.uri : undefined,
                videoThumbnailUri: selectedMedia?.type === 'video' ? selectedMedia.thumbnailUri : undefined,
                videoDuration: selectedMedia?.type === 'video' ? selectedMedia.duration : undefined,
                isMilestone: true,
                milestoneDetails: milestoneDetails,
                visibility: (userVisibility === 'followers' ? 'followers' : 'public') as 'public' | 'followers',
                workoutId: selectedWorkout?.id || null,
                authorArchetype: authorArchetype,
                mentions: captionMentions.length > 0 ? captionMentions : undefined,
            };
            
            // Create the post first
            const postId = await addPost(postData);
            
            // Store the milestone separately in the milestones collection
            try {
            const milestoneDocRef = doc(db, 'milestones', postId);
            await setDoc(milestoneDocRef, {
                ...milestoneDetails,
                postId: postId,
                authorId: currentUser.uid,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            } catch (milestoneError) {
            console.error("Error storing milestone separately:", milestoneError);
            // Post was created successfully, but milestone storage failed
            // We can continue as the milestone data is still in the post
            }
            
            console.log("Successfully created achievement post with ID:", postId);
            Alert.alert('Success', 'Your achievement has been shared!', [
            { text: 'OK', onPress: () => router.push('/') }
            ]);

        } catch (error: any) {
            console.error('Error creating achievement post:', error);
            setFormError(error.message || 'Failed to share achievement. Please try again.');
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
                                <Text style={styles.metricLabel}>Weight ({getWeightUnit()})</Text>
                                <View style={styles.inputWithIcon}>
                                    <TextInput
                                        style={styles.metricInput}
                                        value={weight}
                                        onChangeText={setWeight}
                                        placeholder="0"
                                        placeholderTextColor="#666"
                                        keyboardType="numeric"
                                    />
                                    <MaterialCommunityIcons 
                                        name={getWeightUnit() === 'kg' ? "weight-kilogram" : "weight-pound"} 
                                        size={18} 
                                        color="#777" 
                                        style={styles.inputIcon} 
                                    />
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
                        <Text style={styles.metricLabel}>Distance ({getDistanceUnit()})</Text>
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
                            <Text style={styles.metricLabel}>Distance ({getDistanceUnit()})</Text>
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
                        {/* Media picker section */}
                        <MediaSection
                            media={selectedMedia ? {
                                type: selectedMedia.type,
                                uri: selectedMedia.uri,
                                thumbnailUri: selectedMedia.type === 'video' ? selectedMedia.thumbnailUri : undefined,
                            } : null}
                            setMediaMenuVisible={setMediaMenuVisible}
                            isProcessing={isProcessing}
                        />

                        {/* Caption section */}
                        <CaptionInput
                            caption={caption}
                            setCaption={setCaption}
                            mentions={captionMentions}
                            onMentionsChange={setCaptionMentions}
                        />

                        {/* Achievement Section */}
                        <View style={styles.achievementSection}>
                            <View style={styles.sectionHeader}>
                                <MaterialCommunityIcons name="trophy-outline" size={24} color={SECONDARY_COLOR} />
                                <Text style={styles.sectionTitle}>Milestone</Text>
                            </View>
                            
                            <View style={styles.achievementContent}>
                                {/* Milestone Type Selector */}
                                <View style={styles.milestoneTypeContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.milestoneTypeButton,
                                            milestoneType === 'PR' && styles.milestoneTypeButtonActive
                                        ]}
                                        onPress={() => setMilestoneType('PR')}
                                    >
                                        <Text style={[
                                            styles.milestoneTypeText,
                                            milestoneType === 'PR' && styles.milestoneTypeTextActive
                                        ]}>PR</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity
                                        style={[
                                            styles.milestoneTypeButton,
                                            milestoneType === 'weightLoss' && styles.milestoneTypeButtonActive
                                        ]}
                                        onPress={() => setMilestoneType('weightLoss')}
                                    >
                                        <Text style={[
                                            styles.milestoneTypeText,
                                            milestoneType === 'weightLoss' && styles.milestoneTypeTextActive
                                        ]}>Weight Loss</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity
                                        style={[
                                            styles.milestoneTypeButton,
                                            milestoneType === 'weightGain' && styles.milestoneTypeButtonActive
                                        ]}
                                        onPress={() => setMilestoneType('weightGain')}
                                    >
                                        <Text style={[
                                            styles.milestoneTypeText,
                                            milestoneType === 'weightGain' && styles.milestoneTypeTextActive
                                        ]}>Weight Gain</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Exercise Selector - Only for PR type */}
                                {milestoneType === 'PR' && (
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
                                )}

                                {/* Weight Input Fields - Only for weight loss/gain */}
                                {(milestoneType === 'weightLoss' || milestoneType === 'weightGain') && (
                                    <View style={styles.weightInputContainer}>
                                        {loadingLastWeight ? (
                                            <View style={styles.loadingWeightContainer}>
                                                <ActivityIndicator size="small" color={SECONDARY_COLOR} />
                                                <Text style={styles.loadingWeightText}>Loading your last weight...</Text>
                                            </View>
                                        ) : (
                                            <>
                                                <View style={styles.inputGroup}>
                                                    <Text style={styles.inputLabel}>New Body Weight ({getWeightUnit()}) *</Text>
                                                    <TextInput
                                                        style={styles.input}
                                                        value={newBodyWeight}
                                                        onChangeText={setNewBodyWeight}
                                                        placeholder={`Enter weight (${getWeightUnit()})`}
                                                        placeholderTextColor="#555"
                                                        keyboardType="decimal-pad"
                                                    />
                                                </View>
                                                
                                                <View style={styles.inputGroup}>
                                                    <View style={styles.labelRow}>
                                                        <Text style={styles.inputLabel}>
                                                            Previous Weight ({getWeightUnit()}) *
                                                        </Text>
                                                        {!isFirstWeightMilestone && previousBodyWeight && (
                                                            <Text style={styles.autoFilledBadge}>Auto-filled</Text>
                                                        )}
                                                    </View>
                                                    <TextInput
                                                        style={[
                                                            styles.input,
                                                            !isFirstWeightMilestone && previousBodyWeight && styles.inputAutoFilled
                                                        ]}
                                                        value={previousBodyWeight}
                                                        onChangeText={setPreviousBodyWeight}
                                                        placeholder={isFirstWeightMilestone 
                                                            ? `Enter your starting weight (${getWeightUnit()})` 
                                                            : `Previous weight (${getWeightUnit()})`}
                                                        placeholderTextColor="#555"
                                                        keyboardType="decimal-pad"
                                                    />
                                                    {isFirstWeightMilestone && (
                                                        <Text style={styles.helperText}>
                                                            This is your first weight milestone. Enter your starting weight.
                                                        </Text>
                                                    )}
                                                </View>
                                            </>
                                        )}
                                    </View>
                                )}
                                
                                {/* Dynamic Metric Fields - Only for PR type */}
                                {milestoneType === 'PR' && renderMetricFields()}
                            </View>
                        </View>

                        {/* Workout attachment section */}
                        <WorkoutAttachment
                            selectedWorkout={selectedWorkout}
                            setWorkoutModalVisible={setWorkoutModalVisible}
                            removeWorkout={removeWorkout}
                        />
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>

            {/* MODALS MOVED OUTSIDE */}
            <MediaPickerModal
                visible={mediaMenuVisible}
                onClose={() => setMediaMenuVisible(false)}
                onTakePhoto={openCamera}
                onChooseFromLibrary={openMediaLibrary}
            />
            <WorkoutSelectionModal
                workoutModalVisible={workoutModalVisible}
                setWorkoutModalVisible={setWorkoutModalVisible}
                selectWorkout={selectWorkout}
            />
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
    
    // Milestone type selector styles
    milestoneTypeContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        padding: 4,
    },
    milestoneTypeButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    milestoneTypeButtonActive: {
        backgroundColor: SECONDARY_COLOR,
    },
    milestoneTypeText: {
        color: '#777',
        fontSize: 15,
        fontWeight: '600',
    },
    milestoneTypeTextActive: {
        color: '#FFF',
    },
    
    // Weight input styles
    weightInputContainer: {
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#1A1A1A',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        padding: 16,
        color: '#FFF',
        fontSize: 16,
    },
    
    // Weight milestone loading and helper styles
    loadingWeightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    loadingWeightText: {
        color: '#999',
        marginLeft: 8,
        fontSize: 14,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    autoFilledBadge: {
        fontSize: 12,
        color: '#34C759',
        fontWeight: '600',
        backgroundColor: 'rgba(52, 199, 89, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    inputAutoFilled: {
        borderColor: 'rgba(52, 199, 89, 0.3)',
    },
    helperText: {
        fontSize: 12,
        color: '#999',
        marginTop: 6,
        fontStyle: 'italic',
    },
});