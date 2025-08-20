import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '@/firebaseConfig';
import { onAuthStateChanged, reload, User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { UserProfile, AuthContextType } from '@/types/user';

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
          
          setUserProfile({
            ...userData,
            profileImageUrl: userData.profileImageUrl,
            profileThumbnailUrl: userData.profileThumbnailUrl,
            emailVerified: currentUser.emailVerified,
          } as UserProfile);
        }
      } catch (error) {
        console.error("Error refreshing user profile:", error);
      }
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
            
            setUserProfile({
              ...userData,
              profileImageUrl: userData.profileImageUrl,
              profileThumbnailUrl: userData.profileThumbnailUrl,
              emailVerified: user.emailVerified,
            } as UserProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    
    return unsubscribe;
  }, []);

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