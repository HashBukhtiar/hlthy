import { ref, deleteObject } from 'firebase/storage';
import { storage } from '@/firebaseConfig';

/**
 * Gets the appropriate image URL, preferring thumbnail over original
 * @param thumbnailUrl - The thumbnail URL from Firestore
 * @param originalUrl - The original image URL
 * @returns The URL to use for display
 */
export const getOptimalImageUrl = (thumbnailUrl?: string | null, originalUrl?: string | null): string | null => {
  if (thumbnailUrl && thumbnailUrl.trim() !== '') {
    return thumbnailUrl;
  }
  
  if (originalUrl && originalUrl.trim() !== '') {
    return originalUrl;
  }
  
  return null;
};

/**
 * Deletes an image and its thumbnail from Firebase Storage
 * @param imageUrl - The URL of the image to delete
 */
export const deleteImageFromStorage = async (imageUrl: string): Promise<void> => {
  if (!imageUrl) return;
  
  try {
    const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/';
    const bucket = 'hlthy-421200.firebasestorage.app';
    
    if (imageUrl.includes(baseUrl)) {
      const pathStart = imageUrl.indexOf('/o/') + 3;
      const pathEnd = imageUrl.indexOf('?');
      const encodedPath = imageUrl.substring(pathStart, pathEnd);
      const decodedPath = decodeURIComponent(encodedPath);
      
      // Delete original image
      const imageRef = ref(storage, decodedPath);
      await deleteObject(imageRef);
      
      // Delete thumbnail if it exists
      const pathParts = decodedPath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      if (!fileName.startsWith('thumb_')) {
        const thumbFileName = `thumb_${fileName}`;
        const thumbPath = decodedPath.replace(fileName, thumbFileName);
        
        try {
          const thumbRef = ref(storage, thumbPath);
          await deleteObject(thumbRef);
        } catch (thumbError) {
          console.log("Thumbnail may not exist or already deleted:", thumbError);
        }
      }
    }
  } catch (error) {
    console.error("Error deleting image from storage:", error);
    throw error;
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