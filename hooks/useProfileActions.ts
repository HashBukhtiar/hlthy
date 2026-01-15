import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Platform, ActionSheetIOS } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '@/firebaseConfig';
import { useBlockEnforcement } from '@/utils/blockUtils';

interface UseProfileActionsProps {
  currentUser: any;
  displayProfileData: any;
  refreshUserProfile: (() => Promise<void>) | undefined;
  refreshProfileData: () => Promise<void>;
  followUser: (userId: string) => void;
  unfollowUser: (userId: string) => void;
  isFollowingStatus: boolean;
  isRequestPending: boolean;
  followActionLoading: boolean;
}

export const useProfileActions = ({
  currentUser,
  displayProfileData,
  refreshUserProfile,
  refreshProfileData,
  followUser,
  unfollowUser,
  isFollowingStatus,
  isRequestPending,
  followActionLoading,
}: UseProfileActionsProps) => {
  const router = useRouter();
  const { isUserBlocked } = useBlockEnforcement();

  const handleDirectMessage = useCallback(async () => {
    if (!currentUser || !displayProfileData?.id) return;
    
    const conversationId = generateConversationId(currentUser.uid, displayProfileData.id);
    
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      console.error('Error navigating to chat:', error);
      Alert.alert('Error', 'Failed to open chat. Please try again.');
    }
  }, [currentUser, displayProfileData, router]);

  const handleBlockUser = useCallback(async () => {
    if (!displayProfileData?.id) return;
    const username = displayProfileData.username || 'this user';

    Alert.alert(
      'Block User',
      `Are you sure you want to block @${username}? They will not be able to interact with you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const functions = getFunctions(app, 'northamerica-northeast2');
              const blockUserFn = httpsCallable(functions, 'blockUser');
              await blockUserFn({ targetUserId: displayProfileData.id });
              
              if (refreshUserProfile) {
                await refreshUserProfile();
              }
              
              Alert.alert('Blocked', `You have blocked @${username}.`);
              router.replace('/');
            } catch (error) {
              Alert.alert('Error', 'Failed to block user. Please try again.');
              console.error('Block user error:', error);
            }
          }
        }
      ]
    );
  }, [displayProfileData, refreshUserProfile, router]);

  const handleUnblockUser = useCallback(async () => {
    if (!displayProfileData?.id) return;
    const username = displayProfileData.username || 'this user';

    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock @${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: async () => {
            try {
              const functions = getFunctions(app, 'northamerica-northeast2');
              const unblockUserFn = httpsCallable(functions, 'unblockUser');
              await unblockUserFn({ targetUserId: displayProfileData.id });
              Alert.alert('Success', `@${username} has been unblocked.`);
              await refreshProfileData();
            } catch (error) {
              Alert.alert('Error', 'Failed to unblock user. Please try again.');
              console.error('Unblock user error:', error);
            }
          }
        }
      ]
    );
  }, [displayProfileData, refreshProfileData]);

  const showMoreOptions = useCallback(() => {
    if (!displayProfileData?.id) return;
    
    const isBlocked = isUserBlocked(displayProfileData.id);
    const actionText = isBlocked ? 'Unblock User' : 'Block User';
    const actionHandler = isBlocked ? handleUnblockUser : handleBlockUser;
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', actionText],
          destructiveButtonIndex: isBlocked ? -1 : 1,
          cancelButtonIndex: 0,
          userInterfaceStyle: 'dark',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) actionHandler();
        }
      );
    } else {
      Alert.alert(
        'More Options',
        '',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: actionText, 
            style: isBlocked ? 'default' : 'destructive', 
            onPress: actionHandler 
          }
        ]
      );
    }
  }, [displayProfileData, isUserBlocked, handleUnblockUser, handleBlockUser]);

  const handleFollowAction = useCallback(() => {
    if (followActionLoading || !displayProfileData?.id) return;
    
    if (isFollowingStatus) {
      unfollowUser(displayProfileData.id);
    } else if (isRequestPending) {
      unfollowUser(displayProfileData.id); 
    } else {
      followUser(displayProfileData.id);
    }
  }, [followActionLoading, displayProfileData, isFollowingStatus, isRequestPending, followUser, unfollowUser]);

  return {
    handleDirectMessage,
    handleBlockUser,
    handleUnblockUser,
    showMoreOptions,
    handleFollowAction,
  };
};

const generateConversationId = (userId1: string, userId2: string): string => {
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
};
