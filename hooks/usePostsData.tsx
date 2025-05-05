import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, deleteDoc, doc, getDoc, addDoc, updateDoc, increment, where } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from '@/firebaseConfig';
import { useAuth } from '@/context/AuthContext';

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
          try {
            const reactionRef = collection(db, "posts", doc.id, "reactions");
            const reactionQuery = query(reactionRef, where("__name__", "==", currentUser.uid));
            const reactionSnapshot = await getDocs(reactionQuery);

            post.isLiked = !reactionSnapshot.empty;
          } catch (err) {
            console.log("Error checking reaction status:", err);
            post.isLiked = false;
          }
        }
        
        postsData.push(post);
      }
      
      setPosts(postsData);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };


  const uploadImage = async (imageUri: string): Promise<string> => {
    try {
      const filename = `posts/${currentUser.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      // Fetch the image and convert to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Upload image
      await uploadBytes(storageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
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
  const addPost = async (postData) => {
    if (!currentUser || !userProfile) {
      throw new Error("User not authenticated");
    }
    
    try {
      // Validate required fields
      if (!currentUser.uid || !userProfile.username) {
        throw new Error("Missing user information for post");
      }
      
      // Create post document with validated data
      const postRef = await addDoc(collection(db, "posts"), {
        authorId: currentUser.uid,
        authorUsername: userProfile.username || "Unknown user",
        authorProfileImageUrl: userProfile.profileImageUrl || "",
        caption: postData.caption || "",
        imageUrl: postData.imageUri ? await uploadImage(postData.imageUri) : "",
        createdAt: new Date(),
        isMilestone: Boolean(postData.isMilestone),
        milestoneDetails: postData.milestoneDetails || null,
        reactionCount: 0,
        commentCount: 0,
        visibility: postData.visibility || "public",
        workoutId: postData.workoutId || null
      });
      
      console.log("Created post with ID:", postRef.id);
      return postRef.id;
    } catch (error) {
      console.error("Error creating post:", error);
      throw error;
    }
  };

  const deletePost = async (postId: string) => {
    if (!currentUser) throw new Error("User not authenticated");
    
    try {
      // Get the post to check ownership
      const postRef = doc(db, "posts", postId);
      const postSnap = await getDoc(postRef);
      
      if (!postSnap.exists()) {
        throw new Error("Post not found");
      }
      
      const postData = postSnap.data();
      
      // Security check: Ensure user owns the post
      if (postData.authorId !== currentUser.uid) {
        throw new Error("Not authorized to delete this post");
      }
      
      // 1. Delete post image from storage if it exists
      if (postData.imageUrl) {
        const imageRef = ref(storage, postData.imageUrl);
        await deleteObject(imageRef).catch(err => console.log("Image may not exist:", err));
      }
      
      // 2. Delete all comments in the subcollection
      const commentsRef = collection(db, "posts", postId, "comments");
      const commentDocs = await getDocs(commentsRef);
      
      const deleteCommentPromises = commentDocs.docs.map(commentDoc => 
        deleteDoc(doc(db, "posts", postId, "comments", commentDoc.id))
      );
      await Promise.all(deleteCommentPromises);
      
      // 3. Delete all reactions in the subcollection
      const reactionsRef = collection(db, "posts", postId, "reactions");
      const reactionDocs = await getDocs(reactionsRef);
      
      const deleteReactionPromises = reactionDocs.docs.map(reactionDoc => 
        deleteDoc(doc(db, "posts", postId, "reactions", reactionDoc.id))
      );
      await Promise.all(deleteReactionPromises);
      
      // 4. Finally delete the post document itself
      await deleteDoc(postRef);
      
      return true;
    } catch (error) {
      console.error("Error deleting post:", error);
      throw error;
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
    addComment,
    deletePost
  };
}