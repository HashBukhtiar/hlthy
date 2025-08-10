import { useAuth } from '@/context/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/firebaseConfig';
import { useCallback, useMemo } from 'react';

export const useBlockEnforcement = () => {
  const { userProfile, refreshUserProfile } = useAuth();

  // Memoize the blocked users array
  const blockedUsers = useMemo(() => {
    return userProfile?.blockedUsers || [];
  }, [userProfile?.blockedUsers]);

  // Memoize the isUserBlocked function
  const isUserBlocked = useCallback((userId: string): boolean => {
    return blockedUsers.includes(userId);
  }, [blockedUsers]);

  // Memoize the hasUserBlockedMe function
  const hasUserBlockedMe = useCallback((userBlockedUsers: string[]): boolean => {
    return userBlockedUsers?.includes(userProfile?.uid || '') || false; 
  }, [userProfile?.uid]);

  // Memoize the canInteractWithUser function
  const canInteractWithUser = useCallback((targetUserId: string, targetUserBlockedUsers?: string[]): boolean => {
    if (!userProfile?.uid) return false;
    
    // Check if I blocked them
    if (isUserBlocked(targetUserId)) return false;
    
    // Check if they blocked me (only if we have their blocked users data)
    if (targetUserBlockedUsers && hasUserBlockedMe(targetUserBlockedUsers)) return false;
    
    return true;
  }, [userProfile?.uid, isUserBlocked, hasUserBlockedMe]);

  // Memoize the refresh function
  const refreshBlockStatus = useCallback(async () => {
    if (refreshUserProfile) {
      await refreshUserProfile();
    }
  }, [refreshUserProfile]);

  // Memoize the cleanup function
  const cleanupBlockedUserActivity = useCallback(async (targetUserId: string) => {
    try {
      const functions = getFunctions(app, 'northamerica-northeast2');
      const cleanupFn = httpsCallable(functions, 'cleanupBlockedUserActivity');
      await cleanupFn({ targetUserId });
      console.log('Activity cleanup completed');
    } catch (error) {
      console.error('Error cleaning up activity:', error);
    }
  }, []);

  return {
    isUserBlocked,
    hasUserBlockedMe,
    canInteractWithUser,
    refreshBlockStatus,
    cleanupBlockedUserActivity,
  };
};