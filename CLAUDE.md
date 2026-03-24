# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start             # Start Expo dev server
npm run ios           # iOS simulator
npm run android       # Android emulator
npm run lint          # ESLint (enforces architectural boundaries)
npm test              # Jest with jest-expo (interactive watch mode)
npx jest <file>       # Run a single test file
firebase deploy       # Deploy Firestore rules, Storage rules, Cloud Functions
```

Cloud Functions have their own build step in `/functions/`:
```bash
cd functions && npm run build   # Compile TypeScript Cloud Functions
```

## Architecture

**hlthy** is a React Native (Expo) fitness + social media app. Stack: Expo Router (file-based routing), Firebase (Auth/Firestore/Storage), Cloud Functions (Node.js/TypeScript), AI backend (Python Flask on Cloud Run).

### Layer structure

The codebase enforces a strict layered architecture via ESLint:

```
features/<domain>/
├── domain/      # TypeScript interfaces only (Post.ts, Milestone.ts, etc.)
├── infra/       # Repositories — the ONLY place that imports firebase/firestore
└── ui/          # Custom hooks that consume repositories
```

**ESLint rule (error-level):** `screens/`, `app/`, and top-level `hooks/` must never import `firebase/firestore` or `firebase/auth` directly. All Firestore access goes through `features/*/infra/` repositories. Firebase Auth is accessed via `features/auth/ui/useSession`.

### Routing

Expo Router file-based routing lives in `/app/`. Bottom tabs: home feed, explore, pulse (activity), DMs, post, workouts, profile. Stack screens for details (view-post, view-milestone, settings, etc.).

### State management

- `context/AuthContext.tsx` — global auth session + user profile (React Context)
- Firestore real-time listeners in feed/notification hooks for live updates
- Async Storage for offline caching

### Image optimization

Cloud Functions auto-generate thumbnails on upload (posts/workouts: 300×300px, profiles: 150×150px). Always use `getOptimalImageUrl(thumbnailUrl, originalUrl)` from `@/utils/imageUtils` in list/feed views. Use original URLs only in detail views.

All image entities have both `imageUrl` (original) and `thumbnailUrl?` (Cloud Function generated).

### Key domain concepts

- **Milestone** — a personal record (1RM, 5k time, weight loss target)
- **Workout** — exercise collection split into named segments; users can create and share them
- **Archetype** — user fitness category (powerlifter, crossfitter, athlete, generalist) influencing content suggestions
- **Achievement post** — a post with an attached milestone; **milestone only** — milestone without a post

### Feature modules

| Feature | Infra entry point |
|---|---|
| Posts, comments, likes | `features/posts/infra/postRepository.ts` |
| User profiles | `features/profile/infra/profileRepository.ts` |
| Workouts | `features/workouts/infra/workoutRepository.ts` |
| Follow/block graph | `features/social/infra/socialGraphRepository.ts` |
| Home feed | `features/feed/infra/feedRepository.ts` |
| DMs | `features/messaging/infra/conversationRepository.ts` |
| Notifications | `features/notifications/infra/activityRepository.ts` |
| Explore / trending | `features/explore/infra/exploreRepository.ts` |

### Cloud Functions (`/functions/src/`)

Organized into `callables/`, `triggers/`, `services/`, and `admin/`. Triggers handle thumbnail generation, feed aggregation, activity logging, and count updates. Region: `northamerica-northeast2`.

### UI conventions

Dark theme: black backgrounds, white text, `#FF2D55` pink accent, orange-pink-purple gradients. Component library: React Native Paper. Animations: Reanimated 4. Avoid heavy animations and complex gestures.
