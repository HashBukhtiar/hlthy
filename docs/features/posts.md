# Posts

Posts are the core content unit of hlthy. They can be photos with captions, workout logs, or milestone achievements.

---

## Post Types

### Regular Post

A photo with an optional caption. The user can:
- Pick an image from their camera roll
- Write a caption
- Tag exercises
- Attach a linked workout
- Set visibility to `public` or `followers`

### Milestone Post

A structured achievement post. Milestone posts are created via the milestone creation flow, not the regular post composer. They can include:
- An optional photo
- A caption
- A structured `milestoneDetails` map describing the achievement

Milestone posts with no image are excluded from the main feed but appear in the **Milestones** tab of the user's profile and in the dedicated MilestonesFeed.

---

## Key Files

| File | Purpose |
|------|---------|
| `features/posts/domain/Post.ts` | All post-related TypeScript types |
| `features/posts/infra/postRepository.ts` | All Firestore operations for posts |
| `hooks/usePostsData.tsx` | React hook that exposes post operations to screens |
| `screens/ViewPost.tsx` | Full-page post detail view |

---

## Creating a Regular Post

The create flow is triggered from the `Post` tab.

1. User picks an image and writes a caption
2. Tapping "Post" calls `addPost(postData)`
3. A new post document is created with a Firestore auto-ID
4. The image is uploaded to Firebase Storage
5. The post document is updated with the `imageUrl`
6. The `imageProcessing` Cloud Function fires asynchronously and adds `thumbnailUrl`
7. The `populateFeedsOnPostCreate` Cloud Function fans the post out to all followers' feeds

### Post Author Profile

```typescript
interface PostAuthorProfile {
  uid: string;
  username: string;
  profileImageUrl?: string;
  profileThumbnailUrl?: string;
}
```

This interface is the canonical shape for author data passed into repository write methods. It decouples the repository from the full `UserProfile` type.

---

## Creating a Milestone Post

Milestone posts go through a Cloud Function (`createMilestonePost`) instead of being written directly by the client. This allows the server to validate the milestone data, calculate improvement percentages, and update the user's `latestPRs` map atomically.

```
Client → httpsCallable('createMilestonePost', payload)
       → Cloud Function creates post document
       → Client optionally uploads image
       → PostRepository.updatePostImageUrl(postId, imageUrl)
```

---

## Milestone Types

### PR (Personal Record)

```typescript
{
  type: 'PR',
  exerciseName: string,   // e.g. "Bench Press"
  exerciseId?: string,
  value: number,          // e.g. 100 (kg)
  reps?: number,          // e.g. 5
  duration?: number,      // seconds (for timed exercises)
  level?: string,         // e.g. "Advanced"
  weightUnit?: string,    // 'kg' | 'lbs'
  previousValue?: number, // previous PR for improvement %
  improvementPercentage?: number
}
```

### Weight Loss / Weight Gain

```typescript
{
  type: 'weightLoss' | 'weightGain',
  newWeight: number,
  previousWeight: number,
  weightUnit: string,     // 'kg' | 'lbs'
  totalLoss?: number,
  totalGain?: number,
  improvementPercentage?: number
}
```

---

## Comments & Replies

Comments are stored in `posts/{postId}/comments/{commentId}` and replies in `posts/{postId}/comments/{commentId}/replies/{replyId}`.

All comment and reply authors are hydrated with their current profile images at fetch time (not stored on the comment document itself).

| Operation | Function | Notes |
|-----------|---------|-------|
| Fetch comments | `getPostComments(postId)` | Returns all comments with author images |
| Add comment | `addComment(postId, text)` | Returns the new Comment object immediately (optimistic) |
| Like comment | `likeComment(postId, commentId)` | Atomic transaction; Cloud Function creates activity |
| Unlike comment | `unlikeComment(postId, commentId)` | Atomic; cleans up activity item |
| Add reply | `addReplyToComment(postId, commentId, text)` | Increments `replyCount` atomically |
| Fetch replies | `getCommentReplies(postId, commentId)` | Returns replies with author images |
| Like reply | `likeReply(postId, commentId, replyId)` | Same pattern as comment likes |

---

## Deleting a Post

Post deletion is handled by `PostRepository.delete(postId, uid)`. It:

1. Verifies the caller is the post author (throws if not)
2. Deletes all comments and their replies from subcollections
3. Deletes all liker documents
4. Deletes the post document

The image in Cloud Storage is deleted separately by the calling hook before the Firestore deletion, because the repository doesn't have access to Storage.

---

## Post Type Definitions

```typescript
interface Post {
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
  milestoneDetails?: MilestoneDetails;
  workoutId?: string;
  reactionCount: number;
  commentCount: number;
  visibility: 'public' | 'followers';
  isLiked?: boolean;
  isBookmarked?: boolean;
  isFollowing?: boolean;
}

interface Comment {
  id: string;
  authorId: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  text: string;
  createdAt: Timestamp;
  likes: number;
  likedBy: string[];
  replyCount: number;
  isLiked?: boolean;
  replies?: Reply[];
}

interface Reply {
  id: string;
  parentCommentId: string;
  authorId: string;
  authorUsername: string;
  authorProfileImageUrl: string;
  text: string;
  createdAt: Timestamp;
  likes: number;
  likedBy: string[];
  replyToUserId: string;
  isLiked?: boolean;
}
```
