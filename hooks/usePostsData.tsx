import { useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  writeBatch,
  deleteDoc,
  orderBy,
  limit,
  startAfter,
  increment,
  runTransaction,
  Timestamp
} from 'firebase/firestore';
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
  workoutId?: string; 
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

export interface ActivityItem {
  id: string;
  type: 'follow_request' | 'follow_accepted' | 'new_follower' | 'post_like' | 'post_comment' | 'workout_save' | 'milestone_achieved';
  fromUserId: string;
  fromUsername: string;
  fromProfileImageUrl?: string;
  postId?: string;
  postImageUrl?: string;
  postCaption?: string;
  commentId?: string;
  commentText?: string;
  status?: 'pending' | 'accepted' | 'ignored' | 'read' | 'unread'; 
  createdAt: Timestamp; 
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
      
      for (const docSnapshot of querySnapshot.docs) {
        const post = { id: docSnapshot.id, ...docSnapshot.data() } as Post;
        
        if (currentUser) {
          try {
            // Check if current user has liked this post by checking the 'likers' subcollection
            const likeRef = doc(db, "posts", docSnapshot.id, "likers", currentUser.uid);
            const likeDoc = await getDoc(likeRef);
            post.isLiked = likeDoc.exists();
          } catch (err) {
            console.log("Error checking like status in fetchPosts:", err);
            post.isLiked = false;
          }
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

      if (currentUser) {
        try {
          // Check if current user has liked this post by checking the 'likers' subcollection
          const likeRef = doc(db, "posts", postId, "likers", currentUser.uid);
          const likeSnap = await getDoc(likeRef);
          post.isLiked = likeSnap.exists();
        } catch (err) {
          console.log("Error checking like status in getPostById:", err);
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
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    const postRef = doc(db, "posts", postId);
    const likerRef = doc(db, "posts", postId, "likers", currentUser.uid); 

    try {
      const postDoc = await getDoc(postRef);
      if (!postDoc.exists()) throw new Error("Post not found");
      const postData = postDoc.data() as Post;

      await runTransaction(db, async (transaction) => {
        transaction.set(likerRef, {
          userId: currentUser.uid,
          username: userProfile.username,
          profileImageUrl: userProfile.profileImageUrl || null,
          likedAt: serverTimestamp(),
        });

        transaction.update(postRef, {
          reactionCount: increment(1),
        });

        if (postData.authorId !== currentUser.uid) {
          const authorActivityColRef = collection(db, 'activity', postData.authorId, 'userActivity');
          const newActivityRef = doc(authorActivityColRef); 
          transaction.set(newActivityRef, {
            type: 'post_like',
            fromUserId: currentUser.uid,
            fromUsername: userProfile.username,
            fromProfileImageUrl: userProfile.profileImageUrl || currentUser.photoURL || null,
            postId: postId,
            postImageUrl: postData.imageUrl?.startsWith("http") ? postData.imageUrl : undefined,
            postCaption: postData.caption ? postData.caption.substring(0, 50) + (postData.caption.length > 50 ? "..." : "") : undefined,
            createdAt: serverTimestamp(),
            status: 'unread', 
          } as Omit<ActivityItem, 'id'>);
        }
      });
      console.log(`User ${currentUser.uid} liked post ${postId}`);
    } catch (error) {
      console.error("Error liking post: ", error);
      throw error;
    }
  };

  // Remove like from a post
  const unlikePost = async (postId: string) => {
    if (!currentUser) throw new Error("User not authenticated");
    const postRef = doc(db, "posts", postId);
    // Use 'likers' subcollection
    const likerRef = doc(db, "posts", postId, "likers", currentUser.uid);

    try {
      const postDoc = await getDoc(postRef);
      if (!postDoc.exists()) throw new Error("Post not found");
      const postData = postDoc.data() as Post;

      await runTransaction(db, async (transaction) => {
        // Delete the document from the 'likers' subcollection
        transaction.delete(likerRef);

        // Decrement reactionCount and remove from likedBy array on the main post document
        transaction.update(postRef, {
          reactionCount: increment(-1),
          // likedBy: arrayRemove(currentUser.uid) // Keep if you use this
        });

        // Note: Deleting the specific activity item requires querying for it first.
        // This can be complex within a transaction due to read-after-write limitations
        // or query constraints. For simplicity, we'll do this in a separate batch after the transaction.
      });

      // Delete the corresponding activity item for the post author
      if (postData.authorId !== currentUser.uid) {
        const authorActivityColRef = collection(db, 'activity', postData.authorId, 'userActivity');
        const q = query(
          authorActivityColRef,
          where('type', '==', 'post_like'),
          where('postId', '==', postId),
          where('actorId', '==', currentUser.uid),
          limit(1) // Assuming only one such activity item per like
        );
        
        const activitySnapshot = await getDocs(q);
        if (!activitySnapshot.empty) {
          const batch = writeBatch(db);
          activitySnapshot.forEach(activityDoc => {
            batch.delete(activityDoc.ref);
          });
          await batch.commit();
          console.log(`Deleted like activity for post ${postId} by user ${currentUser.uid}`);
        }
      }
      console.log(`User ${currentUser.uid} unliked post ${postId}`);
    } catch (error) {
      console.error("Error unliking post: ", error);
      throw error;
    }
  };

  // Add comment to a post
  const addComment = async (postId: string, text: string): Promise<Comment> => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    if (!text.trim()) throw new Error("Comment text cannot be empty");

    const postRef = doc(db, "posts", postId);
    const commentsCollectionRef = collection(db, "posts", postId, "comments");

    try {
      const postDoc = await getDoc(postRef);
      if (!postDoc.exists()) throw new Error("Post not found");
      const postData = postDoc.data() as Post;

      const newCommentRef = doc(commentsCollectionRef);

      const newCommentData: Omit<Comment, 'id' | 'likedBy'> = {
        text: text.trim(),
        authorId: currentUser.uid,
        authorUsername: userProfile?.username || currentUser.displayName || "Anonymous",
        authorProfileImageUrl: userProfile?.profileImageUrl || currentUser.photoURL,
        createdAt: serverTimestamp() as Timestamp,
        likes: 0,
        // likedBy: [], // Initialize if needed, or handle separately
      };

      await runTransaction(db, async (transaction) => {
        transaction.set(newCommentRef, newCommentData);
        transaction.update(postRef, {
          commentCount: increment(1)
        });

        if (postData.authorId !== currentUser.uid) {
          const authorActivityColRef = collection(db, 'activity', postData.authorId, 'userActivity');
          const newActivityRef = doc(authorActivityColRef);
          transaction.set(newActivityRef, {
            type: 'post_comment',
            fromUserId: currentUser.uid,
            fromUsername: userProfile?.username || currentUser.displayName || "Someone",
            fromProfileImageUrl: userProfile?.profileImageUrl || currentUser.photoURL,
            postId: postId,
            postImageUrl: postData.imageUrl?.startsWith("http") ? postData.imageUrl : undefined,
            postCaption: postData.caption ? postData.caption.substring(0, 50) + (postData.caption.length > 50 ? "..." : "") : undefined,
            commentId: newCommentRef.id,
            commentText: text.trim().substring(0, 50) + (text.trim().length > 50 ? "..." : ""),
            createdAt: serverTimestamp(),
            status: 'unread',
          } as Omit<ActivityItem, 'id'>);
        }
      });
      
      // For immediate UI update, create a client-side timestamp
      const clientTimestamp = Timestamp.now();
      return { 
        id: newCommentRef.id, 
        ...newCommentData, 
        createdAt: clientTimestamp, 
        // likedBy: [] // Ensure all fields of Comment are returned
      } as Comment;

    } catch (error) {
      console.error("Error adding comment: ", error);
      throw error;
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
        fetchPosts();
    } else {
        setPosts([]);
        setLoading(false);
    }
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