# Self-Unmention Feature

Users who are mentioned in a post caption, comment, reply, or workout description can remove themselves from that mention. The action removes the structured mention reference (the `MentionData` object) without altering the original text. The `@username` text remains but becomes non-clickable plain text.

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Data mutation | Remove entry from `mentions` array on the original document | Simplest model; mentions array is metadata, not text |
| Reversibility | Permanent, no undo | Confirmed by product decision |
| Authorization | Callable Cloud Function | Operation is multi-document (content doc + activity doc); server-side enforcement is safer and cleaner than Firestore rules |
| Activity cleanup | Mark activity item `dismissed: true`, do not delete | Preserves history while hiding from inbox |
| Block future mentions | Separate lightweight concept from full user block | User can still interact; enforcement is only at the mention suggestion layer |
| Block storage | `users/{uid}/mentionBlocks/{blockedUid}` subcollection | Scalable, queryable, consistent with social graph pattern |

---

## Scope

Self-unmention is supported in all four mention contexts:

| Context | Document path |
|---------|--------------|
| Post caption | `posts/{postId}` |
| Comment | `posts/{postId}/comments/{commentId}` |
| Reply | `posts/{postId}/comments/{commentId}/replies/{replyId}` |
| Workout description | `workouts/{workoutId}` |

---

## 1. Data Model

### 1a. Content Documents (no schema change)

The existing `mentions?: MentionData[]` field on post, comment, reply, and workout documents is the only field that changes — the mentioned user's `MentionData` entry is removed from the array. The `caption`, `text`, or `description` string is never touched.

### 1b. Activity Documents — new `dismissed` field

**Path:** `activity/{uid}/userActivity/{activityId}`

Add a `dismissed` boolean to the `ActivityItem` domain type:

```typescript
// features/notifications/domain/ActivityItem.ts
dismissed?: boolean;   // true = hidden from inbox, was self-unmentioned
```

The activity item is never deleted; it is updated with `{ dismissed: true }`.

### 1c. Mention Blocks — new subcollection

**Path:** `users/{uid}/mentionBlocks/{blockedUid}`

```typescript
interface MentionBlock {
  blockedAt: Timestamp;
}
```

No domain type file is strictly required (it's a single-field doc), but a type should be added to `features/mentions/domain/Mention.ts` for consistency.

---

## 2. Firestore Security Rules

### 2a. Content documents

No client-side write rules needed for self-unmention — all writes go through the callable Cloud Function using the Admin SDK, which bypasses rules entirely.

### 2b. `mentionBlocks` subcollection

Add rules so a user can only read/write their own mention blocks:

```
match /users/{uid}/mentionBlocks/{blockedUid} {
  allow read, write: if request.auth.uid == uid;
}
```

---

## 3. Cloud Functions

### 3a. New callable: `selfUnmention`

**File:** `functions/src/callables/selfUnmention.ts`

**Input:**

```typescript
interface SelfUnmentionRequest {
  context: 'post_caption' | 'comment' | 'reply' | 'workout_description';
  postId?: string;
  commentId?: string;
  replyId?: string;
  workoutId?: string;
}
```

**Logic (single batched write):**

1. Authenticate — reject if not signed in.
2. Resolve the target document path from `context` + IDs.
3. Fetch the target document; verify `mentions` array contains an entry with `userId === request.auth.uid`. Return early (no-op) if not found.
4. Use `arrayRemove` to remove the caller's `MentionData` entry from `mentions`.
5. Find the corresponding `activity/{uid}/userActivity` document where `type === 'mention'` and the context fields match (e.g. `postId`, `commentId`). Mark it `{ dismissed: true }` using `update`.
6. Commit both writes in a single `WriteBatch`.

**Error cases:**

- Document not found → throw `not-found`
- User not in mentions → return success silently (idempotent)
- Missing required IDs for context → throw `invalid-argument`

**File exports:** Add `selfUnmention` to `functions/src/index.ts`.

### 3b. New callable: `blockMentionUser`

**File:** `functions/src/callables/blockMentionUser.ts`

**Input:**

```typescript
interface BlockMentionUserRequest {
  targetUid: string;  // the user to block from mentioning you
}
```

**Logic:**

1. Authenticate — reject if not signed in.
2. Prevent self-blocking — throw `invalid-argument` if `targetUid === request.auth.uid`.
3. Write `{ blockedAt: Timestamp.now() }` to `users/{callerUid}/mentionBlocks/{targetUid}`.

**File exports:** Add `blockMentionUser` to `functions/src/index.ts`.

### 3c. Update `searchUsersForMention`

**File:** `functions/src/callables/mentionSearch.ts`

In addition to the existing blocked-users list, fetch the caller's `mentionBlocks` subcollection and exclude those UIDs from results. Since both lists must be fetched in parallel, add:

```typescript
const mentionBlocksSnap = await db
  .collection('users').doc(callerUid)
  .collection('mentionBlocks')
  .get();
const mentionBlockedByMe = new Set(mentionBlocksSnap.docs.map(d => d.id));
```

Then filter suggestions: exclude any user whose UID is in `mentionBlockedByMe` (in addition to the existing blocked-user exclusion).

---

## 4. Client — Repository Layer

### 4a. `mentionRepository.ts`

**File:** `features/mentions/infra/mentionRepository.ts`

Add two callable wrappers:

```typescript
export const MentionRepository = {
  // existing
  async searchUsersForMention(query: string): Promise<MentionSuggestion[]> { ... },

  // new
  async selfUnmention(params: SelfUnmentionParams): Promise<void> {
    const callable = httpsCallable(functions, 'selfUnmention');
    await callable(params);
  },

  async blockMentionUser(targetUid: string): Promise<void> {
    const callable = httpsCallable(functions, 'blockMentionUser');
    await callable({ targetUid });
  },
};
```

Add `SelfUnmentionParams` type to `features/mentions/domain/Mention.ts`:

```typescript
export interface SelfUnmentionParams {
  context: 'post_caption' | 'comment' | 'reply' | 'workout_description';
  postId?: string;
  commentId?: string;
  replyId?: string;
  workoutId?: string;
}
```

### 4b. `activityRepository.ts`

**File:** `features/notifications/infra/activityRepository.ts`

Update the `subscribeOtherActivities` query to filter out dismissed items:

```typescript
where('dismissed', '!=', true)
```

Add this `where` clause alongside the existing `type != 'follow_request'` filter.

---

## 5. Client — UI Layer

### 5a. New hook: `useSelfUnmention`

**File:** `features/mentions/ui/useSelfUnmention.ts`

```typescript
export function useSelfUnmention() {
  const [loading, setLoading] = useState(false);

  // Returns a function that shows a confirmation dialog,
  // then calls MentionRepository.selfUnmention (and optionally blockMentionUser).
  // Accepts a callback for post-success UI updates (e.g. local state update).
  const promptSelfUnmention = useCallback(async (
    params: SelfUnmentionParams,
    authorUsername: string,
    authorUid: string,
    onSuccess?: () => void,
  ) => { ... }, []);

  return { promptSelfUnmention, loading };
}
```

**Confirmation dialog flow:**

1. Alert title: `"Remove your mention?"`
2. Body: `"Your @username will no longer link to your profile. This cannot be undone."`
3. Buttons: `"Cancel"` | `"Remove Mention"` (destructive)
4. On confirm:
   - Call `MentionRepository.selfUnmention(params)`
   - If user tapped "Also prevent @{authorUsername} from mentioning you" (see §5b), also call `MentionRepository.blockMentionUser(authorUid)`
   - Call `onSuccess()` so the caller can update local state

### 5b. Confirmation dialog — optional block

Below the confirmation message, include a checkbox/toggle:

> ☐ Also prevent @{authorUsername} from mentioning you in the future

If checked, `blockMentionUser` is called in the same operation. This is the only entry point for the block-mentions feature (no separate settings screen in this PR).

### 5c. `MentionText.tsx` — graceful fallback

**File:** `components/MentionText.tsx`

No change to props interface. The existing rendering logic already produces plain text for `@username` tokens not found in the `mentions` array. Once the mention is removed from the array (local state update on success), the component naturally degrades to non-clickable text on next render. No extra logic needed.

---

## 6. UI Entry Points

### 6a. Post caption — 3-dot menu (PostFeed + ViewPost)

**Files:** wherever the post 3-dot menu is rendered for feed cards and `screens/ViewPost.tsx`

**Condition:** Only show "Remove my mention" if `currentUser.uid` is present in `post.mentions`.

**New menu item:** `"Remove my mention"` added to the existing options array, gated on the above condition.

**On tap:** Call `useSelfUnmention().promptSelfUnmention` with `context: 'post_caption'` and `postId`. On success, remove the current user's entry from local `mentions` state so `MentionText` degrades immediately without a refetch.

### 6b. Comments — long-press action sheet

**File:** `screens/ViewPost.tsx` (existing long-press handler for comments)

**Condition:** Only show "Remove my mention" if `currentUser.uid` is in `comment.mentions`.

**New action:** `"Remove my mention"` added to the existing long-press options alongside Like, Reply, Delete, Report.

**On tap:** Call `promptSelfUnmention` with `context: 'comment'`, `postId`, `commentId`. On success, update local comment state.

### 6c. Replies — long-press action sheet

**File:** `screens/ViewPost.tsx` (existing long-press handler for replies)

Same pattern as comments, with `context: 'reply'` and `replyId` added.

### 6d. Workout description — new 3-dot menu

**File:** `screens/ViewWorkout.tsx`

**Change:** Replace the standalone Report button in the top-right action row with a 3-dot (`⋯`) icon button that opens a bottom sheet / action sheet containing:

1. `"Report workout"` — existing report action, moved here
2. `"Remove my mention"` — only visible if `currentUser.uid` is in `workout.mentions`

**On "Remove my mention" tap:** Call `promptSelfUnmention` with `context: 'workout_description'` and `workoutId`. On success, update local workout state.

---

## 7. Implementation Order

Complete these in sequence to keep the branch in a deployable state at each step:

1. **Domain types** — add `dismissed` to `ActivityItem`, add `SelfUnmentionParams` and `MentionBlock` to `Mention.ts`
2. **Cloud Functions** — implement `selfUnmention` and `blockMentionUser` callables; update `searchUsersForMention`; export from `index.ts`
3. **Firestore rules** — add `mentionBlocks` read/write rule
4. **Deploy functions + rules** — `firebase deploy --only functions,firestore:rules`
5. **Repository layer** — add `selfUnmention` and `blockMentionUser` to `MentionRepository`; update `activityRepository` query to filter `dismissed`
6. **`useSelfUnmention` hook** — confirmation dialog + optional block flow
7. **UI entry points** — post 3-dot menu, comment long-press, reply long-press, workout 3-dot menu (in any order, they are independent)
8. **QA** — verify each context end-to-end; verify activity item is hidden after dismiss; verify mention block excludes user from search suggestions

---

## 8. Files Added / Modified

| File | Change |
|------|--------|
| `features/mentions/domain/Mention.ts` | Add `SelfUnmentionParams`, `MentionBlock` types |
| `features/notifications/domain/ActivityItem.ts` | Add `dismissed?: boolean` |
| `features/mentions/infra/mentionRepository.ts` | Add `selfUnmention`, `blockMentionUser` callables |
| `features/notifications/infra/activityRepository.ts` | Filter `dismissed !== true` in subscription query |
| `features/mentions/ui/useSelfUnmention.ts` | **New** — confirmation dialog + block logic |
| `functions/src/callables/selfUnmention.ts` | **New** — multi-doc atomic write |
| `functions/src/callables/blockMentionUser.ts` | **New** — write to `mentionBlocks` subcollection |
| `functions/src/callables/mentionSearch.ts` | Exclude `mentionBlocks` from suggestions |
| `functions/src/index.ts` | Export two new callables |
| `firestore.rules` | Add `mentionBlocks` subcollection rule |
| `screens/ViewWorkout.tsx` | Replace Report button with 3-dot menu |
| `screens/ViewPost.tsx` | Add "Remove my mention" to comment/reply long-press |
| Post 3-dot menu component(s) | Add "Remove my mention" menu item |

---

## 9. Out of Scope (Follow-up PRs)

- Retroactively removing all past mentions when a user is mention-blocked (only future mentions are prevented)
- A dedicated "Manage mention blocklist" settings screen
- Deleted-user mention degradation (already partially handled by `MentionText` — if `mentions` array is empty/missing, text is plain)
