import { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { app, storage } from '@/firebaseConfig';
import { useAuth } from '@/context/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { generateUniqueFilename } from '@/logic/idGenerator';
import { PostRepository } from '@/features/posts/infra/postRepository';
import type { PostAuthorProfile, NewPostData } from '@/features/posts/domain/Post';
import type { MentionData } from '@/features/mentions/domain/Mention';

// Re-export canonical types so callers importing from here continue to work.
export type { Post, Comment, Reply } from '@/features/posts/domain/Post';
export type { ActivityItem } from '@/features/notifications/domain/ActivityItem';

import type { Post, Comment, Reply } from '@/features/posts/domain/Post';

export function usePostsData() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { currentUser, userProfile } = useAuth();

  const fetchPosts = async () => {
    if (!currentUser?.uid) {
      setPosts([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await PostRepository.fetchPublicPosts(currentUser.uid);
      if (currentUser?.uid) setPosts(data);
    } catch (err) {
      if (currentUser?.uid) {
        console.error("Error fetching posts:", err);
        setError(err as Error);
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (imageUri: string, postId: string): Promise<string> => {
    if (!currentUser) throw new Error("User not authenticated. Please log in and try again.");

    const filename = `posts/${currentUser.uid}/${generateUniqueFilename('post', 'jpg')}`;
    const storageRef = ref(storage, filename);

    const response = await fetch(imageUri);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    const blob = await response.blob();
    if (blob.size === 0) throw new Error("Image blob is empty");

    const metadata = {
      contentType: 'image/jpeg',
      customMetadata: { postId, uploadedBy: currentUser.uid },
    };

    await uploadBytes(storageRef, blob, metadata);
    return getDownloadURL(storageRef);
  };

  const uploadVideo = async (videoUri: string, thumbnailUri: string, postId: string, duration: number): Promise<{ videoUrl: string; videoThumbnailUrl: string }> => {
    if (!currentUser) throw new Error("User not authenticated. Please log in and try again.");

    const [videoResponse, thumbResponse] = await Promise.all([
      fetch(videoUri),
      fetch(thumbnailUri),
    ]);
    if (!videoResponse.ok) throw new Error('Failed to fetch video file');
    if (!thumbResponse.ok) throw new Error('Failed to fetch thumbnail');

    const [videoBlob, thumbBlob] = await Promise.all([
      videoResponse.blob(),
      thumbResponse.blob(),
    ]);
    if (videoBlob.size === 0) throw new Error('Video blob is empty');
    if (videoBlob.size > 50 * 1024 * 1024) throw new Error('Video must be 50 MB or smaller');

    // Derive content type from the actual blob, fall back to URI extension
    const ALLOWED = ['video/mp4', 'video/quicktime'];
    const contentType = ALLOWED.includes(videoBlob.type)
      ? videoBlob.type
      : (videoUri.toLowerCase().includes('.mov') ? 'video/quicktime' : 'video/mp4');
    const ext = contentType === 'video/quicktime' ? 'mov' : 'mp4';

    const videoFilename = `posts/${currentUser.uid}/${generateUniqueFilename('video', ext)}`;
    const thumbFilename = `posts/${currentUser.uid}/${generateUniqueFilename('video_thumb', 'jpg')}`;

    const videoMeta = {
      contentType,
      customMetadata: { postId, uploadedBy: currentUser.uid },
    };
    const thumbMeta = {
      contentType: 'image/jpeg',
      customMetadata: { postId, uploadedBy: currentUser.uid },
    };

    const videoStorageRef = ref(storage, videoFilename);
    const thumbStorageRef = ref(storage, thumbFilename);

    await Promise.all([
      uploadBytes(videoStorageRef, videoBlob, videoMeta),
      uploadBytes(thumbStorageRef, thumbBlob, thumbMeta),
    ]);

    const [videoUrl, videoThumbnailUrl] = await Promise.all([
      getDownloadURL(videoStorageRef),
      getDownloadURL(thumbStorageRef),
    ]);

    return { videoUrl, videoThumbnailUrl };
  };

  const getPostById = async (postId: string): Promise<Post> => {
    if (!currentUser?.uid) throw new Error("User not authenticated");
    return PostRepository.getById(postId, currentUser.uid);
  };

  const getPostComments = async (postId: string): Promise<Comment[]> => {
    if (!currentUser?.uid) throw new Error("User not authenticated");
    return PostRepository.getComments(postId, currentUser.uid);
  };

  const addPost = async (postData: NewPostData): Promise<string> => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");

    const author: PostAuthorProfile = {
      uid: currentUser.uid,
      username: userProfile.username || "Unknown user",
      profileImageUrl: userProfile.profileImageUrl,
      profileThumbnailUrl: userProfile.profileThumbnailUrl,
    };

    try {
      if (postData.isMilestone) {
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
          tags: postData.tags,
        };

        const result = await createMilestonePost(payload);
        const resultData = result.data as { success: boolean; postId: string };

        if (resultData.success && postData.imageUri) {
          try {
            const imageUrl = await uploadImage(postData.imageUri, resultData.postId);
            await PostRepository.updatePostImageUrl(resultData.postId, imageUrl);
          } catch (uploadError) {
            await PostRepository.delete(resultData.postId, currentUser.uid).catch(() => {});
            throw uploadError;
          }
        } else if (resultData.success && postData.videoUri && postData.videoThumbnailUri) {
          try {
            const { videoUrl, videoThumbnailUrl } = await uploadVideo(postData.videoUri, postData.videoThumbnailUri, resultData.postId, postData.videoDuration ?? 0);
            await PostRepository.updatePostVideoUrl(resultData.postId, videoUrl, videoThumbnailUrl, postData.videoDuration ?? 0);
          } catch (uploadError) {
            await PostRepository.delete(resultData.postId, currentUser.uid).catch(() => {});
            throw uploadError;
          }
        }

        return resultData.postId;
      } else {
        const postId = await PostRepository.createRegularPost(author, {
          caption: postData.caption,
          imageUrl: null,
          visibility: postData.visibility ?? 'public',
          workoutId: postData.workoutId,
          authorArchetype: postData.authorArchetype,
          mentions: postData.mentions,
          tags: postData.tags,
        });

        if (postData.imageUri) {
          try {
            const imageUrl = await uploadImage(postData.imageUri, postId);
            await PostRepository.updatePostImageUrl(postId, imageUrl);
          } catch (uploadError) {
            await PostRepository.delete(postId, currentUser.uid).catch(() => {});
            throw uploadError;
          }
        } else if (postData.videoUri && postData.videoThumbnailUri) {
          try {
            const { videoUrl, videoThumbnailUrl } = await uploadVideo(postData.videoUri, postData.videoThumbnailUri, postId, postData.videoDuration ?? 0);
            await PostRepository.updatePostVideoUrl(postId, videoUrl, videoThumbnailUrl, postData.videoDuration ?? 0);
          } catch (uploadError) {
            await PostRepository.delete(postId, currentUser.uid).catch(() => {});
            throw uploadError;
          }
        }

        return postId;
      }
    } catch (error) {
      console.error("Error adding post:", error);
      throw error;
    }
  };

  const deletePost = async (postId: string): Promise<boolean> => {
    if (!currentUser) throw new Error("User not authenticated");

    try {
      // Fetch image URL before deleting the doc (for storage cleanup).
      const imageUrl = await PostRepository.getImageUrl(postId);
      if (imageUrl) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef).catch(err => console.log("Image may not exist:", err));
      }

      await PostRepository.delete(postId, currentUser.uid);
      return true;
    } catch (error) {
      console.error("Error deleting post:", error);
      throw error;
    }
  };

  const likePost = async (postId: string): Promise<void> => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    await PostRepository.likePost(
      postId,
      currentUser.uid,
      userProfile.username,
      userProfile.profileImageUrl || ''
    );
  };

  const unlikePost = async (postId: string): Promise<void> => {
    if (!currentUser) throw new Error("User not authenticated");
    await PostRepository.unlikePost(postId, currentUser.uid);
  };

  const addComment = async (postId: string, text: string, mentions?: MentionData[]): Promise<Comment> => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    if (!text.trim()) throw new Error("Comment text cannot be empty");
    return PostRepository.addComment(
      postId,
      currentUser.uid,
      userProfile.username || "Anonymous",
      text,
      userProfile.profileImageUrl || '',
      mentions
    );
  };

  const deleteComment = async (postId: string, commentId: string): Promise<void> => {
    if (!currentUser) throw new Error("User not authenticated");
    await PostRepository.deleteComment(postId, commentId, currentUser.uid);
  };

  const updateComment = async (
    postId: string,
    commentId: string,
    newText: string,
    mentions?: MentionData[]
  ): Promise<void> => {
    if (!currentUser) throw new Error("User not authenticated");
    if (!newText.trim()) throw new Error("Comment text cannot be empty");
    await PostRepository.updateComment(postId, commentId, currentUser.uid, newText.trim(), mentions);
  };

  const likeComment = async (postId: string, commentId: string): Promise<void> => {
    if (!currentUser) throw new Error("User not authenticated");
    await PostRepository.likeComment(postId, commentId, currentUser.uid);
  };

  const unlikeComment = async (postId: string, commentId: string): Promise<void> => {
    if (!currentUser) throw new Error("User not authenticated");
    await PostRepository.unlikeComment(postId, commentId, currentUser.uid);
  };

  const addReplyToComment = async (
    postId: string,
    parentCommentId: string,
    text: string,
    mentions?: MentionData[]
  ): Promise<Reply> => {
    if (!currentUser || !userProfile) throw new Error("User not authenticated");
    if (!text.trim()) throw new Error("Reply text cannot be empty");

    const author: PostAuthorProfile = {
      uid: currentUser.uid,
      username: userProfile.username,
      profileImageUrl: userProfile.profileImageUrl,
      profileThumbnailUrl: userProfile.profileThumbnailUrl,
    };

    return PostRepository.addReply(postId, parentCommentId, author, text, mentions);
  };

  const getCommentReplies = async (postId: string, commentId: string): Promise<Reply[]> => {
    if (!currentUser?.uid) throw new Error("User not authenticated");
    return PostRepository.getReplies(postId, commentId, currentUser.uid);
  };

  const likeReply = async (postId: string, commentId: string, replyId: string): Promise<void> => {
    if (!currentUser) throw new Error("User not authenticated");
    await PostRepository.likeReply(postId, commentId, replyId, currentUser.uid);
  };

  const unlikeReply = async (postId: string, commentId: string, replyId: string): Promise<void> => {
    if (!currentUser) throw new Error("User not authenticated");
    await PostRepository.unlikeReply(postId, commentId, replyId, currentUser.uid);
  };

  const updatePost = async (postId: string, caption: string, tags?: string[]): Promise<void> => {
    if (!currentUser) throw new Error("User not authenticated");
    await PostRepository.updatePost(postId, currentUser.uid, caption, tags);
  };

  const savePost = async (postId: string): Promise<void> => {
    if (!currentUser) throw new Error("User not authenticated");
    await PostRepository.savePost(postId, currentUser.uid);
  };

  const unsavePost = async (postId: string): Promise<void> => {
    if (!currentUser) throw new Error("User not authenticated");
    await PostRepository.unsavePost(postId, currentUser.uid);
  };

  const fetchSavedPosts = async (): Promise<Post[]> => {
    if (!currentUser?.uid) throw new Error("User not authenticated");
    return PostRepository.fetchSavedPosts(currentUser.uid);
  };

  useEffect(() => {
    if (currentUser?.uid) {
      fetchPosts();
    } else {
      setPosts([]);
      setLoading(false);
      setError(null);
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
    deleteComment,
    updateComment,
    likeComment,
    unlikeComment,
    addReplyToComment,
    getCommentReplies,
    likeReply,
    unlikeReply,
    updatePost,
    savePost,
    unsavePost,
    fetchSavedPosts,
  };
}
