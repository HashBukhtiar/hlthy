"""
Focus Whitelist - Build focus-specific exercise whitelists from exercise database
"""
from typing import List, Dict, Any, Optional, Set
from focus_rules import (
    BASE_FOCI, get_muscle_families_for_focus, parse_combo,
    MOVEMENT_PATTERNS, normalize_focus
)

try:
    from exercise_database import get_exercises_by_filters
except ImportError:
    # Fallback for testing
    def get_exercises_by_filters(*args, **kwargs):
        return ['barbell_bench_press', 'dumbbell_bench_press', 'push_ups']

try:
    from exercise_database import get_exercise_data
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
    
    # Filter out banned exercises
    filtered_whitelist = []
    for exercise_id in whitelist:
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
