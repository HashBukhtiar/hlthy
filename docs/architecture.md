# Architecture

---

## Repository Pattern

The single most important architectural rule in this codebase:

> **Screens and application hooks never import from `firebase/firestore` directly. All Firestore access goes through repository objects in `features/*/infra/`.**

This is enforced as a hard ESLint error in `eslint.config.js`. If you write `import { getDoc } from 'firebase/firestore'` in a screen or hook outside of `features/`, the linter will refuse it.

### Layer Responsibilities

```
┌─────────────────────────────────────────────┐
│  Screen (screens/ or app/)                  │
│  Renders UI, handles user input             │
│  Imports from: hooks only                   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Application Hook (hooks/ or features/*/ui/)│
│  Manages React state, orchestrates calls    │
│  Imports from: repositories + services      │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Repository (features/*/infra/)             │
│  Plain async functions, no React            │
│  Only layer allowed to import firebase/firestore │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Firestore                                  │
└─────────────────────────────────────────────┘
```

### Repository Map

| Domain | Types | Repository | Hook |
|--------|-------|-----------|------|
| Feed | `features/feed/domain/FeedPost.ts` | `features/feed/infra/feedRepository.ts` | `hooks/useFeedData.tsx` |
| Posts | `features/posts/domain/Post.ts` | `features/posts/infra/postRepository.ts` | `hooks/usePostsData.tsx` |
| Profile | `features/profile/domain/Milestone.ts` | `features/profile/infra/profileRepository.ts` | `hooks/useProfileData.tsx` |
| Notifications | `features/notifications/domain/ActivityItem.ts` | `features/notifications/infra/activityRepository.ts` | `features/notifications/ui/usePulse.ts` |
| Social graph | `features/social/domain/SocialGraphEntry.ts` | `features/social/infra/socialGraphRepository.ts` | `features/social/ui/useSocialGraph.ts` |
| Settings | — | `features/settings/infra/settingsRepository.ts` | `hooks/useSettingsHandlers.ts` |
| Workouts | `features/workouts/domain/WorkoutListItem.ts` | `features/workouts/infra/workoutRepository.ts` | `features/workouts/ui/useWorkoutList.ts` |
| Messaging | `features/messaging/domain/Conversation.ts` | `features/messaging/infra/conversationRepository.ts` | `features/messaging/ui/useDMs.ts` |
| Explore | `features/explore/domain/ExploreTypes.ts` | `features/explore/infra/exploreRepository.ts` | `features/explore/ui/useExplore.ts` |

### What's Allowed Where

| Location | `firebase/firestore` | `firebase/auth` | `firebase/storage` |
|----------|---------------------|----------------|-------------------|
| `features/*/infra/` | ✅ | ✅ | ✅ |
| `services/` | ✅ | ✅ | ✅ |
| `context/AuthContext.tsx` | ✅ | ✅ | ✅ |
| `firebaseConfig.ts` | ✅ | ✅ | ✅ |
| `screens/` | ❌ error | ❌ error | ✅ |
| `hooks/` | ❌ error | ❌ error | ✅ |
| `app/` routes | ❌ error | ❌ error | ✅ |

`firebase/storage` is not restricted because image uploads happen in hooks and screens and don't benefit from the same abstraction layer.

---

## Firestore Data Model

### `users/{uid}`

The primary user document. Contains everything about a user.

```
uid                 string   Firebase Auth UID
username            string   Unique, lowercase
displayName         string
email               string
bio                 string
profileImageUrl     string?
profileThumbnailUrl string?
archetype           string   'athlete' | 'bodybuilder' | 'crossfitter' | 'generalist' | 'powerlifter'
profileVisibility   string   'public' | 'private'
messagePermission   string   'everyone' | 'followers'
followerCount       number   Denormalized (kept in sync by Cloud Functions)
followingCount      number   Denormalized
stats               map      { followerCount, followingCount, postCount, workoutCount }
latestPRs           map      { [exerciseId]: { value, unit, reps, date } }
blockedUsers        string[] Array of UIDs this user has blocked
createdAt           Timestamp
notifications       map      { newFollowers, likesAndComments, directMessages, ... }
theme               string   'light' | 'dark' | 'system'
language            string   'en' | 'es' | 'fr' | ...
units               map      { weight: 'metric'|'imperial', distance: 'metric'|'imperial' }
socialLinks         map      { instagram, twitter, tiktok, ... }
```

### `users/{uid}/followers/{followerId}`

One document per follower. Created when someone follows this user.

```
followerId   string   UID of the follower
followedAt   Timestamp
```

### `users/{uid}/pendingFollowers/{requesterId}`

Follow requests waiting for approval (private accounts only).

```
requesterId  string
requestedAt  Timestamp
```

### `users/{uid}/following/{followingId}`

Mirror of the above — who this user follows.

### `users/{uid}/savedWorkouts/{workoutId}`

Workouts saved by this user.

```
workoutId   string
savedAt     Timestamp
```

### `users/{uid}/conversations/{conversationId}`

Per-user DM metadata (read status, pinned status).

### `usersPublic/{uid}`

Minimal public document used for username lookups and availability checks during signup.

```
username     string
isVerified   boolean
createdAt    Timestamp
```

---

### `posts/{postId}`

Every social post, including milestone posts.

```
authorId                string
authorUsername          string
authorProfileImageUrl   string
caption                 string
imageUrl                string?
thumbnailUrl            string?
createdAt               Timestamp
isMilestone             boolean
milestoneDetails        map?    see below
workoutId               string?
reactionCount           number  Denormalized
commentCount            number  Denormalized
visibility              string  'public' | 'followers'
authorArchetype         string?
```

**milestoneDetails shape:**

```
type          string   'PR' | 'weightLoss' | 'weightGain'

# PR fields
exerciseName  string
exerciseId    string?
value         number   weight/time/distance
reps          number?
duration      number?
level         string?
weightUnit    string?

# Weight change fields
newWeight     number
previousWeight number
weightUnit    string
totalLoss     number?
totalGain     number?
improvementPercentage number?
```

### `posts/{postId}/likers/{uid}`

One doc per user who liked the post. Created/deleted on like/unlike.

```
userId          string
username        string
profileImageUrl string?
likedAt         Timestamp
```

### `posts/{postId}/comments/{commentId}`

```
authorId            string
authorUsername      string
text                string
createdAt           Timestamp
likes               number
likedBy             string[]  Array of UIDs
replyCount          number
```

### `posts/{postId}/comments/{commentId}/replies/{replyId}`

```
parentCommentId string
authorId        string
authorUsername  string
text            string
createdAt       Timestamp
likes           number
likedBy         string[]
replyToUserId   string
```

---

### `workouts/{workoutId}`

```
creatorId       string
creatorUsername string
title           string
description     string?
visibility      string   'public' | 'followers' | 'private'
coverImageUrl   string?
thumbnailUrl    string?
segments        array    [ { id, name, length, exercises: [ { id, name, sets, reps } ] } ]
savedCount      number   Denormalized
createdAt       Timestamp
```

---

### `conversations/{conversationId}`

Shared DM thread metadata.

```
participants     string[]  [uid1, uid2]
lastMessageText  string
lastMessageAt    Timestamp
lastMessageSenderId string
```

### `conversations/{conversationId}/messages/{messageId}`

```
senderId     string
text         string?
createdAt    Timestamp
isAiResponse boolean?
sharedPost   map?     { postId, imageUrl, thumbnailUrl, caption }
sharedPhoto  map?     { url, thumbnailUrl }
```

---

### `activity/{uid}/userActivity/{activityId}`

Notification activity items for a user.

```
type             string   See notification types below
fromUserId       string
fromUsername     string
fromProfileImageUrl string?
postId           string?
commentId        string?
replyId          string?
workoutId        string?
workoutTitle     string?
commentText      string?
createdAt        Timestamp
isRead           boolean
status           string?  'pending' | 'accepted' | 'ignored'
```

**Activity types:** `follow_request`, `new_follower`, `post_like`, `post_comment`, `comment_like`, `reply_like`, `comment_reply`, `workout_save`

---

### `feeds/{uid}/userFeed/{postId}`

Denormalized feed entries — pre-populated by Cloud Functions for fast reads.

---

## Cloud Functions

All functions live in `functions/src/` organized into four subdirectories.

### Triggers (`functions/src/triggers/`)

These fire automatically in response to Firestore document events.

**`feedTriggers.ts`**
- `populateFeedsOnPostCreate` — When a post is created, fan it out to all followers' `feeds/{uid}/userFeed/` collections
- `cleanupFeedsOnPostDelete` — Remove a deleted post from all feed collections
- `updateFeedsOnFollowUnfollow` — When a user follows someone, backfill their historical posts into the new follower's feed; remove posts when unfollowed

**`activityTriggers.ts`**
- `createActivityOnPostLike` — Post like → activity entry for the post author
- `createActivityOnPostComment` — Comment → activity entry
- `createActivityOnCommentLike` — Comment like → activity entry
- `createActivityOnWorkoutSave` — Workout save → activity entry
- `onActivityCreated` — Sends push notification when any activity item is created

**`milestoneTriggers.ts`**
- Detects new milestone posts
- Updates `users/{uid}/latestPRs` when a PR milestone is created
- Calculates improvement percentage if previous PR exists

**`imageProcessing.ts`**
- Triggered when an image lands in Cloud Storage
- Generates a compressed thumbnail
- Writes `thumbnailUrl` back to the originating Firestore document (post, user, workout)

**`followTriggers.ts`**
- Handles follow request state transitions
- Updates `followerCount` / `followingCount` on both users
- Block enforcement: prevents following blocked users

**`countTriggers.ts`**
- Increments/decrements denormalized counters on user profiles:
  - `postCount` when a post is created/deleted
  - `workoutCount` when a workout is created
  - `milestoneCount` when a milestone post is created

### Callables (`functions/src/callables/`)

These are called directly from the app via `httpsCallable()`.

**`callableFunctions.ts`**
- `acceptFollowRequest(requestingUserId, activityId)` — Moves a pending follower to the accepted followers subcollection; updates counts; creates activity
- `ignoreFollowRequest(requestingUserId, activityId)` — Marks request as ignored; deletes pending document
- `cancelSentFollowRequest(targetUserId)` — Cancels an outgoing follow request
- `followUser(targetUserId)` — Follow a public account, or send request to a private account
- `unfollowUser(targetUserId)` — Unfollow and remove from follower list
- `deletePost(postId)` — Cascading delete with feed cleanup

**`checkEmailExists.ts`**
- `checkEmailExists(email)` — Returns whether an email is already registered (used during signup)

### Services (`functions/src/services/`)

**`messageService.ts`**
- `approveMessageRequest` — Approve a DM request; moves conversation to active
- `denyMessageRequest` — Reject a DM request
- `sendMessageRequest` — Initiate a DM with a user who has message restrictions

**`notificationService.ts`**
- `sendPushNotification(uid, title, body, data)` — Sends an Expo push notification

**`authCleanupService.ts`**
- Scheduled Cloud Task: cleans up unverified user accounts 5 minutes after signup if email not verified

**`settingsService.ts`**
- Handles settings migrations and sync between `users/{uid}` and related collections

### Admin (`functions/src/admin/`)

**`firebaseAdmin.ts`**
- Initializes Firebase Admin SDK
- Exports `db`, `auth`, `storage` for use in all Cloud Functions

**`adminFunctions.ts`**
- `deleteUserAccount` — Permanently deletes a user: auth account, Firestore docs, Storage files, all subcollections
- `clearUserData(dataType)` — Wipes a specific category of user data (chat history, search history, etc.)

---

## Key Patterns

### Cursor-Based Pagination

Repositories expose opaque cursor types (e.g. `FeedCursor`, `ExploreCursor`) so callers never touch `QueryDocumentSnapshot` directly:

```typescript
// In feedRepository.ts
export type FeedCursor = QueryDocumentSnapshot<DocumentData>;

export interface FeedPage {
  posts: FeedPost[];
  cursor: FeedCursor | null;
}

// In useFeedData.tsx
const [cursor, setCursor] = useState<FeedCursor | null>(null);
const page = await FeedRepository.loadPage(uid, cursor);
```

### Real-Time Listeners

Listeners always return an unsubscribe function and use a cancelled flag to prevent state updates after unmount:

```typescript
let cancelled = false;
const unsubscribe = onSnapshot(q, (snap) => {
  if (cancelled) return;
  setData(snap.docs.map(...));
});
return () => {
  cancelled = true;
  unsubscribe();
};
```

### Optimistic Updates

Feed likes and bookmarks update UI immediately, then sync to Firestore. If the write fails, the UI reverts.

### Denormalized Counts

`followerCount`, `followingCount`, `postCount`, `workoutCount`, and `savedCount` are stored directly on their parent documents for O(1) reads. Cloud Functions keep them in sync on create/delete events. Never compute these by counting subcollection documents in the client.

### Block Enforcement

`useBlockEnforcement()` (from `utils/blockUtils.ts`) provides `canInteractWithUser(userId, theirBlockedUsers)`. This is called in hooks to filter posts, users, and activities before they reach the UI. It checks both directions: whether you've blocked them and whether they've blocked you.

### Image Optimization

Every image upload triggers the `imageProcessing` Cloud Function which creates a compressed thumbnail. The UI always prefers `thumbnailUrl` over `imageUrl` for list views, using `getOptimalImageUrl(thumbnailUrl, imageUrl)` from `utils/imageUtils.ts`.
