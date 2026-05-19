import React, { useState, useEffect } from 'react';
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
    ScrollView,
    BackHandler
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { usePostsData } from '@/hooks/usePostsData';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from '@/features/infra/firestore';
import { db } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { MentionData } from '@/features/mentions/domain/Mention';
import { TagInput } from '@/components/TagInput';
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

interface RegularPostProps {
    onBack?: () => void;
}

export default function RegularPost({ onBack }: RegularPostProps) {
    const router = useRouter();
    const { addPost } = usePostsData();
    const { currentUser } = useAuth();

    // Form state - MUST be declared before use
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [caption, setCaption] = useState('');

    // Media state
    const [selectedMedia, setSelectedMedia] = useState<MediaResult | null>(null);
    const [mediaMenuVisible, setMediaMenuVisible] = useState(false);

    // Mentions
    const [captionMentions, setCaptionMentions] = useState<MentionData[]>([]);

    // Tags
    const [tags, setTags] = useState<string[]>([]);

    // Media picker hook
    const { openCamera, openMediaLibrary } = useMediaPicker((result) => {
        setSelectedMedia(result);
        setMediaMenuVisible(false);
    });

    // Check if there are unsaved changes
    const hasUnsavedChanges = (
        (caption && caption.trim() !== '') ||
        selectedMedia !== null ||
        tags.length > 0 ||
        captionMentions.length > 0 ||
        selectedWorkout !== null
    );

    // Handle back navigation with confirmation
    const handleBack = () => {
        if (hasUnsavedChanges) {
            Alert.alert(
                'Discard changes?',
                'Your changes will be lost if you leave without posting.',
                [
                    {
                        text: 'Continue editing',
                        onPress: () => {},
                        style: 'cancel',
                    },
                    {
                        text: 'Discard',
                        onPress: () => {
                            if (onBack) {
                                onBack();
                            } else {
                                router.back();
                            }
                        },
                        style: 'destructive',
                    },
                ],
                { cancelable: false }
            );
        } else {
            if (onBack) {
                onBack();
            } else {
                router.back();
            }
        }
    };

    // Handle Android hardware back button
    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                handleBack();
                return true;
            };

            const subscription = BackHandler.addEventListener(
                'hardwareBackPress',
                onBackPress
            );

            return () => subscription.remove();
        }, [hasUnsavedChanges])
    );

    // Workout attachment
    const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
    const [workoutModalVisible, setWorkoutModalVisible] = useState(false);

    const selectWorkout = (workout: any) => { 
        setSelectedWorkout(workout);
        setWorkoutModalVisible(false);
    };

    const removeWorkout = () => {
        setSelectedWorkout(null);
    };

    const handleSubmitPost = async () => {
        try {
            // Validation
            if (!selectedMedia && !caption.trim()) {
                setFormError("Please add a photo, video, or caption");
                return;
            }
            
            setIsSubmitting(true);
            setFormError(null);
            
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
                isMilestone: false,
                milestoneDetails: undefined,
                visibility: (userVisibility === 'followers' ? 'followers' : 'public') as 'public' | 'followers',
                workoutId: selectedWorkout?.id,
                authorArchetype: authorArchetype,
                mentions: captionMentions.length > 0 ? captionMentions : undefined,
                tags: tags.length > 0 ? tags : undefined,
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
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={handleBack}
                        >
                            <Ionicons name="chevron-back" size={24} color="#FFF" />
                        </TouchableOpacity>
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
                        {/* Media picker section */}
                        <MediaSection
                            media={selectedMedia ? {
                                type: selectedMedia.type,
                                uri: selectedMedia.uri,
                                thumbnailUri: selectedMedia.type === 'video' ? selectedMedia.thumbnailUri : undefined,
                            } : null}
                            setMediaMenuVisible={setMediaMenuVisible}
                        />

                        {/* Caption section */}
                         <CaptionInput
                            caption={caption}
                            setCaption={setCaption}
                            mentions={captionMentions}
                            onMentionsChange={setCaptionMentions}
                            onHashtagDetected={(hashtag) => {
                                // Add hashtag to tags if not already present
                                if (!tags.includes(hashtag) && tags.length < 10) {
                                    setTags([...tags, hashtag]);
                                }
                            }}
                        />

                        {/* Tags section */}
                        <View style={styles.tagsSection}>
                            <TagInput tags={tags} onTagsChange={setTags} />
                        </View>

                        {/* Workout attachment section */}
                        <WorkoutAttachment
                            selectedWorkout={selectedWorkout}
                            setWorkoutModalVisible={setWorkoutModalVisible}
                            removeWorkout={removeWorkout}
                        />

                        {/* Note about visibility */}
                        <View style={styles.visibilityNote}>
                            <Ionicons name="information-circle-outline" size={16} color="#999" />
                            <Text style={styles.visibilityNoteText}>
                                Posts use your profile's default visibility setting. Change it in Settings.
                            </Text>
                        </View>
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>

            {/* MODALS */}
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
    tagsSection: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    visibilityNote: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        marginHorizontal: 16,
    },
    visibilityNoteText: {
        color: '#999',
        fontSize: 12,
        marginLeft: 8,
        flex: 1,
    },
});