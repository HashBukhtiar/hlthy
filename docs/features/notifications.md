# Notifications (Pulse)

The **Pulse** tab is the notification center. It shows follow requests and a reverse-chronological activity feed of things that happened on your content.

---

## User Experience

Pulse is split into two sections:

**Follow Requests** (top)
- Each card shows the requester's photo, name, and username
- Two buttons: **Accept** and **Ignore**
- Accepting moves them to your followers; ignoring dismisses the request

**Activity Feed** (below)
- Everything else: likes, comments, replies, workout saves, new followers
- Tapping an activity navigates to the relevant post, comment, or profile
- Unread items have a visual indicator

---

## Key Files

| File | Purpose |
|------|---------|
| `screens/Pulse.tsx` | Pulse UI — two-section list, accept/ignore buttons |
| `features/notifications/ui/usePulse.ts` | Hook — manages two real-time listeners |
| `features/notifications/infra/activityRepository.ts` | Firestore subscriptions |
| `features/notifications/domain/ActivityItem.ts` | `ActivityItem` type |

---

## Activity Types

```typescript
type ActivityType =
  | 'follow_request'     // Someone wants to follow you (private account)
  | 'new_follower'       // Someone followed you (public account)
  | 'post_like'          // Your post was liked
  | 'post_comment'       // Your post was commented on
  | 'comment_like'       // Your comment was liked
  | 'reply_like'         // Your reply was liked
  | 'comment_reply'      // Someone replied to your comment
  | 'workout_save';      // Someone saved your workout
```

---

## ActivityItem Type

```typescript
interface ActivityItem {
  id: string;
  type: ActivityType;
  fromUserId: string;
  fromUsername: string;
  fromProfileImageUrl?: string;
  fromProfileThumbnailUrl?: string;
  postId?: string;
  postImageUrl?: string;
  postThumbnailUrl?: string;
  commentId?: string;
  replyId?: string;
  workoutId?: string;
  workoutTitle?: string;
  workoutThumbnailUrl?: string;
  commentText?: string;
  createdAt: Timestamp;
  isRead: boolean;
  status?: 'pending' | 'accepted' | 'ignored';
}
```

---

## Real-Time Updates

`usePulse` opens **two separate Firestore listeners**:

1. **Follow requests listener** — Queries `activity/{uid}/userActivity` where `type == 'follow_request'` and `status == 'pending'`
2. **Other activities listener** — Queries the same collection where `type != 'follow_request'`, ordered by `createdAt` descending

Both listeners run concurrently and update their respective state slices independently. They are cleaned up on unmount.

---

## Deduplication

Follow requests are deduplicated by `fromUserId` — if the same user has sent multiple follow requests (due to a bug or retry), only the most recent one is shown.

---

## Block Enforcement

Activity items from blocked users are filtered out before they reach the UI. The `usePulse` hook calls `isUserBlocked(fromUserId)` on each item and removes those that return true.

---

## Accepting / Ignoring Follow Requests

Both actions call Cloud Functions via `httpsCallable`:

**Accept:** `acceptFollowRequest(requestingUserId, activityId)`
- Moves `pendingFollowers/{requesterId}` to `followers/{requesterId}`
- Updates `followerCount` on the target and `followingCount` on the requester
- Creates a `new_follower` activity for the target
- Updates the follow request activity to `status: 'accepted'`

**Ignore:** `ignoreFollowRequest(requestingUserId, activityId)`
- Deletes `pendingFollowers/{requesterId}`
- Updates the activity to `status: 'ignored'`

---

## Push Notifications

When any activity is created in Firestore, the `onActivityCreated` Cloud Function trigger fires and sends a push notification if the target user has that notification type enabled in their settings.

Push tokens are managed by `NotificationService`:
- Token is registered on login and stored in `users/{uid}/pushTokens/{token}`
- Token is removed on logout
