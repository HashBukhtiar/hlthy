import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/firebaseConfig'; 
import { doc, getDoc, Timestamp, updateDoc, increment, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext'; 

// Interface for individual exercise within a segment
interface WorkoutExercise {
  id: string; 
  name: string;
  sets: string;
  reps: string;
}

// Interface for a segment of the workout
interface WorkoutSegment {
  id: string; 
  name: string;
  length: string;
  exercises: WorkoutExercise[];
}

// Interface for the full workout data fetched from Firestore
interface WorkoutData {
  id: string; 
  title: string;
  creatorId: string;
  creatorUsername: string;
  coverImageUrl?: string | null;
  workoutLength?: string; 
  segments: WorkoutSegment[];
  description: string;
  isPublic: boolean;
  savedCount: number;
  createdAt: Timestamp;
  tags?: string[];
}

export default function ViewWorkout() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const workoutId = params.id as string;
  const { currentUser } = useAuth();

  const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    const fetchWorkout = async () => {
      if (!workoutId) {
        setError("Workout ID is missing.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null); 
        setWorkoutData(null); 
        const workoutDocRef = doc(db, 'workouts', workoutId);
        const workoutDocSnap = await getDoc(workoutDocRef);

        if (workoutDocSnap.exists()) {
          const data = workoutDocSnap.data() as Omit<WorkoutData, 'id'>;
          const fullWorkoutData = { id: workoutDocSnap.id, ...data };
          setWorkoutData(fullWorkoutData);
          if (currentUser) {
            const favoriteDocRef = doc(db, `users/${currentUser.uid}/savedWorkouts`, workoutId);
            const favoriteDocSnap = await getDoc(favoriteDocRef);
            setIsFavorited(favoriteDocSnap.exists());
          }
        } else {
          setError("Workout not found.");
        }
      } catch (err: any) {
        console.error("Error fetching workout:", err);
        setError("Failed to load workout data.");
      } finally {
        setLoading(false);
      }
    };

    fetchWorkout();
  }, [workoutId, currentUser]);

  const handleToggleFavorite = async () => {
    if (!currentUser || !workoutData) return;
    setFavoriteLoading(true);

    const workoutDocRef = doc(db, 'workouts', workoutId);
    const userFavoriteDocRef = doc(db, `users/${currentUser.uid}/savedWorkouts`, workoutId);

    try {
      if (isFavorited) {
        // Unfavorite
        await deleteDoc(userFavoriteDocRef);
        await updateDoc(workoutDocRef, {
          savedCount: increment(-1)
        });
        setIsFavorited(false);
        setWorkoutData(prev => prev ? { ...prev, savedCount: prev.savedCount - 1 } : null);
      } else {
        // Favorite
        await setDoc(userFavoriteDocRef, {
          workoutId: workoutId,
          title: workoutData.title,
          coverImageUrl: workoutData.coverImageUrl || null,
          creatorUsername: workoutData.creatorUsername,
          savedAt: Timestamp.now()
        });
        await updateDoc(workoutDocRef, {
          savedCount: increment(1)
        });
        setIsFavorited(true);
        setWorkoutData(prev => prev ? { ...prev, savedCount: prev.savedCount + 1 } : null);
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
      Alert.alert("Error", "Could not update favorite status.");
    } finally {
      setFavoriteLoading(false);
    }
  };
  
  const parseDuration = (durationStr: string): number => {
    if (!durationStr || typeof durationStr !== 'string') return 0;
    
    const minutes = parseInt(durationStr, 10);
    return isNaN(minutes) ? 0 : minutes;
  };

  const formatTotalDuration = (totalMinutes: number): string => {
    return `${totalMinutes} minutes`;
  };
  
  const calculateTotalLength = (segments: WorkoutSegment[]): string => {
    if (!segments || segments.length === 0) return "N/A";
    let totalMinutes = 0;
    segments.forEach(segment => {
      totalMinutes += parseDuration(segment.length);
    });
    return formatTotalDuration(totalMinutes);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#ff2d55" />
        <Text style={{ color: 'grey', marginTop: 10 }}>Loading Workout...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonOnError}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!workoutData) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Workout data is not available.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonOnError}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const displayWorkoutLength = calculateTotalLength(workoutData.segments);
  
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {workoutData.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {currentUser && workoutData.creatorId === currentUser.uid && (
            <>
              <TouchableOpacity onPress={() => router.push(`/edit-workout/${workoutId}`)} style={styles.menuButton}>
                <Ionicons name="pencil" size={20} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                Alert.alert(
                  "Delete Workout",
                  "Are you sure you want to delete this workout?",
                  [
                    {
                      text: "Cancel",
                      style: "cancel"
                    },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          const workoutDocRef = doc(db, 'workouts', workoutId);
                          await deleteDoc(workoutDocRef);
                          router.back();
                        } catch (error) {
                          console.error("Error deleting workout:", error);
                          Alert.alert("Error", "Failed to delete workout.");
                        }
                      },
                    }
                  ]
                );
              }} style={styles.menuButton}>
                <Ionicons name="trash" size={20} color="white" />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={handleToggleFavorite} disabled={favoriteLoading || !currentUser}>
            <View style={styles.menuButton}>
              {favoriteLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name={isFavorited ? "bookmark" : "bookmark-outline"}
                  size={20}
                  color="white"
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.imageContainer}>
        <Image
          source={workoutData.coverImageUrl ? { uri: workoutData.coverImageUrl } : require('@/assets/images/default_workout_cover.png')}
          style={styles.workoutImage}
          resizeMode="cover" 
        />
      </View>
      
      <View style={styles.workoutInfoContainer}>
        <Text style={styles.workoutTitle}>{workoutData.title}</Text>
        <TouchableOpacity onPress={() => router.push(`/profile/${workoutData.creatorId}`)}>
          <Text style={[styles.creatorName, styles.clickableText]}>{workoutData.creatorUsername}</Text>
        </TouchableOpacity>
        <Text style={styles.workoutLength}>{displayWorkoutLength} • {workoutData.savedCount} saves</Text>
      </View>

      {workoutData.description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionTitle}>Description</Text>
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{workoutData.description}</Text>
          </View>
        </View>
      )}

      <View style={styles.segmentsContainer}>
        {workoutData.segments.map((segment, segmentIndex) => (
          <View key={segment.id || segmentIndex} style={[styles.segmentWrapper, segmentIndex === 0 ? styles.firstSegmentWrapper : null]}>
            <View style={styles.segmentHeader}>
              <Text style={styles.segmentName}>{segment.name}</Text>
              <View style={styles.segmentInfo}>
                <Text style={styles.segmentDetails}>{segment.exercises.length} exercises • {segment.length}</Text>
              </View>
            </View>
            
            <View style={styles.segmentCard}>
              {segment.exercises.map((exercise, index) => (
                <View key={exercise.id || index} style={styles.exerciseContainer}>
                  <View style={styles.workoutRow}>
                    <View style={styles.workoutNumberCircle}>
                      <Text style={styles.workoutNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.exerciseDetails}>
                      <Text style={styles.workoutName}>{exercise.name}</Text>
                      <Text style={styles.workoutReps}>{exercise.sets} sets × {exercise.reps} reps</Text>
                    </View>
                  </View>
                  {index < segment.exercises.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: 'black',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButtonOnError: {
    backgroundColor: '#333',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 15, 
    justifyContent: 'space-between', 
    backgroundColor: 'black',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: { 
    color: 'white', 
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1, 
    textAlign: 'center', 
    marginHorizontal: 10, 
  },
  menuButton: { 
    borderRadius: 15, 
    width: 35,
    height: 35, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 15,
  },
  workoutImage: { 
    width: '60%',
    height: undefined,
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: '#444',
  },
  workoutInfoContainer: {
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 15,
    marginBottom: 10,
  },
  workoutTitle: { 
    color: '#ffffff', 
    fontSize: 24,
    fontWeight: 'bold', 
    textAlign: 'center',
  },
  creatorName: { 
    color: '#ff2d55',
    fontSize: 16,
    marginTop: 5,
    textAlign: 'center',
  },
  workoutLength: { 
    color: '#888888',
    fontSize: 14, 
    marginTop: 7,
    textAlign: 'center',
    marginBottom: 10,
  },
  segmentsContainer: {
    marginTop: 25,
  },
  segmentWrapper: {
    marginBottom: 25,
    marginHorizontal: 20,
  },
  firstSegmentWrapper: {
    marginTop: 5,
  },
  segmentHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  segmentName: { 
    color: '#ffffff', 
    fontSize: 19,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  segmentInfo: { 
    backgroundColor: 'rgba(80, 80, 80, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  segmentDetails: { 
    color: '#b0b0b0',
    fontSize: 14,
    fontWeight: '500',
  },
  segmentCard: { 
    backgroundColor: '#1e1e1e',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  exerciseContainer: {
    marginBottom: 4,
  },
  workoutRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12,
  },
  workoutNumberCircle: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#ff2d55', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  workoutNumber: { 
    fontSize: 16, 
    color: '#ffffff', 
    fontWeight: 'bold' 
  },
  exerciseDetails: {
    flex: 1,
  },
  workoutName: { 
    color: '#ffffff', 
    fontWeight: 'bold', 
    fontSize: 17,
    marginBottom: 4,
  },
  workoutReps: { 
    color: '#b7b7b7', 
    fontSize: 14,
  },
  divider: { 
    height: 1, 
    backgroundColor: '#2a2a2a', 
    marginVertical: 6
  },
  descriptionContainer: {
    marginTop: 10,
    marginHorizontal: 20,
  },
  descriptionTitle: { 
    color: '#ffffff', 
    fontSize: 19, 
    fontWeight: 'bold',
    marginBottom: 10,
    marginLeft: 5,
  },
  descriptionCard: { 
    backgroundColor: 'transparent', 
    borderRadius: 18, 
    paddingHorizontal: 5,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  descriptionText: { 
    color: '#d0d0d0', 
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400', 
  },
  bottomPadding: {
    height: 80,
  },
});