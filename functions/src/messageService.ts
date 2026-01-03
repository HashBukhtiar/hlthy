import {onCall, HttpsError} from "firebase-functions/v2/https";
import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";

const db = getFirestore();

export const sendMessageRequest = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const senderId = request.auth.uid;
    const {recipientId, messageText, conversationId} = request.data;

    if (!recipientId || !messageText || !conversationId) {
      throw new HttpsError("invalid-argument", "Missing required parameters");
    }

    if (senderId === recipientId) {
      throw new HttpsError("invalid-argument", "Cannot send message request to yourself");
    }

    try {
      // Get recipient's profile and message permissions
      const recipientDoc = await db.collection("users").doc(recipientId).get();
      if (!recipientDoc.exists) {
        logger.error(`Recipient user document not found for ${recipientId}`);
        // Allow the message to go through anyway - the conversation might still be valid
        return {success: true, requestNeeded: false};
      }

      const recipientData = recipientDoc.data()!;
      const messagePermission = recipientData.messagePermission || "everyone";

      // Check if recipient has blocked sender
      const blockedUsers = recipientData.blockedUsers || [];
      if (blockedUsers.includes(senderId)) {
        throw new HttpsError("failed-precondition", "Cannot send message to this user");
      }

      // If everyone can message, no request needed
      if (messagePermission === "everyone") {
        return {success: true, requestNeeded: false};
      }

      // Check if sender is already a follower
      if (messagePermission === "followers") {
        const followerDoc = await db
          .collection("users")
          .doc(recipientId)
          .collection("followers")
          .doc(senderId)
          .get();

        if (followerDoc.exists) {
          return {success: true, requestNeeded: false};
        }
      }

      // Get sender's profile for the request
      const senderDoc = await db.collection("users").doc(senderId).get();
      const senderData = senderDoc.data()!;

      // Check for existing request
      const existingRequest = await db
        .collection("users")
        .doc(recipientId)
        .collection("messageRequests")
        .doc(conversationId)
        .get();

      if (existingRequest.exists) {
        throw new HttpsError("already-exists", "Message request already sent");
      }

      // Create message request
      await db
        .collection("users")
        .doc(recipientId)
        .collection("messageRequests")
        .doc(conversationId)
        .set({
          fromUserId: senderId,
          fromUsername: senderData.username || "Unknown User",
          fromProfileImage: senderData.profileImageUrl || "",
          fromProfileThumbnail: senderData.profileThumbnailUrl || "",
          text: messageText,
          conversationId,
          createdAt: new Date(),
          status: "pending",
        });

      logger.info(`Message request sent from ${senderId} to ${recipientId}`);
      return {success: true, requestNeeded: true};
    } catch (error) {
      logger.error("Error sending message request:", error);
      throw new HttpsError("internal", "Failed to send message request");
    }
  }
);

export const approveMessageRequest = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const currentUserId = request.auth.uid;
    const {requestId, conversationId} = request.data;

    if (!requestId || !conversationId) {
      throw new HttpsError("invalid-argument", "Missing required parameters");
    }

    try {
      const batch = db.batch();

      // Get the message request
      const requestRef = db
        .collection("users")
        .doc(currentUserId)
        .collection("messageRequests")
        .doc(requestId);

      const requestDoc = await requestRef.get();
      if (!requestDoc.exists) {
        throw new HttpsError("not-found", "Message request not found");
      }

      const requestData = requestDoc.data()!;

      // Get sender data for username
      const senderUserDoc = await db.collection("users").doc(requestData.fromUserId).get();
      const senderUserData = senderUserDoc.data()!;

      // Create or update conversation
      const conversationRef = db.collection("conversations").doc(conversationId);
      const conversationSnap = await conversationRef.get();

      if (!conversationSnap.exists) {
        // Get user profiles for conversation metadata
        const [currentUserDoc] = await Promise.all([
          db.collection("users").doc(currentUserId).get(),
        ]);

        const currentUserData = currentUserDoc.data()!;

        batch.set(conversationRef, {
          participants: [currentUserId, requestData.fromUserId],
          lastMessageAt: new Date(),
          lastMessageText: requestData.text,
          lastMessageSenderId: requestData.fromUserId,
          participantUsernames: {
            [currentUserId]: currentUserData.username || "User",
            [requestData.fromUserId]: senderUserData.username || "User",
          },
          participantProfileImages: {
            [currentUserId]: currentUserData.profileImageUrl || "",
            [requestData.fromUserId]: senderUserData.profileImageUrl || "",
          },
          participantProfileThumbnails: {
            [currentUserId]: currentUserData.profileThumbnailUrl || "",
            [requestData.fromUserId]: senderUserData.profileThumbnailUrl || "",
          },
          createdAt: new Date(),
        });

        // Create user conversation references
        const userConvRef1 = db
          .collection("users")
          .doc(currentUserId)
          .collection("conversations")
          .doc(conversationId);

        batch.set(userConvRef1, {
          otherParticipantId: requestData.fromUserId,
          otherParticipantUsername: senderUserData.username || "User",
          otherParticipantProfileImage: senderUserData.profileImageUrl || "",
          otherParticipantThumbnailUrl: senderUserData.profileThumbnailUrl || "",
        });

        const userConvRef2 = db
          .collection("users")
          .doc(requestData.fromUserId)
          .collection("conversations")
          .doc(conversationId);

        batch.set(userConvRef2, {
          otherParticipantId: currentUserId,
          otherParticipantUsername: currentUserData.username || "User",
          otherParticipantProfileImage: currentUserData.profileImageUrl || "",
          otherParticipantThumbnailUrl: currentUserData.profileThumbnailUrl || "",
        });
      }

      // Add the original message to the conversation
      const messageRef = db
        .collection("conversations")
        .doc(conversationId)
        .collection("messages")
        .doc();

      batch.set(messageRef, {
        text: requestData.text,
        createdAt: requestData.createdAt,
        senderId: requestData.fromUserId,
        senderUsername: senderUserData.username || senderUserData.displayName || "User",
      });

      // Delete the request
      batch.delete(requestRef);

      await batch.commit();

      logger.info(`Message request approved: ${requestId} for conversation ${conversationId}`);
      return {success: true};
    } catch (error) {
      logger.error("Error approving message request:", error);
      throw new HttpsError("internal", "Failed to approve message request");
    }
  }
);

export const ignoreMessageRequest = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const currentUserId = request.auth.uid;
    const {requestId} = request.data;

    if (!requestId) {
      throw new HttpsError("invalid-argument", "Request ID is required");
    }

    try {
      await db
        .collection("users")
        .doc(currentUserId)
        .collection("messageRequests")
        .doc(requestId)
        .delete();

      logger.info(`Message request ignored: ${requestId}`);
      return {success: true};
    } catch (error) {
      logger.error("Error ignoring message request:", error);
      throw new HttpsError("internal", "Failed to ignore message request");
    }
  }
);
