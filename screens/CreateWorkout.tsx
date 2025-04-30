import React, { useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Image,
  Alert,
  Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import globalStyles from '@/styles/globalStyles';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface WorkoutExercise {
  id: string;
  name: string;
  sets: string;
  reps: string;
}

interface WorkoutSegment {
  id: string;
  name: string;
  length: string;
  exercises: WorkoutExercise[];
}

export default function CreateWorkout() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [segments, setSegments] = useState<WorkoutSegment[]>([
    {
      id: Date.now().toString(),
      name: 'Warm Up',
      length: '15 mins',
      exercises: []
    }
  ]);

  const scrollViewRef = useRef<ScrollView>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setCoverImage(result.assets[0].uri);
    }
  };

  const addExercise = (segmentId: string) => {
    const updatedSegments = segments.map(segment => {
      if (segment.id === segmentId) {
        return {
          ...segment,
          exercises: [
            ...segment.exercises,
            {
              id: Date.now().toString(),
              name: '',
              sets: '',
              reps: ''
            }
          ]
        };
      }
      return segment;
    });
    
    setSegments(updatedSegments);
    
    // Scroll down after adding exercise
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const addSegment = () => {
    const newSegment = {
      id: Date.now().toString(),
      name: 'New Segment',
      length: '30 mins',
      exercises: []
    };
    
    setSegments([...segments, newSegment]);
    
    // Scroll down after adding segment
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const updateExercise = (segmentId: string, exerciseId: string, field: 'name' | 'sets' | 'reps', value: string) => {
    const updatedSegments = segments.map(segment => {
      if (segment.id === segmentId) {
        return {
          ...segment,
          exercises: segment.exercises.map(exercise => {
            if (exercise.id === exerciseId) {
              return {
                ...exercise,
                [field]: value
              };
            }
            return exercise;
          })
        };
      }
      return segment;
    });
    
    setSegments(updatedSegments);
  };

  const updateSegment = (segmentId: string, field: 'name' | 'length', value: string) => {
    const updatedSegments = segments.map(segment => {
      if (segment.id === segmentId) {
        return {
          ...segment,
          [field]: value
        };
      }
      return segment;
    });
    
    setSegments(updatedSegments);
  };

  const removeExercise = (segmentId: string, exerciseId: string) => {
    const updatedSegments = segments.map(segment => {
      if (segment.id === segmentId) {
        return {
          ...segment,
          exercises: segment.exercises.filter(exercise => exercise.id !== exerciseId)
        };
      }
      return segment;
    });
    
    setSegments(updatedSegments);
  };

  const removeSegment = (segmentId: string) => {
    if (segments.length === 1) {
      Alert.alert('Cannot Remove', 'You need at least one segment in your workout.');
      return;
    }
    
    setSegments(segments.filter(segment => segment.id !== segmentId));
  };

  const saveWorkout = () => {
    // Validate required fields
    if (!title.trim()) {
      Alert.alert('Missing Information', 'Please add a title for your workout.');
      return;
    }

    // Check if at least one segment has exercises
    const hasExercises = segments.some(segment => segment.exercises.length > 0);
    if (!hasExercises) {
      Alert.alert('Missing Information', 'Please add at least one exercise to your workout.');
      return;
    }

    // Here we would save the workout to the database
    // For now, we'll just navigate back
    Alert.alert(
      'Workout Created',
      'Your workout has been created successfully!',
      [
        { 
          text: 'OK', 
          onPress: () => router.back() 
        }
      ]
    );
  };

  return (
    <View style={globalStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Workout</Text>
        <TouchableOpacity onPress={saveWorkout}>
          <View style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Image */}
        <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={styles.coverImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={40} color="#666" />
              <Text style={styles.placeholderText}>Add Cover Image</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Title Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Title</Text>
          <TextInput
            style={styles.textInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Workout Title"
            placeholderTextColor="#666"
            maxLength={40}
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.textInput, styles.textAreaInput]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your workout..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Segments */}
        {segments.map((segment, segmentIndex) => (
          <View key={segment.id} style={styles.segmentContainer}>
            <View style={styles.segmentHeader}>
              <View style={styles.segmentTitleContainer}>
                <Text style={styles.segmentLabel}>Segment {segmentIndex + 1}</Text>
                <TouchableOpacity onPress={() => removeSegment(segment.id)}>
                  <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.segmentInputRow}>
                <View style={styles.segmentInputContainer}>
                  <Text style={styles.segmentInputLabel}>Name</Text>
                  <TextInput
                    style={styles.segmentInput}
                    value={segment.name}
                    onChangeText={(value) => updateSegment(segment.id, 'name', value)}
                    placeholder="e.g., Warm Up"
                    placeholderTextColor="#666"
                  />
                </View>
                
                <View style={styles.segmentInputContainer}>
                  <Text style={styles.segmentInputLabel}>Length</Text>
                  <TextInput
                    style={styles.segmentInput}
                    value={segment.length}
                    onChangeText={(value) => updateSegment(segment.id, 'length', value)}
                    placeholder="e.g., 30 mins"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>
            </View>

            {/* Exercises in this segment */}
            <View style={styles.exercisesContainer}>
              {segment.exercises.map((exercise, exerciseIndex) => (
                <View key={exercise.id} style={styles.exerciseItem}>
                  <View style={styles.exerciseNumberContainer}>
                    <Text style={styles.exerciseNumber}>{exerciseIndex + 1}</Text>
                  </View>
                  
                  <View style={styles.exerciseInputContainer}>
                    <TextInput
                      style={styles.exerciseNameInput}
                      value={exercise.name}
                      onChangeText={(value) => updateExercise(segment.id, exercise.id, 'name', value)}
                      placeholder="Exercise name"
                      placeholderTextColor="#666"
                    />
                    
                    <View style={styles.exerciseDetailsContainer}>
                      <TextInput
                        style={styles.exerciseDetailInput}
                        value={exercise.sets}
                        onChangeText={(value) => updateExercise(segment.id, exercise.id, 'sets', value)}
                        placeholder="Sets"
                        placeholderTextColor="#666"
                        keyboardType="number-pad"
                      />
                      <Text style={styles.exerciseDetailSeparator}>×</Text>
                      <TextInput
                        style={styles.exerciseDetailInput}
                        value={exercise.reps}
                        onChangeText={(value) => updateExercise(segment.id, exercise.id, 'reps', value)}
                        placeholder="Reps"
                        placeholderTextColor="#666"
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.removeExerciseButton}
                    onPress={() => removeExercise(segment.id, exercise.id)}
                  >
                    <Ionicons name="close-circle" size={20} color="#ff6b6b" />
                  </TouchableOpacity>
                </View>
              ))}
              
              <TouchableOpacity 
                style={styles.addExerciseButton}
                onPress={() => addExercise(segment.id)}
              >
                <Ionicons name="add-circle-outline" size={18} color="white" />
                <Text style={styles.addExerciseText}>Add Exercise</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Add Segment Button */}
        <TouchableOpacity 
          style={styles.addSegmentButton}
          onPress={addSegment}
        >
          <Ionicons name="add-circle-outline" size={20} color="white" />
          <Text style={styles.addSegmentText}>Add Segment</Text>
        </TouchableOpacity>
        
        {/* Bottom space for scrolling */}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#000',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#ff2d55',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'black',
  },
  imageContainer: {
    width: '80%',
    aspectRatio: 1,
    alignSelf: 'center',
    marginVertical: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    marginTop: 10,
  },
  inputContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  inputLabel: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 15,
    color: 'white',
    fontSize: 16,
  },
  textAreaInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  segmentContainer: {
    marginHorizontal: 20,
    marginBottom: 25,
    backgroundColor: '#222',
    borderRadius: 15,
    padding: 15,
  },
  segmentHeader: {
    marginBottom: 15,
  },
  segmentTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  segmentLabel: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  segmentInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  segmentInputContainer: {
    flex: 1,
    marginRight: 10,
  },
  segmentInputLabel: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 5,
  },
  segmentInput: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 10,
    color: 'white',
  },
  exercisesContainer: {
    marginTop: 10,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 10,
    marginBottom: 10,
    padding: 10,
  },
  exerciseNumberContainer: {
    width: 25,
    height: 25,
    borderRadius: 12,
    backgroundColor: '#909090',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  exerciseNumber: {
    fontSize: 14,
    color: 'black',
    fontWeight: 'bold',
  },
  exerciseInputContainer: {
    flex: 1,
  },
  exerciseNameInput: {
    color: 'white',
    fontSize: 16,
    marginBottom: 5,
  },
  exerciseDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseDetailInput: {
    color: '#b7b7b7',
    width: 50,
    fontSize: 14,
  },
  exerciseDetailSeparator: {
    color: '#b7b7b7',
    marginHorizontal: 5,
  },
  removeExerciseButton: {
    padding: 5,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#444',
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
  },
  addExerciseText: {
    color: 'white',
    marginLeft: 5,
  },
  addSegmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 5,
    marginBottom: 15,
  },
  addSegmentText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 16,
  },
  bottomSpace: {
    height: 100,
  }
});