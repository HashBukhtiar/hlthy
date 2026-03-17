# hlthy — Developer Overview

hlthy is a social fitness app built with React Native and Expo. Users share workout posts and milestone achievements, follow each other, get AI-powered coaching, and track personal records over time.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile framework | React Native 0.81.5 + Expo SDK 54 |
| Routing | Expo Router 6 (file-based, Stack + Tabs) |
| Backend | Firebase (Firestore, Auth, Storage, Cloud Functions) |
| Language | TypeScript |
| Linting | ESLint v10 (flat config) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Expo CLI (`npm install -g expo-cli`)
- A Firebase project with Firestore, Auth, and Storage enabled
- (Optional) Firebase emulators for local development

### Environment Variables

Create a `.env.local` file at the project root:

```
EXPO_PUBLIC_DEV_EMAIL=your-dev-account@example.com
EXPO_PUBLIC_DEV_PASSWORD=yourdevpassword
EXPO_PUBLIC_API_BASE_URL=https://your-api-endpoint.com
```

### Install & Run

```bash
npm install
npx expo start
```

---

## Project Structure

```
hlthy/
├── app/                    # Expo Router file-based routes
│   ├── (tabs)/             # Bottom tab navigator (5 tabs)
│   ├── chat/[id].tsx       # AI chat conversation
│   ├── profile/[userId].tsx
│   ├── view-post/[id].tsx
│   └── ...
├── screens/                # Full-screen React components (mounted by routes)
├── components/             # Reusable UI components
│   └── ai/                 # AI-specific card components
├── features/               # Domain logic (repository pattern)
│   ├── auth/
│   ├── explore/
│   ├── feed/
│   ├── messaging/
│   ├── notifications/
│   ├── posts/
│   ├── profile/
│   ├── settings/
│   ├── social/
│   └── workouts/
├── hooks/                  # Top-level application hooks
├── context/                # React contexts (AuthContext)
├── services/               # Non-Firestore services (push tokens, image upload)
├── ai/                     # AI chat client
├── logic/                  # Pure utility functions
├── utils/                  # Utility helpers
├── types/                  # Global TypeScript interfaces
├── functions/              # Firebase Cloud Functions (TypeScript)
│   └── src/
│       ├── triggers/       # Firestore event triggers
│       ├── callables/      # HTTPS callable functions
│       ├── services/       # Shared Cloud Function services
│       └── admin/          # Firebase Admin SDK setup
└── docs/                   # This documentation
```

---

## Navigation

The app uses Expo Router with a file-based structure:

**Tab bar (always visible):**
- `Home` → PostsFeed (personalized social feed)
- `AI` → AI coaching conversations
- `Workouts` → Workout library
- `Profile` → Your own profile
- `Post` → Create a new post

**Modal/Stack routes:**
- `/pulse` — Notifications
- `/dms` — Direct messages
- `/explore` — User search + public posts
- `/settings` — Account settings
- `/chat/[id]` — Individual AI/DM chat
- `/profile/[userId]` — Any user's profile
- `/view-post/[id]` — Post detail
- `/view-workout/[id]` — Workout detail
- `/create-workout` — Workout builder

---

## Core Architecture Principle

**Screens and hooks never import from `firebase/firestore` directly.** All Firestore access goes through repository objects in `features/*/infra/`. This is enforced by ESLint as a hard error.

```
Screen → Hook → Repository → Firestore
```

See [architecture.md](./architecture.md) for the full pattern.

---

## Documentation Index

| Document | What it covers |
|----------|---------------|
| [architecture.md](./architecture.md) | Repository pattern, data model, Cloud Functions |
| [features/authentication.md](./features/authentication.md) | Signup, email verification, login |
| [features/feed.md](./features/feed.md) | Home feed, pagination, post interactions |
| [features/posts.md](./features/posts.md) | Creating posts, milestone posts, comments |
| [features/profile.md](./features/profile.md) | Profile sections, follow system |
| [features/workouts.md](./features/workouts.md) | Workout creation, collections, active tracking |
| [features/ai-chat.md](./features/ai-chat.md) | AI coaching, message types, context |
| [features/explore.md](./features/explore.md) | User search, public post grid |
| [features/notifications.md](./features/notifications.md) | Pulse feed, follow requests, activity types |
| [features/messaging.md](./features/messaging.md) | Direct messages, message requests |
| [features/settings.md](./features/settings.md) | Profile settings, privacy, account actions |
| [features/social-graph.md](./features/social-graph.md) | Follow/unfollow, blocks, private accounts |
| [features/milestones.md](./features/milestones.md) | Achievement system, PR tracking |
| [features/archetypes.md](./features/archetypes.md) | User archetypes, personalization |
