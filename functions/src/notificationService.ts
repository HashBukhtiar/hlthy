import {getDb} from "./firebaseAdmin";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {logger} from "firebase-functions";

// Expo Push API endpoint
const EXPO_PUSH_API_URL = "https://exp.host/--/api/v2/push/send";

// Types for push notifications
interface PushNotificationData {
  type: string;
  fromUserId?: string;
  fromUsername?: string;
  postId?: string;
  workoutId?: string;
  conversationId?: string;
  activityId?: string;
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: PushNotificationData;
  sound?: "default";
  priority?: "high" | "normal";
  badge?: number;
  channelId?: string;
  categoryId?: string;
}

// Helper function to get user's notification preferences
async function getUserNotificationPreferences(userId: string) {
  const db = getDb();
  if (!db) {
    throw new Error("Database not initialized");
  }

  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    return userData?.settings?.notifications || {
      newFollowers: true,
      likesAndComments: true,
      directMessages: true,
      followRequestAccepted: true,
      taggedInComments: true,
      mentionedInReplies: true,
    };
  } catch (error) {
    logger.error("Error fetching user notification preferences:", error);
    return null;
  }
}

// Helper function to get user's push tokens
async function getUserPushTokens(userId: string): Promise<string[]> {
  const db = getDb();
  if (!db) {
    return [];
  }

  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return [];
    }

    const userData = userDoc.data();
    const tokens = userData?.pushTokens || [];

    // Filter out invalid tokens
    return tokens.filter((token: string) =>
      token && typeof token === "string" && token.startsWith("ExponentPushToken[")
    );
  } catch (error) {
    logger.error(`Error fetching push tokens for user ${userId}:`, error);
    return [];
  }
}

// Helper function to send push notification via Expo
async function sendExpoNotification(messages: ExpoMessage[]): Promise<boolean> {
  try {
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    logger.info("Expo push notification result:", result);

    return response.ok;
  } catch (error) {
    logger.error("Error sending Expo push notification:", error);
    return false;
  }
}

// Helper function to send notification (used by triggers)
async function sendPushNotificationHelper(
  recipientId: string,
  title: string,
  body: string,
  notificationType: string,
  data?: PushNotificationData
): Promise<boolean> {
  try {
    // Check user's notification preferences
    const preferences = await getUserNotificationPreferences(recipientId);
    if (!preferences) {
      logger.info(`User ${recipientId} not found, skipping notification`);
      return false;
    }

    // Check if this notification type is enabled
    const typeMapping: Record<string, keyof typeof preferences> = {
      "new_follower": "newFollowers",
      "follow_accepted": "followRequestAccepted",
      "like": "likesAndComments",
      "comment": "likesAndComments",
      "direct_message": "directMessages",
      "tagged_comment": "taggedInComments",
      "mentioned_reply": "mentionedInReplies",
    };

    const preferenceKey = typeMapping[notificationType];
    if (preferenceKey && !preferences[preferenceKey]) {
      logger.info(`Notification type ${notificationType} disabled for user ${recipientId}`);
      return false;
    }

    // Get user's push tokens
    const pushTokens = await getUserPushTokens(recipientId);
    if (pushTokens.length === 0) {
      logger.info(`No push tokens found for user ${recipientId}`);
      return false;
    }

    // Prepare messages for each token
    const messages: ExpoMessage[] = pushTokens.map((token: string) => {
      const baseMessage: ExpoMessage = {
        to: token,
        title,
        body,
        data: data || {type: "unknown"},
        sound: "default",
        priority: notificationType === "direct_message" ? "high" : "normal",
      };

      // Add platform-specific properties
      if (notificationType === "direct_message") {
        baseMessage.channelId = "messages"; // Android
      } else {
        baseMessage.channelId = "social"; // Android
      }

      return baseMessage;
    });

    // Send the notifications
    const success = await sendExpoNotification(messages);
    return success;
  } catch (error) {
    logger.error("Error in sendPushNotificationHelper:", error);
    return false;
  }
}

// Callable function to send push notifications
export const sendPushNotification = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    logger.info("sendPushNotification triggered:", JSON.stringify(request.data));

    const {
      recipientId,
      title,
      body,
      data,
      notificationType,
    } = request.data;

    if (!recipientId || !title || !body || !notificationType) {
      throw new HttpsError(
        "invalid-argument",
        "Missing required parameters: recipientId, title, body, notificationType"
      );
    }

    try {
      const db = getDb();
      if (!db) {
        logger.error("Database not initialized");
        return {success: false, reason: "Database not initialized"};
      }

      // Get the recipient's user document
      const userDoc = await db.collection("users").doc(recipientId).get();
      if (!userDoc.exists) {
        logger.info(`User ${recipientId} document not found`);
        return {success: false, reason: "User document not found"};
      }

      const userData = userDoc.data();
      // Check user's notification preferences
      const preferences = userData?.settings?.notifications || {
        newFollowers: true,
        likesAndComments: true,
        directMessages: true,
        followRequestAccepted: true,
        taggedInComments: true,
        mentionedInReplies: true,
      };

      // Check if this notification type is enabled
      const typeMapping: Record<string, keyof typeof preferences> = {
        "new_follower": "newFollowers",
        "follow_accepted": "followRequestAccepted",
        "like": "likesAndComments",
        "comment": "likesAndComments",
        "likeComment": "likesAndComments",
        "direct_message": "directMessages",
        "tagged_comment": "taggedInComments",
        "mentioned_reply": "mentionedInReplies",
      };

      const preferenceKey = typeMapping[notificationType];
      if (preferenceKey && !preferences[preferenceKey]) {
        logger.info(`Notification type ${notificationType} disabled for user ${recipientId}`);
        return {success: false, reason: "Notification type disabled by user"};
      }

      // Rate limiting protection
      const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
      const MAX_NOTIFICATIONS_PER_WINDOW = 10;
      const now = Date.now();
      const windowStart = new Date(now - RATE_LIMIT_WINDOW);
      try {
        const recentNotificationsQuery = await db.collection("notificationLogs")
          .where("userId", "==", recipientId)
          .where("action", "==", "sent")
          .where("timestamp", ">", windowStart)
          .get();

        if (recentNotificationsQuery.size >= MAX_NOTIFICATIONS_PER_WINDOW) {
          logger.warn(`Rate limit exceeded for user ${recipientId}: ${recentNotificationsQuery.size} notifications in the last minute`);
          return {success: false, reason: "Rate limit exceeded - too many notifications sent recently"};
        }
      } catch (error) {
        logger.error("Error checking rate limit:", error);
        // Continue without rate limiting if check fails - don't block legitimate notifications
      }

      /**
       * Get user's push tokens with backwards compatibility support
       * - NEW FORMAT: pushTokens (array of strings) - supports multiple devices
       * - LEGACY FORMAT: pushToken (single string) - deprecated but still supported
       *
       * Migration Status: All new registrations use pushTokens array format.
       * Legacy support maintained for existing users until full migration is confirmed.
       * TODO: Audit user records after 6 months and remove legacy pushToken support if migration is complete.
       */
      const pushTokens = userData?.pushTokens || (userData?.pushToken ? [userData.pushToken] : []);
      // Filter out invalid tokens
      const validTokens = pushTokens.filter((token: string) =>
        token && typeof token === "string" && token.startsWith("ExponentPushToken[")
      );

      if (validTokens.length === 0) {
        logger.info(`No valid push tokens found for user ${recipientId}. Available tokens: ${JSON.stringify(pushTokens)}`);
        return {success: false, reason: "No valid push tokens found"};
      }

      // Prepare messages for each token
      const messages: ExpoMessage[] = validTokens.map((token: string) => ({
        to: token,
        title,
        body,
        data: data || {type: notificationType},
        sound: "default",
        priority: notificationType === "direct_message" ? "high" : "normal",
      }));

      logger.info(`Sending ${messages.length} notifications to user ${recipientId}`);

      // Send the notifications
      const success = await sendExpoNotification(messages);

      // Log successful notifications for rate limiting
      if (success) {
        try {
          await db.collection("notificationLogs").add({
            userId: recipientId,
            action: "sent",
            notificationType,
            timestamp: new Date(),
            tokenCount: validTokens.length,
          });
        } catch (logError) {
          logger.error("Error logging notification for rate limiting:", logError);
          // Don't fail the whole operation if logging fails
        }
      }

      return {
        success,
        tokenCount: validTokens.length,
        message: success ? "Notifications sent successfully" : "Failed to send notifications",
      };
    } catch (error) {
      logger.error("Error in sendPushNotification:", error);
      return {success: false, reason: (error as Error).message || "Unknown error"};
    }
  }
);

// Firestore trigger for new activities (follows, likes, comments, etc.)
export const onActivityCreated = onDocumentWritten(
  {
    region: "northamerica-northeast2",
    document: "activity/{userId}/userActivity/{activityId}",
  },
  async (event) => {
    const activityData = event.data?.after?.data();
    const userId = event.params.userId;
    const activityId = event.params.activityId;

    // Only process new activities (not updates)
    if (!activityData || event.data?.before?.exists) {
      return;
    }

    logger.info(`Processing new activity for user ${userId}:`, activityData);
    // Add detailed logging for reply likes
    if (activityData.replyId) {
      logger.info("Reply like detected:", {
        userId,
        activityId,
        type: activityData.type,
        replyId: activityData.replyId,
        commentId: activityData.commentId,
        postId: activityData.postId,
      });
    }

    const {type, fromUsername, fromUserId} = activityData;

    // Skip self-generated activities
    if (fromUserId === userId) {
      logger.info(`Skipping self-generated activity for user ${userId}`);
      return;
    }

    let title = "";
    let body = "";
    let notificationType = "";

    switch (type) {
    case "new_follower":
      title = "New Follower";
      body = `${fromUsername} started following you`;
      notificationType = "new_follower";
      break;

    case "follow_accepted":
      title = "Follow Request Accepted";
      body = `${fromUsername} accepted your follow request`;
      notificationType = "follow_accepted";
      break;

    case "follow_request":
      title = "Follow Request";
      body = `${fromUsername} wants to follow you`;
      notificationType = "new_follower";
      break;

    case "post_like":
      title = "New Like";
      body = `${fromUsername} liked your post`;
      notificationType = "like";
      break;

    case "post_comment":
      title = "New Comment";
      body = `${fromUsername} commented on your post`;
      notificationType = "comment";
      break;

    case "comment_like":
      title = "New Like";
      body = `${fromUsername} liked your comment`;
      notificationType = "like";
      break;

    case "reply_like":
      title = "New Like";
      body = `${fromUsername} liked your reply`;
      notificationType = "like";
      break;

    case "comment_reply":
      title = "New Reply";
      body = `${fromUsername} replied to your comment`;
      notificationType = "comment";
      break;

    case "workout_save":
      title = "Workout Saved";
      body = `${fromUsername} saved your workout`;
      notificationType = "workout_saved";
      break;

    default:
      logger.info(`Unhandled activity type: ${type}`);
      return;
    }

    try {
      // Send notification directly
      await sendPushNotificationHelper(userId, title, body, notificationType, {
        type,
        fromUserId,
        fromUsername,
        activityId,
      });
    } catch (error) {
      logger.error("Error sending notification for activity:", error);
    }
  }
);

// Firestore trigger for new messages
export const onMessageCreated = onDocumentWritten(
  {
    region: "northamerica-northeast2",
    document: "conversations/{conversationId}/messages/{messageId}",
  },
  async (event) => {
    const messageData = event.data?.after?.data();
    const conversationId = event.params.conversationId;

    // Only process new messages (not updates)
    if (!messageData || event.data?.before?.exists) {
      return;
    }

    logger.info(`Processing new message in conversation ${conversationId}:`, messageData);

    const {senderId, text, senderUsername} = messageData;

    try {
      const db = getDb();
      if (!db) {
        logger.error("Database not initialized");
        return;
      }

      // Get sender's username if not provided in message
      let actualSenderUsername = senderUsername;
      if (!actualSenderUsername) {
        logger.info(`No senderUsername found for message from ${senderId}, fetching from user document`);
        const senderDoc = await db.collection("users").doc(senderId).get();
        if (senderDoc.exists) {
          const senderData = senderDoc.data();
          actualSenderUsername = senderData?.username || senderData?.displayName || "User";
          logger.info(`Retrieved username: ${actualSenderUsername} for user ${senderId}`);
        } else {
          actualSenderUsername = "User";
          logger.warn(`User document not found for ${senderId}, using 'User' as fallback`);
        }
      }

      const conversationDoc = await db.collection("conversations").doc(conversationId).get();
      if (!conversationDoc.exists) {
        logger.error(`Conversation ${conversationId} not found`);
        return;
      }

      const conversationData = conversationDoc.data();
      const participants = conversationData?.participants || [];

      // Find the recipient (the participant who is not the sender)
      const recipientId = participants.find((id: string) => id !== senderId);
      if (!recipientId) {
        logger.error(`No recipient found for conversation ${conversationId}`);
        return;
      }

      // Prepare notification
      const title = `Message from ${actualSenderUsername}`;
      const body = text || "Sent a message";

      // Send notification
      await sendPushNotificationHelper(recipientId, title, body, "direct_message", {
        type: "direct_message",
        fromUserId: senderId,
        fromUsername: actualSenderUsername,
        conversationId,
      });
    } catch (error) {
      logger.error("Error sending message notification:", error);
    }
  }
);

export const cleanupPushToken = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    const {token} = request.data;
    if (!token) {
      throw new HttpsError("invalid-argument", "Token is required");
    }

    try {
      const db = getDb();
      if (!db) {
        throw new HttpsError("internal", "Database not initialized");
      }

      // Find all users that have this token
      const usersQuery = await db.collection("users")
        .where("pushTokens", "array-contains", token)
        .get();

      const batch = db.batch();
      usersQuery.docs.forEach((userDoc) => {
        const userData = userDoc.data();
        const currentTokens = userData.pushTokens || [];
        const updatedTokens = currentTokens.filter((t: string) => t !== token);
        batch.update(userDoc.ref, {
          pushTokens: updatedTokens,
        });
      });

      await batch.commit();
      logger.info(`Cleaned up token ${token} from ${usersQuery.docs.length} users`);
      return {success: true, cleanedFromUsers: usersQuery.docs.length};
    } catch (error) {
      logger.error("Error cleaning up push token:", error);
      throw new HttpsError("internal", "Failed to cleanup token");
    }
  }
);
