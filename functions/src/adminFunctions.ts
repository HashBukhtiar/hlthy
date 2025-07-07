import {onRequest} from "firebase-functions/v2/https";
import {getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";

const db = getFirestore();

// One-time cleanup function to remove users' own posts from their feeds
export const cleanupSelfPostsFromFeeds = onRequest(
  {
    region: "northamerica-northeast2",
    cors: true, // Allow CORS if you want to call from browser
  },
  async (req, res) => {
    // Add security check
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // Optional: Add authentication check
    // const authHeader = req.headers.authorization;
    // if (!authHeader || authHeader !== 'Bearer your-secret-token') {
    //   res.status(401).send('Unauthorized');
    //   return;
    // }

    try {
      logger.info("Starting cleanup of self-posts from feeds");
      // Get all user feed documents where authorId equals the feed owner's ID
      const feedsQuery = await db.collectionGroup("userFeed").get();
      const batch = db.batch();
      let deletedCount = 0;
      let batchCount = 0;
      for (const feedDoc of feedsQuery.docs) {
        const feedData = feedDoc.data();
        const feedPath = feedDoc.ref.path;
        // Extract the feed owner's ID from the path: feeds/{userId}/userFeed/{postId}
        const pathParts = feedPath.split("/");
        const feedOwnerId = pathParts[1]; // userId from path
        // If the post author is the same as the feed owner, delete it
        if (feedData.authorId === feedOwnerId) {
          batch.delete(feedDoc.ref);
          deletedCount++;
          batchCount++;
          // Firestore batch operations are limited to 500 operations
          if (batchCount >= 450) {
            await batch.commit();
            logger.info(`Committed batch with ${batchCount} deletions. Total deleted so far: ${deletedCount}`);
            batchCount = 0;
          }
        }
      }
      // Commit any remaining operations
      if (batchCount > 0) {
        await batch.commit();
        logger.info(`Final batch committed with ${batchCount} deletions`);
      }
      logger.info(`Successfully deleted ${deletedCount} self-posts from feeds`);
      res.status(200).json({
        success: true,
        deletedCount,
        message: `Cleaned up ${deletedCount} self-posts from feeds`,
      });
    } catch (error) {
      logger.error("Error cleaning up self-posts from feeds:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
