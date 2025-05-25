import React, { useState } from 'react';
import { 
    View, 
    TouchableOpacity, 
    Text,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePostsData } from '@/hooks/usePostsData';
import { useAuth } from '@/context/AuthContext';

// Import shared components
import {
    SECONDARY_COLOR,
    useImagePicker,
    PostHeader,
    ErrorMessage,
    ImageSection,
    CaptionInput,
    WorkoutAttachment,
    WorkoutSelectionModal,
    VisibilitySelector,
    VisibilityModal,
    visibilityItems,
    ScrollView
} from './PostComponents';

export default function RegularPost() {
    const router = useRouter();
    const { addPost } = usePostsData();
    const { currentUser, userProfile } = useAuth();
    
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
    
    // Sample workout data
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
            
            const postData = {
                caption: caption.trim(),
                imageUri,
                isMilestone: false,
                milestoneDetails: null,
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
                    {/* Header */}
                    <PostHeader 
                        title="New Post" 
                        isSubmitting={isSubmitting} 
                        handleSubmitPost={handleSubmitPost}
                    />

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
                    availableWorkouts={availableWorkouts}
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 30,
    },
});