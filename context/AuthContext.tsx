import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { auth } from '@/firebaseConfig';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { AuthContextType } from '@/types/user';
import { NotificationService } from '@/services/NotificationService';
import { NotificationBootstrap } from '@/features/notifications/ui/NotificationBootstrap';
import { useProfile } from '@/features/auth/ui/useProfile';
import { logger } from '@/shared/utils/logger';

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFromSignup, setIsFromSignup] = useState<boolean>(false);

  const { userProfile, loadingProfile, fetchProfile, clearProfile } = useProfile();

  const refreshUserProfile = useCallback(async () => {
    if (currentUser) {
      await fetchProfile(currentUser);
    }
  }, [currentUser, fetchProfile]);

  useEffect(() => {
    logger.debug('AuthContext', 'Setting up onAuthStateChanged listener');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      logger.debug('AuthContext', 'onAuthStateChanged fired', { uid: user?.uid ?? 'null' });
      setCurrentUser(user);

      if (user) {
        await fetchProfile(user);
      } else {
        logger.debug('AuthContext', 'No user, clearing state');
        clearProfile();
        setIsFromSignup(false);
      }

      logger.debug('AuthContext', 'Setting loading to false');
      setLoading(false);
    });

    return unsubscribe;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      logger.error('AuthContext', 'Error during logout', error);
      // Force sign out even if token cleanup fails
      await signOut(auth);
    }
  };

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading: loading || loadingProfile,
    refreshUserProfile,
    isFromSignup,
    setIsFromSignup,
  };

  return (
    <AuthContext.Provider value={value}>
      <NotificationBootstrap />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
