import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { db, functions } from '@/firebaseConfig';
import { doc, updateDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
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
   * Request notification permissions from the user
   */
  static async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.warn('Notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification');
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
   * Register the device for push notifications and save token to Firestore
   */
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

      // Save token to user document
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushToken: token,
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
      
      const response = await sendPushNotification({
        recipientIds,
        notification: notificationData,
        senderUserId,
      });

      return response.data?.success || false;
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
    isLike: boolean
  ): Promise<void> {
    const shouldNotify = await this.shouldSendNotification(postAuthorId, 'likesAndComments');
    if (!shouldNotify) return;

    const action = isLike ? 'liked' : 'commented on';
    await this.sendNotification([postAuthorId], {
      type: 'likeComment',
      title: isLike ? 'New Like' : 'New Comment',
      body: `${actorUsername} ${action} your post`,
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
      console.log('Notification received:', notification);
    });

    // Handle user tapping on notifications
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const { notification } = response;
      const data = notification.request.content.data;
      
      console.log('Notification tapped:', data);
      
      // Handle navigation based on notification type
      this.handleNotificationNavigation(data);
    });

    return {
      notificationListener,
      responseListener,
    };
  }

  /**
   * Handle navigation when notification is tapped
   */
  private static handleNotificationNavigation(data: any) {
    // This would integrate with your navigation system
    // Example implementation:
    const { type, userId, postId, conversationId } = data;
    
    switch (type) {
      case 'newFollower':
      case 'followAccepted':
        // Navigate to user profile
        break;
      case 'likeComment':
      case 'taggedInComment':
      case 'mentionedInReply':
        // Navigate to post
        break;
      case 'directMessage':
        // Navigate to conversation
        break;
      case 'workoutShared':
        // Navigate to shared workout
        break;
      default:
        // Navigate to home or appropriate default screen
        break;
    }
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
        await updateDoc(userRef, {
          pushToken: token,
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
        pushToken: null,
        lastTokenUpdate: serverTimestamp(),
      });
      NotificationService.pushToken = null;
    } catch (error) {
      console.error('Error removing push token:', error);
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