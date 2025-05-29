import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, getCountFromServer, doc, getDoc, increment, where, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, app } from '@/firebaseConfig';
import { useAuth } from '@/context/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface Milestone {
  id: string;
  postId: string;
  exercise?: string;
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
}

export function useProfileData(userId = null) {
  const { currentUser } = useAuth();
  const profileIdToFetch = userId || currentUser?.uid;
  const functions = getFunctions(app, 'northamerica-northeast2');

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any | null>(null);
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

  // This is the primary function called by useEffect
  const fetchProfileData = async () => {
    if (!profileIdToFetch) {
      setLoading(false);
      setError(new Error("No profile ID available to fetch data."));
      console.log("No profileIdToFetch, returning early from fetchProfileData");
      return;
    }
    console.log(`Fetching profile data for ID (fetchProfileData): ${profileIdToFetch}`);
    setLoading(true);
    setError(null);

    try {
      let userData: any | null = null; // Use specific type
      let userPosts: any[] = [];
      let userMilestonesRaw: Milestone[] = [];
      let userWorkouts: any[] = [];
      let userFollowers: any[] = [];
      let userFollowingData: any[] = []; // Renamed to avoid conflict with state

      // 1. Fetch user profile
      try {
        const userDoc = await getDoc(doc(db, "users", profileIdToFetch));
        if (userDoc.exists()) {
          userData = { id: userDoc.id, ...userDoc.data() }; // Include ID in profileData
          console.log("User profile data retrieved for:", profileIdToFetch, userData);
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
        userPosts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
              exercise: '',
              reps: 0,
              weight: ''
            };

            if (post.milestoneDetails.type === 'PR') {
              milestone.exercise = post.milestoneDetails.exercise || 'Unknown Exercise';
              milestone.reps = post.milestoneDetails.reps || 0;
              milestone.weight = `${post.milestoneDetails.value || 0} ${post.milestoneDetails.weightUnit || ''}`;
            } else if (post.milestoneDetails.type === 'weightLoss' || post.milestoneDetails.type === 'weightGain') {
              milestone.exercise = post.milestoneDetails.type === 'weightLoss' ? 'Weight Loss' : 'Weight Gain';
              milestone.weight = `${post.milestoneDetails.newWeight || 0} ${post.milestoneDetails.newWeightUnit || ''}`;
            }
            return milestone;
          });
        console.log(`Extracted ${userMilestonesRaw.length} raw milestones from posts for:`, profileIdToFetch);
      } catch (milestoneError) {
        console.error("Error processing milestones:", milestoneError);
      }

      // 4. Fetch user workouts
      try {
        const workoutsQuery = query(
          collection(db, "workouts"),
          // Ensure this field name 'creatorId' matches your Firestore structure for workouts
          where("creatorId", "==", profileIdToFetch), 
          orderBy("createdAt", "desc")
        );
        const workoutsSnapshot = await getDocs(workoutsQuery);
        userWorkouts = workoutsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Retrieved ${userWorkouts.length} workouts for:`, profileIdToFetch);
      } catch (workoutsError) {
        console.error("Error fetching workouts:", workoutsError);
      }

      // 5. Fetch followers
      try {
        const followersQuery = query(collection(db, "users", profileIdToFetch, "followers"));
        const followersSnap = await getDocs(followersQuery);
        // The documents in this subcollection represent the users who are followers.
        // Their IDs are the UIDs of the followers.
        userFollowers = followersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })); // doc.data() might be empty or contain timestamp
        console.log(`Retrieved ${userFollowers.length} followers for:`, profileIdToFetch);
      } catch (followersError) {
        console.error("Error fetching followers:", followersError);
      }

      // 6. Fetch following
      try {
        const followingQuery = query(collection(db, "users", profileIdToFetch, "following"));
        const followingSnap = await getDocs(followingQuery);
        // The documents in this subcollection represent the users whom profileIdToFetch is following.
        // Their IDs are the UIDs of the users being followed.
        userFollowingData = followingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })); // doc.data() might be empty or contain timestamp
        console.log(`Retrieved ${userFollowingData.length} following for:`, profileIdToFetch);
      } catch (followingError) {
        console.error("Error fetching following:", followingError);
      }

      // Fetch follow status if not own profile
      if (currentUser && profileIdToFetch !== currentUser.uid) {
        try {
          const followDoc = await getDoc(doc(db, "users", profileIdToFetch, "followers", currentUser.uid));
          setIsFollowingStatus(followDoc.exists());
          if (!followDoc.exists()) { // Only check for pending if not already following
            const pendingRequestDoc = await getDoc(doc(db, "users", profileIdToFetch, "pendingFollowers", currentUser.uid));
            setIsRequestPending(pendingRequestDoc.exists());
          } else {
            setIsRequestPending(false); // Not pending if already following
          }
          console.log(`Follow status for ${profileIdToFetch} by ${currentUser.uid}: ${followDoc.exists()}, Pending: ${isRequestPending}`);
        } catch (followStatusError) {
          console.error("Error checking follow/pending status:", followStatusError);
        }
      } else if (profileIdToFetch === currentUser?.uid) {
        setIsFollowingStatus(false);
        setIsRequestPending(false);
      }

      try {
        const followingQuery = query(collection(db, "users", profileIdToFetch, "following"));
        const followingSnap = await getDocs(followingQuery);
        userFollowingData = followingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Retrieved ${userFollowingData.length} following for:`, profileIdToFetch);
      } catch (followingError) {
        console.error("Error fetching following:", followingError);
      }
      
      // Fetch follow status if not own profile and currentUser is available
      if (currentUser && profileIdToFetch !== currentUser.uid) {
        try {
          const followDoc = await getDoc(doc(db, "users", profileIdToFetch, "followers", currentUser.uid));
          setIsFollowingStatus(followDoc.exists());
          console.log(`Follow status for ${profileIdToFetch} by ${currentUser.uid}: ${followDoc.exists()}`);
        } catch (followStatusError) {
          console.error("Error checking follow status:", followStatusError);
        }
      } else if (profileIdToFetch === currentUser?.uid) {
        setIsFollowingStatus(false);
      }

      // --- Group the extracted milestones ---
      const finalGroupedMilestones = groupAndSortMilestones(userMilestonesRaw);
      console.log("Final Grouped Milestones for:", profileIdToFetch, finalGroupedMilestones);

      setProfileData(userData);
      setPosts(userPosts);
      setGroupedMilestones(finalGroupedMilestones);
      setWorkouts(userWorkouts);
      setFollowers(userFollowers);
      setFollowing(userFollowingData);

      console.log("Profile data refresh complete for:", profileIdToFetch);

    } catch (err) {
      console.error("Error in fetchProfileData:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
      console.log("Loading set to false for:", profileIdToFetch);
    }
  };

  const followUser = async (targetUserId: string) => {
    if (!currentUser || !currentUser.uid || followActionLoading) {
      console.error("Current user not found or action in progress for follow operation");
      return;
    }
    const currentUserId = currentUser.uid;
    if (currentUserId === targetUserId) {
      console.error("Cannot send follow request to yourself");
      return;
    }
    setFollowActionLoading(true);

    // Path for the pending follow request
    const pendingFollowerRef = doc(db, "users", targetUserId, "pendingFollowers", currentUserId);

    try {
      // Check if already following or request already pending to prevent duplicate writes
      const isAlreadyFollowing = isFollowingStatus; // Use existing state
      const isAlreadyPending = isRequestPending; // Use new state

      if (isAlreadyFollowing) {
        console.log("Already following this user.");
        setFollowActionLoading(false);
        return;
      }
      if (isAlreadyPending) {
        console.log("Follow request already pending for this user.");
        setFollowActionLoading(false);
        return;
      }

      await setDoc(pendingFollowerRef, {
        requestedAt: serverTimestamp(),
        // You can add other relevant info here if needed by the target user,
        // like currentUserId's username, profileImageUrl, though the cloud function
        // for activity creation already fetches this.
      });

      setIsRequestPending(true); // Update UI to show "Requested"
      console.log("Follow request sent to user:", targetUserId);
    } catch (error) {
      console.error("Error sending follow request:", error);
      // Potentially revert setIsRequestPending(false) if needed, or show error
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
    
    // Also consider deleting a pending request if unfollow is hit while request is pending
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
        // If not pending, proceed with normal unfollow transaction
        await runTransaction(db, async (transaction) => {
          const targetUserSnap = await transaction.get(targetUserDocRef);
          const currentUserSnap = await transaction.get(currentUserDocRef);

          if (!targetUserSnap.exists() || !currentUserSnap.exists()) {
            // If user docs don't exist, but follow relationship docs might, still try to delete them.
            // This case should ideally not happen if data is consistent.
            console.warn("User document not found for unfollow operation, but attempting to clean up follow docs.");
          }
          
          // Ensure followerCount and followingCount do not go below 0
          const currentFollowerCount = targetUserSnap.data()?.followerCount || 0;
          const currentFollowingCount = currentUserSnap.data()?.followingCount || 0;

          transaction.delete(targetUserFollowersRef);
          transaction.delete(currentUserFollowingRef);
          if (targetUserSnap.exists()) {
            transaction.update(targetUserDocRef, { followerCount: increment(currentFollowerCount > 0 ? -1 : 0) });
          }
          if (currentUserSnap.exists()) {
            transaction.update(currentUserDocRef, { followingCount: increment(currentFollowingCount > 0 ? -1 : 0) });
          }
        });
        setIsFollowingStatus(false);
        setProfileData(prev => prev ? { ...prev, followerCount: Math.max(0, (prev.followerCount || 0) - 1) } : null);
        setFollowers(prev => prev.filter(follower => follower.id !== currentUserId));
        console.log("Successfully unfollowed user:", targetUserId);
      }
    } catch (error) {
      console.error("Error in unfollow/cancel request operation:", error);
    } finally {
      setFollowActionLoading(false);
    }
  };

  const refreshProfileData = async () => {
    console.log("Manual refresh triggered for profile ID:", profileIdToFetch);
    await fetchProfileData();
  };

  useEffect(() => {
    console.log("useEffect in useProfileData triggered. profileIdToFetch:", profileIdToFetch);
    if (profileIdToFetch) { // Only fetch if profileIdToFetch is available
      fetchProfileData();
    } else {
      // Handle case where profileIdToFetch is not yet available (e.g., currentUser not loaded)
      setLoading(false); 
      console.log("profileIdToFetch is null/undefined in useEffect, not fetching.");
    }
  }, [profileIdToFetch, currentUser?.uid]);

  return {
    loading,
    profileData,
    posts,
    groupedMilestones,
    workouts,
    followers,
    following,
    error,
    refreshProfileData,
    isFollowingStatus,
    isRequestPending,
    followUser, 
    unfollowUser,
    followActionLoading,
    viewedProfileId: profileIdToFetch
  };
}