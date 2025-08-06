import { useAuth } from '@/context/AuthContext';

export const useBlockEnforcement = () => {
  const { userProfile } = useAuth();

  const isUserBlocked = (userId: string): boolean => {
    return userProfile?.blockedUsers?.includes(userId) || false;
  };

  const hasUserBlockedMe = (userBlockedUsers: string[]): boolean => {
    return userBlockedUsers?.includes(userProfile?.id || '') || false;
  };

  const canInteractWithUser = (targetUserId: string, targetUserBlockedUsers?: string[]): boolean => {
    if (!userProfile?.id) return false;
    
    // Check if I blocked them
    if (isUserBlocked(targetUserId)) return false;
    
    // Check if they blocked me (only if we have their blocked users data)
    if (targetUserBlockedUsers && hasUserBlockedMe(targetUserBlockedUsers)) return false;
    
    return true;
  };

  return {
    isUserBlocked,
    hasUserBlockedMe,
    canInteractWithUser
  };
};