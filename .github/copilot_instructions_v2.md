2) Sharpen semantic memory (higher precision, lower tokens)

Your memory system is already set up with MiniLM + FAISS and trims to 100 snippets per user. Improve retrieval by:

Filter + score: time-decay recent items, and bias sources (set feedback > chat > general).

Normalize exercise mentions to IDs before indexing so “bench” links to barbell_bench_press.

Threshold tuning: raise or lower the 0.3 similarity gate per route (e.g., technique needs stricter matches than explain).

Chunking: index workouts by segment/exercise, not whole sessions, so you can pull the one quad note instead of the entire day.

De-duplication: collapse near-duplicate chat lines before indexing.

Top-K discipline: stick to K=2–3; never paste entire memory.
These changes make the context slimmer and more relevant without touching the model. 

3) Add an allowedExercises projection to the prompt

Right now your template passes “equipmentAccess” text, but not a concrete whitelist of exercise IDs for the model to use. Add allowedExercises[] (10–30 IDs filtered by equipment + injury bans) to every planner/technique prompt and instruct the model to pick only from that list. This is the single best way to reduce hallucinations and token waste. Wire it into the template alongside profile/health/preference blocks. 

4) Close the validator loop (auto-correct on violations)

You already validate plans (banned exercises, missing safetyRating/equipmentNeeded, beginner high-risk). When violations occur, re-prompt with a tiny “validator feedback” message and the previous JSON only—don’t resend the whole context. This cuts tokens dramatically and guarantees compliance without manual retries. Also expand validator checks to: total session duration, segment count, per-muscle weekly set ceilings, and “no heavy hinge + heavy squat on consecutive days” spacing. 

5) Make profiles operational, not just descriptive

Your profile manager emits a great context object (experience, goals, injuries, tone). Extend it to keep training maxes/1RMs, preferred rep ranges per goal phase, and active ban/caution lists rolled up from injuries—then serialize a compact profileSummary + healthSummary every time. Add a “preference memory” updater that learns dislikes (“hate walking lunges”) from chat and persists them. This will let the planner adapt week-to-week without bigger prompts. 

6) Route with a cheap model; reserve the strong model for hard tasks

You already use a fast router and a stronger coach. Keep that split, and add a rule-based fallback (you wrote one) so routing never blocks. Also route Explain to the cheap model by default; reserve the strong model for Planner/Technique/Schedule only. Log per-route tokens to catch regressions. 

7) Build a cues/substitutions library (reduce model work)

Stand up a small, versioned JSON for technique cues and common substitutions by exercise ID (e.g., for elbow pain, DB neutral-grip press → reasons, cues). Inject only the 5–10 items relevant to the user’s query and injuries. This cuts tokens, increases consistency, and ensures the model’s advice matches your safety doctrine. Tie this to your injury maps and the “prefer/avoid” lists. 

8) Memory → profile sync (closed loop)

After each chat, run a tiny extractor that promotes durable facts into the profile: new dislikes, resolved/active injuries, equipment changes (“no leg press at this gym”), and inferred goals. You already have semantic memory and profile endpoints; add a post-reply job to write back to the profile so the next plan is better by default. 
 

9) Observability & cost controls

Log: route label, input/output token counts, # of snippets included, violations found, correction loops taken. Enforce daily message caps per user and implement a cache for identical recent prompts (e.g., same user asks “push day please” twice). You already have the API surface—add these counters and a simple dashboard. 

10) (Optional) Lightweight personalization adapter

When you have a few hundred clean SFT pairs (prompt → validated JSON plan), consider training a small LoRA/adapter for tone/structure—not for exercise knowledge. Hot-swap the adapter per user cohort (beginner hypertrophy, etc.). Keep RAG + validator as the source of truth for safety and equipment constraints. (Adapter plugs into your existing dual-model design.)




MORE STUFF:


Fix the enum gap: add ANKLE to InjuryType and remove the hasattr(... 'ANKLE') fallback in calf-raise rules to avoid silent misclassification. 

Risk-aware planning: treat RiskLevel.HIGH/EXTREME as “discourage by default”; require explicit rationale from the model to include them for advanced users—otherwise auto-substitute from exercise.substitutions. 

Technique route = database-powered: when a banned exercise appears, call get_safe_substitutions(exercise_id, user_ctx) and present top 2–3 with cues from your safety doctrine (EXERCISE_SAFETY_GUIDELINES)—short, consistent, and token-cheap. 
 

Program state for progression: store the last used load/RPE per exerciseId and let the planner propose +2.5–5% or +1 rep when RPE ≤7. This logic lives outside the LLM; the model only chooses exercises and set/rep patterns.

Parify with the app’s exercises.ts: ensure every exercise the mobile UI exposes is present in the canonical DB with the same IDs. If the mobile uses metricType (e.g., weight_reps), add it to ExerciseProfile so the planner chooses correct load notation.


Precompute and cache per-user whitelists at login (experience + injuries + equipment). Invalidate the cache on profile or injury changes. Use the cached list in every prompt. 

Observability: log counts of violations by category (injury vs experience vs unknown ID) and how often substitutions are applied. This shows where your database needs coverage.