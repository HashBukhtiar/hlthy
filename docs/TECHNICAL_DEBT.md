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

### 5. ~~CRITICAL: Firestore Rules — Open Admin Access~~ (RESOLVED 2026-03-26)

Removed all `allow read, update: if true` rules on `/users/{userId}` and `/reports/{reportId}`. Admin operations now require Cloud Functions with Admin SDK.

### 6. ~~CORS Wildcard on AI Backend~~ (RESOLVED 2026-03-26)

Set `allow_origins=[]` — no browser origins needed (native mobile clients only). Internal endpoints are server-to-server.

### 7. ~~`sendPushNotification` Callable Missing Auth Check~~ (RESOLVED 2026-03-26)

Added `if (!request.auth) throw HttpsError("unauthenticated")` at the top of the handler.

### 8. ~~CRITICAL: Wildcard Firestore Rule~~ (RESOLVED 2026-03-26)

Removed `match /{document=**} { allow read: if isAuthenticated(); }`. Added explicit rule for `notificationLogs`. All subcollections already had explicit rules.

### 9. Weekly Summary — collectionGroup Query Scaling

The `getActiveUserIds` function reads all `workout_logs` from the past 7 days across all users. At scale (500+ users), this becomes expensive. Consider maintaining a `lastWorkoutAt` timestamp on user documents and querying `users` directly instead.

### 10. ~~Weekly Summary — Deterministic Dedup IDs~~ (RESOLVED 2026-03-26)

Weekly summaries now use `doc("weekly_{weekDate}").set()` and nudges use `doc("nudge_{date}").set()` — idempotent writes.

### 11. ~~Prompt Builder — Unsanitized User Profile Fields~~ (RESOLVED 2026-03-26)

All user-controlled fields in `_format_client_file` and `_format_coach_memories` are now sanitized via `sanitize()` with length limits.

### 12. Replace Shared Secret with IAM Auth

The `INTERNAL_API_SECRET` shared secret for Cloud Functions → Cloud Run auth should be replaced with Google Cloud IAM-based OIDC token authentication. This eliminates secret management and supports automatic rotation.

### 13. ~~Coach Memory — No Per-User Cap~~ (RESOLVED 2026-03-26)

Added 150-memory cap per user in `save_coach_memory`. Expired memories also auto-cleaned at read time.

### 14. ~~Coach Notifications — Settings UI Toggles Missing~~ (RESOLVED 2026-03-26)

Added "Coach Insights" and "Coach Nudges" toggles to Settings screen notification preferences.

### 15. Health Endpoint Exposes Model ID (LOW)

`ai/routers/health.py` returns the Vertex AI model ID and per-system status. Consider returning only `{"status": "healthy"}` on the public endpoint.

### 16. Storage Rules Missing File Validation (MEDIUM)

`storage.rules` does not validate `contentType` or `size` on uploads. Add `request.resource.size < 10MB` and `request.resource.contentType.matches('image/.*')`.

### 17. Enable Firebase App Check (LOW)

Protect Firestore/Storage from non-app clients. The `usernames` and `usersPublic` public-read collections are vulnerable to scraping without App Check.

### 18. Users Collection Update — No Field Restriction (LOW)

`firestore.rules` allows any authenticated owner to update any field on their user doc, including `followersCount`, `pushTokens`, etc. Consider `affectedKeys().hasOnly(...)` whitelist.

### 19. Profile Workouts Tab — Not Loading Other Users' Workouts (Pre-existing)

The workouts tab on another user's profile shows empty, even though their workouts appear on the main Workouts page. No Firestore permission error — likely a UI/query bug in the profile workouts tab component. Not caused by rules changes.

### 20. Stale Documentation (Low Priority)

| File | Issue |
|------|-------|
| `docs/PHOTO_SHARING_*.md` | 3 files — may be outdated |
| `docs/FOCUS_PLANNER_IMPLEMENTATION.md` | Feature not in current architecture |
| `docs/Containerization.md` | References Docker setup not aligned with current stack |

### 21. Response Parser — Soft Byte Cap Missing (LOW)

`ai/core/response_parser.py::parse_streamed_text` runs 5 `re.DOTALL` regex searches over the full Gemini response. `max_output_tokens=4096` caps output, but there's no explicit byte cap before the regex. Add a defensive `full_text = full_text[:32_768]` at function entry. Non-blocking — reviewer flagged during Phase 3A.

### 22. Progress Chart Values Not Cross-Checked Against Client File (MEDIUM)

When the AI emits a `progress-chart-json` block, the backend trusts the model's self-reported values. A future integrity layer should verify that emitted points match the user's `workout_logs` / `exercise_history` in Firestore and drop the structured block otherwise. Biggest integrity gap in Phase 3A; requires a new verification layer in `ai/core/response_parser.py` or `ai/core/coach.py`.

### 23. Chart `unit` and `title` Not Format-Validated (LOW)

`ProgressChartData.unit` and `ProgressChartData.title` in `ai/models/schemas.py` are free-form strings. RN `<Text>` does not interpret HTML/JS so no XSS, but the model could emit misleading values (e.g. `unit: "$$$"`). Add `pattern=r"^[A-Za-z/%\s]{1,10}$"` on `unit` and a whitespace-allowlist on `title` if needed.

### 24. Progress Chart Firestore Write — No Size Cap (LOW)

`features/ai/ui/useAIChat.ts` writes a typed projection of `chartData` (series ≤4, points ≤60/series already enforced server-side), but `firestore.rules` does not cap message document size. If the schema evolves, consider `request.resource.size < 50000` on the conversation message create rule.

### 25. Progress Chart — Migrate to `axisOptions.formatXLabel` (LOW)

`components/ai/cards/ProgressChartCard.tsx` renders a manual `axisRow` with first/last date range instead of victory-native's built-in axis labels. Switching to `axisOptions.formatXLabel` / `formatYLabel` would align tick labels with actual data positions rather than just endpoints. Requires loading a TTF via `useFont` from `@shopify/react-native-skia`.

### 26. MessageRenderer — `console.log` Debug Noise

`components/ai/MessageRenderer.tsx` has ~10 `console.log` debug statements (lines 110-114, 121-128, 187, 199-201, 212-215, 239). Replace with `logger.debug('MessageRenderer', ...)` from `@/shared/utils/logger`. Rolled up into item #1 (Console.log Spam) but called out here because the chart wiring added a new branch next to them.
