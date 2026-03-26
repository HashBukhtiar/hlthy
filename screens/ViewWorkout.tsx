import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert, Platform, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ShareModal from '@/components/ShareModal';
import ReportModal from '@/components/ReportModal';
import { shareWorkout } from '@/services/ShareService';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/firebaseConfig'; 
import { doc, getDoc, Timestamp, updateDoc, increment, setDoc, deleteDoc, collection, query, where, orderBy, getDocs, limit } from '@/features/infra/firestore';
import { useAuth } from '@/context/AuthContext'; 
import { getCoverImageSource, deleteImageFromStorage } from '@/utils/imageUtils';
import { useBlockEnforcement } from '@/utils/blockUtils';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import MentionText from '@/components/MentionText';
import { ACCENT_COLOR } from '@/constants/Colors';

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
  thumbnailUrl?: string | null;
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
  const { canInteractWithUser } = useBlockEnforcement();
  const insets = useSafeAreaInsets();

  const [workoutData, setWorkoutData] = useState<WorkoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; profileImageUrl?: string; profileThumbnailUrl?: string }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearchUsers = async (text: string) => {
    setSearchText(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchLoading(true);
      const lowerText = text.toLowerCase();
      const q = query(
        collection(db, 'users'),
        where('username', '>=', lowerText),
        where('username', '<=', lowerText + '\uf8ff'),
        orderBy('username'),
        limit(20)
      );
      const querySnapshot = await getDocs(q);
      const results: any[] = [];
      querySnapshot.forEach(docSnap => {
        const userData = docSnap.data();
        const userId = docSnap.id;
        
        // Skip current user and blocked users
        if (userId === currentUser?.uid) return;
        
        if (canInteractWithUser(userId, userData.blockedUsers)) {
          results.push({
            id: userId,
            username: userData.username,
            profileImageUrl: userData.profileImageUrl,
            profileThumbnailUrl: userData.profileThumbnailUrl,
          });
        }
      });
      setSearchResults(results.slice(0, 10));
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Helper function to generate conversation ID
  const generateConversationId = (userId1: string, userId2: string): string => {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  };

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
        <ActivityIndicator size="large" color={ACCENT_COLOR} />
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

  const shareWorkoutWithUser = async (userId: string, username: string, profileImageUrl?: string, profileThumbnailUrl?: string) => {
    if (!currentUser || !workoutData) return;
    
    try {
      await shareWorkout(
        currentUser,
        userId,
        username,
        profileImageUrl,
        profileThumbnailUrl,
        {
          id: workoutData.id,
          title: workoutData.title,
          coverImageUrl: workoutData.coverImageUrl || null,
          thumbnailUrl: workoutData.thumbnailUrl || null,
          creatorUsername: workoutData.creatorUsername,
          description: workoutData.description
        }
      );
      
      setShareModalVisible(false);
      Alert.alert("Success", "Workout shared successfully.");
    } catch (error) {
      console.error("Error sharing workout:", error);
      Alert.alert("Error", "Failed to share workout.");
    }
  };

  const handleShareWorkout = () => {
    if (!currentUser) {
      Alert.alert("Please log in", "You need to be logged in to share workouts.");
      return;
    }
    
    setShareModalVisible(true);
  };

  const handleStartWorkout = () => {
    if (!currentUser) {
      Alert.alert("Please log in", "You need to be logged in to start a workout.");
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/active-workout/${workoutId}`);
  };
  
  return (
    <SafeAreaView style={styles.mainContainer}>
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
                          // Delete both cover image and thumbnail from storage
                          if (workoutData.coverImageUrl) {
                            try {
                              await deleteImageFromStorage(workoutData.coverImageUrl);
                            } catch (storageError) {
                              console.error("Error deleting cover image from storage:", storageError);
                            }
                          }
                          
                          // Delete thumbnail if it exists
                          if (workoutData.thumbnailUrl) {
                            try {
                              await deleteImageFromStorage(workoutData.thumbnailUrl);
                            } catch (storageError) {
                              console.error("Error deleting thumbnail from storage:", storageError);
                            }
                          }
                          
                          // Delete the workout document
                          const workoutDocRef = doc(db, 'workouts', workoutId);
                          await deleteDoc(workoutDocRef);
                          
                          // Update user's workout count
                          const userDocRef = doc(db, 'users', currentUser.uid);
                          await updateDoc(userDocRef, {
                            'stats.workoutCount': increment(-1)
                          });
                          
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
          <TouchableOpacity onPress={handleShareWorkout} disabled={!currentUser}>
            <View style={styles.menuButton}>
              <Ionicons
                name="paper-plane-outline"
                size={20}
                color="white"
              />
            </View>
          </TouchableOpacity>
          {/* Report button - only for non-owner */}
          {currentUser && workoutData.creatorId !== currentUser.uid && (
            <TouchableOpacity onPress={() => setReportModalVisible(true)}>
              <View style={styles.menuButton}>
                <Ionicons
                  name="flag-outline"
                  size={20}
                  color="white"
                />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <View style={styles.imageContainer}>
        <Image
          source={getCoverImageSource(workoutData.coverImageUrl, workoutData.thumbnailUrl)}
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
            <MentionText text={workoutData.description} mentions={(workoutData as any).mentions} style={styles.descriptionText} />
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
      <ShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        onShareWith={shareWorkoutWithUser}
      />
      {/* Report Modal - only for non-owner */}
      {currentUser && workoutData.creatorId !== currentUser.uid && (
        <ReportModal
          visible={reportModalVisible}
          onClose={() => setReportModalVisible(false)}
          contentType="workout"
          contentId={workoutData.id}
          reportedUserId={workoutData.creatorId}
          contentSnapshot={{
            title: workoutData.title,
            creatorUsername: workoutData.creatorUsername,
            coverImageUrl: workoutData.coverImageUrl || undefined,
          }}
        />
      )}
    </ScrollView>
    
    {/* Start Workout Button */}
    <View style={[styles.startButtonContainer, { paddingBottom: Math.max(insets.bottom, 20) + 35 }]}>
      <TouchableOpacity 
        style={styles.startButton} 
        onPress={handleStartWorkout}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#ff2d55', '#d91a40']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.startButtonGradient}
        >
          <Ionicons name="play" size={22} color="#fff" />
          <Text style={styles.startButtonText}>Start Workout</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
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
    color: ACCENT_COLOR,
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
    backgroundColor: ACCENT_COLOR, 
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
    height: 140,
  },
  startButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.98)',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  clickableText: {
    textDecorationLine: 'underline',
  },
  shareModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  shareModalContent: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  shareModalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    marginVertical: 15,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#333',
    color: '#FFF',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  userItemImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
  },
  userItemText: {
    color: '#FFF',
    fontSize: 16,
  },
  emptyResultsText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
});