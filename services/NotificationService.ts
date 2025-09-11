import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, AppState } from 'react-native';
import { app, db, functions } from '@/firebaseConfig';
import { doc, updateDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const appState = AppState.currentState;
    const isAppActive = appState === 'active';
    
    return {
      shouldShowAlert: !isAppActive,
      shouldPlaySound: !isAppActive,
      shouldSetBadge: Platform.OS === 'ios',
      shouldShowBanner: !isAppActive,
      shouldShowList: !isAppActive,
    };
  },
});

export interface NotificationData {
  type: 'newFollower' | 'likeComment' | 'directMessage' | 'followAccepted' | 'taggedInComment' | 'mentionedInReply' | 'milestone' | 'workoutShared';
  title: string;
  body: string;
  data?: {
    userId?: string;
    postId?: string;
    conversationId?: string;
    activityId?: string;
    [key: string]: any;
  };
}

export interface UserNotificationSettings {
  newFollowers: boolean;
  likesAndComments: boolean;
  directMessages: boolean;
  followRequestAccepted: boolean;
  taggedInComments: boolean;
  mentionedInReplies: boolean;
}

export class NotificationService {
  private static instance: NotificationService;
  private static pushToken: string | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Set up Android notification channels
   */
  static async setupNotificationChannels(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('social', {
        name: 'Social',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }
  }

  static async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn('Notifications only work on physical devices');
      return false;
    }

    // Set up channels for Android
    await this.setupNotificationChannels();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      if (Platform.OS === 'android') {
        // Android 13+ requires explicit permission request
        console.log('Requesting notification permissions for Android...');
      }
      
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification');
      if (Platform.OS === 'android') {
        console.warn('Android users may need to enable notifications in system settings');
      }
      return false;
    }

    return true;
  }

  /**
   * Get the Expo push token for this device
   */
  static async getExpoPushToken(): Promise<string | null> {
    if (!Device.isDevice) {
      return null;
    }

    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        throw new Error('Project ID not found');
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      NotificationService.pushToken = token.data;
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Clear cached tokens (call this on logout)
   */
  static async clearCachedTokens(): Promise<void> {
    try {
      NotificationService.pushToken = null;
      // Clear any cached notification permissions if needed
      console.log('Cached push tokens cleared');
    } catch (error) {
      console.error('Error clearing cached tokens:', error);
    }
  }

  static async registerForPushNotifications(userId: string): Promise<boolean> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        return false;
      }

      const token = await this.getExpoPushToken();
      if (!token) {
        return false;
      }

      // IMPORTANT: Remove this token from all other users first
      await this.removeTokenFromAllUsers(token);

      // Then add it to the current user
      const userRef = doc(db, 'users', userId);
      
      // Get existing tokens to avoid duplicates
      const userDoc = await getDoc(userRef);
      let existingTokens: string[] = [];
      if (userDoc.exists()) {
        const userData = userDoc.data();
        existingTokens = userData.pushTokens || [];
      }
      
      // Add new token if it doesn't exist
      if (!existingTokens.includes(token)) {
        existingTokens.push(token);
      }
      
      await updateDoc(userRef, {
        pushTokens: existingTokens,
        deviceInfo: {
          platform: Platform.OS,
          deviceName: Device.deviceName,
          modelName: Device.modelName,
          osVersion: Device.osVersion,
          lastUpdated: serverTimestamp(),
        }
      });

      console.log('Push notification token registered successfully');
      return true;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return false;
    }
  }

  /**
   * Remove a token from all users (to prevent cross-account notifications)
   */
  private static async removeTokenFromAllUsers(tokenToRemove: string): Promise<void> {
    try {
      // This is a bit expensive but necessary for proper cleanup
      // You might want to implement this as a cloud function instead
      const functions = getFunctions(app, 'northamerica-northeast2');
      const cleanupTokenFn = httpsCallable(functions, 'cleanupPushToken');
      await cleanupTokenFn({ token: tokenToRemove });
    } catch (error) {
      console.error('Error removing token from all users:', error);
      // Continue anyway - the token will be overwritten
    }
  }

  /**
   * Send a push notification to specific users
   */
  static async sendNotification(
    recipientIds: string[], 
    notificationData: NotificationData,
    senderUserId?: string
  ): Promise<boolean> {
    try {
      if (!functions) {
        console.error('Firebase functions not initialized');
        return false;
      }

      const sendPushNotification = httpsCallable(functions, 'sendPushNotification');
      
      // Send notification to each recipient individually
      const results = await Promise.all(
        recipientIds.map(async (recipientId) => {
          try {
            const response = await sendPushNotification({
              recipientId,
              title: notificationData.title,
              body: notificationData.body,
              notificationType: notificationData.type,
              data: {
                type: notificationData.type,
                fromUserId: senderUserId,
                ...notificationData.data,
              },
            });
            return (response.data as any)?.success || false;
          } catch (error) {
            console.error(`Error sending notification to ${recipientId}:`, error);
            return false;
          }
        })
      );

      // Return true if at least one notification was sent successfully
      return results.some(result => result);
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  /**
   * Check if user should receive notification based on their settings
   */
  static async shouldSendNotification(
    userId: string, 
    notificationType: keyof UserNotificationSettings
  ): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return false;
      }

      const userData = userDoc.data();
      const notificationSettings = userData.notifications as UserNotificationSettings;
      
      // Default to true if settings don't exist
      if (!notificationSettings) {
        return true;
      }

      return notificationSettings[notificationType] ?? true;
    } catch (error) {
      console.error('Error checking notification settings:', error);
      return false; // Default to not sending if there's an error
    }
  }

  /**
   * Send notification for new follower
   */
  static async notifyNewFollower(followedUserId: string, followerUserId: string, followerUsername: string): Promise<void> {
    const shouldNotify = await this.shouldSendNotification(followedUserId, 'newFollowers');
    if (!shouldNotify) return;

    await this.sendNotification([followedUserId], {
      type: 'newFollower',
      title: 'New Follower',
      body: `${followerUsername} started following you`,
      data: { userId: followerUserId }
    }, followerUserId);
  }

  /**
   * Send notification for likes and comments
   */
  static async notifyLikeOrComment(
    postAuthorId: string, 
    actorUserId: string, 
    actorUsername: string,
    postId: string,
    isLike: boolean,
    isMilestone?: boolean,
    contentType?: 'post' | 'comment' | 'reply' | 'milestone'
  ): Promise<void> {
    // Don't send notifications to self
    if (postAuthorId === actorUserId) return;

    const shouldNotify = await this.shouldSendNotification(postAuthorId, 'likesAndComments');
    if (!shouldNotify) return;

    // Determine the content type for the notification message
    let content = 'post';
    if (contentType) {
      content = contentType;
    } else if (isMilestone) {
      content = 'milestone';
    }
    
    const action = isLike ? 'liked' : 'commented on';
    
    await this.sendNotification([postAuthorId], {
      type: 'likeComment',
      title: isLike ? 'New Like' : 'New Comment',
      body: `${actorUsername} ${action} your ${content}`,
      data: { userId: actorUserId, postId }
    }, actorUserId);
  }

  /**
   * Send notification for direct messages
   */
  static async notifyDirectMessage(
    recipientId: string, 
    senderUserId: string, 
    senderUsername: string,
    messagePreview: string,
    conversationId: string
  ): Promise<void> {
    const shouldNotify = await this.shouldSendNotification(recipientId, 'directMessages');
    if (!shouldNotify) return;

    await this.sendNotification([recipientId], {
      type: 'directMessage',
      title: `Message from ${senderUsername}`,
      body: messagePreview.length > 50 ? `${messagePreview.substring(0, 50)}...` : messagePreview,
      data: { userId: senderUserId, conversationId }
    }, senderUserId);
  }

  /**
   * Send notification when follow request is accepted
   */
  static async notifyFollowRequestAccepted(
    requesterUserId: string, 
    accepterUserId: string, 
    accepterUsername: string
  ): Promise<void> {
    const shouldNotify = await this.shouldSendNotification(requesterUserId, 'followRequestAccepted');
    if (!shouldNotify) return;

    await this.sendNotification([requesterUserId], {
      type: 'followAccepted',
      title: 'Follow Request Accepted',
      body: `${accepterUsername} accepted your follow request`,
      data: { userId: accepterUserId }
    }, accepterUserId);
  }

  /**
   * Send notification when tagged in comments
   */
  static async notifyTaggedInComment(
    taggedUserId: string, 
    taggerUserId: string, 
    taggerUsername: string,
    postId: string
  ): Promise<void> {
    const shouldNotify = await this.shouldSendNotification(taggedUserId, 'taggedInComments');
    if (!shouldNotify) return;

    await this.sendNotification([taggedUserId], {
      type: 'taggedInComment',
      title: 'Tagged in Comment',
      body: `${taggerUsername} tagged you in a comment`,
      data: { userId: taggerUserId, postId }
    }, taggerUserId);
  }

  /**
   * Send notification when mentioned in replies
   */
  static async notifyMentionedInReply(
    mentionedUserId: string, 
    mentionerUserId: string, 
    mentionerUsername: string,
    postId: string
  ): Promise<void> {
    const shouldNotify = await this.shouldSendNotification(mentionedUserId, 'mentionedInReplies');
    if (!shouldNotify) return;

    await this.sendNotification([mentionedUserId], {
      type: 'mentionedInReply',
      title: 'Mentioned in Reply',
      body: `${mentionerUsername} mentioned you in a reply`,
      data: { userId: mentionerUserId, postId }
    }, mentionerUserId);
  }

  /**
   * Send notification for milestone achievements
   */
  static async notifyMilestone(
    userId: string, 
    milestoneType: string, 
    milestoneValue: string
  ): Promise<void> {
    await this.sendNotification([userId], {
      type: 'milestone',
      title: 'Milestone Achieved! 🎉',
      body: `You've reached a new ${milestoneType}: ${milestoneValue}`,
      data: { milestoneType, milestoneValue }
    });
  }

  /**
   * Send notification when workout is shared
   */
  static async notifyWorkoutShared(
    recipientId: string, 
    senderUserId: string, 
    senderUsername: string,
    workoutName: string
  ): Promise<void> {
    await this.sendNotification([recipientId], {
      type: 'workoutShared',
      title: 'Workout Shared',
      body: `${senderUsername} shared a workout with you: ${workoutName}`,
      data: { userId: senderUserId, workoutName }
    }, senderUserId);
  }

  /**
   * Schedule a local notification (for reminders, etc.)
   */
  static async scheduleLocalNotification(
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput,
    data?: any
  ): Promise<string> {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger,
    });
  }

  /**
   * Cancel a scheduled notification
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Set up notification listeners
   */
  static setupNotificationListeners() {
    // Handle notifications that are received while app is foregrounded
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      const appState = AppState.currentState;
      const isAppActive = appState === 'active';
      
      console.log('Notification received:', notification);
      console.log('App state:', appState, 'Is active:', isAppActive);
      
      if (isAppActive) {
        // App is in foreground - handle silently or show in-app notification
        // You could dispatch to a toast/banner component here instead
        console.log('App is active - notification suppressed');
      }
    });

    // Handle user tapping on notifications (only when app is backgrounded)
    const responseListener = Notifications.addNotificationResponseReceivedListener(async response => {
      const { notification } = response;
      const data = notification.request.content.data as any || {};
      
      console.log('Notification tapped:', data);
      
      // Mark related activity as read if activityId is present
      if (typeof data.activityId === 'string' && typeof data.recipientId === 'string') {
        await this.markActivityAsRead(data.recipientId, data.activityId);
      }
      
      // Handle navigation based on notification type
      this.handleNotificationNavigation(data);
    });

    return {
      notificationListener,
      responseListener,
    };
  }

  /**
   * Mark activity as read when notification is tapped
   */
  static async markActivityAsRead(userId: string, activityId: string): Promise<void> {
    try {
      const activityRef = doc(db, 'activity', userId, 'userActivity', activityId);
      await updateDoc(activityRef, {
        isRead: true,
        readAt: new Date()
      });
      console.log(`Activity ${activityId} marked as read for user ${userId}`);
    } catch (error) {
      console.error('Error marking activity as read:', error);
    }
  }

  /**
   * Handle navigation when notification is tapped
   */
  private static handleNotificationNavigation(data: any) {
    // Import router dynamically to avoid circular dependency
    import('expo-router').then(({ router }) => {
      const { type, userId, postId, conversationId, activityId } = data;
      
      switch (type) {
        case 'new_follower':
        case 'follow_accepted':
        case 'follow_request':
          // Navigate to user profile
          if (userId) {
            router.push(`/profile/${userId}`);
          } else {
            router.push('/pulse'); // Show activity feed
          }
          break;
        case 'like':
        case 'comment':
        case 'tagged_comment':
        case 'mentioned_reply':
          // Navigate to post
          if (postId) {
            router.push(`/view-post/${postId}`);
          } else {
            router.push('/pulse'); // Show activity feed
          }
          break;
        case 'direct_message':
          // Navigate to conversation
          if (conversationId) {
            router.push(`/chat/${conversationId}`);
          } else {
            router.push('/dms'); // Show messages list
          }
          break;
        case 'workout_shared':
          // Navigate to shared workout
          if (postId) {
            router.push(`/view-workout/${postId}`);
          }
          break;
        default:
          // Navigate to activity feed for any other notifications
          router.push('/pulse');
          break;
      }
    }).catch(error => {
      console.error('Error navigating from notification:', error);
    });
  }

  /**
   * Clear all notifications from the notification center
   */
  static async clearNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Update user's push token (call this on app startup)
   */
  static async updatePushToken(userId: string): Promise<void> {
    try {
      const token = await this.getExpoPushToken();
      if (token) {
        const userRef = doc(db, 'users', userId);
        
        // Get existing tokens to avoid duplicates
        const userDoc = await getDoc(userRef);
        let existingTokens: string[] = [];
        if (userDoc.exists()) {
          const userData = userDoc.data();
          existingTokens = userData.pushTokens || [];
        }
        
        // Add new token if it doesn't exist
        if (!existingTokens.includes(token)) {
          existingTokens.push(token);
        }
        
        await updateDoc(userRef, {
          pushTokens: existingTokens,
          lastTokenUpdate: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error updating push token:', error);
    }
  }

  /**
   * Remove push token (call this on logout)
   */
  static async removePushToken(userId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushTokens: [], // Clear the array
        lastTokenUpdate: serverTimestamp(),
      });
      NotificationService.pushToken = null;
      console.log('Push tokens cleared successfully');
    } catch (error: any) {
      if (error.code === 'permission-denied' || error.code === 'unauthenticated') {
        console.warn('Cannot clear push tokens - user not authenticated (this is normal during logout)');
        // Clear cached token anyway
        NotificationService.pushToken = null;
      } else {
        console.error('Error removing push token:', error);
        throw error;
      }
    }
  }

  /**
   * Log notification activity for analytics
   */
  static async logNotificationActivity(
    userId: string,
    action: 'sent' | 'received' | 'opened' | 'dismissed',
    notificationType: string,
    additionalData?: any
  ): Promise<void> {
    try {
      await addDoc(collection(db, 'notificationLogs'), {
        userId,
        action,
        notificationType,
        timestamp: serverTimestamp(),
        additionalData: additionalData || null,
      });
    } catch (error) {
      console.error('Error logging notification activity:', error);
    }
  }
}