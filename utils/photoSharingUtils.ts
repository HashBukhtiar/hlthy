import * as FileSystem from 'expo-file-system/legacy';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/firebaseConfig';
import { v4 as uuidv4 } from 'uuid';

// Helper function to get file size using metadata (no file read needed)
const getFileSizeAsync = async (uri: string): Promise<number> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
    return fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
  } catch (error) {
    console.error('Error getting file size:', error);
    return 0;
  }
};

/**
 * Photo data structure for sharing in DMs
 */
export interface SharedPhoto {
  id: string;
  imageUrl: string;           // Photo URL
  thumbnailUrl?: string;      // Currently same as imageUrl (no separate thumbnail)
  originalFileSize?: number;  // Original file size in bytes
  compressedFileSize?: number; // Currently same as originalFileSize (no compression)
  timestamp?: number;
}

/**
 * Compresses an image file to a target quality and size
 * NOTE: Currently just copies the file without actual compression.
 * To implement real compression, integrate a native image manipulation library.
 * @param sourceUri - File URI of the source image
 * @param quality - JPEG quality (0-1) - NOT CURRENTLY USED
 * @param maxWidth - Maximum width in pixels - NOT CURRENTLY USED
 * @param maxHeight - Maximum height in pixels - NOT CURRENTLY USED
 * @returns Compressed image URI and file size
 */
export const compressImage = async (
  sourceUri: string,
  quality: number = 0.6,
  maxWidth: number = 800,
  maxHeight: number = 1200
): Promise<{ uri: string; fileSize: number }> => {
  try {
    const filename = sourceUri.split('/').pop() || 'image.jpg';
    const newFilename = `compressed_${Date.now()}_${filename}`;
    const docDir = FileSystem.documentDirectory || '';
    const newPath = `${docDir}${newFilename}`;

    // Read the original file size
    const originalFileSize = await getFileSizeAsync(sourceUri);

    // NOTE: For React Native, we can't do actual image compression without native modules
    // This function currently just copies the file without compression
    // Read source file as base64
    const base64Data = await FileSystem.readAsStringAsync(sourceUri, {
      encoding: 'base64',
    });
    
    // Write to new location
    await FileSystem.writeAsStringAsync(newPath, base64Data, {
      encoding: 'base64',
    });

    const compressedFileSize = await getFileSizeAsync(newPath);
    
    return {
      uri: newPath,
      fileSize: compressedFileSize,
    };
  } catch (error) {
    console.error('Error compressing image:', error);
    // If compression fails, use original
    const fileSize = await getFileSizeAsync(sourceUri);
    return {
      uri: sourceUri,
      fileSize,
    };
  }
};

/**
 * Uploads a photo to Firebase Storage (without compression)
 * @param imageUri - Local URI of the image
 * @param conversationId - ID of the conversation for storage path
 * @param userId - ID of the user uploading
 * @returns SharedPhoto object with URLs and metadata
 */
export const uploadPhotoToChat = async (
  imageUri: string,
  conversationId: string,
  userId: string
): Promise<SharedPhoto> => {
  try {
    const photoId = uuidv4();
    const timestamp = Date.now();

    // Get original file info
    const originalFileSize = await getFileSizeAsync(imageUri);

    // Upload photo to Storage
    const photoRef = ref(
      storage,
      `conversations/${conversationId}/photos/${photoId}/photo.jpg`
    );
    
    // For React Native, fetch the file as a blob using XMLHttpRequest
    const photoBlob = await new Promise<Blob>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function() {
        resolve(xhr.response);
      };
      xhr.onerror = function() {
        reject(new Error('Failed to fetch file'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', imageUri, true);
      xhr.send(null);
    });
    
    await uploadBytesResumable(photoRef, photoBlob, { contentType: 'image/jpeg' });
    const imageUrl = await getDownloadURL(photoRef);

    return {
      id: photoId,
      imageUrl,
      thumbnailUrl: imageUrl, // Use same URL for thumbnail
      originalFileSize,
      compressedFileSize: originalFileSize,
      timestamp,
    };
  } catch (error) {
    console.error('Error uploading photo to chat:', error);
    throw error;
  }
};

/**
 * Deletes a photo from Firebase Storage
 * @param photoId - ID of the photo to delete
 * @param conversationId - ID of the conversation containing the photo
 */
export const deletePhotoFromChat = async (
  photoId: string,
  conversationId: string
): Promise<void> => {
  try {
    const photoRef = ref(storage, `conversations/${conversationId}/photos/${photoId}/photo.jpg`);
    await deletePhotoFromStorage(photoRef);
    console.log(`Photo ${photoId} deleted from chat`);
  } catch (error) {
    console.error('Error deleting photo from chat:', error);
  }
};

/**
 * Helper to delete a single file from storage
 */
const deletePhotoFromStorage = async (storageRef: any): Promise<void> => {
  try {
    await deleteObject(storageRef);
  } catch (error: any) {
    if (error.code !== 'storage/object-not-found') {
      throw error;
    }
  }
};

/**
 * Calculates storage savings from compression
 * NOTE: Currently returns 0 savings since no compression is implemented
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @returns Savings percentage and absolute size reduction
 */
export const calculateStorageSavings = (
  originalSize: number,
  compressedSize: number
): { percentage: number; bytes: number } => {
  if (originalSize <= 0) {
    return { percentage: 0, bytes: 0 };
  }
  const savings = originalSize - compressedSize;
  const percentage = (savings / originalSize) * 100;
  return { percentage, bytes: savings };
};

/**
 * Formats file size for display
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
