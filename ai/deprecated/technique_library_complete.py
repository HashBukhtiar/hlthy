"""
Technique Library - Comprehensive exercise form guidance and safety analysis
"""
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum


class FormCheckpoint(Enum):
    """Form checkpoints for exercise analysis"""
    SETUP = "setup"
    EXECUTION = "execution"
    SAFETY = "safety"
    COMMON_ERRORS = "common_errors"
    PROGRESSIONS = "progressions"


@dataclass
class SafetyConsideration:
    """Safety consideration for an exercise"""
    injury_risk: str
    risk_level: str  # "low", "medium", "high"
    prevention_tips: List[str]
    contraindications: List[str]
    modifications: List[str]


@dataclass
class FormCue:
    """Individual form cue for exercise"""
    checkpoint: FormCheckpoint
    description: str
    priority: str  # "critical", "important", "helpful"
    common_mistake: str
    correction: str


@dataclass
class TechniqueGuide:
    """Complete technique guide for an exercise"""
    exercise_id: str
    exercise_name: str
    movement_pattern: str
    difficulty_level: str  # "beginner", "intermediate", "advanced"
    
    # Setup and execution
    setup_cues: List[FormCue]
    execution_cues: List[FormCue]
    breathing_pattern: str
    
    # Safety and modifications
    safety_considerations: List[SafetyConsideration]
    beginner_modifications: List[str]
    advanced_progressions: List[str]
    
    # Common issues
    common_errors: List[Dict[str, str]]
    injury_prevention: List[str]
    
    # Equipment and alternatives
    required_equipment: List[str]
    alternative_exercises: List[str]
    
    def get_priority_cues(self, priority: str = "critical") -> List[FormCue]:
        """Get cues by priority level"""
        all_cues = self.setup_cues + self.execution_cues
        return [cue for cue in all_cues if cue.priority == priority]
    
    def get_safety_rating(self) -> str:
        """Get overall safety rating for exercise"""
        if not self.safety_considerations:
            return "unknown"
        
        risk_levels = [safety.risk_level for safety in self.safety_considerations]
        if "high" in risk_levels:
            return "high_risk"
        elif "medium" in risk_levels:
            return "medium_risk"
        else:
            return "low_risk"


class TechniqueLibrary:
    """
    Comprehensive technique library with form analysis and safety guidance
    """
    
    def __init__(self):
        self.technique_guides: Dict[str, TechniqueGuide] = {}
        self.movement_patterns: Dict[str, List[str]] = {}
        self.injury_database: Dict[str, List[str]] = {}
        
        # Initialize with comprehensive exercise library
        self._initialize_technique_guides()
        self._initialize_movement_patterns()
        self._initialize_injury_database()
    
    def get_technique_guide(self, exercise_id: str) -> Optional[TechniqueGuide]:
        """
        Get complete technique guide for an exercise
        
        Args:
            exercise_id: Exercise identifier
            
        Returns:
            TechniqueGuide or None if not found
        """
        return self.technique_guides.get(exercise_id)
    
    def get_form_analysis(self, exercise_id: str, 
                         user_experience: str = "intermediate") -> Dict[str, Any]:
        """
        Get form analysis tailored to user experience level
        
        Args:
            exercise_id: Exercise identifier
            user_experience: User's experience level
            
        Returns:
            Tailored form analysis
        """
        guide = self.get_technique_guide(exercise_id)
        if not guide:
            return {'error': f'No technique guide found for {exercise_id}'}
        
        # Filter cues by experience level
        if user_experience == "beginner":
            focus_cues = guide.get_priority_cues("critical")
            modifications = guide.beginner_modifications
            progressions = []
        elif user_experience == "advanced":
            focus_cues = guide.setup_cues + guide.execution_cues
            modifications = []
            progressions = guide.advanced_progressions
        else:  # intermediate
            focus_cues = guide.get_priority_cues("critical") + guide.get_priority_cues("important")
            modifications = guide.beginner_modifications[:2]  # Some modifications
            progressions = guide.advanced_progressions[:2]    # Some progressions
        
        return {
            'exercise_id': exercise_id,
            'exercise_name': guide.exercise_name,
            'difficulty_level': guide.difficulty_level,
            'user_experience': user_experience,
            'key_form_cues': [
                {
                    'checkpoint': cue.checkpoint.value,
                    'description': cue.description,
                    'priority': cue.priority
                }
                for cue in focus_cues
            ],
            'breathing_pattern': guide.breathing_pattern,
            'safety_rating': guide.get_safety_rating(),
            'modifications': modifications,
            'progressions': progressions,
            'common_errors': guide.common_errors,
            'injury_prevention': guide.injury_prevention
        }
    
    def analyze_exercise_safety(self, exercise_id: str, 
                              user_injuries: List[str] = None) -> Dict[str, Any]:
        """
        Analyze exercise safety for user with specific injuries
        
        Args:
            exercise_id: Exercise identifier
            user_injuries: List of user's current/past injuries
            
        Returns:
            Safety analysis with recommendations
        """
        guide = self.get_technique_guide(exercise_id)
        if not guide:
            return {'error': f'No technique guide found for {exercise_id}'}
        
        user_injuries = user_injuries or []
        
        # Check for contraindications
        contraindications = []
        risk_factors = []
        modifications_needed = []
        
        for safety in guide.safety_considerations:
            # Check if user's injuries match contraindications
            for injury in user_injuries:
                if injury.lower() in [c.lower() for c in safety.contraindications]:
                    contraindications.append({
                        'injury_risk': safety.injury_risk,
                        'user_injury': injury,
                        'recommendation': 'Avoid this exercise or consult medical professional'
                    })
                elif injury.lower() in safety.injury_risk.lower():
                    risk_factors.append({
                        'injury_risk': safety.injury_risk,
                        'user_injury': injury,
                        'risk_level': safety.risk_level,
                        'prevention_tips': safety.prevention_tips
                    })
                    modifications_needed.extend(safety.modifications)
        
        # Overall safety assessment
        if contraindications:
            safety_status = "not_recommended"
            recommendation = "This exercise is not recommended due to injury contraindications"
        elif risk_factors:
            safety_status = "proceed_with_caution"
            recommendation = "Exercise can be performed with modifications and extra attention to form"
        else:
            safety_status = "safe"
            recommendation = "Exercise is safe for your profile"
        
        return {
            'exercise_id': exercise_id,
            'safety_status': safety_status,
            'overall_recommendation': recommendation,
            'contraindications': contraindications,
            'risk_factors': risk_factors,
            'required_modifications': list(set(modifications_needed)),
            'general_safety_tips': guide.injury_prevention,
            'alternative_exercises': guide.alternative_exercises if contraindications else []
        }
    
    def suggest_exercise_progressions(self, exercise_id: str, 
                                    current_performance: Dict[str, Any]) -> Dict[str, Any]:
        """
        Suggest exercise progressions based on current performance
        
        Args:
            exercise_id: Exercise identifier
            current_performance: Current performance metrics
            
        Returns:
            Progression suggestions
        """
        guide = self.get_technique_guide(exercise_id)
        if not guide:
            return {'error': f'No technique guide found for {exercise_id}'}
        
        # Analyze current performance
        form_rating = current_performance.get('form_rating', 5)
        difficulty_rating = current_performance.get('difficulty_rating', 5)
        sets_completed = current_performance.get('sets_completed', 3)
        reps_completed = current_performance.get('reps_completed', 10)
        
        suggestions = {
            'exercise_id': exercise_id,
            'current_level': guide.difficulty_level,
            'progressions': []
        }
        
        # Form-based progressions
        if form_rating >= 8:
            if guide.difficulty_level == "beginner":
                suggestions['progressions'].extend([
                    {
                        'type': 'technique_advancement',
                        'description': 'Ready for intermediate variations',
                        'specific_progressions': guide.advanced_progressions[:2]
                    }
                ])
            elif guide.difficulty_level == "intermediate" and form_rating >= 9:
                suggestions['progressions'].extend([
                    {
                        'type': 'advanced_technique',
                        'description': 'Ready for advanced variations',
                        'specific_progressions': guide.advanced_progressions
                    }
                ])
        
        # Volume progressions
        if difficulty_rating <= 6 and form_rating >= 7:
            suggestions['progressions'].append({
                'type': 'volume_increase',
                'description': 'Increase sets or reps',
                'specific_recommendations': [
                    f'Add 1-2 reps per set (target: {reps_completed + 2})',
                    f'Add 1 additional set (target: {sets_completed + 1})'
                ]
            })
        
        # Intensity progressions
        if difficulty_rating <= 5 and form_rating >= 8:
            suggestions['progressions'].append({
                'type': 'intensity_increase',
                'description': 'Increase weight or resistance',
                'specific_recommendations': [
                    'Increase weight by 2.5-5 lbs',
                    'Use slower tempo for increased difficulty',
                    'Add pause reps for increased challenge'
                ]
            })
        
        # Form improvement needed
        if form_rating < 7:
            suggestions['progressions'].append({
                'type': 'form_focus',
                'description': 'Focus on form improvement before progression',
                'specific_recommendations': [
                    'Reduce weight by 10-15%',
                    'Focus on these critical form cues:',
                    *[cue.description for cue in guide.get_priority_cues("critical")]
                ]
            })
        
        return suggestions
    
    def get_movement_pattern_alternatives(self, exercise_id: str) -> Dict[str, Any]:
        """
        Get alternative exercises with same movement pattern
        
        Args:
            exercise_id: Exercise identifier
            
        Returns:
            Alternative exercises grouped by similarity
        """
        guide = self.get_technique_guide(exercise_id)
        if not guide:
            return {'error': f'No technique guide found for {exercise_id}'}
        
        movement_pattern = guide.movement_pattern
        
        # Find exercises with same movement pattern
        same_pattern = []
        similar_pattern = []
        
        for ex_id, ex_guide in self.technique_guides.items():
            if ex_id == exercise_id:
                continue
            
            if ex_guide.movement_pattern == movement_pattern:
                same_pattern.append({
                    'exercise_id': ex_id,
                    'exercise_name': ex_guide.exercise_name,
                    'difficulty_level': ex_guide.difficulty_level,
                    'required_equipment': ex_guide.required_equipment
                })
        
        # Find related movement patterns
        pattern_relations = {
            'squat': ['lunge', 'single_leg_squat'],
            'hinge': ['deadlift', 'rdl'],
            'push': ['press', 'push_up'],
            'pull': ['row', 'pulldown'],
            'carry': ['hold', 'walk']
        }
        
        related_patterns = pattern_relations.get(movement_pattern, [])
        for ex_id, ex_guide in self.technique_guides.items():
            if ex_id == exercise_id:
                continue
            
            if any(pattern in ex_guide.movement_pattern for pattern in related_patterns):
                similar_pattern.append({
                    'exercise_id': ex_id,
                    'exercise_name': ex_guide.exercise_name,
                    'movement_pattern': ex_guide.movement_pattern,
                    'difficulty_level': ex_guide.difficulty_level
                })
        
        return {
            'original_exercise': {
                'exercise_id': exercise_id,
                'exercise_name': guide.exercise_name,
                'movement_pattern': movement_pattern
            },
            'same_movement_pattern': same_pattern,
            'similar_movement_patterns': similar_pattern[:5],  # Limit to 5
            'equipment_alternatives': [
                alt for alt in same_pattern 
                if set(alt['required_equipment']) != set(guide.required_equipment)
            ]
        }
    
    def get_beginner_learning_path(self, movement_pattern: str) -> Dict[str, Any]:
        """
        Get structured learning path for a movement pattern
        
        Args:
            movement_pattern: Target movement pattern to learn
            
        Returns:
            Progressive learning path
        """
        # Get all exercises for this movement pattern
        pattern_exercises = [
            (ex_id, guide) for ex_id, guide in self.technique_guides.items()
            if movement_pattern.lower() in guide.movement_pattern.lower()
        ]
        
        if not pattern_exercises:
            return {'error': f'No exercises found for movement pattern: {movement_pattern}'}
        
        # Sort by difficulty level
        difficulty_order = {"beginner": 1, "intermediate": 2, "advanced": 3}
        pattern_exercises.sort(key=lambda x: difficulty_order.get(x[1].difficulty_level, 2))
        
        # Create learning progression
        learning_path = {
            'movement_pattern': movement_pattern,
            'total_exercises': len(pattern_exercises),
            'learning_stages': []
        }
        
        # Stage 1: Bodyweight/Basic movements
        stage1_exercises = [
            (ex_id, guide) for ex_id, guide in pattern_exercises
            if guide.difficulty_level == "beginner" and 
            ("bodyweight" in guide.required_equipment or not guide.required_equipment)
        ]
        
        if stage1_exercises:
            learning_path['learning_stages'].append({
                'stage': 1,
                'stage_name': 'Bodyweight Foundation',
                'description': 'Master basic movement pattern with bodyweight',
                'exercises': [
                    {
                        'exercise_id': ex_id,
                        'exercise_name': guide.exercise_name,
                        'focus_areas': [cue.description for cue in guide.get_priority_cues("critical")],
                        'mastery_criteria': 'Perform 3 sets of 10-15 reps with perfect form'
                    }
                    for ex_id, guide in stage1_exercises[:2]  # Limit to 2 exercises per stage
                ]
            })
        
        # Stage 2: Added resistance
        stage2_exercises = [
            (ex_id, guide) for ex_id, guide in pattern_exercises
            if guide.difficulty_level in ["beginner", "intermediate"] and 
            any(equip in guide.required_equipment for equip in ["dumbbell", "kettlebell", "resistance_band"])
        ]
        
        if stage2_exercises:
            learning_path['learning_stages'].append({
                'stage': 2,
                'stage_name': 'Added Resistance',
                'description': 'Progress to external resistance while maintaining form',
                'exercises': [
                    {
                        'exercise_id': ex_id,
                        'exercise_name': guide.exercise_name,
                        'focus_areas': [cue.description for cue in guide.get_priority_cues("critical")],
                        'mastery_criteria': 'Perform with light weight for 3 sets of 8-12 reps'
                    }
                    for ex_id, guide in stage2_exercises[:2]
                ]
            })
        
        # Stage 3: Advanced variations
        stage3_exercises = [
            (ex_id, guide) for ex_id, guide in pattern_exercises
            if guide.difficulty_level in ["intermediate", "advanced"]
        ]
        
        if stage3_exercises:
            learning_path['learning_stages'].append({
                'stage': 3,
                'stage_name': 'Advanced Techniques',
                'description': 'Master complex variations and heavy loading',
                'exercises': [
                    {
                        'exercise_id': ex_id,
                        'exercise_name': guide.exercise_name,
                        'focus_areas': [cue.description for cue in guide.get_priority_cues("critical")],
                        'mastery_criteria': 'Demonstrate consistent form under challenging loads'
                    }
                    for ex_id, guide in stage3_exercises[:3]
                ]
            })
        
        return learning_path
    
    def _initialize_technique_guides(self):
        """Initialize comprehensive technique guides"""
        
        # Barbell Bench Press
        self.technique_guides['barbell_bench_press'] = TechniqueGuide(
            exercise_id='barbell_bench_press',
            exercise_name='Barbell Bench Press',
            movement_pattern='horizontal_push',
            difficulty_level='intermediate',
            setup_cues=[
                FormCue(
                    checkpoint=FormCheckpoint.SETUP,
                    description="Lie flat on bench with eyes under the bar",
                    priority="critical",
                    common_mistake="Bar too far forward or back",
                    correction="Position eyes directly under barbell"
                ),
                FormCue(
                    checkpoint=FormCheckpoint.SETUP,
                    description="Grip bar with hands slightly wider than shoulder width",
                    priority="critical",
                    common_mistake="Grip too wide or narrow",
                    correction="Use thumbs-around grip, wrists straight"
                ),
                FormCue(
                    checkpoint=FormCheckpoint.SETUP,
                    description="Create arch in lower back, squeeze shoulder blades",
                    priority="important",
                    common_mistake="Flat back on bench",
                    correction="Pull shoulder blades down and together"
                )
            ],
            execution_cues=[
                FormCue(
                    checkpoint=FormCheckpoint.EXECUTION,
                    description="Lower bar to chest with control",
                    priority="critical",
                    common_mistake="Bouncing bar off chest",
                    correction="Touch chest lightly, pause briefly"
                ),
                FormCue(
                    checkpoint=FormCheckpoint.EXECUTION,
                    description="Press bar in straight line over chest",
                    priority="critical",
                    common_mistake="Bar drifts forward",
                    correction="Drive straight up from chest position"
                ),
                FormCue(
                    checkpoint=FormCheckpoint.EXECUTION,
                    description="Keep elbows at 45-degree angle",
                    priority="important",
                    common_mistake="Elbows flared too wide",
                    correction="Tuck elbows closer to body"
                )
            ],
            breathing_pattern="Inhale at top, hold breath during descent and press, exhale at top",
            safety_considerations=[
                SafetyConsideration(
                    injury_risk="Shoulder impingement",
                    risk_level="medium",
                    prevention_tips=[
                        "Warm up shoulders thoroughly",
                        "Use proper grip width",
                        "Don't lower bar too far"
                    ],
                    contraindications=["acute shoulder injury", "shoulder impingement"],
                    modifications=[
                        "Use dumbbells instead",
                        "Reduce range of motion",
                        "Use incline angle"
                    ]
                ),
                SafetyConsideration(
                    injury_risk="Lower back strain",
                    risk_level="low",
                    prevention_tips=[
                        "Maintain contact with bench",
                        "Don't over-arch back"
                    ],
                    contraindications=["acute lower back injury"],
                    modifications=["Feet on bench", "Reduce arch"]
                )
            ],
            beginner_modifications=[
                "Start with empty barbell",
                "Use dumbbells for better range of motion",
                "Have spotter present",
                "Focus on slow, controlled movement"
            ],
            advanced_progressions=[
                "Pause bench press",
                "Close-grip bench press",
                "Incline bench press",
                "Tempo variations"
            ],
            common_errors=[
                {
                    "error": "Bouncing bar off chest",
                    "correction": "Control the descent and pause briefly on chest"
                },
                {
                    "error": "Feet lifting off ground",
                    "correction": "Keep feet flat on floor for stability"
                },
                {
                    "error": "Uneven bar path",
                    "correction": "Focus on pressing straight up from chest"
                }
            ],
            injury_prevention=[
                "Always use safety bars or spotter",
                "Warm up with lighter weights",
                "Don't train to failure alone",
                "Check equipment before use"
            ],
            required_equipment=["barbell", "bench", "safety_bars"],
            alternative_exercises=[
                "dumbbell_bench_press",
                "push_up",
                "incline_bench_press",
                "chest_press_machine"
            ]
        )
        
        # Add more exercises (this would be expanded significantly)
        # For brevity, I'll add a few key exercises
        
        # Barbell Squat
        self.technique_guides['barbell_squat'] = TechniqueGuide(
            exercise_id='barbell_squat',
            exercise_name='Barbell Back Squat',
            movement_pattern='squat',
            difficulty_level='intermediate',
            setup_cues=[
                FormCue(
                    checkpoint=FormCheckpoint.SETUP,
                    description="Position bar on upper traps (high bar) or rear delts (low bar)",
                    priority="critical",
                    common_mistake="Bar too high on neck",
                    correction="Rest bar on muscle, not bones"
                ),
                FormCue(
                    checkpoint=FormCheckpoint.SETUP,
                    description="Feet shoulder-width apart, toes slightly out",
                    priority="critical",
                    common_mistake="Stance too narrow or wide",
                    correction="Find comfortable stance that allows deep squat"
                )
            ],
            execution_cues=[
                FormCue(
                    checkpoint=FormCheckpoint.EXECUTION,
                    description="Initiate movement by sitting back with hips",
                    priority="critical",
                    common_mistake="Knees moving forward first",
                    correction="Push hips back before bending knees"
                ),
                FormCue(
                    checkpoint=FormCheckpoint.EXECUTION,
                    description="Descend until hip crease below knee cap",
                    priority="important",
                    common_mistake="Partial depth squats",
                    correction="Go deeper while maintaining form"
                ),
                FormCue(
                    checkpoint=FormCheckpoint.EXECUTION,
                    description="Drive through heels to stand up",
                    priority="critical",
                    common_mistake="Weight shifts to toes",
                    correction="Feel pressure through whole foot, emphasis on heels"
                )
            ],
            breathing_pattern="Inhale at top, hold breath during descent and ascent, exhale at top",
            safety_considerations=[
                SafetyConsideration(
                    injury_risk="Knee injury",
                    risk_level="medium",
                    prevention_tips=[
                        "Track knees over toes",
                        "Don't let knees cave in",
                        "Warm up thoroughly"
                    ],
                    contraindications=["acute knee injury", "knee surgery recovery"],
                    modifications=[
                        "Box squats",
                        "Goblet squats",
                        "Reduced depth"
                    ]
                ),
                SafetyConsideration(
                    injury_risk="Lower back injury",
                    risk_level="medium",
                    prevention_tips=[
                        "Maintain neutral spine",
                        "Engage core throughout",
                        "Don't round back"
                    ],
                    contraindications=["acute lower back injury", "disc herniation"],
                    modifications=[
                        "Front squats",
                        "Goblet squats",
                        "Wall sits"
                    ]
                )
            ],
            beginner_modifications=[
                "Bodyweight squats",
                "Goblet squats",
                "Box squats",
                "Use heels elevation"
            ],
            advanced_progressions=[
                "Front squats",
                "Pause squats",
                "Bulgarian split squats",
                "Single-leg squats"
            ],
            common_errors=[
                {
                    "error": "Knees caving inward",
                    "correction": "Focus on pushing knees out over toes"
                },
                {
                    "error": "Forward lean",
                    "correction": "Keep chest up and core engaged"
                },
                {
                    "error": "Heel lift",
                    "correction": "Work on ankle mobility, consider heel elevation"
                }
            ],
            injury_prevention=[
                "Always use safety bars",
                "Warm up with bodyweight squats",
                "Progress weight gradually",
                "Check mobility requirements"
            ],
            required_equipment=["barbell", "squat_rack", "safety_bars"],
            alternative_exercises=[
                "goblet_squat",
                "front_squat",
                "leg_press",
                "bodyweight_squat"
            ]
        )
        
        # Push-up (bodyweight exercise)
        self.technique_guides['push_up'] = TechniqueGuide(
            exercise_id='push_up',
            exercise_name='Push-up',
            movement_pattern='horizontal_push',
            difficulty_level='beginner',
            setup_cues=[
                FormCue(
                    checkpoint=FormCheckpoint.SETUP,
                    description="Start in plank position with hands under shoulders",
                    priority="critical",
                    common_mistake="Hands too wide or narrow",
                    correction="Align hands with shoulders, fingers spread"
                ),
                FormCue(
                    checkpoint=FormCheckpoint.SETUP,
                    description="Create straight line from head to heels",
                    priority="critical",
                    common_mistake="Hips sagging or raised",
                    correction="Engage core to maintain neutral spine"
                )
            ],
            execution_cues=[
                FormCue(
                    checkpoint=FormCheckpoint.EXECUTION,
                    description="Lower chest to floor with control",
                    priority="critical",
                    common_mistake="Partial range of motion",
                    correction="Go down until chest nearly touches floor"
                ),
                FormCue(
                    checkpoint=FormCheckpoint.EXECUTION,
                    description="Push up maintaining body alignment",
                    priority="critical",
                    common_mistake="Hips rise first",
                    correction="Move as one unit, chest and hips together"
                )
            ],
            breathing_pattern="Inhale on descent, exhale on push up",
            safety_considerations=[
                SafetyConsideration(
                    injury_risk="Wrist strain",
                    risk_level="low",
                    prevention_tips=[
                        "Keep wrists straight",
                        "Use push-up handles if needed"
                    ],
                    contraindications=["wrist injury"],
                    modifications=["Knuckle push-ups", "Push-up handles", "Incline push-ups"]
                )
            ],
            beginner_modifications=[
                "Wall push-ups",
                "Incline push-ups",
                "Knee push-ups",
                "Assisted push-ups"
            ],
            advanced_progressions=[
                "Diamond push-ups",
                "One-arm push-ups",
                "Plyometric push-ups",
                "Archer push-ups"
            ],
            common_errors=[
                {
                    "error": "Sagging hips",
                    "correction": "Engage core and glutes throughout movement"
                },
                {
                    "error": "Elbows flared wide",
                    "correction": "Keep elbows at 45-degree angle to body"
                }
            ],
            injury_prevention=[
                "Start with easier variations",
                "Progress gradually",
                "Warm up shoulders and wrists"
            ],
            required_equipment=[],  # Bodyweight only
            alternative_exercises=[
                "incline_push_up",
                "chest_press",
                "dumbbell_press"
            ]
        )
    
    def _initialize_movement_patterns(self):
        """Initialize movement pattern classifications"""
        self.movement_patterns = {
            'squat': ['barbell_squat', 'goblet_squat', 'front_squat', 'overhead_squat'],
            'hinge': ['deadlift', 'rdl', 'good_morning', 'kettlebell_swing'],
            'horizontal_push': ['bench_press', 'push_up', 'dumbbell_press'],
            'horizontal_pull': ['barbell_row', 'dumbbell_row', 'cable_row'],
            'vertical_push': ['overhead_press', 'dumbbell_press', 'handstand_push_up'],
            'vertical_pull': ['pull_up', 'lat_pulldown', 'chin_up'],
            'lunge': ['forward_lunge', 'reverse_lunge', 'lateral_lunge'],
            'carry': ['farmers_walk', 'suitcase_carry', 'overhead_carry']
        }
    
    def _initialize_injury_database(self):
        """Initialize injury-exercise relationship database"""
        self.injury_database = {
            'shoulder_impingement': [
                'overhead_press', 'lateral_raise', 'upright_row'
            ],
            'lower_back': [
                'deadlift', 'good_morning', 'barbell_row'
            ],
            'knee': [
                'squat', 'lunge', 'leg_extension'
            ],
            'wrist': [
                'push_up', 'handstand', 'overhead_press'
            ]
        }
