"""
Focus Whitelist - Build focus-specific exercise whitelists from exercise database
"""
from typing import List, Dict, Any, Optional, Set
from .focus_rules import (
    BASE_FOCI, get_muscle_families_for_focus, parse_combo,
    MOVEMENT_PATTERNS, normalize_focus
)

try:
    from .exercise_database import get_exercises_by_filters, CANONICAL_EXERCISES
except ImportError:
    # Fallback for testing
    def get_exercises_by_filters(*args, **kwargs):
        return ['barbell_bench_press', 'dumbbell_bench_press', 'push_ups']
    CANONICAL_EXERCISES = {}

try:
    from .exercise_database import get_exercise_data
except ImportError:
    # Fallback for testing
    def get_exercise_data(*args, **kwargs):
        return {
            'name': 'Mock Exercise',
            'movement_patterns': ['horizontal_press'],
            'muscle_families': ['chest']
        }

try:
    from exercise_whitelist_cache import get_cached_whitelist, cache_whitelist
except ImportError:
    # Fallback for testing
    def get_cached_whitelist(*args, **kwargs):
        return None
    def cache_whitelist(*args, **kwargs):
        pass

import json


def build_warmup_pool(user_ctx: Dict[str, Any], focus_intent: Dict) -> List[str]:
    """
    Build pool of exercises suitable for warm-up based on focus.
    
    Returns exercises flagged for warm-up in the canonical database.
    """
    warmup_exercises = []
    
    # Get all exercises flagged for warm-up
    for exercise_id, exercise in CANONICAL_EXERCISES.items():
        # Include if suitable for warm-up
        if (exercise.isCardioWarmup or exercise.isActivation):
            # Check user constraints
            if _matches_user_constraints(exercise, user_ctx):
                warmup_exercises.append(exercise_id)
    
    # Prefer focus-relevant activation exercises
    focus_type = focus_intent.get('detected_type', '').lower()
    focus_relevant = []
    general_warmup = []
    
    for ex_id in warmup_exercises:
        exercise = CANONICAL_EXERCISES[ex_id]
        
        # Categorize by relevance to focus
        if _is_focus_relevant_warmup(exercise, focus_type):
            focus_relevant.append(ex_id)
        else:
            general_warmup.append(ex_id)
    
    # Return focus-relevant first, then general
    return focus_relevant + general_warmup


def build_cooldown_pool(user_ctx: Dict[str, Any], focus_intent: Dict) -> List[str]:
    """
    Build pool of exercises suitable for cool-down based on focus.
    
    Returns exercises flagged for cool-down in the canonical database.
    """
    cooldown_exercises = []
    
    # Get all exercises flagged for cool-down
    for exercise_id, exercise in CANONICAL_EXERCISES.items():
        # Include if suitable for cool-down
        if (exercise.isMobility or exercise.isStretch or exercise.isCooldownSafe):
            # Check user constraints
            if _matches_user_constraints(exercise, user_ctx):
                cooldown_exercises.append(exercise_id)
    
    # Prefer stretches/mobility targeting prime movers from focus
    focus_type = focus_intent.get('detected_type', '').lower()
    focus_relevant = []
    general_cooldown = []
    
    for ex_id in cooldown_exercises:
        exercise = CANONICAL_EXERCISES[ex_id]
        
        # Categorize by relevance to focus
        if _is_focus_relevant_cooldown(exercise, focus_type):
            focus_relevant.append(ex_id)
        else:
            general_cooldown.append(ex_id)
    
    # Return focus-relevant first, then general
    return focus_relevant + general_cooldown


def _matches_user_constraints(exercise, user_ctx: Dict[str, Any]) -> bool:
    """Check if exercise matches user equipment, injuries, etc."""
    # Check equipment availability
    user_equipment = set(user_ctx.get('equipment', []))
    exercise_equipment = set(exercise.equipment_required)
    
    if exercise_equipment and not exercise_equipment.issubset(user_equipment):
        return False
    
    # Check injury constraints
    user_injuries = set(user_ctx.get('injuries', []))
    exercise_risks = set(exercise.injury_contraindications)
    
    if user_injuries.intersection(exercise_risks):
        return False
    
    # Check experience level
    user_exp = user_ctx.get('experience', 'intermediate')
    exp_levels = {'beginner': 1, 'intermediate': 2, 'advanced': 3}
    
    user_level = exp_levels.get(user_exp, 2)
    required_level = exp_levels.get(exercise.min_experience_level.value, 1)
    
    if user_level < required_level:
        return False
    
    return True


def _is_focus_relevant_warmup(exercise, focus_type: str) -> bool:
    """Check if warmup exercise is relevant to the workout focus."""
    if not exercise.isActivation:
        return True  # Cardio warmups are always relevant
    
    focus_muscle_map = {
        'chest': ['chest', 'serratus', 'rotator_cuff', 'triceps'],
        'push': ['chest', 'serratus', 'rotator_cuff', 'triceps', 'front_delts'],
        'back': ['lats', 'lower_traps', 'rear_delts', 'rhomboids', 'traps'],
        'pull': ['lats', 'lower_traps', 'rear_delts', 'rhomboids', 'traps', 'biceps'],
        'shoulders': ['rotator_cuff', 'rear_delts', 'front_delts', 'side_delts'],
        'legs': ['glutes', 'hip_stabilizers', 'adductors', 'tibialis', 'calves'],
        'lower': ['glutes', 'hip_stabilizers', 'adductors', 'tibialis', 'calves'],
        'arms': ['triceps', 'biceps', 'forearms'],
        'core': ['core', 'lower_back', 'hip_stabilizers']
    }
    
    target_muscles = focus_muscle_map.get(focus_type, [])
    exercise_muscles = exercise.primary_muscles  # Only use primary muscles
    
    return any(muscle in target_muscles for muscle in exercise_muscles)


def _is_focus_relevant_cooldown(exercise, focus_type: str) -> bool:
    """Check if cooldown exercise is relevant to the workout focus."""
    focus_muscle_map = {
        'chest': ['chest', 'triceps', 'front_delts'],
        'push': ['chest', 'triceps', 'front_delts', 'side_delts'],
        'back': ['lats', 'traps', 'rhomboids', 'rear_delts'],
        'pull': ['lats', 'traps', 'rhomboids', 'rear_delts', 'biceps'],
        'shoulders': ['front_delts', 'side_delts', 'rear_delts', 'traps'],
        'legs': ['quads', 'hamstrings', 'glutes', 'calves', 'hip_flexors'],
        'lower': ['quads', 'hamstrings', 'glutes', 'calves', 'hip_flexors'],
        'arms': ['triceps', 'biceps', 'forearms'],
        'core': ['core', 'hip_flexors', 'lower_back']
    }
    
    target_muscles = focus_muscle_map.get(focus_type, [])
    exercise_muscles = exercise.primary_muscles  # Only use primary muscles
    
    return any(muscle in target_muscles for muscle in exercise_muscles)


def get_required_patterns_for_focus(focus: str) -> List[str]:
    """Get required movement patterns for a focus."""
    pattern_map = {
        'chest': ['horizontal_press', 'fly'],
        'shoulders': ['vertical_press', 'lateral_delt', 'rear_delt'],
        'back': ['vertical_pull', 'horizontal_pull'],
        'lats': ['vertical_pull'],
        'upper_back': ['row', 'horizontal_pull'],
        'quads': ['squat', 'quad_iso'],
        'hamstrings': ['hinge', 'ham_iso'],
        'glutes': ['hinge', 'glute_iso'],
        'calves': ['calf'],
        'biceps': ['biceps'],
        'triceps': ['triceps'],
        'arms': ['biceps', 'triceps'],
        'core': ['core_anti_extension'],
        'push': ['horizontal_press', 'vertical_press', 'lateral_delt'],
        'pull': ['vertical_pull', 'horizontal_pull', 'rear_delt'],
        'legs': ['squat', 'hinge'],
        'upper': ['horizontal_press', 'vertical_pull'],
        'lower': ['squat', 'hinge'],
        'posterior_chain': ['hinge', 'ham_iso', 'vertical_pull'],
        'back_biceps': ['vertical_pull', 'horizontal_pull', 'biceps'],
        'chest_triceps': ['horizontal_press', 'triceps'],
        'shoulders_triceps': ['vertical_press', 'lateral_delt', 'triceps'],
        'glutes_hamstrings': ['hinge', 'ham_iso', 'glute_iso'],
        'quads_calves': ['squat', 'quad_iso', 'calf'],
        'full_body': ['squat', 'horizontal_press', 'vertical_pull']
    }
    
    return pattern_map.get(focus, [])


def get_optional_patterns_for_focus(focus: str) -> List[str]:
    """Get optional movement patterns for a focus."""
    optional_map = {
        'chest': ['triceps', 'incline_press'],
        'shoulders': ['front_delt'],
        'back': ['pullover', 'rear_delt'],
        'lats': ['pullover'],
        'upper_back': ['rear_delt'],
        'quads': ['lunge'],
        'hamstrings': ['lunge', 'calf'],
        'glutes': ['lunge'],
        'biceps': ['row'],
        'triceps': ['horizontal_press'],
        'push': ['triceps', 'front_delt'],
        'pull': ['biceps', 'pullover'],
        'legs': ['lunge', 'calf', 'quad_iso', 'ham_iso'],
        'upper': ['lateral_delt', 'rear_delt', 'biceps', 'triceps'],
        'lower': ['quad_iso', 'ham_iso', 'lunge', 'calf'],
        'posterior_chain': ['glute_iso'],
        'back_biceps': ['rear_delt'],
        'chest_triceps': ['fly'],
        'shoulders_triceps': ['rear_delt'],
        'glutes_hamstrings': [],
        'quads_calves': [],
        'full_body': ['core_anti_extension', 'glute_iso', 'lateral_delt']
    }
    
    return optional_map.get(focus, [])


def get_banned_patterns_for_focus(focus: str) -> List[str]:
    """Get banned movement patterns for a focus."""
    ban_map = {
        'chest': ['lateral_delt', 'rear_delt', 'core_anti_extension'],
        'shoulders': ['horizontal_press', 'vertical_pull', 'horizontal_pull'],
        'back': ['horizontal_press', 'vertical_press', 'incline_press'],
        'lats': ['horizontal_press', 'vertical_press'],
        'upper_back': ['vertical_press'],
        'hamstrings': [],  # Allow light squats up to 30%
        'biceps': [],      # Allow light rows as warm-up
        'triceps': [],     # Allow light presses
        'push': ['vertical_pull', 'horizontal_pull', 'biceps'],
        'pull': ['horizontal_press', 'vertical_press', 'incline_press'],
        'legs': ['horizontal_press', 'vertical_press', 'vertical_pull', 'horizontal_pull'],
        'upper': ['squat', 'hinge', 'lunge', 'calf'],
        'lower': ['horizontal_press', 'vertical_press', 'vertical_pull', 'horizontal_pull'],
        'posterior_chain': ['horizontal_press', 'vertical_press', 'incline_press'],
        'back_biceps': ['horizontal_press', 'vertical_press', 'incline_press'],
        'chest_triceps': ['vertical_pull', 'horizontal_pull'],
        'shoulders_triceps': ['vertical_pull', 'horizontal_pull'],
    }
    
    return ban_map.get(focus, [])


def build_focus_whitelist(user_ctx: Dict[str, Any], focus_or_combo: str) -> List[str]:
    """
    Build focus-specific exercise whitelist.
    
    Args:
        user_ctx: User context with equipment, injuries, experience, dislikes
        focus_or_combo: Focus key or combo text
        
    Returns:
        List of exerciseIds (10-25 exercises)
    """
    # Check cache first
    cache_key = f"{focus_or_combo}_{json.dumps(user_ctx, sort_keys=True)}"
    cached = get_cached_whitelist(cache_key)
    if cached:
        return cached[:25]  # Ensure max 25
    
    # Parse combo if applicable
    combo = parse_combo(focus_or_combo)
    if combo:
        focusA, focusB, weightA = combo
        whitelistA = _build_single_focus_whitelist(user_ctx, focusA)
        whitelistB = _build_single_focus_whitelist(user_ctx, focusB)
        
        # Union and rank by preference match
        combined = list(set(whitelistA + whitelistB))
        ranked = _rank_exercises_by_preference(combined, user_ctx, focusA, focusB, weightA)
        result = ranked[:25]
    else:
        # Single focus
        normalized_focus = normalize_focus(focus_or_combo)
        if normalized_focus not in BASE_FOCI:
            # Fallback to general whitelist
            result = get_exercises_by_filters(user_ctx)[:25]
        else:
            result = _build_single_focus_whitelist(user_ctx, normalized_focus)[:25]
    
    # Cache result
    cache_whitelist(cache_key, result)
    return result


def _build_single_focus_whitelist(user_ctx: Dict[str, Any], focus: str) -> List[str]:
    """Build whitelist for single focus."""
    required_patterns = get_required_patterns_for_focus(focus)
    optional_patterns = get_optional_patterns_for_focus(focus)
    banned_patterns = get_banned_patterns_for_focus(focus)
    target_muscles = get_muscle_families_for_focus(focus)
    
    # Get base exercises filtered by user constraints
    base_filters = {
        'equipment': user_ctx.get('equipment', []),
        'injuries': user_ctx.get('injuries', []),
        'experience': user_ctx.get('experience', 'intermediate'),
        'dislikes': user_ctx.get('dislikes', [])
    }
    
    # Get exercises that match focus patterns and aren't banned
    whitelist = []
    
    # Required patterns - ensure coverage
    for pattern in required_patterns:
        exercises = get_exercises_by_filters({
            **base_filters,
            'movement_patterns': [pattern],
            'muscle_families': target_muscles
        })
        whitelist.extend(exercises[:3])  # Up to 3 per required pattern
    
    # Optional patterns - add variety
    for pattern in optional_patterns:
        exercises = get_exercises_by_filters({
            **base_filters,
            'movement_patterns': [pattern],
            'muscle_families': target_muscles
        })
        whitelist.extend(exercises[:2])  # Up to 2 per optional pattern
    
    # Remove duplicates and banned patterns
    whitelist = list(dict.fromkeys(whitelist))  # Preserve order, remove dupes
    
    # Filter out banned exercises and segment exercises
    filtered_whitelist = []
    for exercise_id in whitelist:
        exercise = CANONICAL_EXERCISES.get(exercise_id)
        if exercise:
            # Exclude segment-specific exercises from main whitelist
            if (exercise.isCardioWarmup or exercise.isActivation or 
                exercise.isMobility or exercise.isStretch):
                continue
                
            exercise_patterns = _get_exercise_patterns(exercise_id)
            if not any(banned in exercise_patterns for banned in banned_patterns):
                filtered_whitelist.append(exercise_id)
    
    # If too few, add more from target muscles
    if len(filtered_whitelist) < 10:
        additional = get_exercises_by_filters({
            **base_filters,
            'muscle_families': target_muscles
        })
        for exercise_id in additional:
            if exercise_id not in filtered_whitelist:
                exercise = CANONICAL_EXERCISES.get(exercise_id)
                if exercise:
                    # Exclude segment-specific exercises from main whitelist
                    if (exercise.isCardioWarmup or exercise.isActivation or 
                        exercise.isMobility or exercise.isStretch):
                        continue
                        
                    exercise_patterns = _get_exercise_patterns(exercise_id)
                    if not any(banned in exercise_patterns for banned in banned_patterns):
                        filtered_whitelist.append(exercise_id)
                        if len(filtered_whitelist) >= 15:
                            break
    
    return filtered_whitelist[:25]


def _rank_exercises_by_preference(
    exercise_ids: List[str], 
    user_ctx: Dict[str, Any], 
    focusA: str, 
    focusB: str, 
    weightA: float
) -> List[str]:
    """Rank exercises for combo focus by preference match."""
    musclesA = set(get_muscle_families_for_focus(focusA))
    musclesB = set(get_muscle_families_for_focus(focusB))
    
    scored_exercises = []
    for exercise_id in exercise_ids:
        exercise_muscles = set(_get_exercise_muscles(exercise_id))
        
        # Score based on muscle match
        scoreA = len(exercise_muscles.intersection(musclesA)) / max(len(musclesA), 1)
        scoreB = len(exercise_muscles.intersection(musclesB)) / max(len(musclesB), 1)
        combined_score = weightA * scoreA + (1 - weightA) * scoreB
        
        # Boost for safety/experience match
        safety_boost = _get_safety_score(exercise_id, user_ctx)
        final_score = combined_score + safety_boost * 0.1
        
        scored_exercises.append((exercise_id, final_score))
    
    # Sort by score descending
    scored_exercises.sort(key=lambda x: x[1], reverse=True)
    return [ex[0] for ex in scored_exercises]


def _get_exercise_patterns(exercise_id: str) -> List[str]:
    """Get movement patterns for an exercise from the canonical database."""
    try:
        from exercise_database import get_exercise_data
        exercise_data = get_exercise_data(exercise_id)
        if exercise_data:
            # Return movement patterns, defaulting to display name as pattern
            return exercise_data.get('movement_patterns', [exercise_data.get('name', '').lower()])
        return []
    except Exception:
        return []


def _get_exercise_muscles(exercise_id: str) -> List[str]:
    """Get muscle families for an exercise from the canonical database."""
    try:
        from exercise_database import get_exercise_data
        exercise_data = get_exercise_data(exercise_id)
        if exercise_data:
            return exercise_data.get('muscle_families', [])
        return []
    except Exception:
        return []


def _get_safety_score(exercise_id: str, user_ctx: Dict[str, Any]) -> float:
    """Get safety score for exercise based on user context and canonical database."""
    try:
        from exercise_database import get_exercise_data
        exercise_data = get_exercise_data(exercise_id)
        if not exercise_data:
            return 0.5  # Neutral score for unknown exercises
        
        # Get risk level from canonical database
        risk_level = exercise_data.get('risk_level', 'medium')
        min_experience = exercise_data.get('experience_level', 'intermediate')
        user_experience = user_ctx.get('experience_level', 'intermediate')
        
        # Convert to numeric scores
        risk_scores = {'low': 0.9, 'medium': 0.7, 'high': 0.5, 'very_high': 0.3}
        exp_levels = {'beginner': 1, 'intermediate': 2, 'advanced': 3}
        
        base_score = risk_scores.get(risk_level, 0.7)
        user_level = exp_levels.get(user_experience, 2)
        required_level = exp_levels.get(min_experience, 2)
        
        # Adjust score based on experience match
        if user_level >= required_level:
            return base_score
        else:
            # Penalize if user doesn't meet minimum experience
            return base_score * 0.6
            
    except Exception:
        return 0.5  # Safe default score
    exercise_level = diff_levels.get(difficulty, 2)
    
    # Higher score if exercise matches or is below user level
    if exercise_level <= user_level:
        return 1.0
    elif exercise_level == user_level + 1:
        return 0.5
    else:
        return 0.0
