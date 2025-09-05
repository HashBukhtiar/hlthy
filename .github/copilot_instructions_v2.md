# HLTHY AI Coach — Part 1: Fixes & Hardening (Production Grade)

**Goal:** Make the coach **reliable, non-repetitive, and professional** right now by fixing warm-up/cool-down duplication, unifying taxonomy, correcting progression data shape, enforcing router-first gating, chaining interviews conversationally, and fusing brand machine names → canonical exercise IDs—without breaking your existing focus/rubric pipeline.

> **No mocks. No placeholders.** Write real code, integrate with existing modules, add tests, and pass acceptance criteria before marking complete.

---

## 0) Operating Rules for This Task

- **Do not** remove or bypass: `focus_rubrics.py`, `focus_rules.py`, `focus_whitelist.py`, `focus_composer.py`, `focus_validator.py`, `progression_tracker_complete.py`, `trainer_brain.py`, `ai_orchestrator.py`, `focus_router_enhanced.py`, `exercise_database.py`, `exercise_alias_resolver.py`, `equipment_catalog.py`.
- Keep **final plans canonical** (exercise IDs from `exercise_database.py`). Conversational turns may mention brands/machines but must be resolved to canonical IDs **before planning**.
- **Correction loop must be tiny**: prior JSON + violation bullets + allowed IDs; **do not** resend full chat history.
- Add **unit + integration tests** (pytest). External LLM calls are out-of-scope for unit tests; test planner/composer/validator/route logic deterministically.

**When done, print exactly:**
FIXES-HARDENING: COMPLETE — [list of changed files]

yaml
Copy code

---

## 1) Repo Context (assume present)

/server
ai_orchestrator.py
trainer_brain.py
focus_router_enhanced.py
focus_rubrics.py
focus_rules.py
focus_whitelist.py
focus_composer.py
focus_validator.py
progression_tracker_complete.py
exercise_database.py
exercise_alias_resolver.py
equipment_catalog.py

pgsql
Copy code

---

## 2) Summary of Changes (high-level)

1) **Taxonomy unification + pattern matcher fix**  
   Single canonical `MOVEMENT_PATTERNS` across modules; `_matches_pattern()` splits `a|b` patterns and matches **tags**, not names.
2) **Segment-aware anti-duplication**  
   Warm-up/cool-down **must not** reuse each other **or** main-block exercises; validator enforces this.
3) **Warm-up/cool-down pools**  
   Build role-specific pools and never draw these segments from main whitelist.
4) **Progression data structure fix**  
   Correct nested dict shape for per-user, per-exercise history.
5) **Router-first gating + interview chaining**  
   Always pass through router; if interview continues, backend **immediately** asks the next question or **offers a plan**, not “profile updated” then silence.
6) **Intent schema**  
   Multi-intent JSON with `{intent, reason, confidence}`; no bias toward `workout_request`.
7) **Hybrid knowledge**  
   Allow brand-machine mentions in conversation; canonicalize via resolver **before** planning.
8) **Validator**  
   Enforce segment roles, anti-duplication across segments, required/forbidden patterns, volume bounds, proportions; small correction loop.

---

## 3) Task A — Taxonomy Unification & Pattern Matching

### A.1 Canonical patterns (apply everywhere)
Use this exact set in **exercise DB**, **alias resolver**, **whitelist**, **composer**, **validator**:

```python
MOVEMENT_PATTERNS = [
  "horizontal_press","incline_press","vertical_press","fly",
  "vertical_pull","horizontal_pull","row","pullover",
  "squat","leg_press","hinge","lunge",
  "quad_iso","ham_iso","glute_iso","calf",
  "lateral_delt","front_delt","rear_delt",
  "biceps","triceps",
  "core_anti_extension","core_rotation","core_anti_rotation","core_flexion"
]
Replace any drift like lateral_raise → lateral_delt, knee_extension/flexion → quad_iso/ham_iso, etc.

Files:

exercise_database.py (ensure every exercise has a movement_patterns: set[str])

exercise_alias_resolver.py (map brand/generic names to these patterns)

focus_whitelist.py, focus_composer.py, focus_validator.py (consume patterns)

A.2 Fix _matches_pattern()
Split by |, trim entries, and match against exercise.movement_patterns (set membership), not display names.

Acceptance tests

Given exercise with movement_patterns={"horizontal_press","chest"}:

_matches_pattern("horizontal_press|incline_press") == True

_matches_pattern("vertical_pull|row") == False

4) Task B — Segment-Aware Anti-Duplication & Pools
B.1 Role pools (no cross-contamination)
Warm-up pool = from DB flags: isCardioWarmup and isActivation (focus-relevant).

Cool-down pool = from DB flags: isMobility or isStretch (focus prime movers / antagonists).

Main/accessory whitelist stays separate and must not include role-flagged items.

Files: focus_whitelist.py, exercise_database.py

B.2 Composition rules
Warm-up: exactly 1 cardio warm-up (3–6 min) + 1–2 activation drills (focus-relevant).

Cool-down: 1–2 mobility/stretch items.

Never sample the same exercise in warm-up and cool-down; also never duplicate any exercise from the main block.

Files: focus_composer.py

B.3 Validator rules
Fail if:

Overlap between warm-up and cool-down IDs

Warm-up contains stretch/mobility

Cool-down contains activation

Any warm-up/cool-down ID also appears in main

Files: focus_validator.py

Acceptance tests

Compose back day: ensure len(set(warmup_ids) & set(cooldown_ids)) == 0 and set(warmup_ids) ∩ set(main_ids) == ∅ and set(cooldown_ids) ∩ set(main_ids) == ∅.

5) Task C — Progression Data Structure Fix
C.1 Bug
Current type hints don’t match writes; should be per-user→per-exercise→list of records.

C.2 Fix type & serialization
python
Copy code
ProgressionRecord = TypedDict("ProgressionRecord", {
  "date": str, "exercise_id": str, "sets": int, "reps": list[int], "rpe": list[float], "load": list[float]
})

# Correct shape:
self.progression_records: dict[str, dict[str, list[ProgressionRecord]]] = {}
# access: self.progression_records[user_id][exercise_id] -> list[ProgressionRecord]
Fix (de)serialization accordingly.

Ensure fill_loads_for_plan() reads last N records safely even when user/exercise key missing.

Files: progression_tracker_complete.py

Acceptance tests

Store and retrieve two sessions for same user+exercise; ensure fill_loads_for_plan() computes deload/progression per rules and never throws.

6) Task D — Router-First Gating & Interview Chaining
D.1 Always route first
ai_orchestrator.process_message() must call focus_router_enhanced.route(text, profile) before any planning. Honor actions:

clarify_focus, confirm_focus, start_interview, direct_planning.

Nonsense (e.g., “toenails”) → clarify_focus with curated options, not a plan.

Files: ai_orchestrator.py, focus_router_enhanced.py

D.2 Fix interview loop
After _handle_interview_response() returns a profile_update:

If next_question exists → immediately return an interview message asking that next question (do not pause).

If interview is complete → offer_plan message with 2 options (e.g., 45-min hypertrophy vs 60-min strength bias), then on selection call planner.

Files: ai_orchestrator.py

Acceptance tests

Start with “build my back” (generic) → router triggers interview → backend chains without dead-end “profile updated”; after last question, returns offer_plan.

7) Task E — Intent Schema (avoid bias)
E.1 Multi-intent contract
_ai_understand_with_context() must produce:

json
Copy code
{
  "intent": "workout_request|interview_needed|technique_question|progress_check|advice|nonsense",
  "reason": "string",
  "confidence": 0.0-1.0
}
Remove example JSON that defaults to workout_request. Choose intent based on router output + keywords.

Files: ai_orchestrator.py (or wherever you shape the intent JSON)

Acceptance tests

Inputs “toenails”, “teach me lat pulldown form”, “I want to build my back today” → produce intents nonsense, technique_question, interview_needed respectively.

8) Task F — Hybrid Knowledge (brands → canonical IDs)
F.1 Allow brands in conversation
In clarification/interview turns, the coach may list brand machines (Life Fitness, Hammer Strength, Technogym) and ask availability.

F.2 Canonicalize before planning
Pipe user’s brand answers through exercise_alias_resolver (which consults equipment_catalog.py) to map to canonical exercise_ids.

Only canonical IDs go to planner.

Files: ai_orchestrator.py (clarification handler), exercise_alias_resolver.py, equipment_catalog.py

Acceptance tests

“We have Life Fitness Chest Press and Hammer Strength Low Row” → set availability and render a plan using the canonical IDs (machine_chest_press, machine_row_chest_supported, etc.).

9) Task G — Validator Extensions (hard rules)
Enforce:

Required patterns per focus; forbidden patterns absent.

Session sets in bounds per focus.

Proportion rules per focus/combos.

Segment role guards (warm-up/cool-down separation, no reuse with main).

On violations: one small correction pass (previous JSON + violation list + allowed IDs) → re-validate.

Files: focus_validator.py

Acceptance tests

Invalid chest plan with lateral raises in main → corrected in one pass to fly; duplication between warm-up and cool-down → corrected to a different stretch.

10) Observability & Performance
Log per plan: focus_detected, combo_detected, whitelist_size, warmup_pool_size, cooldown_pool_size, violations_count, correction_runs, brand_mapped_count, tokens_in/out, latency_ms.

Promises:

Planner prompt ≤ 1.5k tokens; correction prompt ≤ 200 tokens.

Whitelist ≤ 25; warm-up/cool-down pools ≤ 12 each.

Files: ai_orchestrator.py (or logging utility you already use)

11) Tests to Add (pytest)
Create tests/fixes_hardening/:

Pattern matcher

_matches_pattern("horizontal_press|incline_press") hits a bench variant; fails on vertical pull.

Segment anti-duplication

Back day plan: assert no ID overlap warm-up↔cool-down and with main.

Warm-up/cool-down pools

Ensure warm-up contains cardio+activation only; cool-down contains mobility/stretch only.

Progression DS

Store two sessions; fill_loads_for_plan() respects RPE and days-since for progression/deload without KeyErrors.

Router-first gating

“toenails” → clarify_focus (no plan).

“build my back” → interview, then offer plan.

Intent schema

“teach me proper deadlift bracing” → technique_question with high confidence.

Hybrid knowledge

User reports brand machines; plan uses canonical IDs via resolver.

Validator correction loop

Inject plan with a forbidden pattern; single correction yields valid plan.

Tests must execute without network, using deterministic inputs/fixtures for non-LLM components.

12) Definition of Done
All tasks A–G implemented and wired.

All tests in tests/fixes_hardening/ pass locally (pytest).

Observability logs show non-zero warmup_pool_size, cooldown_pool_size, brand_mapped_count.

Manual run: “please send me a back workout” → interview (if needed) → offer plan → final plan with distinct warm-up and cool-down; no duplication; volumes/proportions pass; progression applied.

Output the final line:

bash
Copy code
FIXES-HARDENING: COMPLETE — [ai_orchestrator.py, focus_router_enhanced.py, focus_composer.py, focus_whitelist.py, focus_validator.py, progression_tracker_complete.py, exercise_database.py, exercise_alias_resolver.py, equipment_catalog.py, tests/fixes_hardening/*]