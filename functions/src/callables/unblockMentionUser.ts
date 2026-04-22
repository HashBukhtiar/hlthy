import { getDb } from '../admin/firebaseAdmin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

interface UnblockMentionUserRequest {
  targetUid: string; // the user to allow back to mention you
}

export const unblockMentionUser = onCall(
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
    const { targetUid } = request.data as UnblockMentionUserRequest;

    if (!targetUid) {
      throw new HttpsError('invalid-argument', 'targetUid is required');
    }

    if (targetUid === callerUid) {
      throw new HttpsError('invalid-argument', 'Cannot unblock yourself');
    }

    try {
      const batch = db.batch();

      // Remove from users/{callerUid}/mentionBlocks/{targetUid}
      const mentionBlockRef = db.collection('users').doc(callerUid).collection('mentionBlocks').doc(targetUid);
      batch.delete(mentionBlockRef);

      // Remove the reverse index from users/{targetUid}/mentionBlockedBy/{callerUid}
      const mentionBlockedByRef = db.collection('users').doc(targetUid).collection('mentionBlockedBy').doc(callerUid);
      batch.delete(mentionBlockedByRef);

      await batch.commit();

      logger.info(`unblockMentionUser: User ${callerUid} unblocked mentions from ${targetUid}`);
      return { success: true, message: 'Mention unblock successful' };
    } catch (error) {
      logger.error('Error in unblockMentionUser:', error);
      throw new HttpsError('internal', 'Failed to unblock mention user');
    }
  }
);
