import { ImageSourcePropType } from 'react-native';
import { ref, deleteObject } from 'firebase/storage';
import { storage, db } from '@/firebaseConfig';
import { doc, deleteDoc } from 'firebase/firestore';
import hlthyLogo from '@/assets/images/icon.png';

const DEFAULT_PROFILE_IMAGE = 'https://thumbs.dreamstime.com/b/creative-illustration-default-avatar-profile-placeholder-isolated-background-art-design-grey-photo-blank-template-mockup-144855718.jpg';

/**
 * Gets the appropriate image URL, preferring thumbnail over original, with a fallback to a default.
 * @param thumbnailUrl - The thumbnail URL from Firestore
 * @param originalUrl - The original image URL
 * @returns The URL to use for display. Returns a default image if none are provided.
 */
export const getOptimalImageUrl = (
  thumbnailUrl?: string | null,
  originalUrl?: string | null
): string => {
  const thumb = thumbnailUrl?.trim();
  const orig = originalUrl?.trim();
  if (thumb) return thumb;
  if (orig) return orig;
  return DEFAULT_PROFILE_IMAGE;
};

export const getCoverImageSource = (
  thumbnailUrl?: string | null,
  originalUrl?: string | null
): ImageSourcePropType => {
  if (thumbnailUrl?.trim())  return { uri: thumbnailUrl };
  if (originalUrl?.trim())   return { uri: originalUrl };
  return hlthyLogo;
}

/**
 * Gets the storage bucket name from the Firebase config
 * @returns The storage bucket name
 */
const getStorageBucketName = (): string => {
  // Get the bucket name from the storage instance
  const bucketName = storage.app.options.storageBucket;
  if (!bucketName) {
    throw new Error('Storage bucket not configured in Firebase config');
  }
  return bucketName;
};

/**
 * Extracts the file path from a Firebase Storage URL
 * @param imageUrl - The Firebase Storage URL
 * @returns The decoded file path or null if not recognized
 */
const extractFilePathFromUrl = (imageUrl: string): string | null => {
  try {
    const bucketName = getStorageBucketName();
    
    // Handle both possible URL formats
    const oldBaseUrl = 'https://firebasestorage.googleapis.com/v0/b/';
    const newBaseUrl = `https://${bucketName.replace('.appspot.com', '.firebasestorage.app')}/`;
    
    let decodedPath = '';
    
    if (imageUrl.includes(oldBaseUrl)) {
      // Handle old format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/path?...
      const pathStart = imageUrl.indexOf('/o/') + 3;
      const pathEnd = imageUrl.indexOf('?');
      if (pathStart === -1 || pathEnd === -1) {
        console.warn('Invalid old format URL structure');
        return null;
      }
      const encodedPath = imageUrl.substring(pathStart, pathEnd);
      decodedPath = decodeURIComponent(encodedPath);
    } else if (imageUrl.includes(newBaseUrl)) {
      // Handle new format: https://{bucket}/v0/b/{bucket}/o/path?...
      const pathStart = imageUrl.indexOf('/o/') + 3;
      const pathEnd = imageUrl.indexOf('?');
      if (pathStart === -1 || pathEnd === -1) {
        console.warn('Invalid new format URL structure');
        return null;
      }
      const encodedPath = imageUrl.substring(pathStart, pathEnd);
      decodedPath = decodeURIComponent(encodedPath);
    } else {
      console.warn('URL format not recognized:', imageUrl);
      return null;
    }
    
    return decodedPath;
  } catch (error) {
    console.error('Error extracting file path from URL:', error);
    return null;
  }
};

/**
 * Deletes an image and its thumbnail from Firebase Storage
 * @param imageUrl - The URL of the image to delete
 */
export const deleteImageFromStorage = async (imageUrl: string): Promise<void> => {
  if (!imageUrl) return;
  
  try {
    const decodedPath = extractFilePathFromUrl(imageUrl);
    if (!decodedPath) {
      console.log('Could not extract file path from URL, skipping deletion');
      return;
    }
    
    // Delete original image
    try {
      const imageRef = ref(storage, decodedPath);
      await deleteObject(imageRef);
      console.log(`Successfully deleted original image: ${decodedPath}`);
    } catch (imageError: any) {
      if (imageError.code === 'storage/object-not-found') {
        console.log(`Original image not found (may have been already deleted): ${decodedPath}`);
      } else {
        console.error("Error deleting original image:", imageError);
        throw imageError;
      }
    }
    
    // Delete thumbnail if it exists
    const pathParts = decodedPath.split('/');
    const fileName = pathParts[pathParts.length - 1];
    
    if (!fileName.startsWith('thumb_')) {
      const thumbFileName = `thumb_${fileName}`;
      const thumbPath = decodedPath.replace(fileName, thumbFileName);
      
      try {
        const thumbRef = ref(storage, thumbPath);
        await deleteObject(thumbRef);
        console.log(`Successfully deleted thumbnail: ${thumbPath}`);
      } catch (thumbError: any) {
        if (thumbError.code === 'storage/object-not-found') {
          console.log(`Thumbnail not found (may not exist or already deleted): ${thumbPath}`);
        } else {
          console.log("Error deleting thumbnail (non-critical):", thumbError);
        }
      }
    }
  } catch (error) {
    console.error("Error deleting image from storage:", error);
    // Don't throw error for storage deletion failures - continue with other deletions
  }
};

/**
 * Deletes multiple images from storage
 * @param imageUrls - Array of image URLs to delete
 */
export const deleteImagesFromStorage = async (imageUrls: string[]): Promise<void> => {
  const deletePromises = imageUrls.filter(url => url).map(url => deleteImageFromStorage(url));
  await Promise.allSettled(deletePromises);
};

/**
 * Deletes a milestone and its associated data from Firestore
 * @param milestoneId - The ID of the milestone to delete
 */
export const deleteMilestoneFromFirestore = async (milestoneId: string): Promise<void> => {
  try {
    const milestoneDocRef = doc(db, 'milestones', milestoneId);
    await deleteDoc(milestoneDocRef);
    console.log(`Successfully deleted milestone: ${milestoneId}`);
  } catch (error: any) {
    if (error.code === 'not-found') {
      console.log(`Milestone not found (may have been already deleted): ${milestoneId}`);
    } else {
      console.error('Error deleting milestone from Firestore:', error);
      throw error;
    }
  }
};

/**
 * Deletes a post completely including images and optionally milestone
 * @param postId - The ID of the post to delete
 * @param imageUrl - The URL of the post's image
 * @param deleteMilestone - Whether to delete the associated milestone
 * @param milestoneId - The ID of the milestone to delete (if deleteMilestone is true)
 */
export const deletePostCompletely = async (
  postId: string, 
  imageUrl?: string, 
  deleteMilestone: boolean = false,
  milestoneId?: string
): Promise<void> => {
  try {
    // Delete images from storage (handles missing images gracefully)
    if (imageUrl) {
      await deleteImageFromStorage(imageUrl);
    }
    
    // Delete milestone if requested
    if (deleteMilestone && milestoneId) {
      await deleteMilestoneFromFirestore(milestoneId);
    }
    
    // Delete the post document from Firestore
    try {
      const postDocRef = doc(db, 'posts', postId);
      await deleteDoc(postDocRef);
      console.log(`Successfully deleted post document: ${postId}`);
    } catch (postError: any) {
      if (postError.code === 'not-found') {
        console.log(`Post document not found (may have been already deleted): ${postId}`);
      } else {
        console.error('Error deleting post document:', postError);
        throw postError;
      }
    }
    
    console.log(`Post ${postId} deleted completely`);
  } catch (error) {
    console.error('Error deleting post completely:', error);
    throw error;
  }
};