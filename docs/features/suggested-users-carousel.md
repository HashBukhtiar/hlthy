# Suggested Users Carousel

A "Suggested Users for You" carousel injected into the home feed every 5–7 posts. Powered by a server-side scoring algorithm and a 24-hour Firestore cache.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Computation | Callable Cloud Function | Graph traversal is expensive client-side; admin SDK avoids rule overhead |
| Caching | `users/{uid}/suggestedUsers` doc, 24-hour TTL | Avoids re-running the CF on every feed load |
| Signals | Mutuals + same archetype | Kept simple; tags excluded for now |
| Stacking | Signals stack (mutual + archetype = higher rank) | Users satisfying multiple signals surface first |
| Exclusions | Already following, self, blocked by them | Server-side only; checked during CF execution |
| Carousel position | Every 5–7 posts, same random interval as tag injection | Consistent with existing feed injection pattern |
| Cards per carousel | 5 (horizontally scrollable) | Enough variety without overwhelming |
| Dismiss carousel | Collapses to a "Suggested for you" header bar | Toggle arrow; state is local (no persistence) |
| Dismiss card | X button, removes card from local state only | No cross-session persistence for now |
| Follow from card | Button reflects state (Follow → Following / Requested) | Card stays visible after following |
| Pool size | CF returns top 20 | Client picks first 5 to show; remainder available if cards are dismissed |

---

## 1. Firestore Data Model

### Cache Document

**Path:** `users/{uid}/suggestedUsers`

```typescript
interface SuggestedUsersCache {
  generatedAt: Timestamp;
  suggestions: SuggestedUser[];
}

interface SuggestedUser {
  userId: string;
  username: string;
  displayName: string;
  profileImageUrl?: string;
  profileThumbnailUrl?: string;
  score: number; // higher = more relevant
}
```

Written exclusively by the `getSuggestedUsers` Cloud Function (Admin SDK). Client has read-only access.

### Firestore Rule

```
match /users/{userId}/suggestedUsers/{doc} {
  allow read: if isOwner(userId);
  allow write: if false; // only written by Cloud Functions
}
```

---

## 2. Cloud Function: `getSuggestedUsers`

**File:** `functions/src/callables/getSuggestedUsers.ts`

**Trigger:** Callable HTTPS, region `northamerica-northeast2`

### Algorithm

**Step 1 — Fetch caller context**
- Caller's `following` subcollection (up to 100 entries)
- Caller's `archetype` field from their user document
- Caller's `blockedUsers` array

**Step 2 — Gather mutual candidates**
- For up to 20 of the caller's followees (sampled to cap cost), fetch their `following` subcollection (up to 50 entries each)
- Union all resulting user IDs → raw candidate pool
- Remove: caller's own UID, already-followed UIDs

**Step 3 — Fetch candidate profiles**
- Fetch user documents for up to 50 unique candidates (Firestore `in` chunks)
- From each profile, read: `archetype`, `blockedUsers`, `username`, `displayName`, `profileImageUrl`, `profileThumbnailUrl`

**Step 4 — Filter**
- Exclude candidates whose `blockedUsers` array contains the caller's UID

**Step 5 — Score**

| Signal | Points |
|---|---|
| Appears in ≥1 mutual's following list | +3 |
| Additional mutual beyond the first | +1 per extra (capped at +5 total for mutuals) |
| Same archetype as caller | +2 |

Signals stack. Sort descending by score. Take top 20.

**Step 6 — Write cache + return**
- Write result to `users/{callerUid}/suggestedUsers` with `generatedAt: Timestamp.now()`
- Return the `suggestions` array to the client

### Cost ceiling
- 1 caller doc read
- Up to 100 following reads (caller)
- Up to 20 × 50 = 1,000 following reads (followees) — acceptable for a CF
- Up to 50 candidate profile reads
- 1 cache write

---

## 3. Client — Domain Types

**File:** `features/social/domain/SuggestedUser.ts`

```typescript
export interface SuggestedUser {
  userId: string;
  username: string;
  displayName: string;
  profileImageUrl?: string;
  profileThumbnailUrl?: string;
  score: number;
}

export interface SuggestedUsersCache {
  generatedAt: any; // Firestore Timestamp
  suggestions: SuggestedUser[];
}
```

---

## 4. Client — Repository

**File:** `features/social/infra/suggestedUsersRepository.ts`

```typescript
export const SuggestedUsersRepository = {
  /**
   * Returns cached suggestions if < 24 hours old.
   * Calls the CF to refresh if stale or missing.
   */
  async getSuggestions(uid: string): Promise<SuggestedUser[]>,
};
```

Logic:
1. Read `users/{uid}/suggestedUsers`
2. If doc exists and `generatedAt` is within 24 hours → return `suggestions`
3. Otherwise → call `getSuggestedUsers` CF, return the result

---

## 5. Client — Hook

**File:** `features/social/ui/useSuggestedUsers.ts`

```typescript
export function useSuggestedUsers() {
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch on mount; results are used by the feed carousel
  }, []);

  return { suggestions, loading };
}
```

Consumed by the feed screen to populate carousel data.

---

## 6. Feed Integration

### Feed item type

**File:** `screens/PostsFeed.tsx`

The existing `FeedItem` union type gains a new variant:

```typescript
type FeedItem =
  | FeedPost
  | { type: 'tag_post'; post: FeedPost }
  | { type: 'suggested_users'; id: string }; // id = stable key for FlatList
```

### Injection logic

In the `mergedFeed` useMemo, after the existing tag injection loop:

```typescript
// After each tag injection opportunity, also consider inserting a suggested users carousel.
// Uses the same 5–7 random interval as tag injection but on a separate counter.
// Only inject once per feed refresh (one carousel per full scroll-through).
```

The carousel is injected at most once per feed load (not every 5–7 posts repeatedly). After it appears once, it doesn't repeat until the feed refreshes.

**Update (revision):** Re-reading the requirement — it should appear every 5–7 posts. So it can appear multiple times if the feed is long enough. The same suggestions array is reused each time (just a repeated carousel).

---

## 7. UI Components

### `SuggestedUsersCarousel`

**File:** `components/SuggestedUsersCarousel.tsx`

**Props:**
```typescript
interface Props {
  suggestions: SuggestedUser[];
}
```

**Behaviour:**
- Header row: "Suggested for you" label + chevron toggle (down = expanded, up = collapsed)
- Expanded state: horizontal `FlatList` of `SuggestedUserCard` (5 cards)
- Collapsed state: header only (no cards)
- Local `dismissed` state: `Set<string>` of dismissed userIds
- Feeds the card list as `suggestions.filter(s => !dismissed.has(s.userId)).slice(0, 5)`

**Collapsed UI:**
```
[ @ ]  Suggested for you                    ∧
```
(thin row, tapping anywhere expands)

**Expanded UI:**
```
[ @ ]  Suggested for you                    ∨
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│  pfp │ │  pfp │ │  pfp │ │  pfp │ │  pfp │
│ name │ │ name │ │ name │ │ name │ │ name │
│@user │ │@user │ │@user │ │@user │ │@user │
│[Flw] │ │[Flw] │ │[Flw] │ │[Flw] │ │[Flw] │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘
```

### `SuggestedUserCard`

**File:** `components/SuggestedUserCard.tsx`

**Props:**
```typescript
interface Props {
  user: SuggestedUser;
  onDismiss: (userId: string) => void;
}
```

**Layout:**
- `X` dismiss button top-right (absolute positioned)
- Profile picture (thumbnail preferred)
- Display name (bold)
- `@username` (muted)
- Follow button: `Follow` | `Following` | `Requested`

**Follow behaviour:**
- Taps follow button → calls `useSocialGraph` follow method
- Button state updates locally immediately (optimistic)
- Card tap (anywhere except the button/X) → navigate to `profile/{userId}`

---

## 8. Implementation Order

1. **Domain type** — `features/social/domain/SuggestedUser.ts`
2. **Firestore rule** — add `suggestedUsers` subcollection rule
3. **Cloud Function** — `getSuggestedUsers` callable + export from `index.ts`
4. **Deploy** — `firebase deploy --only functions,firestore:rules`
5. **Client repository** — `suggestedUsersRepository.ts` (cache check + CF call)
6. **Hook** — `useSuggestedUsers.ts`
7. **`SuggestedUserCard` component**
8. **`SuggestedUsersCarousel` component**
9. **Feed injection** — add `suggested_users` FeedItem type + injection logic in `PostsFeed.tsx`

---

## 9. Files Added / Modified

| File | Change |
|---|---|
| `features/social/domain/SuggestedUser.ts` | **New** — types |
| `features/social/infra/suggestedUsersRepository.ts` | **New** — cache read + CF call |
| `features/social/ui/useSuggestedUsers.ts` | **New** — fetch hook |
| `functions/src/callables/getSuggestedUsers.ts` | **New** — scoring algorithm |
| `functions/src/index.ts` | Export new function |
| `firestore.rules` | Add `suggestedUsers` subcollection rule |
| `components/SuggestedUserCard.tsx` | **New** — individual card |
| `components/SuggestedUsersCarousel.tsx` | **New** — carousel with collapse |
| `screens/PostsFeed.tsx` | Add `suggested_users` FeedItem type + injection |

---

## 10. Out of Scope (Follow-up)

- Followed tags as a suggestion signal
- Cross-session card dismissal persistence
- "Not interested" reasons / feedback loop
- Refreshing suggestions when you follow/unfollow someone
- Showing why a user is suggested ("Followed by @x and 3 others")
