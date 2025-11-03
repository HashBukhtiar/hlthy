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

  // Function to refresh user profile data
  const refreshUserProfile = async () => {
    if (currentUser) {
      try {
        // Reload user to get latest email verification status
        await reload(currentUser);
        console.log('Reloaded user:', currentUser.uid);
        
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Update email verification status in Firestore if it changed
          if (userData.emailVerified !== currentUser.emailVerified) {
            await updateDoc(doc(db, "users", currentUser.uid), {
              emailVerified: currentUser.emailVerified,
              lastModified: new Date().toISOString(),
            });
            userData.emailVerified = currentUser.emailVerified;
          }
          console.log('Updated blocked users:', userData.blockedUsers);
          
          setUserProfile({
            uid: userDoc.id, // Use 'uid' instead of 'id' to match UserProfile type
            ...userData,
            profileImageUrl: userData.profileImageUrl,
            profileThumbnailUrl: userData.profileThumbnailUrl,
            emailVerified: currentUser.emailVerified,
          } as UserProfile);
        } else {
          console.log("User document not found in Firestore during refresh");
          setUserProfile(null);
        }
      } catch (error) {
        console.error("Error refreshing user profile:", error);
        setUserProfile(null);
      }
    }
  };

  // Initialize notifications for authenticated user
  const initializeNotifications = async (user: User) => {
    if (!user?.uid) return;

    try {
      // Set up notification channels first (Android)
      await NotificationService.setupNotificationChannels();
      
      // Register for push notifications
      const success = await NotificationService.registerForPushNotifications(user.uid);
      if (success) {
        console.log('Push notifications registered successfully');
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
            
            // Update email verification status in Firestore if it changed
            if (userData.emailVerified !== user.emailVerified) {
              await updateDoc(doc(db, "users", user.uid), {
                emailVerified: user.emailVerified,
                lastModified: new Date().toISOString(),
              });
              userData.emailVerified = user.emailVerified;
            }
            console.log('Updated blocked users:', userData.blockedUsers);
            
            setUserProfile({
              uid: userDoc.id, // Use 'uid' instead of 'id' to match UserProfile type
              ...userData,
              profileImageUrl: userData.profileImageUrl,
              profileThumbnailUrl: userData.profileThumbnailUrl,
              emailVerified: user.emailVerified,
            } as UserProfile);
          } else {
            // User exists in Auth but not in Firestore yet (e.g., during signup flow)
            console.log("User document not found in Firestore, user may be in signup process");
            setUserProfile(null);
          }

          // Initialize notifications after user data is loaded
          await initializeNotifications(user);
          
        } catch (error) {
          console.error("Error fetching user profile:", error);
          // Don't set user profile on error, keep it null
          setUserProfile(null);
        }
      } else {
        // User signed out - clean up
        setCurrentUser(null);
        setUserProfile(null);
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
    refreshUserProfile
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