# Authentication

---

## User-Facing Flow

1. User opens the app for the first time and sees the landing screen.
2. They tap **Sign Up**, fill in their name, username, date of birth, and password.
3. They receive a verification email and must click the link before their account is activated.
4. After verifying, they select their **archetype** (fitness persona).
5. They land on the home feed.

For returning users: tap **Log In** → email + password → straight to the feed.

---

## Key Files

| File | Purpose |
|------|---------|
| `context/AuthContext.tsx` | Global auth state, provides `currentUser` and `userProfile` to the whole app |
| `services/signupService.ts` | Orchestrates the two-phase signup (create account → verify → complete profile) |
| `components/EmailVerificationGuard.tsx` | Blocks unverified users from accessing the main app |
| `app/signup.tsx` | Signup form route |
| `app/select-archetype.tsx` | Post-verification archetype picker |

---

## Two-Phase Signup

Signup is intentionally split into two phases to enforce email verification before creating a full profile.

### Phase 1 — Initiate

Called when the user taps "Sign Up":

1. Creates a Firebase Auth account (`createUserWithEmailAndPassword`)
2. Sends a verification email
3. Creates a minimal `usersPublic/{uid}` document with `isVerified: false`
4. Stores the pending signup data (name, username, DOB, archetype) in AsyncStorage with a 24-hour expiry
5. Schedules a Cloud Task via `authCleanupService` to delete the unverified account after 5 minutes if email isn't verified

### Phase 2 — Complete

Called when the user returns after clicking the verification link:

1. `SignupService.completePendingSignup()` checks `user.emailVerified === true`
2. Reads the pending signup data from AsyncStorage
3. Creates the full `users/{uid}` document with all profile fields
4. Updates `usersPublic/{uid}` to `isVerified: true`
5. Clears AsyncStorage

If AsyncStorage data has expired (>24 hours), the user is prompted to sign up again.

---

## AuthContext

The `AuthContext` provides these values everywhere in the app via `useAuth()`:

```typescript
const {
  currentUser,        // Firebase User object, or null
  userProfile,        // Full UserProfile from Firestore, or null
  loading,            // true while hydrating on app launch
  isFromSignup,       // true if user just completed signup (used for UX)
  setIsFromSignup,
  refreshUserProfile, // re-fetches userProfile from Firestore
} = useAuth();
```

### How it works

`AuthContext` listens to Firebase's `onAuthStateChanged`. When a user signs in:
1. The Firebase User object is stored as `currentUser`
2. `useProfile` hook fetches the full `users/{uid}` document from Firestore
3. The result is stored as `userProfile`
4. `loading` becomes `false`

On logout, both values are set to `null` and the app navigates to the landing screen.

---

## User Document Fields

When signup completes, the following fields are written to `users/{uid}`:

```
uid, email, firstName, lastName, username
dateOfBirth, archetype
version: 1
profileVisibility: 'public'
messagePermission: 'everyone'
followPermission: 'anyone'
commentPermission: 'everyone'
theme: 'dark'
language: 'en'
twoFactorEnabled: false
units: { weight: 'metric', distance: 'metric' }
notifications: {
  newFollowers: true,
  likesAndComments: true,
  directMessages: true,
  followRequestAccepted: true,
  taggedInComments: true,
  mentionedInReplies: true,
}
followerCount: 0
followingCount: 0
postCount: 0
workoutCount: 0
milestoneCount: 0
stats: { followerCount: 0, followingCount: 0, postCount: 0, workoutCount: 0 }
latestPRs: {}
bio: ''
blockedUsers: []
profileImageUrl: ''
profileThumbnailUrl: null
analytics: { lastSeen: serverTimestamp() }
createdAt: serverTimestamp()
```

---

## Dev Mode

For development, set `EXPO_PUBLIC_DEV_EMAIL` and `EXPO_PUBLIC_DEV_PASSWORD` in `.env.local`. The app will auto-login with these credentials in development mode, bypassing the email verification requirement.

---

## Logout Flow

Handled in `hooks/useSettingsHandlers.ts`:

1. Removes the push notification token from Firestore (`NotificationService.removePushToken`)
2. Clears any cached token state
3. Calls `signOut(auth)` from Firebase Auth
4. Navigates to `/landing`
