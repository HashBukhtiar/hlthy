"""
Focus Composer - Generate slot templates and compose focus-specific prompts
"""
from typing import Dict, List, Any, Optional, Tuple
from .focus_rules import (
    BASE_FOCI, VOLUME_BOUNDS, normalize_focus, parse_combo,
    get_muscle_families_for_focus
)


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
