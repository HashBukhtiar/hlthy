"""
Focus Composer - Generate slot templates and compose focus-specific prompts with segment awareness
"""
from typing import Dict, List, Any, Optional, Tuple
from .focus_rules import (
    BASE_FOCI, VOLUME_BOUNDS, normalize_focus, parse_combo,
    get_muscle_families_for_focus
)
from .exercise_database import CANONICAL_EXERCISES


def compose_segment_aware_plan(focus_intent: Dict, whitelist: List[str], user_context: Dict, slot_template: Dict = None) -> Dict:
    """
    Compose a workout plan with proper warm-up and cool-down segments
    
    Returns plan with three segments: warmup, main, cooldown
    """
    from focus_whitelist import build_warmup_pool, build_cooldown_pool
    
    # Get separate pools for segments
    warmup_pool = build_warmup_pool(user_context, focus_intent)
    cooldown_pool = build_cooldown_pool(user_context, focus_intent)
    
    # Compose warm-up segment (1 cardio + 1-2 activation)
    warmup_segment = []
    
    # Add one cardio warmup
    cardio_exercises = [ex_id for ex_id in warmup_pool 
                       if CANONICAL_EXERCISES.get(ex_id) and 
                       CANONICAL_EXERCISES[ex_id].isCardioWarmup]
    
    if cardio_exercises:
        selected_cardio = cardio_exercises[0]  # Pick first available
        warmup_segment.append({
            'exercise_id': selected_cardio,
            'sets': 1,
            'reps': '3-5 min',
            'segment': 'warmup',
            'role': 'cardio'
        })
    
    # Add 1-2 activation exercises relevant to focus
    activation_exercises = [ex_id for ex_id in warmup_pool 
                          if CANONICAL_EXERCISES.get(ex_id) and 
                          CANONICAL_EXERCISES[ex_id].isActivation]
    
    # Filter activation by focus relevance
    focus_relevant_activation = []
    focus_type = focus_intent.get('detected_type', '')
    
    for ex_id in activation_exercises:
        exercise = CANONICAL_EXERCISES[ex_id]
        # Check if muscles align with focus
        if focus_type in ['chest', 'push'] and any(
            m in ['chest_activation', 'serratus', 'rotator_cuff', 'chest', 'triceps'] 
            for m in exercise.primary_muscles
        ):
            focus_relevant_activation.append(ex_id)
        elif focus_type in ['back', 'pull'] and any(
            m in ['lats', 'lower_traps', 'rear_delts', 'rhomboids', 'traps']
            for m in exercise.primary_muscles
        ):
            focus_relevant_activation.append(ex_id)
        elif focus_type in ['legs', 'lower'] and any(
            m in ['glutes', 'hip_stabilizers', 'adductors', 'tibialis', 'calves', 'hamstrings']
            for m in exercise.primary_muscles
        ):
            focus_relevant_activation.append(ex_id)
    
    # Select 1-2 activation exercises
    for i, ex_id in enumerate(focus_relevant_activation[:2]):
        warmup_segment.append({
            'exercise_id': ex_id,
            'sets': 1 if i == 0 else 2,
            'reps': '10-15',
            'segment': 'warmup',
            'role': 'activation'
        })
    
    # Compose main segment using existing logic
    main_segment = compose_workout_plan(focus_intent, whitelist, user_context, slot_template)
    for exercise in main_segment:
        exercise['segment'] = 'main'
    
    # Compose cool-down segment (1-2 mobility/stretch)
    cooldown_segment = []
    
    # Get mobility/stretch exercises
    cooldown_exercises = [ex_id for ex_id in cooldown_pool 
                         if CANONICAL_EXERCISES.get(ex_id) and 
                         (CANONICAL_EXERCISES[ex_id].isMobility or 
                          CANONICAL_EXERCISES[ex_id].isStretch)]
    
    # Prioritize exercises targeting prime movers from main workout
    main_muscles = set()
    for exercise in main_segment:
        if exercise.get('exercise_id') in CANONICAL_EXERCISES:
            main_muscles.update(CANONICAL_EXERCISES[exercise['exercise_id']].primary_muscles)
    
    # Find cool-down exercises targeting same or antagonist muscles
    relevant_cooldown = []
    for ex_id in cooldown_exercises:
        exercise = CANONICAL_EXERCISES[ex_id]
        muscle_overlap = any(m in main_muscles for m in exercise.primary_muscles)
        if muscle_overlap:
            relevant_cooldown.append(ex_id)
    
    # If not enough relevant, use any available
    if len(relevant_cooldown) < 2:
        relevant_cooldown.extend([ex for ex in cooldown_exercises 
                                 if ex not in relevant_cooldown])
    
    # Select 1-2 cooldown exercises
    for i, ex_id in enumerate(relevant_cooldown[:2]):
        cooldown_segment.append({
            'exercise_id': ex_id,
            'sets': 1,
            'reps': '30-60 sec' if CANONICAL_EXERCISES[ex_id].isStretch else '10-15',
            'segment': 'cooldown',
            'role': 'mobility' if CANONICAL_EXERCISES[ex_id].isMobility else 'stretch'
        })
    
    # Ensure no duplication between segments
    warmup_ids = {ex['exercise_id'] for ex in warmup_segment}
    cooldown_ids = {ex['exercise_id'] for ex in cooldown_segment}
    main_ids = {ex['exercise_id'] for ex in main_segment}
    
    # Remove any duplicates
    if warmup_ids & cooldown_ids:
        # Remove from cooldown
        cooldown_segment = [ex for ex in cooldown_segment 
                           if ex['exercise_id'] not in warmup_ids]
    
    # Combine all segments
    complete_plan = {
        'warmup': warmup_segment,
        'main': main_segment,
        'cooldown': cooldown_segment,
        'metadata': {
            'focus': focus_intent.get('detected_type', 'unknown'),
            'total_sets': len(warmup_segment) + sum(ex.get('sets', 3) for ex in main_segment) + len(cooldown_segment),
            'segment_aware': True
        }
    }
    
    return complete_plan

def compose_workout_plan(focus_intent: Dict, whitelist: List[str], user_context: Dict, slot_template: Dict = None) -> List[Dict]:
    """
    Compose main workout segment using existing logic
    """
    # Simplified main workout composition
    main_exercises = []
    
    # Use slot template if available
    if slot_template and 'patterns' in slot_template:
        for pattern in slot_template['patterns'][:4]:  # Limit to 4 exercises
            pattern_exercises = [e for e in whitelist if _matches_pattern(e, pattern)]
            if pattern_exercises:
                chosen = pattern_exercises[0]
                main_exercises.append({
                    'exercise_id': chosen,
                    'sets': 4,
                    'reps': '8-12',
                    'role': 'primary'
                })
    else:
        # Fallback: use first 3-4 exercises from whitelist
        for ex_id in whitelist[:4]:
            main_exercises.append({
                'exercise_id': ex_id,
                'sets': 3,
                'reps': '8-12',
                'role': 'primary'
            })
    
    return main_exercises

def _matches_pattern(exercise_id: str, pattern: str) -> bool:
    """Check if exercise matches movement pattern(s)."""
    exercise = CANONICAL_EXERCISES.get(exercise_id)
    if not exercise:
        return False
    
    # Split pattern by | and check each one
    pattern_options = [p.strip() for p in pattern.split('|')]
    
    # Check if any pattern option matches the exercise's movement_patterns
    for pattern_option in pattern_options:
        if pattern_option in exercise.movement_patterns:
            return True
    
    return False


def get_slot_template_for_focus(focus: str) -> List[Dict[str, Any]]:
    """
    Get slot template for focus to guide exercise selection.
    
    Returns list of slots with pattern, sets, and optional flag.
    """
    templates = {
        "chest": [
            {"slot": "A", "pattern": "horizontal_press", "sets": [3, 4]},
            {"slot": "B", "pattern": "incline_press|horizontal_press", "sets": [3, 4]},
            {"slot": "C", "pattern": "fly", "sets": [3, 4]},
            {"slot": "D", "pattern": "triceps", "sets": [0, 3], "optional": True}
        ],
        "shoulders": [
            {"slot": "A", "pattern": "vertical_press", "sets": [3, 4]},
            {"slot": "B", "pattern": "lateral_delt", "sets": [3, 4]},
            {"slot": "C", "pattern": "rear_delt", "sets": [3, 4]},
            {"slot": "D", "pattern": "front_delt", "sets": [0, 3], "optional": True}
        ],
        "back": [
            {"slot": "A", "pattern": "vertical_pull", "sets": [3, 5]},
            {"slot": "B", "pattern": "horizontal_pull|row", "sets": [3, 5]},
            {"slot": "C", "pattern": "pullover|rear_delt", "sets": [0, 3], "optional": True}
        ],
        "lats": [
            {"slot": "A", "pattern": "vertical_pull", "sets": [3, 5]},
            {"slot": "B", "pattern": "row", "sets": [3, 4]},
            {"slot": "C", "pattern": "pullover", "sets": [0, 3], "optional": True}
        ],
        "upper_back": [
            {"slot": "A", "pattern": "row", "sets": [3, 5]},
            {"slot": "B", "pattern": "horizontal_pull", "sets": [3, 4]},
            {"slot": "C", "pattern": "rear_delt", "sets": [3, 4]}
        ],
        "quads": [
            {"slot": "A", "pattern": "squat|leg_press", "sets": [3, 5]},
            {"slot": "B", "pattern": "quad_iso", "sets": [3, 4]},
            {"slot": "C", "pattern": "lunge", "sets": [0, 3], "optional": True}
        ],
        "hamstrings": [
            {"slot": "A", "pattern": "hinge", "sets": [4, 6]},
            {"slot": "B", "pattern": "ham_iso", "sets": [4, 6]},
            {"slot": "C", "pattern": "lunge|squat", "sets": [0, 3], "optional": True},
            {"slot": "D", "pattern": "calf", "sets": [0, 3], "optional": True}
        ],
        "glutes": [
            {"slot": "A", "pattern": "hinge", "sets": [4, 6]},
            {"slot": "B", "pattern": "glute_iso", "sets": [3, 4]},
            {"slot": "C", "pattern": "lunge", "sets": [0, 3], "optional": True}
        ],
        "calves": [
            {"slot": "A", "pattern": "calf", "sets": [4, 6]},
            {"slot": "B", "pattern": "calf", "sets": [3, 4]}
        ],
        "biceps": [
            {"slot": "A", "pattern": "biceps", "sets": [3, 4]},
            {"slot": "B", "pattern": "biceps", "sets": [3, 4]}
        ],
        "triceps": [
            {"slot": "A", "pattern": "triceps", "sets": [3, 4]},
            {"slot": "B", "pattern": "triceps", "sets": [3, 4]}
        ],
        "arms": [
            {"slot": "A", "pattern": "biceps", "sets": [3, 4]},
            {"slot": "B", "pattern": "triceps", "sets": [3, 4]},
            {"slot": "C", "pattern": "biceps", "sets": [2, 3]},
            {"slot": "D", "pattern": "triceps", "sets": [2, 3]}
        ],
        "core": [
            {"slot": "A", "pattern": "core_anti_extension", "sets": [3, 4]},
            {"slot": "B", "pattern": "core_anti_rotation", "sets": [3, 4]},
            {"slot": "C", "pattern": "core_flexion", "sets": [0, 3], "optional": True}
        ],
        "push": [
            {"slot": "A", "pattern": "horizontal_press", "sets": [3, 4]},
            {"slot": "B", "pattern": "incline_press|vertical_press", "sets": [3, 4]},
            {"slot": "C", "pattern": "lateral_delt", "sets": [3, 4]},
            {"slot": "D", "pattern": "triceps", "sets": [0, 3], "optional": True}
        ],
        "pull": [
            {"slot": "A", "pattern": "vertical_pull", "sets": [3, 4]},
            {"slot": "B", "pattern": "horizontal_pull|row", "sets": [3, 4]},
            {"slot": "C", "pattern": "rear_delt", "sets": [3, 4]},
            {"slot": "D", "pattern": "biceps", "sets": [0, 3], "optional": True}
        ],
        "legs": [
            {"slot": "A", "pattern": "squat|leg_press", "sets": [3, 5]},
            {"slot": "B", "pattern": "hinge", "sets": [3, 5]},
            {"slot": "C", "pattern": "quad_iso|ham_iso", "sets": [3, 4]},
            {"slot": "D", "pattern": "lunge", "sets": [0, 3], "optional": True},
            {"slot": "E", "pattern": "calf", "sets": [0, 3], "optional": True}
        ],
        "upper": [
            {"slot": "A", "pattern": "horizontal_press|vertical_press", "sets": [3, 4]},
            {"slot": "B", "pattern": "vertical_pull|horizontal_pull|row", "sets": [3, 4]},
            {"slot": "C", "pattern": "lateral_delt|rear_delt", "sets": [3, 4]},
            {"slot": "D", "pattern": "biceps|triceps", "sets": [0, 3], "optional": True}
        ],
        "lower": [
            {"slot": "A", "pattern": "squat|leg_press", "sets": [3, 5]},
            {"slot": "B", "pattern": "hinge", "sets": [3, 5]},
            {"slot": "C", "pattern": "quad_iso|ham_iso|calf", "sets": [3, 4]}
        ],
        "posterior_chain": [
            {"slot": "A", "pattern": "hinge", "sets": [4, 6]},
            {"slot": "B", "pattern": "ham_iso", "sets": [3, 4]},
            {"slot": "C", "pattern": "vertical_pull|horizontal_pull|row", "sets": [3, 4]},
            {"slot": "D", "pattern": "glute_iso", "sets": [0, 3], "optional": True}
        ],
        "back_biceps": [
            {"slot": "A", "pattern": "vertical_pull", "sets": [3, 4]},
            {"slot": "B", "pattern": "horizontal_pull|row", "sets": [3, 4]},
            {"slot": "C", "pattern": "biceps", "sets": [2, 4]}
        ],
        "chest_triceps": [
            {"slot": "A", "pattern": "horizontal_press", "sets": [3, 4]},
            {"slot": "B", "pattern": "incline_press|horizontal_press", "sets": [3, 4]},
            {"slot": "C", "pattern": "triceps|fly", "sets": [2, 4]}
        ],
        "shoulders_triceps": [
            {"slot": "A", "pattern": "vertical_press", "sets": [3, 4]},
            {"slot": "B", "pattern": "lateral_delt", "sets": [3, 4]},
            {"slot": "C", "pattern": "triceps|rear_delt", "sets": [2, 4]}
        ],
        "glutes_hamstrings": [
            {"slot": "A", "pattern": "hinge", "sets": [4, 6]},
            {"slot": "B", "pattern": "ham_iso", "sets": [3, 4]},
            {"slot": "C", "pattern": "glute_iso", "sets": [2, 3]}
        ],
        "quads_calves": [
            {"slot": "A", "pattern": "squat|leg_press", "sets": [3, 5]},
            {"slot": "B", "pattern": "quad_iso", "sets": [3, 4]},
            {"slot": "C", "pattern": "calf", "sets": [2, 4]}
        ],
        "full_body": [
            {"slot": "A", "pattern": "squat|hinge", "sets": [3, 4]},
            {"slot": "B", "pattern": "horizontal_press|vertical_press", "sets": [3, 4]},
            {"slot": "C", "pattern": "vertical_pull|horizontal_pull|row", "sets": [3, 4]},
            {"slot": "D", "pattern": "core_anti_extension|core_anti_rotation|glute_iso|lateral_delt", "sets": [0, 3], "optional": True}
        ]
    }
    
    return templates.get(focus, [])


def compose_slot_template_text(slots: List[Dict[str, Any]]) -> str:
    """Convert slot template to text format for prompt."""
    if not slots:
        return ""
    
    lines = ["Slot Structure Hint (flexible guidance):"]
    for slot in slots:
        slot_id = slot['slot']
        pattern = slot['pattern']
        sets_range = slot['sets']
        optional = slot.get('optional', False)
        
        optional_text = " (optional)" if optional else " (required)"
        sets_text = f"{sets_range[0]}-{sets_range[1]} sets"
        
        lines.append(f"  {slot_id}: {pattern} - {sets_text}{optional_text}")
    
    return "\n".join(lines)


def merge_slot_templates(
    slotsA: List[Dict[str, Any]], 
    slotsB: List[Dict[str, Any]], 
    weightA: float
) -> List[Dict[str, Any]]:
    """
    Merge two slot templates for combo focus.
    
    Args:
        slotsA: Slots for focus A
        slotsB: Slots for focus B
        weightA: Weight for focus A (0.0-1.0)
        
    Returns:
        Merged slot template
    """
    # Determine how many slots from each
    total_slots = min(len(slotsA) + len(slotsB), 6)  # Cap at 6 slots
    slots_from_A = int(total_slots * weightA)
    slots_from_B = total_slots - slots_from_A
    
    # Take required slots first, then optional
    merged = []
    
    # Add slots from A
    required_A = [s for s in slotsA if not s.get('optional', False)]
    optional_A = [s for s in slotsA if s.get('optional', False)]
    
    added_from_A = 0
    for slot in required_A[:slots_from_A]:
        merged.append({**slot, 'slot': chr(65 + len(merged))})  # A, B, C, ...
        added_from_A += 1
    
    for slot in optional_A[:slots_from_A - added_from_A]:
        merged.append({**slot, 'slot': chr(65 + len(merged))})
        added_from_A += 1
    
    # Add slots from B
    required_B = [s for s in slotsB if not s.get('optional', False)]
    optional_B = [s for s in slotsB if s.get('optional', False)]
    
    added_from_B = 0
    for slot in required_B[:slots_from_B]:
        merged.append({**slot, 'slot': chr(65 + len(merged))})
        added_from_B += 1
    
    for slot in optional_B[:slots_from_B - added_from_B]:
        merged.append({**slot, 'slot': chr(65 + len(merged))})
        added_from_B += 1
    
    return merged


def get_volume_bounds_for_focus(focus: str) -> Tuple[int, int]:
    """Get volume bounds for focus."""
    return VOLUME_BOUNDS.get(focus, (10, 16))


def interpolate_volume_bounds(focusA: str, focusB: str, weightA: float) -> Tuple[int, int]:
    """Interpolate volume bounds for combo focus."""
    boundsA = get_volume_bounds_for_focus(focusA)
    boundsB = get_volume_bounds_for_focus(focusB)
    
    min_sets = int(boundsA[0] * weightA + boundsB[0] * (1 - weightA))
    max_sets = int(boundsA[1] * weightA + boundsB[1] * (1 - weightA))
    
    return (min_sets, max_sets)
