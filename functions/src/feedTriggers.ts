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
      // Get the author's followers (excluding the author themselves)
      const followersQuery = await db
        .collection("users")
        .doc(postData.authorId)
        .collection("followers")
        .get();

      // Create batch operations to add this post to all followers' feeds (but NOT the author's feed)
      const batch = db.batch();
      let addedToFeedsCount = 0;
      for (const followerDoc of followersQuery.docs) {
        const followerId = followerDoc.id;
        // Skip adding to the author's own feed
        if (followerId === postData.authorId) {
          logger.info(`Skipping feed population for author ${postData.authorId} on their own post ${postId}`);
          continue;
        }
        const feedItemRef = db
          .collection("feeds")
          .doc(followerId)
          .collection("userFeed")
          .doc(postId); // Using postId as document ID prevents duplicates

        // Check if this feed item already exists to prevent duplicates
        const existingFeedItem = await feedItemRef.get();
        if (existingFeedItem.exists) {
          logger.info(`Feed item already exists for post ${postId} in user ${followerId} feed, skipping`);
          continue;
        }
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
        addedToFeedsCount++;
      }
      await batch.commit();
      logger.info(`Populated ${addedToFeedsCount} followers' feeds for post ${postId} (excluded author ${postData.authorId})`);
    } catch (error) {
      logger.error("Error populating feeds:", error);
    }
  }
);

// Clean up feeds when a post is deleted (no changes needed here)
export const cleanupFeedsOnPostDelete = onDocumentDeleted(
  "posts/{postId}",
  async (event) => {
    const postId = event.params.postId;
    try {
      // Instead of querying all feeds, we can use a more targeted approach
      // by querying the userFeed collection group with a custom field
      const feedsQuery = await db
        .collectionGroup("userFeed")
        .where("authorId", "==", event.data?.data()?.authorId) // If you have the author data
        .get();
      const batch = db.batch();
      let deletedCount = 0;
      feedsQuery.forEach((doc) => {
        // Check if this document's ID matches our post ID
        if (doc.id === postId) {
          batch.delete(doc.ref);
          deletedCount++;
        }
      });
      await batch.commit();
      logger.info(`Cleaned up ${deletedCount} feed entries for deleted post ${postId}`);
    } catch (error) {
      logger.error("Error cleaning up feeds:", error);
      // Fallback to the previous approach if the optimized one fails
      try {
        const feedsQuery = await db.collection("feeds").get();
        const batch = db.batch();
        let deletedCount = 0;
        for (const feedDoc of feedsQuery.docs) {
          const feedId = feedDoc.id;
          const feedItemRef = db
            .collection("feeds")
            .doc(feedId)
            .collection("userFeed")
            .doc(postId);
          const feedItemDoc = await feedItemRef.get();
          if (feedItemDoc.exists) {
            batch.delete(feedItemRef);
            deletedCount++;
          }
        }
        await batch.commit();
        logger.info(`Fallback cleanup: Removed ${deletedCount} feed entries for deleted post ${postId}`);
      } catch (fallbackError) {
        logger.error("Error in fallback cleanup:", fallbackError);
      }
    }
  }
);
