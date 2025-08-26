"""
Focus Router - Main entry point and orchestrator for Focus Planner system
"""
import json
from typing import Dict, List, Any, Optional, Tuple
from focus_rules import normalize_focus, parse_combo
from focus_whitelist import build_focus_whitelist
from focus_composer import get_slot_template_for_focus, merge_slot_templates
from focus_rubrics import get_rubric_for_focus
from focus_validator import FocusValidator
from focus_rulesets import FocusRuleset
from exercise_database import ExerciseDatabase
from user_profiles import UserProfileManager


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
        whitelist_result = build_focus_whitelist(
            focus=normalized_focus,
            exercise_db=self.exercise_db,
            user_context=user_context
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
            whitelist=whitelist_result['allowed_exercises'],
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
            "whitelist_result": whitelist_result,
            "slot_template": slot_template,
            "ruleset": ruleset,
            "rules": rules,
            "limits": limits,
            "guidance": guidance,
            "rubric": rubric,
            "prompt_components": prompt_components,
            "user_context": user_context,
            "metadata": {
                "total_allowed_exercises": len(whitelist_result['allowed_exercises']),
                "whitelist_build_time": whitelist_result.get('build_time_ms', 0),
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
        user_profile = self.user_profiles.get_user_profile(user_id)
        
        # Merge with additional context
        context = {
            "user_id": user_id,
            "experience_level": user_profile.get('experience_level', 'intermediate'),
            "available_equipment": user_profile.get('available_equipment', []),
            "preferences": user_profile.get('preferences', {}),
            "limitations": user_profile.get('limitations', {}),
            "goals": user_profile.get('goals', [])
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
