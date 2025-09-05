import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '@/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
        console.log('Refreshing user profile for user:', currentUser.uid);
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserProfile({
            uid: userDoc.id, // Use 'uid' instead of 'id' to match UserProfile type
            ...userData,
          } as UserProfile);
          
          console.log('Updated blocked users:', userData.blockedUsers);
        }
      } catch (error) {
        console.error("Error refreshing user profile:", error);
      }
    }
  };

  // Initialize notifications for authenticated user
  const initializeNotifications = async (user: User) => {
    try {
      console.log('Initializing notifications for user:', user.uid);
      
      // Register for push notifications
      const success = await NotificationService.registerForPushNotifications(user.uid);
      if (success) {
        console.log('Successfully registered for push notifications');
      } else {
        console.warn('Failed to register for push notifications');
      }

      // Set up notification listeners
      NotificationService.setupNotificationListeners();

      // Update push token (in case it changed)
      await NotificationService.updatePushToken(user.uid);
      
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch user profile data
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserProfile({
              uid: userDoc.id, // Use 'uid' instead of 'id' to match UserProfile type
              ...userData,
            } as UserProfile);
          }

          // Initialize notifications after user data is loaded
          await initializeNotifications(user);
          
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
        // Clean up notifications on logout
        if (currentUser) {
          try {
            await NotificationService.removePushToken(currentUser.uid);
          } catch (error) {
            console.error('Error removing push token on logout:', error);
          }
        }
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, [currentUser]);

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