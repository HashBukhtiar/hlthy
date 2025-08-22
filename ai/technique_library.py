"""
Technique Cues and Substitutions Library
Provides versioned, consistent technique guidance and exercise substitutions
"""

from typing import Dict, List, Set
from dataclasses import dataclass
from exercise_database import InjuryType, CANONICAL_EXERCISES

@dataclass
class TechniqueCue:
    exercise_id: str
    cue: str
    focus_area: str  # "setup", "execution", "safety", "common_mistake"
    injury_specific: Set[InjuryType] = None

@dataclass
class SubstitutionGuide:
    original_exercise_id: str
    substitute_exercise_id: str
    reason: str
    injury_type: InjuryType
    difficulty_modifier: str  # "easier", "same", "harder"

# Technique Cues Library - organized by exercise ID
TECHNIQUE_CUES: Dict[str, List[TechniqueCue]] = {
    "barbell_bench_press": [
        TechniqueCue("barbell_bench_press", "Retract and depress shoulder blades throughout the movement", "setup"),
        TechniqueCue("barbell_bench_press", "Lower the bar with control to chest, pause briefly", "execution"),
        TechniqueCue("barbell_bench_press", "Keep wrists straight and aligned with forearms", "safety", {InjuryType.WRIST}),
        TechniqueCue("barbell_bench_press", "Avoid flaring elbows too wide - 45-degree angle optimal", "safety", {InjuryType.SHOULDER}),
        TechniqueCue("barbell_bench_press", "Keep feet firmly planted on ground throughout", "setup")
    ],
    
    "deadlift": [
        TechniqueCue("deadlift", "Hip hinge first - push hips back before bending knees", "execution"),
        TechniqueCue("deadlift", "Keep bar close to body throughout entire range of motion", "execution"),
        TechniqueCue("deadlift", "Neutral spine - avoid rounding lower back", "safety", {InjuryType.LOWER_BACK}),
        TechniqueCue("deadlift", "Engage lats by 'pulling' bar into your legs", "execution"),
        TechniqueCue("deadlift", "Drive through heels and squeeze glutes at top", "execution")
    ],
    
    "back_squat": [
        TechniqueCue("back_squat", "Brace core before descending - big breath and hold", "safety"),
        TechniqueCue("back_squat", "Knees track over toes throughout movement", "execution", {InjuryType.KNEE}),
        TechniqueCue("back_squat", "Descend until hip crease below knee cap", "execution"),
        TechniqueCue("back_squat", "Chest up, eyes forward - avoid looking down", "setup"),
        TechniqueCue("back_squat", "Drive through whole foot, not just heels", "execution")
    ],
    
    "overhead_press": [
        TechniqueCue("overhead_press", "Start with bar at shoulder height, elbows slightly forward", "setup"),
        TechniqueCue("overhead_press", "Press straight up, bring head through at top", "execution"),
        TechniqueCue("overhead_press", "Avoid pressing behind neck plane", "safety", {InjuryType.SHOULDER}),
        TechniqueCue("overhead_press", "Engage glutes to prevent back extension", "safety", {InjuryType.LOWER_BACK}),
        TechniqueCue("overhead_press", "Full lockout overhead with biceps by ears", "execution")
    ],
    
    "pull_ups": [
        TechniqueCue("pull_ups", "Full hang at bottom - arms completely extended", "execution"),
        TechniqueCue("pull_ups", "Pull shoulder blades down and back first", "execution"),
        TechniqueCue("pull_ups", "Chin over bar, then control descent", "execution"),
        TechniqueCue("pull_ups", "Avoid kipping or swinging", "safety"),
        TechniqueCue("pull_ups", "Engage core to prevent excessive arch", "execution")
    ]
}

# Injury-specific substitution guides
INJURY_SUBSTITUTIONS: Dict[InjuryType, List[SubstitutionGuide]] = {
    InjuryType.SHOULDER: [
        SubstitutionGuide("barbell_bench_press", "dumbbell_bench_press", 
                         "Dumbbells allow more natural movement path and reduced shoulder stress", 
                         InjuryType.SHOULDER, "easier"),
        SubstitutionGuide("overhead_press", "dumbbell_shoulder_press", 
                         "Unilateral loading reduces impingement risk", 
                         InjuryType.SHOULDER, "easier"),
        SubstitutionGuide("upright_rows", "face_pulls", 
                         "Face pulls improve posterior chain without impingement", 
                         InjuryType.SHOULDER, "easier"),
        SubstitutionGuide("behind_neck_press", "dumbbell_shoulder_press", 
                         "Behind-neck pressing causes impingement and cervical stress", 
                         InjuryType.SHOULDER, "much_easier")
    ],
    
    InjuryType.LOWER_BACK: [
        SubstitutionGuide("deadlift", "romanian_deadlift_dumbbell", 
                         "Reduced spinal loading with lighter weight and controlled ROM", 
                         InjuryType.LOWER_BACK, "easier"),
        SubstitutionGuide("back_squat", "goblet_squat", 
                         "Front-loaded position promotes upright torso", 
                         InjuryType.LOWER_BACK, "easier"),
        SubstitutionGuide("barbell_row", "chest_supported_row_machine", 
                         "Eliminates spinal loading while maintaining pulling pattern", 
                         InjuryType.LOWER_BACK, "easier"),
        SubstitutionGuide("overhead_press", "seated_dumbbell_press", 
                         "Seated position reduces lower back involvement", 
                         InjuryType.LOWER_BACK, "easier")
    ],
    
    InjuryType.KNEE: [
        SubstitutionGuide("back_squat", "leg_press", 
                         "Machine-guided movement reduces knee shear forces", 
                         InjuryType.KNEE, "easier"),
        SubstitutionGuide("leg_extension", "split_squat", 
                         "Compound movement with more natural knee tracking", 
                         InjuryType.KNEE, "same"),
        SubstitutionGuide("hack_squat", "leg_press", 
                         "More controlled knee angle with machine support", 
                         InjuryType.KNEE, "easier")
    ],
    
    InjuryType.ELBOW: [
        SubstitutionGuide("close_grip_bench_press", "dips_assisted", 
                         "Reduced elbow stress with assisted bodyweight movement", 
                         InjuryType.ELBOW, "easier"),
        SubstitutionGuide("tricep_extensions", "tricep_pushdown", 
                         "Cable provides accommodating resistance and joint-friendly loading", 
                         InjuryType.ELBOW, "easier"),
        SubstitutionGuide("bicep_curls", "hammer_curls", 
                         "Neutral grip reduces elbow stress", 
                         InjuryType.ELBOW, "easier")
    ],
    
    InjuryType.WRIST: [
        SubstitutionGuide("barbell_bench_press", "dumbbell_bench_press", 
                         "Natural wrist position without forced pronation", 
                         InjuryType.WRIST, "easier"),
        SubstitutionGuide("push_ups", "push_ups_on_handles", 
                         "Neutral wrist position reduces compression forces", 
                         InjuryType.WRIST, "easier")
    ]
}

def get_technique_cues_for_exercise(exercise_id: str, injury_types: List[str] = None) -> List[str]:
    """Get relevant technique cues for an exercise, filtered by injury concerns"""
    if exercise_id not in TECHNIQUE_CUES:
        return []
    
    all_cues = TECHNIQUE_CUES[exercise_id]
    relevant_cues = []
    
    # Convert injury strings to InjuryType enums
    user_injuries = set()
    if injury_types:
        for injury_str in injury_types:
            try:
                user_injuries.add(InjuryType(injury_str.lower()))
            except ValueError:
                continue
    
    # Filter cues by relevance
    for cue in all_cues:
        # Always include general cues
        if not cue.injury_specific:
            relevant_cues.append(cue.cue)
        # Include injury-specific cues if user has that injury
        elif cue.injury_specific.intersection(user_injuries):
            relevant_cues.append(f"⚠️ {cue.cue}")
    
    return relevant_cues[:5]  # Top 5 most relevant

def get_substitutions_for_injury(exercise_id: str, injury_types: List[str]) -> List[Dict[str, str]]:
    """Get exercise substitutions for specific injuries"""
    substitutions = []
    
    # Convert injury strings to InjuryType enums
    user_injuries = set()
    if injury_types:
        for injury_str in injury_types:
            try:
                user_injuries.add(InjuryType(injury_str.lower()))
            except ValueError:
                continue
    
    # Find substitutions for each injury type
    for injury_type in user_injuries:
        if injury_type in INJURY_SUBSTITUTIONS:
            for sub_guide in INJURY_SUBSTITUTIONS[injury_type]:
                if sub_guide.original_exercise_id == exercise_id:
                    # Verify substitute exists in canonical database
                    if sub_guide.substitute_exercise_id in CANONICAL_EXERCISES:
                        canonical_sub = CANONICAL_EXERCISES[sub_guide.substitute_exercise_id]
                        substitutions.append({
                            "substitute_id": sub_guide.substitute_exercise_id,
                            "substitute_name": canonical_sub.display_name,
                            "reason": sub_guide.reason,
                            "difficulty": sub_guide.difficulty_modifier
                        })
    
    return substitutions[:3]  # Top 3 substitutions

def get_compact_technique_response(exercise_id: str, injury_types: List[str] = None) -> Dict[str, any]:
    """Get compact technique guidance for token-efficient responses"""
    cues = get_technique_cues_for_exercise(exercise_id, injury_types)
    substitutions = get_substitutions_for_injury(exercise_id, injury_types)
    
    return {
        "exercise_id": exercise_id,
        "exercise_name": CANONICAL_EXERCISES.get(exercise_id, {}).display_name if exercise_id in CANONICAL_EXERCISES else "Unknown",
        "technique_cues": cues,
        "safe_substitutions": substitutions,
        "token_count": len(" ".join(cues)) + sum(len(s["reason"]) for s in substitutions)  # Rough token estimate
    }
