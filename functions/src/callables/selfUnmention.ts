import { getDb, admin } from '../admin/firebaseAdmin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';

interface SelfUnmentionRequest {
  context: 'post_caption' | 'comment' | 'reply' | 'workout_description';
  postId?: string;
  commentId?: string;
  replyId?: string;
  workoutId?: string;
}

export const selfUnmention = onCall(
  { region: 'northamerica-northeast2' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const db = getDb();
    if (!db) {
      throw new HttpsError('internal', 'Database not initialized');
    }

    const callerUid = request.auth.uid;
    const { context, postId, commentId, replyId, workoutId } = request.data as SelfUnmentionRequest;

    // Validate context and required IDs
    if (!context) {
      throw new HttpsError('invalid-argument', 'Missing context parameter');
    }

    let contentDocPath: string;

    switch (context) {
      case 'post_caption':
        if (!postId) {
          throw new HttpsError('invalid-argument', 'postId is required for post_caption context');
        }
        contentDocPath = `posts/${postId}`;
        break;

      case 'comment':
        if (!postId || !commentId) {
          throw new HttpsError('invalid-argument', 'postId and commentId are required for comment context');
        }
        contentDocPath = `posts/${postId}/comments/${commentId}`;
        break;

      case 'reply':
        if (!postId || !commentId || !replyId) {
          throw new HttpsError(
            'invalid-argument',
            'postId, commentId, and replyId are required for reply context'
          );
        }
        contentDocPath = `posts/${postId}/comments/${commentId}/replies/${replyId}`;
        break;

      case 'workout_description':
        if (!workoutId) {
          throw new HttpsError('invalid-argument', 'workoutId is required for workout_description context');
        }
        contentDocPath = `workouts/${workoutId}`;
        break;

      default:
        throw new HttpsError('invalid-argument', 'Invalid context parameter');
    }

    try {
      const contentDocRef = db.doc(contentDocPath);
      const contentDoc = await contentDocRef.get();

      if (!contentDoc.exists) {
        logger.warn(`selfUnmention: Document not found at ${contentDocPath}`);
        // Return silently (idempotent)
        return { success: true, message: 'Document not found' };
      }

      const mentions = contentDoc.data()?.mentions || [];
      const callerMention = mentions.find((m: any) => m.userId === callerUid);

      if (!callerMention) {
        // Caller is not in mentions, return silently (idempotent)
        logger.info(`selfUnmention: Caller ${callerUid} not found in mentions at ${contentDocPath}`);
        return { success: true, message: 'User not in mentions' };
      }

      // Batch write: remove from mentions + mark activity dismissed
      const batch = db.batch();

      // Remove caller's mention from the content document
      batch.update(contentDocRef, {
        mentions: admin.firestore.FieldValue.arrayRemove(callerMention),
      });

      // Find and mark the corresponding activity item as dismissed
      const activityQueryPath = `activity/${callerUid}/userActivity`;
      const activityQuery = db.collection(activityQueryPath).where('type', '==', 'mention');

      // Add context-specific filters to narrow down the activity item
      let q = activityQuery;
      if (context === 'post_caption' && postId) {
        q = q.where('postId', '==', postId).where('mentionContext', '==', 'post_caption');
      } else if (context === 'comment' && postId && commentId) {
        q = q.where('postId', '==', postId).where('commentId', '==', commentId).where('mentionContext', '==', 'comment');
      } else if (context === 'reply' && postId && commentId && replyId) {
        q = q
          .where('postId', '==', postId)
          .where('commentId', '==', commentId)
          .where('replyId', '==', replyId)
          .where('mentionContext', '==', 'reply');
      } else if (context === 'workout_description' && workoutId) {
        q = q.where('workoutId', '==', workoutId).where('mentionContext', '==', 'workout_description');
      }

      const activitySnap = await q.get();
      if (!activitySnap.empty) {
        // Mark the activity as dismissed
        const activityDoc = activitySnap.docs[0];
        batch.update(activityDoc.ref, { dismissed: true });
      }

      await batch.commit();

      logger.info(`selfUnmention: Successfully removed mention for user ${callerUid} from ${contentDocPath}`);
      return { success: true, message: 'Mention removed successfully' };
    } catch (error) {
      logger.error('Error in selfUnmention:', error);
      throw new HttpsError('internal', 'Failed to remove mention');
    }
  }
);
