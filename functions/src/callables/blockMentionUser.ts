import { getDb, admin } from '../admin/firebaseAdmin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

interface BlockMentionUserRequest {
  targetUid: string; // the user to block from mentioning you
}

export const blockMentionUser = onCall(
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
    const { targetUid } = request.data as BlockMentionUserRequest;

    if (!targetUid) {
      throw new HttpsError('invalid-argument', 'targetUid is required');
    }

    if (targetUid === callerUid) {
      throw new HttpsError('invalid-argument', 'Cannot block yourself from mentioning you');
    }

    try {
      const mentionBlockRef = db.collection('users').doc(callerUid).collection('mentionBlocks').doc(targetUid);

      await mentionBlockRef.set({
        blockedAt: admin.firestore.Timestamp.now(),
      });

      logger.info(`blockMentionUser: User ${callerUid} blocked mentions from ${targetUid}`);
      return { success: true, message: 'Mention block created successfully' };
    } catch (error) {
      logger.error('Error in blockMentionUser:', error);
      throw new HttpsError('internal', 'Failed to block mention user');
    }
  }
);
