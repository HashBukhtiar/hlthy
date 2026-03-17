# Profile

Every user has a profile page that shows their identity, stats, and content. Profiles can be public or private.

---

## User Experience

Tapping someone's avatar or username anywhere in the app navigates to their profile. Your own profile is always accessible from the Profile tab.

### Profile Header

- **Profile photo** — Tap to view full size (own profile: tap to change)
- **Archetype badge** — Icon + label below the photo
- **Display name** and **@username**
- **Bio** — Short description the user has written
- **Follower / Following counts** — Tapping either opens a searchable modal list
- **Follow button** — Shows on other users' profiles; state-aware (Follow / Following / Pending / Requested)
- **Message button** — Opens a DM
- **Options menu** — Block, report, share profile

### Content Tabs

| Tab | What it shows |
|-----|--------------|
| Posts | Grid of the user's image posts (milestone-only excluded) |
| Milestones | Achievements grouped by month |
| Workouts | Workouts they created + saved workouts (own profile only) |

---

## Key Files

| File | Purpose |
|------|---------|
| `screens/Profile.tsx` | Profile UI |
| `hooks/useProfileData.tsx` | Data fetching, follow/unfollow, refresh |
| `features/profile/infra/profileRepository.ts` | Firestore queries |
| `features/profile/domain/Milestone.ts` | `Milestone` and `GroupedMilestones` types |
| `hooks/useProfileActions.ts` | Block, report, share actions |

---

## Data Loaded by `useProfileData`

When a profile page mounts, the hook fetches these in sequence:

1. **User document** (`users/{userId}`) — the full profile
2. **Posts** — All posts by this user, with the profile image already injected (avoids N+1 queries since we already have the profile)
3. **Workouts** — Workouts created by this user
4. **Saved workouts** — Only fetched on the user's own profile
5. **Followers list** — `users/{userId}/followers/`
6. **Following list** — `users/{userId}/following/`
7. **Follow status** — Checks `followers/{currentUid}` and `pendingFollowers/{currentUid}` to know whether to show Follow / Following / Pending

Each fetch is wrapped in its own try/catch so a failure in one (e.g. workouts) doesn't prevent the profile from loading.

---

## Follow States

The follow button on another user's profile can be in one of these states:

| State | Display | Condition |
|-------|---------|-----------|
| `follow` | "Follow" | You don't follow them and have no pending request |
| `following` | "Following" | You follow them |
| `pending` | "Requested" | You sent a follow request; they haven't accepted |
| `own` | (hidden) | It's your own profile |

When a user has a **private account** (`profileVisibility: 'private'`), tapping Follow sends a request to `users/{targetId}/pendingFollowers/{currentUid}` instead of immediately following. The request then appears in the target's Pulse tab.

---

## Profile Visibility & Privacy

| Profile type | Who can see their posts? | Who can follow immediately? |
|-------------|-------------------------|-----------------------------|
| Public | Everyone | Everyone |
| Private | Approved followers only | No one — must request |

Private profile content is blurred/hidden until a follow request is accepted. The profile header (photo, bio, counts) is always visible.

---

## Milestones on Profile

Milestone posts are extracted from the user's posts, grouped by `"Month Year"` (e.g. `"January 2025"`), and sorted chronologically within each group.

```typescript
interface Milestone {
  id: string;
  postId: string;
  date: Timestamp | Date;
  exerciseName?: string;
  reps?: number;
  weight?: string;    // formatted string, e.g. "100 kg"
  value?: number | string;
  weightUnit?: string;
  // ...additional type-specific fields
}

// Profile renders this grouped structure
interface GroupedMilestones {
  [monthYear: string]: Milestone[];  // "January 2025" → [...]
}
```

---

## Refreshing Profile Data

Pull-to-refresh on the Profile screen calls `refreshProfileData()`. This function:

1. Clears the `lastFetchedUserId` ref (bypassing the deduplication guard)
2. Re-runs the full profile fetch sequence

The hook uses several `useRef` guards to prevent redundant fetches and race conditions when the user ID changes or the component remounts.

---

## Deduplication Guards

`useProfileData` has three `useRef` flags:

| Ref | Purpose |
|-----|---------|
| `isFetching` | Prevents concurrent fetches for the same user |
| `lastFetchedUserId` | Skips re-fetch if already fetched this user |
| `hasCleared` | Prevents clearing state more than once on logout |
