<!-- cSpell:ignore Firestore gunicorn uvicorn -->
# Technical Debt Registry

Last updated: 2026-03-24

---

## Resolved (2026-03-24)

### Deleted Dead AI Backend Files
- `ai/api_server.py` — old Flask server (superseded by FastAPI `server.py`)
- `ai/core/ai_orchestrator.py` — old orchestrator (superseded by `core/coach.py`)
- `ai/vertex_testing_OLD.py` — old experimental server with broken imports
- `ai/utils/rate_limiting.py` — replaced by inline rate limiting in FastAPI
- `ai/utils/user_profiles.py` — replaced by Firestore reads
- `ai/utils/semantic_memory.py` — replaced by Firestore conversation memory
- `ai/utils/ai_profile_extractor.py` — integrated into Coach class
- `ai/utils/observability_dashboard.py` — unused SQLite observability
- `ai/utils/` directory — removed (empty after above deletions)

### Deleted Stale Config/Scripts
- `ai/requirements.txt` (old Flask deps) — renamed `requirements-new.txt` → `requirements.txt`
- `ai/requirements-minimal.txt` — duplicate, removed
- `ai/next_steps.md` — stale 6-line TODO
- `ai/deploy-production.sh` / `deploy-production.bat` — referenced old Flask endpoints
- `Dockerfile` (old) — replaced with new slim FastAPI Dockerfile (~300MB vs ~2GB)

### Deleted Unused Code
- `hooks/useDoubleTap.ts` — 0 imports anywhere
- `components/ConnectionQualityBadge.tsx` — 0 imports
- `components/WebViewModal.tsx` — 0 imports
- `components/BottomButtons.tsx` — 0 imports
- `components/ai/atoms/RPEGauge.tsx` — 0 imports
- `components/ai/atoms/IconButton.tsx` — 0 imports
- `components/ai/atoms/ProgressDots.tsx` — 0 imports

### Deleted Stale Docs/Tests
- `docs/deprecated/` directory (3 old build protocol docs)
- `testing/` directory (2 stale test docs, no actual tests)
- `tests/test_section_1_data_models.py` — Python test in JS project

### Fixed Deprecated Function Usage
- Removed `classifyIntent()` call from `components/SmartChatInput.tsx`
- Removed `sendMessageWithIntent()` import from `app/chat/[id].tsx`
- Deleted both deprecated functions from `ai/ai_chat.ts`

---

## Remaining Debt

### 1. Console.log Spam (~622 instances)

The app has a structured logger at `shared/utils/logger.ts` but most files still use raw `console.log`. These should be replaced with `logger.debug()` / `logger.error()` or removed.

**Heaviest offenders**:
| File | Count | Notes |
|------|-------|-------|
| `app/index.tsx` | ~12 | Splash screen debugging |
| `app/chat/[id].tsx` | Many | Photo upload, message fetching |
| `ai/ai_chat.ts` | ~10 | Boxed debug output with emoji |
| `firebaseConfig.ts` | ~8 | Init logging |

### 2. Active TODOs

| File | TODO |
|------|------|
| `features/feed/domain/FeedPost.ts` | `TODO(Phase 6): move Post definition when usePostsData migrated` |
| `screens/ViewPost.tsx` | `TODO: Implement actual bookmark logic` |
| `screens/MilestonesFeed.tsx` | `TODO: Implement bookmark/pinned/top 5% logic` (3 TODOs) |
| `screens/PostsFeed.tsx` | `TODO: Implement bookmark API` |
| `screens/ViewMilestone.tsx` | `TODO: Implement pinned and top X%` |
| `screens/AIConversations.tsx` | `TODO: Create new AI conversation` |
| `hooks/useProfileActions.ts` | `TODO: Implement report functionality` |
| `hooks/useContentActions.ts` | `TODO: Implement report functionality` |
| `functions/src/services/notificationService.ts` | `TODO: Audit user records after 6 months` |

### 3. Type Definition Overlap

`types/milestone.ts` and `features/profile/domain/Milestone.ts` both define `Milestone` — the types/ version is UI-oriented, the domain/ version is clean domain type. Naming is confusing.

### 4. ~~Misplaced File~~ (RESOLVED)

~~`ai/ai_chat.ts`~~ — deleted in Phase 1 cleanup. Replaced by `features/ai/infra/aiChatRepository.ts`.

### 5. CRITICAL: Firestore Rules — Open Admin Access (Pre-existing)

**Severity: CRITICAL** — Flagged by security audit 2026-03-26.

| File | Line | Rule | Impact |
|------|------|------|--------|
| `firestore.rules` | 60 | `allow read, update: if true;` on `/users/{userId}` | Any unauthenticated user can read/update ANY user document (profile, push tokens, settings, blocked users) |
| `firestore.rules` | 332 | `allow read: if true;` on `/reports/{reportId}` | Anyone can read all reports (reporter IDs, reported content) |
| `firestore.rules` | 344 | `allow update: if true;` on `/reports/{reportId}` | Anyone can update any report (mark resolved, change action) |

**Root cause**: These rules exist as TODOs for admin dashboard access from localhost.

**Fix**: Remove all `if true` rules. Move admin operations to Cloud Functions using Admin SDK (which bypasses Firestore rules). Build admin dashboard as authenticated Cloud Functions callables or a separate admin API.

### 6. CORS Wildcard on AI Backend

**Severity: HIGH** — `ai/server.py` uses `allow_origins=["*"]` which applies to all routes, including internal service-to-service endpoints (`/api/internal/*`). Internal routes don't need CORS.

**Fix**: Either restrict CORS to app domains, or apply CORS middleware only to client-facing routes (`/api/chat/*`, `/api/health`).

### 7. `sendPushNotification` Callable Missing Auth Check (Pre-existing)

**Severity: MEDIUM** — `functions/src/services/notificationService.ts` `sendPushNotification` callable does not check `request.auth`. Any authenticated user can send arbitrary push notifications to any other user.

**Fix**: Add `if (!request.auth) throw new HttpsError("unauthenticated", ...)` and validate the caller is authorized for the notification type.

### 8. CRITICAL: Wildcard Firestore Rule Exposes All Subcollections (Pre-existing)

**Severity: CRITICAL** — Flagged by security audit 2026-03-26.

`firestore.rules:310-313` has `match /{document=**} { allow read: if isAuthenticated(); }` which grants every authenticated user read access to EVERY document in EVERY collection/subcollection. This negates per-collection rules for subcollections like `ai_profile`, `coach_memory`, `exercise_history`, `coach_insights`, etc.

**Fix**: Remove the wildcard rule and fix any client queries that rely on it.

### 9. Weekly Summary — collectionGroup Query Scaling

The `getActiveUserIds` function reads all `workout_logs` from the past 7 days across all users. At scale (500+ users), this becomes expensive. Consider maintaining a `lastWorkoutAt` timestamp on user documents and querying `users` directly instead.

### 10. Weekly Summary — Deterministic Dedup IDs

The dedup check for weekly summaries is not atomic (race condition on retry). Use deterministic document IDs like `weekly_{userId}_{weekDate}` with `set()` instead of `add()` to make writes idempotent.

### 11. Prompt Builder — Unsanitized User Profile Fields

`ai/core/prompt_builder.py:_format_client_file` injects `display_name`, `goals`, `injuries`, `dislikes`, `coach_memories` into the prompt without sanitization. Apply length limits and newline stripping to prevent prompt injection through profile fields.

### 12. Replace Shared Secret with IAM Auth

The `INTERNAL_API_SECRET` shared secret for Cloud Functions → Cloud Run auth should be replaced with Google Cloud IAM-based OIDC token authentication. This eliminates secret management and supports automatic rotation.

### 13. Coach Insights — Settings UI Toggle Missing

The `coachInsights` notification preference is added to backend defaults but no toggle exists in the Settings screen UI for users to opt out. Add a toggle under notification preferences.

### 9. Stale Documentation (Low Priority)

| File | Issue |
|------|-------|
| `docs/PHOTO_SHARING_*.md` | 3 files — may be outdated |
| `docs/FOCUS_PLANNER_IMPLEMENTATION.md` | Feature not in current architecture |
| `docs/Containerization.md` | References Docker setup not aligned with current stack |
