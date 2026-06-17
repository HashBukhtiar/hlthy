# hlthy — MVP Assessment

_Last updated: 2026-06-16_

Covers two things:
1. **Status audit** — the MVP/V1/V2 planning doc cross-checked against the actual code.
2. **Release readiness** — what blocks handing a build to the closed-beta group.

---

## 1. Status audit vs. the planning doc

The MVP/V1/V2 split is sound overall, but several items are **further along than the
doc says**, and one marked "not done" is actually **built-but-broken**. Numbering maps
to the top-level MVP bullets (1–38).

### Are the in-progress / not-done statuses accurate?

| # | Item | Doc status | Reality | Evidence |
|---|------|-----------|---------|----------|
| 2 | AI | 🟡 in progress | ✅ accurate — chat + workout-plan cards built; **AI rate limiting is the missing piece** (rate limiting only exists for *notifications*, not AI) | `functions/.../notificationService.ts:247` is the only limiter; nothing in `ai/` |
| 3 | Report | 🟡 in progress | ✅ accurate — but be specific: **user/post/workout done, comments + "technical problems" not built** | `types/report.ts:3` → `'user' \| 'post' \| 'workout'` only |
| 4 | Delete accounts | 🔴 not done | ⚠️ **Built but broken.** Full cascade-delete callable exists, but the client calls it **without the `confirmationToken` the server requires**, so it always fails with `invalid-argument` | client `useSettingsHandlers.ts:440` sends no args; server `settingsService.ts:290` rejects without `DELETE_${uid}` |
| 5 | Hype metric | 🔴 not done | ✅ accurate — only a UI label, no computation/feature | `ProfileHeader.tsx:308`, `ProfileCard.tsx:261` (labels only) |
| 10 | Suggested workouts | 🟡 in progress | ⬆️ **basically done** — real algorithm (following+trending pool, dedupe, exclude owned/saved, rank by archetype then save count, top 10) | `screens/Workouts.tsx:57-83` |
| 34 | DMs mute/pin | 🟡 in progress | ✅ accurate — only `isPinnedAI` (pins the AI convo) exists; **generic per-conversation pin + mute are not built** | `Conversation.ts:19` `isPinnedAI` only |
| 35 | Notification prefs toggle | 🟡 in progress | ⬆️ likely **done end-to-end** — settings screen + server *honors* prefs when sending | `screens/settings/NotificationsSettings.tsx`, server reads them `notificationService.ts:120` |
| 36 | Feed seen-tracking | 🔴 not done | ✅ accurate — no seen/viewed tracking anywhere | nothing in `useFeedData`/`features/feed` |
| 37 | Explore: 5-day, ranked by likes, shuffle | 🔴 not done | ⚠️ **partial** — ranking by likes ✅ + shuffle-on-refresh ✅ already exist; the **"last 5 days" recency window is missing** | `exploreRepository.ts:107` `orderBy('reactionCount','desc')`, `useExplore.ts:144` shuffle — but no `where(createdAt >= 5d)` |
| 38 | Backend infra | 🔴 **all** not done | ❌ **inaccurate — most of it is built** | see below |

**Item 38 deserves a hard correction.** The whole backend section was marked not-started,
but:
- ✅ **Firestore rules** — 386 lines with block/privacy/following logic (`firestore.rules`)
- ✅ **Cloud Functions for events** — 8 trigger modules (feed, image, milestone, activity, tag, count, mention, follow)
- ✅ **Cloud Tasks** — already used for unverified-account cleanup with OIDC validation (`authCleanupService.ts`)
- ✅ **Storage thumbnails/compression** — `imageProcessing.ts`
- ❌ **Pub/Sub** — genuinely missing (no `onMessagePublished`; notifications fire directly in triggers)
- ❌ **Storage lifecycle rules** — not configured (nothing in `firebase.json`/`storage.rules`)

So 38 is ~80% done; only Pub/Sub fan-out and bucket lifecycle rules remain.

**Net:** items **4, 10, 35, 37, 38** are more done than the doc says (4 just needs a
one-line client fix). **5 and 36** are accurately "not done." The one to worry about:
**delete-account is silently broken** — both a UX bug and an Apple 5.1.1(v) / GDPR
compliance problem, since account deletion has to actually work.

### Does the section content / scoping make sense?

The MVP/V1/V2 split is sound; V2+ deferrals (health integrations, web app, admin console,
group chats, ML explore) are correctly placed. Scoping calls to reconsider:

1. **Crash reporting is in the wrong tier.** It's under V2+ ("Testing & Release"). For a
   closed beta whose entire purpose is feedback, you're blind without it — **move to MVP**.
2. **Store-submission prerequisites aren't on the list at all.** TestFlight needs the iOS
   permission strings (currently missing → crash) and store config. Add these as gating
   MVP tasks, not assumptions.
3. **Voice features are ambitious for a closed beta.** "Specific voice logging commands" +
   "AI voice conversation" are large net-new surfaces sitting in MVP. Unless voice is your
   core differentiator, **move to V1** and validate the text experience first.
4. **Smoke-test destructive/compliance paths before beta.** Full E2E is correctly V1, but
   delete-account, report, and block must be manually verified first — you just saw why.
5. **IA changes** (explore-left, DMs top-right, 2nd tab → AI) touch navigation broadly —
   sequence them early so later polish lands on the final structure.

---

## 2. Release-readiness verdict

**hlthy is feature-complete and far along.** Feed, posts, milestones, workouts
(create / active / complete), DMs with photos, AI chat with workout-plan cards,
explore/search, profiles, follow/block graph, notifications, settings, reporting, and
account deletion are all substantially built.

The app is in a **release-hardening** phase, not a feature-building one. The gap to a safe
MVP is short and mostly about iOS release config, a couple of silently-broken features, and
observability. Items below are prioritized by what actually blocks handing a build to a
tester.

### 🔴 Blockers — fix before any build reaches a tester

**1. iOS permission usage strings are missing → guaranteed crash + App Store rejection.**
The app calls the media picker / camera in `app/chat/[id].tsx:869`,
`screens/PostComponents.tsx:129`, `app/edit-workout/[id].tsx:97`, and records/uploads
video. But `app.json` `infoPlist` (line 18) only contains `ITSAppUsesNonExemptEncryption` —
no `NSPhotoLibraryUsageDescription`, `NSCameraUsageDescription`, or
`NSMicrophoneUsageDescription`, and `expo-image-picker` is **not in the `plugins` array**.
On a prebuild/managed iOS build the generated Info.plist lacks these keys → iOS hard-crashes
the moment a user taps "add photo," and Apple rejects on sight. ~10-line config fix,
non-negotiable for any path that builds through App Store Connect.

**2. Bookmarking from the feed is a no-op.** `screens/PostsFeed.tsx:233` and
`screens/MilestonesFeed.tsx:253` do an optimistic icon toggle then
`// TODO: Implement actual bookmark API call`. `ViewPost` (`screens/ViewPost.tsx:457`)
correctly calls `savePost`/`unsavePost`, and `SavedPosts.tsx` reads from `fetchSavedPosts`.
So a feed bookmark fills the icon, then vanishes and never reaches Saved Posts. Small fix —
wire the feed handlers to the `savePost`/`unsavePost` already in `usePostsData`.

**3. Delete-account is built but broken (see §1, item 4).** Client doesn't send the
`confirmationToken` the callable requires → it always fails. Compliance-relevant; treat as
a blocker. One-line client fix, plus optionally extend server cleanup to
milestones/comments/conversations/storage.

### 🟠 Should-fix before the closed-beta MVP (this is a *feedback* build)

- **No crash/error reporting (no Sentry/Crashlytics).** Highest-leverage add for a feedback
  build. Sentry's Expo SDK is ~30 min.
- **No top-level `ErrorBoundary`.** One bad render = white screen with no recovery. Expo
  Router supports exporting an `ErrorBoundary` from `_layout`.
- **416 raw `console.log/warn/error` calls ship to prod**, incl. an emoji banner on every
  launch (`config/api.ts:39-43`). The `logger` (whose `debug()` no-ops in prod) is bypassed.
- **`via.placeholder.com` avatar fallbacks (6 usages)** in `ViewPost.tsx` / `ProfileCard.tsx`
  — external service in the image path; swap for a bundled local asset.
- **Dead/stub routes reachable via deep link:** `select-archetype` (file missing,
  `_layout.tsx:41`), and `diet-plan` / `workout-plan` stub screens whose buttons only
  `console.log`. Delete or finish.
- **Lock down & rate-limit the AI Cloud Run endpoint** (`config/api.ts:31`). If
  unauthenticated, anyone can drive LLM cost.

### 🟡 App Store submission checklist (V1 — start in parallel)

**Already in good shape:** ✅ in-app account deletion (once the bug above is fixed) ✅ report
content ✅ block users ✅ privacy policy + terms ✅ email/password only → Sign in with Apple
not required.

**Still to do:** App Privacy "nutrition" labels, demo/review account, screenshots, age
rating, and APNs/push setup (`expo-notifications` is installed but not in `plugins`).

### 🟢 Defer to V1 / post-feedback

- **Zero automated tests** — `jest-expo` is configured but `tests/` is one Python file +
  markdown. Add repository + security-rule coverage before a *full* rollout.
- **2FA** — already correctly labeled "Coming Soon" (`screens/Settings.tsx:212`).
- `pinned` / `top5Percent` milestone logic stubbed to `false`
  (`screens/MilestonesFeed.tsx:727-728`).

---

## 3. Distribution recommendation: TestFlight

For real feedback on real devices, **TestFlight beats an EAS ad-hoc/dev build**:
- Same EAS → App Store Connect → signing pipeline as launch, so it surfaces release-config
  issues (like the permission-string crash) before launch day.
- Testers install one app, get auto-updates, crash logs flow into App Store Connect.
- Ad-hoc EAS requires collecting each tester's device **UDID** and doesn't rehearse the
  store pipeline.

| | Internal TestFlight | External TestFlight |
|---|---|---|
| Testers | ≤100, added as App Store Connect **users** | ≤10,000 via shareable **public link** |
| Apple review | **None** — ready in minutes | **Beta App Review** (~24h, lighter than full) |
| Best when | Friends/teammates you can add by email | A broader group you just want to send a link |

**Pick:** start with **internal TestFlight** if the group is small and you can add them as
users (fastest, no review); move to **external** when you want a shareable link. Either way,
**the iOS permission strings (blocker #1) are mandatory** — without them the app crashes on
first photo tap.

---

## 4. Minimum ordered path to the first TestFlight build

1. **Add iOS permission strings + image-picker/notifications plugins** (blocker #1).
2. **Wire feed bookmarks to `savePost`/`unsavePost`** (blocker #2).
3. **Fix the delete-account `confirmationToken`** (blocker #3).
4. **Add Sentry + an `ErrorBoundary`** so the feedback build reports its own failures.
5. **Remove orphaned routes**, swap `via.placeholder.com` fallbacks for a local asset, quiet
   the `console.*` banner.
6. **Confirm the AI Cloud Run endpoint is authenticated + rate-limited.**
7. **Build via EAS → upload → internal TestFlight.**

Steps 1–4 are truly gating; 5–6 are cheap and belong in the same pass. Everything in the
🟡/🟢 tiers (App Privacy labels, screenshots, tests, 2FA) belongs to the V1 → full-rollout
step, not this MVP build.
