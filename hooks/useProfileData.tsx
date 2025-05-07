import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc, getDoc, addDoc, updateDoc, increment, where, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from '@/firebaseConfig';
import { useAuth } from '@/context/AuthContext';

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

export function useProfileData(userId = null) {
  const { currentUser } = useAuth();
  const profileIdToFetch = userId || currentUser?.uid;

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [groupedMilestones, setGroupedMilestones] = useState<GroupedMilestones>({});
  const [workouts, setWorkouts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [error, setError] = useState(null);
  // IMPLEMENT THIS LATER
  const [isFollowingStatus, setIsFollowingStatus] = useState(false);

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
        } catch (followStatusError) {
          console.error("Error checking follow status:", followStatusError);
        }
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
  }, [profileIdToFetch]); // Re-fetch if profileIdToFetch changes

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
    // isFollowingStatus, // Add later
    // followUser, // Add later
    // unfollowUser, // Add later
    viewedProfileId: profileIdToFetch
  };
}