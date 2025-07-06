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

      recentPostsQuery.forEach((postDoc) => {
        const postData = postDoc.data();
        const feedItemRef = db
          .collection("feeds")
          .doc(followerId)
          .collection("userFeed")
          .doc(postDoc.id);

        batch.set(feedItemRef, {
          authorId: postData.authorId,
          authorUsername: postData.authorUsername,
          authorProfileImageUrl: postData.authorProfileImageUrl,
          caption: postData.caption,
          imageUrl: postData.imageUrl,
          thumbnailUrl: postData.thumbnailUrl,
          createdAt: postData.createdAt,
          reactionCount: postData.reactionCount || 0,
          commentCount: postData.commentCount || 0,
          isMilestone: postData.isMilestone || false,
          milestoneDetails: postData.milestoneDetails || null,
          workoutId: postData.workoutId || null,
          visibility: postData.visibility || "public",
        });
      });
      await batch.commit();
      logger.info(`Added ${recentPostsQuery.size} posts to ${followerId}'s feed from ${userId}`);
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
