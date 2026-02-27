# Architecture Assessment & Modernization Plan

This document summarizes the current architecture in `hlthy`, identifies the biggest issues at both **high-level design (HLD)** and **low-level design (LLD)**, and lays out a practical migration path to a more production-grade architecture without sacrificing development speed.

---

## 1) Current architecture (as-is)

The system is currently an Expo/React Native client with Firebase as the platform backend:

- **Frontend runtime:** Expo + React Native + Expo Router.
- **Data/auth platform:** Firebase Auth, Firestore, Storage.
- **Backend compute:** Cloud Functions (trigger-based + callable).

In practice, this is a **client-heavy hybrid** architecture:

- Some business logic is in client hooks/screens.
- Some data integrity/side effects are in Cloud Functions.
- Data contracts and ownership boundaries are not consistently enforced.

---

## 2) HLD problems (system-level)

These are architectural issues that affect reliability, scalability, and team velocity at the system boundary level.

### HLD-1: Unclear service boundary between client and backend

- The client directly orchestrates many Firestore workflows.
- Cloud Functions also implement overlapping workflows (counts, activity, notifications).
- There is no single “source of authority” for important domain flows.

**Risk:** business invariants can drift, be duplicated, or fail under race conditions.

### HLD-2: Contract drift between docs and implementation

- Documented Firestore model and runtime fields are not always aligned (for example token naming/ownership drift).
- Architecture docs describe a cleaner target model than what code currently enforces.

**Risk:** onboarding cost increases, and production changes become fragile.

### HLD-3: Transitional routing architecture with legacy duplication

- Expo Router is used, but multiple compatibility routes and duplicate wrappers remain.
- The app effectively carries both old and new navigation mental models.

**Risk:** routing regressions and slow migration velocity.

### HLD-4: Missing explicit non-functional architecture goals

- No visible architecture-level SLOs for latency, reliability, or error budgets.
- Observability/logging approach appears ad hoc.

**Risk:** hard to run production-grade incident response or capacity planning.

### HLD-5: Incomplete operational guardrails for rapid development

- Speed-oriented changes can bypass architectural boundaries because boundaries are not codified.
- Limited enforcement around where business logic is allowed to live.

**Risk:** technical debt compounds with every feature.

---

## 3) LLD problems (implementation-level)

These are concrete code-structure and module-level issues.

### LLD-1: Mixed layering (UI + domain + persistence in same modules)

- Screens, hooks, and services all contain portions of domain logic and Firestore orchestration.
- Hooks sometimes act as repositories; services sometimes overlap them.

**Impact:** testing is hard, behavior is duplicated, and refactors are risky.

### LLD-2: “God” context pattern

- `AuthContext` handles auth state, profile sync, email verification, notification setup, and logout token cleanup.

**Impact:** high coupling and broad blast radius for changes.

### LLD-3: Duplicate route wrappers and repeated composition patterns

- Tab routes and non-tab routes can wrap the same screen components.

**Impact:** duplicated maintenance surface and subtle behavior divergence.

### LLD-4: Heavy runtime logging in hot paths

- Many UI and lifecycle paths produce verbose `console.log` output.

**Impact:** noisy telemetry, lower signal in debugging, and potential performance overhead.

### LLD-5: Inconsistent data-access style

- Direct Firestore calls appear in multiple layers without a shared query/mutation abstraction.

**Impact:** security-rule assumptions, retries, and pagination behavior may be inconsistent across features.

### LLD-6: Missing explicit domain module boundaries

- Core domains (identity, feed, posts, workouts, social graph, notifications) are not fully encapsulated.

**Impact:** feature work can unintentionally leak across concerns.

---

## 4) Target HLD (production-grade + fast development)

The target architecture should preserve Firebase leverage while improving consistency.

### HLD target principles

1. **Single ownership per domain flow**
   - Decide per use case whether the client or backend function is authoritative.
2. **Thin UI, thick domain modules**
   - Screens/routes orchestrate; domain services execute rules.
3. **Explicit read/write contracts**
   - Shared DTO types and validation at boundaries.
4. **Operational-first architecture**
   - Structured logging, traceable errors, and SLO-aligned metrics.
5. **Incremental modernization**
   - Feature-by-feature migration; no big-bang rewrite.

### Suggested target system shape

- **Presentation:** routes/screens/components only.
- **Application layer:** feature use-cases (commands/queries).
- **Domain/data layer:** repository interfaces + Firebase adapters.
- **Backend consistency layer:** Cloud Functions for fan-out, counters, notifications, idempotent mutations.
- **Platform:** Firebase Auth/Firestore/Storage/Functions with explicit schema/version contracts.

---

## 5) Target LLD (module-level)

### Folder/model direction (conceptual)

- `features/<domain>/`
  - `application/` (use-case functions)
  - `domain/` (types, rules)
  - `infrastructure/` (Firestore/Functions adapters)
  - `ui/` (feature components/hooks)

### Key LLD rules

1. UI files do not call Firestore directly.
2. Firestore access goes through repositories/adapters.
3. Use-cases own orchestration and side-effect order.
4. Context providers remain narrow and composable.
5. Shared validation and mapping live near domain models.

---

## 6) Step-by-step migration plan (current -> better HLD/LLD)

This plan prioritizes safety and delivery speed.

### Phase 0: Baseline and guardrails (1-2 weeks)

1. **Define architecture decision records (ADRs)**
   - Capture boundaries: where logic lives, when to use callable functions, naming conventions.
2. **Create domain inventory**
   - List flows: auth/profile, feed, post lifecycle, follow system, workout lifecycle, notifications.
3. **Add minimal governance checks**
   - Lint/convention checks (e.g., prevent direct Firestore imports from `screens/` where possible).
4. **Observability baseline**
   - Introduce structured logger wrapper and error classification levels.

### Phase 1: Stabilize critical boundaries (2-4 weeks)

5. **Refactor Auth into focused modules**
   - Split session state, profile refresh, and notification bootstrap into separate hooks/services.
6. **Pick one high-churn domain (Feed or Posts)**
   - Introduce use-case + repository pattern for this domain only.
7. **Move direct Firestore reads/writes behind adapters**
   - Keep API stable for UI while replacing internals.
8. **Add contract tests for the migrated domain**
   - Validate mapping, pagination behavior, and error handling.

### Phase 2: Backend authority and data contracts (2-4 weeks)

9. **Decide authoritative side for each mutation**
   - Example: follow acceptance and counter updates should be backend-authoritative.
10. **Harden Cloud Functions idempotency**
   - Ensure retries do not duplicate side effects.
11. **Align schema docs with runtime fields**
   - Reconcile names (`pushTokens` vs other variants), required/optional fields, timestamps.
12. **Introduce versioned DTOs for critical flows**
   - Guard client/backend evolution.

### Phase 3: Routing and UI simplification (2-3 weeks)

13. **Map deep-link compatibility requirements**
   - Identify which legacy wrappers are still needed.
14. **Remove duplicate routes gradually**
   - Deprecate wrappers only after parity verification.
15. **Standardize screen responsibilities**
   - Screens orchestrate use-cases; no direct persistence logic.

### Phase 4: Scale-out to remaining domains (ongoing)

16. **Migrate remaining domains one by one**
   - Workouts, notifications, social graph, DMs.
17. **Adopt shared error and retry policies**
   - Consistent behavior across domains.
18. **Add performance budgets**
   - Track feed load latency, mutation success rate, notification delivery success.

### Phase 5: Production hardening and speed retention (ongoing)

19. **Enforce release gates**
   - Smoke tests, contract checks, and rollback plan for each release.
20. **Create paved-road templates**
   - Boilerplate for new features that already follows target architecture.
21. **Quarterly debt burn-down cadence**
   - Reserve explicit capacity to retire legacy wrappers and duplicated logic.

---

## 7) What “production-grade + fast” means in practice

To balance reliability with speed:

- **Production-grade:** explicit ownership, idempotent backend flows, consistent contracts, observability, and rollout safety.
- **Fast development:** incremental migrations, reusable templates, domain-by-domain refactors, and strict but lightweight guardrails.

A good litmus test: new features should ship without adding new cross-layer coupling.

---

## 8) Bottom line

The codebase has strong platform choices and a workable foundation, but the current architecture is transitional. The biggest gap is boundary discipline: too many flows span UI/hooks/services/functions without clear ownership.

The migration path above avoids a rewrite and should materially improve reliability, maintainability, and developer velocity within a few iterations.
