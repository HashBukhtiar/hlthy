import {getDb} from "../admin/firebaseAdmin";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {logger} from "firebase-functions";

interface MentionSuggestion {
  userId: string;
  username: string;
  displayName?: string;
  profileThumbnailUrl?: string;
  bucket: "follower" | "following" | "other";
}

export const searchUsersForMention = onCall(
  {region: "northamerica-northeast2"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const db = getDb();
    if (!db) {
      throw new HttpsError("internal", "Database not initialized");
    }

    const {query} = request.data;
    if (!query || typeof query !== "string") {
      throw new HttpsError("invalid-argument", "query is required");
    }

    const callerUid = request.auth.uid;
    const lower = query.toLowerCase();

    try {
      // Fetch caller's followers and following IDs in parallel
      const [followersSnap, followingSnap, callerDoc] = await Promise.all([
        db.collection("users").doc(callerUid).collection("followers").get(),
        db.collection("users").doc(callerUid).collection("following").get(),
        db.collection("users").doc(callerUid).get(),
      ]);

      const followerIds = new Set(followersSnap.docs.map((d) => d.id));
      const followingIds = new Set(followingSnap.docs.map((d) => d.id));
      const blockedUsers = new Set<string>(
        callerDoc.data()?.blockedUsers || []
      );

      // Prefix query on username field
      const usersSnap = await db
        .collection("users")
        .where("username", ">=", lower)
        .where("username", "<=", lower + "\uf8ff")
        .limit(30)
        .get();

      const followers: MentionSuggestion[] = [];
      const following: MentionSuggestion[] = [];
      const others: MentionSuggestion[] = [];

      for (const doc of usersSnap.docs) {
        const uid = doc.id;
        // Skip the caller and blocked users
        if (uid === callerUid || blockedUsers.has(uid)) continue;

        const data = doc.data();
        const suggestion: MentionSuggestion = {
          userId: uid,
          username: data.username || "",
          displayName: data.displayName || "",
          profileThumbnailUrl: data.profileThumbnailUrl || data.profileImageUrl || "",
          bucket: "other",
        };

        if (followerIds.has(uid)) {
          suggestion.bucket = "follower";
          followers.push(suggestion);
        } else if (followingIds.has(uid)) {
          suggestion.bucket = "following";
          following.push(suggestion);
        } else {
          others.push(suggestion);
        }
      }

      // Concatenate in priority order: followers > following > others
      const results = [...followers, ...following, ...others].slice(0, 20);

      return {suggestions: results};
    } catch (error) {
      logger.error("Error in searchUsersForMention:", error);
      throw new HttpsError("internal", "Failed to search users");
    }
  }
);
