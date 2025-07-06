import {onDocumentCreated, onDocumentDeleted} from "firebase-functions/v2/firestore";
import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";

const db = getFirestore();

// Populate followers' feeds when a new post is created
export const populateFeedsOnPostCreate = onDocumentCreated(
  "posts/{postId}",
  async (event) => {
    const postData = event.data?.data();
    const postId = event.params.postId;

    if (!postData) {
      logger.error("No post data found");
      return;
    }

    try {
      // Get the author's followers
      const followersQuery = await db
        .collection("users")
        .doc(postData.authorId)
        .collection("followers")
        .get();

      // Create batch operations to add this post to all followers' feeds
      const batch = db.batch();
      followersQuery.forEach((followerDoc) => {
        const followerId = followerDoc.id;
        const feedItemRef = db
          .collection("feeds")
          .doc(followerId)
          .collection("userFeed")
          .doc(postId);

        // Add essential post data to the follower's feed
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
      logger.info(`Populated ${followersQuery.size} followers' feeds for post ${postId}`);
    } catch (error) {
      logger.error("Error populating feeds:", error);
    }
  }
);

// Clean up feeds when a post is deleted
export const cleanupFeedsOnPostDelete = onDocumentDeleted(
  "posts/{postId}",
  async (event) => {
    const postId = event.params.postId;

    try {
      // Query all feeds containing this post
      const feedsQuery = await db.collectionGroup("userFeed")
        .where("__name__", "==", postId)
        .get();
      const batch = db.batch();
      feedsQuery.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      logger.info(`Cleaned up ${feedsQuery.size} feed entries for deleted post ${postId}`);
    } catch (error) {
      logger.error("Error cleaning up feeds:", error);
    }
  }
);
