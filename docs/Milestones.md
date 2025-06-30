**Phase 1: Database Setup (Firestore)**

1.  **Review `posts` Collection Structure:**
    *   Confirm that milestones will be stored within your existing `posts` collection.
    *   Ensure posts have an `isMilestone` (boolean) field.
    *   Define a clear structure for the `milestoneDetails` map within a post document. This should accommodate all types seen in MilestonesFeed.tsx (`PR`, `weightLoss`, `weightGain`) and creation screens (MilestoneOnlyPost.tsx, MilestoneWithPost.tsx).
        *   **Common fields:** `type` (e.g., 'PR', 'weightLoss'), `exerciseName` (for PR), `exerciseId` (if you have an exercises collection).
        *   **PR specific:** `value` (e.g., weight, time in seconds, distance), `unit` (e.g., 'lbs', 'kg', 'min', 'km'), `reps`, `previousValue`, `previousUnit`, `previousReps`, `improvementPercentage`.
        *   **Weight specific:** `newWeight`, `newWeightUnit`, `previousWeight`, `previousWeightUnit`, `totalChange`, `percentageChange`.
        *   Consider fields for `duration` (in seconds) and `level` if exercises support these metric types.

2.  **`users` Collection - Denormalization (Optional but Recommended for PRs/Weight):**
    *   To efficiently display a user's current best PR for an exercise or their latest weight on their profile without complex queries:
        *   Add a map like `latestPRs: { "exerciseId1": { value: 100, unit: 'lbs', reps: 5, date: timestamp }, ... }`.
        *   Add a map like `currentWeight: { value: 70, unit: 'kg', date: timestamp }`.

3.  **`exercises` Collection (If you don't have one):**
    *   Create this if you want a canonical list of exercises.
    *   Fields: `id`, `name`, `category`, `metricType` (e.g., 'weight_reps', 'duration', 'distance_time' - crucial for UI and validation). Your exercises.ts can be the initial source.

**Phase 2: Cloud Functions (TypeScript)**

1.  **Function: `createMilestone` (HTTPS Callable)**
    *   **Purpose:** Handles the creation of any milestone (which is a post with `isMilestone: true`).
    *   **Input:**
        *   `caption` (string, optional, could be empty for `MilestoneOnlyPost`)
        *   `imageUri` (string, optional)
        *   `milestoneDetails` (map, containing all specifics like type, exercise, values, etc.)
        *   `visibility` (string)
        *   `associatedPostId` (string, optional, if a milestone-only is linked to an existing post)
        *   `workoutId` (string, optional, if linked from MilestoneWithPost.tsx)
    *   **Logic:**
        *   **Authentication:** Verify `context.auth.uid`.
        *   **Validation:**
            *   Validate `milestoneDetails` based on `milestoneDetails.type` and the `metricType` of the selected exercise (if PR). Ensure all required fields are present.
        *   **Fetch Previous Data (if PR or Weight Milestone):**
            *   If `milestoneDetails.type === 'PR'`: Query the `posts` collection for the user's (`userId`) most recent PR for the given `milestoneDetails.exerciseId` where `isMilestone === true`.
            *   If `milestoneDetails.type === 'weightLoss' || 'weightGain'`: Query for the user's most recent weight milestone.
        *   **Calculate Derived Fields:**
            *   Based on previous data, calculate `improvementPercentage`, `previousValue`, `totalChange`, etc., and add them to `milestoneDetails`.
        *   **Prepare Post Document:** Construct the full post object:
            *   `userId`, `authorUsername`, `authorProfileImageUrl` (from authenticated user).
            *   `createdAt: admin.firestore.FieldValue.serverTimestamp()`.
            *   `isMilestone: true`.
            *   The enriched `milestoneDetails`.
            *   `caption`, `imageUrl` (if provided, handle image upload separately if `imageUri` is a local URI, or expect a GCS URL).
            *   `visibility`, `associatedPostId`, `workoutId`.
            *   Initialize `reactionCount: 0`, `commentCount: 0`.
        *   **Save to Firestore:** Add the document to the `posts` collection.
        *   **Denormalization (After Save):**
            *   If it's a new best PR, update the `users/{userId}/latestPRs/{exerciseId}` map.
            *   If it's a new weight entry, update `users/{userId}/currentWeight`.
        *   **Return:** The ID of the newly created post/milestone.

2.  **Function: `getMilestonesFeed` (HTTPS Callable - for MilestonesFeed.tsx)**
    *   **Input:** Pagination (`lastVisible`, `limit`), filters (e.g., `friendIds`, `interestTopics` - if applicable later).
    *   **Logic:**
        *   Query `posts` collection: `where('isMilestone', '==', true)`, `orderBy('createdAt', 'desc')`.
        *   Apply visibility filters (e.g., `where('visibility', '==', 'public')` or if for friends, `where('userId', 'in', friendIds)`).
        *   Implement pagination using `startAfter(lastVisible)` and `limit()`.
        *   Return the list of milestone documents.

3.  **Function: `getUserMilestones` (HTTPS Callable - for `Profile.tsx`)**
    *   **Input:** `targetUserId`, pagination.
    *   **Logic:**
        *   Query `posts`: `where('userId', '==', targetUserId)`, `where('isMilestone', '==', true)`, `orderBy('createdAt', 'desc')`.
        *   Apply pagination.
        *   If `context.auth.uid !== targetUserId`, apply visibility filters.
        *   Return milestones.

4.  **Function: `getMilestoneById` (HTTPS Callable - for ViewMilestone.tsx)**
    *   (This might be the same as a `getPostById` function if you have one).
    *   **Input:** `milestoneId` (which is a `postId`).
    *   **Logic:** Fetch the specific post document from `posts`.

5.  **Updating/Deleting Milestones:**
    *   **Update:** Use a generic `updatePost` function. If `milestoneDetails` are updated, recalculations and denormalization updates might be needed (complex, consider if full edits are allowed or just caption/image).
    *   **Delete:** Use a generic `deletePost` function.
        *   **Triggered Function (onDelete of a post):** If the deleted post was `isMilestone: true`:
            *   If it was a PR that was stored in `users/{userId}/latestPRs`, find the *next* most recent PR for that exercise for that user and update `latestPRs`, or clear it if no other PRs exist.
            *   Similar logic for `currentWeight`.

6.  **Liking/Sharing Milestones:**
    *   **Like:** Your existing `likePost`/`unlikePost` functions should work as milestones are posts.
    *   **Share:** The `shareMilestone` service on the client seems to create a chat message. If any server-side logic is needed for formatting the shared content specifically for milestones, it would go into the function that handles creating that chat message.

**Phase 3: Firestore Security Rules**

1.  **`posts` Collection:**
    *   Allow `create` if `request.auth.uid == request.resource.data.userId`.
        *   Validate `request.resource.data.isMilestone` and the structure/required fields of `request.resource.data.milestoneDetails` based on its `type`.
    *   Allow `read` based on `resource.data.visibility` ('public', 'friends' - check against a friends subcollection/array, 'private' - only owner).
    *   Allow `update`/`delete` only if `request.auth.uid == resource.data.userId`.
        *   For `update`, validate fields that are allowed to be changed.

2.  **`users` Collection:**
    *   Users can `read` public parts of other user profiles.
    *   Users can only `update` their own document for fields like `username`, `profileImageUrl`.
    *   Fields like `latestPRs` and `currentWeight` should ideally only be writable by your Cloud Functions (not directly by the client) to ensure data integrity. This can be achieved by checking for a special claim on the auth token if functions are setting these, or by simply disallowing client writes to these specific paths.

3.  **`exercises` Collection:**
    *   Likely `read`-only for clients. Admin/backend function for `create`/`update`.

**Phase 4: Client-Side Integration**

1.  **Creation Screens (MilestoneOnlyPost.tsx, MilestoneWithPost.tsx, RegularPost.tsx if it handles weight milestones):**
    *   Modify `handleSubmitPost` (or equivalent) to call your `createMilestone` Cloud Function.
    *   Pass all the necessary data, especially the detailed `milestoneDetails` object.

2.  **Feed/View Screens (MilestonesFeed.tsx, ViewMilestone.tsx, `Profile.tsx`):**
    *   Replace mock data fetching with calls to your new Cloud Functions (`getMilestonesFeed`, `getUserMilestones`, `getMilestoneById`).
    *   Ensure the `handleLike` functions call the backend.

**Implementation Order Suggestion:**

1.  Finalize Firestore data structures.
2.  Implement `createMilestone` Cloud Function (core logic, including fetching previous PRs/weights and calculations).
3.  Implement basic fetching functions (`getMilestoneById`, `getUserMilestones`, `getMilestonesFeed`) without complex filters first.
4.  Write Firestore Security Rules for create and read.
5.  Integrate one creation flow (e.g., MilestoneOnlyPost.tsx) and one view flow (e.g., ViewMilestone.tsx) on the client.
6.  Test thoroughly.
7.  Implement denormalization updates in `createMilestone` and the `onDelete` trigger.
8.  Refine fetching functions with pagination and filters.
9.  Integrate remaining client screens.
10. Add logic for "Pinned" and "Top 5%" (this is a larger sub-project, especially "Top 5%").