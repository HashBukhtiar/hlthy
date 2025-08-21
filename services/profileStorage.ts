import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '@/firebaseConfig';

export async function uploadProfileThumbnail(
  userId: string,
  fileBlob: Blob
): Promise<string> {
  const thumbRef = ref(storage, `profileImages/${userId}/thumb_${Date.now()}.jpg`);
  await uploadBytesResumable(thumbRef, fileBlob, {
    cacheControl: 'public,max-age=31536000'
  });
  const downloadUrl = await getDownloadURL(thumbRef);
  await updateDoc(doc(db, 'users', userId), {
    profileThumbnailUrl: downloadUrl
  });
  return downloadUrl;
}