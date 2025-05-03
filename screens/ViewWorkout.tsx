import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import globalStyles from '@/styles/globalStyles';

interface WorkoutExercise {
  name: string;
  reps: string;
}

interface WorkoutSegment {
  name: string;
  length: string;
  workouts: WorkoutExercise[];
}

interface WorkoutData {
  title: string;
  creatorName: string;
  workoutLength: string;
  segments: WorkoutSegment[];
  description: string;
}

export default function ViewWorkout() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const workoutId = params.id as string;

  // Mock API result - In a real app, you would fetch this data based on workoutId
  const workoutData: WorkoutData = {
    title: "Impossible Leg Day",
    creatorName: "John Doe",
    workoutLength: "2 segments • 1h 30min",
    segments: [
      {
        name: "Warm Up",
        length: "30 mins",
        workouts: [
          { name: "Bulgarian Split Squats", reps: "3x12" },
          { name: "Deadlift", reps: "3x5" },
          { name: "Leg Press", reps: "3x10" },
        ],
      },
      {
        name: "Main Workout",
        length: "1h",
        workouts: [
          { name: "Squats", reps: "2x10" },
          { name: "Lunges", reps: "2x10" },
          { name: "Calf Raises", reps: "2x15" },
          { name: "Leg Extensions", reps: "2x12"},
          { name: "Leg Curls", reps: "2x12"}
        ],
      },
    ],
    description: "This is a killer leg day workout that will leave you sore for days. Make sure to stretch and warm up properly before starting this workout."
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>View Workout</Text>
        <TouchableOpacity>
          <View style={styles.menuButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color="white" />
          </View>
        </TouchableOpacity>
      </View>
      
      <Image
        source={{ uri: 'https://thecamerastore.com/cdn/shop/articles/GINAYEOLANDSCAPE-1_800x.jpg?v=1687296669' }}
        style={styles.workoutImage}
      />
      
      <Text style={styles.workoutTitle}>{workoutData.title}</Text>
      <Text style={styles.creatorName}>{workoutData.creatorName}</Text>
      <Text style={styles.workoutLength}>{workoutData.workoutLength}</Text>

      {workoutData.segments.map((segment, segmentIndex) => (
        <View key={segmentIndex} style={{ marginTop: segmentIndex === 0 ? 30 : 10 }}>
          <View style={styles.segmentHeader}>
            <Text style={styles.segmentName}>{segment.name}</Text>
            <View style={styles.segmentInfo}>
              <Text style={styles.segmentDetails}>{segment.workouts.length} exercises • {segment.length}</Text>
            </View>
          </View>
          
          <View style={styles.segmentCard}>
            {segment.workouts.map((workout, index) => (
              <View key={index}>
                <View style={styles.workoutRow}>
                  <View style={styles.workoutInfo}>
                    <View style={styles.workoutNumberCircle}>
                      <Text style={styles.workoutNumber}>{index + 1}</Text>
                    </View>
                    <Text style={styles.workoutName}>{workout.name}</Text>
                    <Text style={styles.workoutReps}>({workout.reps})</Text>
                  </View>
                  <TouchableOpacity>
                    <Ionicons name="ellipsis-horizontal" size={18} color="white" />
                  </TouchableOpacity>
                </View>
                {index < segment.workouts.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>
      ))}

      <Text style={styles.descriptionTitle}>Description</Text>
      <View style={styles.descriptionCard}>
        <Text style={styles.descriptionText}>{workoutData.description}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'black' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 70, 
    paddingLeft: 25, 
    marginTop: -40, 
    justifyContent: 'space-between', 
    paddingRight: 25 
  },
  headerTitle: { 
    color: 'white', 
    fontSize: 30, 
    marginLeft: -100, 
    fontWeight: 'bold' 
  },
  menuButton: { 
    backgroundColor: '#303030', 
    borderRadius: 15, 
    width: 30, 
    height: 30, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  workoutImage: { 
    width: '50%', 
    aspectRatio: 1, 
    borderRadius: 15, 
    alignSelf: 'center', 
    marginTop: 50 
  },
  workoutTitle: { 
    color: '#ffffff', 
    fontSize: 28, 
    fontWeight: 'bold', 
    alignSelf: 'center', 
    marginTop: 20 
  },
  creatorName: { 
    color: '#b7b7b7', 
    fontSize: 20, 
    alignSelf: 'center', 
    marginTop: 5 
  },
  workoutLength: { 
    color: '#666666', 
    fontSize: 14, 
    alignSelf: 'center', 
    marginTop: 7 
  },
  segmentHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 30 
  },
  segmentName: { 
    color: '#ffffff', 
    fontSize: 22, 
    fontWeight: 'bold' 
  },
  segmentInfo: { 
    alignSelf: 'flex-start', 
    marginTop: 10 
  },
  segmentDetails: { 
    color: '#666666', 
    fontSize: 14 
  },
  segmentCard: { 
    backgroundColor: '#303030', 
    borderRadius: 20, 
    marginTop: 14, 
    margin: 20, 
    padding: 20 
  },
  workoutRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginVertical: 6 
  },
  workoutInfo: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  workoutNumberCircle: { 
    width: 25, 
    height: 25, 
    borderRadius: 12, 
    backgroundColor: '#909090', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: -5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  workoutNumber: { 
    fontSize: 15, 
    color: 'black', 
    fontWeight: 'bold' 
  },
  workoutName: { 
    color: '#f3f3f3', 
    fontWeight: 'bold', 
    fontSize: 18, 
    marginLeft: 10 
  },
  workoutReps: { 
    color: '#b7b7b7', 
    fontWeight: 'bold', 
    fontSize: 13, 
    marginLeft: 10 
  },
  divider: { 
    height: 1, 
    backgroundColor: '#707070', 
    marginVertical: 5 
  },
  descriptionTitle: { 
    color: '#c0c0c0', 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginTop: 10, 
    marginLeft: 30
  },
  descriptionCard: { 
    backgroundColor: '#202020', 
    borderRadius: 20, 
    marginTop: 14, 
    margin: 20, 
    padding: 20 
  },
  descriptionText: { 
    color: '#b7b7b7', 
    fontSize: 16 
  },
});