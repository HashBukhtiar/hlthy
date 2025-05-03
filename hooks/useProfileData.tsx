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
    error 
  };
}