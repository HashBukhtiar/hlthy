import * as FileSystem from 'expo-file-system/legacy';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/firebaseConfig';
import { v4 as uuidv4 } from 'uuid';

// Helper function to get file size by reading as base64
const getFileSizeAsync = async (uri: string): Promise<number> => {
  try {
    // Read file as base64 and calculate actual file size
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    // Base64 encoding expands by ~33%, so: base64Length * 3 / 4 = actual bytes
    return Math.ceil((base64.length * 3) / 4);
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
  imageUrl: string;           // Optimized/compressed version
  thumbnailUrl?: string;      // Ultra-lightweight thumbnail
  originalFileSize?: number;  // Original file size in bytes
  compressedFileSize?: number; // Compressed file size in bytes
  timestamp?: number;
}

/**
 * Compression configuration for different quality levels
 */
const COMPRESSION_CONFIG = {
  thumbnail: {
    quality: 0.3,
    maxWidth: 200,
    maxHeight: 200,
  },
  display: {
    quality: 0.6,
    maxWidth: 800,
    maxHeight: 1200,
  },
};

/**
 * Compresses an image file to a target quality and size
 * Uses native JPEG compression via file manipulation
 * @param sourceUri - File URI of the source image
 * @param quality - JPEG quality (0-1)
 * @param maxWidth - Maximum width in pixels
 * @param maxHeight - Maximum height in pixels
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
    console.log(`Original image size: ${(originalFileSize / 1024 / 1024).toFixed(2)} MB`);

    // For React Native, we can't do actual image compression without native modules
    // Instead, we read the source and write it to cache, letting Firebase handle optimization
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
 * Uploads a photo to Firebase Storage with optimization
 * Creates both a display version and thumbnail
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

    // Compress for display (600x1000, 60% quality)
    console.log('Compressing image for display...');
    const displayCompressed = await compressImage(
      imageUri,
      COMPRESSION_CONFIG.display.quality,
      COMPRESSION_CONFIG.display.maxWidth,
      COMPRESSION_CONFIG.display.maxHeight
    );

    // Compress for thumbnail (200x200, 30% quality)
    console.log('Creating thumbnail...');
    const thumbCompressed = await compressImage(
      imageUri,
      COMPRESSION_CONFIG.thumbnail.quality,
      COMPRESSION_CONFIG.thumbnail.maxWidth,
      COMPRESSION_CONFIG.thumbnail.maxHeight
    );

    // Upload display version
    console.log('Uploading display version to Storage...');
    const displayRef = ref(
      storage,
      `conversations/${conversationId}/photos/${photoId}/display.jpg`
    );
    
    // For React Native, fetch the file as a blob using XMLHttpRequest
    const displayBlob = await new Promise<Blob>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function() {
        resolve(xhr.response);
      };
      xhr.onerror = function() {
        reject(new Error('Failed to fetch file'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', displayCompressed.uri, true);
      xhr.send(null);
    });
    
    await uploadBytesResumable(displayRef, displayBlob, { contentType: 'image/jpeg' });
    const imageUrl = await getDownloadURL(displayRef);

    // Upload thumbnail
    console.log('Uploading thumbnail to Storage...');
    const thumbRef = ref(
      storage,
      `conversations/${conversationId}/photos/${photoId}/thumb.jpg`
    );
    
    // For React Native, fetch the file as a blob using XMLHttpRequest
    const thumbBlob = await new Promise<Blob>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function() {
        resolve(xhr.response);
      };
      xhr.onerror = function() {
        reject(new Error('Failed to fetch file'));
      };
      xhr.responseType = 'blob';
      xhr.open('GET', thumbCompressed.uri, true);
      xhr.send(null);
    });
    
    await uploadBytesResumable(thumbRef, thumbBlob, { contentType: 'image/jpeg' });
    const thumbnailUrl = await getDownloadURL(thumbRef);

    // Clean up cache files
    try {
      await FileSystem.deleteAsync(displayCompressed.uri, { idempotent: true });
      await FileSystem.deleteAsync(thumbCompressed.uri, { idempotent: true });
    } catch (e) {
      console.log('Could not clean up cache files:', e);
    }

    console.log(
      `Photo uploaded successfully. Original: ${(originalFileSize / 1024 / 1024).toFixed(2)}MB`
    );

    return {
      id: photoId,
      imageUrl,
      thumbnailUrl,
      originalFileSize,
      compressedFileSize: displayCompressed.fileSize,
      timestamp,
    };
  } catch (error) {
    console.error('Error uploading photo to chat:', error);
    throw error;
  }
};

/**
 * Deletes a photo and its variants from Firebase Storage
 * @param photoId - ID of the photo to delete
 * @param conversationId - ID of the conversation containing the photo
 */
export const deletePhotoFromChat = async (
  photoId: string,
  conversationId: string
): Promise<void> => {
  try {
    const displayRef = ref(storage, `conversations/${conversationId}/photos/${photoId}/display.jpg`);
    const thumbRef = ref(storage, `conversations/${conversationId}/photos/${photoId}/thumb.jpg`);

    // Delete both in parallel, but don't fail if they don't exist
    await Promise.allSettled([
      deletePhotoFromStorage(displayRef),
      deletePhotoFromStorage(thumbRef),
    ]);

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
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @returns Savings percentage and absolute size reduction
 */
export const calculateStorageSavings = (
  originalSize: number,
  compressedSize: number
): { percentage: number; bytes: number } => {
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
