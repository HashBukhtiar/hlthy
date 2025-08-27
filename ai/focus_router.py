"""
Focus Router - Main entry point and orchestrator for Focus Planner system
"""
import json
import re
from typing import Dict, List, Any, Optional, Tuple
from focus_rules import normalize_focus, parse_combo
from focus_whitelist import build_focus_whitelist
from focus_composer import get_slot_template_for_focus, merge_slot_templates
from focus_rubrics import get_rubric_for_focus
from focus_validator import FocusValidator
from focus_rulesets import FocusRuleset
from exercise_database import ExerciseDatabase
from user_profiles import UserProfileManager


def is_nonsense_or_unknown(text: str) -> bool:
    """
    Detect if the request is nonsense or doesn't map to any workout concept
    
    Args:
        text: User input text
        
    Returns:
        True if the text appears to be nonsense or unrelated to fitness
    """
    if not text or len(text.strip()) < 2:
        return True
    
    normalized = text.lower().strip()
    
    # Known nonsense/unrelated terms
    nonsense_terms = {
        'toenails', 'fingernails', 'hair', 'teeth', 'ears', 'nose', 
        'eyebrows', 'eyelashes', 'tongue', 'lips', 'skin', 'nails',
        'weather', 'politics', 'movies', 'music', 'food', 'cooking',
        'sleeping', 'driving', 'reading', 'writing', 'painting'
    }
    
    # Check for exact nonsense matches
    for term in nonsense_terms:
        if term in normalized:
            return True
    
    # Check if it contains any fitness-related terms
    fitness_terms = {
        'workout', 'exercise', 'train', 'build', 'strength', 'muscle',
        'chest', 'back', 'shoulders', 'legs', 'arms', 'abs', 'core',
        'push', 'pull', 'squat', 'press', 'row', 'curl', 'fly',
        'cardio', 'hiit', 'circuit', 'superset', 'dropset',
        'hypertrophy', 'power', 'endurance', 'mobility', 'flexibility',
        'upper', 'lower', 'full body', 'split', 'bro split',
        'glutes', 'quads', 'hamstrings', 'calves', 'biceps', 'triceps',
        'delts', 'traps', 'lats', 'rhomboids', 'obliques'
    }
    
    has_fitness_term = any(term in normalized for term in fitness_terms)
    
    # If no fitness terms found, likely nonsense
    if not has_fitness_term:
        return True
    
    return False

def needs_interview(text: str, profile: dict) -> bool:
    """
    Determine if we need to conduct an interview before planning
    
    Args:
        text: User input text
        profile: User profile data
        
    Returns:
        True if interview is needed
    """
    normalized = text.lower().strip()
    
    # Generic/vague requests that need clarification
    vague_patterns = [
        r'^build my \w+$',  # "build my back"
        r'^train \w+$',     # "train legs"
        r'^workout$',       # just "workout"
        r'^help me$',       # "help me"
        r'^make me strong$',
        r'^get me fit$',
        r'^i want to workout$',
        r'^i need a workout$',
        r'^give me a workout$',
        r'^create a workout$'
    ]
    
    is_vague = any(re.match(pattern, normalized) for pattern in vague_patterns)
    
    if not is_vague:
        return False
    
    # Check if profile has recent workout context (within last 7 days)
    if not profile:
        return True
    
    last_interview = profile.get('last_interview_date')
    if not last_interview:
        return True
    
    # Check if we have necessary information
    required_fields = ['workout_goal', 'available_time', 'equipment_access', 'experience_level']
    missing_info = any(field not in profile or not profile[field] for field in required_fields)
    
    if missing_info:
        return True
    
    # Check if last interview was more than 7 days ago
    from datetime import datetime, timedelta
    try:
        last_date = datetime.fromisoformat(last_interview)
        if datetime.now() - last_date > timedelta(days=7):
            return True
    except:
        return True
    
    return False

def detect_focus(text: str) -> Dict[str, str]:
    """Detect focus from user message."""
    text_lower = text.lower()
    
    # Focus keywords mapping
    focus_patterns = {
        'chest': ['chest', 'pecs', 'pectoral', 'bench'],
        'back': ['back', 'lats', 'latissimus', 'rows', 'pull-up', 'pullup'],
        'shoulders': ['shoulder', 'delts', 'deltoid', 'overhead', 'press'],
        'arms': ['arms', 'biceps', 'triceps', 'curls'],
        'legs': ['legs', 'leg day', 'lower body', 'squat', 'deadlift'],
        'quads': ['quads', 'quadriceps', 'front leg', 'knee extension'],
        'hamstrings': ['hamstrings', 'hams', 'back leg', 'rdl'],
        'glutes': ['glutes', 'butt', 'hip thrust', 'bridge'],
        'calves': ['calves', 'calf'],
        'core': ['core', 'abs', 'abdominal', 'planks'],
        'push': ['push day', 'pushing', 'press'],
        'pull': ['pull day', 'pulling'],
        'upper': ['upper body', 'upper'],
        'lower': ['lower body', 'lower'],
        'full_body': ['full body', 'fullbody', 'total body', 'whole body']
    }
    
    # Check for combo patterns first
    combo_patterns = [
        'back and biceps', 'back+biceps', 'back & biceps',
        'chest and triceps', 'chest+triceps', 'chest & triceps',
        'shoulders and triceps', 'shoulders+triceps', 'shoulders & triceps',
        'glutes and hamstrings', 'glutes+hamstrings', 'glutes & hamstrings',
        'quads and calves', 'quads+calves', 'quads & calves'
    ]
    
    for pattern in combo_patterns:
        if pattern in text_lower:
            return {
                'detected_type': pattern.replace(' and ', '+').replace(' & ', '+'),
                'confidence': 0.9
            }
    
    # Check for single focus
    detected_focuses = []
    for focus, patterns in focus_patterns.items():
        if any(pattern in text_lower for pattern in patterns):
            detected_focuses.append(focus)
    
    # Return most specific focus if multiple detected
    if len(detected_focuses) == 1:
        return {'detected_type': detected_focuses[0], 'confidence': 0.8}
    elif len(detected_focuses) > 1:
        # Prefer more specific focuses
        priority = ['biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 
                   'chest', 'back', 'shoulders', 'arms', 'legs', 'push', 'pull', 
                   'upper', 'lower', 'full_body']
        for focus in priority:
            if focus in detected_focuses:
                return {'detected_type': focus, 'confidence': 0.7}
    
    return {'detected_type': None, 'confidence': 0.0}


class FocusPlanner:
    """
    Main orchestrator for the Focus Planner system.
    Coordinates all focus-related operations: whitelist building, prompt composition,
    validation, and workout plan processing.
    """
    
    def __init__(self, exercise_db: ExerciseDatabase, user_profiles: UserProfileManager):
        """
        Initialize Focus Planner with required dependencies.
        
        Args:
            exercise_db: Exercise database instance
            user_profiles: User profile manager
        """
        self.exercise_db = exercise_db
        self.user_profiles = user_profiles
        self.validator = FocusValidator(exercise_db)
    
    def process_focus_request(self, 
                            focus: str, 
                            user_id: str,
                            context: Optional[Dict[str, Any]] = None,
                            ruleset: str = "intermediate") -> Dict[str, Any]:
        """
        Main entry point for processing a focus-based workout request.
        
        Args:
            focus: Focus type or combo (e.g., "chest", "back+biceps")
            user_id: User identifier
            context: Additional context (equipment, preferences, etc.)
            ruleset: Ruleset to apply ("beginner", "intermediate", "advanced", etc.)
            
        Returns:
            Complete focus processing result with whitelist, prompt, templates, etc.
        """
        # Normalize and parse focus
        normalized_focus = self._process_focus_input(focus)
        
        # Get user context
        user_context = self._build_user_context(user_id, context or {})
        
        # Build focus whitelist
        allowed_exercises = build_focus_whitelist(
            user_ctx=user_context,
            focus_or_combo=normalized_focus
        )
        
        # Get slot template
        slot_template = self._get_slot_template(normalized_focus)
        
        # Apply ruleset modifications
        focus_ruleset = FocusRuleset(ruleset)
        rules = focus_ruleset.apply_focus_modifications(normalized_focus)
        limits = focus_ruleset.get_exercise_limits(normalized_focus)
        guidance = focus_ruleset.get_exercise_selection_guidance(normalized_focus)
        
        # Get rubric
        rubric = get_rubric_for_focus(normalized_focus)
        
        # Compose final prompt components
        prompt_components = self._compose_prompt_components(
            focus=normalized_focus,
            whitelist=allowed_exercises,
            slot_template=slot_template,
            rubric=rubric,
            limits=limits,
            guidance=guidance,
            user_context=user_context
        )
        
        return {
            "focus": normalized_focus,
            "original_focus": focus,
            "user_id": user_id,
            "whitelist_result": {"allowed_exercises": allowed_exercises},
            "slot_template": slot_template,
            "ruleset": ruleset,
            "rules": rules,
            "limits": limits,
            "guidance": guidance,
            "rubric": rubric,
            "prompt_components": prompt_components,
            "user_context": user_context,
            "metadata": {
                "total_allowed_exercises": len(allowed_exercises),
                "whitelist_build_time": 0,  # We don't track timing in this implementation
                "combo_detected": parse_combo(normalized_focus) is not None
            }
        }
    
    def validate_workout_plan(self, 
                            workout_plan: Dict[str, Any], 
                            focus_result: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, Any]]:
        """
        Validate a generated workout plan against focus requirements.
        
        Args:
            workout_plan: Generated workout plan to validate
            focus_result: Result from process_focus_request
            
        Returns:
            (is_valid, violations, validation_details)
        """
        allowed_exercises = focus_result['whitelist_result']['allowed_exercises']
        is_valid, violations = self.validator.validate_workout(workout_plan, allowed_exercises)
        
        # Additional validation details
        validation_details = {
            "focus": focus_result['focus'],
            "total_exercises_checked": len(self.validator._extract_exercises_from_plan(workout_plan)),
            "allowed_exercise_count": len(allowed_exercises),
            "ruleset_applied": focus_result['ruleset'],
            "validation_timestamp": self._get_timestamp()
        }
        
        return is_valid, violations, validation_details
    
    def suggest_exercise_substitutions(self, 
                                     invalid_exercise_id: str, 
                                     focus_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Suggest valid exercise substitutions for invalid exercise.
        
        Args:
            invalid_exercise_id: Exercise ID that failed validation
            focus_result: Result from process_focus_request
            
        Returns:
            List of suggested substitute exercises
        """
        allowed_exercises = focus_result['whitelist_result']['allowed_exercises']
        
        # Get invalid exercise data
        invalid_exercise = self.exercise_db.get_exercise_by_id(invalid_exercise_id)
        if not invalid_exercise:
            return []
        
        # Find similar exercises in whitelist
        invalid_patterns = set(invalid_exercise.get('movement_patterns', []))
        invalid_families = set(invalid_exercise.get('muscle_families', []))
        invalid_equipment = set(invalid_exercise.get('equipment', []))
        
        substitutes = []
        for exercise_id in allowed_exercises[:20]:  # Limit to prevent overload
            exercise = self.exercise_db.get_exercise_by_id(exercise_id)
            if not exercise:
                continue
            
            # Calculate similarity score
            patterns = set(exercise.get('movement_patterns', []))
            families = set(exercise.get('muscle_families', []))
            equipment = set(exercise.get('equipment', []))
            
            pattern_overlap = len(invalid_patterns & patterns) / max(len(invalid_patterns), 1)
            family_overlap = len(invalid_families & families) / max(len(invalid_families), 1)
            equipment_overlap = len(invalid_equipment & equipment) / max(len(invalid_equipment), 1)
            
            # Combined similarity score
            similarity = (pattern_overlap * 0.5) + (family_overlap * 0.3) + (equipment_overlap * 0.2)
            
            if similarity > 0.3:  # Threshold for reasonable substitution
                substitutes.append({
                    "exercise_id": exercise_id,
                    "name": exercise.get('name', ''),
                    "similarity_score": similarity,
                    "shared_patterns": list(invalid_patterns & patterns),
                    "shared_families": list(invalid_families & families),
                    "shared_equipment": list(invalid_equipment & equipment)
                })
        
        # Sort by similarity and return top suggestions
        substitutes.sort(key=lambda x: x['similarity_score'], reverse=True)
        return substitutes[:5]
    
    def _process_focus_input(self, focus: str) -> str:
        """Process and normalize focus input."""
        if not focus or not isinstance(focus, str):
            raise ValueError("Focus must be a non-empty string")
        
        # Basic cleanup
        focus = focus.lower().strip()
        
        # Handle combo parsing
        combo = parse_combo(focus)
        if combo:
            focusA, focusB, weightA = combo
            return f"{focusA}+{focusB}" + (f":{weightA:.1f}" if weightA != 0.5 else "")
        
        # Single focus normalization
        return normalize_focus(focus)
    
    def _build_user_context(self, user_id: str, additional_context: Dict[str, Any]) -> Dict[str, Any]:
        """Build complete user context for focus planning."""
        # Get user profile
        user_profile = None
        if self.user_profiles and user_id:
            try:
                user_profile = self.user_profiles.load_profile(user_id)
            except Exception as e:
                print(f"⚠️  Failed to load user profile: {e}")
                user_profile = None
        
        # Merge with additional context
        context = {
            "user_id": user_id,
            "experience_level": user_profile.experience_level if user_profile else 'intermediate',
            "available_equipment": user_profile.preferences.available_equipment if user_profile and user_profile.preferences else [],
            "preferences": user_profile.preferences.__dict__ if user_profile and user_profile.preferences else {},
            "limitations": user_profile.limitations.__dict__ if user_profile and user_profile.limitations else {},
            "goals": user_profile.goals.__dict__ if user_profile and user_profile.goals else {}
        }
        
        # Override with additional context
        context.update(additional_context)
        
        return context
    
    def _get_slot_template(self, focus: str) -> Dict[str, Any]:
        """Get slot template for focus."""
        combo = parse_combo(focus)
        if combo:
            focusA, focusB, weightA = combo
            templateA = get_slot_template_for_focus(focusA)
            templateB = get_slot_template_for_focus(focusB)
            return merge_slot_templates(templateA, templateB, weightA)
        else:
            return get_slot_template_for_focus(focus)
    
    def _compose_prompt_components(self, 
                                 focus: str,
                                 whitelist: List[str],
                                 slot_template: Dict[str, Any],
                                 rubric: str,
                                 limits: Dict[str, int],
                                 guidance: Dict[str, Any],
                                 user_context: Dict[str, Any]) -> Dict[str, str]:
        """Compose all prompt components into structured format."""
        
        # Build exercise list string
        exercise_list = self._format_exercise_list(whitelist[:50])  # Limit for prompt size
        
        # Build constraints string
        constraints = self._format_constraints(limits, guidance)
        
        # Build user context string
        user_info = self._format_user_context(user_context)
        
        return {
            "focus_instruction": f"Create a {focus} workout plan using the following guidelines:",
            "exercise_whitelist": f"ALLOWED EXERCISES (use ONLY these exerciseIds):\n{exercise_list}",
            "slot_template": f"TEMPLATE GUIDANCE:\n{json.dumps(slot_template, indent=2)}",
            "rubric": f"FOCUS RULES:\n{rubric}",
            "constraints": f"CONSTRAINTS:\n{constraints}",
            "user_context": f"USER CONTEXT:\n{user_info}",
            "validation_reminder": "Remember: Use ONLY exerciseIds from the allowed exercises list above."
        }
    
    def _format_exercise_list(self, exercise_ids: List[str]) -> str:
        """Format exercise list for prompt."""
        lines = []
        for exercise_id in exercise_ids:
            exercise = self.exercise_db.get_exercise_by_id(exercise_id)
            if exercise:
                name = exercise.get('name', exercise_id)
                lines.append(f"- {exercise_id}: {name}")
        return "\n".join(lines)
    
    def _format_constraints(self, limits: Dict[str, int], guidance: Dict[str, Any]) -> str:
        """Format constraints for prompt."""
        lines = [
            f"- Maximum {limits['max_exercises']} exercises",
            f"- Maximum {limits['max_sets_per_exercise']} sets per exercise",
            f"- Target ~{limits['recommended_total_sets']} total sets"
        ]
        
        if guidance.get('prefer_compounds'):
            lines.append("- Prioritize compound movements")
        if guidance.get('time_efficiency') == 'critical':
            lines.append("- Focus on time-efficient exercise selection")
        if guidance.get('pattern_balance'):
            lines.append("- Balance movement patterns within focus")
        
        return "\n".join(lines)
    
    def _format_user_context(self, user_context: Dict[str, Any]) -> str:
        """Format user context for prompt."""
        lines = [
            f"- Experience: {user_context.get('experience_level', 'intermediate')}",
            f"- Available equipment: {', '.join(user_context.get('available_equipment', ['basic']))}"
        ]
        
        if user_context.get('limitations'):
            lines.append(f"- Limitations: {user_context['limitations']}")
        
        return "\n".join(lines)
    
    def _get_timestamp(self) -> str:
        """Get current timestamp."""
        from datetime import datetime
        return datetime.utcnow().isoformat() + "Z"
