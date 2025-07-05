import { Alert } from 'react-native';
import { db } from '@/firebaseConfig';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  collection, 
  serverTimestamp 
} from 'firebase/firestore';

export interface UserInfo {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  profileThumbnailUrl?: string | null;
}

// Helper function to sanitize undefined values from an object
const sanitizeObject = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      newObj[key] = value === undefined ? null : value;
    }
  }
  return newObj;
};

// Helper function to generate conversation ID
export const generateConversationId = (userId1: string, userId2: string): string => {
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};

// Handles creating/updating the conversation
export const prepareConversation = async (
  currentUser: UserInfo,
  recipientId: string, 
  recipientUsername: string, 
  recipientProfileImageUrl?: string,
  recipientProfileThumbnailUrl?: string
) => {
  const conversationId = generateConversationId(currentUser.uid, recipientId);
  const conversationRef = doc(db, 'conversations', conversationId);
  const conversationSnap = await getDoc(conversationRef);

  // Create conversation if it doesn't exist
  if (!conversationSnap.exists()) {
    await setDoc(conversationRef, {
      participants: [currentUser.uid, recipientId],
      lastMessageAt: serverTimestamp(),
      lastMessageText: `${currentUser.displayName || 'User'} shared content`,
      participantUsernames: {
        [currentUser.uid]: currentUser.displayName || currentUser.email || 'Current User',
        [recipientId]: recipientUsername || 'User',
      },
      participantProfileImages: {
        [currentUser.uid]: currentUser.photoURL || '',
        [recipientId]: recipientProfileImageUrl || '',
      },
      participantProfileThumbnails: {
        [currentUser.uid]: currentUser.profileThumbnailUrl || '',
        [recipientId]: recipientProfileThumbnailUrl || '',
      },
    });

    // Create user-specific conversation entries
    await setDoc(doc(db, `users/${currentUser.uid}/conversations`, conversationId), {
      otherParticipantId: recipientId,
      otherParticipantUsername: recipientUsername || 'User',
      otherParticipantProfileImage: recipientProfileImageUrl || '',
      otherParticipantThumbnailUrl: recipientProfileThumbnailUrl || '',
    });
    
    await setDoc(doc(db, `users/${recipientId}/conversations`, conversationId), {
      otherParticipantId: currentUser.uid,
      otherParticipantUsername: currentUser.displayName || currentUser.email || 'Current User',
      otherParticipantProfileImage: currentUser.photoURL || '',
      otherParticipantThumbnailUrl: currentUser.profileThumbnailUrl || '',
    });
  }

  return { conversationId, conversationRef };
};

// Update both users' conversation metadata
export const updateConversationMetadata = async (
  conversationId: string,
  currentUserId: string,
  messageText: string
) => {
  const conversationRef = doc(db, 'conversations', conversationId);
  
  // Update main conversation document
  await updateDoc(conversationRef, {
    lastMessageAt: serverTimestamp(),
    lastMessageText: messageText,
  });

  // Update current user's conversation reference
  await updateDoc(doc(db, `users/${currentUserId}/conversations`, conversationId), {
    lastMessageAt: serverTimestamp(),
    lastMessageText: messageText,
  });

  // Get the other participant ID and update their reference
  const conversationData = (await getDoc(conversationRef)).data();
  const otherUserId = conversationData?.participants?.find((uid: string) => uid !== currentUserId);
  
  if (otherUserId) {
    await updateDoc(doc(db, `users/${otherUserId}/conversations`, conversationId), {
      lastMessageAt: serverTimestamp(),
      lastMessageText: messageText,
    });
  }
};

// Share a workout
export const shareWorkout = async (
  currentUser: UserInfo,
  recipientId: string,
  recipientUsername: string,
  recipientProfileImageUrl: string | undefined,
  recipientProfileThumbnailUrl: string | undefined, // Add this parameter
  workout: {
    id: string;
    title: string;
    coverImageUrl: string | null;
    thumbnailUrl?: string | null;
    creatorUsername: string;
    description?: string;
  }
) => {
  try {
    const { conversationId, conversationRef } = await prepareConversation(
      currentUser, 
      recipientId, 
      recipientUsername, 
      recipientProfileImageUrl,
      recipientProfileThumbnailUrl
    );

    // Add message with shared workout
    await addDoc(collection(db, "conversations", conversationId, "messages"), {
      senderId: currentUser.uid,
      text: workout.description
        ? `Shared a workout: "${workout.description.substring(0, 50)}${workout.description.length > 50 ? '...' : ''}"`
        : 'Shared a workout',
      createdAt: serverTimestamp(),
      sharedWorkout: {
        id: workout.id,
        title: workout.title,
        coverImageUrl: workout.coverImageUrl || null,
        thumbnailUrl: workout.thumbnailUrl || null,
        creatorUsername: workout.creatorUsername,
      },
    });

    // Update conversation metadata
    await updateConversationMetadata(conversationId, currentUser.uid, 'Shared a workout');
    
    return { success: true };
  } catch (error) {
    console.error("Error sharing workout:", error);
    throw error;
  }
};

// Share a milestone
export const shareMilestone = async (
  currentUser: UserInfo,
  recipientId: string,
  recipientUsername: string,
  recipientProfileImageUrl: string | undefined,
  recipientProfileThumbnailUrl: string | undefined, // Add this parameter
  milestone: {
    id: string;
    milestoneType: string;
    details: any;
    username?: string;
  }
) => {
  try {
    const { conversationId, conversationRef } = await prepareConversation(
      currentUser, 
      recipientId, 
      recipientUsername, 
      recipientProfileImageUrl,
      recipientProfileThumbnailUrl
    );

    // Sanitize the details object to remove undefined values
    const sanitizedDetails = sanitizeObject(milestone.details);

    // Add message with shared milestone
    await addDoc(collection(db, "conversations", conversationId, "messages"), {
      senderId: currentUser.uid,
      text: `Shared a milestone: ${
        milestone.milestoneType === 'PR' ? 'Personal Record' : 
        milestone.milestoneType === 'weightLoss' ? 'Weight Loss' : 'Weight Gain'
      }`,
      createdAt: serverTimestamp(),
      sharedMilestone: {
        id: milestone.id,
        type: milestone.milestoneType,
        details: sanitizedDetails, 
        username: milestone.username || currentUser.displayName,
      }
    });

    // Update conversation metadata
    await updateConversationMetadata(conversationId, currentUser.uid, 'Shared a milestone');
    
    return { success: true };
  } catch (error) {
    console.error("Error sharing milestone:", error);
    throw error;
  }
};

// Share a post
export const sharePost = async (
  currentUser: UserInfo,
  recipientId: string,
  recipientUsername: string,
  recipientProfileImageUrl: string | undefined,
  recipientProfileThumbnailUrl: string | undefined,
  post: {
    id: string;
    caption?: string;
    imageUrl?: string | null;
    thumbnailUrl?: string | null;
    authorUsername?: string;
  }
) => {
  try {
    const { conversationId, conversationRef } = await prepareConversation(
      currentUser, 
      recipientId, 
      recipientUsername, 
      recipientProfileImageUrl,
      recipientProfileThumbnailUrl
    );

    // Add a message with the shared post
    await addDoc(collection(db, "conversations", conversationId, "messages"), {
      senderId: currentUser.uid,
      text: post.caption 
        ? `Shared a post: "${post.caption.substring(0, 50)}${post.caption.length > 50 ? '...' : ''}"`
        : 'Shared a post',
      createdAt: serverTimestamp(),
      sharedPost: {
        id: post.id,
        imageUrl: post.imageUrl || null,
        thumbnailUrl: post.thumbnailUrl || null,
        caption: post.caption || '',
        authorUsername: post.authorUsername || currentUser.displayName || '',
      }
    });

    // Update conversation metadata
    await updateConversationMetadata(conversationId, currentUser.uid, 'Shared a post');
    
    return { success: true };
  } catch (error) {
    console.error("Error sharing post:", error);
    throw error;
  }
};