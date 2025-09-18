"""
AI Orchestrator - Uses Gemini to intelligently coordinate all existing systems
Not a wrapper - a conductor that makes all your systems work together
"""
from typing import Dict, Any, List, Optional
import json
import asyncio
import sys
import os
import logging
from datetime import datetime

# Setup logger
logger = logging.getLogger(__name__)

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
            # 1. Load user's complete context from YOUR systems
            user_context = self._load_complete_context(user_id, message)
            profile = user_context.get('profile')
            
            # 2. INTERVIEW-FIRST: Check if user is responding to an interview question
            # This must happen before router gating to enable interview chaining
            is_interview_response = self._is_interview_response(message, profile)
            
            if is_interview_response:
                return self._handle_interview_response(user_id, message, user_context)
            
            # 3. ROUTER-FIRST GATING - Always route through focus router before any planning
            from .focus_router_enhanced import route_focus_request
            router_decision = route_focus_request(message, profile.__dict__ if profile else None)
            
            # Handle router decisions
            if router_decision['action'] == 'reject_nonsense':
                return {
                    'type': 'clarify_focus',
                    'message': "I'm here to help with your fitness goals! " + router_decision['suggestions'][0],
                    'suggestions': router_decision['suggestions'],
                    'used_systems': ['router']
                }
            elif router_decision['action'] == 'clarify_focus':
                return {
                    'type': 'clarify_focus', 
                    'message': router_decision['reason'] + ". " + router_decision['suggestions'][0],
                    'suggestions': router_decision['suggestions'],
                    'used_systems': ['router']
                }
            elif router_decision['action'] == 'start_interview':
                return self._start_user_interview(user_id, {'intent': 'interview_needed'}, user_context)
            elif router_decision['action'] == 'direct_planning':
                # Get AI understanding but enhance with router's focus info
                understanding = self._ai_understand_with_context(message, user_context, router_decision)
                if understanding and router_decision.get('focus'):
                    understanding['focus'] = router_decision['focus']
                    understanding['confidence'] = max(understanding.get('confidence', 0.5), 0.8)  # Boost confidence since router approved
            else:
                # Default understanding from AI with router context
                understanding = self._ai_understand_with_context(message, user_context, router_decision)
            
            if not understanding or not isinstance(understanding, dict):
                return {
                    'type': 'interview',
                    'message': "I'd like to help you! Could you tell me more about what you're looking for?",
                    'used_systems': ['fallback']
                }
                
            # 4. Based on understanding, orchestrate YOUR systems
            result = None
            
            # Check if user needs interview (new user or incomplete profile)
            needs_interview = self._should_interview_user(profile, understanding)
            
            if needs_interview:
                result = self._start_user_interview(user_id, understanding, user_context)
            elif understanding.get('intent') == 'workout_request':
                result = self._generate_workout_with_systems(
                    user_id, 
                    understanding, 
                    user_context
                )
            elif understanding['intent'] == 'technique_question':
                result = self._provide_technique_from_library(
                    understanding.get('specific_exercise', ''),
                    user_context
                )
            elif understanding['intent'] == 'progress_check':
                result = self._check_progress_with_tracker(user_id)
            elif understanding['intent'] == 'profile_update':
                result = self._update_profile_with_systems(
                    user_id, 
                    understanding, 
                    user_context
                )
            else:
                result = self._generate_contextual_response(
                    understanding,
                    user_context
                    )
            
            # Save conversation to memory for context
            self._save_conversation_context(user_id, message, result)
            
            return result
                
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
            # Load user profile as UserProfile object
            profile = self.profile_manager.load_profile(user_id) if hasattr(self.profile_manager, 'load_profile') else None
            
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
            
            # Get allowed exercises from database using full profile
            allowed_exercises = []
            try:
                if profile:
                    # Extract injury types from active injuries
                    active_injury_types = [injury.injury_type for injury in (profile.active_injuries or [])]
                    
                    # Get equipment from profile (handle complex structure)
                    equipment_access = 'commercial_gym'  # default
                    if profile.available_equipment:
                        # If they have any equipment, assume gym access, otherwise check
                        if any(profile.available_equipment.values()):
                            equipment_access = 'commercial_gym'
                        else:
                            equipment_access = 'bodyweight'
                    
                    allowed_exercises = self.exercise_db.get_exercises_for_user(
                        experience_level=profile.experience_level,
                        injuries=active_injury_types,
                        equipment=equipment_access
                    ) if hasattr(self.exercise_db, 'get_exercises_for_user') else self.exercise_db.get_all_exercises()
                else:
                    # New user - get basic exercises
                    allowed_exercises = self.exercise_db.get_exercises_for_user(
                        experience_level='beginner',
                        injuries=[],
                        equipment='commercial_gym'
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
                # From User Profiles system - full UserProfile object
                'profile': profile,
                
                # From Semantic Memory - get relevant past conversations
                'relevant_history': relevant_history,
                
                # From Exercise Database - get user's allowed exercises (filtered by injuries/experience)
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
    
    def _ai_understand_with_context(self, message: str, context: Dict, router_decision: Dict = None) -> Dict:
        """
        Use Gemini to understand intent, but with ALL your context including router insights
        """
        try:
            # Safe access to context data
            profile = context.get('profile')  # UserProfile object or None
            exercise_db = context.get('exercise_database') or {}
            allowed_exercises = context.get('allowed_exercises') or []
            relevant_history = context.get('relevant_history', [])
            
            # Extract user info from UserProfile object
            if profile:
                experience_level = profile.experience_level
                primary_goal = profile.goals.primary_goal if profile.goals else 'general fitness'
                active_injuries = [injury.injury_type for injury in (profile.active_injuries or [])]
                session_duration = profile.goals.session_duration if profile.goals else 60
                training_frequency = profile.goals.training_frequency if profile.goals else 3
            else:
                experience_level = 'unknown'
                primary_goal = 'unknown'
                active_injuries = []
                session_duration = 60
                training_frequency = 3
            
            # Build conversation context
            conversation_context = ""
            if relevant_history:
                conversation_context = "\n\nRecent conversation:\n" + "\n".join([
                    f"- {item.get('content', '')[:100]}" for item in relevant_history[:3]
                ])
            
            # Build router context
            router_context = ""
            if router_decision:
                router_context = f"\n\nRouter analysis:\n- Action: {router_decision.get('action', 'unknown')}\n- Focus: {router_decision.get('focus', 'none')}\n- Reason: {router_decision.get('reason', 'N/A')}"
            
            # Enhanced prompt with router insights and better intent classification
            prompt = f"""
            Analyze this fitness message and determine intent with full context:
            
            Message: "{message}"
            
            User profile:
            - Experience: {experience_level}
            - Primary goal: {primary_goal}
            - Active injuries: {active_injuries}
            - Session duration: {session_duration} minutes
            - Training frequency: {training_frequency} days/week
            - Available exercises: {len(allowed_exercises)}
            {conversation_context}
            {router_context}
            
            Intent classification guidelines:
            - workout_request: User clearly wants a workout plan for specific muscle group/goal
            - interview_needed: User request is vague and needs more info (experience, goals, time, equipment)
            - technique_question: User asking about exercise form, technique, or how-to perform movements
            - progress_check: User asking about their progress, results, or workout history
            - advice: General fitness advice, nutrition, or lifestyle questions  
            - nonsense: Completely unrelated to fitness (weather, math, random words, etc.)
            
            Consider both the message content AND router analysis when classifying.
            
            Respond with ONLY this JSON format:
            {{
                "intent": "workout_request|interview_needed|technique_question|progress_check|advice|nonsense",
                "reason": "brief explanation for this classification",
                "confidence": 0.0-1.0
            }}
            """
            
            response = self.gemini.generate_content(prompt)
            
            # Clean the response text to handle markdown code blocks
            response_text = response.text.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:]  # Remove ```json
            if response_text.endswith('```'):
                response_text = response_text[:-3]  # Remove ```
            response_text = response_text.strip()
            
            # Try to parse JSON with validation
            result = json.loads(response_text)
            
            # Validate required fields
            if not all(key in result for key in ['intent', 'reason', 'confidence']):
                logger.warning(f"Invalid intent format from Gemini: {response_text}")
                return self._fallback_intent(message)
            
            # Validate intent value
            valid_intents = ['workout_request', 'interview_needed', 'technique_question', 'progress_check', 'advice', 'nonsense']
            if result['intent'] not in valid_intents:
                logger.warning(f"Invalid intent value: {result['intent']}")
                return self._fallback_intent(message)
            
            logger.info(f"Intent classified as: {result['intent']} (confidence: {result['confidence']}, reason: {result['reason']})")
            return result
            
        except Exception as e:
            logger.error(f"AI understanding failed: {e}")
            return self._fallback_intent(message)
    
    def _fallback_intent(self, message: str) -> Dict:
        """
        Safe fallback for intent classification when AI fails - generic nonsense detection
        """
        # Simple keyword-based fallback with generic nonsense detection
        message_lower = message.lower().strip()
        
        # Generic nonsense indicators (not hardcoded words)
        nonsense_indicators = [
            len(message_lower) < 3,  # Too short
            message_lower.isdigit(),  # Just numbers
            len([c for c in message_lower if c.isalpha()]) < len(message_lower) * 0.3,  # Too many non-letters
            # Gibberish detection: low vowel ratio + no common words
            (len(message_lower) > 5 and 
             len([c for c in message_lower if c in 'aeiou']) < len(message_lower) * 0.15 and
             not any(word in message_lower for word in [
                 'workout', 'exercise', 'train', 'muscle', 'strength', 'fitness', 'gym', 'weight',
                 'how', 'what', 'when', 'where', 'why', 'can', 'could', 'should', 'would',
                 'help', 'show', 'tell', 'give', 'make', 'build', 'create', 'need', 'want',
                 'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her',
                 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its'
             ]))
        ]
        
        # Check if message contains fitness-related words (likely not nonsense)
        fitness_words = ['workout', 'exercise', 'train', 'muscle', 'strength', 'fitness', 'gym', 'weight', 
                        'lift', 'rep', 'set', 'cardio', 'run', 'bike', 'swim', 'squat', 'press', 'pull']
        has_fitness_words = any(word in message_lower for word in fitness_words)
        
        # If it looks like nonsense and has no fitness words, classify as nonsense
        if any(nonsense_indicators) and not has_fitness_words:
            return {
                'intent': 'nonsense',
                'reason': 'fallback - detected non-fitness content or gibberish',
                'confidence': 0.8
            }
        
        # Check for specific fitness intents
        if any(word in message_lower for word in ['how', 'form', 'technique', 'proper', 'correct']):
            return {
                'intent': 'technique_question', 
                'reason': 'fallback - detected technique keywords',
                'confidence': 0.6
            }
        elif any(word in message_lower for word in ['progress', 'tracking', 'results', 'improvement']):
            return {
                'intent': 'progress_check',
                'reason': 'fallback - detected progress keywords', 
                'confidence': 0.6
            }
        elif has_fitness_words:
            return {
                'intent': 'workout_request',
                'reason': 'fallback - detected fitness/workout keywords',
                'confidence': 0.6
            }
        else:
            # For unclear requests that aren't obviously nonsense, assume they need clarification
            return {
                'intent': 'interview_needed',
                'reason': 'fallback - unclear request needs clarification',
                'confidence': 0.4
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
    
    def _save_conversation_context(self, user_id: str, message: str, response: Dict):
        """Save conversation to semantic memory for context in future interactions"""
        try:
            if hasattr(self.semantic_memory, 'store_conversation'):
                conversation_entry = {
                    'user_message': message,
                    'ai_response': response.get('message', ''),
                    'intent': response.get('type', 'unknown'),
                    'timestamp': datetime.now().isoformat()
                }
                self.semantic_memory.store_conversation(user_id, conversation_entry)
        except Exception as e:
            print(f"Failed to save conversation context: {e}")
    
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
            valid_exercises = context.get('allowed_exercises', [])
            profile = context.get('profile')  # UserProfile object or None
            
            # Extract relevant info from UserProfile for workout generation
            if profile:
                experience_level = profile.experience_level
                primary_goal = profile.goals.primary_goal if profile.goals else 'general'
                session_duration = profile.goals.session_duration if profile.goals else 60
                training_frequency = profile.goals.training_frequency if profile.goals else 3
                active_injuries = [injury.injury_type for injury in (profile.active_injuries or [])]
                banned_exercises = []
                for injury in (profile.active_injuries or []):
                    banned_exercises.extend(injury.banned_exercises or [])
            else:
                experience_level = 'beginner'
                primary_goal = 'general'
                session_duration = 60
                training_frequency = 3
                active_injuries = []
                banned_exercises = []
            
            # Filter out banned exercises due to injuries
            if banned_exercises:
                try:
                    valid_exercises = self.validator.filter_safe_exercises(
                        valid_exercises,
                        active_injuries
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
            
            # Handle both exercise objects and exercise names
            exercise_names = []
            for e in valid_exercises[:30]:
                if isinstance(e, dict):
                    exercise_names.append(e.get('name', ''))
                elif isinstance(e, str):
                    exercise_names.append(e)
            
            # Filter out empty names
            exercise_names = [name for name in exercise_names if name]
            
            prompt = f"""
            Create a workout plan using ONLY these validated exercises from our database:
            
            AVAILABLE EXERCISES (use ONLY these):
            {json.dumps(exercise_names, indent=2)}
            
            USER PROFILE & REQUIREMENTS:
            - Experience: {experience_level}
            - Primary goal: {primary_goal}
            - Session duration: {session_duration} minutes
            - Training frequency: {training_frequency} days/week
            - Active injuries: {active_injuries}
            - Banned exercises: {banned_exercises}
            
            LAST WORKOUT (for progression):
            {json.dumps(last_workout, indent=2) if last_workout else 'No previous workout data'}
            
            Create a workout using 6-8 exercises from the available list.
            CRITICAL: Avoid any exercises in the banned list.
            Consider the user's injuries and experience level.
            Include sets, reps, rest periods appropriate for their goal.
            
            Return JSON with:
            - warm_up: [] (2-3 exercises from the list)
            - main_workout: [] (4-6 exercises from the list)  
            - cool_down: [] (1-2 exercises from the list)
            
            Each exercise should have:
            - name: (exact name from the available list)
            - sets: number
            - reps: number/range
            - rest: seconds
            - notes: any form cues or injury considerations
            """
            
            response = self.gemini.generate_content(prompt)
            
            # Clean the response text to handle markdown code blocks
            response_text = response.text.strip()
            if response_text.startswith('```json'):
                response_text = response_text[7:]  # Remove ```json
            if response_text.endswith('```'):
                response_text = response_text[:-3]  # Remove ```
            response_text = response_text.strip()
            
            workout = json.loads(response_text)
            
            # 4. Validate the workout with YOUR validator (considering full profile)
            validated_workout = workout
            try:
                # Pass the full UserProfile object to validator
                validated_workout = self.validator.validate_workout(workout, profile) if hasattr(self.validator, 'validate_workout') else workout
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
                'message': f"Here's your {primary_goal} workout tailored for {experience_level} level, considering your {len(active_injuries)} active injuries:",
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
            USER PROFILE: {context.get('profile', {})}
            AVAILABLE EXERCISES: {len(context.get('allowed_exercises', []))}
            
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
    
    def _is_interview_response(self, message: str, profile) -> bool:
        """
        Check if the message is likely a response to an interview question
        """
        # Simple heuristics to detect interview responses
        interview_keywords = [
            'beginner', 'intermediate', 'advanced',  # experience level
            'muscle', 'weight', 'strength', 'endurance', 'fitness',  # goals
            'hypertrophy', 'building', 'loss', 'losing', 'gain', 'toning',  # more goal keywords
            '30', '45', '60', '90', 'minutes',  # time
            'gym', 'home', 'bodyweight', 'equipment'  # equipment
        ]
        
        message_lower = message.lower()
        
        # If user profile is incomplete and message contains interview keywords
        if not profile or not self._is_profile_complete(profile):
            return any(keyword in message_lower for keyword in interview_keywords)
            
        return False
    
    def _is_profile_complete(self, profile) -> bool:
        """Check if user profile has all essential information"""
        if not profile:
            return False
            
        # Check for essential profile fields
        has_experience = profile.experience_level and profile.experience_level != 'beginner'
        has_goals = profile.goals and profile.goals.primary_goal
        has_duration = profile.goals and profile.goals.session_duration
        
        # Check if equipment was explicitly set through interview (not defaults)
        # Default equipment has a 'current' key, interview-set equipment should not
        has_equipment = profile.available_equipment and 'current' not in profile.available_equipment
        
        return has_experience and has_goals and has_duration and has_equipment
    
    def _handle_interview_response(self, user_id: str, message: str, context: Dict) -> Dict:
        """
        Handle user's response to interview questions
        """
        try:
            profile = context.get('profile')
            
            # Determine what the user is responding to based on profile completeness
            if not profile:
                # New user responding to experience level
                result = self._update_profile_from_interview(user_id, 'experience_level', message)
            elif not profile.experience_level or profile.experience_level == 'beginner':
                result = self._update_profile_from_interview(user_id, 'experience_level', message)
            elif not profile.goals or not profile.goals.primary_goal:
                result = self._update_profile_from_interview(user_id, 'fitness_goals', message)
            elif not profile.goals or not profile.goals.session_duration:
                result = self._update_profile_from_interview(user_id, 'time_available', message)
            elif not profile.available_equipment:
                result = self._update_profile_from_interview(user_id, 'equipment_access', message)
            else:
                # Profile is complete, treat as regular message
                understanding = {'intent': 'workout_request', 'confidence': 0.8}
                return self._generate_workout_with_systems(user_id, understanding, context)
            
            # Check if there's a next question to continue the interview
            if result.get('next_question'):
                return {
                    'type': 'interview',
                    'question': result['next_question']['question'],
                    'message': result['next_question']['message'],
                    'used_systems': ['profile_manager']
                }
            else:
                # Interview complete, offer to create workout
                return {
                    'type': 'offer_plan',
                    'message': "Perfect! Your profile is complete. Would you like me to create a personalized workout for you now?",
                    'used_systems': ['profile_manager']
                }
                
        except Exception as e:
            print(f"Interview response handling error: {e}")
            return {
                'type': 'interview',
                'message': "I didn't quite catch that. Could you please repeat your answer?",
                'error': str(e)
            }
    
    def _should_interview_user(self, profile, understanding: Dict) -> bool:
        """
        Check if user needs to be interviewed based on profile completeness
        """
        # New user with no profile
        if not profile:
            return True
            
        # Check for essential profile fields for workout generation
        missing_requirements = []
        
        if not profile.experience_level or profile.experience_level == "beginner":
            missing_requirements.append("experience_level")
            
        if not profile.goals or not profile.goals.primary_goal:
            missing_requirements.append("fitness_goals")
            
        if not profile.goals or not profile.goals.session_duration:
            missing_requirements.append("time_available")
        
        # If user is requesting workout but missing key info, interview them
        if understanding.get('intent') == 'workout_request' and missing_requirements:
            return True
            
        return False
    
    def _start_user_interview(self, user_id: str, understanding: Dict, context: Dict) -> Dict:
        """
        Start interview process for new or incomplete users
        """
        profile = context.get('profile')  # UserProfile object or None
        
        # Determine what information we need
        if not profile:
            return {
                'type': 'interview',
                'question': 'experience_level',
                'message': "Hi! I'd love to create a personalized workout for you. What's your training experience level? (beginner/intermediate/advanced)",
                'used_systems': ['profile_manager']
            }
        elif not profile.experience_level or profile.experience_level == "beginner":
            return {
                'type': 'interview',
                'question': 'experience_level',
                'message': "Great! What's your training experience level? (beginner/intermediate/advanced)",
                'used_systems': ['profile_manager']
            }
        elif not profile.goals or not profile.goals.primary_goal:
            return {
                'type': 'interview', 
                'question': 'fitness_goals',
                'message': "Perfect! What are your main fitness goals? (muscle_building/weight_loss/strength/endurance)",
                'used_systems': ['profile_manager']
            }
        elif not profile.goals or not profile.goals.session_duration:
            return {
                'type': 'interview',
                'question': 'time_available', 
                'message': "Excellent! How much time do you typically have for workouts? (30/45/60/90 minutes)",
                'used_systems': ['profile_manager']
            }
        elif not profile.available_equipment:
            return {
                'type': 'interview',
                'question': 'equipment_access',
                'message': "Almost done! What equipment do you have access to? (commercial gym/home gym/bodyweight only)",
                'used_systems': ['profile_manager']
            }
        else:
            # Profile complete, proceed with workout generation
            return self._generate_workout_with_systems(user_id, understanding, context)
    
    def _update_profile_from_interview(self, user_id: str, question: str, answer: str) -> Dict:
        """
        Update UserProfile based on interview response
        """
        try:
            # Import required classes
            from utils.user_profiles import UserProfile, FitnessGoals
            from datetime import datetime
            
            # Load existing profile or create new one
            profile = self.profile_manager.load_profile(user_id) if hasattr(self.profile_manager, 'load_profile') else None
            
            if not profile:
                # Create new profile
                profile = UserProfile(
                    user_id=user_id,
                    created_at=datetime.now().isoformat(),
                    updated_at=datetime.now().isoformat(),
                    experience_level="beginner"
                )
                # Override default equipment for interview flow
                profile.available_equipment = None
            
            # Update profile based on question
            if question == 'experience_level':
                if answer.lower() in ['beginner', 'intermediate', 'advanced']:
                    profile.experience_level = answer.lower()
                    
            elif question == 'fitness_goals':
                if not profile.goals:
                    profile.goals = FitnessGoals(
                        primary_goal=answer.lower().replace(' ', '_'),
                        secondary_goals=[],
                        training_frequency=3,
                        session_duration=None  # Don't set duration until asked
                    )
                else:
                    profile.goals.primary_goal = answer.lower().replace(' ', '_')
                    
            elif question == 'time_available':
                duration = 60  # default
                if '30' in answer:
                    duration = 30
                elif '45' in answer:
                    duration = 45
                elif '90' in answer:
                    duration = 90
                    
                if not profile.goals:
                    profile.goals = FitnessGoals(
                        primary_goal='general',
                        secondary_goals=[],
                        training_frequency=3,
                        session_duration=duration
                    )
                else:
                    profile.goals.session_duration = duration
                    
            elif question == 'equipment_access':
                # Simple equipment mapping
                if 'bodyweight' in answer.lower():
                    profile.available_equipment = {'bodyweight': ['floor']}
                elif 'home' in answer.lower():
                    profile.available_equipment = {'home': ['dumbbells', 'resistance_bands']}
                else:
                    profile.available_equipment = {'commercial_gym': ['full_gym']}
            
            # Save updated profile
            profile.updated_at = datetime.now().isoformat()
            
            # For interview flow, ensure equipment is None until explicitly set
            if question != 'equipment_access':
                profile.available_equipment = None
                
            self.profile_manager.save_profile(profile) if hasattr(self.profile_manager, 'save_profile') else None
            
            return {
                'type': 'profile_update',
                'message': f"Got it! {answer} - I've updated your profile.",
                'next_question': self._get_next_interview_question(profile),
                'used_systems': ['profile_manager']
            }
            
        except Exception as e:
            print(f"Profile update error: {e}")
            return {
                'type': 'error',
                'message': "I had trouble updating your profile. Let's try again.",
                'error': str(e)
            }
    
    def _get_next_interview_question(self, profile) -> Optional[Dict]:
        """
        Get the next question in the interview flow
        """
        if not profile.experience_level or profile.experience_level == "beginner":
            return {
                'question': 'experience_level',
                'message': "What's your training experience level? (beginner/intermediate/advanced)"
            }
        elif not profile.goals or not profile.goals.primary_goal:
            return {
                'question': 'fitness_goals',
                'message': "What are your main fitness goals? (muscle_building/weight_loss/strength/endurance)"
            }
        elif not profile.goals or not profile.goals.session_duration:
            return {
                'question': 'time_available',
                'message': "How much time do you have for workouts? (30/45/60/90 minutes)"
            }
        elif not profile.available_equipment:
            return {
                'question': 'equipment_access',
                'message': "What equipment do you have access to? (commercial gym/home gym/bodyweight only)"
            }
        else:
            return None  # Interview complete
    
    def _get_available_equipment(self) -> List[Dict]:
        """
        Get available equipment from catalog
        """
        try:
            return self.equipment_catalog.get_all_equipment() if hasattr(self.equipment_catalog, 'get_all_equipment') else []
        except Exception:
            return []
