import { useAuth } from '@/context/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/firebaseConfig';

export const useBlockEnforcement = () => {
  const { userProfile, refreshUserProfile } = useAuth();

  const isUserBlocked = (userId: string): boolean => {
    return userProfile?.blockedUsers?.includes(userId) || false;
  };

  const hasUserBlockedMe = (userBlockedUsers: string[]): boolean => {
    return userBlockedUsers?.includes(userProfile?.uid || '') || false; 
  };

  const canInteractWithUser = (targetUserId: string, targetUserBlockedUsers?: string[]): boolean => {
    if (!userProfile?.uid) return false;
    
    // Check if I blocked them
    if (isUserBlocked(targetUserId)) return false;
    
    // Check if they blocked me (only if we have their blocked users data)
    if (targetUserBlockedUsers && hasUserBlockedMe(targetUserBlockedUsers)) return false;
    
    return true;
  };

  // Add refresh capability
  const refreshBlockStatus = async () => {
    if (refreshUserProfile) {
      await refreshUserProfile();
    }
  };

  const cleanupBlockedUserActivity = async (targetUserId: string) => {
    try {
      const functions = getFunctions(app, 'northamerica-northeast2');
      const cleanupFn = httpsCallable(functions, 'cleanupBlockedUserActivity');
      await cleanupFn({ targetUserId });
      console.log('Activity cleanup completed');
    } catch (error) {
      console.error('Error cleaning up activity:', error);
    }
  };

  return {
    isUserBlocked,
    hasUserBlockedMe,
    canInteractWithUser,
    refreshBlockStatus,
    cleanupBlockedUserActivity,
  };
};