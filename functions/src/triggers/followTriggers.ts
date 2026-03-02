import {onDocumentCreated, onDocumentDeleted} from "firebase-functions/v2/firestore";
import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";

const db = getFirestore();

// When someone follows a user, populate their feed with that user's recent posts
export const populateFeedOnFollow = onDocumentCreated(
  "users/{userId}/followers/{followerId}",
  async (event) => {
    const userId = event.params.userId; // Person being followed
    const followerId = event.params.followerId; // Person doing the following

    // Don't populate feed if someone is following themselves (edge case)
    if (userId === followerId) {
      logger.info(`User ${userId} tried to follow themselves, skipping feed population`);
      return;
    }

    try {
      // Get the recent posts from the user being followed
      const recentPostsQuery = await db
        .collection("posts")
        .where("authorId", "==", userId)
        .where("visibility", "==", "public")
        .orderBy("createdAt", "desc")
        .limit(20) // Add last 20 posts to feed
        .get();

      const batch = db.batch();
      let addedPostsCount = 0;

      recentPostsQuery.forEach((postDoc) => {
        const postData = postDoc.data();
        const feedItemRef = db
          .collection("feeds")
          .doc(followerId)
          .collection("userFeed")
          .doc(postDoc.id);

        // Prepare feed item data, filtering out undefined values
        const feedItemData: { [key: string]: any } = {
          authorId: postData.authorId,
          authorUsername: postData.authorUsername,
          authorProfileImageUrl: postData.authorProfileImageUrl,
          caption: postData.caption,
          createdAt: postData.createdAt,
          reactionCount: postData.reactionCount || 0,
          commentCount: postData.commentCount || 0,
          isMilestone: postData.isMilestone || false,
          visibility: postData.visibility || "public",
        };
        // Only add these fields if they have actual values (not undefined)
        if (postData.imageUrl !== undefined) {
          feedItemData.imageUrl = postData.imageUrl;
        }
        if (postData.thumbnailUrl !== undefined) {
          feedItemData.thumbnailUrl = postData.thumbnailUrl;
        }
        if (postData.milestoneDetails !== undefined) {
          feedItemData.milestoneDetails = postData.milestoneDetails;
        }
        if (postData.workoutId !== undefined) {
          feedItemData.workoutId = postData.workoutId;
        }
        batch.set(feedItemRef, feedItemData);
        addedPostsCount++;
      });
      await batch.commit();
      logger.info(`Added ${addedPostsCount} posts to ${followerId}'s feed from ${userId}`);
    } catch (error) {
      logger.error("Error populating feed on follow:", error);
    }
  }
);

// When someone unfollows, remove their posts from the feed
export const cleanupFeedOnUnfollow = onDocumentDeleted(
  "users/{userId}/followers/{followerId}",
  async (event) => {
    const userId = event.params.userId; // Person being unfollowed
    const followerId = event.params.followerId; // Person doing the unfollowing

    try {
      // Remove all posts from this user from the follower's feed
      const feedQuery = await db
        .collection("feeds")
        .doc(followerId)
        .collection("userFeed")
        .where("authorId", "==", userId)
        .get();
      const batch = db.batch();
      feedQuery.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      logger.info(`Removed ${feedQuery.size} posts from ${followerId}'s feed from ${userId}`);
    } catch (error) {
      logger.error("Error cleaning up feed on unfollow:", error);
    }
  }
);
