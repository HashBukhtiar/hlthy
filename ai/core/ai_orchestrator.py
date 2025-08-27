"""
AI Orchestrator - Uses Gemini to intelligently coordinate all existing systems
Not a wrapper - a conductor that makes all your systems work together
"""
from typing import Dict, Any, List, Optional
import json
import asyncio
import sys
import os
from datetime import datetime

# Add parent directory to path for imports
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import all your existing systems
try:
    from core.exercise_database import ExerciseDatabase
except ImportError:
    print("Warning: ExerciseDatabase not available")
    ExerciseDatabase = None

try:
    from utils.semantic_memory import SemanticMemorySystem
except ImportError:
    print("Warning: SemanticMemorySystem not available")
    SemanticMemorySystem = None

try:
    from utils.user_profiles import UserProfileManager
except ImportError:
    print("Warning: UserProfileManager not available")
    UserProfileManager = None

try:
    from core.progression_tracker_complete import ProgressionTracker
except ImportError:
    try:
        from progression_tracker import ProgressionTracker
    except ImportError:
        print("Warning: ProgressionTracker not available")
        ProgressionTracker = None

try:
    from core.technique_library_complete import TechniqueLibrary
except ImportError:
    try:
        from technique_library import TechniqueLibrary
    except ImportError:
        print("Warning: TechniqueLibrary not available")
        TechniqueLibrary = None

try:
    from validators.comprehensive_validator import ComprehensiveValidator
except ImportError:
    print("Warning: ComprehensiveValidator not available")
    ComprehensiveValidator = None

try:
    from core.equipment_catalog import EquipmentCatalog
except ImportError:
    print("Warning: EquipmentCatalog not available")
    EquipmentCatalog = None

try:
    from utils.observability_dashboard import ObservabilityDashboard
except ImportError:
    print("Warning: ObservabilityDashboard not available")
    ObservabilityDashboard = None


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
        # Initialize all systems safely
        self.exercise_db = ExerciseDatabase() if ExerciseDatabase else None
        self.semantic_memory = SemanticMemorySystem() if SemanticMemorySystem else None
        self.profile_manager = UserProfileManager() if UserProfileManager else None
        self.progression_tracker = ProgressionTracker() if ProgressionTracker else None
        self.technique_library = TechniqueLibrary() if TechniqueLibrary else None
        self.validator = ComprehensiveValidator() if ComprehensiveValidator else None
        self.equipment_catalog = EquipmentCatalog() if EquipmentCatalog else None
        self.observability = ObservabilityDashboard() if ObservabilityDashboard else None
        
    def process_message(self, user_id: str, message: str) -> Dict:
        """
        Use AI to understand intent, then orchestrate your systems
        """
        try:
            print(f"Processing message: {message}")
            
            # 1. Load user's complete context from YOUR systems
            user_context = self._load_complete_context(user_id, message)
            print(f"Context loaded: {type(user_context)}")
            
            # 2. Let Gemini understand the message WITH all your context
            print("About to call AI understanding...")
            understanding = self._ai_understand_with_context(message, user_context)
            print(f"Understanding result: {type(understanding)} - {understanding}")
            
            if not understanding or not isinstance(understanding, dict):
                print("Understanding failed, using fallback")
                return {
                    'type': 'interview',
                    'message': "I'd like to help you! Could you tell me more about what you're looking for?",
                    'used_systems': ['fallback']
                }
                
            print(f"Understanding successful, intent: {understanding.get('intent')}")
            
            # 3. Based on understanding, orchestrate YOUR systems
            if understanding.get('intent') == 'workout_request':
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
            print(f"AIOrchestrator error: {e}")
            try:
                if hasattr(self.observability, 'log_error'):
                    self.observability.log_error(f"AIOrchestrator error: {e}")
            except:
                pass  # Ignore observability errors
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
            # Safe error logging
            print(f"Error loading context: {e}")
            try:
                if hasattr(self.observability, 'log_error'):
                    self.observability.log_error(f"Error loading context: {e}")
            except:
                pass
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
        print("Starting AI understanding with context...")
        try:
            # Safe access to context data
            profile = context.get('profile') or {}  # Handle None case
            exercise_db = context.get('exercise_database') or {}
            allowed_exercises = context.get('allowed_exercises') or []
            
            # Simplified, robust prompt
            prompt = f"""
            Analyze this fitness message and respond with JSON:
            
            Message: "{message}"
            
            User info:
            - Experience: {profile.get('experience_level', 'unknown')}
            - Available exercises: {len(allowed_exercises)}
            - Total exercises in database: {exercise_db.get('total_exercises', 0)}
            
            Respond with ONLY this JSON format:
            {{
                "intent": "workout_request",
                "confidence": 0.8,
                "response_type": "workout"
            }}
            """
            
            print("Calling Gemini model...")
            response = self.gemini.generate_content(prompt)
            print(f"Gemini response: {response.text}")
            
            # Clean the response text to handle markdown code blocks
            response_text = response.text.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:]  # Remove ```json
            if response_text.endswith('```'):
                response_text = response_text[:-3]  # Remove ```
            response_text = response_text.strip()
            
            # Try to parse JSON
            result = json.loads(response_text)
            print(f"AI understanding successful: {result}")
            return result
            
        except Exception as e:
            print(f"AI understanding error: {e}")
            import traceback
            traceback.print_exc()
            
            # Safe fallback
            return {
                'intent': 'workout_request' if 'workout' in message.lower() else 'advice',
                'confidence': 0.6,
                'response_type': 'interview'
            }
    
    def _ai_select_actions(self, understanding: Dict, context: Dict) -> List[str]:
        """Select which actions/systems to use based on AI understanding"""
        actions = []
        
        intent = understanding.get('intent', 'advice')
        
        if intent == 'workout_request':
            actions.extend(['load_profile', 'generate_workout', 'semantic_memory'])
        elif intent == 'technique_question':
            actions.extend(['technique_library', 'semantic_memory'])
        elif intent == 'progress_check':
            actions.extend(['load_profile', 'progress_tracking'])
        else:
            actions.append('general_advice')
            
        return actions
    
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
            
            response = self.gemini_model.generate_content(prompt)
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
            print(f"Workout generation error: {e}")
            # Safe error logging disabled for now
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
            print(f"Technique lookup error: {e}")
            # Safe error logging disabled for now
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
            print(f"Progress check error: {e}")
            # Safe error logging disabled for now
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
            print(f"Profile update error: {e}")
            # Safe error logging disabled for now
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
            
            response = self.gemini_model.generate_content(prompt)
            
            return {
                'type': 'advice',
                'message': response.text,
                'intent': understanding.get('intent', 'advice'),
                'confidence': understanding.get('confidence', 0),
                'used_systems': ['ai_brain']
            }
            
        except Exception as e:
            print(f"Contextual response error: {e}")
            # Safe error logging disabled for now
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
