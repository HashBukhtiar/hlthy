import { ref, uploadBytesResumable } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '@/firebaseConfig';

/**
 * Uploads a profile image and lets the Cloud Function generate the thumbnail.
 * 
 * Flow:
 * 1. Upload original image WITHOUT thumb_ prefix
 * 2. Cloud Function (generateProfileThumbnail) triggers and creates thumbnail
 * 3. Cloud Function updates profileThumbnailUrl in Firestore
 * 4. This function updates profileImageUrl with the original image URL
 * 
 * @param userId - The user's ID
 * @param fileBlob - The image blob to upload
 * @returns The public URL of the original uploaded image
 */
export async function uploadProfileImage(
  userId: string,
  fileBlob: Blob
): Promise<string> {
  // Upload WITHOUT thumb_ prefix so Cloud Function processes it
  const timestamp = Date.now();
  const fileName = `profile_${timestamp}.jpg`;
  const filePath = `profileImages/${userId}/${fileName}`;
  const imageRef = ref(storage, filePath);
  
  await uploadBytesResumable(imageRef, fileBlob, {
    contentType: 'image/jpeg',
    cacheControl: 'public,max-age=31536000',
    customMetadata: {
      makePublic: 'true' // Signal to Cloud Function
    }
  });
  
  // Construct permanent public URL (matches Cloud Function format)
  const bucketName = storage.app.options.storageBucket;
  const encodedPath = encodeURIComponent(filePath);
  const publicUrl = `https://storage.googleapis.com/${bucketName}/${encodedPath}`;
  
  // Update the profileImageUrl (Cloud Function will set profileThumbnailUrl)
  await updateDoc(doc(db, 'users', userId), {
    profileImageUrl: publicUrl
  });
  
  return publicUrl;
}

/**
 * @deprecated Use uploadProfileImage instead. This function is kept for backwards compatibility.
 */
export async function uploadProfileThumbnail(
  userId: string,
  fileBlob: Blob
): Promise<string> {
  return uploadProfileImage(userId, fileBlob);
}