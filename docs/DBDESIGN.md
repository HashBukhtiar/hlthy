# Hlthy App - Firestore Database Design

This document outlines the proposed Firestore database structure for the Hlthy social fitness application, designed for scalability, efficient querying, and maintainability.

## Core Principles

1.  **Denormalization:** Essential data (like usernames, profile pictures) is duplicated where needed (e.g., in feeds, activity logs) to optimize read queries and avoid complex joins.
2.  **Shallow Queries:** Data is structured to allow fetching lists (like feeds or posts) without needing to retrieve large nested subcollections (like all comments/reactions for every post in a feed).
3.  **Scalability:** Subcollections are used for potentially large, unbounded lists (followers, reactions, comments) to prevent hitting document size limits and enable efficient pagination/querying.
4.  **Security:** The design facilitates granular Firestore Security Rules.
5.  **Cloud Functions:** Relies on Cloud Functions for background tasks like maintaining denormalized data (counts, feed fan-out, activity logs) and performing secure checks (like username availability).

## Collections

### 1. `users`

*   **Path:** `/users/{userId}`
*   **Document ID:** Firebase Auth UID (`userId`)
*   **Purpose:** Stores core user profile information and related stats.
*   **Fields:**
    *   `username`: String (Unique, lowercase, indexed)
    *   `displayName`: String (First + Last Name)
    *   `email`: String (Lowercase)
    *   `profileImageUrl`: String (URL, nullable)
    *   `bio`: String (nullable)
    *   `createdAt`: Timestamp
    *   `stats`: Map
        *   `followerCount`: Number (Denormalized)
        *   `followingCount`: Number (Denormalized)
        *   `postCount`: Number (Denormalized)
        *   `milestoneCount`: Number (Denormalized)
    *   `fcmTokens`: Array<String> (For push notifications)
    *   `lastSeen`: Timestamp
    *   `archetype`: String (Optional)
    *   `dateOfBirth`: Timestamp (or Date object)
*   **Subcollections:**
    *   **`following`**: `/users/{userId}/following/{followedUserId}`
        *   *Doc ID:* `followedUserId`
        *   *Fields:* `{ followedAt: Timestamp }`
    *   **`followers`**: `/users/{userId}/followers/{followerUserId}`
        *   *Doc ID:* `followerUserId`
        *   *Fields:* `{ followedAt: Timestamp }`
    *   **`savedWorkouts`**: `/users/{userId}/savedWorkouts/{workoutId}`
        *   *Doc ID:* `workoutId`
        *   *Fields:* `{ savedAt: Timestamp }`
    *   **`blockedUsers`**: `/users/{userId}/blockedUsers/{blockedUserId}`
        *   *Doc ID:* `blockedUserId`
        *   *Fields:* `{ blockedAt: Timestamp }`

### 2. `usernames`

*   **Path:** `/usernames/{username}`
*   **Document ID:** Lowercase `username`
*   **Purpose:** Ensures username uniqueness and allows fast checking *before* account creation (primarily via Cloud Functions).
*   **Fields:**
    *   `userId`: String (Reference to the user owning this username)

### 3. `posts`

*   **Path:** `/posts/{postId}`
*   **Document ID:** Auto-generated (`postId`)
*   **Purpose:** Stores individual user posts. **Milestones are also represented as posts** where `isMilestone` is true.
*   **Fields:**
    *   `authorId`: String (`userId` of the creator)
    *   `authorUsername`: String (Denormalized)
    *   `authorProfileImageUrl`: String (Denormalized)
    *   `caption`: String (**Nullable**: Can be empty if it's a milestone-only entry)
    *   `imageUrl`: String (URL, **Nullable**: Can be empty if it's a milestone-only entry)
    *   `createdAt`: Timestamp (Indexed for ordering)
    *   `exerciseTags`: Array<String> (Optional)
    *   `isMilestone`: Boolean (**True** if this post represents or includes a milestone)
    *   `milestoneDetails`: Map (Optional, required if `isMilestone` is true. e.g., `{ type: 'PR', exercise: 'Bench Press', value: '100kg' }`)
    *   `reactionCount`: Number (Denormalized)
    *   `commentCount`: Number (Denormalized)
    *   `visibility`: String ('public', 'followers')
*   **Subcollections:**
    *   **`reactions`**: `/posts/{postId}/reactions/{userId}`
        *   *Doc ID:* `userId`
        *   *Fields:* `{ reactionType: String, reactedAt: Timestamp }`
    *   **`comments`**: `/posts/{postId}/comments/{commentId}`
        *   *Doc ID:* Auto-generated
        *   *Fields:* `{ authorId: String, authorUsername: String, text: String, createdAt: Timestamp }`

### 4. `feeds` (Denormalized User Feeds)

*   **Path:** `/feeds/{userId}/userFeed/{postId}`
*   **Document ID:** `postId` of the post appearing in the feed.
*   **Purpose:** Enables fetching a user's personalized home feed with a single, efficient, ordered query. Contains *copies* of essential post data.
*   **Fields (Copied from original post):**
    *   `authorId`, `authorUsername`, `authorProfileImageUrl`, `caption`, `imageUrl`, `createdAt` (crucial for ordering), `reactionCount`, `commentCount`, `isMilestone`, `milestoneDetails`
*   **Maintenance:** Requires Cloud Functions (on post create/update/delete) to fan-out/remove data to/from followers' feeds.

### 5. `activity` (Notifications/Pulse)

*   **Path:** `/activity/{userId}/userActivity/{activityId}`
*   **Document ID:** Auto-generated (`activityId`)
*   **Purpose:** Stores notification events for a user's "Pulse" screen.
*   **Fields:**
    *   `type`: String ('follow', 'reaction', 'comment', 'milestone_reaction', etc.)
    *   `fromUserId`: String
    *   `fromUsername`: String (Denormalized)
    *   `fromProfileImageUrl`: String (Denormalized)
    *   `postId`: String (Optional, reference)
    *   `postImageUrl`: String (Optional, thumbnail)
    *   `commentText`: String (Optional, snippet)
    *   `createdAt`: Timestamp (Indexed for ordering)
    *   `isRead`: Boolean
*   **Maintenance:** Requires Cloud Functions (triggered by follows, reactions, comments) to create entries.

### 6. `workouts`

*   **Path:** `/workouts/{workoutId}`
*   **Document ID:** Auto-generated (`workoutId`)
*   **Purpose:** Stores workout templates created by users.
*   **Fields:**
    *   `creatorId`: String (`userId`)
    *   `creatorUsername`: String (Denormalized)
    *   `title`: String
    *   `description`: String
    *   `exercises`: Array<Map> (e.g., `{ exerciseId: 'ref', name: 'Bench Press', sets: 3, reps: '8-12' }`)
    *   `createdAt`: Timestamp
    *   `isPublic`: Boolean
    *   `tags`: Array<String>
    *   `savedCount`: Number (Denormalized)

### 7. `directMessages` (DM System)

*   **`conversations`**: `/conversations/{conversationId}`
    *   *Document ID:* Auto-generated (`conversationId`).  Consider using a combination of user IDs (e.g., `userId1_userId2` sorted alphabetically) to simplify querying for existing conversations between two users.
    *   *Purpose:* Stores metadata about each conversation.
    *   *Fields:*
        *   `participants`: Array<String> (Array of `userId`s participating in the conversation).
        *   `lastMessageAt`: Timestamp (Indexed for sorting conversation lists).
        *   `lastMessageText`: String (Snippet of the last message for preview in conversation lists).
        *   `participantUsernames`: Map<String, String> (Key: `userId`, Value: `username` - Denormalized for easy display).
        *   `participantProfileImages`: Map<String, String> (Key: `userId`, Value: `profileImageUrl` - Denormalized).
        *   `isPinnedAI`: Boolean (True if this is the pinned AI chat, only one conversation should have this set to true).
*   **`messages`**: `/conversations/{conversationId}/messages/{messageId}`
    *   *Document ID:* Auto-generated (`messageId`).
    *   *Purpose:* Stores individual messages within a conversation.
    *   *Fields:*
        *   `senderId`: String (`userId` of the sender).
        *   `text`: String (Message content).
        *   `createdAt`: Timestamp (Indexed for ordering messages within a conversation).
        *   `isRead`: Boolean (Default: false, set to true when the recipient views the message).
*   **`userConversations`**: `/users/{userId}/conversations/{conversationId}`
    *   *Document ID:* `conversationId`
    *   *Purpose:*  Links users to their active conversations.  This allows efficient querying of a user's conversation list.
    *   *Fields:*
        *   `lastRead`: Timestamp (Timestamp of the last message read by the user in this conversation. Used for unread indicators).
        *   `otherParticipantId`: String (The `userId` of the other participant in the conversation.  Helpful for displaying the other user's info in the conversation list).
        *   `otherParticipantUsername`: String (Denormalized username of the other participant).
        *   `otherParticipantProfileImage`: String (Denormalized profile image of the other participant).

### 8. `workouts`

*   **Path:** `/workouts/{workoutId}`
*   **Document ID:** Auto-generated (`workoutId`)
*   **Purpose:** Stores workout templates created by users.
*   **Fields:**
    *   `creatorId`: String (`userId`)
    *   `creatorUsername`: String (Denormalized)
    *   `title`: String
    *   `description`: String
    *   `exercises`: Array<Map> (e.g., `{ exerciseId: 'ref', name: 'Bench Press', sets: 3, reps: '8-12' }`)
    *   `createdAt`: Timestamp
    *   `isPublic`: Boolean
    *   `tags`: Array<String>
    *   `savedCount`: Number (Denormalized)

**Cloud Functions for DM System:**

1.  **`onMessageCreate`:**
    *   Triggered when a new message is added to `/conversations/{conversationId}/messages`.
    *   Updates the `lastMessageAt` and `lastMessageText` fields in the `/conversations/{conversationId}` document.
    *   Updates the `lastRead` field in the `/users/{userId}/conversations/{conversationId}` document for the *sender* (to the current timestamp) and sets it to a default value (e.g., the timestamp of the conversation creation) for the *recipient*.
    *   Sends push notifications to the recipient (if enabled).
2.  **`onConversationCreate`:**
    *   Triggered when a new conversation is created in `/conversations`.
    *   Creates documents in the `/users/{userId}/conversations/{conversationId}` subcollection for each participant, linking them to the conversation.
3.  **`onConversationDelete`:**
    *   Triggered when a conversation is deleted in `/conversations`.
    *   Deletes the corresponding documents in the `/users/{userId}/conversations/{conversationId}` subcollection for each participant.
4.  **`onUserFollow`:** (Optional, but recommended)
    *   Triggered when a user follows another user.
    *   Could pre-create a DM thread between the two users (if desired).

**Security Rules for DM System:**

*   **`conversations` Collection:**
    *   Only allow read access to users who are listed in the `participants` array.
    *   Only allow create access if the user creating the conversation is one of the participants.
*   **`messages` Subcollection:**
    *   Only allow read access to users who are listed in the `participants` array of the parent `conversation` document.
    *   Only allow create access if the user creating the message is one of the participants in the parent `conversation` document.
*   **`userConversations` Collection:**
    *   Only allow read and write access to the user owning the document (i.e., the `userId` in the path).

**Note:** This design relies heavily on **Firebase Cloud Functions** to maintain data consistency (denormalized counts, feed fan-out, activity log creation) and perform secure operations (like username availability checks). Implementing these functions is crucial for the design to work effectively and securely.