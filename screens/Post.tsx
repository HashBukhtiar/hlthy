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
    Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/globalStyles';
import * as ImagePicker from 'expo-image-picker';
import { Dropdown } from 'react-native-element-dropdown';
import { Ionicons } from '@expo/vector-icons';

import { postImage } from '@/assets/images';

interface DropdownItem {
    label: string;
    value: string;
}

export default function Post() {
    const router = useRouter();
    const [caption, setCaption] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

    const [openPrivacy, setOpenPrivacy] = useState(false);
    const [valuePrivacy, setValuePrivacy] = useState<string | null>(null);
    const [itemsPrivacy] = useState<DropdownItem[]>([
        { label: 'Public', value: 'public' },
        { label: 'Private', value: 'private' }
    ]);

    const [milestoneSwitchValue, setMilestoneSwitchValue] = useState(false);

    const [openMilestone, setOpenMilestone] = useState(false);
    const [valueMilestone, setValueMilestone] = useState<string | null>(null);
    const [itemsMilestone] = useState<DropdownItem[]>([
        { label: 'PR', value: 'PR' },
        { label: 'Weight Loss', value: 'weightLoss' },
        { label: 'Weight Gain', value: 'weightGain' }
    ]);

    const [exerciseSearch, setExerciseSearch] = useState('');
    const [amount, setAmount] = useState('');
    const [weightUnit, setWeightUnit] = useState<string | null>(null);
    const [itemsWeightUnit] = useState<DropdownItem[]>([
        { label: 'lbs', value: 'lbs' },
        { label: 'kg', value: 'kg' }
    ]);
    const [reps, setReps] = useState('');
    const [newWeight, setNewWeight] = useState('');
    const [newWeightUnit, setNewWeightUnit] = useState<string | null>(null);
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
    ]);
    const [filteredExercises, setFilteredExercises] = useState<string[]>([]);

    const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
    const [workoutModalVisible, setWorkoutModalVisible] = useState(false);

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

    const renderPostScroll = () => {
        return (
            <ScrollView contentContainerStyle={postStyles.postPageScroll}>
                <View style={postStyles.photoOptionsView}>
                    <TouchableOpacity style={postStyles.cameraButton} onPress={openCamera}>
                        <Text style={postStyles.postButtonText}>Open Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={postStyles.cameraRollButton} onPress={openImageLibrary}>
                        <Image 
                            source={postImage}
                            style={{ 
                                width: 55, 
                                height: 55, 
                                resizeMode: 'cover',
                                borderRadius: 27.5 
                            }}
                        />
                    </TouchableOpacity>
                </View>
                {imageUri && (
                    <View style={postStyles.imagePreview}>
                        <Image 
                            source={{ uri: imageUri }} 
                            style={{ 
                                width: Dimensions.get('window').width - 20, 
                                height: (Dimensions.get('window').width - 20) / aspectRatio, 
                                backgroundColor: 'white', 
                                resizeMode: 'contain' 
                            }}
                        />
                    </View>
                )}
                <TextInput
                    style={postStyles.captionInput}
                    placeholder="Share your progress..."
                    placeholderTextColor="#4f4f4f"
                    value={caption}
                    onChangeText={setCaption}
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                    keyboardType="default"
                />
                <View style={postStyles.attachWorkoutSection}>
                    <Text style={postStyles.sectionTitle}>Attach Workout</Text>
                    
                    {selectedWorkout ? (
                        <View style={postStyles.selectedWorkoutContainer}>
                            <TouchableOpacity 
                                style={postStyles.attachedWorkoutContent}
                                onPress={() => router.push(`/view-workout/${selectedWorkout.id}`)}
                            >
                                <View style={postStyles.attachedWorkoutInfo}>
                                    <View style={postStyles.workoutIconContainer}>
                                        <Ionicons name="barbell" size={18} color="#FFF" />
                                    </View>
                                    <View>
                                        <Text style={postStyles.attachedWorkoutTitle}>
                                            {selectedWorkout.title}
                                        </Text>
                                        <Text style={postStyles.attachedWorkoutDetails}>
                                            by {selectedWorkout.creatorName} • {selectedWorkout.segments} segments • {selectedWorkout.length}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={removeWorkout}>
                                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                                </TouchableOpacity>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity 
                            style={postStyles.attachWorkoutButton}
                            onPress={() => setWorkoutModalVisible(true)}
                        >
                            <Ionicons name="barbell-outline" size={20} color="#FFF" />
                            <Text style={postStyles.attachButtonText}>Select a workout</Text>
                        </TouchableOpacity>
                    )}
                </View>
                <View style={globalStyles.horizontalLine}></View>
                <View style={postStyles.privacyContainer}>
                    <Text style={postStyles.privacyText}>Privacy</Text>
                    <Dropdown
                        data={itemsPrivacy}
                        labelField="label"
                        valueField="value"
                        placeholder="Select"
                        value={valuePrivacy}
                        onChange={item => setValuePrivacy(item.value)}
                        style={postStyles.dropdownStyle}
                        containerStyle={postStyles.dropdownContainerStyle}
                    />
                </View>
                <View style={postStyles.milestoneContainer}>
                    <Text style={postStyles.milestoneText}>Milestone</Text>
                    <Switch
                        value={milestoneSwitchValue}
                        onValueChange={(newValue) => {
                            setMilestoneSwitchValue(newValue);
                        }}
                        style={postStyles.milestoneSwitch}
                        trackColor={{ false: '#ff7d7d', true: '#a600bf' }}
                        thumbColor={milestoneSwitchValue ? '#f4f3f4' : '#f4f3f4'}
                    />
                </View>
                {milestoneSwitchValue && renderPostMilestone()}
            </ScrollView>
        );
    };

    const renderPostMilestone = () => {
        return (
            <View>
                <View style={globalStyles.horizontalLine}></View>
                <View style={postStyles.milestoneTypeContainer}>
                    <Text style={postStyles.privacyText}>Type</Text>
                    <Dropdown
                        data={itemsMilestone}
                        labelField="label"
                        valueField="value"
                        placeholder="Select"
                        value={valueMilestone}
                        onChange={item => setValueMilestone(item.value)}
                        style={postStyles.dropdownStyle}
                        containerStyle={postStyles.dropdownContainerStyle}
                    />
                </View>
                {valueMilestone === 'PR' && (
                    <View style={postStyles.prFieldsContainer}>
                        <TextInput
                            style={postStyles.exerciseSearch}
                            placeholder="Search for your exercise..."
                            value={exerciseSearch}
                            onChangeText={handleExerciseSearch}
                        />
                        {filteredExercises.length > 0 && (
                            <View style={postStyles.suggestionsContainer}>
                                {filteredExercises.map((exercise, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => {
                                            setExerciseSearch(exercise);
                                            setFilteredExercises([]);
                                        }}
                                        style={postStyles.suggestionItem}
                                    >
                                        <Text>{exercise}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        <View style={postStyles.inputRow}>
                            <Text style={postStyles.inputLabel}>Amount</Text>
                            <TextInput
                                style={postStyles.numberInput}
                                placeholder="0"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                            />
                            <Dropdown
                                data={itemsWeightUnit}
                                labelField="label"
                                valueField="value"
                                placeholder="Units"
                                value={weightUnit}
                                onChange={item => setWeightUnit(item.value)}
                                style={postStyles.unitDropdown}
                                containerStyle={postStyles.unitDropdownContainer}
                            />
                        </View>
                        <View style={postStyles.inputRow}>
                            <Text style={postStyles.inputLabel}>Reps</Text>
                            <TextInput
                                style={postStyles.numberInput}
                                placeholder="0"
                                keyboardType="numeric"
                                value={reps}
                                onChangeText={setReps}
                            />
                        </View>
                    </View>
                )}
                {(valueMilestone === 'weightLoss' || valueMilestone === 'weightGain') && (
                    <View style={postStyles.weightFieldsContainer}>
                        <Text style={postStyles.inputLabel}>New Weight</Text>
                        <View style={postStyles.weightInputRow}>
                            <TextInput
                                style={postStyles.numberInput}
                                placeholder="0"
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
                            />
                        </View>
                    </View>
                )}
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
        >
            <View style={postStyles.postPage}>
                <View style={postStyles.header}>
                    <TouchableOpacity style={postStyles.button} onPress={() => {
                            router.back();
                        }}>
                        <Text style={postStyles.buttonText} >Back</Text>
                    </TouchableOpacity>
                    <Text style={postStyles.postTitle}>Create Post</Text>
                    <TouchableOpacity style={postStyles.button} onPress={() => {
                            router.push('/');
                            Alert.alert('Post Created', 'Your post has been created successfully!');
                        }}>
                        <Text style={postStyles.buttonText}>Post</Text>
                    </TouchableOpacity>
                </View>
                {renderPostScroll()}
            </View>

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

                        <ScrollView style={postStyles.workoutList}>
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
        </KeyboardAvoidingView>
    );
};

const postStyles = StyleSheet.create({
    postPage: {
        flex: 1,
        backgroundColor: 'black'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'white'
    },
    button: {
        padding: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
    },
    postTitle: {
        fontSize: 34,
        fontWeight: 'bold',
        color: 'white',
    },
    postText: {
        color: 'white',
    },
    postPageScroll: {
        padding: 10,
        borderBottomWidth: 1,
        borderColor: 'white',
        flexGrow: 1,
    },
    photoOptionsView: {
        flexDirection: 'row'
    },
    cameraButton: {
        backgroundColor: 'white',
        borderRadius: 50,
        fontWeight: 'bold',
        paddingHorizontal: 20,
        paddingVertical: 10,
        width: '80%',
        alignItems: 'center',
        marginRight: 20
    },
    cameraRollButton: {
        backgroundColor: 'white',
        borderRadius: 30,
        fontWeight: 'bold',
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10
    },
    postButtonText: {
        fontSize: 30,
        color: 'black'
    },
    imagePreview: {
        marginTop: 20,
        alignItems: 'center'
    },
    captionInput: {
        height: 100,
        backgroundColor: '#ccc',
        borderWidth: 1,
        borderRadius: 20,
        padding: 10,
        marginTop: 16,
        textAlignVertical: 'top',
    },
    privacyContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        zIndex: 5000
    },
    privacyText: {
        fontSize: 20,
        color: 'white',
    },
    dropdownStyle: {
        backgroundColor: '#fafafa',
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 30,
        width: 150,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    dropdownContainerStyle: {
        backgroundColor: '#fff',
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 30,
        padding: 10,
        width: 150,
    },
    milestoneContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 10,
        zIndex: 1
    },
    milestoneText: {
        fontSize: 20,
        color: 'white'
    },
    milestoneSwitch: {
        transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }],
        marginRight: 5
    },
    milestoneTypeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
        zIndex: 5000
    },
    prFieldsContainer: {
        marginTop: 10,
    },
    exerciseSearch: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 10,
        marginBottom: 5,
        backgroundColor: '#fff',
        fontSize: 18
    },
    suggestionsContainer: {
        backgroundColor: '#fff',
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 10,
        maxHeight: 100,
        marginBottom: 10,
    },
    suggestionItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    inputLabel: {
        flex: 1,
        fontSize: 20,
        color: 'white',
    },
    numberInput: {
        flex: 0.5,
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
        textAlign: 'right',
        fontSize: 16
    },
    unitDropdown: {
        flex: 0.35,
        marginLeft: 10,
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 3,
        paddingLeft: 10
    },
    unitDropdownContainer: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderRadius: 10,
    },
    weightFieldsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    weightInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginLeft: 0,
        justifyContent: 'flex-end'
    },
    attachWorkoutSection: {
        marginTop: 20,
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 20,
        color: 'white',
        marginBottom: 10,
    },
    attachWorkoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333',
        borderRadius: 10,
        padding: 15,
        borderWidth: 1,
        borderColor: '#555',
        borderStyle: 'dashed',
    },
    attachButtonText: {
        color: '#FFF',
        marginLeft: 10,
        fontSize: 16,
    },
    selectedWorkoutContainer: {
        backgroundColor: '#111',
        borderRadius: 12,
        overflow: 'hidden',
        borderColor: '#222',
        borderWidth: 1,
    },
    attachedWorkoutContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
    },
    attachedWorkoutInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    workoutIconContainer: {
        marginRight: 12,
        backgroundColor: '#333',
        padding: 8,
        borderRadius: 18,
    },
    attachedWorkoutTitle: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 15,
    },
    attachedWorkoutDetails: {
        color: '#999',
        fontSize: 13,
        marginTop: 2,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalContent: {
        backgroundColor: '#000',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 20,
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
        borderBottomColor: '#222',
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
        borderBottomColor: '#222',
    },
    workoutThumbnail: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 15,
    },
    workoutItemInfo: {
        flex: 1,
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
});