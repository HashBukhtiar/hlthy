<!-- cSpell:ignore Firestore gunicorn uvicorn -->
# Technical Debt Registry

Last updated: 2026-03-24

---

## 1. Dead AI Backend Files (Old Flask → New FastAPI)

The Flask backend has been replaced by FastAPI but the old files remain.

| File | What it is | Safe to delete |
|------|-----------|----------------|
| `ai/api_server.py` | Old Flask server (442 lines) | YES — superseded by `ai/server.py` |
| `ai/core/ai_orchestrator.py` | Old Gemini orchestrator (983 lines) | YES — superseded by `ai/core/coach.py` |
| `ai/vertex_testing_OLD.py` | Old experimental Flask server (~30KB) | YES — broken imports, never used |
| `ai/utils/rate_limiting.py` | Old rate limiter | YES — replaced by inline rate limiting in `ai/routers/chat.py` |
| `ai/utils/user_profiles.py` | Old filesystem-based profile manager | YES — replaced by Firestore reads in `ai/context/user_context.py` |
| `ai/utils/semantic_memory.py` | Old sentence-transformers memory system | YES — replaced by Firestore in `ai/context/conversation_memory.py` |
| `ai/utils/ai_profile_extractor.py` | Old profile extraction | YES — integrated into `ai/core/coach.py` |
| `ai/utils/observability_dashboard.py` | Old SQLite observability | YES — unused, no replacement |
| `ai/requirements.txt` | Old Flask + ML dependencies | YES — use `ai/requirements-new.txt` |
| `ai/requirements-minimal.txt` | Old minimal requirements | YES — use `ai/requirements-new.txt` |
| `ai/next_steps.md` | Stale 6-line TODO list | YES |

**Total: ~2,500+ lines of dead Python code**

---

## 2. Misplaced File

| File | Issue | Action |
|------|-------|--------|
| `ai/ai_chat.ts` | TypeScript file sitting in the Python `ai/` directory | Move to `features/ai/infra/` when frontend migration happens (Step 20 of the plan). Currently still imported by `app/chat/[id].tsx` |

---

## 3. Deprecated Functions Still in Use

| File | Function | Status | Used by |
|------|----------|--------|---------|
| `ai/ai_chat.ts:161` | `sendMessageWithIntent()` | `@deprecated` — just calls `sendMessage()` | `app/chat/[id].tsx` (import exists but may not be called) |
| `ai/ai_chat.ts:170` | `classifyIntent()` | `@deprecated` — returns hardcoded result | `components/SmartChatInput.tsx` (actively called!) |

**Action**: Remove `classifyIntent()` call from `SmartChatInput.tsx`, then delete both deprecated functions.

---

## 4. Stale Deploy Scripts

| File | Issue | Action |
|------|-------|--------|
| `ai/deploy-production.sh` | References old Flask endpoints (`/api/classify-intent`) | Update for FastAPI or delete |
| `ai/deploy-production.bat` | Same issue | Update for FastAPI or delete |

---

## 5. Unused Hooks (0 imports)

| File | Lines | Description |
|------|-------|-------------|
| `hooks/useDoubleTap.ts` | 126 | Double-tap like gesture with haptics — never imported anywhere |

---

## 6. Unused Components (0 imports)

| File | Description |
|------|-------------|
| `components/ConnectionQualityBadge.tsx` | Network quality badge (WiFi/Cellular) |
| `components/WebViewModal.tsx` | Modal for web content |
| `components/BottomButtons.tsx` | Button group component |
| `components/ai/atoms/RPEGauge.tsx` | Rate of Perceived Exertion gauge |
| `components/ai/atoms/IconButton.tsx` | Circular gradient icon button |
| `components/ai/atoms/ProgressDots.tsx` | Animated progress dots |

---

## 7. Unused Services (7 of 8 are dead)

Only `NotificationService.ts` is imported anywhere. The rest have zero imports:

| File | Lines | Description |
|------|-------|-------------|
| `services/ShareService.ts` | — | Share/export functionality |
| `services/milestoneService.ts` | — | Milestone business logic |
| `services/profileStorage.ts` | — | Profile image caching |
| `services/reportingService.ts` | — | Content reporting |
| `services/signupService.ts` | — | Signup/onboarding |
| `services/workoutLogging.ts` | — | Workout session logging (has `getWorkoutHistoryForAI` that was never wired up) |
| `services/workoutService.ts` | — | Workout templates and favorites |

**Note**: These may have been used previously and orphaned during the architecture migration. Verify before deleting — some screens may use them via dynamic imports or they may be planned for future use.

---

## 8. Console.log Spam

**622 `console.log` / `console.warn` / `console.error` statements** across the codebase.

The app has a structured logger at `shared/utils/logger.ts` (with `debug()` as a no-op in production), but most files still use raw `console.log`.

**Heaviest offenders**:
| File | Count | Notes |
|------|-------|-------|
| `app/index.tsx` | 12 | Splash/landing screen debugging |
| `app/chat/[id].tsx` | Many | Photo upload, message fetching |
| `ai/ai_chat.ts` | ~10 | Boxed debug output with emoji decorators |
| `firebaseConfig.ts` | 8 | Init logging |
| `app/(tabs)/_layout.tsx` | 2 | Tab layout debugging |

**Action**: Replace with `logger.debug()` / `logger.error()` calls, or remove entirely. Production builds should not have `console.log` output.

---

## 9. Active TODOs and FIXMEs

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

---

## 10. Stale Documentation

| File | Issue |
|------|-------|
| `docs/deprecated/*` | Old build protocols (reverse_building, rn-deployment, rn-building) |
| `docs/PHOTO_SHARING_*.md` | 3 files about photo sharing implementation — may be outdated |
| `docs/FOCUS_PLANNER_IMPLEMENTATION.md` | Feature not in current architecture |
| `docs/Containerization.md` | References Docker setup not in CLAUDE.md tech stack |
| `testing/SettingsTests.md` | Old test documentation, no actual test files |
| `testing/notifications.md` | Old notification test docs |

---

## 11. Stale Test Files

| File | Issue |
|------|-------|
| `tests/test_section_1_data_models.py` | Python test file in a JavaScript/TypeScript project — likely from early prototyping |

---

## 12. Type Definition Overlap

| Types file | Domain file | Issue |
|-----------|------------|-------|
| `types/milestone.ts` | `features/profile/domain/Milestone.ts` | Both define `Milestone` — types/ has UI-oriented version, domain/ has clean domain type. Naming overlap is confusing. |

---

## 13. Old Dockerfile

| File | Issue |
|------|-------|
| `Dockerfile` (root) | References old Flask backend (`ai/requirements-minimal.txt`, `gunicorn`, `api_server:app`). Should be replaced with `Dockerfile.new` which uses FastAPI/uvicorn. |

---

## Priority Order for Cleanup

### Immediate (no risk, pure deletion)
1. Delete the 11 dead AI backend files (Section 1)
2. Rename `Dockerfile.new` → `Dockerfile`, delete old one
3. Rename `ai/requirements-new.txt` → `ai/requirements.txt`
4. Delete `ai/next_steps.md`
5. Delete `tests/test_section_1_data_models.py`

### Quick wins (verify first, then delete)
6. Delete unused hook (`useDoubleTap.ts`)
7. Delete unused components (6 files in Section 6)
8. Verify and delete unused services (7 files in Section 7)
9. Delete `docs/deprecated/` directory

### Requires code changes
10. Remove `classifyIntent()` call from `SmartChatInput.tsx`
11. Delete deprecated functions from `ai/ai_chat.ts`
12. Replace console.log with structured logger (622 instances)
13. Resolve TODO items or convert to GitHub issues
14. Update deploy scripts for FastAPI
