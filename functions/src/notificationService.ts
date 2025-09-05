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
    const messages: ExpoMessage[] = pushTokens.map((token) => ({
      to: token,
      title,
      body,
      data: data || {type: "unknown"},
      sound: "default",
      priority: notificationType === "direct_message" ? "high" : "normal",
    }));

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
      // Check user's notification preferences
      const preferences = await getUserNotificationPreferences(recipientId);
      if (!preferences) {
        logger.info(`User ${recipientId} not found, skipping notification`);
        return {success: false, reason: "User not found"};
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
        return {success: false, reason: "Notification type disabled by user"};
      }

      // Get user's push tokens
      const pushTokens = await getUserPushTokens(recipientId);
      if (pushTokens.length === 0) {
        logger.info(`No push tokens found for user ${recipientId}`);
        return {success: false, reason: "No push tokens found"};
      }

      // Prepare messages for each token
      const messages: ExpoMessage[] = pushTokens.map((token) => ({
        to: token,
        title,
        body,
        data: data || {},
        sound: "default",
        priority: notificationType === "direct_message" ? "high" : "normal",
      }));

      // Send the notifications
      const success = await sendExpoNotification(messages);

      return {
        success,
        tokenCount: pushTokens.length,
        message: success ? "Notifications sent successfully" : "Failed to send notifications",
      };
    } catch (error) {
      logger.error("Error in sendPushNotification:", error);
      throw new HttpsError("internal", "Failed to send push notification");
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

    const {type, fromUsername, fromUserId} = activityData;

    // Skip self-generated activities
    if (fromUserId === userId) {
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

    case "like":
      title = "New Like";
      body = `${fromUsername} liked your post`;
      notificationType = "like";
      break;

    case "comment":
      title = "New Comment";
      body = `${fromUsername} commented on your post`;
      notificationType = "comment";
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
      // Get conversation data to find the recipient
      const db = getDb();
      if (!db) {
        logger.error("Database not initialized");
        return;
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
      const title = `Message from ${senderUsername}`;
      const body = text || "Sent a message";

      // Send notification
      await sendPushNotificationHelper(recipientId, title, body, "direct_message", {
        type: "direct_message",
        fromUserId: senderId,
        fromUsername: senderUsername,
        conversationId,
      });
    } catch (error) {
      logger.error("Error sending message notification:", error);
    }
  }
);
