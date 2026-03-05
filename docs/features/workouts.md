# Workouts

Users can create structured workout programs, share them publicly, save others' workouts, and log active workout sessions.

---

## User Experience

The **Workouts** tab shows four sections:

| Section | Contents |
|---------|---------|
| My Workouts | Workouts you created |
| Saved | Workouts you saved from other users |
| Following | Workouts from people you follow |
| Trending | Most-saved workouts across the app |

Tapping any workout opens its detail page. From there, users can save/unsave the workout, start an active session, or (if it's theirs) edit or delete it.

---

## Key Files

| File | Purpose |
|------|---------|
| `screens/Workouts.tsx` | Workout list UI + search |
| `screens/CreateWorkout.tsx` | Workout builder form |
| `app/active-workout/[id].tsx` | Active workout session tracker |
| `app/view-workout/[id].tsx` | Workout detail view |
| `features/workouts/ui/useWorkoutList.ts` | Hook for the four workout collections |
| `features/workouts/infra/workoutRepository.ts` | All Firestore queries |
| `features/workouts/domain/WorkoutListItem.ts` | List display type |
| `features/workouts/domain/WorkoutDraft.ts` | Creation-time types |

---

## Workout Structure

A workout is organized into **segments** (e.g. "Warm Up", "Main Set", "Cool Down"), each containing a list of exercises.

```typescript
interface WorkoutDraft {
  title: string;
  description?: string;
  visibility: 'public' | 'followers' | 'private';
  segments: WorkoutDraftSegment[];
}

interface WorkoutDraftSegment {
  id: string;
  name: string;
  length: number;       // duration in minutes
  exercises: WorkoutDraftExercise[];
}

interface WorkoutDraftExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
}
```

For display in list views (where full segment data isn't needed), the leaner `WorkoutListItem` type is used:

```typescript
interface WorkoutListItem {
  id: string;
  title: string;
  creatorId: string;
  creatorUsername: string;
  coverImageUrl?: string | null;
  thumbnailUrl?: string | null;
  savedCount: number;
}
```

---

## Creating a Workout

1. User fills in title, description, visibility
2. User adds segments and exercises using the builder UI
3. (Optional) User picks a cover image
4. Tapping "Save" calls `WorkoutRepository.createDocument(uid, username, draft, coverImageUrl?)`

### Two-step image upload

If a cover image is selected, creation is a two-step process:

```
1. WorkoutRepository.createDocument(uid, username, draft)  → returns workoutId
2. uploadBytes(storageRef, imageBlob)                      → upload to Storage
3. WorkoutRepository.updateCoverImageUrl(workoutId, url)   → update Firestore
```

The `imageProcessing` Cloud Function then generates a `thumbnailUrl` asynchronously.

---

## Saving / Unsaving Workouts

Saving stores a document at `users/{uid}/savedWorkouts/{workoutId}` with a `savedAt` timestamp, and increments `savedCount` on the workout document.

Unsaving deletes that document and decrements `savedCount`.

---

## Search

Search on the Workouts screen is client-side — it filters the already-loaded list by title and creator username. There's no separate Firestore search query.

---

## Active Workout Session

`app/active-workout/[id].tsx` is the in-session experience:

- Shows each segment and exercise in sequence
- User logs sets, reps, and weight for each exercise
- A timer tracks total session duration
- On completion, the session data is saved via `workoutLogging.ts`

The active session is self-contained and doesn't re-fetch workout data from Firestore during the session — the full workout is loaded once on entry.

---

## Firestore Structure

```
workouts/{workoutId}
  creatorId, creatorUsername
  title, description
  visibility: 'public' | 'followers' | 'private'
  coverImageUrl, thumbnailUrl
  segments: [ { id, name, length, exercises: [ { id, name, sets, reps } ] } ]
  savedCount
  createdAt

users/{uid}/savedWorkouts/{workoutId}
  workoutId
  savedAt
```
