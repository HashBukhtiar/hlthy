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
  const [calculatedImageHeight, setCalculatedImageHeight] = useState<number>(200);


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

          // Get image dimensions after workoutData is set
          if (fullWorkoutData.coverImageUrl) {
            Image.getSize(
              fullWorkoutData.coverImageUrl,
              (width, height) => {
                const screenWidth = Dimensions.get('window').width;
                setCalculatedImageHeight(screenWidth * (height / width));
              },
              (err) => {
                console.error("Failed to get network image size:", err);
                setCalculatedImageHeight(200); // Fallback height on error
              }
            );
          } else {
            // Handle local default image
            const localImageSource = Image.resolveAssetSource(require('@/assets/images/default_workout_cover.png'));
            if (localImageSource) {
              const screenWidth = Dimensions.get('window').width;
              setCalculatedImageHeight(screenWidth * (localImageSource.height / localImageSource.width));
            } else {
              setCalculatedImageHeight(200); // Fallback for local image
            }
          }

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
                  name={isFavorited ? "heart" : "heart-outline"}
                  size={20}
                  color={isFavorited ? "#ff2d55" : "white"}
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
      
      <Image
        source={workoutData.coverImageUrl ? { uri: workoutData.coverImageUrl } : require('@/assets/images/default_workout_cover.png')}
        style={[styles.workoutImage, { height: calculatedImageHeight }]} 
        resizeMode="cover" 
      />
      
      <Text style={styles.workoutTitle}>{workoutData.title}</Text>
      <Text style={styles.creatorName}>by {workoutData.creatorUsername}</Text>
      <Text style={styles.workoutLength}>{displayWorkoutLength} • {workoutData.savedCount} saves</Text>

      {workoutData.description && (
        <>
          <Text style={styles.descriptionTitle}>Description</Text>
          <View style={styles.descriptionCard}>
            <Text style={styles.descriptionText}>{workoutData.description}</Text>
          </View>
        </>
      )}

      {workoutData.segments.map((segment, segmentIndex) => (
        <View key={segment.id || segmentIndex} style={{ marginTop: segmentIndex === 0 ? 30 : 10 }}>
          <View style={styles.segmentHeader}>
            <Text style={styles.segmentName}>{segment.name}</Text>
            <View style={styles.segmentInfo}>
              <Text style={styles.segmentDetails}>{segment.exercises.length} exercises • {segment.length} mins</Text>
            </View>
          </View>
          
          <View style={styles.segmentCard}>
            {segment.exercises.map((exercise, index) => (
              <View key={exercise.id || index}>
                <View style={styles.workoutRow}>
                  <View style={styles.workoutInfo}>
                    <View style={styles.workoutNumberCircle}>
                      <Text style={styles.workoutNumber}>{index + 1}</Text>
                    </View>
                    <Text style={styles.workoutName}>{exercise.name}</Text>
                    <Text style={styles.workoutReps}>({exercise.sets} × {exercise.reps})</Text>
                  </View>
                  {/* Optional: More actions per exercise 
                  <TouchableOpacity>
                    <Ionicons name="ellipsis-horizontal" size={18} color="white" />
                  </TouchableOpacity>
                  */}
                </View>
                {index < segment.exercises.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        </View>
      ))}
      <View style={{ height: 80 }} />
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
  workoutImage: { 
    width: '100%',
    marginTop: 0,
  },
  workoutTitle: { 
    color: '#ffffff', 
    fontSize: 26,
    fontWeight: 'bold', 
    
    marginTop: 20,
    paddingHorizontal: 20,
  },
  creatorName: { 
    color: '#b7b7b7', 
    fontSize: 16,
    
    marginTop: 5,
    paddingHorizontal: 20,
  },
  workoutLength: { 
    color: '#888888',
    fontSize: 14, 
    
    marginTop: 7,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  segmentHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    marginBottom: 5, 
  },
  segmentName: { 
    color: '#ffffff', 
    fontSize: 20,
    fontWeight: 'bold' 
  },
  segmentInfo: { 
    
    
  },
  segmentDetails: { 
    color: '#888888',
    fontSize: 14 
  },
  segmentCard: { 
    backgroundColor: '#1e1e1e',
    borderRadius: 15,
    marginTop: 10, 
    marginHorizontal: 20, 
    paddingVertical: 15, 
    paddingHorizontal: 20, 
  },
  workoutRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginVertical: 8
  },
  workoutInfo: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1, 
  },
  workoutNumberCircle: { 
    width: 28, 
    height: 28, 
    borderRadius: 14, 
    backgroundColor: '#444', 
    justifyContent: 'center', 
    alignItems: 'center', 
    
    marginRight: 12,
    
  },
  workoutNumber: { 
    fontSize: 14, 
    color: '#e0e0e0', 
    fontWeight: 'bold' 
  },
  workoutName: { 
    color: '#f3f3f3', 
    fontWeight: 'bold', 
    fontSize: 17, 
   
    flexShrink: 1, 
  },
  workoutReps: { 
    color: '#b7b7b7', 
    fontSize: 14, 
    marginLeft: 8 
  },
  divider: { 
    height: 1, 
    backgroundColor: '#333', 
    marginVertical: 10 
  },
  descriptionTitle: { 
    color: '#c0c0c0', 
    fontSize: 18, 
    fontWeight: 'bold',
    paddingHorizontal: 20, 
  },
  descriptionCard: { 
    backgroundColor: '#1e1e1e', 
    borderRadius: 15, 
    marginTop: 10, 
    marginHorizontal: 20, 
    padding: 20 
  },
  descriptionText: { 
    color: '#b7b7b7', 
    fontSize: 15,
    lineHeight: 22, 
  },
});