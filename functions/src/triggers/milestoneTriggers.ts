import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {admin, getDb} from "../admin/firebaseAdmin";

export const updateUserMilestoneSummaryOnCreateV2 = onDocumentCreated(
  {
    document: "posts/{postId}",
    region: "northamerica-northeast2",
  },
  async (event) => { // event is FirestoreEvent<QueryDocumentSnapshot | undefined, {postId: string}>
    const db = getDb();
    if (!db) {
      console.error("updateUserMilestoneSummaryOnCreateV2: Firestore db not initialized.");
      return null;
    }

    const snapshot = event.data;
    if (!snapshot) {
      console.log("updateUserMilestoneSummaryOnCreateV2: No data associated with the event (snapshot undefined). Skipping.");
      return null;
    }

    const postData = snapshot.data();
    const postId = event.params.postId;

    console.log(`updateUserMilestoneSummaryOnCreateV2: Triggered for post ${postId}. isMilestone: ${postData.isMilestone}`);

    if (!postData.isMilestone || !postData.milestoneDetails || !postData.authorId) {
      console.log(`updateUserMilestoneSummaryOnCreateV2: Post ${postId} is not a milestone or missing crucial data. Skipping.`);
      return null;
    }

    const userId = postData.authorId;
    const milestoneDetails = postData.milestoneDetails;
    const userRef = db.collection("users").doc(userId);

    try {
      await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
          console.log(`updateUserMilestoneSummaryOnCreateV2: User ${userId} not found. Cannot update milestone summary.`);
          return;
        }
        const userData = userDoc.data() || {};
        const updates: { [key: string]: any } = {};

        const achievedAtTimestamp = milestoneDetails.achievedAt instanceof admin.firestore.Timestamp ?
          milestoneDetails.achievedAt :
          admin.firestore.Timestamp.fromDate(new Date(milestoneDetails.achievedAt || Date.now()));

        if (milestoneDetails.type === "PR" && milestoneDetails.exerciseId) {
          const exerciseId = milestoneDetails.exerciseId;
          const newPRData = {
            value: milestoneDetails.value !== undefined ? milestoneDetails.value : null,
            weightUnit: milestoneDetails.weightUnit, // Preserve the unit
            reps: milestoneDetails.reps !== undefined ? milestoneDetails.reps : null,
            duration: milestoneDetails.duration !== undefined ? milestoneDetails.duration : null,
            level: milestoneDetails.level !== undefined ? milestoneDetails.level : null,
            date: achievedAtTimestamp,
            postId: postId,
            exerciseName: milestoneDetails.exerciseName || "Unknown Exercise",
          };

          const latestPRs = userData.latestPRs || {};
          const existingPR = latestPRs[exerciseId];

          let shouldUpdatePR = false;
          if (!existingPR) {
            shouldUpdatePR = true;
          } else if (newPRData.date.toMillis() > existingPR.date.toMillis()) {
            shouldUpdatePR = true;
          } else if (newPRData.date.toMillis() === existingPR.date.toMillis() && newPRData.value > (existingPR.value || 0) ) {
            shouldUpdatePR = true;
          }

          if (shouldUpdatePR) {
            updates[`latestPRs.${exerciseId}`] = newPRData;
          }
        } else if (
          (milestoneDetails.type === "weightLoss" || milestoneDetails.type === "weightGain") &&
          milestoneDetails.newWeight !== undefined && milestoneDetails.newWeight !== null
        ) {
          const newWeightEntry = {
            value: milestoneDetails.newWeight,
            unit: milestoneDetails.newWeightUnit || milestoneDetails.weightUnit,
            date: achievedAtTimestamp,
            postId: postId,
          };

          const currentWeight = userData.currentWeight;
          if (!currentWeight || (newWeightEntry.date.toMillis() >= (currentWeight.date ? currentWeight.date.toMillis() : 0) )) {
            updates.currentWeight = newWeightEntry;
          }
        }

        if (Object.keys(updates).length > 0) {
          transaction.update(userRef, updates);
          console.log(`updateUserMilestoneSummaryOnCreateV2: Milestone summary updated for user ${userId}. Updates:`, JSON.stringify(updates));
        } else {
          console.log(`updateUserMilestoneSummaryOnCreateV2: No summary updates needed for user ${userId} from post ${postId}.`);
        }
      });
    } catch (error) {
      console.error(
        `updateUserMilestoneSummaryOnCreateV2: Error updating user ${userId} milestone summary for post ${postId}:`,
        error
      );
    }
    return null;
  }
);
