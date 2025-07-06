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
    ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePostsData } from '@/hooks/usePostsData';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
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
    visibilityItems,
    ImagePickerModal,
} from './PostComponents';

interface RegularPostProps {
    onBack?: () => void;
}

export default function RegularPost({ onBack }: RegularPostProps) {
    const router = useRouter();
    const { addPost } = usePostsData();
    const { currentUser } = useAuth();
    const userProfile = currentUser?.userProfile;

    // Form state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    
    // Image picker state
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageMenuVisible, setImageMenuVisible] = useState(false);

    // Image picker logic hook
    const { openCamera, openImageLibrary } = useImagePicker((uri) => {
        setImageUri(uri);
        setImageMenuVisible(false); // Close modal on selection
    });
    
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
            if (!imageUri && !caption.trim()) {
                setFormError("Please add an image or a caption");
                return;
            }
            
            setIsSubmitting(true);
            setFormError(null);
            
            let authorArchetype = null;
            if (currentUser) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    authorArchetype = userDocSnap.data().archetype || null;
                }
            }

            const postData = {
                caption: caption.trim(),
                imageUri,
                isMilestone: false,
                milestoneDetails: null,
                visibility: valueVisibility || 'public',
                workoutId: selectedWorkout?.id,
                authorArchetype: authorArchetype
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
            <ImagePickerModal
                visible={imageMenuVisible}
                onClose={() => setImageMenuVisible(false)}
                onTakePhoto={openCamera}
                onChooseFromLibrary={openImageLibrary}
            />
            <WorkoutSelectionModal
                workoutModalVisible={workoutModalVisible}
                setWorkoutModalVisible={setWorkoutModalVisible}
                selectWorkout={selectWorkout}
            />
            <VisibilityModal
                visibilityModalVisible={visibilityModalVisible}
                setVisibilityModalVisible={setVisibilityModalVisible}
                valueVisibility={valueVisibility}
                setValueVisibility={setValueVisibility}
                itemsVisibility={visibilityItems}
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
});