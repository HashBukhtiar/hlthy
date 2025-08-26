import { auth, db } from '@/firebaseConfig';
import { createUserWithEmailAndPassword, sendEmailVerification, reload, deleteUser, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
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

export class SignupService {
  /**
   * Store signup data temporarily and send verification email
   */
  static async initiatePendingSignup(signupData: Omit<PendingSignupData, 'timestamp'>): Promise<void> {
    try {
      // Clean up any existing unverified account first
      await this.cleanupAnyExistingUnverifiedAccount();
      
      // Store signup data with timestamp
      const pendingData: PendingSignupData = {
        ...signupData,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(pendingData));
      
      // Create temporary account just to send verification email
      const userCredential = await createUserWithEmailAndPassword(auth, signupData.email, signupData.password);
      const user = userCredential.user;
      
      // Send verification email
      await sendEmailVerification(user);
      
      console.log('[SignupService] Verification email sent to:', signupData.email);
    } catch (error: any) {
      // Clean up stored data if account creation fails
      await this.clearPendingSignupData();
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

      // Create Firestore user profile
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
        emailVerified: true, // Set to true since we just verified it
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
      await AsyncStorage.removeItem(PENDING_SIGNUP_KEY);
      
      // If there's an unverified user, delete the Firebase Auth account
      const user = auth.currentUser;
      if (user && !user.emailVerified) {
        console.log('[SignupService] Deleting unverified Firebase Auth account:', user.uid);
        await deleteUser(user);
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
   * Resend verification email for pending signup
   */
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
        await deleteUser(user);
      }
    } catch (error) {
      // It's okay if this fails - might mean no user or already signed out
      console.log('[SignupService] No existing unverified account to clean up');
    }
  }
}
