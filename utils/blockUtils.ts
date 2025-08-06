import { useAuth } from '@/context/AuthContext';

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

  return {
    isUserBlocked,
    hasUserBlockedMe,
    canInteractWithUser,
    refreshBlockStatus
  };
};