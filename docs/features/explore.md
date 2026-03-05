# Explore

The Explore screen lets users discover new people to follow and browse public posts from across the community.

---

## User Experience

The screen has two modes that switch based on whether the user is searching:

**Browse mode (default):** A 3-column grid of public post images. Scroll down to load more.

**Search mode (active when typing):** A list of users matching the search query. Tap a result to visit their profile.

---

## Key Files

| File | Purpose |
|------|---------|
| `screens/Explore.tsx` | Explore UI — search bar, post grid, user results |
| `features/explore/ui/useExplore.ts` | Hook — search state, pagination, debounce |
| `features/explore/infra/exploreRepository.ts` | Firestore queries |
| `features/explore/domain/ExploreTypes.ts` | `ExplorePost` and `UserSearchResult` types |

---

## User Search

Search is triggered after a 300ms debounce. It queries Firestore with a range filter on the `username` field:

```
where('username', '>=', query.toLowerCase())
where('username', '<=', query.toLowerCase() + '\uf8ff')
limit(20)
```

This gives a case-sensitive prefix search. Results are filtered client-side to:
- Remove the current user
- Remove blocked users (using `canInteractWithUser` from `useBlockEnforcement`)

Maximum 10 results are shown.

---

## Post Grid

The post grid uses two parallel queries that alternate as the user scrolls:

### Archetype posts

Posts by authors who share the current user's archetype. Ordered by `createdAt` descending.

```
where('visibility', '==', 'public')
where('authorArchetype', '==', userProfile.archetype)
where('imageUrl', '!=', null)
orderBy('createdAt', 'desc')
limit(12)
```

### Popular posts

Posts with the highest `reactionCount`, excluding the user's own archetype (to complement the archetype posts).

```
where('visibility', '==', 'public')
where('imageUrl', '!=', null)
orderBy('reactionCount', 'desc')
orderBy('createdAt', 'desc')
limit(12)
```

On initial load, both queries run and their results are combined (deduped by post ID) and shuffled before display.

On scroll, the hook alternates: archetype page → popular page → archetype page → ...

---

## Pagination

```typescript
// Opaque cursor type — no firebase/firestore import needed in the hook
export type ExploreCursor = QueryDocumentSnapshot<DocumentData>;

export interface ExploreInitialPage {
  posts: ExplorePost[];
  archetypeCursor: ExploreCursor | null;
  popularCursor: ExploreCursor | null;
}
```

The hook tracks both cursors independently in state. `loadMore()` uses `nextFetchType` to decide which cursor to advance.

---

## Filters

- Posts without `imageUrl` are excluded (prevents blank grid cells)
- The current user's own posts are excluded
- Posts are not filtered by block status at the grid level (only at the profile/detail level)

---

## Types

```typescript
interface ExplorePost {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  authorId?: string;
  authorArchetype?: string;
  isArchetypePost?: boolean;
}

interface UserSearchResult {
  id: string;
  username?: string;
  displayName?: string;
  profilePictureUrl?: string;
  profileThumbnailUrl?: string;
}
```
