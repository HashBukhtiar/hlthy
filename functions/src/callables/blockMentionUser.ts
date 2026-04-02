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
      const now = admin.firestore.Timestamp.now();
      const batch = db.batch();

      // users/{callerUid}/mentionBlocks/{targetUid} — "I have blocked targetUid from mentioning me"
      const mentionBlockRef = db.collection('users').doc(callerUid).collection('mentionBlocks').doc(targetUid);
      batch.set(mentionBlockRef, { blockedAt: now });

      // users/{targetUid}/mentionBlockedBy/{callerUid} — "targetUid is blocked from mentioning me (callerUid)"
      // This reverse index lets the mention search exclude users who have blocked the caller.
      const mentionBlockedByRef = db.collection('users').doc(targetUid).collection('mentionBlockedBy').doc(callerUid);
      batch.set(mentionBlockedByRef, { blockedAt: now });

      await batch.commit();

      logger.info(`blockMentionUser: User ${callerUid} blocked mentions from ${targetUid}`);
      return { success: true, message: 'Mention block created successfully' };
    } catch (error) {
      logger.error('Error in blockMentionUser:', error);
      throw new HttpsError('internal', 'Failed to block mention user');
    }
  }
);
