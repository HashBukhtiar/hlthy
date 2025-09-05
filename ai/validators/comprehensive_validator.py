"""
Comprehensive Focus Validator - Enhanced validation with segment awareness and safety
"""
from typing import Dict, List, Any, Optional, Tuple, Set
from dataclasses import dataclass
from enum import Enum
import re

from core.exercise_database import ExerciseDatabase
from core.technique_library_complete import TechniqueLibrary
from core.equipment_catalog import EquipmentCatalog


class ValidationLevel(Enum):
    """Validation severity levels"""
    ERROR = "error"          # Critical issues that prevent workout
    WARNING = "warning"      # Issues that should be addressed
    INFO = "info"           # Suggestions for improvement
    SUCCESS = "success"     # Validation passed


@dataclass
class ValidationResult:
    """Individual validation result"""
    level: ValidationLevel
    category: str
    message: str
    exercise_id: Optional[str] = None
    suggestion: Optional[str] = None
    auto_fix_available: bool = False


@dataclass
class WorkoutValidationSummary:
    """Complete workout validation summary"""
    is_valid: bool
    total_issues: int
    errors: List[ValidationResult]
    warnings: List[ValidationResult]
    info: List[ValidationResult]
    success_items: List[ValidationResult]
    auto_fixes_applied: List[str]
    
    def get_issues_by_category(self, category: str) -> List[ValidationResult]:
        """Get all issues for a specific category"""
        all_issues = self.errors + self.warnings + self.info
        return [issue for issue in all_issues if issue.category == category]
    
    def has_critical_errors(self) -> bool:
        """Check if there are any critical errors"""
        return len(self.errors) > 0
    
    def get_summary_text(self) -> str:
        """Get human-readable summary"""
        if self.is_valid:
            return f"✅ Workout validation passed with {len(self.warnings)} warnings and {len(self.info)} suggestions"
        else:
            return f"❌ Workout validation failed with {len(self.errors)} errors, {len(self.warnings)} warnings"


class ComprehensiveFocusValidator:
    """
    Enhanced validator with segment awareness, safety analysis, and auto-correction
    """
    
    def __init__(self, exercise_db: ExerciseDatabase):
        self.exercise_db = exercise_db
        self.technique_library = TechniqueLibrary()
        self.equipment_catalog = EquipmentCatalog()
        
        # Validation rules and limits
        self.max_exercises_per_workout = 15
        self.max_sets_per_exercise = 8
        self.max_total_sets = 30
        self.min_rest_between_sets = 30  # seconds
        self.max_workout_duration = 180  # minutes
        
        # Segment validation rules
        self.segment_rules = {
            'warm_up': {
                'max_exercises': 5,
                'required_types': ['cardio_warmup', 'activation', 'mobility'],
                'max_duration': 15  # minutes
            },
            'main_workout': {
                'min_exercises': 3,
                'max_exercises': 12,
                'required_focus_coverage': 0.8  # 80% of exercises should target primary focus
            },
            'cool_down': {
                'max_exercises': 4,
                'required_types': ['stretch', 'cooldown'],
                'min_duration': 5  # minutes
            }
        }
    
    def validate_complete_workout(self, workout_plan: Dict[str, Any], 
                                context: Dict[str, Any] = None) -> WorkoutValidationSummary:
        """
        Comprehensive workout validation
        
        Args:
            workout_plan: Complete workout plan to validate
            context: Additional context (user profile, equipment, etc.)
            
        Returns:
            Complete validation summary
        """
        context = context or {}
        results = []
        auto_fixes = []
        
        # Structure validation
        results.extend(self._validate_workout_structure(workout_plan))
        
        # Exercise validation
        exercise_results, fixes = self._validate_exercises(workout_plan, context)
        results.extend(exercise_results)
        auto_fixes.extend(fixes)
        
        # Segment validation
        results.extend(self._validate_segments(workout_plan, context))
        
        # Focus alignment validation
        results.extend(self._validate_focus_alignment(workout_plan, context))
        
        # Safety validation
        results.extend(self._validate_safety_considerations(workout_plan, context))
        
        # Equipment validation
        results.extend(self._validate_equipment_requirements(workout_plan, context))
        
        # Volume and intensity validation
        results.extend(self._validate_volume_and_intensity(workout_plan, context))
        
        # Time and duration validation
        results.extend(self._validate_timing(workout_plan, context))
        
        # Balance and progression validation
        results.extend(self._validate_balance_and_progression(workout_plan, context))
        
        # Categorize results
        errors = [r for r in results if r.level == ValidationLevel.ERROR]
        warnings = [r for r in results if r.level == ValidationLevel.WARNING]
        info = [r for r in results if r.level == ValidationLevel.INFO]
        success = [r for r in results if r.level == ValidationLevel.SUCCESS]
        
        # Determine overall validity
        is_valid = len(errors) == 0
        
        return WorkoutValidationSummary(
            is_valid=is_valid,
            total_issues=len(errors) + len(warnings) + len(info),
            errors=errors,
            warnings=warnings,
            info=info,
            success_items=success,
            auto_fixes_applied=auto_fixes
        )
    
    def _validate_workout_structure(self, workout_plan: Dict[str, Any]) -> List[ValidationResult]:
        """Validate basic workout structure"""
        results = []
        
        # Check required fields
        required_fields = ['focus', 'exercises']
        for field in required_fields:
            if field not in workout_plan:
                results.append(ValidationResult(
                    level=ValidationLevel.ERROR,
                    category="structure",
                    message=f"Missing required field: {field}",
                    suggestion=f"Add {field} to workout plan"
                ))
        
        # Check exercises list
        exercises = workout_plan.get('exercises', [])
        if not isinstance(exercises, list):
            results.append(ValidationResult(
                level=ValidationLevel.ERROR,
                category="structure",
                message="Exercises must be a list",
                suggestion="Format exercises as a list of exercise objects"
            ))
        elif len(exercises) == 0:
            results.append(ValidationResult(
                level=ValidationLevel.ERROR,
                category="structure",
                message="No exercises found in workout",
                suggestion="Add at least 3 exercises to the workout"
            ))
        elif len(exercises) > self.max_exercises_per_workout:
            results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                category="structure",
                message=f"Too many exercises ({len(exercises)}). Recommended maximum: {self.max_exercises_per_workout}",
                suggestion="Consider reducing number of exercises or splitting into multiple workouts"
            ))
        else:
            results.append(ValidationResult(
                level=ValidationLevel.SUCCESS,
                category="structure",
                message=f"Good exercise count: {len(exercises)} exercises"
            ))
        
        return results
    
    def _validate_exercises(self, workout_plan: Dict[str, Any], 
                          context: Dict[str, Any]) -> Tuple[List[ValidationResult], List[str]]:
        """Validate individual exercises"""
        results = []
        auto_fixes = []
        exercises = workout_plan.get('exercises', [])
        
        exercise_ids = []
        duplicate_exercises = set()
        
        for i, exercise in enumerate(exercises):
            exercise_id = exercise.get('exercise_id')
            
            # Check for exercise ID
            if not exercise_id:
                results.append(ValidationResult(
                    level=ValidationLevel.ERROR,
                    category="exercises",
                    message=f"Exercise {i+1} missing exercise_id",
                    suggestion="Add valid exercise_id to each exercise"
                ))
                continue
            
            # Check for duplicates
            if exercise_id in exercise_ids:
                duplicate_exercises.add(exercise_id)
            exercise_ids.append(exercise_id)
            
            # Validate exercise exists in database
            exercise_data = self.exercise_db.get_exercise_by_id(exercise_id)
            if not exercise_data:
                results.append(ValidationResult(
                    level=ValidationLevel.ERROR,
                    category="exercises",
                    message=f"Unknown exercise: {exercise_id}",
                    exercise_id=exercise_id,
                    suggestion="Use valid exercise_id from exercise database"
                ))
                continue
            
            # Validate sets and reps
            sets_validation = self._validate_sets_and_reps(exercise, exercise_data)
            results.extend(sets_validation)
            
            # Validate exercise-specific requirements
            exercise_validation = self._validate_exercise_requirements(exercise, exercise_data, context)
            results.extend(exercise_validation)
        
        # Report duplicates
        for duplicate_id in duplicate_exercises:
            results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                category="exercises",
                message=f"Duplicate exercise found: {duplicate_id}",
                exercise_id=duplicate_id,
                suggestion="Remove duplicate or use variation"
            ))
        
        return results, auto_fixes
    
    def _validate_sets_and_reps(self, exercise: Dict[str, Any], 
                              exercise_data: Dict[str, Any]) -> List[ValidationResult]:
        """Validate sets and reps for an exercise"""
        results = []
        exercise_id = exercise.get('exercise_id')
        
        # Check sets
        sets = exercise.get('sets')
        if sets is None:
            results.append(ValidationResult(
                level=ValidationLevel.ERROR,
                category="programming",
                message=f"Missing sets for {exercise_id}",
                exercise_id=exercise_id,
                suggestion="Add sets field (e.g., 3)"
            ))
        elif not isinstance(sets, int) or sets <= 0:
            results.append(ValidationResult(
                level=ValidationLevel.ERROR,
                category="programming",
                message=f"Invalid sets value for {exercise_id}: {sets}",
                exercise_id=exercise_id,
                suggestion="Sets must be positive integer"
            ))
        elif sets > self.max_sets_per_exercise:
            results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                category="programming",
                message=f"High set count for {exercise_id}: {sets}",
                exercise_id=exercise_id,
                suggestion=f"Consider reducing to {self.max_sets_per_exercise} or fewer sets"
            ))
        
        # Check reps
        reps = exercise.get('reps')
        if reps is None:
            results.append(ValidationResult(
                level=ValidationLevel.ERROR,
                category="programming",
                message=f"Missing reps for {exercise_id}",
                exercise_id=exercise_id,
                suggestion="Add reps field (e.g., '8-10' or 12)"
            ))
        else:
            # Validate rep format (can be number, range, or 'AMRAP')
            if isinstance(reps, str):
                if not re.match(r'^\d+(-\d+)?$|^AMRAP$|^max$', reps.upper()):
                    results.append(ValidationResult(
                        level=ValidationLevel.WARNING,
                        category="programming",
                        message=f"Unusual rep format for {exercise_id}: {reps}",
                        exercise_id=exercise_id,
                        suggestion="Use format like '8-10', '12', or 'AMRAP'"
                    ))
        
        return results
    
    def _validate_exercise_requirements(self, exercise: Dict[str, Any], 
                                      exercise_data: Dict[str, Any],
                                      context: Dict[str, Any]) -> List[ValidationResult]:
        """Validate exercise-specific requirements"""
        results = []
        exercise_id = exercise.get('exercise_id')
        
        # Check equipment requirements
        required_equipment = exercise_data.get('equipment', [])
        available_equipment = context.get('available_equipment', [])
        
        missing_equipment = []
        if required_equipment and available_equipment:
            for equip in required_equipment:
                if equip not in available_equipment:
                    missing_equipment.append(equip)
        
        if missing_equipment:
            # Try to find alternatives
            alternatives = self.equipment_catalog.find_alternatives(exercise_id, available_equipment)
            if alternatives:
                results.append(ValidationResult(
                    level=ValidationLevel.WARNING,
                    category="equipment",
                    message=f"Missing equipment for {exercise_id}: {', '.join(missing_equipment)}",
                    exercise_id=exercise_id,
                    suggestion=f"Consider alternatives: {', '.join(alternatives[:2])}",
                    auto_fix_available=True
                ))
            else:
                results.append(ValidationResult(
                    level=ValidationLevel.ERROR,
                    category="equipment",
                    message=f"Required equipment unavailable for {exercise_id}: {', '.join(missing_equipment)}",
                    exercise_id=exercise_id,
                    suggestion="Remove exercise or find alternative"
                ))
        
        # Check experience level appropriateness
        exercise_difficulty = exercise_data.get('difficulty_level', 'intermediate')
        user_experience = context.get('experience_level', 'intermediate')
        
        difficulty_levels = {'beginner': 1, 'intermediate': 2, 'advanced': 3}
        if difficulty_levels.get(exercise_difficulty, 2) > difficulty_levels.get(user_experience, 2) + 1:
            results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                category="difficulty",
                message=f"{exercise_id} may be too advanced for {user_experience} level",
                exercise_id=exercise_id,
                suggestion="Consider easier variation or progression"
            ))
        
        return results
    
    def _validate_segments(self, workout_plan: Dict[str, Any], 
                         context: Dict[str, Any]) -> List[ValidationResult]:
        """Validate workout segments (warm-up, main, cool-down)"""
        results = []
        
        # Check for segment organization
        has_warmup = 'warm_up' in workout_plan or any(
            ex.get('segment') == 'warm_up' for ex in workout_plan.get('exercises', [])
        )
        has_cooldown = 'cool_down' in workout_plan or any(
            ex.get('segment') == 'cool_down' for ex in workout_plan.get('exercises', [])
        )
        
        if not has_warmup:
            results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                category="segments",
                message="No warm-up exercises found",
                suggestion="Add 5-10 minutes of warm-up exercises"
            ))
        
        if not has_cooldown:
            results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                category="segments",
                message="No cool-down exercises found",
                suggestion="Add 5-10 minutes of cool-down/stretching"
            ))
        
        # Validate segment-specific rules
        for segment, rules in self.segment_rules.items():
            segment_exercises = []
            
            # Get exercises for this segment
            if segment in workout_plan:
                segment_exercises = workout_plan[segment]
            else:
                segment_exercises = [
                    ex for ex in workout_plan.get('exercises', [])
                    if ex.get('segment') == segment
                ]
            
            if not segment_exercises:
                continue
            
            # Check exercise count
            if len(segment_exercises) > rules.get('max_exercises', float('inf')):
                results.append(ValidationResult(
                    level=ValidationLevel.WARNING,
                    category="segments",
                    message=f"Too many {segment} exercises: {len(segment_exercises)}",
                    suggestion=f"Limit {segment} to {rules['max_exercises']} exercises"
                ))
            
            # Check required types (for warm-up and cool-down)
            if 'required_types' in rules:
                required_types = rules['required_types']
                present_types = set()
                
                for ex in segment_exercises:
                    exercise_id = ex.get('exercise_id')
                    if exercise_id:
                        exercise_data = self.exercise_db.get_exercise_by_id(exercise_id)
                        if exercise_data:
                            # Check segment flags
                            if exercise_data.get('isCardioWarmup') and 'cardio_warmup' in required_types:
                                present_types.add('cardio_warmup')
                            if exercise_data.get('isActivation') and 'activation' in required_types:
                                present_types.add('activation')
                            if exercise_data.get('isMobility') and 'mobility' in required_types:
                                present_types.add('mobility')
                            if exercise_data.get('isStretch') and 'stretch' in required_types:
                                present_types.add('stretch')
                            if exercise_data.get('isCooldownSafe') and 'cooldown' in required_types:
                                present_types.add('cooldown')
                
                missing_types = set(required_types) - present_types
                if missing_types:
                    results.append(ValidationResult(
                        level=ValidationLevel.INFO,
                        category="segments",
                        message=f"Missing {segment} types: {', '.join(missing_types)}",
                        suggestion=f"Consider adding {', '.join(missing_types)} exercises to {segment}"
                    ))
        
        # Task B.3: Validate segment anti-duplication
        results.extend(self._validate_segment_anti_duplication(workout_plan))
        
        return results
    
    def _validate_segment_anti_duplication(self, workout_plan: Dict[str, Any]) -> List[ValidationResult]:
        """Validate no exercise duplication between segments"""
        results = []
        
        # Collect exercise IDs from each segment
        warmup_ids = set()
        cooldown_ids = set()
        main_ids = set()
        
        exercises = workout_plan.get('exercises', [])
        
        # Also check segment-specific keys
        if 'warmup' in workout_plan:
            warmup_ids.update(ex.get('exercise_id') for ex in workout_plan['warmup'] if ex.get('exercise_id'))
        if 'cooldown' in workout_plan:
            cooldown_ids.update(ex.get('exercise_id') for ex in workout_plan['cooldown'] if ex.get('exercise_id'))
        if 'main' in workout_plan:
            main_ids.update(ex.get('exercise_id') for ex in workout_plan['main'] if ex.get('exercise_id'))
        
        # Collect from exercises list with segment tags
        for ex in exercises:
            exercise_id = ex.get('exercise_id')
            if not exercise_id:
                continue
                
            segment = ex.get('segment', 'main')
            if segment in ['warm_up', 'warmup']:
                warmup_ids.add(exercise_id)
            elif segment in ['cool_down', 'cooldown']:
                cooldown_ids.add(exercise_id)
            else:
                main_ids.add(exercise_id)
        
        # Check for overlaps
        warmup_cooldown_overlap = warmup_ids & cooldown_ids
        warmup_main_overlap = warmup_ids & main_ids
        cooldown_main_overlap = cooldown_ids & main_ids
        
        if warmup_cooldown_overlap:
            results.append(ValidationResult(
                level=ValidationLevel.ERROR,
                category="segments",
                message=f"Exercise duplication between warm-up and cool-down: {', '.join(warmup_cooldown_overlap)}",
                suggestion="Remove duplicate exercises from one segment"
            ))
        
        if warmup_main_overlap:
            results.append(ValidationResult(
                level=ValidationLevel.ERROR,
                category="segments", 
                message=f"Exercise duplication between warm-up and main: {', '.join(warmup_main_overlap)}",
                suggestion="Remove duplicate exercises from warm-up"
            ))
        
        if cooldown_main_overlap:
            results.append(ValidationResult(
                level=ValidationLevel.ERROR,
                category="segments",
                message=f"Exercise duplication between cool-down and main: {', '.join(cooldown_main_overlap)}",
                suggestion="Remove duplicate exercises from cool-down"
            ))
        
        # Task B.3: Validate segment role compliance
        results.extend(self._validate_segment_role_compliance(warmup_ids, cooldown_ids))
        
        return results
    
    def _validate_segment_role_compliance(self, warmup_ids: set, cooldown_ids: set) -> List[ValidationResult]:
        """Validate that exercises have appropriate roles for their segments"""
        results = []
        
        # Import here to avoid circular imports
        try:
            from ..core.exercise_database import CANONICAL_EXERCISES
        except ImportError:
            return results
        
        # Check warm-up compliance
        for exercise_id in warmup_ids:
            exercise = CANONICAL_EXERCISES.get(exercise_id)
            if exercise:
                # Warm-up should only contain cardio warmup or activation exercises
                if not (exercise.isCardioWarmup or exercise.isActivation):
                    results.append(ValidationResult(
                        level=ValidationLevel.ERROR,
                        category="segments",
                        message=f"Inappropriate warm-up exercise: {exercise_id}",
                        exercise_id=exercise_id,
                        suggestion="Replace with cardio warm-up or activation exercise"
                    ))
                
                # Warm-up should not contain stretch/mobility
                if exercise.isMobility or exercise.isStretch:
                    results.append(ValidationResult(
                        level=ValidationLevel.ERROR,
                        category="segments",
                        message=f"Warm-up contains stretch/mobility exercise: {exercise_id}",
                        exercise_id=exercise_id,
                        suggestion="Move to cool-down or replace with activation exercise"
                    ))
        
        # Check cool-down compliance
        for exercise_id in cooldown_ids:
            exercise = CANONICAL_EXERCISES.get(exercise_id)
            if exercise:
                # Cool-down should only contain mobility or stretch exercises
                if not (exercise.isMobility or exercise.isStretch):
                    results.append(ValidationResult(
                        level=ValidationLevel.ERROR,
                        category="segments",
                        message=f"Inappropriate cool-down exercise: {exercise_id}",
                        exercise_id=exercise_id,
                        suggestion="Replace with mobility or stretch exercise"
                    ))
                
                # Cool-down should not contain activation
                if exercise.isActivation:
                    results.append(ValidationResult(
                        level=ValidationLevel.ERROR,
                        category="segments",
                        message=f"Cool-down contains activation exercise: {exercise_id}",
                        exercise_id=exercise_id,
                        suggestion="Move to warm-up or replace with stretch exercise"
                    ))
        
        return results
    
    def _validate_focus_alignment(self, workout_plan: Dict[str, Any], 
                                context: Dict[str, Any]) -> List[ValidationResult]:
        """Validate that exercises align with stated focus"""
        results = []
        
        workout_focus = workout_plan.get('focus')
        if not workout_focus:
            return results
        
        exercises = workout_plan.get('exercises', [])
        main_exercises = [ex for ex in exercises if ex.get('segment') != 'warm_up' and ex.get('segment') != 'cool_down']
        
        if not main_exercises:
            return results
        
        # Count focus-aligned exercises
        aligned_exercises = 0
        total_exercises = len(main_exercises)
        
        for exercise in main_exercises:
            exercise_id = exercise.get('exercise_id')
            if not exercise_id:
                continue
            
            exercise_data = self.exercise_db.get_exercise_by_id(exercise_id)
            if not exercise_data:
                continue
            
            # Check if exercise targets the focus
            if self._exercise_matches_focus(exercise_data, workout_focus):
                aligned_exercises += 1
        
        alignment_percentage = (aligned_exercises / total_exercises) * 100 if total_exercises > 0 else 0
        
        if alignment_percentage < 60:
            results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                category="focus_alignment",
                message=f"Low focus alignment: {alignment_percentage:.1f}% of exercises target {workout_focus}",
                suggestion="Replace some exercises with ones that better target the stated focus"
            ))
        elif alignment_percentage >= 80:
            results.append(ValidationResult(
                level=ValidationLevel.SUCCESS,
                category="focus_alignment",
                message=f"Excellent focus alignment: {alignment_percentage:.1f}% of exercises target {workout_focus}"
            ))
        else:
            results.append(ValidationResult(
                level=ValidationLevel.INFO,
                category="focus_alignment",
                message=f"Good focus alignment: {alignment_percentage:.1f}% of exercises target {workout_focus}"
            ))
        
        return results
    
    def _validate_safety_considerations(self, workout_plan: Dict[str, Any], 
                                      context: Dict[str, Any]) -> List[ValidationResult]:
        """Validate safety considerations"""
        results = []
        
        user_injuries = context.get('injuries', [])
        user_experience = context.get('experience_level', 'intermediate')
        
        exercises = workout_plan.get('exercises', [])
        
        for exercise in exercises:
            exercise_id = exercise.get('exercise_id')
            if not exercise_id:
                continue
            
            # Get safety analysis from technique library
            safety_analysis = self.technique_library.analyze_exercise_safety(exercise_id, user_injuries)
            
            if 'error' in safety_analysis:
                continue
            
            safety_status = safety_analysis.get('safety_status')
            
            if safety_status == 'not_recommended':
                results.append(ValidationResult(
                    level=ValidationLevel.ERROR,
                    category="safety",
                    message=f"Exercise {exercise_id} not recommended due to injury contraindications",
                    exercise_id=exercise_id,
                    suggestion="Remove exercise or consult medical professional"
                ))
            elif safety_status == 'proceed_with_caution':
                results.append(ValidationResult(
                    level=ValidationLevel.WARNING,
                    category="safety",
                    message=f"Exercise {exercise_id} requires caution due to injury history",
                    exercise_id=exercise_id,
                    suggestion="Use modifications and monitor closely"
                ))
            
            # Check for high-risk exercises for beginners
            technique_guide = self.technique_library.get_technique_guide(exercise_id)
            if technique_guide and technique_guide.get_safety_rating() == 'high_risk' and user_experience == 'beginner':
                results.append(ValidationResult(
                    level=ValidationLevel.WARNING,
                    category="safety",
                    message=f"High-risk exercise for beginners: {exercise_id}",
                    exercise_id=exercise_id,
                    suggestion="Consider easier variation or ensure proper supervision"
                ))
        
        return results
    
    def _validate_equipment_requirements(self, workout_plan: Dict[str, Any], 
                                       context: Dict[str, Any]) -> List[ValidationResult]:
        """Validate equipment requirements"""
        results = []
        
        available_equipment = context.get('available_equipment', [])
        if not available_equipment:
            return results
        
        exercises = workout_plan.get('exercises', [])
        equipment_conflicts = []
        
        for exercise in exercises:
            exercise_id = exercise.get('exercise_id')
            if not exercise_id:
                continue
            
            exercise_data = self.exercise_db.get_exercise_by_id(exercise_id)
            if not exercise_data:
                continue
            
            required_equipment = exercise_data.get('equipment', [])
            if required_equipment:
                missing = [eq for eq in required_equipment if eq not in available_equipment]
                if missing:
                    equipment_conflicts.append({
                        'exercise_id': exercise_id,
                        'missing_equipment': missing
                    })
        
        if equipment_conflicts:
            total_conflicts = len(equipment_conflicts)
            results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                category="equipment",
                message=f"{total_conflicts} exercises have equipment conflicts",
                suggestion="Review equipment requirements or find alternatives"
            ))
        
        return results
    
    def _validate_volume_and_intensity(self, workout_plan: Dict[str, Any], 
                                     context: Dict[str, Any]) -> List[ValidationResult]:
        """Validate workout volume and intensity"""
        results = []
        
        exercises = workout_plan.get('exercises', [])
        total_sets = 0
        high_intensity_exercises = 0
        
        for exercise in exercises:
            if exercise.get('segment') in ['warm_up', 'cool_down']:
                continue
            
            sets = exercise.get('sets', 0)
            if isinstance(sets, int):
                total_sets += sets
            
            # Check for high-intensity indicators
            reps = exercise.get('reps', '')
            if isinstance(reps, str) and ('1-' in reps or reps.startswith('1') or 'max' in reps.lower()):
                high_intensity_exercises += 1
        
        # Validate total sets
        if total_sets > self.max_total_sets:
            results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                category="volume",
                message=f"High total set count: {total_sets}",
                suggestion=f"Consider reducing to {self.max_total_sets} or fewer total sets"
            ))
        elif total_sets < 8:
            results.append(ValidationResult(
                level=ValidationLevel.INFO,
                category="volume",
                message=f"Low total set count: {total_sets}",
                suggestion="Consider adding more volume if appropriate for goals"
            ))
        
        # Validate intensity distribution
        if high_intensity_exercises > 3:
            results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                category="intensity",
                message=f"Many high-intensity exercises: {high_intensity_exercises}",
                suggestion="Balance high-intensity work with moderate intensity exercises"
            ))
        
        return results
    
    def _validate_timing(self, workout_plan: Dict[str, Any], 
                       context: Dict[str, Any]) -> List[ValidationResult]:
        """Validate workout timing and duration"""
        results = []
        
        # Estimate workout duration
        exercises = workout_plan.get('exercises', [])
        estimated_duration = 0
        
        for exercise in exercises:
            sets = exercise.get('sets', 3)
            if isinstance(sets, int):
                # Estimate: 45 seconds per set + 90 seconds rest
                estimated_duration += sets * (45 + 90)  # seconds
        
        estimated_minutes = estimated_duration / 60
        
        # Check against available time
        available_time = context.get('available_time')
        if available_time:
            # Parse available time (e.g., "60_minutes")
            if isinstance(available_time, str) and '_minutes' in available_time:
                try:
                    available_minutes = int(available_time.split('_')[0])
                    if estimated_minutes > available_minutes * 1.2:  # 20% buffer
                        results.append(ValidationResult(
                            level=ValidationLevel.WARNING,
                            category="timing",
                            message=f"Workout may exceed available time: {estimated_minutes:.0f} min vs {available_minutes} min",
                            suggestion="Reduce exercises or sets to fit time constraints"
                        ))
                except:
                    pass
        
        # Check for excessive duration
        if estimated_minutes > self.max_workout_duration:
            results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                category="timing",
                message=f"Very long workout: {estimated_minutes:.0f} minutes",
                suggestion="Consider splitting into multiple sessions"
            ))
        
        return results
    
    def _validate_balance_and_progression(self, workout_plan: Dict[str, Any], 
                                        context: Dict[str, Any]) -> List[ValidationResult]:
        """Validate muscle balance and movement patterns"""
        results = []
        
        exercises = workout_plan.get('exercises', [])
        main_exercises = [ex for ex in exercises if ex.get('segment') not in ['warm_up', 'cool_down']]
        
        # Count movement patterns
        movement_patterns = {}
        muscle_groups = {}
        
        for exercise in main_exercises:
            exercise_id = exercise.get('exercise_id')
            if not exercise_id:
                continue
            
            exercise_data = self.exercise_db.get_exercise_by_id(exercise_id)
            if not exercise_data:
                continue
            
            # Count movement patterns
            patterns = exercise_data.get('movement_patterns', [])
            for pattern in patterns:
                movement_patterns[pattern] = movement_patterns.get(pattern, 0) + 1
            
            # Count muscle families
            muscles = exercise_data.get('muscle_families', [])
            for muscle in muscles:
                muscle_groups[muscle] = muscle_groups.get(muscle, 0) + 1
        
        # Check for balance issues
        push_count = movement_patterns.get('push', 0)
        pull_count = movement_patterns.get('pull', 0)
        
        if push_count > 0 and pull_count == 0:
            results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                category="balance",
                message="Push exercises without pull exercises",
                suggestion="Add pulling exercises for muscle balance"
            ))
        elif pull_count > 0 and push_count == 0:
            results.append(ValidationResult(
                level=ValidationLevel.WARNING,
                category="balance",
                message="Pull exercises without push exercises",
                suggestion="Add pushing exercises for muscle balance"
            ))
        elif push_count > 0 and pull_count > 0:
            ratio = push_count / pull_count
            if ratio > 1.5:
                results.append(ValidationResult(
                    level=ValidationLevel.INFO,
                    category="balance",
                    message="More push than pull exercises",
                    suggestion="Consider adding more pulling exercises"
                ))
            elif ratio < 0.67:
                results.append(ValidationResult(
                    level=ValidationLevel.INFO,
                    category="balance",
                    message="More pull than push exercises",
                    suggestion="Consider adding more pushing exercises"
                ))
        
        return results
    
    def _exercise_matches_focus(self, exercise_data: Dict[str, Any], focus: str) -> bool:
        """Check if exercise matches the workout focus"""
        muscle_families = exercise_data.get('muscle_families', [])
        
        # Focus mapping
        focus_muscles = {
            'chest': ['chest', 'pectorals'],
            'back': ['back', 'lats', 'rhomboids', 'middle_traps'],
            'shoulders': ['shoulders', 'anterior_delts', 'medial_delts', 'posterior_delts'],
            'arms': ['biceps', 'triceps', 'forearms'],
            'legs': ['quads', 'hamstrings', 'glutes', 'calves'],
            'quads': ['quads', 'quadriceps'],
            'hamstrings': ['hamstrings'],
            'glutes': ['glutes'],
            'calves': ['calves'],
            'core': ['abs', 'obliques', 'core'],
            'upper': ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
            'lower': ['quads', 'hamstrings', 'glutes', 'calves'],
            'push': ['chest', 'shoulders', 'triceps'],
            'pull': ['back', 'biceps', 'rear_delts']
        }
        
        target_muscles = focus_muscles.get(focus, [focus])
        
        # Check for overlap
        return any(muscle.lower() in [tm.lower() for tm in target_muscles] for muscle in muscle_families)
    
    def suggest_workout_improvements(self, workout_plan: Dict[str, Any], 
                                   validation_summary: WorkoutValidationSummary,
                                   context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Suggest specific improvements based on validation results
        
        Args:
            workout_plan: Original workout plan
            validation_summary: Validation results
            context: Additional context
            
        Returns:
            Improvement suggestions
        """
        suggestions = {
            'priority_fixes': [],
            'balance_improvements': [],
            'safety_improvements': [],
            'equipment_alternatives': [],
            'progression_suggestions': []
        }
        
        context = context or {}
        
        # Priority fixes from errors
        for error in validation_summary.errors:
            suggestions['priority_fixes'].append({
                'issue': error.message,
                'category': error.category,
                'exercise_id': error.exercise_id,
                'fix': error.suggestion
            })
        
        # Balance improvements
        balance_warnings = validation_summary.get_issues_by_category('balance')
        for warning in balance_warnings:
            suggestions['balance_improvements'].append({
                'issue': warning.message,
                'improvement': warning.suggestion
            })
        
        # Safety improvements
        safety_issues = validation_summary.get_issues_by_category('safety')
        for issue in safety_issues:
            suggestions['safety_improvements'].append({
                'issue': issue.message,
                'exercise_id': issue.exercise_id,
                'improvement': issue.suggestion
            })
        
        # Equipment alternatives
        equipment_issues = validation_summary.get_issues_by_category('equipment')
        for issue in equipment_issues:
            if issue.auto_fix_available:
                # Find specific alternatives
                alternatives = self.equipment_catalog.find_alternatives(
                    issue.exercise_id, 
                    context.get('available_equipment', [])
                )
                suggestions['equipment_alternatives'].append({
                    'original_exercise': issue.exercise_id,
                    'alternatives': alternatives[:3],  # Top 3 alternatives
                    'reason': issue.message
                })
        
        return suggestions
