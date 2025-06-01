# Pulse Feature Implementation Guide

## 1. Introduction to Pulse

The "Pulse" screen serves as a centralized activity feed and notification center for users. It displays relevant events such as new follow requests, accepted requests, new followers, likes and comments on a user's posts, and when other users save their workouts.

The primary UI component for this feature is located at [`screens/Pulse.tsx`](screens/Pulse.tsx ).

## 2. Core Data Structure (Firestore)

All activity items for the Pulse screen are stored in Firestore under the following path:

`/activity/{userId}/userActivity/{activityId}`

-   `{userId}`: The ID of the user to whom the activity item pertains (i.e., who will see this in their Pulse).
-   `{activityId}`: An auto-generated unique ID for the activity item.

Each activity document generally conforms to the `ActivityItem` interface defined in [`screens/Pulse.tsx`](screens/Pulse.tsx ) and aligns with the structure in [`docs/DBDESIGN.md`](docs/DBDESIGN.md ):

-   `type`: (String) Defines the kind of activity (e.g., `'follow_request'`, `'new_follower'`, `'post_like'`, `'post_comment'`, `'workout_save'`).
-   `fromUserId`: (String) The ID of the user who initiated the action.
-   `fromUsername`: (String) Denormalized username of `fromUserId`.
-   `fromProfileImageUrl`: (String, Optional) Denormalized profile image URL of `fromUserId`.
-   `postId`: (String, Optional) ID of the relevant post, if applicable.
-   `postImageUrl`: (String, Optional) Thumbnail URL of the relevant post image.
-   `commentText`: (String, Optional) Snippet of the comment text.
-   `workoutId`: (String, Optional) ID of the relevant workout.
-   `workoutTitle`: (String, Optional) Title of the relevant workout.
-   `createdAt`: (Timestamp) Server timestamp indicating when the activity occurred. Used for ordering.
-   `isRead`: (Boolean) Indicates if the user has viewed/interacted with this activity (currently not fully implemented for visual distinction).
-   `status`: (String, Optional) Primarily for `follow_request` type, can be `'pending'`, `'accepted'`, `'ignored'`.

## 3. Populating the Pulse Feed (Cloud Functions)

The Pulse feed is primarily populated by Cloud Functions that are triggered by various events within Firestore or are called directly by the client. These functions reside in the `functions/src/` directory, with triggers in `activityTriggers.ts` and callable functions in `callableFunctions.ts`.

### 3.1. Follow-Related Activities

-   **Initiating a Follow Request:**
    -   When User A requests to follow User B, the client-side logic (e.g., in `hooks/useProfileData.tsx`) writes a document to `/users/{UserB_UID}/pendingFollowers/{UserA_UID}`.
    -   **`createactivityonfollowrequest`** (Trigger Function in `activityTriggers.ts`):
        -   **Trigger:** `onDocumentCreated` at `/users/{targetUserId}/pendingFollowers/{requestingUserId}`.
        -   **Action:** Creates an activity document in `/activity/{targetUserId}/userActivity/` for User B with:
            -   `type: 'follow_request'`
            -   `fromUserId: requestingUserId` (User A)
            -   `status: 'pending'`
            -   Other relevant fields like `fromUsername`, `fromProfileImageUrl`, `createdAt`.

-   **Accepting a Follow Request:**
    -   User B clicks "Accept" on User A's request in their Pulse screen.
    -   **`acceptfollowrequest`** (Callable Function in `callableFunctions.ts`):
        -   **Invocation:** Called by [`screens/Pulse.tsx`](screens/Pulse.tsx ).
        -   **Actions:**
            1.  Updates follower/following relationships in `/users/` collection for both users.
            2.  Increments `followerCount` and `followingCount` for respective users.
            3.  Deletes the document from `/users/{UserB_UID}/pendingFollowers/{UserA_UID}`.
            4.  Updates the original `'follow_request'` activity item for User B in `/activity/{UserB_UID}/userActivity/{activityId}`: sets `status: 'accepted'` (or could change type to `'new_follower'`).
            5.  Creates a *new* activity item for User A in `/activity/{UserA_UID}/userActivity/` with:
                -   `type: 'follow_accepted'`
                -   `fromUserId: UserB_UID`
            6.  Creates a *new* activity item for User B in `/activity/{UserB_UID}/userActivity/` with:
                -   `type: 'new_follower'`
                -   `fromUserId: UserA_UID`

-   **Ignoring a Follow Request:**
    -   User B clicks "Ignore" on User A's request.
    -   **`ignorefollowrequest`** (Callable Function in `callableFunctions.ts`):
        -   **Invocation:** Called by [`screens/Pulse.tsx`](screens/Pulse.tsx ).
        -   **Actions:**
            1.  Updates the original `'follow_request'` activity item for User B: sets `status: 'ignored'` (or deletes it).
            2.  Deletes the document from `/users/{UserB_UID}/pendingFollowers/{UserA_UID}`.

### 3.2. Post-Related Activities

-   **Post Likes:**
    -   When User A likes User B's post, client-side logic (e.g., in `hooks/usePostsData.tsx`) writes a document to `/posts/{postId}/likers/{UserA_UID}` (or a similar path like `/posts/{postId}/reactions/{UserA_UID}` with `type: 'like'`).
    -   **`createactivityonpostlike`** (Trigger Function in `activityTriggers.ts`):
        -   **Trigger:** `onDocumentCreated` at `/posts/{postId}/likers/{likerId}` (or the reactions path).
        -   **Action:** If `likerId` is different from the post's `authorId`, creates an activity document in `/activity/{postAuthorId}/userActivity/` for User B with:
            -   `type: 'post_like'`
            -   `fromUserId: likerId` (User A)
            -   `postId`, `postImageUrl`, etc.

-   **Post Comments:**
    -   When User A comments on User B's post, client-side logic writes to `/posts/{postId}/comments/{commentId}`.
    -   **`createactivityonpostcomment`** (Trigger Function in `activityTriggers.ts`):
        -   **Trigger:** `onDocumentCreated` at `/posts/{postId}/comments/{commentId}`.
        -   **Action:** If `commentAuthorId` is different from the post's `authorId`, creates an activity document in `/activity/{postAuthorId}/userActivity/` for User B with:
            -   `type: 'post_comment'`
            -   `fromUserId: commentAuthorId` (User A)
            -   `postId`, `postImageUrl`, `commentText`, etc.

### 3.3. Workout-Related Activities

-   **Workout Saves:**
    -   When User A saves User B's workout, client-side logic writes to `/users/{UserA_UID}/savedWorkouts/{workoutId}`.
    -   **`createactivityonworkoutsave`** (Trigger Function in `activityTriggers.ts`):
        -   **Trigger:** `onDocumentCreated` at `/users/{saverUserId}/savedWorkouts/{workoutId}`.
        -   **Action:** Fetches the `creatorId` of the workout. If `saverUserId` is different from `creatorId`, creates an activity document in `/activity/{creatorId}/userActivity/` for User B with:
            -   `type: 'workout_save'`
            -   `fromUserId: saverUserId` (User A)
            -   `workoutId`, `workoutTitle`, etc.

## 4. Frontend Implementation (`screens/Pulse.tsx`)

The [`screens/Pulse.tsx`](screens/Pulse.tsx ) component is responsible for fetching, categorizing, and displaying the activity items.

### 4.1. Data Fetching

-   Uses `useEffect` and the `useAuth` hook to get the `currentUser.uid`.
-   Establishes real-time listeners (`onSnapshot`) to the `/activity/{currentUser.uid}/userActivity` collection, ordered by `createdAt` descending.

### 4.2. Categorization of Activities

The fetched activities are separated into two main state arrays:

-   **`followRequests`**: Populated by querying for activity items where `type === 'follow_request'` AND `status === 'pending'`.
-   **`otherActivities`**: Populated by querying for all other activity items (e.g., where `status !== 'pending'`, or by explicitly excluding `follow_request` with `pending` status).

### 4.3. Rendering

-   **`renderFollowRequests()` function:**
    -   Maps over the `followRequests` array.
    -   Displays the `fromUsername` and `fromProfileImageUrl`.
    -   Provides "Accept" and "Ignore" buttons for each request.
-   **`renderOtherActivity()` function:**
    -   Maps over the `otherActivities` array.
    -   Uses conditional logic (e.g., `if/else if` or a `switch` on `activity.type`) to render each item with appropriate text (e.g., "liked your post," "started following you") and an optional image (user's profile picture or post thumbnail).
    -   Displays the `createdAt` timestamp formatted as "time ago" using the `formatTimeAgo` helper.

### 4.4. Interactions

-   **Accepting/Ignoring Follow Requests:**
    -   The "Accept" button calls `handleAcceptFollowRequest`, which in turn invokes the `acceptfollowrequest` callable Cloud Function.
    -   The "Ignore" button calls `handleIgnoreFollowRequest`, invoking the `ignorefollowrequest` callable Cloud Function.
    -   `processingRequestId` state is used to manage loading indicators on these buttons.
-   **Navigating from Activities:**
    -   Activity items in the "Other Activity" section are generally `TouchableOpacity` components.
    -   `onPress` handlers use `router.push` (from `expo-router`) to navigate to the relevant screen:
        -   User profiles: `/profile/[id]`
        -   Posts: `/view-post/[id]`
        -   Workouts: `/view-workout/[id]` (if implemented)

## 5. Key Considerations & Workflow

-   **Real-time Updates:** The use of `onSnapshot` ensures that the Pulse feed updates in real-time as new activities occur.
-   **User Experience:**
    -   Loading states (`loadingRequests`, `loadingActivities`) are used to provide feedback during data fetching.
    -   Empty states are displayed if no requests or other activities are present.
    -   Optimistic updates on the client-side (not fully implemented yet) could further enhance UX for actions like accepting/ignoring requests.
-   **Modularity:** Cloud Functions are organized into `activityTriggers.ts` for event-driven logic and `callableFunctions.ts` for client-invoked operations, as outlined in [`docs/FIREBASE.md`](docs/FIREBASE.md ).
-   **Error Handling:** Basic error logging is present on both client and server-side. Robust error handling is an area for continuous improvement.
-   **Denormalization:** Fields like `fromUsername` and `fromProfileImageUrl` are denormalized into activity documents to reduce the need for extra reads when displaying the feed. However, this means ensuring these are correctly populated by the Cloud Functions.

This setup provides a robust and scalable system for managing and displaying user activities within the app.