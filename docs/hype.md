# Hype

hlthy's reputation/activity score — our version of Reddit karma or Snapchat's
Snapscore, tuned for a fitness social app.

> Status: **implemented (v1)**, pending deploy of Cloud Functions + Firestore
> rules. See [Deployment](#deployment).

---

## What Hype is

A single number on every profile that reflects how much a user is **grinding and
getting hyped up** right now. It fuses two ideas the reference products keep
separate:

- **Reddit karma** = *reputation*. Almost entirely **received** (others validate
  your content). Slow, status-signalling, but gatekept — new/quiet users earn
  nothing.
- **Snapscore** = *activity*. Almost entirely **self-generated** (you earn it by
  *doing*), basically only goes up, mysterious formula. A dopamine/habit engine,
  but says nothing about quality.

A fitness app has a third lever neither has: **the grind itself** — workouts
completed, PRs hit. Hype rewards that *plus* social validation, so effort pays
off even before you have an audience.

## Design decisions (locked)

| Decision | Choice | Why |
|---|---|---|
| **Philosophy** | Hybrid: grind + clout | On-brand; rewards training and social proof. New users earn from day one via their own workouts. |
| **Direction** | Rolling window (decays) | Hype reflects recent momentum — it climbs when you're active and falls when you go quiet. Not a lifetime trophy. |
| **Display** | Just a number | One figure on the profile (the existing "Hype" stat slot). No tiers, no leaderboard in v1. |
| **Anti-gaming** | Light guardrails | Daily cap on self-generated (given) Hype + no self-loops. Enough to stop obvious farming without a trust graph. |

## How the rolling window works (the important part)

A true "sum of the last 30 days" window means storing every Hype event with a
timestamp and re-summing — write-heavy and expensive. Instead we use
**continuous exponential decay** with a **half-life**, which gives the same feel
for a fraction of the cost.

Hype is stored as **per-day buckets** on the user doc:

```
users/{uid}.hypeByDay = { "2026-06-18": 47, "2026-06-17": 30, ... }
```

The displayed score is computed **on read** (zero Firestore cost) by summing the
buckets, each weighted by an exponential decay:

```ts
score = Σ  points_day × 0.5 ^ (ageInDays / HALF_LIFE_DAYS)
```

- `HALF_LIFE_DAYS = 14` — the single tuning knob. ~14 days ≈ "this couple
  weeks" energy; raise it for a gentler decay.
- Buckets older than `HYPE_WINDOW_DAYS = 30` (~2 half-lives, already decayed to
  noise) are ignored on read and pruned on write.

Because the score decays, **retuning the half-life is free** — change the
constant and every user's displayed number updates instantly, no migration.

## Write strategy: why buckets + `increment` (Approach B)

We evaluated two ways to maintain the score. Approach B was chosen.

### A — Scalar + decay-on-write (transaction)

Store one `hype` scalar + `hypeUpdatedAt`. Each award reads the doc, decays the
existing value, adds points, writes (transaction).

| Pros | Cons |
|---|---|
| Mathematically exact continuous decay. | **2× the ops** (read+write per award). |
| One scalar — trivially sortable for leaderboards. | **Read-modify-write under contention**: a burst of likes triggers transaction retries on the author's doc. |
| Smallest storage. | Decay runs on the write path; stored numbers lag the current curve until next touched. |

### B — Daily buckets + `increment` + decay-on-read ✅ chosen

Store `hypeByDay` map. Award = `FieldValue.increment()` today's key (no read).
Display = decayed sum of buckets.

| Pros | Cons |
|---|---|
| **~Half the cost** — `increment()` is 1 write, **0 reads**, and buckets ride on the user doc we already load (free to display). | Decay quantized to days (imperceptible). |
| **Contention-friendly** — `increment()` has no read-modify-write race, so like-bursts degrade gracefully. | User doc grows by ~30 keys; pruned on write. |
| **Half-life is a read-time constant** — retune with zero migration. | Sorting/leaderboards would need a materialized scalar bolted on later. |
| Per-day buckets are a natural hook for "Hype this week" UI later. | |

Since v1 is "just a number" (no leaderboard), B's only downside doesn't bite,
and its cost + burst-tolerance wins.

**Self-pruning trick:** every award also `FieldValue.delete()`s the bucket that
just fell out of the window — a no-op if absent — so the doc stays bounded at
~30 keys with **zero extra reads**.

### Switching A ↔ B later

Storage is hidden behind two seams, so a switch only rewrites those:

1. `awardHype()` / `awardCappedHype()` (server) — the only writers.
2. `currentHype()` (`logic/hype.ts`) — the only reader/decayer.

No call sites, rules, or UI change. And because the score is a **decaying**
value, migration barely matters: within ~2 half-lives (~a month) the old
representation has decayed away and the new one has refilled from live activity,
so the score self-heals regardless of what you seed. A→B drops the scalar into
today's bucket (or seeds zero); B→A collapses buckets into one decayed scalar.

## Point values

Starting ratios — relative weights matter more than absolutes. Defined server-
side in `functions/src/services/hypeService.ts` (`HYPE_POINTS`).

| Event | Bucket | Points | Notes |
|---|---|---|---|
| Complete a workout | Grind | **+15** | On-brand core; pays with zero followers. |
| Hit a PR / milestone | Grind | **+40** | Biggest single moment. |
| Receive a save/bookmark | Clout | **+8** | Highest-intent signal — above a like. |
| Gain a follower | Clout | **+10** | |
| Receive a comment | Clout | **+5** | |
| Receive a like | Clout | **+2** | Cheapest, most abundant. |
| **Give** a like/comment | Activity | **+1** | Rewards good community behaviour; helps brand-new users earn day one. |

> Not yet wired (easy adds): receiving a share, posting a non-milestone post,
> workout-streak multipliers.

## Anti-gaming (light guardrails)

1. **Daily cap on *given* Hype** — `HYPE_GIVEN_DAILY_CAP = 20` points/day from
   your own outbound likes/comments (tracked in `hypeGiven`). Stops spam-liking
   to climb. Received Hype is uncapped — you can't farm what others choose to
   give you.
2. **No self-loops** — liking/commenting on your own content awards nothing
   (enforced by the existing `authorId === actorId` checks).
3. **Server-only writes** — clients cannot write `hypeByDay`/`hypeGiven`
   (Firestore rules + Cloud Functions admin SDK).

Deferred (only if farming shows up): per-post diminishing returns and
trust-weighting (a like from a high-Hype user worth more, PageRank-style).

## Cost (Firestore)

Driven by Hype-earning events per user, ~2 writes / ~10 reads per user/day under
Approach B (received = pure increment, only capped given-actions read).
Approximate monthly cost:

| DAU | Approach B |
|---|---|
| 10 | ~$0 (free tier) |
| 100 | ~$0 (free tier) |
| 1,000 | ~$1.5 |
| 5,000 | ~$12 |

Same "basically free until real traction" bracket as feed seen-tracking.
Storage + pruning deletes are negligible (~30 small integer keys/user).

## Architecture

| Concern | Location |
|---|---|
| Pure decay math (`currentHype`, half-life, window) | `logic/hype.ts` (no React, no Firebase) |
| Profile type fields (`hypeByDay`, `hypeGiven`) | `types/user.ts` → `UserProfile` |
| Awarding helpers (`awardHype`, `awardCappedHype`, `HYPE_POINTS`) | `functions/src/services/hypeService.ts` |
| Event → award wiring | `functions/src/triggers/hypeTriggers.ts` (new triggers, parallel to existing activity triggers) |
| Tamper protection | `firestore.rules` — clients can't change `hypeByDay`/`hypeGiven` |
| Display | `components/profile/ProfileHeader.tsx` — the "Hype" stat slot |

Triggers are **separate** functions on the same document paths as the existing
activity triggers (not edits to them), keeping Hype isolated and easy to remove.

### Trigger map

| Function | Fires on | Awards |
|---|---|---|
| `hypeonpostlike` | `posts/{postId}/likers/{userId}` | author +2 (received), liker +1 (given, capped) |
| `hypeonpostcomment` | `posts/{postId}/comments/{commentId}` | author +5 (received), commenter +1 (given, capped) |
| `hypeonpostsave` | `users/{saverId}/savedPosts/{postId}` | author +8 (received) |
| `hypeonfollow` | `users/{userId}/followers/{followerId}` | followed user +10 |
| `hypeonworkoutcomplete` | `users/{userId}/workout_logs/{logId}` | user +15 (grind) |
| `hypeonmilestone` | `posts/{postId}` (if `isMilestone`) | author +40 (grind) |

## Deployment

The client display works immediately, but scores only populate once the
functions + rules are deployed:

```bash
firebase deploy --only firestore:rules
cd functions && npm run build && cd ..
firebase deploy --only functions
```

Region for all Hype functions: `northamerica-northeast2`.
