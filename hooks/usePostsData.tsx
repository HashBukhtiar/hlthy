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
  setDoc,
  getDocs,
  writeBatch,
  deleteDoc,
  orderBy,
  limit,
  increment,
  runTransaction,
  Timestamp,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { app, db, storage } from '@/firebaseConfig';
import { useAuth } from '@/context/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { generateUniqueFilename } from '@/logic/idGenerator';
import { NotificationService } from '@/services/NotificationService';

export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  authorProfileThumbnailUrl?: string;
  authorBlockedUsers?: string[];
  caption: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
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
  isFollowing?: boolean;
  isPublic?: boolean;
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
  authorArchetype?: string | null;
}

export interface Comment {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  authorProfileThumbnailUrl?: string;
  authorBlockedUsers?: string[];
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
  authorProfileThumbnailUrl?: string;
  authorBlockedUsers?: string[];
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

  // Fetch all public posts
  const fetchPosts = async () => {
    try {
      setLoading(true)
      const postsRef = collection(db, "posts")
      const q = query(
        postsRef,
        where("visibility", "==", "public"),
        orderBy("createdAt", "desc")
      )
      const querySnapshot = await getDocs(q)

      const postsData: Post[] = []
      for (const snap of querySnapshot.docs) {
        // build the base Post
        const post = { id: snap.id, ...(snap.data() as Post) } as Post

        // ► fetch author's profile image
        const userSnap = await getDoc(doc(db, "users", post.authorId))
        if (userSnap.exists()) {
          const u = userSnap.data() as any
          post.authorProfileImageUrl     = u.profileImageUrl     || ""
          post.authorProfileThumbnailUrl = u.profileThumbnailUrl || ""
          post.authorBlockedUsers        = u.blockedUsers        || []
        }

        // ► preserve like‐status
        if (currentUser) {
          const likeSnap = await getDoc(
            doc(db, "posts", post.id, "likers", currentUser.uid)
          )
          post.isLiked = likeSnap.exists()
        }

        postsData.push(post)
      }
      setPosts(postsData)
    } catch (err) {
      console.error("Error fetching posts:", err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  const uploadImage = async (imageUri: string, postId: string): Promise<string> => {
    try {
      const filename = `posts/${currentUser!.uid}/${generateUniqueFilename('post', 'jpg')}`;
      const storageRef = ref(storage, filename);
      
      // Fetch the image and convert to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // Define custom metadata
      const metadata = {
        customMetadata: {
          postId: postId
        }
      };

      // Upload image with metadata
      await uploadBytes(storageRef, blob, metadata);
      
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
    const postRef = doc(db, "posts", postId)
    const postSnap = await getDoc(postRef)
    if (!postSnap.exists()) throw new Error("Post not found")

    const post = { id: postSnap.id, ...(postSnap.data() as Post) } as Post

    // ► fetch author's profile image
    const userSnap = await getDoc(doc(db, "users", post.authorId))
    if (userSnap.exists()) {
      const u = userSnap.data() as any
      post.authorProfileImageUrl     = u.profileImageUrl     || ""
      post.authorProfileThumbnailUrl = u.profileThumbnailUrl || ""
      post.authorBlockedUsers        = u.blockedUsers        || []
    }

    // ► preserve like‐status
    if (currentUser) {
      const likeSnap = await getDoc(
        doc(db, "posts", postId, "likers", currentUser.uid)
      )
      post.isLiked = likeSnap.exists()
    }

    return post
  }

  // Get comments for a post
  const getPostComments = async (postId: string): Promise<Comment[]> => {
    const commentsRef = collection(db, "posts", postId, "comments")
    const q = query(commentsRef, orderBy("createdAt", "desc"))
    const snaps = await getDocs(q)

    const comments: Comment[] = []
    for (const snap of snaps.docs) {
      const data = snap.data()
      const comment: Comment = {
        id: snap.id,
        authorId: data.authorId,
        authorUsername: data.authorUsername,
        authorProfileImageUrl: "",
        text: data.text,
        createdAt: data.createdAt,
        likes: data.likes || 0,
        likedBy: data.likedBy || [],
        replyCount: data.replyCount || 0,
        isLiked:    currentUser ? (data.likedBy?.includes(currentUser.uid) ?? false) : false,
        replies:    []
      }

      // fetch commenter's profile image
      const userSnap = await getDoc(doc(db, "users", comment.authorId))
      if (userSnap.exists()) {
        const u = userSnap.data() as any
        comment.authorProfileImageUrl = u.profileImageUrl || ""
        comment.authorProfileThumbnailUrl = u.profileThumbnailUrl || ""
        comment.authorBlockedUsers = u.blockedUsers || []
      }

      comments.push(comment)
    }
    return comments
  }

  // Add a new post
  const addPost = async (postData: NewPostData) => {
    if (!currentUser || !userProfile) {
      throw new Error("User not authenticated");
    }

    try {
      if (postData.isMilestone) {
        // 1. First create the milestone post document
        const functions = getFunctions(app, 'northamerica-northeast2');
        const createMilestonePost = httpsCallable(functions, 'createMilestonePost');
        
        const payload = {
          authorUsername: userProfile.username || "User",
          authorProfileImageUrl: userProfile.profileImageUrl || null,
          caption: postData.caption || "",
          milestoneDetails: postData.milestoneDetails,
          visibility: postData.visibility || "public",
          workoutId: postData.workoutId || null,
          authorArchetype: postData.authorArchetype || null,
        };
        
        console.log("Calling createMilestonePost with payload:", payload);
        const result = await createMilestonePost(payload);
        const resultData = result.data as { success: boolean, postId: string };

        // 2. If there's an image, upload it with the postId metadata AND update the document
        if (resultData.success && postData.imageUri) {
          console.log("Uploading image for milestone post:", resultData.postId);
          const imageUrl = await uploadImage(postData.imageUri, resultData.postId);
          
          // Update the post document with the image URL
          const postRef = doc(db, "posts", resultData.postId);
          await updateDoc(postRef, { imageUrl });
          console.log("Updated milestone post with image URL");
        }
        
        return resultData.postId;

      } else {
        // Regular posts - same logic as before
        const postRef = doc(collection(db, "posts"));
        const postId = postRef.id;

        let imageUrl = null;
        if (postData.imageUri) {
          imageUrl = await uploadImage(postData.imageUri, postId);
        }

        await setDoc(postRef, {
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
          workoutId: postData.workoutId || null,
          authorArchetype: postData.authorArchetype || null,
        });
        
        console.log("Regular post created directly with ID:", postId);
        return postId;
      }
    } catch (error) {
      console.error("Error adding post:", error);
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

      // Check if user has already liked this post
      const likerDoc = await getDoc(likerRef);
      if (likerDoc.exists()) {
        return; // Don't throw error, just return silently
      }

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
      });

      // Create activity for the post author (if not self-like)
      if (postData.authorId !== currentUser.uid) {
        const authorActivityColRef = collection(db, 'activity', postData.authorId, 'userActivity');
        await addDoc(authorActivityColRef, {
          type: 'post_like',
          fromUserId: currentUser.uid,
          fromUsername: userProfile.username,
          fromProfileImageUrl: userProfile.profileImageUrl || null,
          postId: postId,
          postImageUrl: postData.imageUrl || null,
          postCaption: postData.caption || '',
          createdAt: serverTimestamp(),
          status: 'unread'
        });

        // Send notification for the like
        try {
          await NotificationService.notifyLikeOrComment(
            postData.authorId,
            currentUser.uid,
            userProfile.username || 'Someone',
            postId,
            true, // isLike = true
            postData.isMilestone, // Pass the milestone flag
            postData.isMilestone ? 'milestone' : 'post' // Explicitly set contentType
          );
          console.log(`Like notification sent to ${postData.authorId}`);
        } catch (error) {
          console.error('Error sending like notification:', error);
          // Don't throw - notification failure shouldn't stop the like action
        }
      }

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
    if (!text.trim())      throw new Error("Comment text cannot be empty");

    // First, get the post data to get author info
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) throw new Error("Post not found");
    const postData = postSnap.data() as Post;

    const newCommentRef = await addDoc(
      collection(db, "posts", postId, "comments"),
      {
        text,
        authorId:       currentUser.uid,
        authorUsername: userProfile.username || "Anonymous",
        createdAt:      serverTimestamp(),
        likes:          0,
        likedBy:        [],
        replyCount:     0,
      }
    );

    // Create activity and send notification for the post author (if not self-comment)
    if (postData.authorId !== currentUser.uid) {
      try {
        const authorActivityColRef = collection(db, 'activity', postData.authorId, 'userActivity');
        await addDoc(authorActivityColRef, {
          type: 'post_comment',
          fromUserId: currentUser.uid,
          fromUsername: userProfile.username,
          fromProfileImageUrl: userProfile.profileImageUrl || null,
          postId: postId,
          postImageUrl: postData.imageUrl || null,
          commentText: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          createdAt: serverTimestamp(),
          status: 'unread'
        });

        // Send notification for the comment
        await NotificationService.notifyLikeOrComment(
          postData.authorId,
          currentUser.uid,
          userProfile.username || 'Someone',
          postId,
          false, // isLike = false
          postData.isMilestone // Pass the milestone flag
        );
      } catch (error) {
        console.error('Error sending comment notification:', error);
        // Don't throw - notification failure shouldn't stop the comment action
      }
    }

    return {
      id: newCommentRef.id,
      text,
      authorId:             currentUser.uid,
      authorUsername:       userProfile.username || "Anonymous",
      authorProfileImageUrl: userProfile.profileImageUrl || "",
      createdAt:            Timestamp.now(),
      likes:                0,
      likedBy:              [],
      replyCount:           0,
    };
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
      });

      // Create activity and send notification for comment author (if not self-like)
      if (commentData.authorId !== currentUser.uid) {
        try {
          const authorActivityColRef = collection(db, 'activity', commentData.authorId, 'userActivity');
          await addDoc(authorActivityColRef, {
            type: 'comment_like',
            fromUserId: currentUser.uid,
            fromUsername: userProfile.username,
            fromProfileImageUrl: userProfile.profileImageUrl || null,
            postId: postId,
            commentId: commentId,
            createdAt: serverTimestamp(),
            status: 'unread'
          });

          // Send notification (comments are not milestones, so always false)
          await NotificationService.notifyLikeOrComment(
            commentData.authorId,
            currentUser.uid,
            userProfile.username || 'Someone',
            postId,
            true, // isLike = true
            false, // isMilestone = false (comments are never milestones)
            'comment' // contentType = 'comment'
          );
        } catch (error) {
          console.error('Error sending comment like notification:', error);
          // Don't throw - notification failure shouldn't stop the like action
        }
      }

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
        authorProfileThumbnailUrl: userProfile.profileThumbnailUrl || "",
        authorBlockedUsers: [],
        createdAt: serverTimestamp() as any,
        likes: 0,
        likedBy: [],
        replyToUserId: parentCommentData.authorId,
      };

      await runTransaction(db, async (transaction) => {
        transaction.set(newReplyRef, newReplyData);
        transaction.update(parentCommentRef, {
          replyCount: increment(1)
        });
      });

      // Create activity and send notification for the parent comment author (if not self-reply)
      if (parentCommentData.authorId !== currentUser.uid) {
        try {
          const authorActivityColRef = collection(db, 'activity', parentCommentData.authorId, 'userActivity');
          await addDoc(authorActivityColRef, {
            type: 'comment_reply',
            fromUserId: currentUser.uid,
            fromUsername: userProfile.username,
            fromProfileImageUrl: userProfile.profileImageUrl || null,
            postId: postId,
            parentCommentId: parentCommentId,
            replyId: newReplyRef.id,
            replyText: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            createdAt: serverTimestamp(),
            status: 'unread'
          });

          // Send notification for the reply (replies are not milestones)
          await NotificationService.notifyMentionedInReply(
            parentCommentData.authorId,
            currentUser.uid,
            userProfile.username || 'Someone',
            postId
          );
        } catch (error) {
          console.error('Error sending reply notification:', error);
          // Don't throw - notification failure shouldn't stop the reply action
        }
      }

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
    const repliesRef = collection(db, "posts", postId, "comments", commentId, "replies")
    const q = query(repliesRef, orderBy("createdAt", "asc"))
    const snaps = await getDocs(q)

    const replies: Reply[] = []
    for (const snap of snaps.docs) {
      const data = snap.data()
      const reply: Reply = {
        id: snap.id,
        parentCommentId: data.parentCommentId,
        authorId: data.authorId,
        authorUsername: data.authorUsername,
        authorProfileImageUrl: "",
        text: data.text,
        createdAt: data.createdAt,
        likes: data.likes || 0,
        likedBy: data.likedBy || [],
        replyToUserId: data.replyToUserId,
        isLiked: currentUser ? (data.likedBy?.includes(currentUser.uid) ?? false) : false
      }

      // ► fetch replier’s profile image
      const userSnap = await getDoc(doc(db, "users", reply.authorId))
      if (userSnap.exists()) {
        const u = userSnap.data() as any
        reply.authorProfileImageUrl = u.profileImageUrl || ""
        reply.authorProfileThumbnailUrl = u.profileThumbnailUrl || ""
      }

      replies.push(reply)
    }
    return replies
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
      });

      // Create activity and send notification for reply author (if not self-liking reply)
      // Note: This might become noisy. Consider if this notification is necessary.
      if (replyData.authorId !== currentUser.uid) {
        try {
          // Create activity for reply like
          const authorActivityColRef = collection(db, 'activity', replyData.authorId, 'userActivity');
          const activityRef = await addDoc(authorActivityColRef, {
            type: 'comment_like', // or 'reply_like' if you want to distinguish
            fromUserId: currentUser.uid,
            fromUsername: userProfile.username,
            fromProfileImageUrl: userProfile.profileImageUrl || null,
            postId: postId,
            commentId: commentId,
            replyId: replyId,
            createdAt: serverTimestamp(),
            status: 'unread'
          });

          console.log(`Created activity document for reply like: ${activityRef.id}`);

          // Send notification (replies are never milestones, so always false)
          const notificationResult = await NotificationService.notifyLikeOrComment(
            replyData.authorId,
            currentUser.uid,
            userProfile.username || 'Someone',
            postId,
            true, // isLike = true
            false, // isMilestone = false (replies are never milestones)
            'reply' // contentType = 'reply'
          );
          
          console.log(`Reply like notification sent:`, notificationResult);
        } catch (error) {
          console.error('Error sending reply like notification:', error);
          // Don't throw - notification failure shouldn't stop the like action
        }
      }

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