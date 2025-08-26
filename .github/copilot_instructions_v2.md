# HLTHY — Focus Rubrics Library (v2, extended)
**Purpose:** Give the planner/validator **exercise-proof** guardrails for *any* common day type (single focus, combos, and full body). This is copy-paste ready for Copilot to implement on top of your existing pipeline.

> Works with your current modules: `exercise_database.py`, `exercise_whitelist_cache.py`, `technique_library.py`, `progression_tracker.py`, `semantic_memory.py`, `user_profiles.py`, `profile_sync.py`, `observability_dashboard.py`.

---

## 0) Core ideas (what changes)
1) **Focus detection** → map user text to a **focus key** (or a **combo** of keys with weights).  
2) **Whitelist build** → per focus, return **10–25 exerciseIds** that match tags, equipment, injuries, experience.  
3) **Rubric attach** → tiny, explicit rules per focus (required/optional slots, bans, proportions, volume).  
4) **Validator** → enforce the rubric; if violations, run the **tiny correction loop** (JSON only).  
5) **Combos** → merge two (or more) focuses with weights (e.g., `hamstrings 0.6 + back 0.4`).  
6) **Full body** → balanced push/pull/squat/hinge pattern with low interference.

The LLM only chooses from the **focus whitelist** and follows the rubric. Loads are filled **deterministically** by your `progression_tracker`.

---

## 1) Controlled taxonomy (movement patterns & muscle families)

Ensure every `exerciseId` in `exercise_database.py` has:

```py
MOVEMENT_PATTERNS = [
  'horizontal_press','incline_press','vertical_press','fly',
  'vertical_pull','horizontal_pull','row','pullover',
  'squat','leg_press','hinge','lunge',
  'quad_iso','ham_iso','glute_iso','calf',
  'lateral_delt','front_delt','rear_delt',
  'biceps','triceps',
  'core_anti_extension','core_rotation','core_anti_rotation','core_flexion'
]

MUSCLE_FAMILIES = [
  'chest','front_delts','lateral_delts','rear_delts',
  'lats','upper_back','traps',
  'quads','hamstrings','glutes','calves',
  'biceps','triceps','core'
]
These tags drive whitelists and validation. If an exercise lacks tags, add them (do not rely on names).

2) Focus inventory (single, combos, full body)
We define base foci and common combinations:

py
Copy
Edit
BASE_FOCI = [
  'chest','shoulders','back','lats','upper_back',
  'quads','hamstrings','glutes','calves',
  'arms','biceps','triceps',
  'core',
  'push','pull','legs',
  'upper','lower',
  'back_biceps','chest_triceps','shoulders_triceps',
  'glutes_hamstrings','quads_calves',
  'posterior_chain',           # back + hamstrings + glutes
  'full_body'
]

FOCUS_ALIASES = {
  'pecs':'chest','bench':'chest','delts':'shoulders',
  'posterior':'posterior_chain','posterior chain':'posterior_chain',
  'upper body':'upper','lower body':'lower',
  'back and bis':'back_biceps','chest and tris':'chest_triceps',
  'glutes and hams':'glutes_hamstrings','quads and calves':'quads_calves',
  'fullbody':'full_body','total body':'full_body'
}
3) Rubrics (ready to drop in)
Each rubric is tiny text appended to your planner prompt. It references allowedExercises_focus[] and defines required slots, optional slots, bans, proportions, and volume targets.

py
Copy
Edit
RUBRICS = {
  # ——— Singles ———
  "chest": """Chest Day Rules:
- Include 2 presses (≥1 horizontal) and 1 fly/pec isolation.
- Optional: 0–1 triceps accessory.
- Avoid lateral/rear delts and core unless requested.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "shoulders": """Shoulders Day Rules:
- Include 1 vertical press, 1 lateral delt isolation, 1 rear delt isolation.
- Optional: 0–1 front delt isolation.
- Avoid chest/back compounds unless requested.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "back": """Back Day Rules:
- Include 1 vertical pull and 1 horizontal pull/row.
- Optional: 0–1 pullover and/or 0–1 rear delt isolation.
- Avoid pressing patterns unless requested.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "lats": """Lats Focus Rules:
- Prioritize vertical pulls; include 1 vertical pull and 1 row emphasizing scapular depression.
- Optional: 0–1 pullover.
- Avoid pressing patterns.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "upper_back": """Upper Back Rules:
- Emphasize rows: 2 rowing patterns with different grips/angles.
- Include 0–1 rear delt isolation.
- Avoid vertical pressing.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "quads": """Quads Focus Rules:
- Include 1 knee-dominant compound (squat/leg press) and 1 quad isolation.
- Optional: 0–1 lunge pattern.
- Keep hamstrings ≤30% of total sets.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "hamstrings": """Hamstrings Focus Rules:
- Include 1 hinge pattern and 1 hamstring isolation.
- Optional: 0–1 light squat/lunge and/or calves.
- Keep quads ≤30% of total sets.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "glutes": """Glutes Focus Rules:
- Include 1 hinge/hip thrust/bridge and 1 glute isolation/abduction.
- Optional: 0–1 lunge pattern (contralateral load).
- Keep quads/hamstrings accessories ≤40% total.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "calves": """Calves Day Rules:
- Include both knee-straight and knee-bent calf work.
- Optional: 0–1 hinge/squat warm-up only.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "arms": """Arms Day Rules:
- Balance biceps and triceps: 2–3 exercises each.
- Vary grips/angles; avoid pressing/pulling compounds as primaries.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "biceps": """Biceps Rules:
- Include 2 curl variations with different angles/grips.
- Optional: 0–1 row only as warm-up; no heavy compounds.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "triceps": """Triceps Rules:
- Include 2–3 triceps moves (extension variants/dips if allowed).
- Optional: 0–1 press accessory.
- Avoid chest compounds unless requested.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "core": """Core Rules:
- Mix anti-extension and anti-rotation; optional controlled flexion if no back pain.
- Avoid high-fatigue barbell lifts as 'core' work.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "push": """Push Day Rules:
- Include 1 horizontal press, 1 vertical or incline press, 1 lateral delt isolation.
- Optional: 0–2 triceps accessories; 0–1 front delt.
- No rows/pulls/biceps as primaries.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "pull": """Pull Day Rules:
- Include 1 vertical pull, 1 horizontal pull/row, 1 rear delt isolation.
- Optional: 0–2 biceps and/or 0–1 pullover.
- No pressing patterns as primaries.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "legs": """Legs Day Rules:
- Include 1 knee-dominant (squat/leg press), 1 hinge, 1 isolation (quad or ham).
- Optional: 0–1 lunge, 0–1 calves.
- No upper-body accessories.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "upper": """Upper Day Rules:
- Include 1 press (horizontal or vertical) and 1 pull (vertical or horizontal).
- Add 1 delt isolation (lateral or rear) and 0–1 arm accessory each (bi/tri).
- Keep chest/back balance; avoid lower-body.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "lower": """Lower Day Rules:
- Include 1 squat/leg press and 1 hinge.
- Add 1 isolation (quad or ham), 0–1 lunge, 0–1 calves.
- No upper-body.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "posterior_chain": """Posterior Chain Rules:
- Include 1 hinge, 1 hamstring isolation, and 1 vertical/horizontal pull.
- Optional: 0–1 glute isolation; keep quads minimal.
- No pressing patterns as primaries.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  # ——— Combos ———
  "back_biceps": """Back + Biceps Rules:
- Include 1 vertical pull and 1 row.
- Add 1–2 biceps variations.
- Optional: 0–1 rear delt isolation.
- No pressing patterns as primaries.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "chest_triceps": """Chest + Triceps Rules:
- Include 1 horizontal press and 1 incline/secondary press.
- Add 1 triceps accessory (0–2 total).
- Optional: 0–1 fly.
- Avoid rows/pulls.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "shoulders_triceps": """Shoulders + Triceps Rules:
- Include 1 vertical press and 1 lateral delt isolation.
- Add 1 triceps accessory (0–2 total).
- Optional: 0–1 rear delt isolation.
- Avoid horizontal/vertical pulls.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "glutes_hamstrings": """Glutes + Hamstrings Rules:
- Include 1 hinge/hip thrust and 1 hamstring isolation.
- Optional: 0–1 lunge; quads minimal.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  "quads_calves": """Quads + Calves Rules:
- Include 1 squat/leg press and 1 quad isolation.
- Add 1 calf movement (knee-straight or knee-bent).
- Hamstrings minimal.
- Use ONLY exerciseIds from allowedExercises_focus[].""",

  # ——— Full body ———
  "full_body": """Full Body Rules:
- Include 1 lower (squat/hinge), 1 push (press), 1 pull (row/pull-up).
- Optional: 0–1 isolation (choose lagging area) and/or 0–1 core anti-extension.
- Avoid stacking highly fatiguing compounds back-to-back; alternate patterns.
- Keep total 6–10 working sets (time-boxed variant) or 10–16 (long session).
- Use ONLY exerciseIds from allowedExercises_focus[]."""
}
4) Volume & proportions (for validator)
py
Copy
Edit
VOLUME_BOUNDS = {
  # ranges are per-session working sets for the *primary* muscle family(s)
  "chest": (10,16),
  "shoulders": (10,16),
  "back": (12,20),
  "lats": (10,16),
  "upper_back": (10,16),
  "quads": (8,14),
  "hamstrings": (10,16),
  "glutes": (10,16),
  "calves": (6,12),
  "arms": (10,16), "biceps": (6,12), "triceps": (6,12),
  "core": (6,12),
  "push": (16,28),
  "pull": (16,28),
  "legs": (16,26),
  "upper": (16,26), "lower": (16,26),
  "posterior_chain": (16,26),
  "back_biceps": (16,26),
  "chest_triceps": (16,26),
  "shoulders_triceps": (16,26),
  "glutes_hamstrings": (16,26),
  "quads_calves": (14,22),
  "full_body": (10,16)  # time-boxed variant can use (6,10)
}

PROPORTION_RULES = {
  # (muscle_family, min_fraction_of_total_sets)
  "chest": ("chest", 0.70),
  "hamstrings": ("hamstrings", 0.60),
  "glutes": ("glutes", 0.60),
  "quads": ("quads", 0.60),
  "shoulders": ("lateral_delts", 0.40),  # ensure real delt work
  "back": ("back", 0.70),                # lats+upper_back combined
  "back_biceps": ("back", 0.60),
  "chest_triceps": ("chest", 0.60),
  "glutes_hamstrings": ("posterior_lower", 0.70),  # map ham+glutes
  "full_body": None
}
Your compute_volume(plan) should roll per-exercise sets into muscle families via exercise_database tags.
posterior_lower = hamstrings + glutes (internal alias used in validator only).

5) Slot templates (pre-LLM hint to keep structure tight)
py
Copy
Edit
def slot_template_for_focus(focus: str):
  return {
    "chest": [
      {"slot":"A","pattern":"horizontal_press","sets":[3,4]},
      {"slot":"B","pattern":"incline_press|horizontal_press","sets":[3,4]},
      {"slot":"C","pattern":"fly","sets":[3,4]},
      {"slot":"D","pattern":"triceps","sets":[0,3],"optional":True}
    ],
    "shoulders": [
      {"slot":"A","pattern":"vertical_press","sets":[3,4]},
      {"slot":"B","pattern":"lateral_delt","sets":[3,4]},
      {"slot":"C","pattern":"rear_delt","sets":[3,4]},
      {"slot":"D","pattern":"front_delt","sets":[0,3],"optional":True}
    ],
    "back": [
      {"slot":"A","pattern":"vertical_pull","sets":[3,5]},
      {"slot":"B","pattern":"horizontal_pull|row","sets":[3,5]},
      {"slot":"C","pattern":"pullover|rear_delt","sets":[0,3],"optional":True}
    ],
    "quads": [
      {"slot":"A","pattern":"squat|leg_press","sets":[3,5]},
      {"slot":"B","pattern":"quad_iso","sets":[3,4]},
      {"slot":"C","pattern":"lunge","sets":[0,3],"optional":True}
    ],
    "hamstrings": [
      {"slot":"A","pattern":"hinge","sets":[4,6]},
      {"slot":"B","pattern":"ham_iso","sets":[4,6]},
      {"slot":"C","pattern":"lunge|squat","sets":[0,3],"optional":True},
      {"slot":"D","pattern":"calf","sets":[0,3],"optional":True}
    ],
    "glutes": [
      {"slot":"A","pattern":"hinge","sets":[4,6]},               # hip thrust/bridge accepted
      {"slot":"B","pattern":"glute_iso","sets":[3,4]},           # abduction/step-up variants
      {"slot":"C","pattern":"lunge","sets":[0,3],"optional":True}
    ],
    "push": [
      {"slot":"A","pattern":"horizontal_press","sets":[3,4]},
      {"slot":"B","pattern":"incline_press|vertical_press","sets":[3,4]},
      {"slot":"C","pattern":"lateral_delt","sets":[3,4]},
      {"slot":"D","pattern":"triceps","sets":[0,3],"optional":True}
    ],
    "pull": [
      {"slot":"A","pattern":"vertical_pull","sets":[3,4]},
      {"slot":"B","pattern":"horizontal_pull|row","sets":[3,4]},
      {"slot":"C","pattern":"rear_delt","sets":[3,4]},
      {"slot":"D","pattern":"biceps","sets":[0,3],"optional":True}
    ],
    "legs": [
      {"slot":"A","pattern":"squat|leg_press","sets":[3,5]},
      {"slot":"B","pattern":"hinge","sets":[3,5]},
      {"slot":"C","pattern":"quad_iso|ham_iso","sets":[3,4]},
      {"slot":"D","pattern":"lunge","sets":[0,3],"optional":True},
      {"slot":"E","pattern":"calf","sets":[0,3],"optional":True}
    ],
    "upper": [
      {"slot":"A","pattern":"horizontal_press|vertical_press","sets":[3,4]},
      {"slot":"B","pattern":"vertical_pull|horizontal_pull|row","sets":[3,4]},
      {"slot":"C","pattern":"lateral_delt|rear_delt","sets":[3,4]},
      {"slot":"D","pattern":"biceps|triceps","sets":[0,3],"optional":True}
    ],
    "lower": [
      {"slot":"A","pattern":"squat|leg_press","sets":[3,5]},
      {"slot":"B","pattern":"hinge","sets":[3,5]},
      {"slot":"C","pattern":"quad_iso|ham_iso|calf","sets":[3,4]}
    ],
    "posterior_chain": [
      {"slot":"A","pattern":"hinge","sets":[4,6]},
      {"slot":"B","pattern":"ham_iso","sets":[3,4]},
      {"slot":"C","pattern":"vertical_pull|horizontal_pull|row","sets":[3,4]},
      {"slot":"D","pattern":"glute_iso","sets":[0,3],"optional":True}
    ],
    "back_biceps": [
      {"slot":"A","pattern":"vertical_pull","sets":[3,4]},
      {"slot":"B","pattern":"horizontal_pull|row","sets":[3,4]},
      {"slot":"C","pattern":"biceps","sets":[2,4]}
    ],
    "chest_triceps": [
      {"slot":"A","pattern":"horizontal_press","sets":[3,4]},
      {"slot":"B","pattern":"incline_press|horizontal_press","sets":[3,4]},
      {"slot":"C","pattern":"triceps|fly","sets":[2,4]}
    ],
    "shoulders_triceps": [
      {"slot":"A","pattern":"vertical_press","sets":[3,4]},
      {"slot":"B","pattern":"lateral_delt","sets":[3,4]},
      {"slot":"C","pattern":"triceps|rear_delt","sets":[2,4]}
    ],
    "glutes_hamstrings": [
      {"slot":"A","pattern":"hinge","sets":[4,6]},
      {"slot":"B","pattern":"ham_iso","sets":[3,4]},
      {"slot":"C","pattern":"glute_iso","sets":[2,3]}
    ],
    "quads_calves": [
      {"slot":"A","pattern":"squat|leg_press","sets":[3,5]},
      {"slot":"B","pattern":"quad_iso","sets":[3,4]},
      {"slot":"C","pattern":"calf","sets":[2,4]}
    ],
    "full_body": [
      {"slot":"A","pattern":"squat|hinge","sets":[3,4]},
      {"slot":"B","pattern":"horizontal_press|vertical_press","sets":[3,4]},
      {"slot":"C","pattern":"vertical_pull|horizontal_pull|row","sets":[3,4]},
      {"slot":"D","pattern":"core_anti_extension|core_anti_rotation|glute_iso|lateral_delt","sets":[0,3],"optional":True}
    ]
  }.get(focus, [])
6) Combos: weighted merging (e.g., “hamstrings-focused and back day”)
Implement a simple merger that:

Takes two focus keys and a ratio (default 0.6 / 0.4 if text contains “-focused”).

Builds two whitelists, unions them, then caps total (e.g., 25).

Merges slot templates by sampling slots from A and B proportional to their weights.

Sets volume bounds via weighted interpolation; validator checks per-side proportions.

py
Copy
Edit
def parse_combo(text:str) -> tuple[str,str,float]:
  # returns (focusA, focusB, weight_for_A) or None
  # e.g., "hamstrings-focused back day" -> ('hamstrings','back',0.6)
  ...

def merge_rubrics(focusA:str, focusB:str, wA:float=0.5):
  rubric = RUBRICS[focusA] + "\n\n" + RUBRICS[focusB] + f"\n\nCombo Rules:\n- Allocate about {int(wA*100)}% sets to {focusA} and {int((1-wA)*100)}% to {focusB}.\n- Avoid conflicting patterns; keep accessory overlap minimal.\n- Use ONLY exerciseIds from allowedExercises_focus[]."
  return rubric
Validator additions:

Enforce required patterns for both foci.

Enforce proportion: sets assigned to A’s primary family ≥ wA * total_sets * 0.9 (10% tolerance).

Disallow patterns if either focus bans them.

7) Whitelist builder (focus-scoped)
Use your current cache and add focus filtering by movement_patterns, equipment, injuries, experience, dislikes. Return 10–25 exerciseIds.

py
Copy
Edit
def build_focus_whitelist(user_ctx, focus_or_combo) -> list[str]:
  # if combo -> build each, union, then rank by safety/popularity/preference match
  ...
8) Prompt integration
Replace generic allowedExercises with allowedExercises_focus[].

Append RUBRICS[focus] (or merged rubric for combos).

Include slotTemplate in context as a hint, not a hard constraint.

Keep short-term turns (3–6) and RAG snippets (K=2–3) biased to the focus.

9) Validator (focus + combos)
Checks to implement (after substitutions, before progression):

Required patterns present (per focus or both in combos).

Disallowed patterns absent.

Primary muscle volume within VOLUME_BOUNDS[focus] (or interpolated for combos).

Proportion rules satisfied (e.g., ≥70% chest on chest day; ≥60% hamstrings for ham-focus).

Session sanity: 2–5 exercises, 8–16 sets (or per focus bounds), no duplicates unless justified.

Violations → tiny correction prompt with prior JSON only.

10) Progression (post-validation)
Use progression_tracker.fill_loads_for_plan() to set load fields:

+1 rep or +2.5–5% when last RPE ≤7

hold when 7.5–8.5

deload when ≥9 or last session >14 days ago

11) Acceptance tests (must pass)
Chest: ≥1 horizontal press + (incline or second horizontal) + 1 fly; no lateral/rear delts/core unless requested.

Push: press+press+lateral delt; no pulls/biceps primaries.

Pull: vertical pull + row + rear delt; no presses.

Legs: knee-dominant + hinge + isolation; optional lunge/calf; no upper-body.

Shoulders: vertical press + lateral + rear; no chest/back compounds primaries.

Quads/Hams/Glutes: required patterns present; opposing muscles within proportion limits.

Upper/Lower: include both main patterns; no cross-body exercises.

Back+Biceps: pull + row + 1–2 curls; no presses.

Hamstrings-focused Back: hinge + ham_iso + (vertical or row); hamstrings ≥60% of sets; passes bans.

Full Body: includes 1 lower (squat/hinge), 1 push, 1 pull; optional small isolation or core; alternates patterns.

Injury/Equipment: plans adapt via substitutions; still satisfy focus rules.

Correction loop: a purposely invalid plan (e.g., chest with lateral raises) auto-corrects in one pass.


CODING RULES (do not skip)

Use only canonical exerciseIds. Never rely on name substrings for safety or validation.

Keep the correction prompt tiny (violations + prior JSON only).

Never resend full chat context for correction.

Whitelist size: 10–25; prune to 25 max.

K for RAG: 2–3, filtered to the detected focus.

Log everything listed in step 9.

100% deterministic validation; LLM is not allowed to “justify” violations.

Add docstrings and type hints to every public function.