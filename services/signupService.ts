import { auth, db, functions } from '@/firebaseConfig';
import { createUserWithEmailAndPassword, sendEmailVerification, reload, deleteUser, signOut } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { devFlags } from '@/config/devFlags';

interface PendingSignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  dateOfBirth: string;
  archetype: string;
  timestamp: number;
}

const PENDING_SIGNUP_KEY = 'pendingSignupData';
const SIGNUP_EXPIRY_HOURS = 24; // Expire pending signups after 24 hours

export class SignupService {
  /**
   * Check if username is already taken
   */
  private static async isUsernameTaken(username: string): Promise<boolean> {
    try {
      const usersPublicRef = collection(db, 'usersPublic');
      const q = query(usersPublicRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('[SignupService] Error checking username availability:', error);
      // If we can't check, assume it's taken to be safe
      throw new Error('Unable to verify username availability. Please try again.');
    }
  }

  /**
   * Store signup data temporarily and send verification email
   */
  static async initiatePendingSignup(signupData: Omit<PendingSignupData, 'timestamp'>): Promise<void> {
    try {
      // Check if username is already taken BEFORE creating any Firebase account
      console.log('[SignupService] Checking username availability:', signupData.username);
      const usernameTaken = await this.isUsernameTaken(signupData.username);
      
      if (usernameTaken) {
        console.log('[SignupService] Username already taken:', signupData.username);
        const usernameError = new Error('This username is already taken. Please choose a different username.');
        (usernameError as any).code = 'auth/username-already-in-use';
        throw usernameError;
      }
      
      console.log('[SignupService] Username available:', signupData.username);
      
      // Clean up any existing unverified account first
      await this.cleanupAnyExistingUnverifiedAccount();
      
      // Store signup data with timestamp - no Firebase account created yet
      const pendingData: PendingSignupData = {
        ...signupData,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(pendingData));
      
      // Create temporary account just to send verification email
      const userCredential = await createUserWithEmailAndPassword(auth, signupData.email, signupData.password);
      const user = userCredential.user;
      console.log('[SignupService] initiatePendingSignup: created auth user uid=', user?.uid, 'email=', signupData.email);

      // Send verification email
      await sendEmailVerification(user);

      // Create usersPublic document immediately with isVerified=false
      try {
        await setDoc(doc(db, 'usersPublic', user.uid), {
          uid: user.uid,
          username: signupData.username,
          isVerified: false,
        });
        console.log('[SignupService] usersPublic created with isVerified:false for uid=', user.uid);

        // Schedule a Cloud Task to run the cleanup handler in 5 minutes
        // Skip scheduling if bypass flag is enabled (dev mode)
        if (!devFlags.bypassEmailVerification) {
          try {
            const scheduleFn = httpsCallable(functions, 'scheduleCleanupTask');
            const result = await scheduleFn({ uid: user.uid, delaySeconds: 5 * 60 });
            console.log('[SignupService] Scheduled cleanup task for uid=', user.uid, 'result:', result);
          } catch (taskErr: any) {
            console.error('[SignupService] Failed to schedule cleanup task:', taskErr);
            console.error('[SignupService] Error code:', taskErr.code);
            console.error('[SignupService] Error message:', taskErr.message);
            console.error('[SignupService] Error details:', taskErr.details);
            // Don't throw - account creation succeeded, just log the error
          }
        } else {
          console.log('[SignupService] DEV: Skipping cleanup task scheduling (bypass flag enabled)');
        }
      } catch (err) {
        console.warn('[SignupService] Failed to create usersPublic at signup time:', err);
      }

      console.log('[SignupService] Verification email sent to:', signupData.email);
    } catch (error: any) {
      // Clean up stored data if account creation fails
      await AsyncStorage.removeItem(PENDING_SIGNUP_KEY);
      
      // If account was created but email sending failed, try to delete it
      const user = auth.currentUser;
      if (user && !user.emailVerified) {
        await this.safelyCleanupUnverifiedAccount(user);
        console.log('[SignupService] Cleaned up after failed account creation');
      }
      
      // Transform Firebase error codes into user-friendly messages
      if (error.code === 'auth/email-already-in-use') {
        console.log('[SignupService] Email already in use, throwing user-friendly error');
        const friendlyError = new Error('This email is already registered. Please use a different email or try logging in.');
        (friendlyError as any).code = 'auth/email-already-in-use';
        throw friendlyError;
      }
      
      if (error.code === 'auth/username-already-in-use') {
        // Username error already has user-friendly message, just re-throw
        throw error;
      }
      
      // Log other errors as errors since they're unexpected
      console.error('[SignupService] Error initiating pending signup:', error);
      throw error;
    }
  }

  /**
   * Get pending signup data
   */
  static async getPendingSignupData(): Promise<PendingSignupData | null> {
    try {
      const storedData = await AsyncStorage.getItem(PENDING_SIGNUP_KEY);
      if (!storedData) return null;

      const pendingData: PendingSignupData = JSON.parse(storedData);
      
      // Check if data has expired
      const hoursElapsed = (Date.now() - pendingData.timestamp) / (1000 * 60 * 60);
      if (hoursElapsed > SIGNUP_EXPIRY_HOURS) {
        console.log('[SignupService] Pending signup data expired, cleaning up');
        await this.clearPendingSignupData();
        return null;
      }

      return pendingData;
    } catch (error) {
      console.error('[SignupService] Error getting pending signup data:', error);
      return null;
    }
  }

  /**
   * Complete the signup process after email verification
   */
  static async completePendingSignup(): Promise<void> {
    try {
      const pendingData = await this.getPendingSignupData();
      if (!pendingData) {
        throw new Error('No pending signup data found');
      }

      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }

      // Reload user to check verification status
      await reload(user);
      
      if (!user.emailVerified) {
        throw new Error('Email not verified');
      }

      // Mark usersPublic as verified so the scheduled cleanup will skip it
      try {
        await setDoc(doc(db, 'usersPublic', user.uid), { isVerified: true }, { merge: true });
        console.log('[SignupService] usersPublic marked as verified for uid=', user.uid);
      } catch (err) {
        console.error('[SignupService] CRITICAL: Failed to mark usersPublic as verified:', err);
        // Don't throw - continue to create users document
      }

      // Create Firestore user profile (full profile creation)
      console.log('[SignupService] Creating users document for uid=', user.uid);
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: pendingData.email,
          firstName: pendingData.firstName,
          lastName: pendingData.lastName,
          username: pendingData.username,
          dateOfBirth: pendingData.dateOfBirth,
          archetype: pendingData.archetype,
          version: 1,
          units: {weight: "metric", distance: "metric"},
          notifications: {
            mentionedInReplies: true, 
            likesAndComments: true, 
            taggedInComments: true, 
            directMessages: true, 
            newFollowers: true, 
            followRequestAccepted: true
          },
          messagePermission: 'everyone',
          profileVisibility: 'public',
          createdAt: serverTimestamp(),
          lastModified: serverTimestamp(),
          language: 'en',
          followPermission: 'anyone',
          followerCount: 0,
          followingCount: 0,
          postCount: 0,
          workoutCount: 0,
          milestoneCount: 0,
          displayName: `${pendingData.firstName} ${pendingData.lastName}`,
          commentPermission: 'everyone',
          theme: 'dark',
          twoFactorEnabled: false,
          analytics: {lastSeen: serverTimestamp()},
          latestPRs: {},
          bio: '',
          emailVerified: true,
          profileImageUrl: '',
          profileThumbnailUrl: null,
          blockedUsers: [],
          stats: {
            followerCount: 0,
            followingCount: 0,
            postCount: 0,
            workoutCount: 0,
            milestoneCount: 0
          }
        });
        console.log('[SignupService] Successfully created users document for uid=', user.uid);
      } catch (err) {
        console.error('[SignupService] CRITICAL ERROR: Failed to create users document:', err);
        console.error('[SignupService] Error details:', {
          code: (err as any)?.code,
          message: (err as any)?.message,
          stack: (err as any)?.stack,
        });
        throw new Error(`Failed to create user profile: ${(err as any)?.message || 'Unknown error'}`);
      }

      // Update usersPublic document with merge to preserve isVerified
      await setDoc(doc(db, 'usersPublic', user.uid), {
        uid: user.uid,
        username: pendingData.username,
        isVerified: true,
      }, { merge: true });

      // Clear pending signup data
      await this.clearPendingSignupData();

      console.log('[SignupService] Signup completed successfully for user:', user.uid);
    } catch (error) {
      console.error('[SignupService] Error completing pending signup:', error);
      throw error;
    }
  }

  /**
   * DEV ONLY: Bypass email verification and complete signup
   * This treats the account as if the email was verified, keeping it in Firebase Auth
   * and completing the full signup process (creating users and usersPublic documents)
   */
  static async bypassEmailVerification(): Promise<void> {
    if (!devFlags.bypassEmailVerification) {
      throw new Error('Email verification bypass is not enabled');
    }

    try {
      const pendingData = await this.getPendingSignupData();
      if (!pendingData) {
        throw new Error('No pending signup data found');
      }

      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }

      console.log('[SignupService] DEV: Bypassing email verification for uid=', user.uid);

      // Mark usersPublic as verified (same as if email was verified)
      try {
        await setDoc(doc(db, 'usersPublic', user.uid), { isVerified: true }, { merge: true });
        console.log('[SignupService] DEV: usersPublic marked as verified for uid=', user.uid);
      } catch (err) {
        console.error('[SignupService] CRITICAL: Failed to mark usersPublic as verified:', err);
        // Don't throw - continue to create users document
      }

      // Create Firestore user profile (full profile creation - same as completePendingSignup)
      console.log('[SignupService] DEV: Creating users document for uid=', user.uid);
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: pendingData.email,
          firstName: pendingData.firstName,
          lastName: pendingData.lastName,
          username: pendingData.username,
          dateOfBirth: pendingData.dateOfBirth,
          archetype: pendingData.archetype,
          version: 1,
          units: {weight: "metric", distance: "metric"},
          notifications: {
            mentionedInReplies: true, 
            likesAndComments: true, 
            taggedInComments: true, 
            directMessages: true, 
            newFollowers: true, 
            followRequestAccepted: true
          },
          messagePermission: 'everyone',
          profileVisibility: 'public',
          createdAt: serverTimestamp(),
          lastModified: serverTimestamp(),
          language: 'en',
          followPermission: 'anyone',
          followerCount: 0,
          followingCount: 0,
          postCount: 0,
          workoutCount: 0,
          milestoneCount: 0,
          displayName: `${pendingData.firstName} ${pendingData.lastName}`,
          commentPermission: 'everyone',
          theme: 'dark',
          twoFactorEnabled: false,
          analytics: {lastSeen: serverTimestamp()},
          latestPRs: {},
          bio: '',
          emailVerified: true,
          profileImageUrl: '',
          profileThumbnailUrl: null,
          blockedUsers: [],
          stats: {
            followerCount: 0,
            followingCount: 0,
            postCount: 0,
            workoutCount: 0,
            milestoneCount: 0
          }
        });
        console.log('[SignupService] DEV: Successfully created users document for uid=', user.uid);
      } catch (err) {
        console.error('[SignupService] CRITICAL ERROR: Failed to create users document:', err);
        console.error('[SignupService] Error details:', {
          code: (err as any)?.code,
          message: (err as any)?.message,
          stack: (err as any)?.stack,
        });
        throw new Error(`Failed to create user profile: ${(err as any)?.message || 'Unknown error'}`);
      }

      // Update usersPublic document with merge to preserve isVerified
      await setDoc(doc(db, 'usersPublic', user.uid), {
        uid: user.uid,
        username: pendingData.username,
        isVerified: true,
      }, { merge: true });

      // Clear pending signup data (but keep the Firebase Auth account)
      await AsyncStorage.removeItem(PENDING_SIGNUP_KEY);

      console.log('[SignupService] DEV: Signup bypassed successfully for user:', user.uid);
    } catch (error) {
      console.error('[SignupService] DEV: Error bypassing email verification:', error);
      throw error;
    }
  }

  /**
   * Clear pending signup data and clean up unverified Firebase Auth account
   */
  static async clearPendingSignupData(): Promise<void> {
    try {
      // Check whether we actually had pending signup data.
      // Only attempt to delete the current auth user if the pending signup record existed
      // (i.e. the user arrived here via the Sign Up flow). If no pending signup data
      // existed, this was likely reached from a Login flow — do NOT delete the account.
      const stored = await AsyncStorage.getItem(PENDING_SIGNUP_KEY);
      const hadPending = !!stored;

      // Remove stored pending signup data regardless
      await AsyncStorage.removeItem(PENDING_SIGNUP_KEY);

      if (hadPending) {
        // If there's an unverified user and we had pending signup data, clean it up
        const user = auth.currentUser;
        if (user && !user.emailVerified) {
          console.log('[SignupService] Cleaning up unverified Firebase Auth account:', user.uid);
          await this.safelyCleanupUnverifiedAccount(user);
        }
      } else {
        // No pending signup data — do not delete the account. Leave auth state as-is.
        console.log('[SignupService] No pending signup data found; skipping auth deletion.');
      }
    } catch (error) {
      console.error('[SignupService] Error clearing pending signup data:', error);
    }
  }

  /**
   * Check if there's a pending signup for the current user
   */
  static async hasPendingSignup(): Promise<boolean> {
    const pendingData = await this.getPendingSignupData();
    return pendingData !== null;
  }

  /**
   * Check if the current user account was deleted by the cleanup service
   */
  static async checkIfAccountWasDeleted(): Promise<boolean> {
    try {
      const user = auth.currentUser;
      if (!user) {
        // Don't assume deletion just because auth.currentUser is temporarily null.
        // This can happen during app cold start while the Auth state hydrates.
        console.log('[SignupService] No auth.currentUser available when checking deletion — treating as NOT deleted for now.');
        return false;
      }

      // Try to reload the user to check if account still exists
      await reload(user);
      return false; // Account still exists
    } catch (error: any) {
      // If reload fails with user-not-found or similar, account was deleted
      if (error.code === 'auth/user-not-found' || 
          error.code === 'auth/user-disabled' ||
          error.code === 'auth/invalid-user-token') {
        console.log('[SignupService] Reload failed: user not found/disabled/invalid token — account likely deleted by cleanup service', error);
        return true;
      }
      
      // Other errors might be temporary, don't assume deletion
      console.warn('[SignupService] Error checking account status (treating as not deleted):', error);
      return false;
    }
  }
  static async resendVerificationEmail(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user found');
      }

      await sendEmailVerification(user);
      console.log('[SignupService] Verification email resent to:', user.email);
    } catch (error) {
      console.error('[SignupService] Error resending verification email:', error);
      throw error;
    }
  }

  /**
   * Cancel pending signup and clean up Firebase Auth account
   */
  static async cancelPendingSignup(): Promise<void> {
    try {
      console.log('[SignupService] Canceling pending signup');
      // During pending signup, only Firebase Auth account exists, no Firestore docs yet
      await this.clearPendingSignupData();
    } catch (error) {
      console.error('[SignupService] Error canceling pending signup:', error);
      throw error;
    }
  }

  /**
   * Clean up any existing unverified Firebase Auth account
   */
  private static async cleanupAnyExistingUnverifiedAccount(): Promise<void> {
    try {
      const user = auth.currentUser;
      if (user && !user.emailVerified) {
        console.log('[SignupService] Cleaning up existing unverified account:', user.uid);
        // Only Firebase Auth account exists during pending signup, no Firestore docs to clean
        await this.safelyCleanupUnverifiedAccount(user);
      }
    } catch (error) {
      // It's okay if this fails - might mean no user or already signed out
      console.log('[SignupService] No existing unverified account to clean up');
    }
  }

  /**
   * Safely clean up unverified account - tries deletion, falls back to sign out
   */
  private static async safelyCleanupUnverifiedAccount(user: any): Promise<void> {
    try {
      await deleteUser(user);
      console.log('[SignupService] Successfully deleted unverified account:', user.uid);
    } catch (deleteError: any) {
      if (deleteError.code === 'auth/requires-recent-login') {
        console.log('[SignupService] Account too old to delete, signing out instead');
      } else {
        console.log('[SignupService] Account deletion failed:', deleteError.message);
      }
      await signOut(auth);
    }
  }
}
