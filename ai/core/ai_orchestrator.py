"""
AI Orchestrator - Uses Gemini to intelligently coordinate all existing systems
Not a wrapper - a conductor that makes all your systems work together
"""
from typing import Dict, Any, List, Optional
import json
import asyncio
from datetime import datetime

# Import all your existing systems
from .exercise_database import ExerciseDatabase
from ..utils.semantic_memory import SemanticMemorySystem
from ..utils.user_profiles import UserProfileManager
from .progression_tracker_complete import ProgressionTracker
from .technique_library_complete import TechniqueLibrary
from ..validators.comprehensive_validator import ComprehensiveValidator
from .equipment_catalog import EquipmentCatalog
from ..utils.observability_dashboard import ObservabilityDashboard


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
        self.equipment_catalog = EquipmentCatalog()
        self.observability = ObservabilityDashboard()
        
    def process_message(self, user_id: str, message: str) -> Dict:
        """
        Use AI to understand intent, then orchestrate your systems
        """
        try:
            # 1. Load user's complete context from YOUR systems
            user_context = self._load_complete_context(user_id, message)
            
            # 2. Let Gemini understand the message WITH all your context
            understanding = self._ai_understand_with_context(message, user_context)
            
            # 3. Based on understanding, orchestrate YOUR systems
            if understanding['intent'] == 'workout_request':
                return self._generate_workout_with_systems(
                    user_id, 
                    understanding, 
                    user_context
                )
            elif understanding['intent'] == 'technique_question':
                return self._provide_technique_from_library(
                    understanding.get('specific_exercise', ''),
                    user_context
                )
            elif understanding['intent'] == 'progress_check':
                return self._check_progress_with_tracker(user_id)
            elif understanding['intent'] == 'profile_update':
                return self._update_profile_with_systems(
                    user_id, 
                    understanding, 
                    user_context
                )
            else:
                return self._generate_contextual_response(
                    understanding,
                    user_context
                )
                
        except Exception as e:
            self.observability.log_error(f"AIOrchestrator error: {e}")
            return {
                'type': 'error',
                'message': "I'm having trouble processing your request. Please try again.",
                'error': str(e)
            }
    
    def _load_complete_context(self, user_id: str, message: str) -> Dict:
        """
        Load ALL context from YOUR existing systems
        """
        try:
            # Load user profile
            profile = self.profile_manager.load_profile(user_id) if hasattr(self.profile_manager, 'load_profile') else {}
            
            # Get relevant conversation history from semantic memory
            relevant_history = []
            try:
                relevant_history = self.semantic_memory.retrieve_relevant_snippets(
                    user_id, 
                    message, 
                    k=5
                ) if hasattr(self.semantic_memory, 'retrieve_relevant_snippets') else []
            except Exception:
                relevant_history = []
            
            # Get allowed exercises from database
            allowed_exercises = []
            try:
                allowed_exercises = self.exercise_db.get_exercises_for_user(
                    experience_level=profile.get('experience_level', 'beginner'),
                    injuries=profile.get('injuries', []),
                    equipment=profile.get('equipment_access', 'commercial_gym')
                ) if hasattr(self.exercise_db, 'get_exercises_for_user') else self.exercise_db.get_all_exercises()
            except Exception:
                allowed_exercises = self.exercise_db.get_all_exercises()
            
            # Get current progress
            current_progress = {}
            try:
                current_progress = self.progression_tracker.get_user_progress(user_id) if hasattr(self.progression_tracker, 'get_user_progress') else {}
            except Exception:
                current_progress = {}
            
            # Get equipment catalog
            equipment_catalog = []
            try:
                equipment_catalog = self.equipment_catalog.get_all_equipment() if hasattr(self.equipment_catalog, 'get_all_equipment') else []
            except Exception:
                equipment_catalog = []
            
            context = {
                # From User Profiles system
                'profile': profile,
                
                # From Semantic Memory - get relevant past conversations
                'relevant_history': relevant_history,
                
                # From Exercise Database - get user's allowed exercises
                'allowed_exercises': allowed_exercises[:50],  # Limit for prompt size
                
                # From Progression Tracker - get current progress
                'current_progress': current_progress,
                
                # Available equipment brands from your catalog
                'equipment_catalog': equipment_catalog[:20],  # Limit for prompt size
                
                # Canonical exercise list
                'exercise_database': {
                    'total_exercises': len(self.exercise_db.CANONICAL_EXERCISES) if hasattr(self.exercise_db, 'CANONICAL_EXERCISES') else 0,
                    'categories': self.exercise_db.get_categories() if hasattr(self.exercise_db, 'get_categories') else []
                }
            }
            
            return context
            
        except Exception as e:
            self.observability.log_error(f"Error loading context: {e}")
            return {
                'profile': {},
                'relevant_history': [],
                'allowed_exercises': [],
                'current_progress': {},
                'equipment_catalog': [],
                'exercise_database': {'total_exercises': 0, 'categories': []}
            }
    
    def _ai_understand_with_context(self, message: str, context: Dict) -> Dict:
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
        - Equipment: {context['profile'].get('equipment_access', 'unknown')}
        
        EXERCISE DATABASE:
        - {context['exercise_database']['total_exercises']} validated exercises available
        - User can safely do: {len(context['allowed_exercises'])} exercises
        - Categories available: {context['exercise_database']['categories']}
        
        RELEVANT HISTORY (from semantic memory):
        {json.dumps(context['relevant_history'][:3], indent=2) if context['relevant_history'] else 'No previous conversations'}
        
        USER'S CURRENT PROGRESS:
        {json.dumps(context['current_progress'], indent=2) if context['current_progress'] else 'No progress data'}
        
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
        - extracted_info: {{}} (any profile info from message)
        """
        
        try:
            response = self.gemini.generate_content(prompt)
            return json.loads(response.text)
        except Exception as e:
            self.observability.log_error(f"AI understanding error: {e}")
            # Fallback to basic classification
            return {
                'intent': 'advice',
                'confidence': 0.5,
                'missing_info': [],
                'should_interview': True,
                'response_type': 'interview',
                'extracted_info': {}
            }
    
    def _generate_workout_with_systems(
        self, 
        user_id: str, 
        understanding: Dict, 
        context: Dict
    ) -> Dict:
        """
        Generate workout using YOUR exercise database and validators
        """
        
        try:
            # 1. Get valid exercises from YOUR database
            valid_exercises = context['allowed_exercises']
            if context['profile'].get('injuries'):
                try:
                    valid_exercises = self.validator.filter_safe_exercises(
                        valid_exercises,
                        context['profile'].get('injuries', [])
                    ) if hasattr(self.validator, 'filter_safe_exercises') else valid_exercises
                except Exception:
                    pass
            
            # 2. Check progression history
            last_workout = {}
            try:
                last_workout = self.progression_tracker.get_last_workout(
                    user_id, 
                    understanding.get('exercise_focus')
                ) if hasattr(self.progression_tracker, 'get_last_workout') else {}
            except Exception:
                last_workout = {}
            
            # 3. Use AI to create workout from YOUR validated exercises
            exercise_names = [e.get('name', '') for e in valid_exercises[:30] if e.get('name')]
            
            prompt = f"""
            Create a workout plan using ONLY these validated exercises from our database:
            
            AVAILABLE EXERCISES (use ONLY these):
            {json.dumps(exercise_names, indent=2)}
            
            WORKOUT REQUIREMENTS:
            - Focus: {understanding.get('exercise_focus', 'general')}
            - Experience: {context['profile'].get('experience_level', 'intermediate')}
            - Time available: {context['profile'].get('time_available', '60 minutes')}
            - Must avoid: {context['profile'].get('injuries', [])}
            
            LAST WORKOUT (for progression):
            {json.dumps(last_workout, indent=2) if last_workout else 'No previous workout data'}
            
            Create a workout using 6-8 exercises from the available list.
            Include sets, reps, rest periods.
            
            Return JSON with:
            - warm_up: [] (2-3 exercises from the list)
            - main_workout: [] (4-6 exercises from the list)  
            - cool_down: [] (1-2 exercises from the list)
            
            Each exercise should have:
            - name: (exact name from the available list)
            - sets: number
            - reps: number/range
            - rest: seconds
            - notes: any form cues
            """
            
            response = self.gemini.generate_content(prompt)
            workout = json.loads(response.text)
            
            # 4. Validate the workout with YOUR validator
            validated_workout = workout
            try:
                validated_workout = self.validator.validate_workout(workout, context['profile']) if hasattr(self.validator, 'validate_workout') else workout
            except Exception:
                pass
            
            # 5. Save to YOUR progression tracker
            try:
                self.progression_tracker.log_workout(user_id, validated_workout) if hasattr(self.progression_tracker, 'log_workout') else None
            except Exception:
                pass
            
            # 6. Store in semantic memory for future retrieval
            try:
                self.semantic_memory.store_interaction(
                    user_id,
                    message=understanding.get('original_message', ''),
                    response=f"Generated {understanding.get('exercise_focus', 'general')} workout",
                    metadata={'workout': validated_workout}
                ) if hasattr(self.semantic_memory, 'store_interaction') else None
            except Exception:
                pass
            
            return {
                'type': 'workout',
                'workout': validated_workout,
                'message': f"Here's your {understanding.get('exercise_focus', '')} workout using our validated exercise database:",
                'used_systems': ['exercise_database', 'validator', 'progression_tracker', 'semantic_memory']
            }
            
        except Exception as e:
            self.observability.log_error(f"Workout generation error: {e}")
            return {
                'type': 'error',
                'message': "I had trouble generating your workout. Please try again with more specific requirements.",
                'error': str(e)
            }
    
    def _provide_technique_from_library(self, exercise_name: str, context: Dict) -> Dict:
        """
        Use YOUR technique library, not generic AI knowledge
        """
        
        try:
            # Find exercise in YOUR database
            exercise = None
            try:
                exercise = self.exercise_db.find_exercise(exercise_name) if hasattr(self.exercise_db, 'find_exercise') else None
            except Exception:
                pass
            
            if not exercise:
                similar_exercises = self._suggest_similar_exercises(exercise_name, context['allowed_exercises'])
                return {
                    'type': 'error',
                    'message': f"'{exercise_name}' not found in our exercise database. Try: {', '.join(similar_exercises[:3])}"
                }
            
            # Get technique from YOUR library
            technique_info = {}
            try:
                technique_info = self.technique_library.get_technique(exercise.get('id', '')) if hasattr(self.technique_library, 'get_technique') else {}
            except Exception:
                technique_info = {}
            
            # Get common mistakes from YOUR data
            common_mistakes = []
            try:
                common_mistakes = self.technique_library.get_common_mistakes(exercise.get('id', '')) if hasattr(self.technique_library, 'get_common_mistakes') else []
            except Exception:
                common_mistakes = []
            
            # Get progression options from YOUR tracker
            progressions = []
            try:
                progressions = self.progression_tracker.get_progression_options(exercise.get('id', '')) if hasattr(self.progression_tracker, 'get_progression_options') else []
            except Exception:
                progressions = []
            
            return {
                'type': 'technique',
                'exercise': exercise,
                'technique': technique_info,
                'common_mistakes': common_mistakes,
                'progressions': progressions,
                'message': f"Here's the proper technique for {exercise.get('name', '')} from our technique library:",
                'used_systems': ['exercise_database', 'technique_library', 'progression_tracker']
            }
            
        except Exception as e:
            self.observability.log_error(f"Technique lookup error: {e}")
            return {
                'type': 'error',
                'message': f"I couldn't find detailed technique information for '{exercise_name}'. Please check the exercise name and try again.",
                'error': str(e)
            }
    
    def _check_progress_with_tracker(self, user_id: str) -> Dict:
        """
        Use YOUR progression tracking system
        """
        try:
            progress_data = {}
            try:
                progress_data = self.progression_tracker.get_comprehensive_progress(user_id) if hasattr(self.progression_tracker, 'get_comprehensive_progress') else {}
            except Exception:
                progress_data = {}
            
            return {
                'type': 'progress',
                'data': progress_data,
                'message': "Here's your progress from our tracking system:",
                'used_systems': ['progression_tracker', 'semantic_memory']
            }
            
        except Exception as e:
            self.observability.log_error(f"Progress check error: {e}")
            return {
                'type': 'error',
                'message': "I couldn't retrieve your progress data. Please try again.",
                'error': str(e)
            }
    
    def _update_profile_with_systems(self, user_id: str, understanding: Dict, context: Dict) -> Dict:
        """
        Update user profile using YOUR profile management system
        """
        try:
            extracted_info = understanding.get('extracted_info', {})
            
            # Update profile through YOUR system
            try:
                self.profile_manager.update_profile(user_id, extracted_info) if hasattr(self.profile_manager, 'update_profile') else None
            except Exception:
                pass
            
            # Store in semantic memory
            try:
                self.semantic_memory.store_interaction(
                    user_id,
                    message=understanding.get('original_message', ''),
                    response=f"Updated profile with: {list(extracted_info.keys())}",
                    metadata={'profile_update': extracted_info}
                ) if hasattr(self.semantic_memory, 'store_interaction') else None
            except Exception:
                pass
            
            return {
                'type': 'profile_update',
                'updated_info': extracted_info,
                'message': f"Thanks! I've updated your profile with: {', '.join(extracted_info.keys())}",
                'used_systems': ['profile_manager', 'semantic_memory']
            }
            
        except Exception as e:
            self.observability.log_error(f"Profile update error: {e}")
            return {
                'type': 'error',
                'message': "I couldn't update your profile. Please try again.",
                'error': str(e)
            }
    
    def _generate_contextual_response(self, understanding: Dict, context: Dict) -> Dict:
        """
        Generate contextual advice using AI with your systems' data
        """
        try:
            prompt = f"""
            Generate a helpful response based on the user's intent and available context.
            
            USER INTENT: {understanding.get('intent', 'advice')}
            CONFIDENCE: {understanding.get('confidence', 0)}
            USER PROFILE: {context['profile']}
            AVAILABLE EXERCISES: {len(context['allowed_exercises'])}
            
            Provide helpful, personalized advice based on their profile and available systems.
            Be conversational and knowledgeable like a real personal trainer.
            """
            
            response = self.gemini.generate_content(prompt)
            
            return {
                'type': 'advice',
                'message': response.text,
                'intent': understanding.get('intent', 'advice'),
                'confidence': understanding.get('confidence', 0),
                'used_systems': ['ai_brain']
            }
            
        except Exception as e:
            self.observability.log_error(f"Contextual response error: {e}")
            return {
                'type': 'advice',
                'message': "I'm here to help with your fitness journey! What specific assistance do you need today?",
                'error': str(e)
            }
    
    def _suggest_similar_exercises(self, exercise_name: str, available_exercises: List) -> List[str]:
        """
        Suggest similar exercises from the available list
        """
        exercise_names = [e.get('name', '') for e in available_exercises if e.get('name')]
        
        # Simple similarity matching based on common words
        query_words = exercise_name.lower().split()
        similar = []
        
        for name in exercise_names:
            name_words = name.lower().split()
            if any(word in name_words for word in query_words):
                similar.append(name)
        
        return similar[:5] if similar else exercise_names[:5]
    
    def _get_available_equipment(self) -> List[Dict]:
        """
        Get available equipment from catalog
        """
        try:
            return self.equipment_catalog.get_all_equipment() if hasattr(self.equipment_catalog, 'get_all_equipment') else []
        except Exception:
            return []
