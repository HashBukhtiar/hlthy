import { getDb, admin } from '../admin/firebaseAdmin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

interface SuggestedUser {
  userId: string;
  username: string;
  displayName: string;
  profileImageUrl?: string;
  profileThumbnailUrl?: string;
  score: number;
}

// Score weights
const SCORE_MUTUAL = 3;
const SCORE_MUTUAL_EXTRA = 1; // per additional mutual beyond the first, capped
const SCORE_MUTUAL_EXTRA_CAP = 5; // max total score from mutuals
const SCORE_ARCHETYPE = 2;

// Graph traversal limits (cost ceiling)
const MAX_FOLLOWEES_TO_TRAVERSE = 20; // how many of my followees we inspect
const MAX_FOLLOWEE_FOLLOWING = 50;    // how many of each followee's following we read
const MAX_CANDIDATES_TO_SCORE = 50;   // cap on profile reads
const RESULT_POOL_SIZE = 20;          // how many we cache and return

export const getSuggestedUsers = onCall(
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

    try {
      // ── Step 1: Fetch caller context ───────────────────────────────────────
      const [callerDoc, callerFollowingSnap] = await Promise.all([
        db.collection('users').doc(callerUid).get(),
        db.collection('users').doc(callerUid).collection('following').get(),
      ]);

      if (!callerDoc.exists) {
        throw new HttpsError('not-found', 'Caller profile not found');
      }

      const callerArchetype: string = callerDoc.data()?.archetype ?? '';
      const callerFollowingIds = new Set(callerFollowingSnap.docs.map(d => d.id));

      // ── Step 2: Gather mutual candidates ──────────────────────────────────
      // Take up to MAX_FOLLOWEES_TO_TRAVERSE of the caller's followees
      const followeeIds = callerFollowingSnap.docs
        .slice(0, MAX_FOLLOWEES_TO_TRAVERSE)
        .map(d => d.id);

      // For each followee fetch their following list (in parallel)
      const followeeFollowingSnaps = await Promise.all(
        followeeIds.map(fid =>
          db.collection('users').doc(fid)
            .collection('following')
            .limit(MAX_FOLLOWEE_FOLLOWING)
            .get()
        )
      );

      // Count how many of caller's followees also follow each candidate
      const mutualCount = new Map<string, number>();
      for (const snap of followeeFollowingSnaps) {
        for (const d of snap.docs) {
          const uid = d.id;
          if (uid === callerUid) continue;
          if (callerFollowingIds.has(uid)) continue;
          mutualCount.set(uid, (mutualCount.get(uid) ?? 0) + 1);
        }
      }

      // ── Step 3: Build candidate set ───────────────────────────────────────
      // Candidates = mutual pool, capped for cost
      const candidateIds = Array.from(mutualCount.keys()).slice(0, MAX_CANDIDATES_TO_SCORE);

      // ── Step 4: Fetch candidate profiles ──────────────────────────────────
      if (candidateIds.length === 0) {
        // No mutuals found — cache an empty result and return
        await db.collection('users').doc(callerUid)
          .collection('suggestedUsers').doc('cache')
          .set({ generatedAt: admin.firestore.Timestamp.now(), suggestions: [] });
        return { suggestions: [] };
      }

      // Firestore 'in' limit is 30
      const profileDocs: FirebaseFirestore.DocumentSnapshot[] = [];
      for (let i = 0; i < candidateIds.length; i += 30) {
        const chunk = candidateIds.slice(i, i + 30);
        const snap = await db.collection('users')
          .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
          .get();
        profileDocs.push(...snap.docs);
      }

      // ── Step 5: Filter + Score ─────────────────────────────────────────────
      const scored: SuggestedUser[] = [];

      for (const profileDoc of profileDocs) {
        const uid = profileDoc.id;
        const data = profileDoc.data();
        if (!data) continue;

        // Exclude users who have blocked the caller
        const theirBlockedUsers: string[] = data.blockedUsers ?? [];
        if (theirBlockedUsers.includes(callerUid)) continue;

        let score = 0;

        // Mutual signal
        const mutuals = mutualCount.get(uid) ?? 0;
        if (mutuals > 0) {
          const mutualScore = Math.min(
            SCORE_MUTUAL + (mutuals - 1) * SCORE_MUTUAL_EXTRA,
            SCORE_MUTUAL_EXTRA_CAP
          );
          score += mutualScore;
        }

        // Archetype signal
        if (callerArchetype && data.archetype === callerArchetype) {
          score += SCORE_ARCHETYPE;
        }

        if (score === 0) continue; // only surface users with at least one signal

        scored.push({
          userId: uid,
          username: data.username ?? '',
          displayName: data.displayName ?? '',
          profileImageUrl: data.profileImageUrl,
          profileThumbnailUrl: data.profileThumbnailUrl,
          score,
        });
      }

      // Sort descending by score, take top RESULT_POOL_SIZE
      scored.sort((a, b) => b.score - a.score);
      const suggestions = scored.slice(0, RESULT_POOL_SIZE);

      // ── Step 6: Write cache ───────────────────────────────────────────────
      await db.collection('users').doc(callerUid)
        .collection('suggestedUsers').doc('cache')
        .set({
          generatedAt: admin.firestore.Timestamp.now(),
          suggestions,
        });

      logger.info(`getSuggestedUsers: Generated ${suggestions.length} suggestions for ${callerUid}`);
      return { suggestions };
    } catch (error) {
      logger.error('Error in getSuggestedUsers:', error);
      throw new HttpsError('internal', 'Failed to generate suggested users');
    }
  }
);
