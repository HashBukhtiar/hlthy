You are a senior backend engineer for the hlthy AI coach. Implement a **segment-aware planner + interview flow + knowledge-fusion** upgrade that fixes warm-ups/cool-downs, rejects nonsense intents (e.g., “toenails”), asks smart follow-ups like a real coach, and fuses our canonical exercise database with branded machine names. **No mocks, no placeholders.** Ship real modules, integrated with our repo.

## Context (assume these files exist in repo)
- Core: exercise_database.py, exercise_safety.py, exercise_whitelist_cache.py
- Focus pipeline: focus_router.py, focus_composer.py, focus_rules.py, focus_rulesets.py, focus_rubrics.py, focus_whitelist.py, focus_validator.py, focus_integration.py
- Integration & infra: user_profiles.py, profile_sync.py, semantic_memory.py, progression_tracker.py, observability_dashboard.py, rate_limiting.py, vertex_testing.py

## Objective
1) **Segment roles**: Warm-up ≠ Cool-down by design. Warm-ups must be general cardio + activation; cool-downs must be mobility/stretch; never reuse the same exercise between segments.
2) **Interview flow**: When request is vague (“build my back”) or nonsense (“toenails”), do not generate a plan. Ask 3–5 targeted questions (goal, time, equipment access, injuries/soreness, session length), then **ask permission** to build the workout. Persist answers to the user profile and only then plan.
3) **Knowledge fusion**: Use our DB **plus** LLM knowledge of name variants and brand machines (Life Fitness, Hammer Strength, Technogym). Map branded names → canonical exercise_id deterministically. If unmapped, ask user to confirm or choose from top-3 canonical options.
4) **Guardrails**: Keep all existing focus rubrics/slot templates/validators. Add **role checks** and **no-reuse** checks. Maintain progression logic for loads/RPE after validation.

## Absolute rules
- **No mock functions**. Implement working modules and wire them into the real flow.
- Use canonical **exercise_id** as the single source of truth for planning, safety, and validation.
- Correction loop must be **tiny**: send previous JSON + violation bullets only. Do not resend full chat context.
- All new behavior must be covered by unit+integration tests.

## Tasks (implement in this order)

### A) Data & taxonomy — real DB enrichment
1. **exercise_database.py**: Add per-exercise boolean flags:
   - `isCardioWarmup`, `isActivation`, `isMobility`, `isStretch`, `isCooldownSafe` (default False).
2. Seed real candidates (low risk):
   - Cardio warm-ups: `treadmill_walk_easy`, `assault_bike_easy`, `rower_light_5min`, `elliptical_easy`
   - Activation (tag by focus): 
     - chest/push: `scap_pushup`, `band_external_rotation`, `band_pull_aparts`, `empty_bar_bench_groove`
     - back/pull: `band_face_pulls`, `scap_pullups`, `lat_primer_circles`
     - legs: `glute_bridge_bodyweight`, `hip_airplanes`, `copenhagen_side_plank_easy`, `ankle_dorsiflexion_drill`
   - Mobility/Stretch (cool-down): 
     - chest/shoulder: `doorway_pec_stretch`, `thoracic_extension_foam_roll`, `sleeper_stretch_light`
     - back: `child_pose_breathing`, `cat_cow_slow`, `thread_the_needle`
     - legs: `pigeon_stretch_light`, `couch_stretch_light`, `hamstring_band_stretch`, `calf_wall_stretch`
3. Ensure these **do not** enter main/accessory whitelists by pattern—selection for warmup/cooldown must come from role flags, not generic pattern filters.

### B) Segment-aware composer & whitelist
4. **focus_composer.py**: 
   - Prepend WARMUP segment: pick exactly **1** `isCardioWarmup` (3–6 min) + **1–2** `isActivation` exercises relevant to detected focus.
   - Append COOLDOWN segment: pick **1–2** from `isMobility|isStretch` that target prime movers and/or antagonists of the session.
   - Ensure warm-up and cool-down sets do not exceed 6 total sets; main plan remains driven by focus slot template.
5. **focus_whitelist.py**:
   - Keep current main/accessory whitelist logic for focus.
   - Add **separate pools**: `build_warmup_pool(user_ctx, focus)` and `build_cooldown_pool(user_ctx, focus)` using the new flags. Pools must respect equipment/injury constraints.
   - Composer uses these pools; **never** pull warm-up/cool-down from the main whitelist.

### C) Interview gate (coach-like dialog)
6. **focus_router.py**: 
   - Implement `detect_focus(text)` and `parse_combo(text)` (existing) plus:
     - `is_nonsense_or_unknown(text) -> bool` (reject words not mapping to muscles/equipment; e.g., “toenails”).
     - `needs_interview(text, profile) -> bool` (true for generic asks like “build my back” when profile lacks recent answers: goal/time/equipment/injury/length).
7. **focus_integration.py**:
   - Implement a stateful **Interview** path (`start_interview`, `collect_answer`, `finalize_interview`).
   - Ask 3–5 **targeted** questions: goal (hypertrophy/strength/endurance), time available, equipment @gym/home/brands, current soreness/injury flags, session length.
   - Final prompt: “Want me to build the workout now?” Yes → call planner. No → store context and end.
   - Persist answers via `profile_sync.py`. Cache in session too for latency.

### D) Knowledge fusion (brand machines + aliases)
8. **NEW: equipment_catalog.py**
   - Hard-code a minimal but real mapping: brand name → canonical families/patterns + canonical candidates, e.g., 
     - “Life Fitness Chest Press” → `horizontal_press`/`chest` → preferred ids: [`machine_chest_press`, `plate_loaded_chest_press`]
     - “Hammer Strength Low Row” → `horizontal_pull`/`upper_back` → [`machine_row_chest_supported`, `cable_row_vbar`]
     - “Technogym Pullover” → `pullover`/`lats` → [`machine_pullover`, `cable_pullover_rope`]
9. **NEW: exercise_alias_resolver.py**
   - Build an index from:
     - exercise_id, display_name, `common_names` in DB, plus **equipment_catalog** names.
   - Implement deterministic fuzzy match (e.g., difflib + threshold). Return canonical `exercise_id` if confident; else top-3 suggestions.
10. **focus_integration.py** (response validation path):
    - For any non-ID exercise name in model output: resolve via alias_resolver; if unresolved, ask user to pick from suggestions; persist choice.

### E) Validator hard rules (no reuse; role correctness)
11. **focus_validator.py**:
    - Add role checks:
      - Warm-up must include **exactly one** `isCardioWarmup` and **≥1** `isActivation`.
      - Cool-down must include **≥1** `isMobility|isStretch` and **no** `isActivation`.
      - **No duplication**: `warmup_ids ∩ cooldown_ids == ∅`.
      - Cool-down muscles should overlap prime movers or antagonists (use muscle families to compute overlap ≥ 50%).
    - Keep existing focus composition, bans, volume bounds, proportion rules.
12. Keep the tiny **correction loop** intact:
    - Input: previous JSON + violations list + `allowedExercises_focus`.
    - Output: corrected JSON only. Re-validate once.

### F) Prompt integration (planner route)
13. Planner prompt must include:
    - `allowedExercises_focus[]` for main/accessory only (from whitelist).
    - `slotTemplate` as hint (unchanged).
    - A brief **segment policy note**:
      - “Do not place activation or mobility in main sets; warm-ups use activation only; cool-downs use mobility/stretch only; never repeat the same item for warm-up and cool-down.”
    - Keep RAG snippets K=2–3 biasing to the detected focus and recent user context (milestones, injuries).

### G) Progression + safety (unchanged behavior)
14. After validation (and correction if needed), call `progression_tracker.fill_loads_for_plan(plan, user_id)` to set loads reps/RPE deterministically.
15. Keep `exercise_safety.py` checks; no exercise with active contraindication may pass.

### H) Observability & quality metrics
16. **observability_dashboard.py**: log the following for each planner attempt:
    - `interview_started`, `interview_questions`, `interview_completed`
    - `focus_detected`, `combo_detected`, `whitelist_size`, `warmup_pool_size`, `cooldown_pool_size`
    - `violations_count`, `correction_runs`, `auto_subs_applied`
    - `brand_mapped_count`, `brand_unmapped_count`
    - Token/latency: `tokens_in`, `tokens_out`, `latency_ms`
17. Targets (assert in tests where feasible):
    - Warm-up/Cool-down duplication rate: **0%**
    - Brand mapping success on known items: **≥90%**
    - Average correction runs: **≤1**

## Tests (pytest; no mocks for logic)
Create `tests/coach_pipeline/` with:
1) **Warmup/Cooldown**: Chest plan includes `treadmill_walk_easy` + `scap_pushup`; cooldown uses `doorway_pec_stretch` + `thoracic_extension_foam_roll`. Assert **no shared IDs**; roles valid.
2) **Toenails**: `is_nonsense_or_unknown` returns True; flow returns interview/clarification, not a workout.
3) **Back (generic)**: triggers interview; after answers, produces valid Pull/Back plan; roles OK; volumes in bounds.
4) **Brand mapping**: “Life Fitness Chest Press” resolves to `machine_chest_press`; if ambiguity, returns top-3; user choice persisted then used in plan.
5) **Injury**: Shoulder pain → DB/neutral-grip subs enforced; still valid.
6) **Combo**: “hamstrings-focused back day” → hamstrings ≥60% of sets; back required patterns present; roles valid.
7) **Correction**: feed invalid plan with warm-up=reverse_fly, cooldown=reverse_fly → single correction pass fixes duplication + roles.

## Performance & cost guardrails
- Keep planner prompt under **1.5k tokens**; correction prompt under **200 tokens**.
- Do **not** include full chat history; keep only last 3–6 user/coach turns relevant to focus.
- Whitelists: cap at **25** IDs, pools at **12** each.
- Timeouts: model 12s; DB/resolver 150ms average; total end-to-end p95 < 2.0s (excluding model time).

## Deliverables (must exist and be wired)
- NEW: equipment_catalog.py, exercise_alias_resolver.py
- UPDATED: exercise_database.py, focus_composer.py, focus_whitelist.py, focus_router.py, focus_integration.py, focus_validator.py
- Tests: `tests/coach_pipeline/*`

## Finish line
When everything passes, print exactly:
FOCUS-INTERVIEW+SEGMENTS: COMPLETE — [equipment_catalog.py, exercise_alias_resolver.py, exercise_database.py, focus_composer.py, focus_whitelist.py, focus_router.py, focus_integration.py, focus_validator.py, tests/coach_pipeline/*]
