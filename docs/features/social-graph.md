# Social Graph

The social graph covers following, followers, blocking, and account privacy. These relationships control what content each user can see.

---

## Key Files

| File | Purpose |
|------|---------|
| `screens/Followers.tsx` | Follower list UI |
| `screens/Following.tsx` | Following list UI |
| `features/social/ui/useSocialGraph.ts` | Hook for follower/following lists |
| `features/social/infra/socialGraphRepository.ts` | `listFollowers`, `listFollowing`, `fetchUsername` |
| `features/social/domain/SocialGraphEntry.ts` | `SocialGraphEntry` type |
| `hooks/useProfileData.tsx` | Follow/unfollow actions (`followUser`, `unfollowUser`) |
| `utils/blockUtils.ts` | `useBlockEnforcement` hook |

---

## Following

### Public accounts

Tapping **Follow** on a public account immediately creates a follower relationship:
- `users/{targetId}/followers/{currentUid}` is created
- `users/{currentUid}/following/{targetId}` is created
- Both users' counts are updated by Cloud Functions

### Private accounts

Tapping **Follow** on a private account (`profileVisibility: 'private'`) creates a pending request:
- `users/{targetId}/pendingFollowers/{currentUid}` is created
- A `follow_request` activity item is created for the target
- The button changes to "Requested"
- The request appears in the target's Pulse tab

### Cancelling a request

Tapping the "Requested" button again cancels the outgoing request. This calls the Cloud Function `cancelSentFollowRequest(targetUserId)`.

---

## Accepting / Ignoring Follow Requests

Handled in the [Notifications](./notifications.md) feature. See that document for the full flow.

---

## Unfollowing

Calls the Cloud Function `unfollowUser(targetUserId)`:
- Deletes `users/{targetId}/followers/{currentUid}`
- Deletes `users/{currentUid}/following/{targetId}`
- Decrements both users' counts
- The unfollowed user's followers-only posts are no longer shown in the unfollower's feed (Cloud Function handles feed cleanup)

---

## Follower / Following Lists

Both `Followers.tsx` and `Following.tsx` use `useSocialGraph(userId, mode)`:

```typescript
const { entries, username, loading, error } = useSocialGraph(userId, 'followers');
// or
const { entries, username, loading, error } = useSocialGraph(userId, 'following');
```

```typescript
interface SocialGraphEntry {
  id: string;
  username: string;
  displayName?: string;
  profileImageUrl?: string;
  profileThumbnailUrl?: string;
}
```

Tapping an entry navigates to that user's profile.

---

## Blocking

Users can block someone from:
- A post's three-dot menu
- Another user's profile page

Blocking:
- Adds the blocked user's UID to `users/{currentUid}/blockedUsers` array
- (Cloud Function removes any existing follower relationship)

### Block enforcement

`useBlockEnforcement()` provides `canInteractWithUser(userId, theirBlockedUsers)`. It returns `false` if:
- The target has blocked the current user (checked against `theirBlockedUsers` param)
- The current user has blocked the target (checked against `currentUser.blockedUsers`)

This is called in hooks (feed enrichment, explore search, notifications, DMs) to filter results before they reach the UI. Blocked users don't appear in searches, feeds, or activity feeds.

---

## Privacy Model

| Account type | Profile visible to | Posts visible to | Can follow directly? |
|-------------|-------------------|-----------------|---------------------|
| Public | Everyone | Everyone | Yes |
| Private | Everyone (header only) | Approved followers | No — must request |

Even on a private account, the profile header (photo, bio, follower count) is always visible. Content tabs are hidden until the viewer follows and is approved.

---

## Feed & Content Impact

The follow graph directly controls what appears in each user's feed:

- Following someone triggers `updateFeedsOnFollowUnfollow` Cloud Function, which backfills their posts into your feed
- Unfollowing triggers removal of their posts from your feed
- Blocking triggers removal of their posts from your feed
