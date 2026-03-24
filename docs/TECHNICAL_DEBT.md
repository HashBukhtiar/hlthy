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

### 4. Misplaced File

`ai/ai_chat.ts` is a TypeScript file in the Python `ai/` directory. Will be replaced by `features/ai/infra/aiChatRepository.ts` during frontend migration (Phase 1, Steps 18-31).

### 5. Stale Documentation (Low Priority)

| File | Issue |
|------|-------|
| `docs/PHOTO_SHARING_*.md` | 3 files — may be outdated |
| `docs/FOCUS_PLANNER_IMPLEMENTATION.md` | Feature not in current architecture |
| `docs/Containerization.md` | References Docker setup not aligned with current stack |
