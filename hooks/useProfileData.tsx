import { useState, useEffect, useCallback } from 'react';
import { collection, query, orderBy, getDocs, doc, getDoc, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, app } from '@/firebaseConfig';
import { useAuth } from '@/context/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { UserProfile } from '@/types/user';

export interface Milestone {
  id: string;
  postId: string;
  exerciseName?: string;
  reps?: number;
  weight?: string;
  date?: any;
}

export interface GroupedMilestones {
  [monthYear: string]: Milestone[];
}

interface WorkoutItemData {
  id: string;
  title: string;
  creatorId: string;
  creatorUsername: string;
  coverImageUrl?: string | null;
  thumbnailUrl?: string | null;
}

export function useProfileData(userId = null, contextUserProfile: UserProfile | null = null) {
  const { currentUser } = useAuth();
  const profileIdToFetch = userId || currentUser?.uid;
  const functions = getFunctions(app, 'northamerica-northeast2');
  const followUserFn   = httpsCallable(functions, 'followUser');
  const unfollowUserFn = httpsCallable(functions, 'unfollowUser');
  const isOwnProfile = !userId || userId === currentUser?.uid;
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [groupedMilestones, setGroupedMilestones] = useState<GroupedMilestones>({});
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isRequestPending, setIsRequestPending] = useState(false);
  const [isFollowingStatus, setIsFollowingStatus] = useState(false);
  const [followActionLoading, setFollowActionLoading] = useState(false);
  const [activePostCount, setActivePostCount] = useState<number | null>(null);
  const [savedWorkouts, setSavedWorkouts] = useState<any[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(false);

  const processUserProfile = (userData: any): UserProfile => {
    if (!userData) {
      throw new Error("User data is required");
    }

    return {
      ...userData,
      // Prioritize top-level counts (current Firebase structure)
      followerCount: userData.followerCount ?? userData.stats?.followerCount ?? 0,
      followingCount: userData.followingCount ?? userData.stats?.followingCount ?? 0,
      
      // Ensure stats object exists with consistent data
      stats: {
        followerCount: userData.followerCount ?? userData.stats?.followerCount ?? 0,
        followingCount: userData.followingCount ?? userData.stats?.followingCount ?? 0,
        postCount: userData.stats?.postCount ?? 0,
        workoutCount: userData.stats?.workoutCount ?? 0,
      },

      // Handle profile images with proper fallbacks
      profileImageUrl: userData.profileImageUrl || '',
      profileThumbnailUrl: userData.profileThumbnailUrl || null,

      // Ensure required fields have defaults
      uid: userData.uid || userData.id,
      username: userData.username || '',
      displayName: userData.displayName || '',
      email: userData.email || '',
      bio: userData.bio || '',
      archetype: userData.archetype || 'generalist',
      createdAt: userData.createdAt,

      // Profile Settings
      profileVisibility: userData.profileVisibility ?? 'public',
      
      // Optional fields with proper defaults
      dateOfBirth: userData.dateOfBirth || undefined,
      accountPrivacy: userData.accountPrivacy || 'public',
      latestPRs: userData.latestPRs || {},
      
      // Physical stats
      physicalStats: userData.physicalStats || undefined,
      
      // Goals & Preferences
      fitnessGoals: userData.fitnessGoals || [],
      preferredWorkoutTypes: userData.preferredWorkoutTypes || [],
      workoutFrequency: userData.workoutFrequency || undefined,
      
      // Verification & Status
      isVerified: userData.isVerified || false,
      isPremium: userData.isPremium || false,
      subscriptionStatus: userData.subscriptionStatus || 'free',
      
      // Activity Status
      lastActive: userData.lastActive || undefined,
      isOnline: userData.isOnline || false,
      
      // Location
      location: userData.location || undefined,
      
      // Social Links
      socialLinks: userData.socialLinks || undefined,
      
      // Notification Preferences
      notificationSettings: userData.notificationSettings || {
        pushNotifications: true,
        emailNotifications: false,
        followRequests: true,
        workoutReminders: true,
        socialUpdates: true,
      },
      
      // Achievement System
      badges: userData.badges || [],
      achievements: userData.achievements || [],
      currentStreak: userData.currentStreak || 0,
      longestStreak: userData.longestStreak || 0,
      
      // Content Preferences
      contentPreferences: userData.contentPreferences || {
        showMilestones: true,
        showWorkouts: true,
        allowTagging: true,
        profileVisibility: 'everyone',
      },
      
      // App Preferences
      units: userData.units || 'metric',
      language: userData.language || 'en',
      region: userData.region || undefined,
      
      // Profile Completion
      isProfileComplete: userData.isProfileComplete || false,
      profileCompletionPercentage: userData.profileCompletionPercentage || 0,
    } as UserProfile;
  };

  const groupAndSortMilestones = (milestonesToSort: Milestone[]): GroupedMilestones => {
    // Sort milestones first
    const sortedMilestones = [...milestonesToSort].sort((a, b) => {
        let dateA = a.date;
        let dateB = b.date;

        // Convert Firestore Timestamps or other date formats to Date objects
        if (dateA && typeof dateA === 'object' && dateA.seconds) dateA = new Date(dateA.seconds * 1000);
        else if (dateA && !(dateA instanceof Date)) dateA = new Date(dateA);
        else if (!dateA) dateA = null;

        if (dateB && typeof dateB === 'object' && dateB.seconds) dateB = new Date(dateB.seconds * 1000);
        else if (dateB && !(dateB instanceof Date)) dateB = new Date(dateB);
        else if (!dateB) dateB = null;

        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;

        return dateB.getTime() - dateA.getTime();
    });

    // Group sorted milestones
    return sortedMilestones.reduce((groups: GroupedMilestones, milestone) => {
        let date = milestone.date;

        // Ensure we have a valid Date object
        if (date && typeof date === 'object' && date.seconds) date = new Date(date.seconds * 1000);
        else if (date && !(date instanceof Date)) date = new Date(date);
        else if (!date || !(date instanceof Date)) {
            return groups;
        }

        try {
            const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            if (!groups[monthYear]) {
                groups[monthYear] = [];
            }
            groups[monthYear].push(milestone);
        } catch (error) {
            console.error("Error formatting month/year for milestone:", error, milestone);
        }
        return groups;
    }, {});
};

  // Memoize fetchProfileData to prevent infinite loops
  const fetchProfileData = useCallback(async () => {
    if (!profileIdToFetch) {
      setLoading(false);
      setError(new Error("No profile ID available to fetch data."));
      console.log("No profileIdToFetch, returning early from fetchProfileData");
      return;
    }
    
    console.log(`Fetching profile data for ID (fetchProfileData): ${profileIdToFetch}`);
    setLoading(true);
    setLoadingWorkouts(true);
    setError(null);

    try {
      let userData: any | null = null;
      let userPosts: any[] = [];
      let userMilestonesRaw: Milestone[] = [];
      let userWorkouts: any[] = [];
      let userSavedWorkouts: any[] = [];
      let userFollowers: any[] = [];
      let userFollowingData: any[] = [];

      // 1. Fetch user profile
      try {
        const userDoc = await getDoc(doc(db, "users", profileIdToFetch));
        if (userDoc.exists()) {
          const rawUserData = { 
            id: userDoc.id, 
            ...userDoc.data(),
          }; 
          // Process the raw user data through our migration function
          userData = processUserProfile(rawUserData);
          console.log("User profile data retrieved and processed for:", profileIdToFetch);
        } else {
          console.log("User profile not found for:", profileIdToFetch);
          throw new Error("User profile not found.");
        }
      } catch (profileError) {
        console.error("Error fetching user profile:", profileError);
        setError(profileError as Error);
        setLoading(false);
        return;
      }

      // 2. Fetch user posts
      try {
        const postsQuery = query(
          collection(db, "posts"),
          where("authorId", "==", profileIdToFetch),
          orderBy("createdAt", "desc")
        );
        const postsSnapshot = await getDocs(postsQuery);
        // Attach the fresh profile image URL from the already-fetched user profile
        userPosts = postsSnapshot.docs.map(doc => {
          const postData = doc.data();
          return {
            ...postData,
            id: doc.id,
            authorProfileImageUrl: userData.profileImageUrl,
            authorProfileThumbnailUrl: userData.profileThumbnailUrl,
          };
        });
        console.log(`Retrieved ${userPosts.length} user posts for:`, profileIdToFetch);
      } catch (postsError) {
        console.error("Error fetching posts:", postsError);
      }

      // 3. Extract and format milestones from posts
      try {
        userMilestonesRaw = userPosts
          .filter(post => post.isMilestone && post.milestoneDetails)
          .map(post => {
            let milestone: Milestone = {
              id: post.id,
              postId: post.id,
              date: post.createdAt,
              exerciseName: '',
              reps: 0,
              weight: ''
            };

            if (post.milestoneDetails.type === 'PR') {
              milestone.exerciseName = post.milestoneDetails.exerciseName || 'Unknown Exercise';
              milestone.reps = post.milestoneDetails.reps || 0;
              milestone.weight = `${post.milestoneDetails.value || 0} ${post.milestoneDetails.weightUnit || ''}`;
              
              (milestone as any).value = post.milestoneDetails.value;
              (milestone as any).weightUnit = post.milestoneDetails.weightUnit;
              (milestone as any).duration = post.milestoneDetails.duration;
              (milestone as any).level = post.milestoneDetails.level;
              (milestone as any).distance = post.milestoneDetails.distance;
              (milestone as any).distanceUnit = post.milestoneDetails.distanceUnit;
              
            } else if (post.milestoneDetails.type === 'weightLoss' || post.milestoneDetails.type === 'weightGain') {
              milestone.exerciseName = post.milestoneDetails.type === 'weightLoss' ? 'Weight Loss' : 'Weight Gain';
              milestone.weight = `${post.milestoneDetails.newWeight || 0} ${post.milestoneDetails.newWeightUnit || ''}`;
              
              (milestone as any).newWeight = post.milestoneDetails.newWeight;
              (milestone as any).newWeightUnit = post.milestoneDetails.newWeightUnit;
            }
            return milestone;
          });
        console.log(`Extracted ${userMilestonesRaw.length} raw milestones from posts for:`, profileIdToFetch);
      } catch (milestoneError) {
        console.error("Error processing milestones:", milestoneError);
      }

      try {
        const workoutsQuery = query(
          collection(db, "workouts"),
          where("creatorId", "==", profileIdToFetch), 
          orderBy("createdAt", "desc")
        );
        const workoutsSnapshot = await getDocs(workoutsQuery);
        userWorkouts = workoutsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Retrieved ${userWorkouts.length} workouts for:`, profileIdToFetch);
      } catch (workoutsError) {
        console.error("Error fetching workouts:", workoutsError);
      }

      // 5. Fetch saved workouts (only for own profile)
      if (isOwnProfile) {
        try {
          const savedWorkoutsQuery = query(
            collection(db, "users", profileIdToFetch, "savedWorkouts"),
            orderBy("savedAt", "desc")
          );
          const savedWorkoutsSnapshot = await getDocs(savedWorkoutsQuery);
          const savedWorkoutIds = savedWorkoutsSnapshot.docs.map(doc => doc.id);
          
          // Fetch full workout data for saved workouts
          if (savedWorkoutIds.length > 0) {
            const savedWorkoutPromises = savedWorkoutIds.map(async (workoutId) => {
              const workoutDoc = await getDoc(doc(db, "workouts", workoutId));
              if (workoutDoc.exists()) {
                return { id: workoutDoc.id, ...workoutDoc.data() };
              }
              return null;
            });
            
            const savedWorkoutResults = await Promise.all(savedWorkoutPromises);
            userSavedWorkouts = savedWorkoutResults.filter(workout => workout !== null);
          }
          
          console.log(`Retrieved ${userSavedWorkouts.length} saved workouts for:`, profileIdToFetch);
        } catch (savedWorkoutsError) {
          console.error("Error fetching saved workouts:", savedWorkoutsError);
        }
      }

      // 6. Fetch followers
      try {
        const followersQuery = query(collection(db, "users", profileIdToFetch, "followers"));
        const followersSnap = await getDocs(followersQuery);
        userFollowers = followersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Retrieved ${userFollowers.length} followers for:`, profileIdToFetch);
      } catch (followersError) {
        console.error("Error fetching followers:", followersError);
      }

      // 7. Fetch following
      try {
        const followingQuery = query(collection(db, "users", profileIdToFetch, "following"));
        const followingSnap = await getDocs(followingQuery);
        userFollowingData = followingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Retrieved ${userFollowingData.length} following for:`, profileIdToFetch);
      } catch (followingError) {
        console.error("Error fetching following:", followingError);
      }

      // 8. Fetch follow status if not own profile
      if (currentUser && profileIdToFetch !== currentUser.uid) {
        try {
          const followDoc = await getDoc(doc(db, "users", profileIdToFetch, "followers", currentUser.uid));
          setIsFollowingStatus(followDoc.exists());
          if (!followDoc.exists()) {
            const pendingRequestDoc = await getDoc(doc(db, "users", profileIdToFetch, "pendingFollowers", currentUser.uid));
            setIsRequestPending(pendingRequestDoc.exists());
          } else {
            setIsRequestPending(false);
          }
          console.log(`Follow status for ${profileIdToFetch} by ${currentUser.uid}: following=${followDoc.exists()}, pending=${!followDoc.exists() && isRequestPending}`);
        } catch (followStatusError) {
          console.error("Error checking follow/pending status:", followStatusError);
        }
      } else if (profileIdToFetch === currentUser?.uid) {
        setIsFollowingStatus(false);
        setIsRequestPending(false);
      }

      // --- Group the extracted milestones ---
      const finalGroupedMilestones = groupAndSortMilestones(userMilestonesRaw);

      setProfileData(userData);
      setPosts(userPosts);
      setGroupedMilestones(finalGroupedMilestones);
      setWorkouts(userWorkouts);
      setSavedWorkouts(userSavedWorkouts);
      setFollowers(userFollowers);
      setFollowing(userFollowingData);

      console.log("Profile data refresh complete for:", profileIdToFetch);
    } catch (err) {
      console.error("Error in fetchProfileData:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
      setLoadingWorkouts(false);
      console.log("Loading set to false for:", profileIdToFetch);
    }
  }, [profileIdToFetch, currentUser?.uid, isOwnProfile]);

  const followUser = async (targetUserId: string) => {
    if (!currentUser || !currentUser.uid) {
      console.error("Current user not found or not authenticated for follow operation");
      return;
    }
    const currentUserId = currentUser.uid;
    if (currentUserId === targetUserId) {
      console.error("Cannot send follow request to yourself");
      return;
    }
    setFollowActionLoading(true);

    try {
      // Prevent duplicate actions
      if (isFollowingStatus) {
        setFollowActionLoading(false);
        return;
      }
      if (isRequestPending) {
        setFollowActionLoading(false);
        return;
      }

      // Always use the Cloud Function for follow logic
      const result = await followUserFn({ targetUserId });
      const message = result?.data?.message || "";

      if (message.includes("pending approval")) {
        setIsRequestPending(true);
        setIsFollowingStatus(false);
        console.log("Follow request sent to private account:", targetUserId);
      } else {
        setIsFollowingStatus(true);
        setIsRequestPending(false);
        console.log("Successfully followed public account:", targetUserId);
      }
    } catch (error) {
      console.error("Error in follow operation:", error);
    } finally {
      setFollowActionLoading(false);
    }
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!currentUser || !currentUser.uid || followActionLoading) {
      console.error("Current user not found or action in progress for unfollow operation");
      return;
    }
    const currentUserId = currentUser.uid;
    if (currentUserId === targetUserId) {
      console.error("Cannot unfollow yourself");
      return;
    }
    setFollowActionLoading(true);

    const targetUserFollowersRef = doc(db, "users", targetUserId, "followers", currentUserId);
    const currentUserFollowingRef = doc(db, "users", currentUserId, "following", targetUserId);
    const targetUserDocRef = doc(db, "users", targetUserId);
    const currentUserDocRef = doc(db, "users", currentUserId);
    const pendingFollowerRef = doc(db, "users", targetUserId, "pendingFollowers", currentUserId);

    try {
      // Check if a request is pending and delete it if "Unfollow" (or "Cancel Request") is pressed
      const pendingRequestSnap = await getDoc(pendingFollowerRef);
      if (pendingRequestSnap.exists()) {
        // This means the current user had sent a request to targetUserId, and is now cancelling it.
        console.log("Cancelling sent follow request to user:", targetUserId);
        const cancelRequestFunction = httpsCallable(functions, 'cancelSentFollowRequest');
        await cancelRequestFunction({ targetUserId: targetUserId });
        setIsRequestPending(false);
        console.log("Cancelled follow request to user:", targetUserId);
      } else {
        // Public unfollow → call Cloud Function
        await unfollowUserFn({ targetUserId });
        setIsFollowingStatus(false);
        console.log("Successfully unfollowed user:", targetUserId);
      }
    } catch (error) {
      console.error("Error in unfollow/cancel request operation:", error);
    } finally {
      setFollowActionLoading(false);
    }
  };

  // Memoize refreshProfileData as well
  const refreshProfileData = useCallback(async () => {
    console.log("Manual refresh triggered for profile ID:", profileIdToFetch);
    await fetchProfileData();
  }, [fetchProfileData]);

  useEffect(() => {
    console.log("useEffect in useProfileData triggered. profileIdToFetch:", profileIdToFetch);
    if (profileIdToFetch) {
      fetchProfileData();
    } else {
      setLoading(false); 
      console.log("profileIdToFetch is null/undefined in useEffect, not fetching.");
    }
  }, [fetchProfileData]);

  useEffect(() => {
    if (isOwnProfile && contextUserProfile && profileData && contextUserProfile.profileImageUrl !== profileData.profileImageUrl) {
      console.log("Profile image URL mismatch detected in hook, refreshing profile data...");
      fetchProfileData();
    }
  }, [contextUserProfile?.profileImageUrl, isOwnProfile, profileData, fetchProfileData]);

  return {
    loading,
    profileData,
    posts,
    groupedMilestones,
    workouts,
    savedWorkouts,
    loadingWorkouts,
    followers,
    following,
    error,
    refreshProfileData,
    isFollowingStatus,
    isRequestPending,
    followUser,
    unfollowUser,
    followActionLoading,
    viewedProfileId: profileIdToFetch,
  };
}