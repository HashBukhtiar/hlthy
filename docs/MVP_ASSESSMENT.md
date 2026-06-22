# hlthy — MVP Assessment

_Last updated: 2026-06-22_

Covers three things:
1. **Status audit** — the MVP/V1/V2 planning doc cross-checked against the actual code.
2. **Release readiness** — what blocks handing a build to the closed-beta group.
3. **Progress update & store/legal roadmap** (§5) — what's been done since the original
   audit and everything remaining to ship on the App Store + Google Play.

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

---

## 5. Progress update & path to store launch

_Updated: 2026-06-22_

This section supersedes the blocker lists above where they overlap: most §2 blockers and
should-fixes are now **done and deployed**. It also extends the scope from "first TestFlight
build" to "submittable on the Apple App Store and Google Play, including legal."

### 5.1 Completed this cycle (done + deployed)

**Release-hardening (was §2 blockers / should-fixes):**

- ✅ **iOS permission strings + plugins** — `NSPhotoLibraryUsageDescription` +
  `NSCameraUsageDescription` added to `app.json` `infoPlist`; `expo-image-picker`
  (microphone explicitly disabled — no in-app recording) and `expo-notifications` added to
  `plugins`. Verified via `expo config`. Also fixed a **latent EAS-build break**: the stale
  top-level `notifications` block pointed at `assets/icon.png` / `assets/notification.wav`,
  both deleted in commit `19780b2` — removed and consolidated into the plugin.
- ✅ **Feed bookmarks** — already resolved before this cycle (posts wired to
  `savePost`/`unsavePost`; milestones intentionally non-bookmarkable, gated by
  `PostActionMenu`'s `isMilestone`). The §2 blocker #2 is closed.
- ✅ **Delete-account** — client now sends `confirmationToken: DELETE_${uid}`, and the
  server was rebuilt into a **full-purge deletion registry** (`functions/src/services/accountDeletion.ts`):
  - `recursiveDelete` of per-user roots (`users/{uid}` subcollections, `feeds/{uid}`,
    `activity/{uid}`) → covers all AI/workout subcollection data automatically.
  - Query-deletes top-level owned collections (`posts`, `milestones`, `workouts`).
  - **Reverse social-graph edges** cleaned on other users; follower/following **counts**
    reconcile via existing count triggers.
  - **DM threads deleted on both sides** (top-level conversation + messages + every
    participant's `users/{p}/conversations/{id}` ref + conversation photos + pending
    message-requests).
  - **Storage** prefixes purged (`profileImages/`, `posts/`, `workoutCovers/`).
  - **Identity tombstoned, not hard-deleted** — `users/{uid}` and `usersPublic/{uid}` are
    reduced to a PII-stripped marker (`{ deleted: true, displayName: 'Deleted User' }`) so
    the many denormalized references resolve gracefully instead of crashing. Auth user is
    still fully deleted.
  - **Comment/reply author scrub** — collection-group update of the user's own
    comments/replies → "Deleted User" + `authorDeleted: true` (new collection-group indexes
    added in `firestore.indexes.json`).
  - Client read-paths hardened: `useProfileData` exposes `deletedAccount`; `Profile.tsx`
    renders an "Account no longer exists" state; mention/comment taps are now safe.
  - Extensibility documented in `CLAUDE.md`: new top-level user-owned collections register
    one line in the deletion registry; subcollections under `users/{uid}` are automatic.
- ✅ **Crash/error reporting** — `@sentry/react-native` installed + Expo plugin added;
  `initSentry()` is **DSN-gated** (no-op until `EXPO_PUBLIC_SENTRY_DSN` is set);
  `Sentry.wrap` on the root layout; `captureException` wired into the error boundary.
- ✅ **Top-level `ErrorBoundary`** — `components/AppErrorBoundary.tsx` exported as Expo
  Router's `ErrorBoundary` (dark theme, retry, dev-only error detail).
- ✅ **Console banner / external image fallbacks / orphaned route** — `config/api.ts`
  routed through the structured `logger` (no-ops in prod); `via.placeholder.com` (6 sites)
  **and** the external `DEFAULT_PROFILE_IMAGE` (dreamstime URL in `imageUtils.ts`) replaced
  with a bundled asset; orphaned `select-archetype` `Stack.Screen` removed.

**Security (Phase B — highest-risk surfaces first, per scoping decision):**

- ✅ **Input sanitization + length caps** — pure `logic/sanitize.ts` (strips control +
  zero-width chars, collapses blank lines, trims, caps length; unit-tested 8/8). Wired at
  the write chokepoints: `postRepository` (caption/comment/reply) and the DM send path.
  **Server-enforced hard caps deployed in `firestore.rules`**: posts `caption ≤ 5000`,
  comments/replies `text ≤ 2000`, messages `text is string ≤ 5000` — these cover every
  write path, including the scattered direct DM writes.

**Deployed:** Cloud Functions, Firestore indexes, Firestore rules.

### 5.2 Engineering still needed before submit

| Item | Status | Notes |
|---|---|---|
| **Sentry DSN** | Blocked on owner | SDK wired; set `EXPO_PUBLIC_SENTRY_DSN` and rebuild |
| **AI endpoint auth + real rate limit** | Audited, not fixed | `ai/api_server.py` `/api/chat` is **unauthenticated** (trusts client-supplied `user_id`, no Firebase ID-token check) and the `RateLimiter` is **file-based** (`rate_limiting/{user_id}_usage.json`) → broken on Cloud Run (ephemeral + multi-instance) **and not even called** in the chat handler. Real cost/abuse risk. Fix = verify ID token + key limit off verified uid in a shared store (Firestore/Memorystore). Owned by AI devs |
| **App Check** | Blocked on owner | Register App Attest (iOS) / Play Integrity (Android) in Firebase console; then wire client + enforcement |
| **Age gating** | ✅ Done + deployed | Min age **16**, enforced in three layers on **both** the signup and edit-profile DOB paths: UI pickers cap at 16, client validation (`signupService` + `settingsValidation`), and `users` create **and** update rules (`meetsMinimumAge`, update checks only when DOB changes). Shared util `logic/ageValidation.ts`; DOB stored canonically as `MM/DD/YYYY` on both paths. Rules **deployed** |
| **Push (APNs/FCM) config** | Partial | `expo-notifications` plugin added; still need APNs auth key in EAS + FCM for Android |
| **iOS build number / Android `versionCode`** | ✅ Done | EAS handles it: `appVersionSource: "remote"` + `production.autoIncrement: true` in `eas.json`. Marketing `version` stays `1.0.0` |
| **`supportsTablet`** | ✅ Done | Set to `false` (phone-only MVP) — no iPad screenshots/layout required. Verified via `expo config` |
| **AI "not medical advice" disclaimer** | ✅ Done | Persistent banner in every AI chat (`app/chat/[id].tsx`) + new §3 "Health & Fitness Disclaimer" in Terms of Service |
| **Automated tests** | ✅ Expanded | Was sanitizer-only. Now: pure logic (ageValidation, milestone, formatting, explore/feed ranking, hype, social-link), repository sanitization (mocked Firebase), Cloud Functions `accountDeletion` (ts-jest harness added to `functions/`), and Firestore security-rules tests (`npm run test:rules`, emulator). Root 62 pass / functions 4 / rules 6. Broader coverage still V1 |

### 5.3 🍎 Apple App Store checklist

- Apple Developer Program ($99/yr) + App Store Connect app record
- Build & upload via EAS → TestFlight → submit
- ✅ In-app **account deletion** (Guideline 5.1.1(v)) — done
- ✅ **Export compliance** (`ITSAppUsesNonExemptEncryption: false`) — set
- ✅ **Sign in with Apple** — not required (email/password only)
- **App Privacy "nutrition labels"** — declare all collected data (account info, user
  content, identifiers, usage/diagnostics via Sentry/Firebase). Required to submit
- **Age rating** questionnaire — must match the actual age gate
- **UGC requirements (Guideline 1.2)** — report ✅ + block ✅ exist; Apple also wants a
  **EULA**, a content filter, and a commitment to act on reports within 24h
- **Screenshots** per device class, **app icon** ✅, **publicly hosted privacy policy URL**
- **Demo account** for reviewers (app is login-gated)

### 5.4 🤖 Google Play checklist

- Google Play Developer account ($25 one-time) + Play Console app record
- Android App Bundle (`.aab`) via EAS
- **Data Safety form** (Google's equivalent of Apple privacy labels) — required
- **Content rating** (IARC questionnaire)
- **Target API level** — new apps must target a recent Android API (34+); verify the build
- ✅ **Account deletion** — Google requires both in-app **and** a **publicly reachable web URL**
  to request deletion without the app. Both done: in-app + hosted at `hlthy.ca/delete-account`.
  **Verify the page works with no login and no app install, and states what data is deleted vs
  retained** — Google's deletion-URL review is strict and a common rejection point
- **App access** — demo credentials for review (login-gated)
- **Store listing** — icon, **feature graphic (1024×500)**, screenshots, privacy policy URL
- Photo/Video permissions declaration if prompted; UGC policy compliance

### 5.5 ⚖️ Legal / compliance

- ✅ **Privacy Policy + Terms** — in-app screens (`app/privacy-policy.tsx`,
  `app/terms-of-service.tsx`) **and now publicly hosted** on the website (privacy, terms, and
  account-deletion pages are live). Content fully rewritten this cycle: lists what's collected
  (Firebase Auth/Firestore/Storage + Google Analytics, Sentry diagnostics, AI messages sent to
  Google Gemini via Cloud Run, push tokens), discloses the cross-border transfer to `us-central1`
  (USA), 16+ children's section, Apple UGC zero-tolerance clause, contact `support@hlthy.ca`,
  em-dashes removed, in-app URLs tappable. **No cookies/analytics on the static website → no
  cookie notice needed.**
  **Source of truth = `docs/privacy-policy.md` / `docs/terms-of-service.md`**, mirrored to the
  website repo and hand-synced to the in-app screens (`screens/PrivacyPolicy.tsx` /
  `screens/TermsOfService.tsx`) — keep all three in sync on any edit
- ⚠️ **AI legal claims to re-verify once the AI endpoint work lands (AI team):**
  - Privacy §5 states no name/email/account identifiers are sent to Google and that messages use
    a "session-scoped identifier only" — but the AI conversation key is the raw Firebase `uid`
    (`conversations/{uid}_ai_conversation`). Confirm the Cloud Run backend (`ai/api_server.py`)
    does **not** forward the uid/profile to Gemini, or the statement is inaccurate
  - AI-chat deletion: account-deletion purges conversations via
    `where("participants","array-contains",uid)`, but the AI conversation doc has **no
    `participants` field**, so the AI thread may survive account deletion — contradicting the
    Privacy/Terms 30-day deletion promise. Address when hardening the AI endpoint
- ✅ **Right to deletion** (GDPR Art. 17 / CCPA) — implemented this cycle
- ⚠️ **Right to access/portability** (GDPR Art. 15/20) — no full personal-data export
  (settings export ≠ personal data); may be required for EU users
- ✅ **Age gating / COPPA / GDPR-K** — min-age **16** enforced (signup + edit-profile,
  client + Firestore rules). Still **align the store age-rating questionnaires to 16** when
  doing paperwork (§5.3/§5.4)
- ✅ **AI / fitness disclaimer** — "not medical or professional fitness advice" added to the
  ToS (§3) and shown as a banner on the AI chat surface
- **CCPA / data-broker** disclosures in the privacy policy for CA users
- **Analytics consent** — if analytics ship, EU may require consent

### 5.6 Recommended order to submission

1. ~~**Decide the easy gaps**: `supportsTablet`, min-age floor + enforcement, AI disclaimer.~~
   ✅ Done — `supportsTablet: false`; age gate at 16 (3-layer); AI disclaimer in chat + ToS.
2. ~~**Stand up public URLs**: hosted privacy policy + terms; a web "request account deletion"
   page (covers Google's requirement).~~ ✅ Done — privacy, terms, and account-deletion pages are
   live on the website (purely static, no cookies/analytics/tracking).
3. **Finish observability/security**: Sentry DSN, App Check (console), AI endpoint auth +
   rate-limit (the one real cost risk).
4. **Build config**: APNs key (versioning ✅ via EAS remote auto-increment), then EAS
   production builds for both platforms. (Firestore rules incl. the age gate are **deployed**.)
5. **Store paperwork**: privacy labels / Data Safety, age ratings, screenshots, demo
   accounts.
6. **Submit**: iOS (internal TestFlight first), Play (internal testing track first).

**Bottom line:** the *code* is close — the longest poles now are **store paperwork** and **AI
endpoint hardening**, not feature work. Age gating, the AI disclaimer, `supportsTablet`,
versioning, a real test suite, and **publicly hosted legal pages + web deletion URL** are now
**done**. The remaining launch-gating item is **AI endpoint auth/rate-limit** (AI team) — which
also carries two **AI legal claims to re-verify** (Privacy §5 identifier claim + AI-chat
deletion coverage; see §5.5).
