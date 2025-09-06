import { auth, db, functions } from '@/firebaseConfig';
import { createUserWithEmailAndPassword, sendEmailVerification, reload, deleteUser, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Initialize cloud functions
// Legacy `registerUnverifiedAccount` and `markAccountVerified` were removed.
// We'll use the per-account cleanup callable when needed.
const cleanupUnverifiedAccountFn = httpsCallable(functions, 'cleanupUnverifiedAccount');

export class SignupService {
  /**
   * Store signup data temporarily and send verification email
   */
  static async initiatePendingSignup(signupData: Omit<PendingSignupData, 'timestamp'>): Promise<void> {
    try {
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

  // No server-side registration required. The client will call the
  // per-account cleanup callable when the countdown expires if needed.

      // Send verification email
      await sendEmailVerification(user);
      
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

  // No server-side mark required. The server-side cleanup is per-account.

      // Create Firestore user profile (full profile creation)
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
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
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
        analytics: {lastSeen: new Date().toISOString()},
        latestPRs: {},
        bio: '',
        emailVerified: true
      });

      // Create usersPublic document
      await setDoc(doc(db, 'usersPublic', user.uid), {
        uid: user.uid,
        username: pendingData.username,
      });

      // Clear pending signup data
      await this.clearPendingSignupData();

      console.log('[SignupService] Signup completed successfully for user:', user.uid);
    } catch (error) {
      console.error('[SignupService] Error completing pending signup:', error);
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
        // If there's an unverified user and we had pending signup data, try to clean it up safely
        const user = auth.currentUser;
        if (user && !user.emailVerified) {
          console.log('[SignupService] Cleaning up unverified Firebase Auth account:', user.uid);
          // Prefer server-side deletion via callable; fallback to local deletion
          try {
            await cleanupUnverifiedAccountFn({ uid: user.uid });
            console.log('[SignupService] Requested server-side cleanup for uid:', user.uid);
          } catch (callErr) {
            console.warn('[SignupService] Server-side cleanup call failed, falling back to local delete:', callErr);
            await this.safelyCleanupUnverifiedAccount(user);
          }
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
