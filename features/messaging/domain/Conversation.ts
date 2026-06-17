import { Timestamp } from 'firebase/firestore';

/** User-specific conversation metadata at users/{uid}/conversations/{id}. */
export interface UserConversationData {
  lastRead?: Timestamp;
  otherParticipantId?: string;
  otherParticipantUsername?: string;
  otherParticipantProfileImage?: string;
  isPinned?: boolean;
  isMuted?: boolean;
}

/** Shared conversation metadata at conversations/{id}. */
export interface ConversationMetadata {
  participants?: string[];
  lastMessageAt?: Timestamp;
  lastMessageText?: string;
  lastMessageSenderId?: string;
  participantUsernames?: Record<string, string>;
  participantProfileImages?: Record<string, string>;
  isPinnedAI?: boolean;
}

/** Combined view used by the UI — merged from both Firestore paths. */
export interface Conversation extends UserConversationData, ConversationMetadata {
  id: string;
  isPinnedAI?: boolean;
  isUnread?: boolean;
  otherParticipantThumbnailUrl?: string;
}

/** User search result for composing a new DM. */
export interface UserSearchResult {
  id: string;
  username: string;
  profileImageUrl?: string;
  profileThumbnailUrl?: string;
  /** Used by block enforcement to filter results before display. */
  blockedUsers?: string[];
}

/** Message request pending approval (matches MessageRequestItem component's expected shape). */
export interface MessageRequest {
  id: string;
  conversationId?: string;
  fromUsername: string;
  fromProfileImage?: string;
  fromProfileThumbnail?: string;
  text: string;
  createdAt: any;
}
