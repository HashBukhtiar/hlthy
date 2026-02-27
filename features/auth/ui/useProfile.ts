import { useState, useCallback } from 'react';
import { User, reload } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { UserProfile } from '@/types/user';
import { logger } from '@/shared/utils/logger';

interface UseProfileResult {
  userProfile: UserProfile | null;
  loadingProfile: boolean;
  /**
   * Fetch the Firestore profile for the given user.
   * Accepts the user as an explicit argument (not via closure) so it can be called
   * safely from onAuthStateChanged before React state has propagated.
   */
  fetchProfile: (targetUser: User) => Promise<void>;
  /** Reset profile to null on sign-out. */
  clearProfile: () => void;
}

export function useProfile(): UseProfileResult {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const fetchProfile = useCallback(async (targetUser: User): Promise<void> => {
    setLoadingProfile(true);
    try {
      await reload(targetUser);
      const userDoc = await getDoc(doc(db, 'users', targetUser.uid));

      if (!userDoc.exists()) {
        setUserProfile(null);
        return;
      }

      const userData = userDoc.data();

      // Sync email verification: if Firebase Auth is verified but Firestore is not,
      // update Firestore. Never downgrade from Firestore-verified to Auth-unverified —
      // this guards the dev-bypass flow and edge cases.
      if (targetUser.emailVerified && !userData.emailVerified) {
        await updateDoc(doc(db, 'users', targetUser.uid), {
          emailVerified: true,
          lastModified: new Date().toISOString(),
        });
        userData.emailVerified = true;
      }

      const finalEmailVerified = userData.emailVerified || targetUser.emailVerified;

      setUserProfile({
        uid: userDoc.id,
        ...userData,
        profileImageUrl: userData.profileImageUrl,
        profileThumbnailUrl: userData.profileThumbnailUrl,
        emailVerified: finalEmailVerified,
      } as UserProfile);

      logger.debug('useProfile', 'Profile loaded', { uid: targetUser.uid });
    } catch (error) {
      logger.error('useProfile', 'Failed to load profile', error);
      setUserProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const clearProfile = useCallback((): void => {
    setUserProfile(null);
  }, []);

  return { userProfile, loadingProfile, fetchProfile, clearProfile };
}
