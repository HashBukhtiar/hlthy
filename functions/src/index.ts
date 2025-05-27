import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const createactivityonfollowrequest = onDocumentCreated(
  {
    document: "users/{targetUserId}/pendingFollowers/{requestingUserId}",
    region: "northamerica-northeast2",
    // You can also specify other options like memory, timeoutSeconds, etc.
    // memory: "256MiB",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return;
    }
    // const data = snapshot.data(); // The data of the document

    const {targetUserId, requestingUserId} = event.params;

    if (targetUserId === requestingUserId) {
      console.log("User cannot request to follow themselves.");
      return;
    }

    try {
      const requestingUserDoc = await db
        .collection("users")
        .doc(requestingUserId)
        .get();
      if (!requestingUserDoc.exists) {
        console.error(
          `Requesting user ${requestingUserId} not found.`
        );
        return;
      }
      const requestingUserData = requestingUserDoc.data();

      const activityData = {
        type: "follow_request",
        fromUserId: requestingUserId,
        fromUsername: requestingUserData?.username || "Unknown User",
        fromProfileImageUrl: requestingUserData?.profileImageUrl || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
        status: "pending",
      };

      await db
        .collection("activity")
        .doc(targetUserId)
        .collection("userActivity")
        .add(activityData);

      console.log(
        `Follow request activity created for ${targetUserId} from ${requestingUserId}`
      );
    } catch (error) {
      console.error(
        "Error creating follow request activity:",
        error
      );
    }
  });
