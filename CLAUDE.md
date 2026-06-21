# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) and any AI agent working with code in this repository.

## Commands

```bash
# Client (React Native / Expo)
npm start                # Start Expo dev server
npm run ios              # iOS simulator
npm run android          # Android emulator
npm run web              # Web (expo-web)
npm run lint             # ESLint — enforces architectural boundaries (error-level)
npm test                 # Jest with jest-expo (interactive watch mode)
npx jest <file>          # Run a single test file
npx jest --no-cache      # Clear Jest cache and run

# Cloud Functions (separate Node project in /functions/)
cd functions && npm run build    # Compile TypeScript Cloud Functions
cd functions && npm run lint     # Lint Cloud Functions

# Firebase deployment
firebase deploy                              # Deploy everything (rules + functions)
firebase deploy --only firestore:rules       # Firestore security rules only
firebase deploy --only storage               # Storage security rules only
firebase deploy --only functions             # Cloud Functions only
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React Native | 0.81.5 |
| React | React | 19.1.0 |
| Platform | Expo | 54.0.8 |
| Routing | Expo Router | 6.0.6 (file-based) |
| Language | TypeScript | 5.9.2 (strict mode) |
| Backend | Firebase | 11.6.1 (Auth, Firestore, Storage) |
| Cloud Functions | firebase-functions | 6.4.0 (Node.js/TypeScript) |
| AI Backend | Python Flask on Google Cloud Run | — |
| UI Components | React Native Paper | 5.13.5 |
| Animations | Reanimated | 4.1.0 |
| State | React Context + Firestore listeners + Async Storage | — |
| Testing | Jest + jest-expo | 29.7.0 / 55.0.9 |
| Linting | ESLint (v10, flat config) | 10.0.2 |
| Node | Required | ≥20.19.4 |

## Project Overview

**hlthy** is a React Native (Expo) fitness + social media app. Users share workouts, track personal records (milestones), follow other athletes, chat via DMs, and receive AI-powered fitness coaching. The app runs on iOS, Android, and web via Expo.

## Architecture

### Directory Structure

```
hlthy/
├── app/                    # Expo Router file-based routing (screens/routes)
│   ├── _layout.tsx         # Root layout (GestureHandler → AuthProvider → SafeArea → Stack)
│   ├── (tabs)/             # Bottom tab navigator (NativeTabs)
│   │   ├── _layout.tsx     # Tab definitions: Home, AI, Workouts, Profile, Post
│   │   ├── index.tsx       # Home feed
│   │   ├── ai.tsx          # AI chat
│   │   ├── workouts.tsx    # Workout library
│   │   ├── profile.tsx     # User profile
│   │   └── post.tsx        # Post creation
│   ├── view-post/[id].tsx  # Post detail + comments
│   ├── view-milestone/[id].tsx
│   ├── view-workout/[id].tsx
│   ├── profile/[userId].tsx
│   ├── chat/[id].tsx       # DM conversation
│   ├── pulse.tsx           # Activity/notifications feed
│   ├── dms.tsx             # Direct messages list
│   ├── explore.tsx         # Trending content + search
│   ├── settings.tsx        # User settings
│   ├── create-workout.tsx  # Workout builder
│   ├── active-workout/[id].tsx  # In-progress workout tracking
│   ├── workout-complete/[id].tsx
│   ├── followers/[userId].tsx
│   ├── following/[userId].tsx
│   ├── login.tsx, signup.tsx, landing.tsx
│   └── ...                 # Other stack screens
│
├── features/               # Domain modules (strict 3-layer architecture)
│   ├── auth/ui/            # useSession.ts, useProfile.ts
│   ├── feed/               # domain/ infra/ (feedRepository)
│   ├── posts/              # domain/ infra/ (postRepository)
│   ├── profile/            # domain/ infra/ (profileRepository)
│   ├── workouts/           # domain/ infra/ ui/
│   ├── notifications/      # domain/ infra/ ui/ (usePulse, NotificationBootstrap)
│   ├── messaging/          # domain/ infra/ ui/ (useDMs)
│   ├── explore/            # domain/ infra/ ui/ (useExplore)
│   ├── social/             # domain/ infra/ ui/ (useSocialGraph)
│   ├── settings/           # infra/ (settingsRepository)
│   └── infra/              # Shared Firestore re-exports
│
├── screens/                # Large screen components (imported by app/ routes)
├── components/             # Shared React Native components
│   ├── ai/                 # AI chat components (MessageRenderer, cards/, atoms/)
│   ├── profile/            # ProfileHeader, ProfileTabs, MilestoneCard, etc.
│   ├── settings/           # SettingsSection, SettingsItem, SettingsModals
│   └── workout/            # FocusedExerciseView, RestTimer
│
├── hooks/                  # Application-layer hooks (consume repositories)
│   ├── useFeedData.tsx     # Home feed with pagination + real-time
│   ├── usePostsData.tsx    # Post fetching with pagination
│   ├── useProfileData.tsx  # User profiles + milestones
│   ├── useContentActions.ts # Like, delete, report interactions
│   ├── useProfileActions.ts # Follow, block operations
│   ├── useSettingsHandlers.ts
│   ├── useDoubleTap.ts     # Double-tap like gesture
│   ├── useReporting.tsx    # Report modal logic
│   ├── useUnits.tsx        # Metric/imperial conversion
│   └── useScreenIsFocused.ts
│
├── services/               # Domain-agnostic business services
│   ├── NotificationService.ts  # FCM token + permissions
│   ├── ShareService.ts
│   ├── milestoneService.ts
│   ├── workoutService.ts
│   ├── workoutLogging.ts
│   ├── signupService.ts
│   ├── reportingService.ts
│   └── profileStorage.ts
│
├── context/                # React Context providers
│   └── AuthContext.tsx      # Global auth state (currentUser, userProfile, logout)
│
├── types/                  # Shared TypeScript type definitions
│   ├── user.ts             # UserProfile, AuthContextType
│   ├── milestone.ts        # Milestone, GroupedMilestones
│   ├── workoutLog.ts       # WorkoutLog, ExerciseLog, SetLog, PRType
│   ├── settings.ts, report.ts, navigation.ts
│   └── index.ts            # Re-exports
│
├── logic/                  # Pure business logic (no React, no Firebase)
│   ├── milestoneUtils.ts
│   ├── formattingFunctions.ts
│   └── idGenerator.ts
│
├── utils/                  # Utility functions
│   ├── imageUtils.ts       # getOptimalImageUrl, deleteImageFromStorage
│   ├── blockUtils.ts, profileUtils.ts, aiMessage.ts
│   └── settings*.ts        # Settings validation, backup, export, analytics
│
├── shared/utils/
│   └── logger.ts           # Structured logger (debug is no-op in prod)
│
├── config/
│   ├── api.ts              # API endpoints
│   └── devFlags.ts         # Dev bypass flags (bypassAuth, bypassEmailVerification)
│
├── constants/
│   └── Colors.ts           # ACCENT_COLOR (#FF2D55), light/dark themes
│
├── ai/
│   └── ai_chat.ts          # AI backend integration (Cloud Run Flask API)
│
├── assets/                 # Static assets (icons, splash, notification sound)
├── docs/                   # Feature documentation (markdown)
│
├── functions/              # Firebase Cloud Functions (separate Node project)
│   └── src/
│       ├── index.ts        # Exports all functions
│       ├── admin/          # firebaseAdmin.ts, adminFunctions.ts
│       ├── callables/      # callableFunctions.ts, checkEmailExists.ts
│       ├── triggers/       # activityTriggers, countTriggers, feedTriggers,
│       │                   # followTriggers, imageProcessing, milestoneTriggers
│       └── services/       # authCleanupService, messageService,
│                           # notificationService, settingsService
│
├── firebaseConfig.ts       # Firebase init (app, auth, db, storage, functions)
├── firestore.rules         # Firestore security rules
├── storage.rules           # Cloud Storage security rules
├── firebase.json           # Firebase deployment config
├── eslint.config.js        # ESLint v10 flat config (architecture enforcement)
├── tsconfig.json           # TypeScript strict config, path alias @/* → root
├── app.json / app.config.ts  # Expo configuration
└── package.json            # Dependencies + scripts
```

### Layered Architecture (CRITICAL)

The codebase enforces a strict 3-layer architecture per domain via ESLint (`no-restricted-imports: error`):

```
features/<domain>/
├── domain/      # TypeScript interfaces ONLY (Post.ts, Milestone.ts, etc.)
│                # No logic, no imports beyond TypeScript types
├── infra/       # Repositories — the ONLY layer that imports firebase/firestore
│                # Plain objects with async methods, no React
└── ui/          # Custom hooks that consume repositories
                 # React hooks only, no direct Firestore access
```

**What is allowed/forbidden:**

| Layer | Can import firebase/firestore? | Can import firebase/auth? | Can use React? |
|-------|-------------------------------|--------------------------|----------------|
| `features/*/domain/` | NO | NO | NO |
| `features/*/infra/` | YES (repositories) | NO (use auth via useSession) | NO |
| `features/*/ui/` | NO | NO | YES (hooks) |
| `services/` | YES | YES | NO |
| `context/AuthContext.tsx` | NO (uses firebaseConfig) | YES (only here + useSession) | YES |
| `hooks/` (top-level) | NO | NO | YES |
| `screens/` | NO | NO | YES |
| `app/` | NO | NO | YES |
| `firebaseConfig.ts` | YES | YES | NO |

**ESLint enforcement** (`eslint.config.js`):
- Rule: `no-restricted-imports: error` on `firebase/firestore` and `firebase/auth`
- Exemptions: `features/**`, `services/**`, `firebaseConfig.ts`, `context/AuthContext.tsx`
- Cloud Functions calls (`getFunctions`, `httpsCallable`) are NOT restricted
- `firebase/storage` is NOT restricted (uploads happen in hooks/screens)

### Repository Pattern

Repositories are plain exported objects (not classes) with async methods:

```typescript
// features/posts/infra/postRepository.ts
export const PostRepository = {
  async fetchPublicPosts(uid: string): Promise<Post[]> { ... },
  async createPost(author: PostAuthorProfile, data: NewPostData): Promise<string> { ... },
  async likePost(postId: string, uid: string): Promise<void> { ... },
  // ...
};
```

Key conventions:
- Import `db` from `@/firebaseConfig`
- Import domain types from `features/*/domain/`
- Cursor types (`FeedCursor`, `ExploreCursor`) are re-exported from infra files so callers never need `firebase/firestore`
- `PostAuthorProfile` in `features/posts/domain/Post.ts` is the canonical author write type

### Feature Module Reference

| Feature | Domain types | Repository | UI Hook(s) |
|---------|-------------|------------|------------|
| Posts, comments, likes | `features/posts/domain/Post.ts` (Post, Comment, Reply) | `features/posts/infra/postRepository.ts` | `hooks/usePostsData.tsx`, `hooks/useContentActions.ts` |
| User profiles | `features/profile/domain/Milestone.ts` | `features/profile/infra/profileRepository.ts` | `hooks/useProfileData.tsx` |
| Workouts | `features/workouts/domain/WorkoutListItem.ts`, `WorkoutDraft.ts` | `features/workouts/infra/workoutRepository.ts` | `features/workouts/ui/useWorkoutList.ts` |
| Follow/block graph | `features/social/domain/SocialGraphEntry.ts` | `features/social/infra/socialGraphRepository.ts` | `features/social/ui/useSocialGraph.ts` |
| Home feed | `features/feed/domain/FeedPost.ts` | `features/feed/infra/feedRepository.ts` | `hooks/useFeedData.tsx` |
| DMs | `features/messaging/domain/Conversation.ts` | `features/messaging/infra/conversationRepository.ts` | `features/messaging/ui/useDMs.ts` |
| Notifications | `features/notifications/domain/ActivityItem.ts` | `features/notifications/infra/activityRepository.ts` | `features/notifications/ui/usePulse.ts` |
| Explore / trending | `features/explore/domain/ExploreTypes.ts` | `features/explore/infra/exploreRepository.ts` | `features/explore/ui/useExplore.ts` |
| Settings | — | `features/settings/infra/settingsRepository.ts` | `hooks/useSettingsHandlers.ts` |
| Auth | — | — | `features/auth/ui/useSession.ts`, `features/auth/ui/useProfile.ts` |

### Routing

Expo Router file-based routing in `/app/`. The root layout wraps:
`GestureHandlerRootView → AuthProvider → SafeAreaProvider → GlobalNetworkMonitor → Stack`

**Bottom tabs** (NativeTabs with iOS 26+ Liquid Glass):
- Home (feed) — `(tabs)/index.tsx`
- AI (chat) — `(tabs)/ai.tsx`
- Workouts — `(tabs)/workouts.tsx`
- Profile — `(tabs)/profile.tsx`
- Post (create) — `(tabs)/post.tsx`

**Dynamic routes** use `[param]` convention: `view-post/[id].tsx`, `profile/[userId].tsx`, `chat/[id].tsx`, etc.

All tab screens are wrapped in `EmailVerificationGuard` which redirects unverified users.

### State Management

- **Global auth**: `context/AuthContext.tsx` — provides `currentUser` (Firebase User), `userProfile` (Firestore doc), `refreshUserProfile()`, `logout()` via `useAuth()` hook
- **Real-time data**: Firestore `onSnapshot` listeners in feed hooks (`useFeedData`), notification hooks (`usePulse`), and DM hooks (`useDMs`)
- **Pagination**: Cursor-based using Firestore `startAfter()` — cursor types re-exported from repositories
- **Offline**: Async Storage for caching (profile data, settings)
- **No Redux/Zustand** — state is managed via React Context + hooks + Firestore listeners

### Image Optimization

Cloud Functions auto-generate thumbnails on upload:
- Posts/workouts: 300×300px
- Profiles: 150×150px

**Always use** `getOptimalImageUrl(thumbnailUrl, originalUrl)` from `@/utils/imageUtils` in list/feed views. Use original URLs only in detail/full-screen views.

All image entities have both `imageUrl` (original) and `thumbnailUrl?` (Cloud Function generated).

### Key Domain Concepts

- **Milestone** — a personal record (1RM, 5k time, weight loss/gain target). Types: `PR`, `weightLoss`, `weightGain`
- **Workout** — exercise collection split into named segments; users can create, share, and favorite them
- **Active Workout** — an in-progress workout session being tracked with sets/reps/weights
- **Archetype** — user fitness category (powerlifter, crossfitter, athlete, generalist) influencing AI content suggestions
- **Achievement post** — a post with an attached milestone; **milestone only** — milestone without a post
- **Visibility** — posts are either `public` or `followers`-only

### Cloud Functions (`/functions/src/`)

Region: `northamerica-northeast2`. Organized as:

| Category | Files | Purpose |
|----------|-------|---------|
| `triggers/` | `imageProcessing.ts` | Thumbnail generation on storage upload |
| | `feedTriggers.ts` | Feed aggregation on new posts |
| | `activityTriggers.ts` | Activity logging (likes, follows, comments) |
| | `countTriggers.ts` | Collection counter updates |
| | `followTriggers.ts` | Social graph sync |
| | `milestoneTriggers.ts` | Milestone → post creation |
| `callables/` | `callableFunctions.ts` | Client-callable HTTPS functions |
| | `checkEmailExists.ts` | Email existence check |
| `services/` | `notificationService.ts` | Push notifications (FCM) |
| | `messageService.ts` | Message operations |
| | `settingsService.ts` | Settings sync |
| | `authCleanupService.ts` | Delete unverified accounts after timeout |
| `admin/` | `firebaseAdmin.ts` | Admin SDK initialization |
| | `adminFunctions.ts` | Admin-only callable functions |

Functions have their own `package.json` and `tsconfig.json`. Build with `cd functions && npm run build`.

### UI Conventions

- **Theme**: Dark mode default — black backgrounds (`#000`), white text (`#fff`)
- **Accent color**: `#FF2D55` (pink) — exported as `ACCENT_COLOR` from `@/constants/Colors`
- **Gradients**: Orange-pink-purple gradients (Aurora component)
- **Component library**: React Native Paper (`react-native-paper`)
- **Animations**: Reanimated 4. Keep animations light — avoid heavy gestures
- **Platform**: iOS uses SF Symbols for tab icons; Android uses Ionicons
- **Tab bar**: NativeTabs with iOS 26+ Liquid Glass (`minimizeBehavior: "onScrollDown"`)

### Shared Utilities

- **Logger**: `import { logger } from '@/shared/utils/logger'` — domain-tagged, `debug()` is no-op in production
  ```typescript
  logger.debug('AuthContext', 'user reloaded', { uid });
  logger.error('PostRepository', 'fetch failed', error);
  ```
- **ID generation**: `logic/idGenerator.ts`
- **Formatting**: `logic/formattingFunctions.ts`
- **Milestone logic**: `logic/milestoneUtils.ts`

## TypeScript Configuration

- **Strict mode** enabled
- **Path alias**: `@/*` maps to project root (e.g., `@/features/posts/domain/Post`)
- **Target**: ESNext, module: ESNext, moduleResolution: bundler
- **Extends**: `expo/tsconfig.base`

## Environment Variables

Firebase config uses `EXPO_PUBLIC_*` prefix (Expo convention for client-side env vars):
- `EXPO_PUBLIC_FIREBASE_API_KEY`, `EXPO_PUBLIC_AUTH_DOMAIN`, `EXPO_PUBLIC_PROJECT_ID`
- `EXPO_PUBLIC_STORAGE_BUCKET`, `EXPO_PUBLIC_MESSAGING_SENDER_ID`, `EXPO_PUBLIC_APP_ID`
- `EXPO_PUBLIC_MEASUREMENT_ID`

Dev-only:
- `EXPO_PUBLIC_DEV_EMAIL` / `EXPO_PUBLIC_DEV_PASSWORD` — used when `devFlags.bypassAuth` is true

## Testing

- **Framework**: Jest with `jest-expo` preset (configured in `package.json`)
- **Run all**: `npm test` (watch mode) or `npx jest --watchAll=false` (CI)
- **Run one file**: `npx jest <path>`
- **Test directories**: `tests/`, `testing/`, and co-located `__tests__/` directories
- ESLint ignores test files: `**/__tests__/**`, `**/*.test.*`

## Common Patterns for New Features

### Adding a new domain feature

1. Create `features/<domain>/domain/<Type>.ts` — interfaces only
2. Create `features/<domain>/infra/<domain>Repository.ts` — import from `@/firebaseConfig`, export a plain object with async methods
3. Create `features/<domain>/ui/use<Domain>.ts` — React hook consuming the repository
4. Create screen in `screens/<Screen>.tsx`, route in `app/<route>.tsx`
5. Run `npm run lint` to verify no boundary violations
6. **If the feature stores user data, make it deletable** (account deletion / GDPR):
   - Data under `users/{uid}/<subcollection>` is purged automatically (no change needed).
   - A new **top-level** collection keyed by an ownership field → add one entry to
     `FIRESTORE_TARGETS` in `functions/src/services/accountDeletion.ts`.
   - A new per-user **Storage** path → add one entry to `STORAGE_TARGETS` there.

### Adding a new screen/route

1. Create the route file in `app/` following Expo Router conventions
2. Add `<Stack.Screen>` entry in `app/_layout.tsx` if custom animation/options needed
3. Screen component lives in `screens/` (imported by the route file)
4. Use hooks from `hooks/` or `features/*/ui/` — never import Firestore directly

### Adding a new Cloud Function

1. Create the function in the appropriate `functions/src/` subdirectory
2. Export it from `functions/src/index.ts`
3. Build: `cd functions && npm run build`
4. Deploy: `firebase deploy --only functions`
5. Region must be `northamerica-northeast2`

## Firebase Configuration

- **Project config**: `.firebaserc`
- **Firestore rules**: `firestore.rules`
- **Storage rules**: `storage.rules`
- **Functions predeploy**: lint + build (configured in `firebase.json`)
- **Client init**: `firebaseConfig.ts` — HMR-safe, reuses existing app instances
- **Functions region**: `northamerica-northeast2` (set in both client and server)

## Key Files Quick Reference

| Purpose | File |
|---------|------|
| Firebase initialization | `firebaseConfig.ts` |
| Auth context + provider | `context/AuthContext.tsx` |
| Root layout | `app/_layout.tsx` |
| Tab layout | `app/(tabs)/_layout.tsx` |
| ESLint architecture rules | `eslint.config.js` |
| Theme colors | `constants/Colors.ts` |
| Image utilities | `utils/imageUtils.ts` |
| Structured logger | `shared/utils/logger.ts` |
| Dev flags | `config/devFlags.ts` |
| API config | `config/api.ts` |
| User type definitions | `types/user.ts` |
| Cloud Functions entry | `functions/src/index.ts` |
