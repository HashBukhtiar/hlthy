import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, getDoc, addDoc, updateDoc, increment, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebaseConfig';
import { useAuth } from '@/context/AuthContext';

// Post interface matching DBDESIGN.md
export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  caption: string;
  imageUrl: string;
  createdAt: any; // Firestore timestamp
  exerciseTags?: string[];
  isMilestone: boolean;
  milestoneDetails?: {
    type: string;
    exercise?: string;
    value?: string;
    reps?: number;
    weightUnit?: string;
    newWeight?: string;
    newWeightUnit?: string;
  };
  reactionCount: number;
  commentCount: number;
  visibility: 'public' | 'followers';
  // UI state properties
  isLiked?: boolean;
  isBookmarked?: boolean;
}

export interface Comment {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  text: string;
  createdAt: any;
  likes?: number;
  liked?: boolean;
}

export function usePostsData() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { currentUser, userProfile } = useAuth();

  // Fetch all public posts
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const postsRef = collection(db, "posts");
      const q = query(postsRef, where("visibility", "==", "public"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const postsData: Post[] = [];
      
      for (const doc of querySnapshot.docs) {
        const post = { id: doc.id, ...doc.data() } as Post;
        
        // Check if current user has liked this post
        if (currentUser) {
          const reactionRef = doc.ref.collection('reactions').doc(currentUser.uid);
          const reactionDoc = await getDoc(reactionRef);
          post.isLiked = reactionDoc.exists();
        }
        
        postsData.push(post);
      }
      
      setPosts(postsData);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  // Get a specific post by ID
  const getPostById = async (postId: string) => {
    try {
      console.log("Fetching post with ID:", postId);
      const postRef = doc(db, "posts", postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        console.log("Post does not exist in Firestore");
        throw new Error("Post not found");
      }
      
      console.log("Post found:", postDoc.data());
      const post = { id: postDoc.id, ...postDoc.data() } as Post;
      
      // Check if user has liked this post
      if (currentUser) {
        try {
          const reactionRef = doc(db, "posts", doc.id, "reactions", currentUser.uid);
          const reactionDoc = await getDoc(reactionRef);
          post.isLiked = reactionDoc.exists();
        } catch (err) {
          console.log("Error checking reaction status:", err);
          post.isLiked = false;
        }
      }
      
      return post;
    } catch (err) {
      console.error("Error getting post:", err);
      throw err;
    }
  };

  // Get comments for a post
  const getPostComments = async (postId: string) => {
    try {
      const commentsRef = collection(db, "posts", postId, "comments");
      const q = query(commentsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const comments: Comment[] = [];
      
      querySnapshot.forEach((doc) => {
        comments.push({ id: doc.id, ...doc.data() } as Comment);
      });
      
      return comments;
    } catch (err) {
      console.error("Error fetching comments:", err);
      throw err;
    }
  };

  // Add a new post
  const addPost = async (postData: {
    caption: string,
    imageUri: string | null,
    isMilestone: boolean,
    milestoneDetails?: any,
    visibility: 'public' | 'followers',
    workoutId?: string
  }) => {
    if (!currentUser || !userProfile) {
      throw new Error("User not authenticated");
    }
    
    try {
      // 1. Upload image to Firebase Storage (if provided)
      let imageUrl = "";
      
      if (postData.imageUri) {
        const storage = getStorage();
        const filename = `posts/${currentUser.uid}/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        
        // Fetch the image and convert to blob
        const response = await fetch(postData.imageUri);
        const blob = await response.blob();
        
        // Upload image
        await uploadBytes(storageRef, blob);
        imageUrl = await getDownloadURL(storageRef);
      }
      
      // 2. Create post document in Firestore
      const postRef = await addDoc(collection(db, "posts"), {
        authorId: currentUser.uid,
        authorUsername: userProfile.username,
        authorProfileImageUrl: userProfile.profileImageUrl || "",
        caption: postData.caption,
        imageUrl: imageUrl,
        createdAt: new Date(),
        isMilestone: postData.isMilestone,
        milestoneDetails: postData.isMilestone ? postData.milestoneDetails : null,
        reactionCount: 0,
        commentCount: 0,
        visibility: postData.visibility,
        workoutId: postData.workoutId || null
      });
      
      // 3. Update user's post count
      await updateDoc(doc(db, "users", currentUser.uid), {
        "stats.postCount": increment(1)
      });
      
      // 4. Update user's milestone count if applicable
      if (postData.isMilestone) {
        await updateDoc(doc(db, "users", currentUser.uid), {
          "stats.milestoneCount": increment(1)
        });
      }
      
      console.log("Created post with ID:", postRef.id);

      return postRef.id;
    } catch (err) {
      console.error("Error creating post:", err);
      throw err;
    }
  };

  // Add like to a post
  const likePost = async (postId: string) => {
    if (!currentUser) {
      throw new Error("User not authenticated");
    }
    
    try {
      // Add reaction document
      const reactionRef = doc(db, "posts", postId, "reactions", currentUser.uid);
      await setDoc(reactionRef, {
        reactionType: "like",
        reactedAt: new Date()
      });
      
      // Increment reaction count
      await updateDoc(doc(db, "posts", postId), {
        reactionCount: increment(1)
      });
      
      // Update local state
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, isLiked: true, reactionCount: post.reactionCount + 1 } 
          : post
      ));
    } catch (err) {
      console.error("Error liking post:", err);
      throw err;
    }
  };

  // Remove like from a post
  const unlikePost = async (postId: string) => {
    if (!currentUser) {
      throw new Error("User not authenticated");
    }
    
    try {
      // Remove reaction document
      const reactionRef = doc(db, "posts", postId, "reactions", currentUser.uid);
      await deleteDoc(reactionRef);
      
      // Decrement reaction count
      await updateDoc(doc(db, "posts", postId), {
        reactionCount: increment(-1)
      });
      
      // Update local state
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, isLiked: false, reactionCount: post.reactionCount - 1 } 
          : post
      ));
    } catch (err) {
      console.error("Error unliking post:", err);
      throw err;
    }
  };

  // Add comment to a post
  const addComment = async (postId: string, text: string) => {
    if (!currentUser || !userProfile) {
      throw new Error("User not authenticated");
    }
    
    try {
      // Add comment document
      const commentRef = await addDoc(collection(db, "posts", postId, "comments"), {
        authorId: currentUser.uid,
        authorUsername: userProfile.username,
        authorProfileImageUrl: userProfile.profileImageUrl || "",
        text: text,
        createdAt: new Date()
      });
      
      // Increment comment count
      await updateDoc(doc(db, "posts", postId), {
        commentCount: increment(1)
      });
      
      // Return the new comment
      return {
        id: commentRef.id,
        authorId: currentUser.uid,
        authorUsername: userProfile.username,
        authorProfileImageUrl: userProfile.profileImageUrl || "",
        text: text,
        createdAt: new Date(),
        likes: 0,
        liked: false
      };
    } catch (err) {
      console.error("Error adding comment:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [currentUser?.uid]);

  return {
    posts,
    loading,
    error,
    fetchPosts,
    getPostById,
    getPostComments,
    addPost,
    likePost,
    unlikePost,
    addComment
  };
}