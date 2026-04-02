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
    if (typeof query !== "string") {
      throw new HttpsError("invalid-argument", "query must be a string");
    }

    const callerUid = request.auth.uid;
    const lower = query.toLowerCase().trim();

    try {
      // Fetch caller's followers, following, blocked list, and mention blocks in parallel
      const [followersSnap, followingSnap, callerDoc, mentionBlocksSnap] = await Promise.all([
        db.collection("users").doc(callerUid).collection("followers").get(),
        db.collection("users").doc(callerUid).collection("following").get(),
        db.collection("users").doc(callerUid).get(),
        db.collection("users").doc(callerUid).collection("mentionBlocks").get(),
      ]);

      const followerIds = new Set(followersSnap.docs.map((d) => d.id));
      const followingIds = new Set(followingSnap.docs.map((d) => d.id));
      const blockedUsers = new Set<string>(
        callerDoc.data()?.blockedUsers || []
      );
      const mentionBlockedByMe = new Set<string>(
        mentionBlocksSnap.docs.map((d) => d.id)
      );

      const followers: MentionSuggestion[] = [];
      const following: MentionSuggestion[] = [];
      const others: MentionSuggestion[] = [];

      if (lower === "") {
        // No query: return followers and following by fetching their user docs
        const priorityIds = [
          ...followersSnap.docs.map((d) => d.id),
          ...followingSnap.docs.map((d) => d.id).filter((id) => !followerIds.has(id)),
        ].filter((id) => id !== callerUid && !blockedUsers.has(id) && !mentionBlockedByMe.has(id)).slice(0, 20);

        if (priorityIds.length > 0) {
          // Firestore 'in' supports up to 30 items
          const chunks: string[][] = [];
          for (let i = 0; i < priorityIds.length; i += 30) {
            chunks.push(priorityIds.slice(i, i + 30));
          }
          for (const chunk of chunks) {
            const snap = await db
              .collection("users")
              .where("__name__", "in", chunk)
              .get();
            for (const doc of snap.docs) {
              const uid = doc.id;
              const data = doc.data();
              const suggestion: MentionSuggestion = {
                userId: uid,
                username: data.username || "",
                displayName: data.displayName || "",
                profileThumbnailUrl: data.profileThumbnailUrl || data.profileImageUrl || "",
                bucket: followerIds.has(uid) ? "follower" : "following",
              };
              if (followerIds.has(uid)) {
                followers.push(suggestion);
              } else {
                following.push(suggestion);
              }
            }
          }
        }
      } else {
        // Run both queries in parallel:
        // 1. usernameLower — for users created after the field was added
        // 2. username — for existing users without usernameLower (case-sensitive fallback)
        const [byLower, byUsername] = await Promise.all([
          db.collection("users")
            .where("usernameLower", ">=", lower)
            .where("usernameLower", "<=", lower + "\uf8ff")
            .limit(30)
            .get(),
          db.collection("users")
            .where("username", ">=", lower)
            .where("username", "<=", lower + "\uf8ff")
            .limit(30)
            .get(),
        ]);

        const seen = new Set<string>();
        for (const doc of [...byLower.docs, ...byUsername.docs]) {
          const uid = doc.id;
          if (uid === callerUid || blockedUsers.has(uid) || mentionBlockedByMe.has(uid) || seen.has(uid)) continue;
          seen.add(uid);

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
