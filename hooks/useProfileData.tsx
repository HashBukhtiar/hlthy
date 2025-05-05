import { useState, useEffect } from 'react';
import { db } from '@/firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

export function useProfileData(userId = null) {
  const { currentUser } = useAuth();
  const profileId = userId || currentUser?.uid;
  
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [error, setError] = useState(null);

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
        // Continue with other data
      }
      
      // 3. Extract milestones from posts that have isMilestone flag
      try {
        userMilestones = userPosts
          .filter(post => post.isMilestone && post.milestoneDetails)
          .map(post => {
            // Format milestone data for UI
            let milestone = {
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
          // Ensure each workout has a date field
          date: doc.data().date || doc.data().createdAt || new Date()
        }));
        console.log(`Retrieved ${userWorkouts.length} workouts`);
      } catch (workoutsError) {
        console.error("Error fetching workouts:", workoutsError);
        // Continue with other data
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
        // Continue with other data
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
      
      // Update all state variables with fetched data
      setProfileData(userData);
      setPosts(userPosts); 
      setMilestones(userMilestones);
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

  useEffect(() => {
    if (!profileId) return;
    
    async function fetchProfileData() {
      try {
        setLoading(true);
        
        // Fetch user profile
        const userDoc = await getDoc(doc(db, "users", profileId));
        if (userDoc.exists()) {
          setProfileData(userDoc.data());
        }
        
        // Fetch posts
        const postsQuery = query(
          collection(db, "posts"), 
          where("authorId", "==", profileId),
          orderBy("createdAt", "desc")
        );
        const postsSnapshot = await getDocs(postsQuery);
        setPosts(postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        // Fetch milestones (posts with isMilestone = true)
        const milestonesQuery = query(
          collection(db, "posts"),
          where("authorId", "==", profileId),
          where("isMilestone", "==", true),
          orderBy("createdAt", "desc")
        );
        const milestonesSnapshot = await getDocs(milestonesQuery);
        setMilestones(milestonesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        // Fetch workouts
        const workoutsQuery = query(
          collection(db, "workouts"),
          where("creatorId", "==", profileId),
          orderBy("createdAt", "desc")
        );
        const workoutsSnapshot = await getDocs(workoutsQuery);
        setWorkouts(workoutsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        // Fetch followers
        const followersSnapshot = await getDocs(collection(db, "users", profileId, "followers"));
        setFollowers(followersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        // Fetch following
        const followingSnapshot = await getDocs(collection(db, "users", profileId, "following"));
        setFollowing(followingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
      } catch (error) {
        console.error("Error fetching profile data:", error);
        setError(error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfileData();
  }, [profileId]);
  
  return { 
    loading, 
    profileData, 
    posts, 
    milestones, 
    workouts, 
    followers, 
    following, 
    error,
    refreshProfileData
  };
}