"""
Focus Rubrics - Rules and validation criteria for each focus type
"""
from typing import Dict, Optional, Tuple
from focus_rules import parse_combo, normalize_focus


# Focus-specific rubrics
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


def get_rubric_for_focus(focus_or_combo: str) -> str:
    """
    Get rubric text for focus or combo.
    
    Args:
        focus_or_combo: Focus key or combo text
        
    Returns:
        Rubric text to append to prompt
    """
    # Check if it's a combo
    combo = parse_combo(focus_or_combo)
    if combo:
        focusA, focusB, weightA = combo
        return merge_rubrics(focusA, focusB, weightA)
    
    # Single focus
    normalized_focus = normalize_focus(focus_or_combo)
    return RUBRICS.get(normalized_focus, "")


def merge_rubrics(focusA: str, focusB: str, weightA: float = 0.5) -> str:
    """
    Merge rubrics for combo focus.
    
    Args:
        focusA: First focus
        focusB: Second focus
        weightA: Weight for focus A
        
    Returns:
        Merged rubric text
    """
    rubricA = RUBRICS.get(focusA, f"{focusA.title()} focus")
    rubricB = RUBRICS.get(focusB, f"{focusB.title()} focus")
    
    percentage_A = int(weightA * 100)
    percentage_B = int((1 - weightA) * 100)
    
    merged = f"""{rubricA}

{rubricB}

Combo Rules:
- Allocate about {percentage_A}% sets to {focusA} and {percentage_B}% to {focusB}.
- Avoid conflicting patterns; keep accessory overlap minimal.
- Use ONLY exerciseIds from allowedExercises_focus[]."""
    
    return merged


def get_focus_priority_text(focus_or_combo: str) -> str:
    """Get priority guidance text for focus."""
    combo = parse_combo(focus_or_combo)
    if combo:
        focusA, focusB, weightA = combo
        return f"Primary focus: {focusA} ({int(weightA*100)}%), Secondary: {focusB} ({int((1-weightA)*100)}%)"
    
    normalized = normalize_focus(focus_or_combo)
    return f"Single focus: {normalized}"
