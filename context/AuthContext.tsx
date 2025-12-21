import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '@/firebaseConfig';
import { onAuthStateChanged, reload, User, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { UserProfile, AuthContextType } from '@/types/user';
import { NotificationService } from '@/services/NotificationService';

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isFromSignup, setIsFromSignup] = useState<boolean>(false);

  
    const refreshUserProfile = async () => {
      if (currentUser) {
        try {
          // Reload user to get latest email verification status
          await reload(currentUser);

          const userDoc = await getDoc(doc(db, "users", currentUser.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();

            // Only update Firestore when Auth is verified (true) and Firestore is not yet
            if (currentUser.emailVerified && !userData.emailVerified) {
              await updateDoc(doc(db, "users", currentUser.uid), {
                emailVerified: true,
                lastModified: new Date().toISOString(),
              });
              userData.emailVerified = true;
            }

            // Use the Firestore value for emailVerified (don't overwrite with Auth false)
            const finalEmailVerified = userData.emailVerified || currentUser.emailVerified;

            setUserProfile({
              uid: userDoc.id,
              ...userData,
              profileImageUrl: userData.profileImageUrl,
              profileThumbnailUrl: userData.profileThumbnailUrl,
              emailVerified: finalEmailVerified,
            } as UserProfile);

            // Initialize notifications if they weren't initialized yet
            await initializeNotifications(currentUser, true);
          } else {
            setUserProfile(null);
          }
        } catch (error) {
          console.error("Error refreshing user profile:", error);
          setUserProfile(null);
        }
      }
    };

  // Initialize notifications for authenticated user
  const initializeNotifications = async (user: User, userDocExists: boolean) => {
    if (!user?.uid) return;

    // Only initialize notifications if the user document exists in Firestore
    // This prevents race conditions during signup where the auth user exists
    // but the Firestore document hasn't been created yet
    if (!userDocExists) {
      return;
    }

    try {
      // Set up notification channels first (Android)
      await NotificationService.setupNotificationChannels();
      
      // Register for push notifications
      const success = await NotificationService.registerForPushNotifications(user.uid);
      if (success) {
        // push notifications registered
      }

      // Set up notification listeners
      const listeners = NotificationService.setupNotificationListeners();
      
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      
      
      setCurrentUser(user);
      if (user) {
  // Reload user to get latest email verification status
  await reload(user);
        
        // Fetch user profile data
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // For email verification status:
            // - If Firebase Auth says verified (true), update Firestore to match
            // - If Firebase Auth says not verified (false) but Firestore says verified (true),
            //   trust Firestore (this handles dev bypass and other edge cases)
            // - Only update Firestore when Auth is verified and Firestore isn't yet
            if (user.emailVerified && !userData.emailVerified) {
              await updateDoc(doc(db, "users", user.uid), {
                emailVerified: true,
                lastModified: new Date().toISOString(),
              });
              userData.emailVerified = true;
            }
            
            // Use the Firestore value for emailVerified (don't overwrite with Auth)
            const finalEmailVerified = userData.emailVerified || user.emailVerified;
            
            
            
            setUserProfile({
              uid: userDoc.id, // Use 'uid' instead of 'id' to match UserProfile type
              ...userData,
              profileImageUrl: userData.profileImageUrl,
              profileThumbnailUrl: userData.profileThumbnailUrl,
              emailVerified: finalEmailVerified,
            } as UserProfile);
          } else {
            // User exists in Auth but not in Firestore yet (e.g., during signup flow)
            
            setUserProfile(null);
          }

          // Initialize notifications after user data is loaded
          // Only if the user document exists (userDoc.exists() was true)
          await initializeNotifications(user, userDoc.exists());
          
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // Don't set user profile on error, keep it null
          setUserProfile(null);
        }
      } else {
        // User signed out - clean up
        setCurrentUser(null);
        setUserProfile(null);
        setIsFromSignup(false); // Clear signup flag on sign out
        // Note: Don't try to clean tokens here as user is already signed out
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      // Clean up notifications BEFORE signing out (while still authenticated)
      if (currentUser) {
        await NotificationService.removePushToken(currentUser.uid);
        await NotificationService.clearCachedTokens();
      }
      
      // Then sign out
      await signOut(auth);
    } catch (error) {
      console.error('Error during logout:', error);
      // Force sign out even if token cleanup fails
      await signOut(auth);
    }
  };

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    refreshUserProfile,
    isFromSignup,
    setIsFromSignup
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}