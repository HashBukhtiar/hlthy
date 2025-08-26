"""
Focus Rules - Movement patterns, muscle families, and focus taxonomy for Focus Planner
"""
from typing import Dict, List, Optional, Tuple
import re

# Core movement patterns and muscle families
MOVEMENT_PATTERNS = [
    'horizontal_press', 'incline_press', 'vertical_press', 'fly',
    'vertical_pull', 'horizontal_pull', 'row', 'pullover',
    'squat', 'leg_press', 'hinge', 'lunge',
    'quad_iso', 'ham_iso', 'glute_iso', 'calf',
    'lateral_delt', 'front_delt', 'rear_delt',
    'biceps', 'triceps',
    'core_anti_extension', 'core_rotation', 'core_anti_rotation', 'core_flexion'
]

MUSCLE_FAMILIES = [
    'chest', 'front_delts', 'lateral_delts', 'rear_delts',
    'lats', 'upper_back', 'traps',
    'quads', 'hamstrings', 'glutes', 'calves',
    'biceps', 'triceps', 'core'
]

# Focus taxonomy
BASE_FOCI = [
    'chest', 'shoulders', 'back', 'lats', 'upper_back',
    'quads', 'hamstrings', 'glutes', 'calves',
    'arms', 'biceps', 'triceps',
    'core',
    'push', 'pull', 'legs',
    'upper', 'lower',
    'back_biceps', 'chest_triceps', 'shoulders_triceps',
    'glutes_hamstrings', 'quads_calves',
    'posterior_chain',
    'full_body'
]

FOCUS_ALIASES = {
    'pecs': 'chest',
    'bench': 'chest',
    'delts': 'shoulders',
    'posterior': 'posterior_chain',
    'posterior chain': 'posterior_chain',
    'upper body': 'upper',
    'lower body': 'lower',
    'back and bis': 'back_biceps',
    'chest and tris': 'chest_triceps',
    'glutes and hams': 'glutes_hamstrings',
    'quads and calves': 'quads_calves',
    'fullbody': 'full_body',
    'total body': 'full_body'
}

# Volume bounds per focus (working sets per session)
VOLUME_BOUNDS = {
    "chest": (10, 16),
    "shoulders": (10, 16),
    "back": (12, 20),
    "lats": (10, 16),
    "upper_back": (10, 16),
    "quads": (8, 14),
    "hamstrings": (10, 16),
    "glutes": (10, 16),
    "calves": (6, 12),
    "arms": (10, 16),
    "biceps": (6, 12),
    "triceps": (6, 12),
    "core": (6, 12),
    "push": (16, 28),
    "pull": (16, 28),
    "legs": (16, 26),
    "upper": (16, 26),
    "lower": (16, 26),
    "posterior_chain": (16, 26),
    "back_biceps": (16, 26),
    "chest_triceps": (16, 26),
    "shoulders_triceps": (16, 26),
    "glutes_hamstrings": (16, 26),
    "quads_calves": (14, 22),
    "full_body": (10, 16)
}

# Proportion rules (muscle_family, min_fraction_of_total_sets)
PROPORTION_RULES = {
    "chest": ("chest", 0.70),
    "hamstrings": ("hamstrings", 0.60),
    "glutes": ("glutes", 0.60),
    "quads": ("quads", 0.60),
    "shoulders": ("lateral_delts", 0.40),
    "back": ("back", 0.70),
    "back_biceps": ("back", 0.60),
    "chest_triceps": ("chest", 0.60),
    "glutes_hamstrings": ("posterior_lower", 0.70),
    "full_body": None
}


def normalize_focus(focus_text: str) -> str:
    """Normalize focus text to canonical focus key."""
    focus_clean = focus_text.lower().strip()
    return FOCUS_ALIASES.get(focus_clean, focus_clean)


def parse_combo(text: str) -> Optional[Tuple[str, str, float]]:
    """
    Parse combo focus from text.
    Returns (focusA, focusB, weight_for_A) or None.
    
    Examples:
    - "hamstrings-focused back day" -> ('hamstrings', 'back', 0.6)
    - "back and biceps" -> ('back', 'biceps', 0.5)
    """
    text_lower = text.lower().strip()
    
    # Check for "-focused" pattern
    focused_match = re.search(r'(\w+)-focused\s+(\w+)', text_lower)
    if focused_match:
        focus_a = normalize_focus(focused_match.group(1))
        focus_b = normalize_focus(focused_match.group(2))
        if focus_a in BASE_FOCI and focus_b in BASE_FOCI:
            return (focus_a, focus_b, 0.6)
    
    # Check for "and" pattern
    and_match = re.search(r'(\w+)\s+and\s+(\w+)', text_lower)
    if and_match:
        focus_a = normalize_focus(and_match.group(1))
        focus_b = normalize_focus(and_match.group(2))
        if focus_a in BASE_FOCI and focus_b in BASE_FOCI:
            return (focus_a, focus_b, 0.5)
    
    # Check for "+" pattern
    plus_match = re.search(r'(\w+)\+(\w+)', text_lower)
    if plus_match:
        focus_a = normalize_focus(plus_match.group(1))
        focus_b = normalize_focus(plus_match.group(2))
        if focus_a in BASE_FOCI and focus_b in BASE_FOCI:
            return (focus_a, focus_b, 0.5)
    
    # Check for known combo patterns
    normalized = normalize_focus(text_lower)
    if normalized in ['back_biceps', 'chest_triceps', 'shoulders_triceps', 
                      'glutes_hamstrings', 'quads_calves']:
        parts = normalized.split('_')
        return (parts[0], parts[1], 0.5)
    
    return None


def is_valid_focus(focus: str) -> bool:
    """Check if focus is valid (including after normalization)."""
    normalized = normalize_focus(focus)
    return normalized in BASE_FOCI


def get_muscle_families_for_focus(focus: str) -> List[str]:
    """Get primary muscle families for a focus."""
    focus_to_muscles = {
        'chest': ['chest'],
        'shoulders': ['lateral_delts', 'front_delts', 'rear_delts'],
        'back': ['lats', 'upper_back'],
        'lats': ['lats'],
        'upper_back': ['upper_back'],
        'quads': ['quads'],
        'hamstrings': ['hamstrings'],
        'glutes': ['glutes'],
        'calves': ['calves'],
        'biceps': ['biceps'],
        'triceps': ['triceps'],
        'arms': ['biceps', 'triceps'],
        'core': ['core'],
        'push': ['chest', 'lateral_delts', 'front_delts', 'triceps'],
        'pull': ['lats', 'upper_back', 'rear_delts', 'biceps'],
        'legs': ['quads', 'hamstrings', 'glutes', 'calves'],
        'upper': ['chest', 'lats', 'upper_back', 'lateral_delts', 'biceps', 'triceps'],
        'lower': ['quads', 'hamstrings', 'glutes', 'calves'],
        'posterior_chain': ['hamstrings', 'glutes', 'lats', 'upper_back'],
        'back_biceps': ['lats', 'upper_back', 'biceps'],
        'chest_triceps': ['chest', 'triceps'],
        'shoulders_triceps': ['lateral_delts', 'front_delts', 'rear_delts', 'triceps'],
        'glutes_hamstrings': ['glutes', 'hamstrings'],
        'quads_calves': ['quads', 'calves'],
        'full_body': ['chest', 'lats', 'upper_back', 'quads', 'hamstrings', 'glutes']
    }
    
    return focus_to_muscles.get(focus, [])
