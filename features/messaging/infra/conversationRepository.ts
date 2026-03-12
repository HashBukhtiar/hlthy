import {
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  query,
  where,
  limit,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import {
  Conversation,
  ConversationMetadata,
  UserConversationData,
  UserSearchResult,
  MessageRequest,
} from '@/features/messaging/domain/Conversation';
import { logger } from '@/shared/utils/logger';

const DOMAIN = 'ConversationRepository';

/** Deterministic conversation ID from two user IDs (order-independent). */
function buildConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

export const ConversationRepository = {
  /**
   * Loads all conversations for a user, merged with fresh participant profiles
   * and conversation metadata. The AI-pinned thread is always prepended.
   */
  async listForUser(uid: string): Promise<Conversation[]> {
    const userConvRef = collection(db, `users/${uid}/conversations`);
    const userConvSnap = await getDocs(userConvRef);

    if (userConvSnap.empty) {
      const aiConversation: Conversation = {
        id: `${uid}_ai_conversation`,
        isPinnedAI: true,
        lastMessageText: 'Ask me anything about fitness!',
      };
      return [aiConversation];
    }

    // Collect other participant IDs for batch profile fetch.
    const participantIds = new Set<string>();
    userConvSnap.docs.forEach(d => {
      const otherId = (d.data() as UserConversationData).otherParticipantId;
      if (otherId) participantIds.add(otherId);
    });

    // Batch-fetch participant profiles (Firestore 'in' limit: 30).
    const profiles: Record<string, { username: string; profileImageUrl?: string; profileThumbnailUrl?: string }> = {};
    if (participantIds.size > 0) {
      const ids = Array.from(participantIds).slice(0, 30);
      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('__name__', 'in', ids))
      );
      usersSnap.forEach(userDoc => {
        const d = userDoc.data();
        profiles[userDoc.id] = {
          username: d.username,
          profileImageUrl: d.profileImageUrl,
          profileThumbnailUrl: d.profileThumbnailUrl,
        };
      });
    }

    // For each user conversation doc, load the shared conversation metadata.
    const mergePromises = userConvSnap.docs.map(async userConvDoc => {
      const userConvData = userConvDoc.data() as UserConversationData;
      const conversationId = userConvDoc.id;
      const otherParticipantId = userConvData.otherParticipantId;

      const metaSnap = await getDoc(doc(db, 'conversations', conversationId));
      if (!metaSnap.exists() || !otherParticipantId) return null;

      const meta = metaSnap.data() as ConversationMetadata;
      const profile = profiles[otherParticipantId];

      const isUnread = !!(
        meta.lastMessageAt &&
        meta.lastMessageSenderId !== uid &&
        (!userConvData.lastRead ||
          meta.lastMessageAt.toMillis() > userConvData.lastRead.toMillis())
      );

      return {
        id: conversationId,
        ...userConvData,
        ...meta,
        otherParticipantUsername:
          profile?.username ?? userConvData.otherParticipantUsername ?? 'User',
        otherParticipantProfileImage: profile?.profileImageUrl,
        otherParticipantThumbnailUrl: profile?.profileThumbnailUrl,
        isUnread,
      } as Conversation;
    });

    const results = (await Promise.all(mergePromises)).filter(
      (c): c is Conversation => c !== null
    );

    // Sort: unread first, then most recent message.
    results.sort((a, b) => {
      if (a.isUnread && !b.isUnread) return -1;
      if (!a.isUnread && b.isUnread) return 1;
      if (a.lastMessageAt && b.lastMessageAt) {
        return b.lastMessageAt.toMillis() - a.lastMessageAt.toMillis();
      }
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return 0;
    });

    // Prepend the pinned AI conversation.
    const aiConversation: Conversation = {
      id: `${uid}_ai_conversation`,
      isPinnedAI: true,
      lastMessageText: 'Ask me anything about fitness!',
    };
    return [aiConversation, ...results];
  },

  /** Loads the current user's message requests subcollection. */
  async listMessageRequests(uid: string): Promise<MessageRequest[]> {
    const snap = await getDocs(collection(db, 'users', uid, 'messageRequests'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MessageRequest));
  },

  /** Removes the current user's copy of a conversation (does not delete the shared doc). */
  async deleteForUser(uid: string, conversationId: string): Promise<void> {
    await deleteDoc(doc(db, `users/${uid}/conversations`, conversationId));
    logger.debug(DOMAIN, 'Conversation deleted for user', { uid, conversationId });
  },

  /**
   * Searches for users by username prefix.
   * Returns up to 20 raw results (caller applies block filtering before display).
   */
  async searchPotentialRecipients(queryText: string, excludeUid: string): Promise<UserSearchResult[]> {
    const lower = queryText.toLowerCase();
    const q = query(
      collection(db, 'users'),
      where('username', '>=', lower),
      where('username', '<=', lower + '\uf8ff'),
      limit(20)
    );
    const snap = await getDocs(q);
    const results: UserSearchResult[] = [];
    snap.forEach(d => {
      if (d.id === excludeUid) return;
      const data = d.data();
      results.push({
        id: d.id,
        username: data.username,
        profileImageUrl: data.profileImageUrl,
        profileThumbnailUrl: data.profileThumbnailUrl,
        blockedUsers: data.blockedUsers,
      });
    });
    return results;
  },

  /**
   * Finds an existing conversation between two users or creates a new one.
   * Returns the conversation ID in both cases.
   */
  async findOrCreate(
    currentUserId: string,
    currentUserDisplayName: string,
    currentUserPhotoURL: string,
    otherUserId: string,
    otherUsername: string,
    otherProfileImageUrl?: string
  ): Promise<string> {
    const conversationId = buildConversationId(currentUserId, otherUserId);
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationSnap = await getDoc(conversationRef);

    if (conversationSnap.exists()) {
      return conversationId;
    }

    // Create the shared conversation doc.
    await setDoc(conversationRef, {
      participants: [currentUserId, otherUserId],
      lastMessageAt: serverTimestamp(),
      lastMessageText: '',
      participantUsernames: {
        [currentUserId]: currentUserDisplayName,
        [otherUserId]: otherUsername,
      },
      participantProfileImages: {
        [currentUserId]: currentUserPhotoURL,
        [otherUserId]: otherProfileImageUrl ?? '',
      },
      isPinnedAI: false,
    });

    // Link conversation to both users' subcollections.
    await setDoc(doc(db, `users/${currentUserId}/conversations`, conversationId), {
      otherParticipantId: otherUserId,
      otherParticipantUsername: otherUsername,
      otherParticipantProfileImage: otherProfileImageUrl ?? '',
    });

    await setDoc(doc(db, `users/${otherUserId}/conversations`, conversationId), {
      otherParticipantId: currentUserId,
      otherParticipantUsername: currentUserDisplayName,
      otherParticipantProfileImage: currentUserPhotoURL,
    });

    logger.debug(DOMAIN, 'New conversation created', { conversationId });
    return conversationId;
  },
};
