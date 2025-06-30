import { useState, useEffect } from 'react';
import {
  doc,
  getDoc,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  writeBatch,
  deleteDoc,
  orderBy,
  limit,
  increment,
  runTransaction,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { app, db, storage } from '@/firebaseConfig';
import { useAuth } from '@/context/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  caption: string;
  imageUrl: string;
  createdAt: Timestamp;
  exerciseTags?: string[];
  isMilestone: boolean;
  milestoneDetails?: {
    type: string;
    exerciseName?: string;
    exerciseId?: string;
    value?: number | string;
    reps?: number;
    duration?: number;
    level?: string;
    newWeight?: number | string;
    previousWeight?: number | string;
    weightUnit?: string;
    achievedAt?: Timestamp;
    previousValue?: number | string;
    improvementPercentage?: number;
    totalLoss?: number;
    totalGain?: number;
  };
  workoutId?: string;
  reactionCount: number;
  commentCount: number;
  visibility: 'public' | 'followers';
  isLiked?: boolean;
  isBookmarked?: boolean;
}

interface ClientMilestoneDetails {
  type: 'PR' | 'weightLoss' | 'weightGain';
  exerciseName?: string;
  exerciseId?: string;
  value?: number | string | null;
  reps?: number | null;
  duration?: number | null;
  level?: string | null;
  newWeight?: number | string | null;
  previousWeight?: number | string | null;
  weightUnit?: string | null;
  achievedAt?: string | null;
}

interface NewPostData {
  caption?: string;
  imageUri?: string;
  isMilestone: boolean;
  milestoneDetails?: ClientMilestoneDetails;
  visibility: 'public' | 'followers';
  workoutId?: string | null;
}

export interface Comment {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  text: string;
  createdAt: Timestamp;
  likes: number;
  likedBy: string[];
  replyCount: number;
  isLiked?: boolean;
  replies?: Reply[];
}

export interface Reply {
  id: string;
  parentCommentId: string;
  authorId: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  text: string;
  createdAt: Timestamp;
  likes: number;
  likedBy: string[];
  replyToUserId: string;
  isLiked?: boolean;
}

export interface ActivityItem {
  id: string;
  type: 'follow_request' | 'follow_accepted' | 'new_follower' | 'post_like' | 'post_comment' | 'workout_save' | 'milestone_achieved' | 'comment_like' | 'comment_reply';
  fromUserId: string;
  fromUsername: string;
  fromProfileImageUrl?: string;
  postId?: string;
  postImageUrl?: string;
  postCaption?: string;
  commentId?: string;
  commentText?: string;
  parentCommentId?: string;
  replyId?: string;
  replyText?: string;
  status?: 'pending' | 'accepted' | 'ignored' | 'read' | 'unread'; 
  createdAt: Timestamp; 
}

export function usePostsData() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { currentUser, userProfile } = useAuth();
  const functionsInstance = getFunctions(app, 'northamerica-northeast2');

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
      const filename = `posts/${currentUser!.uid}/${Date.now()}.jpg`;
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
  const getPostComments = async (postId: string): Promise<Comment[]> => {
    if (!currentUser) {
      // If no current user, fetch comments without like status
      const commentsRefNoUser = collection(db, "posts", postId, "comments");
      const qNoUser = query(commentsRefNoUser, orderBy("createdAt", "desc"));
      const querySnapshotNoUser = await getDocs(qNoUser);
      const commentsNoUser: Comment[] = [];
      querySnapshotNoUser.forEach((doc) => {
        const data = doc.data();
        commentsNoUser.push({ 
          id: doc.id, 
          ...data,
          likes: data.likes || 0,
          likedBy: data.likedBy || [],
          replyCount: data.replyCount || 0,
          isLiked: false, // Default for no user
        } as Comment);
      });
      return commentsNoUser;
    }

    try {
      const commentsRef = collection(db, "posts", postId, "comments");
      const q = query(commentsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      const comments: Comment[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const likedBy = data.likedBy || [];
        comments.push({ 
          id: doc.id, 
          ...data,
          likes: data.likes || 0,
          likedBy: likedBy,
          replyCount: data.replyCount || 0,
          isLiked: likedBy.includes(currentUser.uid),
        } as Comment);
      });
      
      return comments;
    } catch (err) {
      console.error("Error fetching comments:", err);
      throw err;
    }
  };

  // Add a new post
  const addPost = async (postData: NewPostData): Promise<string> => {
    if (!currentUser || !userProfile) {
      throw new Error("User not authenticated");
    }

    try {
      let imageUrl = "";
      if (postData.imageUri) {
        imageUrl = await uploadImage(postData.imageUri);
      }

      if (postData.isMilestone) {
        if (!postData.milestoneDetails) {
          throw new Error("Milestone details are required for a milestone post.");
        }
        const createMilestonePostFunction = httpsCallable(functionsInstance, 'createMilestonePost');
        
        const payload = {
          authorUsername: userProfile.username || "User",
          authorProfileImageUrl: userProfile.profileImageUrl || null,
          caption: postData.caption || "",
          imageUrl: imageUrl || null,
          milestoneDetails: postData.milestoneDetails,
          visibility: postData.visibility || "public",
          workoutId: postData.workoutId || null,
        };
        
        console.log("Calling createMilestonePost with payload:", payload);
        const result = await createMilestonePostFunction(payload);
        const resultData = result.data as { success: boolean, postId: string, error?: string };

        if (!resultData.success || !resultData.postId) {
          console.error("Cloud function 'createMilestonePost' failed:", resultData.error);
          throw new Error(resultData.error || "Failed to create milestone post via cloud function.");
        }
        console.log("Milestone post created via Cloud Function with ID:", resultData.postId);
        return resultData.postId;

      } else {

        const postRef = await addDoc(collection(db, "posts"), {
          authorId: currentUser.uid,
          authorUsername: userProfile.username || "Unknown user",
          authorProfileImageUrl: userProfile.profileImageUrl || "",
          caption: postData.caption || "",
          imageUrl: imageUrl,
          createdAt: serverTimestamp(),
          isMilestone: false,
          milestoneDetails: null,
          reactionCount: 0,
          commentCount: 0,
          visibility: postData.visibility || "public",
          workoutId: postData.workoutId || null
        });
        console.log("Regular post created directly with ID:", postRef.id);
        return postRef.id;
      }
    } catch (error) {
      console.error("Error in addPost:", error);
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
      
      const deleteCommentPromises = commentDocs.docs.map(async (commentDoc) => {
        // Delete replies for each comment
        const repliesRef = collection(db, "posts", postId, "comments", commentDoc.id, "replies");
        const replyDocs = await getDocs(repliesRef);
        const deleteReplyPromises = replyDocs.docs.map(replyDoc => 
          deleteDoc(doc(db, "posts", postId, "comments", commentDoc.id, "replies", replyDoc.id))
        );
        await Promise.all(deleteReplyPromises);
        
        // Then delete the comment itself
        return deleteDoc(doc(db, "posts", postId, "comments", commentDoc.id));
      });
      await Promise.all(deleteCommentPromises);
      
      // 3. Delete all reactions in the subcollection
      const likersRef = collection(db, "posts", postId, "likers");
      const likerDocs = await getDocs(likersRef);
      
      const deleteLikerPromises = likerDocs.docs.map(likerDoc => 
        deleteDoc(doc(db, "posts", postId, "likers", likerDoc.id))
      );
      await Promise.all(deleteLikerPromises);
      
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

        // Decrement reactionCount on the main post document
        transaction.update(postRef, {
          reactionCount: increment(-1),
        });
      });

      // Delete the corresponding 'post_like' activity item for the post author
      if (postData.authorId !== currentUser.uid) {
        const authorActivityColRef = collection(db, 'activity', postData.authorId, 'userActivity');
        const q = query(
          authorActivityColRef,
          where('type', '==', 'post_like'),
          where('postId', '==', postId),
          where('fromUserId', '==', currentUser.uid), // Corrected field: fromUserId
          limit(1) // Assuming only one such activity item per like
        );
        
        const activitySnapshot = await getDocs(q);
        if (!activitySnapshot.empty) {
          const batch = writeBatch(db);
          activitySnapshot.forEach(activityDoc => {
            batch.delete(activityDoc.ref);
          });
          await batch.commit();
          console.log(`Deleted 'post_like' activity for post ${postId} by user ${currentUser.uid} from author ${postData.authorId}'s feed.`);
        } else {
          console.log(`No 'post_like' activity found to delete for post ${postId} by user ${currentUser.uid} in author ${postData.authorId}'s feed.`);
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
      const postDocSnap = await getDoc(postRef);
      if (!postDocSnap.exists()) throw new Error("Post not found");
      const postData = postDocSnap.data() as Post;

      const newCommentRef = doc(commentsCollectionRef);

      const newCommentData: Omit<Comment, 'id' | 'isLiked' | 'replies'> = {
        text: text.trim(),
        authorId: currentUser.uid,
        authorUsername: userProfile?.username || currentUser.displayName || "Anonymous",
        authorProfileImageUrl: userProfile?.profileImageUrl || currentUser.photoURL || "",
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        replyCount: 0,
      };

      await runTransaction(db, async (transaction) => {
        transaction.set(newCommentRef, newCommentData);
        transaction.update(postRef, {
          commentCount: increment(1)
        });

        // Activity for post author
        if (postData.authorId !== currentUser.uid) {
          const authorActivityColRef = collection(db, 'activity', postData.authorId, 'userActivity');
          const newActivityRef = doc(authorActivityColRef);
          transaction.set(newActivityRef, {
            type: 'post_comment',
            fromUserId: currentUser.uid,
            fromUsername: userProfile?.username || currentUser.displayName || "Someone",
            fromProfileImageUrl: userProfile?.profileImageUrl || currentUser.photoURL || "",
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
      
      const clientTimestamp = Timestamp.now();
      return { 
        id: newCommentRef.id, 
        ...newCommentData, 
        createdAt: clientTimestamp, 
        isLiked: false,
      } as Comment;

    } catch (error) {
      console.error("Error adding comment: ", error);
      throw error;
    }
  };

  const likeComment = async (postId: string, commentId: string) => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    const commentRef = doc(db, "posts", postId, "comments", commentId);

    try {
      const commentSnap = await getDoc(commentRef);
      if (!commentSnap.exists()) throw new Error("Comment not found");
      const commentData = commentSnap.data() as Comment;

      // Prevent liking own comment for activity, but allow self-like
      if (commentData.likedBy.includes(currentUser.uid)) {
        console.log("Comment already liked by user");
        return; // Or throw error / handle as needed
      }

      await runTransaction(db, async (transaction) => {
        transaction.update(commentRef, {
          likes: increment(1),
          likedBy: arrayUnion(currentUser.uid)
        });

        // Activity for comment author (if not self-liking comment)
        if (commentData.authorId !== currentUser.uid) {
          const authorActivityColRef = collection(db, 'activity', commentData.authorId, 'userActivity');
          const newActivityRef = doc(authorActivityColRef);
          transaction.set(newActivityRef, {
            type: 'comment_like',
            fromUserId: currentUser.uid,
            fromUsername: userProfile.username,
            fromProfileImageUrl: userProfile.profileImageUrl || "",
            postId: postId,
            commentId: commentId,
            commentText: commentData.text.substring(0, 50) + (commentData.text.length > 50 ? "..." : ""),
            createdAt: serverTimestamp(),
            status: 'unread',
          } as Omit<ActivityItem, 'id'>);
        }
      });
      console.log(`User ${currentUser.uid} liked comment ${commentId} on post ${postId}`);
    } catch (error) {
      console.error("Error liking comment: ", error);
      throw error;
    }
  };

  const unlikeComment = async (postId: string, commentId: string) => {
    if (!currentUser) throw new Error("User not authenticated");
    const commentRef = doc(db, "posts", postId, "comments", commentId);

    try {
      const commentSnap = await getDoc(commentRef);
      if (!commentSnap.exists()) throw new Error("Comment not found");
      const commentData = commentSnap.data() as Comment;

      if (!commentData.likedBy.includes(currentUser.uid)) {
        console.log("Comment not liked by user, cannot unlike");
        return; 
      }

      await runTransaction(db, async (transaction) => {
        transaction.update(commentRef, {
          likes: increment(-1),
          likedBy: arrayRemove(currentUser.uid)
        });
      });
      
      // Optionally, remove the 'comment_like' activity item
      if (commentData.authorId !== currentUser.uid) {
        const authorActivityColRef = collection(db, 'activity', commentData.authorId, 'userActivity');
        const q = query(
          authorActivityColRef,
          where('type', '==', 'comment_like'),
          where('postId', '==', postId),
          where('commentId', '==', commentId),
          where('fromUserId', '==', currentUser.uid),
          limit(1)
        );
        const activitySnapshot = await getDocs(q);
        if (!activitySnapshot.empty) {
          const batch = writeBatch(db);
          activitySnapshot.forEach(activityDoc => batch.delete(activityDoc.ref));
          await batch.commit();
        }
      }
      console.log(`User ${currentUser.uid} unliked comment ${commentId} on post ${postId}`);
    } catch (error) {
      console.error("Error unliking comment: ", error);
      throw error;
    }
  };

  const addReplyToComment = async (postId: string, parentCommentId: string, text: string): Promise<Reply> => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    if (!text.trim()) throw new Error("Reply text cannot be empty");

    const parentCommentRef = doc(db, "posts", postId, "comments", parentCommentId);
    const repliesCollectionRef = collection(db, "posts", postId, "comments", parentCommentId, "replies");
    
    try {
      const parentCommentSnap = await getDoc(parentCommentRef);
      if (!parentCommentSnap.exists()) throw new Error("Parent comment not found");
      const parentCommentData = parentCommentSnap.data() as Comment;

      const newReplyRef = doc(repliesCollectionRef); // Auto-generate ID

      const newReplyData: Omit<Reply, 'id' | 'isLiked'> = {
        parentCommentId: parentCommentId,
        text: text.trim(),
        authorId: currentUser.uid,
        authorUsername: userProfile.username,
        authorProfileImageUrl: userProfile.profileImageUrl || "",
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        replyToUserId: parentCommentData.authorId,
      };

      await runTransaction(db, async (transaction) => {
        transaction.set(newReplyRef, newReplyData);
        transaction.update(parentCommentRef, {
          replyCount: increment(1)
        });

        // Activity for parent comment author (if not replying to own comment)
        if (parentCommentData.authorId !== currentUser.uid) {
          const authorActivityColRef = collection(db, 'activity', parentCommentData.authorId, 'userActivity');
          const newActivityRef = doc(authorActivityColRef);
          transaction.set(newActivityRef, {
            type: 'comment_reply',
            fromUserId: currentUser.uid,
            fromUsername: userProfile.username,
            fromProfileImageUrl: userProfile.profileImageUrl || "",
            postId: postId,
            parentCommentId: parentCommentId,
            commentText: parentCommentData.text.substring(0, 50) + (parentCommentData.text.length > 50 ? "..." : ""),
            replyId: newReplyRef.id,
            replyText: text.trim().substring(0, 50) + (text.trim().length > 50 ? "..." : ""),
            createdAt: serverTimestamp(),
            status: 'unread',
          } as Omit<ActivityItem, 'id'>);
        }
      });

      const clientTimestamp = Timestamp.now();
      return { 
        id: newReplyRef.id, 
        ...newReplyData, 
        createdAt: clientTimestamp,
        isLiked: false,
      } as Reply;

    } catch (error) {
      console.error("Error adding reply to comment: ", error);
      throw error;
    }
  };

  const getCommentReplies = async (postId: string, commentId: string): Promise<Reply[]> => {
    if (!currentUser) {
      // If no current user, fetch replies without like status
      const repliesRefNoUser = collection(db, "posts", postId, "comments", commentId, "replies");
      const qNoUser = query(repliesRefNoUser, orderBy("createdAt", "asc")); // Replies usually ascending
      const querySnapshotNoUser = await getDocs(qNoUser);
      const repliesNoUser: Reply[] = [];
      querySnapshotNoUser.forEach((doc) => {
        const data = doc.data();
        repliesNoUser.push({ 
          id: doc.id, 
          ...data,
          likes: data.likes || 0,
          likedBy: data.likedBy || [],
          isLiked: false,
         } as Reply);
      });
      return repliesNoUser;
    }
    
    try {
      const repliesRef = collection(db, "posts", postId, "comments", commentId, "replies");
      const q = query(repliesRef, orderBy("createdAt", "asc")); // Replies usually ascending
      const querySnapshot = await getDocs(q);
      
      const replies: Reply[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const likedBy = data.likedBy || [];
        replies.push({ 
          id: doc.id, 
          ...data,
          likes: data.likes || 0,
          likedBy: likedBy,
          isLiked: likedBy.includes(currentUser.uid),
         } as Reply);
      });
      
      return replies;
    } catch (err) {
      console.error("Error fetching comment replies:", err);
      throw err;
    }
  };

  const likeReply = async (postId: string, commentId: string, replyId: string) => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    const replyRef = doc(db, "posts", postId, "comments", commentId, "replies", replyId);

    try {
      const replySnap = await getDoc(replyRef);
      if (!replySnap.exists()) throw new Error("Reply not found");
      const replyData = replySnap.data() as Reply;

      if (replyData.likedBy.includes(currentUser.uid)) {
        console.log("Reply already liked by user");
        return;
      }

      await runTransaction(db, async (transaction) => {
        transaction.update(replyRef, {
          likes: increment(1),
          likedBy: arrayUnion(currentUser.uid)
        });

        // Activity for reply author (if not self-liking reply)
        // Note: This might become noisy. Consider if this notification is necessary.
        if (replyData.authorId !== currentUser.uid) {
          // const authorActivityColRef = collection(db, 'activity', replyData.authorId, 'userActivity');
          // const newActivityRef = doc(authorActivityColRef);
          // transaction.set(newActivityRef, {
          //   type: 'reply_like', // You'd need to add this type to ActivityItem
          //   fromUserId: currentUser.uid,
          //   fromUsername: userProfile.username,
          //   fromProfileImageUrl: userProfile.profileImageUrl || "",
          //   postId: postId,
          //   commentId: commentId,
          //   replyId: replyId,
          //   replyText: replyData.text.substring(0, 50) + (replyData.text.length > 50 ? "..." : ""),
          //   createdAt: serverTimestamp(),
          //   status: 'unread',
          // } as Omit<ActivityItem, 'id'>);
        }
      });
      console.log(`User ${currentUser.uid} liked reply ${replyId}`);
    } catch (error) {
      console.error("Error liking reply: ", error);
      throw error;
    }
  };

  const unlikeReply = async (postId: string, commentId: string, replyId: string) => {
    if (!currentUser) throw new Error("User not authenticated");
    const replyRef = doc(db, "posts", postId, "comments", commentId, "replies", replyId);
    
    try {
      const replySnap = await getDoc(replyRef);
      if (!replySnap.exists()) throw new Error("Reply not found");
      const replyData = replySnap.data() as Reply;

      if (!replyData.likedBy.includes(currentUser.uid)) {
        console.log("Reply not liked by user, cannot unlike");
        return;
      }

      await runTransaction(db, async (transaction) => {
        transaction.update(replyRef, {
          likes: increment(-1),
          likedBy: arrayRemove(currentUser.uid)
        });
      });
      // Optionally remove 'reply_like' activity
      console.log(`User ${currentUser.uid} unliked reply ${replyId}`);
    } catch (error) {
      console.error("Error unliking reply: ", error);
      throw error;
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
        fetchPosts(); // SHOULD fetchPosts() BE CALLED HERE??? COME BACK LATER
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
    deletePost,
    likeComment,
    unlikeComment,
    addReplyToComment,
    getCommentReplies,
    likeReply,
    unlikeReply
  };
}