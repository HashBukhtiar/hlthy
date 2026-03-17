# Feed

The home feed is the first thing users see. It shows posts from people they follow, or public posts as a fallback when someone is new and hasn't followed anyone yet.

---

## User Experience

- Scroll through a vertical list of posts (images + captions)
- Pull down to refresh
- Scroll to the bottom to load more
- Double-tap a post image to like it
- Tap the comment icon to leave a comment
- Tap the share icon to send a post to someone via DM
- Tap the three-dot menu for more actions (block, report, follow/unfollow)

---

## Key Files

| File | Purpose |
|------|---------|
| `screens/PostsFeed.tsx` | Feed UI — FlatList, pull-to-refresh, infinite scroll |
| `hooks/useFeedData.tsx` | React state + orchestration |
| `features/feed/infra/feedRepository.ts` | All Firestore queries |
| `features/feed/domain/FeedPost.ts` | `FeedPost` type |

---

## Data Flow

```
PostsFeed.tsx
  → useFeedData()
      → FeedRepository.loadPage(uid, cursor?)   // paginated fetch
      → FeedRepository.loadPublicFallback(uid)  // when no personalized feed
      → FeedRepository.subscribe(uid, callback) // real-time listener for new posts
```

---

## Personalized vs Public Feed

The feed first checks if the user has any entries in `feeds/{uid}/userFeed/`. This collection is pre-populated by Cloud Functions whenever someone the user follows creates a post.

If the collection is empty (new user with no follows), the app falls back to fetching recent public posts directly from the `posts` collection ordered by `createdAt`.

---

## Pagination

Feed posts are loaded in pages of 10 using Firestore cursor-based pagination.

- The repository returns a `FeedCursor` (opaque type wrapping a `QueryDocumentSnapshot`) alongside each page of posts
- `loadMorePosts()` passes the last cursor back to the repository to continue from where the previous page ended
- `hasMore` becomes `false` when a page returns fewer than 10 items

```typescript
// From useFeedData.tsx
const { posts, cursor } = await FeedRepository.loadPage(uid, currentCursor);
```

---

## Post Enrichment

The raw feed documents only contain basic post data. The repository enriches them by:

1. **Author profile images** — Fetches up to 30 author profiles in a single batch; fills in `authorProfileImageUrl` and `authorProfileThumbnailUrl`
2. **Like status** — Checks `posts/{postId}/likers/{uid}` for each post to set `isLiked`
3. **Follow status** — Checks whether the current user follows each post author, sets `isFollowing`
4. **Block filtering** — Removes posts from blocked users and posts where the current user is blocked by the author
5. **Private post filtering** — Removes posts with `visibility: 'followers'` unless the viewer follows the author

---

## Post Types in the Feed

| Post Type | Shows in Feed? | Notes |
|-----------|---------------|-------|
| Regular post (image + caption) | ✅ | Always shown |
| Milestone post with image | ✅ | Shows milestone badge (trophy icon) |
| Milestone-only post (no image) | ❌ | Excluded from feed; appears only in MilestonesFeed |

---

## Real-Time Updates

A Firestore `onSnapshot` listener keeps the feed live. New posts from followed users appear without requiring a manual refresh. The listener is cleaned up on unmount.

---

## FeedPost Type

```typescript
interface FeedPost {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  authorProfileThumbnailUrl?: string;
  authorBlockedUsers?: string[];
  caption: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  createdAt: Timestamp;
  exerciseTags?: string[];
  isMilestone: boolean;
  milestoneDetails?: { ... };
  workoutId?: string;
  reactionCount: number;
  commentCount: number;
  visibility: 'public' | 'followers';
  isLiked?: boolean;
  isBookmarked?: boolean;
  isFollowing?: boolean;
}
```

---

## Interactions

All interactions in the feed call through `usePostsData()`:

| Action | Function | What it does |
|--------|---------|-------------|
| Like | `likePost(postId)` | Creates `posts/{id}/likers/{uid}` doc; Cloud Function creates activity |
| Unlike | `unlikePost(postId)` | Deletes liker doc; cleans up activity |
| Comment | `addComment(postId, text)` | Creates comment doc; Cloud Function creates activity |
| Delete | `deletePost(postId)` | Deletes post + comments + likers (callable Cloud Function) |
