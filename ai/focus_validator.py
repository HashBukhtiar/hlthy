"""
Focus Validator - Validates workout plans against focus requirements and safety constraints
"""
import json
from typing import Dict, List, Set, Any, Optional, Tuple
from focus_rules import normalize_focus, parse_combo, get_muscle_families_for_focus
try:
    from exercise_database import CANONICAL_EXERCISES
except ImportError:
    # Fallback mock for testing
    CANONICAL_EXERCISES = {}


class FocusValidator:
    """Validates workout plans against focus requirements with segment awareness."""
    
    def __init__(self):
        pass
    
    def validate_segment_aware_workout(self, workout_plan: Dict[str, Any], allowed_exercises: List[str]) -> Tuple[bool, List[str]]:
        """
        Validate a segment-aware workout plan.
        
        Args:
            workout_plan: Parsed workout plan with warmup/main/cooldown segments
            allowed_exercises: List of allowed exercise IDs from whitelist
            
        Returns:
            (is_valid, list_of_violations)
        """
        violations = []
        
        # Check for required segments
        if 'warmup' not in workout_plan:
            violations.append("Missing warmup segment")
        if 'main' not in workout_plan:
            violations.append("Missing main workout segment") 
        if 'cooldown' not in workout_plan:
            violations.append("Missing cooldown segment")
        
        if violations:
            return False, violations
        
        # Validate each segment
        warmup_valid, warmup_violations = self._validate_warmup_segment(workout_plan['warmup'])
        main_valid, main_violations = self._validate_main_segment(workout_plan['main'], allowed_exercises)
        cooldown_valid, cooldown_violations = self._validate_cooldown_segment(workout_plan['cooldown'])
        
        violations.extend(warmup_violations)
        violations.extend(main_violations)
        violations.extend(cooldown_violations)
        
        # Check for exercise duplication across segments
        duplication_violations = self._validate_no_segment_duplication(workout_plan)
        violations.extend(duplication_violations)
        
        return len(violations) == 0, violations
    
    def _validate_warmup_segment(self, warmup_exercises: List[Dict]) -> Tuple[bool, List[str]]:
        """Validate warmup segment exercises are appropriate."""
        violations = []
        
        if not warmup_exercises:
            violations.append("Warmup segment is empty")
            return False, violations
        
        has_cardio = False
        has_activation = False
        
        for exercise in warmup_exercises:
            exercise_id = exercise.get('exercise_id')
            if not exercise_id or exercise_id not in CANONICAL_EXERCISES:
                violations.append(f"Unknown warmup exercise: {exercise_id}")
                continue
            
            canonical_exercise = CANONICAL_EXERCISES[exercise_id]
            
            # Check if exercise is appropriate for warmup
            if canonical_exercise.isCardioWarmup:
                has_cardio = True
            elif canonical_exercise.isActivation:
                has_activation = True
            else:
                violations.append(f"Exercise {exercise_id} not suitable for warmup (not flagged as cardio warmup or activation)")
        
        # Ensure we have both cardio and activation components
        if not has_cardio:
            violations.append("Warmup missing cardio component")
        if not has_activation:
            violations.append("Warmup missing activation component")
        
        return len(violations) == 0, violations
    
    def _validate_cooldown_segment(self, cooldown_exercises: List[Dict]) -> Tuple[bool, List[str]]:
        """Validate cooldown segment exercises are appropriate."""
        violations = []
        
        if not cooldown_exercises:
            violations.append("Cooldown segment is empty")
            return False, violations
        
        has_mobility_or_stretch = False
        
        for exercise in cooldown_exercises:
            exercise_id = exercise.get('exercise_id')
            if not exercise_id or exercise_id not in CANONICAL_EXERCISES:
                violations.append(f"Unknown cooldown exercise: {exercise_id}")
                continue
            
            canonical_exercise = CANONICAL_EXERCISES[exercise_id]
            
            # Check if exercise is appropriate for cooldown
            if (canonical_exercise.isMobility or 
                canonical_exercise.isStretch or 
                canonical_exercise.isCooldownSafe):
                has_mobility_or_stretch = True
            else:
                violations.append(f"Exercise {exercise_id} not suitable for cooldown (not flagged as mobility, stretch, or cooldown safe)")
        
        # Ensure we have mobility/stretch component
        if not has_mobility_or_stretch:
            violations.append("Cooldown missing mobility or stretch component")
        
        return len(violations) == 0, violations
    
    def _validate_main_segment(self, main_exercises: List[Dict], allowed_exercises: List[str]) -> Tuple[bool, List[str]]:
        """Validate main workout segment."""
        violations = []
        
        if not main_exercises:
            violations.append("Main workout segment is empty")
            return False, violations
        
        # Validate exercise IDs are in allowed list
        allowed_set = set(allowed_exercises)
        
        for exercise in main_exercises:
            exercise_id = exercise.get('exercise_id')
            if exercise_id and exercise_id not in allowed_set:
                violations.append(f"Main exercise {exercise_id} not in allowed exercises for this focus")
        
        # Check volume is reasonable
        total_sets = sum(exercise.get('sets', 0) for exercise in main_exercises)
        if total_sets > 25:
            violations.append(f"Main workout volume too high: {total_sets} sets")
        elif total_sets < 8:
            violations.append(f"Main workout volume too low: {total_sets} sets")
        
        return len(violations) == 0, violations
    
    def _validate_no_segment_duplication(self, workout_plan: Dict) -> List[str]:
        """Ensure no exercise is repeated across warmup, main, and cooldown."""
        violations = []
        
        # Collect exercise IDs from each segment
        warmup_ids = {ex.get('exercise_id') for ex in workout_plan.get('warmup', [])}
        main_ids = {ex.get('exercise_id') for ex in workout_plan.get('main', [])}
        cooldown_ids = {ex.get('exercise_id') for ex in workout_plan.get('cooldown', [])}
        
        # Remove None values
        warmup_ids.discard(None)
        main_ids.discard(None)
        cooldown_ids.discard(None)
        
        # Check for overlaps
        warmup_main_overlap = warmup_ids & main_ids
        warmup_cooldown_overlap = warmup_ids & cooldown_ids
        main_cooldown_overlap = main_ids & cooldown_ids
        
        if warmup_main_overlap:
            violations.append(f"Exercises duplicated between warmup and main: {', '.join(warmup_main_overlap)}")
        
        if warmup_cooldown_overlap:
            violations.append(f"Exercises duplicated between warmup and cooldown: {', '.join(warmup_cooldown_overlap)}")
        
        if main_cooldown_overlap:
            violations.append(f"Exercises duplicated between main and cooldown: {', '.join(main_cooldown_overlap)}")
        
        return violations
    
    def validate_workout(self, workout_plan: Dict[str, Any], allowed_exercises: List[str]) -> Tuple[bool, List[str]]:
        """
        Legacy method for backward compatibility - validates both segment-aware and traditional plans.
        """
        # Check if it's a segment-aware plan
        if 'warmup' in workout_plan and 'main' in workout_plan and 'cooldown' in workout_plan:
            return self.validate_segment_aware_workout(workout_plan, allowed_exercises)
        else:
            # Fall back to traditional validation
            return self._validate_traditional_workout(workout_plan, allowed_exercises)
    
    def _validate_traditional_workout(self, workout_plan: Dict[str, Any], allowed_exercises: List[str]) -> Tuple[bool, List[str]]:
        """Validate traditional (non-segment-aware) workout plan."""
        violations = []
        
        # Extract exercises from workout plan
        exercises = self._extract_exercises_from_plan(workout_plan)
        if not exercises:
            violations.append("No exercises found in workout plan")
            return False, violations
        
        # Check exercise ID validation
        id_violations = self._validate_exercise_ids(exercises, allowed_exercises)
        violations.extend(id_violations)
        
        # Extract focus from workout plan
        focus = workout_plan.get('focus', '').lower().strip()
        if not focus:
            violations.append("No focus specified in workout plan")
            return len(violations) == 0, violations
        
        # Validate focus requirements
        focus_violations = self._validate_focus_requirements(exercises, focus, allowed_exercises)
        violations.extend(focus_violations)
        
        # Validate volume bounds
        volume_violations = self._validate_volume_bounds(exercises, focus)
        violations.extend(volume_violations)
        
        return len(violations) == 0, violations
    
    def _extract_exercises_from_plan(self, workout_plan: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract exercise list from workout plan."""
        exercises = []
        
        # Try different possible structures
        if 'exercises' in workout_plan:
            exercises = workout_plan['exercises']
        elif 'workout' in workout_plan and 'exercises' in workout_plan['workout']:
            exercises = workout_plan['workout']['exercises']
        elif 'plan' in workout_plan and isinstance(workout_plan['plan'], list):
            exercises = workout_plan['plan']
        
        # Handle nested structures
        if not exercises and isinstance(workout_plan, dict):
            for value in workout_plan.values():
                if isinstance(value, list) and value and isinstance(value[0], dict):
                    if 'exerciseId' in value[0] or 'name' in value[0]:
                        exercises = value
                        break
        
        return exercises if isinstance(exercises, list) else []
    
    def _validate_exercise_ids(self, exercises: List[Dict[str, Any]], allowed_exercises: List[str]) -> List[str]:
        """Validate all exercise IDs are in allowed list."""
        violations = []
        allowed_set = set(allowed_exercises)
        
        for exercise in exercises:
            exercise_id = exercise.get('exerciseId') or exercise.get('id')
            if exercise_id and exercise_id not in allowed_set:
                exercise_name = exercise.get('name', exercise_id)
                violations.append(f"Exercise '{exercise_name}' (ID: {exercise_id}) not in allowed exercises for this focus")
        
        return violations
    
    def _validate_focus_requirements(self, exercises: List[Dict[str, Any]], focus: str, allowed_exercises: List[str]) -> List[str]:
        """Validate focus-specific requirements."""
        violations = []
        
        # Parse combo if applicable
        combo = parse_combo(focus)
        if combo:
            focusA, focusB, weightA = combo
            violations.extend(self._validate_combo_focus(exercises, focusA, focusB, weightA, allowed_exercises))
        else:
            normalized_focus = normalize_focus(focus)
            violations.extend(self._validate_single_focus(exercises, normalized_focus, allowed_exercises))
        
        return violations
    
    def _validate_single_focus(self, exercises: List[Dict[str, Any]], focus: str, allowed_exercises: List[str]) -> List[str]:
        """Validate single focus requirements."""
        violations = []
        
        # Get exercise movement patterns
        movement_patterns = self._get_movement_patterns(exercises)
        muscle_families = self._get_muscle_families(exercises)
        
        # Focus-specific validations
        if focus == "chest":
            if not self._has_pattern(movement_patterns, ["horizontal_press", "incline_press", "vertical_press"]):
                violations.append("Chest focus requires at least 1 pressing movement")
            if len([p for p in movement_patterns if "press" in p]) < 2:
                violations.append("Chest focus requires at least 2 pressing exercises")
        
        elif focus == "shoulders":
            if not self._has_pattern(movement_patterns, ["vertical_press", "overhead_press"]):
                violations.append("Shoulders focus requires vertical pressing movement")
            if "lateral_delts" not in muscle_families:
                violations.append("Shoulders focus requires lateral delt isolation")
        
        elif focus == "back":
            if not self._has_pattern(movement_patterns, ["vertical_pull", "pull_up", "lat_pulldown"]):
                violations.append("Back focus requires vertical pulling movement")
            if not self._has_pattern(movement_patterns, ["horizontal_pull", "row"]):
                violations.append("Back focus requires horizontal pulling/rowing movement")
        
        elif focus == "quads":
            if not self._has_pattern(movement_patterns, ["squat", "leg_press", "knee_dominant"]):
                violations.append("Quads focus requires knee-dominant compound movement")
            if "quads" not in muscle_families:
                violations.append("Quads focus requires quad isolation exercise")
        
        elif focus == "hamstrings":
            if not self._has_pattern(movement_patterns, ["hinge", "deadlift", "rdl"]):
                violations.append("Hamstrings focus requires hip hinge movement")
            if "hamstrings" not in muscle_families:
                violations.append("Hamstrings focus requires hamstring isolation")
        
        elif focus == "glutes":
            if not self._has_pattern(movement_patterns, ["hinge", "hip_thrust", "bridge"]):
                violations.append("Glutes focus requires hip-dominant movement")
            if "glutes" not in muscle_families:
                violations.append("Glutes focus requires glute isolation/abduction")
        
        elif focus == "push":
            if not self._has_pattern(movement_patterns, ["horizontal_press", "incline_press"]):
                violations.append("Push focus requires horizontal pressing movement")
            if not self._has_pattern(movement_patterns, ["vertical_press", "overhead_press"]):
                violations.append("Push focus requires vertical pressing movement")
        
        elif focus == "pull":
            if not self._has_pattern(movement_patterns, ["vertical_pull", "pull_up", "lat_pulldown"]):
                violations.append("Pull focus requires vertical pulling movement")
            if not self._has_pattern(movement_patterns, ["horizontal_pull", "row"]):
                violations.append("Pull focus requires horizontal pulling movement")
        
        elif focus == "legs":
            if not self._has_pattern(movement_patterns, ["squat", "leg_press", "knee_dominant"]):
                violations.append("Legs focus requires knee-dominant movement")
            if not self._has_pattern(movement_patterns, ["hinge", "deadlift", "rdl"]):
                violations.append("Legs focus requires hip hinge movement")
        
        elif focus == "full_body":
            required_patterns = [
                (["squat", "leg_press", "hinge", "deadlift"], "lower body compound"),
                (["horizontal_press", "vertical_press", "incline_press"], "pressing movement"),
                (["vertical_pull", "horizontal_pull", "row", "pull_up"], "pulling movement")
            ]
            
            for pattern_list, description in required_patterns:
                if not self._has_pattern(movement_patterns, pattern_list):
                    violations.append(f"Full body focus requires {description}")
        
        return violations
    
    def _validate_combo_focus(self, exercises: List[Dict[str, Any]], focusA: str, focusB: str, weightA: float, allowed_exercises: List[str]) -> List[str]:
        """Validate combo focus requirements."""
        violations = []
        
        # Validate each focus component
        violations.extend(self._validate_single_focus(exercises, focusA, allowed_exercises))
        violations.extend(self._validate_single_focus(exercises, focusB, allowed_exercises))
        
        # Check allocation balance
        muscle_families = self._get_muscle_families(exercises)
        focusA_families = get_muscle_families_for_focus(focusA)
        focusB_families = get_muscle_families_for_focus(focusB)
        
        focusA_sets = self._count_sets_for_families(exercises, focusA_families)
        focusB_sets = self._count_sets_for_families(exercises, focusB_families)
        total_sets = focusA_sets + focusB_sets
        
        if total_sets > 0:
            actual_weightA = focusA_sets / total_sets
            if abs(actual_weightA - weightA) > 0.3:  # Allow 30% deviation
                expected_pct = int(weightA * 100)
                actual_pct = int(actual_weightA * 100)
                violations.append(f"Combo balance off: expected {expected_pct}% {focusA}, got {actual_pct}%")
        
        return violations
    
    def _validate_volume_bounds(self, exercises: List[Dict[str, Any]], focus: str) -> List[str]:
        """Validate total volume is within reasonable bounds."""
        violations = []
        
        total_sets = sum(
            exercise.get('sets', 0) * exercise.get('reps', 1) 
            for exercise in exercises
            if isinstance(exercise.get('sets'), int)
        )
        
        # Simple bounds check
        if total_sets > 250:  # Very high volume
            violations.append(f"Volume too high: {total_sets} total reps (consider reducing)")
        elif total_sets < 30:  # Very low volume
            violations.append(f"Volume too low: {total_sets} total reps (consider increasing)")
        
        return violations
    
    def _get_movement_patterns(self, exercises: List[Dict[str, Any]]) -> List[str]:
        """Extract movement patterns from exercises."""
        patterns = []
        
        for exercise in exercises:
            exercise_id = exercise.get('exerciseId') or exercise.get('id')
            if exercise_id:
                exercise_data = self.exercise_db.get_exercise_by_id(exercise_id)
                if exercise_data:
                    patterns.extend(exercise_data.get('movement_patterns', []))
        
        return patterns
    
    def _get_muscle_families(self, exercises: List[Dict[str, Any]]) -> Set[str]:
        """Extract muscle families from exercises."""
        families = set()
        
        for exercise in exercises:
            exercise_id = exercise.get('exerciseId') or exercise.get('id')
            if exercise_id:
                exercise_data = self.exercise_db.get_exercise_by_id(exercise_id)
                if exercise_data:
                    families.update(exercise_data.get('muscle_families', []))
        
        return families
    
    def _has_pattern(self, movement_patterns: List[str], required_patterns: List[str]) -> bool:
        """Check if any required pattern is present."""
        return any(pattern in movement_patterns for pattern in required_patterns)
    
    def _count_sets_for_families(self, exercises: List[Dict[str, Any]], target_families: List[str]) -> int:
        """Count sets targeting specific muscle families."""
        total_sets = 0
        
        for exercise in exercises:
            exercise_id = exercise.get('exerciseId') or exercise.get('id')
            if exercise_id:
                exercise_data = self.exercise_db.get_exercise_by_id(exercise_id)
                if exercise_data:
                    families = exercise_data.get('muscle_families', [])
                    if any(family in families for family in target_families):
                        total_sets += exercise.get('sets', 0)
        
        return total_sets
