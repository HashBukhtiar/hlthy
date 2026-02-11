# Deploy Firestore Rules & Indexes

## Quick Deploy

To deploy the Firestore security rules and indexes to Firebase:

```bash
firebase deploy --only firestore
```

Or deploy them separately:

```bash
# Deploy only security rules
firebase deploy --only firestore:rules

# Deploy only indexes
firebase deploy --only firestore:indexes
```

## What Gets Deployed

### Security Rules (`firestore.rules`)
- User data access control
- Workout logs (users can only access their own)
- Exercise history (users can only access their own)
- Posts, followers, conversations, etc.

### Indexes (`firestore.indexes.json`)
- Composite indexes for efficient queries
- **NEW**: `workout_logs` indexed by `workoutId` + `completedAt`
- Allows tracking all sessions of a specific workout

## Workout Session Tracking

### Current Structure
```
users/{userId}/workout_logs/{logId}
├─ workoutId: "abc123"          ← Reference to workout template
├─ workoutName: "Push Day A"
├─ completedAt: timestamp
├─ exercises: [...]
└─ totalVolume, totalSets, etc.
```

### Query Sessions by Workout ID
```typescript
import { getWorkoutSessions } from '@/services/workoutLogging';

// Get all sessions of a specific workout
const sessions = await getWorkoutSessions(userId, workoutId, 10);

// Example: Show workout history
sessions.forEach(session => {
  console.log(`${session.completedAt}: ${session.totalVolume} lbs volume`);
});
```

## Verify Deployment

After deployment, check the Firebase Console:
- **Firestore Rules**: https://console.firebase.google.com/project/YOUR_PROJECT/firestore/rules
- **Firestore Indexes**: https://console.firebase.google.com/project/YOUR_PROJECT/firestore/indexes

## First Time Setup

If you haven't logged in to Firebase CLI yet:

```bash
# Login
firebase login

# Initialize (if not already done)
firebase init firestore

# Deploy
firebase deploy --only firestore
```
