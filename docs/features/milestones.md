# Milestones

Milestones are structured achievement posts. They let users celebrate and share personal records, weight loss/gain goals, and other fitness achievements in a richer format than a regular post.

---

## User Experience

Milestones appear in three places:

1. **Profile → Milestones tab** — All of a user's milestones grouped by month
2. **MilestonesFeed** — A dedicated feed of milestone posts from followed users
3. **Home feed** — Only milestone posts that have an image (image-less milestones are excluded from the main feed)

Each milestone card shows:
- The achievement type and details (e.g., "New PR: Bench Press — 100 kg × 5 reps")
- Improvement percentage (if a previous record exists)
- Optional photo
- Like and comment counts

---

## Key Files

| File | Purpose |
|------|---------|
| `screens/MilestonesFeed.tsx` | Chronological feed of milestone posts from following |
| `screens/ViewMilestone.tsx` | Full-page milestone detail |
| `screens/MilestoneWithPost.tsx` | Creates a milestone that includes a photo |
| `screens/MilestoneOnlyPost.tsx` | Creates a text-only milestone (no photo) |
| `features/profile/domain/Milestone.ts` | `Milestone` and `GroupedMilestones` types |
| `services/milestoneService.ts` | Milestone creation logic |
| `logic/milestoneUtils.ts` | Pure functions (improvement % calculation, formatting) |

---

## Milestone Types

### PR (Personal Record)

The most common milestone type. Records a new best performance for an exercise.

```typescript
{
  type: 'PR',
  exerciseName: 'Bench Press',
  exerciseId?: 'bench_press',    // optional canonical ID
  value: 100,                    // weight/time/distance
  reps?: 5,
  duration?: null,               // for timed exercises (seconds)
  level?: 'Advanced',
  weightUnit: 'kg',
  previousValue?: 90,            // previous PR for comparison
  improvementPercentage?: 11.1,  // auto-calculated
  achievedAt: Timestamp,
}
```

When a PR is created, the `milestoneTriggers` Cloud Function updates the user's `latestPRs` map in their user document:

```
users/{uid}/latestPRs/{exerciseId} = {
  value: 100,
  unit: 'kg',
  reps: 5,
  date: Timestamp
}
```

This lets the profile and AI coach access the user's latest PRs without querying the posts collection.

### Weight Loss / Weight Gain

```typescript
{
  type: 'weightLoss' | 'weightGain',
  newWeight: 75,
  previousWeight: 82,
  weightUnit: 'kg',
  totalLoss: 7,          // for weightLoss
  totalGain: undefined,
  improvementPercentage: 8.5,
}
```

---

## Creation Flow

### Milestone with photo (MilestoneWithPost)

1. User picks a photo
2. Selects milestone type and fills in details
3. Writes optional caption
4. Taps "Share"
5. `usePostsData.addPost({ isMilestone: true, milestoneDetails, imageUri })` is called
6. Client calls `createMilestonePost` Cloud Function with the milestone payload
7. Cloud Function creates the post document and returns `postId`
8. Client uploads the image to Storage using `postId` as metadata
9. Client calls `PostRepository.updatePostImageUrl(postId, imageUrl)`

### Milestone only (MilestoneOnlyPost)

Same flow but no image. The `createMilestonePost` Cloud Function handles everything in one step. The resulting post has `imageUrl: null` and is excluded from the home feed.

---

## Improvement Percentage Calculation

```typescript
// logic/milestoneUtils.ts
calculateImprovementPercentage(newValue, previousValue): number
```

The Cloud Function also calculates this server-side when it has access to `latestPRs`. The client-side calculation is used for immediate preview in the creation UI.

---

## Grouping by Month

On the Profile milestones tab, milestones are grouped using the `groupAndSortMilestones` function in `useProfileData.tsx`:

```typescript
// Returns:
{
  "January 2025": [milestone1, milestone2],
  "December 2024": [milestone3],
  ...
}
```

Each group is sorted newest-first within the month, and months are sorted newest-first.

---

## Types

```typescript
interface Milestone {
  id: string;
  postId: string;
  date: any;            // Timestamp or Date
  exerciseName?: string;
  reps?: number;
  weight?: string;      // formatted: "100 kg"
  value?: number | string;
  weightUnit?: string;
  duration?: number;
  level?: string;
  newWeight?: number | string;
  newWeightUnit?: string;
}

interface GroupedMilestones {
  [monthYear: string]: Milestone[];
}
```
