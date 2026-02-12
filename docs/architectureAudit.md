# Architecture Assessment (Current State)

This document summarizes the **actual architecture** in the current `hlthy` codebase, where concerns are mixed, and where technical debt appears to be accumulating.

## 1) High-level architecture

The system is a React Native + Expo app with Firebase as the backend platform:

- **Client app runtime:** Expo + React Native + Expo Router (`expo-router/entry`).
- **Backend services:** Firebase Auth, Firestore, Storage, Functions.
- **Backend logic:** Cloud Functions split across trigger and callable modules.

At a high level, this is a **mobile client-heavy architecture** where much business logic is still in client hooks/screens, while some consistency logic is handled by Cloud Functions.

---

## 2) Frontend architecture (what exists today)

### Routing and app shell

- `app/_layout.tsx` establishes root providers (`AuthProvider`, `SafeAreaProvider`) and the top-level stack.
- The stack mixes modern route groups (`(tabs)`) with many standalone screens and explicit compatibility routes.
- The comments in this file indicate legacy routes are intentionally kept for deep-link compatibility.

### Tabs and screen composition

- `app/(tabs)/_layout.tsx` uses `expo-router/unstable-native-tabs` and wraps tabs with `EmailVerificationGuard`.
- Each tab file in `app/(tabs)` is mostly a thin wrapper around a `screens/*` component.
- There are duplicate non-tab routes (`app/workouts.tsx`, `app/profile.tsx`, `app/post.tsx`, `app/ai-chat.tsx`) that also wrap the same `screens/*` components.

**Interpretation:** routing is partly modernized, but the app still carries a legacy screen layer and compatibility wrappers.

### State and cross-cutting concerns

- `context/AuthContext.tsx` is the central session/profile gate.
- It handles auth listener setup, profile loading, email-verification reconciliation, notification initialization, and logout cleanup.

**Interpretation:** this is effectively a "god-context" for multiple concerns (auth state + profile sync + notification bootstrap).

### UI layer

- Screens in `screens/` still hold substantial UI + orchestration logic.
- Example: `screens/HomeFeed.tsx` contains view logic, animated tab logic, and navigation actions in one file.
- There is heavy runtime logging throughout many UI modules.

**Interpretation:** screen components are often "smart" and fairly monolithic.

---

## 3) Data access and domain logic patterns

The project currently has **multiple data-access styles coexisting**:

1. **Hooks as data layer** (e.g., `hooks/useFeedData.tsx`, `hooks/usePostsData.tsx`) that query Firestore directly.
2. **Services as data layer** (e.g., `services/workoutService.ts`, `services/NotificationService.ts`).
3. **Screen-level orchestration** calling hooks/services with additional business rules.

This creates inconsistent boundaries:

- Some business logic lives in hooks.
- Some business logic lives in service files.
- Some business logic is still embedded in screens.

**Net effect:** there is no single, enforced boundary between UI, domain logic, and persistence.

---

## 4) Backend architecture (Cloud Functions)

Cloud Functions are organized as module exports from `functions/src/index.ts`:

- Trigger-oriented modules (`activityTriggers`, `feedTriggers`, `countTriggers`, etc.).
- Callable endpoints (`callableFunctions.ts`, plus admin/settings/notification related modules).

The design intention (also reflected in docs) is event-driven denormalization and side effects (activity fan-out, counters, follow transitions, notifications) handled server-side.

**Interpretation:** backend architecture exists and is reasonably modular by concern; however, the client still performs substantial direct Firestore orchestration.

---

## 5) Data model and architectural drift

`docs/DBDESIGN.md` defines a strong target model, but current implementation suggests partial drift:

- The design doc references notification token fields like `fcmTokens`, while current notification code writes `pushTokens` on user docs.
- Large chunks of denormalized and relationship-aware behavior are split between client code and functions.

This indicates the codebase has a documented intended architecture, but implementation has evolved unevenly.

---

## 6) Primary technical debt themes

1. **Layering debt**
   - UI, data fetching, and business rules are not consistently separated.

2. **Routing migration debt**
   - Expo Router exists, but legacy wrapper routes/screens remain and duplicate responsibilities.

3. **Context bloat**
   - `AuthContext` handles too many unrelated runtime concerns.

4. **Inconsistent domain ownership**
   - Similar business flows are implemented across hooks, services, and cloud functions.

5. **Observability noise**
   - Extensive `console.log` usage in production-facing paths makes signal/noise and debugging quality worse over time.

6. **Documentation-to-code drift**
   - Firestore design docs and actual fields/flows are not fully aligned.

---

## 7) Practical current-state architecture map

A practical mental model for the codebase right now:

- **Presentation layer:** `app/*` route files + `screens/*` + `components/*`
- **Client orchestration layer:** hooks + context + selected services
- **Persistence access layer (client):** direct Firestore/Storage SDK calls from hooks/services/context
- **Backend consistency layer:** Cloud Functions for triggers/callables
- **Data platform:** Firebase Auth + Firestore + Storage + Functions

This is best described as a **hybrid, transitional architecture** rather than a clean layered or domain-modular architecture.

---

## 8) Suggested target direction (high-level)

If the goal is reducing debt without rewriting everything:

1. Define one **canonical data boundary** per feature (service/repository style).
2. Keep screens mostly presentational/orchestrational and push Firestore details down.
3. Split `AuthContext` into composable concerns (session, profile sync, notifications).
4. Remove duplicate legacy routes once deep-link parity is guaranteed.
5. Align Firestore docs to real field names (or migrate code to documented schema).
6. Add lightweight architecture decision records (ADRs) for major boundary decisions.

---

## 9) Bottom line

There **is** architecture, but it is **transitional and uneven**:

- Strong platform choices (Expo Router + Firebase + Functions).
- Clear intent for denormalized social/feed design.
- Significant technical debt from mixed boundaries, duplicated route wrappers, and concern leakage across layers.

A focused refactor plan can improve maintainability quickly by standardizing boundaries feature-by-feature rather than attempting a full rewrite.
