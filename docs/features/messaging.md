# Messaging (DMs)

Users can send direct messages to each other. Accounts with restricted message settings require the sender to go through a message request approval flow.

---

## User Experience

The **DMs** tab shows a list of conversations sorted by most recent. Conversations from unknown senders appear in a **Message Requests** section at the top.

- Tap a conversation to open the chat
- Long-press a conversation to delete it
- Tap the compose icon to start a new DM (opens a user search)
- The AI coaching conversation is always pinned at the top of DMs

---

## Key Files

| File | Purpose |
|------|---------|
| `screens/DMs.tsx` | DMs list UI |
| `app/chat/[id].tsx` | Individual chat thread |
| `features/messaging/ui/useDMs.ts` | Hook for conversation list |
| `features/messaging/infra/conversationRepository.ts` | Firestore queries |
| `features/messaging/domain/Conversation.ts` | Conversation types |

---

## Conversation Types

```typescript
interface Conversation {
  id: string;
  otherParticipantId: string;
  otherParticipantUsername: string;
  otherParticipantProfileImage?: string;
  otherParticipantThumbnailUrl?: string;
  lastMessageText?: string;
  lastMessageAt?: Timestamp;
  lastMessageSenderId?: string;
  isUnread: boolean;
  isPinnedAI: boolean;
}
```

---

## Firestore Structure

```
conversations/{conversationId}
  participants: [uid1, uid2]
  lastMessageText
  lastMessageAt
  lastMessageSenderId

conversations/{conversationId}/messages/{messageId}
  senderId
  text
  createdAt
  isAiResponse?
  sharedPost?
  sharedPhoto?

users/{uid}/conversations/{conversationId}
  isUnread
  isPinnedAI
  lastReadAt
```

The shared `conversations/{id}` document holds metadata visible to both participants. The per-user `users/{uid}/conversations/{id}` document holds read status and pin status specific to each participant.

---

## Message Requests

When a user's `messagePermission` is set to `'followers'`, unsolicited DMs from non-followers go into a **message requests** queue instead of the main conversation list.

The recipient sees these in a "Message Requests" section in DMs. They can:
- **Approve** — Moves the conversation to the main list
- **Deny** — Deletes the conversation

Both actions call Cloud Functions (`approveMessageRequest`, `denyMessageRequest`).

---

## Starting a New DM

Tapping the compose button opens a user search. The search is the same username prefix query as Explore, but filtered to users you follow (or mutual followers, depending on settings).

A conversation ID is deterministic — generated from the two participant UIDs sorted alphabetically:
```
conversationId = [uid1, uid2].sort().join('_')
```

This means there's always exactly one conversation between any two users.

---

## Unread State

Each user's `users/{uid}/conversations/{id}` document tracks `lastReadAt`. A conversation is marked unread if `lastMessageAt > lastReadAt` and the last message was sent by the other participant.

Unread conversations show a dot indicator in the DMs list.

---

## Block Enforcement

You cannot start a DM with a user who has blocked you, and blocked users do not appear in the new DM user search results.
