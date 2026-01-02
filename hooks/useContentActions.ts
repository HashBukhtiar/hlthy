import { useCallback } from 'react';
import { Alert } from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/firebaseConfig';
import { useProfileData } from '@/hooks/useProfileData';

interface ContentItem {
  id: string;
  authorId: string;
  authorUsername: string;
  isFollowing?: boolean;
  isBookmarked?: boolean;
}

interface UseContentActionsProps<T extends ContentItem> {
  selectedItem: T | null;
  currentUser: any;
  setSelectedItem: (updater: (prev: T | null) => T | null) => void;
  updateItems: (updater: (items: T[]) => T[]) => void;
  refreshFeed: () => void;
  contentType: 'post' | 'milestone';
}

export function useContentActions<T extends ContentItem>({
  selectedItem,
  currentUser,
  setSelectedItem,
  updateItems,
  refreshFeed,
  contentType,
}: UseContentActionsProps<T>) {
  const { followUser, unfollowUser } = useProfileData();

  const handleToggleFollowFromMenu = useCallback(async () => {
    const feedName = contentType === 'post' ? 'PostsFeed' : 'MilestonesFeed';
    console.log(`🔵 [${feedName}] handleToggleFollowFromMenu called`);
    console.log(`🔵 [${feedName}] selectedItem:`, selectedItem);
    console.log(`🔵 [${feedName}] currentUser:`, currentUser?.uid);
    console.log(`🔵 [${feedName}] isFollowing status:`, selectedItem?.isFollowing);
    
    if (!selectedItem || !currentUser) {
      console.log(`🔴 [${feedName}] Early return - missing selectedItem or currentUser`);
      return;
    }

    const targetUserId = selectedItem.authorId;
    const targetUsername = selectedItem.authorUsername;
    const isCurrentlyFollowing = selectedItem.isFollowing;

    console.log(`🔵 [${feedName}] Target user:`, targetUserId, targetUsername);
    console.log(`🔵 [${feedName}] Currently following:`, isCurrentlyFollowing);

    try {
      if (isCurrentlyFollowing) {
        // User is currently following, so unfollow
        console.log(`🟡 [${feedName}] Attempting to UNFOLLOW user:`, targetUserId);
        await unfollowUser(targetUserId);
        console.log(`✅ [${feedName}] Successfully unfollowed user:`, targetUsername);
        
        // Optimistically update the selected item state
        setSelectedItem(prev => prev ? { ...prev, isFollowing: false } as T : null);
        
        // Update items in the feed
        updateItems(prevItems => 
          prevItems.map(item => 
            item.authorId === targetUserId 
              ? { ...item, isFollowing: false }
              : item
          )
        );
      } else {
        // User is not following, so follow
        console.log(`🟡 [${feedName}] Attempting to FOLLOW user:`, targetUserId);
        await followUser(targetUserId);
        console.log(`✅ [${feedName}] Successfully followed user:`, targetUsername);
        
        // Optimistically update the selected item state
        setSelectedItem(prev => prev ? { ...prev, isFollowing: true } as T : null);
        
        // Update items in the feed
        updateItems(prevItems => 
          prevItems.map(item => 
            item.authorId === targetUserId 
              ? { ...item, isFollowing: true }
              : item
          )
        );
      }
      
      // Refresh feed to ensure consistency with server
      console.log(`🔵 [${feedName}] Refreshing feed after follow/unfollow action`);
      refreshFeed();
    } catch (error: any) {
      console.error(`🔴 [${feedName}] Error in handleToggleFollowFromMenu:`, error);
      console.error(`🔴 [${feedName}] Error message:`, error.message);
      console.error(`🔴 [${feedName}] Error code:`, error.code);
      Alert.alert('Error', 'Could not update follow status. Please try again.');
    }
  }, [selectedItem, currentUser, followUser, unfollowUser, refreshFeed, setSelectedItem, updateItems, contentType]);

  const handleBlockUser = useCallback(async () => {
    if (!selectedItem || !currentUser) return;

    const itemType = contentType === 'post' ? 'posts' : 'milestones';
    
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${selectedItem.authorUsername}? You won't see their ${itemType} and they won't be able to interact with you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const functions = getFunctions(app, 'northamerica-northeast2');
              const blockUserFn = httpsCallable(functions, 'blockUser');
              await blockUserFn({ targetUserId: selectedItem.authorId });
              Alert.alert('Blocked', `You have blocked ${selectedItem.authorUsername}`);
              refreshFeed();
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', 'Could not block user. Please try again.');
            }
          },
        },
      ]
    );
  }, [selectedItem, currentUser, refreshFeed, contentType]);

  const handleReportContent = useCallback(() => {
    if (!selectedItem) return;

    const contentLabel = contentType === 'post' ? 'Post' : 'Milestone';
    const reportOptions = contentType === 'post' 
      ? ['Spam', 'Inappropriate Content', 'Harassment']
      : ['Spam', 'Inappropriate Content', 'False Achievement'];

    Alert.alert(
      `Report ${contentLabel}`,
      `Why are you reporting this ${contentLabel.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...reportOptions.map(option => ({
          text: option,
          onPress: () => {
            // TODO: Implement report functionality
            Alert.alert('Reported', `Thank you for reporting this ${contentLabel.toLowerCase()}.`);
          },
        })),
      ]
    );
  }, [selectedItem, contentType]);

  return {
    handleToggleFollowFromMenu,
    handleBlockUser,
    handleReportContent,
  };
}
