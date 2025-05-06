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
  const profileId = userId || currentUser?.uid;

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [groupedMilestones, setGroupedMilestones] = useState<GroupedMilestones>({});
  const [workouts, setWorkouts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [error, setError] = useState(null);

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

  // Possibly redundant function, might remove later
  const refreshProfileData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Starting profile data refresh for user:", currentUser?.uid);

      if (!currentUser) {
        console.error("No current user found");
        throw new Error("User not authenticated");
      }

      // Initialize empty data containers for graceful degradation
      let userData = {};
      let userPosts = [];
      let userMilestones = [];
      let userWorkouts = [];
      let userFollowers = [];
      let userFollowing = [];

      // 1. Fetch basic user profile data
      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          userData = userDoc.data();
          console.log("Retrieved basic profile data");
        } else {
          console.error("User document does not exist");
        }
      } catch (profileError) {
        console.error("Error fetching user profile:", profileError);
        // Continue with other data
      }

      // 2. Fetch user posts with proper error handling
      try {
        const postsQuery = query(
          collection(db, "posts"),
          where("authorId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );

        const postSnap = await getDocs(postsQuery);
        userPosts = postSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`Retrieved ${userPosts.length} user posts`);
      } catch (postsError) {
        console.error("Error fetching posts:", postsError);
      }

      // 3. Extract milestones from posts that have isMilestone flag
      try {
        userMilestones = userPosts
          .filter(post => post.isMilestone && post.milestoneDetails)
          .map(post => {
            // Format milestone data for UI
            let milestone: Milestone = { // Explicit type annotation
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
        console.log("User Milestones (raw):", userMilestones);
        console.log(`Extracted ${userMilestones.length} milestones from posts`);
      } catch (milestoneError) {
        console.error("Error processing milestones:", milestoneError);
        // Continue with other data
      }

      // 4. Fetch user workouts
      try {
        const workoutsQuery = query(
          collection(db, "workouts"),
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );

        const workoutSnap = await getDocs(workoutsQuery);
        userWorkouts = workoutSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date || doc.data().createdAt || new Date()
        }));
        console.log(`Retrieved ${userWorkouts.length} workouts`);
      } catch (workoutsError) {
        console.error("Error fetching workouts:", workoutsError);
      }

      // 5. Fetch followers
      try {
        const followersQuery = query(collection(db, "users", currentUser.uid, "followers"));
        const followersSnap = await getDocs(followersQuery);
        userFollowers = followersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`Retrieved ${userFollowers.length} followers`);
      } catch (followersError) {
        console.error("Error fetching followers:", followersError);
      }

      // 6. Fetch following
      try {
        const followingQuery = query(collection(db, "users", currentUser.uid, "following"));
        const followingSnap = await getDocs(followingQuery);
        userFollowing = followingSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log(`Retrieved ${userFollowing.length} following`);
      } catch (followingError) {
        console.error("Error fetching following:", followingError);
        // Continue with other data
      }

      // --- Group the extracted milestones ---
      const finalGroupedMilestones = groupAndSortMilestones(userMilestones);
      console.log("Final Grouped Milestones (from refresh):", finalGroupedMilestones);

      // Update all state variables with fetched data
      setProfileData(userData);
      setPosts(userPosts);
      setGroupedMilestones(finalGroupedMilestones);
      setWorkouts(userWorkouts);
      setFollowers(userFollowers);
      setFollowing(userFollowing);

      console.log("Profile data refresh complete");
    } catch (err) {
      console.error("Error fetching profile data:", err);
      if (err.code) console.error("Firebase error code:", err.code);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // This is the primary function called by useEffect
  const fetchProfileData = async () => {
    if (!profileId) {
        setLoading(false);
        setError(new Error("No profile ID provided."));
        return;
    }
    console.log(`Fetching profile data for ID: ${profileId}`);
    setLoading(true);
    setError(null); // Reset error on new fetch

    try {
      let userData = null;
      let userPosts = [];
      let userMilestonesRaw = []; // Temporary array for raw milestones
      let userWorkouts = [];
      let userFollowers = [];
      let userFollowing = [];

      // 1. Fetch user profile
      try {
        const userDoc = await getDoc(doc(db, "users", profileId));
        if (userDoc.exists()) {
          userData = userDoc.data();
          console.log("User profile data retrieved");
        } else {
          console.log("User profile not found");
          throw new Error("User profile not found.");
        }
      } catch (profileError) {
        console.error("Error fetching user profile:", profileError);
        setError(profileError);
        setLoading(false);
        return; // Stop if profile fetch fails
      }

      // 2. Fetch user posts
      try {
        const postsQuery = query(
          collection(db, "posts"),
          where("authorId", "==", profileId),
          orderBy("createdAt", "desc")
        );
        const postsSnapshot = await getDocs(postsQuery);
        userPosts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Retrieved ${userPosts.length} user posts`);
      } catch (postsError) {
        console.error("Error fetching posts:", postsError);
        // Continue, but log the error
      }

      // 3. Extract and format milestones from posts
      try {
        userMilestonesRaw = userPosts
          .filter(post => post.isMilestone && post.milestoneDetails)
          .map(post => {
            let milestone: Milestone = {
              id: post.id, // Use post ID as milestone ID for consistency
              postId: post.id,
              date: post.createdAt, // Use post creation date
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
            // Add more types if needed

            return milestone;
          });
        console.log(`Extracted ${userMilestonesRaw.length} raw milestones from posts`);
      } catch (milestoneError) {
        console.error("Error processing milestones:", milestoneError);
        // Continue
      }

      // 4. Fetch user workouts
      try {
        const workoutsQuery = query(
          collection(db, "workouts"),
          where("creatorId", "==", profileId), // Ensure field name is correct ('creatorId' or 'userId')
          orderBy("createdAt", "desc")
        );
        const workoutsSnapshot = await getDocs(workoutsQuery);
        userWorkouts = workoutsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Retrieved ${userWorkouts.length} workouts`);
      } catch (workoutsError) {
        console.error("Error fetching workouts:", workoutsError);
        // Continue
      }

      // 5. Fetch followers
      try {
        const followersQuery = query(collection(db, "users", profileId, "followers"));
        const followersSnap = await getDocs(followersQuery);
        userFollowers = followersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Retrieved ${userFollowers.length} followers`);
      } catch (followersError) {
        console.error("Error fetching followers:", followersError);
        // Continue
      }

      // 6. Fetch following
      try {
        const followingQuery = query(collection(db, "users", profileId, "following"));
        const followingSnap = await getDocs(followingQuery);
        userFollowing = followingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Retrieved ${userFollowing.length} following`);
      } catch (followingError) {
        console.error("Error fetching following:", followingError);
        // Continue
      }

      // --- Group the extracted milestones ---
      const finalGroupedMilestones = groupAndSortMilestones(userMilestonesRaw);
      console.log("Final Grouped Milestones:", finalGroupedMilestones);

      // Update all state variables together AFTER all data is fetched/processed
      setProfileData(userData);
      setPosts(userPosts);
      setGroupedMilestones(finalGroupedMilestones); // Set the grouped milestones
      setWorkouts(userWorkouts);
      setFollowers(userFollowers);
      setFollowing(userFollowing);

      console.log("Profile data refresh complete");

    } catch (err) {
      console.error("Error in fetchProfileData:", err);
      setError(err);
    } finally {
      setLoading(false);
      console.log("Loading set to false");
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [profileId]); // Re-fetch if profileId changes

  return {
    loading,
    profileData,
    posts,
    groupedMilestones,
    workouts,
    followers,
    following,
    error,
    refreshProfileData
  };
}