We don't want to throw away all the sophisticated infrastructure you've built. The solution is to use Gemini as the brain that orchestrates all your existing systems, not replace them. Let me show you how to properly integrate everything:

"""
AI Orchestrator - Uses Gemini to intelligently coordinate all existing systems
Not a wrapper - a conductor that makes all your systems work together
"""
from typing import Dict, Any, List, Optional
import json
from ..core.exercise_database import ExerciseDatabase
from ..utils.semantic_memory import SemanticMemorySystem
from ..utils.user_profiles import UserProfileManager
from ..core.progression_tracker_complete import ProgressionTracker
from ..core.technique_library_complete import TechniqueLibrary
from ..validators.comprehensive_validator import ComprehensiveValidator

class AIOrchestrator:
    """
    Uses Gemini's intelligence to orchestrate your existing systems:
    - Exercise Database for valid exercises
    - Semantic Memory for user history
    - User Profiles for persistent data
    - Validators for safety checks
    - Progression Tracker for workout advancement
    """
    
    def __init__(self, gemini_model):
        self.gemini = gemini_model
        self.exercise_db = ExerciseDatabase()
        self.semantic_memory = SemanticMemorySystem()
        self.profile_manager = UserProfileManager()
        self.progression_tracker = ProgressionTracker()
        self.technique_library = TechniqueLibrary()
        self.validator = ComprehensiveValidator()
        
    async def process_message(self, user_id: str, message: str) -> Dict:
        """
        Use AI to understand intent, then orchestrate your systems
        """
        
        # 1. Load user's complete context from YOUR systems
        user_context = self._load_complete_context(user_id, message)
        
        # 2. Let Gemini understand the message WITH all your context
        understanding = await self._ai_understand_with_context(message, user_context)
        
        # 3. Based on understanding, orchestrate YOUR systems
        if understanding['intent'] == 'workout_request':
            return await self._generate_workout_with_systems(
                user_id, 
                understanding, 
                user_context
            )
        elif understanding['intent'] == 'technique_question':
            return self._provide_technique_from_library(
                understanding['exercise'],
                user_context
            )
        elif understanding['intent'] == 'progress_check':
            return self._check_progress_with_tracker(user_id)
        else:
            return await self._generate_contextual_response(
                understanding,
                user_context
            )
    
    def _load_complete_context(self, user_id: str, message: str) -> Dict:
        """
        Load ALL context from YOUR existing systems
        """
        context = {
            # From User Profiles system
            'profile': self.profile_manager.load_profile(user_id),
            
            # From Semantic Memory - get relevant past conversations
            'relevant_history': self.semantic_memory.retrieve_relevant_snippets(
                user_id, 
                message, 
                k=5
            ),
            
            # From Exercise Database - get user's allowed exercises
            'allowed_exercises': self.exercise_db.get_exercises_for_user(
                experience_level=self.profile_manager.get_experience(user_id),
                injuries=self.profile_manager.get_injuries(user_id),
                equipment=self.profile_manager.get_equipment(user_id)
            ),
            
            # From Progression Tracker - get current progress
            'current_progress': self.progression_tracker.get_user_progress(user_id),
            
            # Available equipment brands from your catalog
            'equipment_catalog': self._get_available_equipment(),
            
            # Canonical exercise list
            'exercise_database': {
                'total_exercises': len(self.exercise_db.CANONICAL_EXERCISES),
                'categories': self.exercise_db.get_categories()
            }
        }
        
        return context
    
    async def _ai_understand_with_context(self, message: str, context: Dict) -> Dict:
        """
        Use Gemini to understand intent, but with ALL your context
        """
        
        prompt = f"""
        You are the AI brain for a sophisticated fitness training system.
        You have access to these REAL systems and data:
        
        USER PROFILE:
        - Experience: {context['profile'].get('experience_level', 'unknown')}
        - Goals: {context['profile'].get('goals', 'unknown')}
        - Injuries: {context['profile'].get('injuries', [])}
        - Equipment: {context['profile'].get('equipment', 'unknown')}
        
        EXERCISE DATABASE:
        - {context['exercise_database']['total_exercises']} validated exercises available
        - User can safely do: {len(context['allowed_exercises'])} exercises
        - Categories available: {context['exercise_database']['categories']}
        
        RELEVANT HISTORY (from semantic memory):
        {json.dumps(context['relevant_history'][:3], indent=2)}
        
        USER'S CURRENT PROGRESS:
        {json.dumps(context['current_progress'], indent=2)}
        
        USER MESSAGE: "{message}"
        
        Analyze this message and determine:
        1. What is the user's intent?
        2. What information do we need that we don't have?
        3. Should we use existing workout data or create new?
        4. What systems should we engage?
        
        Return JSON with:
        - intent: workout_request/technique_question/progress_check/advice/profile_update
        - confidence: 0-1
        - missing_info: [] (what we need to know)
        - should_interview: boolean
        - exercise_focus: (if workout request)
        - specific_exercise: (if technique question)
        - use_systems: [] (which of our systems to use)
        - response_type: interview/workout/advice/technique
        """
        
        response = await self.gemini.generate_content(prompt)
        return json.loads(response.text)
    
    async def _generate_workout_with_systems(
        self, 
        user_id: str, 
        understanding: Dict, 
        context: Dict
    ) -> Dict:
        """
        Generate workout using YOUR exercise database and validators
        """
        
        # 1. Get valid exercises from YOUR database
        valid_exercises = self.validator.filter_safe_exercises(
            context['allowed_exercises'],
            context['profile'].get('injuries', [])
        )
        
        # 2. Check progression history
        last_workout = self.progression_tracker.get_last_workout(
            user_id, 
            understanding.get('exercise_focus')
        )
        
        # 3. Use AI to create workout from YOUR validated exercises
        prompt = f"""
        Create a workout plan using ONLY these validated exercises from our database:
        
        AVAILABLE EXERCISES (use ONLY these):
        {json.dumps([e['name'] for e in valid_exercises[:30]], indent=2)}
        
        WORKOUT REQUIREMENTS:
        - Focus: {understanding.get('exercise_focus', 'general')}
        - Experience: {context['profile'].get('experience_level')}
        - Time available: {context['profile'].get('time_available', '60 minutes')}
        - Must avoid: {context['profile'].get('injuries', [])}
        
        LAST WORKOUT (for progression):
        {json.dumps(last_workout, indent=2)}
        
        Create a workout using 6-8 exercises from the available list.
        Include sets, reps, rest periods.
        
        Return JSON with:
        - warm_up: [] (2-3 exercises from the list)
        - main_workout: [] (4-6 exercises from the list)
        - cool_down: [] (1-2 exercises from the list)
        
        Each exercise should have:
        - exercise_id: (from our database)
        - sets: number
        - reps: number/range
        - rest: seconds
        - notes: any form cues
        """
        
        response = await self.gemini.generate_content(prompt)
        workout = json.loads(response.text)
        
        # 4. Validate the workout with YOUR validator
        validated_workout = self.validator.validate_workout(workout, context['profile'])
        
        # 5. Save to YOUR progression tracker
        self.progression_tracker.log_workout(user_id, validated_workout)
        
        # 6. Store in semantic memory for future retrieval
        self.semantic_memory.store_interaction(
            user_id,
            message=understanding['original_message'],
            response=f"Generated {understanding.get('exercise_focus', 'general')} workout",
            metadata={'workout': validated_workout}
        )
        
        return {
            'type': 'workout',
            'workout': validated_workout,
            'message': f"Here's your {understanding.get('exercise_focus', '')} workout using our validated exercise database:",
            'used_systems': ['exercise_database', 'validator', 'progression_tracker', 'semantic_memory']
        }
    
    def _provide_technique_from_library(self, exercise_name: str, context: Dict) -> Dict:
        """
        Use YOUR technique library, not generic AI knowledge
        """
        
        # Find exercise in YOUR database
        exercise = self.exercise_db.find_exercise(exercise_name)
        if not exercise:
            return {
                'type': 'error',
                'message': f"'{exercise_name}' not found in our exercise database. Try: {self._suggest_similar_exercises(exercise_name)}"
            }
        
        # Get technique from YOUR library
        technique_info = self.technique_library.get_technique(exercise['id'])
        
        # Get common mistakes from YOUR data
        common_mistakes = self.technique_library.get_common_mistakes(exercise['id'])
        
        # Get progression options from YOUR tracker
        progressions = self.progression_tracker.get_progression_options(exercise['id'])
        
        return {
            'type': 'technique',
            'exercise': exercise,
            'technique': technique_info,
            'common_mistakes': common_mistakes,
            'progressions': progressions,
            'message': f"Here's the proper technique for {exercise['name']} from our technique library:",
            'used_systems': ['exercise_database', 'technique_library', 'progression_tracker']
        }
    
    def _check_progress_with_tracker(self, user_id: str) -> Dict:
        """
        Use YOUR progression tracking system
        """
        progress_data = self.progression_tracker.get_comprehensive_progress(user_id)
        
        return {
            'type': 'progress',
            'data': progress_data,
            'message': "Here's your progress from our tracking system:",
            'used_systems': ['progression_tracker', 'semantic_memory']
        }


"""
Intelligent Integration - AI brain orchestrating all your systems
"""
from typing import Dict, Any
from ..core.ai_orchestrator import AIOrchestrator
from ..core.trainer_brain import PersonalTrainerBrain  # Your existing logic
from ..utils.rate_limiting import RateLimiter
from ..utils.observability_dashboard import ObservabilityDashboard

class IntelligentIntegration:
    def __init__(self, gemini_model):
        self.orchestrator = AIOrchestrator(gemini_model)
        self.trainer_brain = PersonalTrainerBrain()  # Keep your existing logic
        self.rate_limiter = RateLimiter()
        self.observability = ObservabilityDashboard()
        
    async def handle_request(self, user_id: str, message: str) -> Dict:
        """
        Intelligently handle requests using ALL your systems
        """
        
        # 1. Check rate limiting
        if not self.rate_limiter.check_limit(user_id):
            return {
                'type': 'error',
                'message': 'Rate limit exceeded. Please wait a moment.'
            }
        
        # 2. Log to observability
        self.observability.log_request(user_id, message)
        
        # 3. First use your trainer brain for initial classification
        intent = self.trainer_brain.analyze_message_intent(message)
        
        # 4. Then use AI orchestrator with all your systems
        result = await self.orchestrator.process_message(user_id, message)
        
        # 5. Log the result
        self.observability.log_response(user_id, result)
        
        return result

# Bad - just using AI for everything
response = gemini.generate("Give me a chest workout")
return response  # Generic AI-generated workout


# Good - AI orchestrates YOUR systems
valid_exercises = exercise_database.get_chest_exercises()
filtered = validator.filter_for_user(valid_exercises, user_profile)
history = semantic_memory.get_relevant_history(user_id)
workout = gemini.create_from_validated_exercises(filtered, history)
progression_tracker.log_workout(workout)
return workout  # Workout from YOUR database with YOUR rules

✅ What This Gives You:
Uses YOUR Exercise Database: Only suggests exercises from your 108 validated exercises
Uses YOUR Semantic Memory: Remembers past conversations and workouts
Uses YOUR Validators: Ensures safety with injury checking
Uses YOUR Progression Tracker: Builds on previous workouts
Uses YOUR Technique Library: Provides your curated form tips
Uses YOUR User Profiles: Persistent user data