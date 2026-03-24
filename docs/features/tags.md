# Tags (Hashtags) Feature

## Overview

Users can add up to `MAX_TAGS` (currently 10) hashtags to regular posts, image+milestone posts, and workout descriptions. Tags are not supported on milestone-only posts, nor in comments or replies (reserved for a future iteration). Tags power a dedicated feed in the Explore screen (to be built separately) and are searchable from the Explore search bar.

---

## Constants

```typescript
// features/tags/domain/Tag.ts
export const MAX_TAGS = 10;
export const MAX_TAG_LENGTH = 32; // characters, excluding the leading #
export const TAG_PATTERN = /^[a-z0-9_-]{1,32}$/;
```

`MAX_TAGS` is intentionally a named constant so the limit can be raised without a code search.

---

## Data Model

### Tag domain type

**New file:** `features/tags/domain/Tag.ts`

```typescript
export interface TagSearchResult {
  name: string;       // normalized: lowercase, no #, e.g. "legday"
  postCount: number;  // number of posts currently using this tag
}
```

No `TagData` struct is needed on posts — tags are stored as a plain `string[]`.

### Firestore — `hashtags` collection (new top-level collection)

```
hashtags/{tagName}/
  name:       string     — normalized tag name (same as doc ID)
  postCount:  number     — count of posts currently using this tag
  isBanned:   boolean    — managed via Firestore console; silent rejection on client
  createdAt:  Timestamp  — when first used
```

`tagName` is the document ID and equals `name` (e.g. doc ID `legday`, not `#legday`). This makes point reads cheap and the collection easy to manage.

### Post document (`posts/{postId}`)

- **Remove** `exerciseTags?: string[]`
- **Add** `tags?: string[]` — array of normalized tag names, no `#`, max `MAX_TAGS` entries

Update `features/posts/domain/Post.ts`:
```typescript
// Before
exerciseTags?: string[];

// After
tags?: string[];
```

Update `NewPostData`:
```typescript
tags?: string[];
```

Also update references in:
- `docs/DBDESIGN.md`
- `docs/features/posts.md`
- `docs/features/feed.md`

### Workout document (`workouts/{workoutId}`)

The `tags: []` field already exists in Firestore (initialized in `workoutRepository.ts:130`) but is currently unused. Add to the domain model:

Update `features/workouts/domain/WorkoutDraft.ts`:
```typescript
tags?: string[];
```

---

## Tag Normalization

All tags are normalized before storage and before any lookup. Apply this transform at the input layer (client-side, before adding a chip):

1. Strip leading `#` if present
2. Lowercase the entire string
3. Remove any character not in `[a-z0-9_-]`
4. Trim leading/trailing `-` and `_`
5. Truncate to `MAX_TAG_LENGTH` (32) characters
6. Reject (silently ignore) if the result is an empty string

A `normalizeTag(raw: string): string | null` utility function should live in `features/tags/domain/Tag.ts`. Returns `null` if the result is empty after normalization.

---

## Input UX — Two Entry Points

### Entry Point 1: Dedicated Tags Section

Below the caption input in `RegularPost`, `CreateWorkout`, and their edit counterparts, a dedicated **Tags section** is shown. The user does **not** type `#` here — the section is implicitly for tags.

**Interaction flow:**
1. User taps the tag input field (placeholder: "Add a tag…")
2. As they type, an autocomplete dropdown appears (same visual style as mention suggestions)
3. If the typed string matches existing tags, those are shown in the dropdown ranked by `postCount` descending
4. If no existing tag exactly matches what the user has typed, the **first row** of the dropdown always shows an option to create the typed tag (e.g. "**#newtagname**  — Create tag"), so the user always has a path forward
5. User confirms a tag by:
   - Tapping a row in the dropdown, **or**
   - Pressing Enter / Space / Comma on the keyboard
6. The confirmed tag becomes a **chip** in the chips row
7. The text input clears and is ready for the next tag
8. Once `MAX_TAGS` chips are present the input is hidden / disabled with a small label "Maximum 10 tags reached"

### Entry Point 2: Inline `#` in Caption

While typing in the caption field (`MentionTextInput`), if the user types `#` at a word boundary the same autocomplete dropdown appears (same behaviour as `@` for mentions, but for tags).

**Interaction flow:**
1. User types `#leg` in the caption — dropdown appears
2. User confirms via dropdown tap or Enter/Space/Comma
3. The `#legday` text is **removed from the caption** automatically
4. The confirmed tag is added as a chip in the Tags section below, exactly as if it had been entered there directly
5. If the tag already exists in the chips row, it is silently deduplicated (not added twice)

This keeps the caption text clean and all tags consistently in one place.

**Implementation note:** `MentionTextInput` currently handles `@` detection by walking backward from the cursor. Add parallel `#` detection using the same cursor-walk approach. When a tag is confirmed from the caption, fire an `onTagFromCaption(tag: string)` callback prop. The parent screen handles adding to the `tags` array and clearing the `#word` fragment from the caption string.

---

## Chips UI

- Each chip displays `#tagname` (the `#` is always shown visually, never stored)
- Standard **X button** on the right of each chip to remove it
- Chips are **drag-to-reorder** (visual preference only — order has no semantic meaning and is not used for anything under the hood; store tags as-received)
- Use a drag-capable chip list component (e.g. `react-native-drag-flatlist` or a simple long-press-drag wrapper)
- Chip styling should be visually distinct from mention links — use a pill/badge shape, suggest a muted accent or secondary color (TBD at implementation time, consistent with the app's design system)

---

## Autocomplete / Search

### Cloud Function: `searchHashtags` (new callable)

**File:** `functions/src/callables/hashtagSearch.ts`

```typescript
// Input
{ query: string }  // normalized before sending

// Behaviour
// 1. Prefix search: hashtags where name >= query && name <= query + "\uf8ff"
// 2. Filter out isBanned === true
// 3. Sort by postCount desc
// 4. Limit 20 results
// 5. Return TagSearchResult[]

// Output
{ results: TagSearchResult[] }
```

The client always prepends a "create this tag" option if the exact query is not present in results (handled client-side, no extra round-trip needed).

### Client hook: `useTagSearch`

**File:** `features/tags/ui/useTagSearch.ts`

Mirrors `useMentionSearch`:
- 300ms debounce
- Calls `searchHashtags` callable
- Returns `{ results, loading, search, clear }`

### Repository: `TagRepository`

**File:** `features/tags/infra/tagRepository.ts`

```typescript
// Methods:
searchTags(query: string): Promise<TagSearchResult[]>   // calls the callable
// (future) fetchTagFeed(tagName, cursor): Promise<Post[]>
```

---

## Backend — Firestore Triggers

### `onPostCreated` / `onPostDeleted` / `onPostWritten`

**File:** `functions/src/triggers/tagTriggers.ts`

**On post created:** For each tag in `post.tags`, increment `postCount` on the `hashtags/{tag}` document (create if not exists).

**On post deleted:** For each tag in `post.tags`, decrement `postCount` (floor at 0).

**On post updated (edit):** Diff old tags vs. new tags. Decrement removed tags, increment added tags.

**Banned tag enforcement:** At write time (post creation/update trigger), filter out any tags where `hashtags/{tag}.isBanned === true` from the stored `tags` array. This is the authoritative ban enforcement — the client-side autocomplete filter is a UX convenience only, not a security boundary.

---

## Screens to Update

### Creation screens

| Screen | Change |
|--------|--------|
| `screens/RegularPost.tsx` | Add `tags` state, `TagInput` component below caption, handle `onTagFromCaption` callback, pass `tags` to `NewPostData` |
| `screens/CreateWorkout.tsx` | Same as above |

### Edit screens

| Screen | Change |
|--------|--------|
| `app/edit-post/[id].tsx` | Load existing `tags` from post, add `TagInput`, save updated `tags` on submit |
| `app/edit-workout/[id].tsx` | Load existing `tags` (already has placeholder comment), add `TagInput`, save on submit |

### Display screens

| Screen | Change |
|--------|--------|
| Post card (feed + post detail) | Below caption, if `tags` is non-empty, render a horizontal row of `TagChip` components |
| Workout detail screen | Below description, same row of `TagChip` components |

---

## New Components

### `TagInput.tsx`

Full input component used in creation/edit screens.

```typescript
interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  // Called by parent when a # was typed and confirmed in the caption input,
  // so TagInput can add the chip without duplicate logic.
  // Parent is responsible for calling this; TagInput itself handles dedup.
}
```

Internally manages: text input state, dropdown visibility, `useTagSearch` hook, chip list with X buttons, drag-to-reorder, `MAX_TAGS` enforcement.

### `TagChip.tsx`

Read-only display chip, used in feed/detail views.

```typescript
interface TagChipProps {
  tag: string;           // normalized name without #
  onPress?: () => void;  // navigates to tag feed (Explore integration)
}
```

Renders `#tag` as a styled pill. When tapped, calls `onPress`.

### `TagSuggestionRow.tsx`

Single row in the autocomplete dropdown.

```typescript
interface TagSuggestionRowProps {
  result: TagSearchResult | { name: string; isNew: true };
  onPress: () => void;
}
```

Shows tag name + post count for existing tags. Shows "Create tag" indicator for the new-tag option.

---

## Explore Integration (Stub — Deferred)

This feature does **not** build the tag feed, but lays the groundwork so it can be added cleanly later.

### Changes now

1. Add `TagSearchResult` to `features/explore/domain/ExploreTypes.ts`
2. Add a stub navigation function in the explore feature:

```typescript
// features/explore/ui/useExplore.ts (or a new useTagFeed.ts)

/**
 * Navigate to the tag feed for the given tag name.
 * TODO: Implement tag feed screen and replace this stub.
 */
export function navigateToTagFeed(tagName: string, router: Router): void {
  // router.push(`/explore/tags/${tagName}`);  ← uncomment when ready
  // For now: no-op (tapping a tag does nothing visually)
}
```

3. `TagChip.onPress` calls `navigateToTagFeed` — so when the feed screen is built, only the stub needs to be filled in, no chip or feed-plumbing code needs to change.

### What's needed later (not in scope now)

- `/app/explore/tags/[tag].tsx` — new screen showing paginated posts for a tag
- `FeedRepository.fetchTagFeed(tagName, cursor)` — Firestore query on `posts` where `tags` array-contains `tagName`, ordered by `createdAt` desc
- `ExploreTypes.ts`: `TagFeedPost` type
- Search bar in `Explore.tsx` able to query `searchHashtags` and show tag results alongside user results

---

## File Structure Summary

```
features/tags/
  domain/
    Tag.ts                     — TagSearchResult type, MAX_TAGS, MAX_TAG_LENGTH, TAG_PATTERN, normalizeTag()
  infra/
    tagRepository.ts           — searchTags(), (future) fetchTagFeed()
  ui/
    useTagSearch.ts            — debounced search hook

components/
  TagInput.tsx                 — creation/edit chip input with autocomplete
  TagChip.tsx                  — read-only display chip (feed, detail views)
  TagSuggestionRow.tsx         — autocomplete dropdown row

functions/src/
  callables/
    hashtagSearch.ts           — searchHashtags callable cloud function
  triggers/
    tagTriggers.ts             — postCount increment/decrement + ban enforcement

// Modified files
features/posts/domain/Post.ts               — exerciseTags → tags
features/workouts/domain/WorkoutDraft.ts    — add tags?: string[]
features/explore/domain/ExploreTypes.ts     — add TagSearchResult
features/explore/ui/useExplore.ts           — add navigateToTagFeed stub
screens/RegularPost.tsx                     — add TagInput + onTagFromCaption wiring
screens/CreateWorkout.tsx                   — add TagInput + onTagFromCaption wiring
app/edit-post/[id].tsx                      — load + save tags
app/edit-workout/[id].tsx                   — load + save tags
components/MentionTextInput.tsx             — add # detection + onTagFromCaption prop
docs/DBDESIGN.md                            — update exerciseTags → tags
docs/features/posts.md                      — update exerciseTags → tags
docs/features/feed.md                       — update Post type
```

---

## Out of Scope (This Feature)

- Tag feed screen in Explore
- Tag search in Explore search bar
- Trending tags
- Tag-based notifications
- Tags in comments or replies
- In-app admin UI for banning tags (managed via Firestore console)
