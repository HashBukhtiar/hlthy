"""
AI Orchestrator V2 - PURE AI APPROACH
No hardcoded patterns, no interviews, no routers, no templates.
Let Gemini handle EVERYTHING.

Philosophy: "We do not want cost efficient things right now. 
We need a strict AI approach. Delete everything hardcoded."
"""
from typing import Dict, Any, List, Optional
import json
import sys
import os
import logging

logger = logging.getLogger(__name__)

# Add parent directory to path
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Import only essential systems
try:
    from core.exercise_database import ExerciseDatabase
except ImportError:
    ExerciseDatabase = None

try:
    from utils.semantic_memory import SemanticMemorySystem
except ImportError:
    SemanticMemorySystem = None

try:
    from utils.user_profiles import UserProfileManager
except ImportError:
    UserProfileManager = None

try:
    from utils.ai_profile_extractor import GeminiProfileExtractor
except ImportError:
    GeminiProfileExtractor = None

try:
    from core.progression_tracker_complete import ProgressionTracker
except ImportError:
    ProgressionTracker = None


class AIOrchestrator:
    """
    Pure AI orchestration - Gemini makes ALL decisions:
    - Understanding user intent
    - Deciding what information is needed
    - Generating responses naturally
    - Extracting profile information conversationally
    - Creating workout plans
    
    NO hardcoded patterns. NO keyword matching. NO state machines.
    """
    
    def __init__(self, gemini_model):
        """Initialize with Gemini model and essential systems"""
        self.gemini = gemini_model
        self.exercise_db = ExerciseDatabase() if ExerciseDatabase else None
        self.semantic_memory = SemanticMemorySystem() if SemanticMemorySystem else None
        self.profile_manager = UserProfileManager() if UserProfileManager else None
        self.progression_tracker = ProgressionTracker() if ProgressionTracker else None
        
        # AI-powered profile extraction
        self.profile_extractor = GeminiProfileExtractor(gemini_model=gemini_model) if GeminiProfileExtractor else None
        
    def process_message(self, user_id: str, message: str, context_data: Dict = None) -> Dict:
        """
        Main entry point - Let AI orchestrate everything
        """
        try:
            context_data = context_data or {}
            
            # 1. Load user context (pass context_data to get conversation_history)
            user_context = self._load_user_context(user_id, message, context_data)
            profile = user_context.get('profile')
            
            # 2. CHECK FOR CONVERSATIONAL MEMORY CONFIRMATION FIRST
            conversational_memory = context_data.get('conversational_memory', {})
            if conversational_memory and conversational_memory.get('claims_extracted', 0) > 0:
                pending = conversational_memory.get('pending_confirmations', [])
                return self._handle_profile_confirmation(user_id, pending, message)
            
            # 3. Let AI understand and respond naturally
            return self._ai_orchestrate(user_id, message, user_context, context_data)
                
        except Exception as e:
            logger.error(f"Orchestrator error: {e}", exc_info=True)
            return {
                'type': 'error',
                'message': "I'm having trouble processing your request. Please try again.",
                'error': str(e)
            }
    
    def _load_user_context(self, user_id: str, message: str, context_data: Dict = None) -> Dict:
        """Load user profile and relevant conversation history"""
        try:
            context_data = context_data or {}
            
            # Load profile
            profile = self.profile_manager.load_profile(user_id) if self.profile_manager else None
            
            # Get conversation history from context_data (passed from frontend)
            history = []
            conversation_history = context_data.get('conversation_history', [])
            
            logger.info(f"Loading context for user {user_id[:8]}... | History messages: {len(conversation_history)}")
            
            if conversation_history:
                # Use the full conversation history from the frontend
                # Format: [{"text": "...", "role": "user|model"}]
                history = [
                    {"snippet_text": f"{msg.get('role', 'user').title()}: {msg.get('text', '')}"}
                    for msg in conversation_history[-10:]  # Last 10 messages
                ]
                logger.info(f"Using {len(history)} messages from conversation history")
            else:
                # Fallback to semantic memory if no conversation_history provided
                logger.info("No conversation_history provided, using semantic memory")
                try:
                    if self.semantic_memory:
                        history = self.semantic_memory.retrieve_relevant_snippets(user_id, message, k=5)
                except Exception:
                    pass
            
            # Get allowed exercises based on profile
            allowed_exercises = []
            if self.exercise_db and profile:
                try:
                    injury_types = [injury.injury_type for injury in (profile.active_injuries or [])]
                    equipment = 'commercial_gym'  # Default
                    allowed_exercises = self.exercise_db.get_exercises(
                        equipment_level=equipment,
                        exclude_injuries=injury_types
                    )
                except Exception:
                    pass
            
            return {
                'profile': profile,
                'history': history,
                'allowed_exercises': allowed_exercises
            }
        except Exception as e:
            logger.error(f"Context loading error: {e}")
            return {'profile': None, 'history': [], 'allowed_exercises': []}
    
    def _handle_profile_confirmation(self, user_id: str, pending_claims: List[Dict], original_message: str) -> Dict:
        """
        Generate confirmation message for extracted claims using AI
        """
        try:
            if not pending_claims:
                return {
                    'type': 'acknowledgment',
                    'message': "Got it! I'll remember that.",
                    'used_systems': ['conversational_memory']
                }
            
            # Use AI to generate natural confirmation
            if self.profile_extractor:
                try:
                    message = self.profile_extractor.generate_confirmation(pending_claims)
                    return {
                        'type': 'confirmation_request',
                        'message': message,
                        'pending_confirmations': pending_claims,
                        'used_systems': ['ai_extraction', 'gemini'],
                        'requires_user_confirmation': True
                    }
                except Exception as ai_error:
                    logger.error(f"AI confirmation failed: {ai_error}")
            
            # Simple fallback
            return {
                'type': 'confirmation_request',
                'message': f"Just to confirm I understood correctly. Should I remember this?",
                'pending_confirmations': pending_claims,
                'used_systems': ['fallback'],
                'requires_user_confirmation': True
            }
            
        except Exception as e:
            logger.error(f"Confirmation error: {e}")
            return {
                'type': 'acknowledgment',
                'message': "Got it, thanks!",
                'error': str(e)
            }
    
    def _ai_orchestrate(self, user_id: str, message: str, user_context: Dict, context_data: Dict = None) -> Dict:
        """
        Let AI handle EVERYTHING - understanding, planning, responding
        NO hardcoded logic!
        """
        try:
            context_data = context_data or {}
            profile = user_context.get('profile')
            history = user_context.get('history', [])
            allowed_exercises = user_context.get('allowed_exercises', [])
            
            # Build comprehensive context for Gemini
            prompt = self._build_orchestration_prompt(
                message=message,
                profile=profile,
                history=history,
                allowed_exercises=allowed_exercises
            )
            
            # Let Gemini decide what to do
            response = self.gemini.generate_content(prompt)
            result = self._parse_ai_response(response.text)
            
            # Save conversation to memory
            if self.semantic_memory:
                try:
                    self.semantic_memory.add_snippet(
                        user_id=user_id,
                        snippet_text=f"User: {message}\nAssistant: {result.get('message', '')}",
                        metadata={'timestamp': 'now'}
                    )
                except Exception:
                    pass
            
            return result
            
        except Exception as e:
            logger.error(f"AI orchestration error: {e}", exc_info=True)
            return {
                'type': 'conversational',
                'message': "I'm here to help with your fitness goals! What would you like to work on?",
                'error': str(e)
            }
    
    def _build_orchestration_prompt(self, message: str, profile: Any, history: List, allowed_exercises: List) -> str:
        """
        Build comprehensive prompt for Gemini to orchestrate everything
        """
        # Format profile context with NEW fields
        profile_context = "No profile yet"
        if profile:
            # Extract all profile fields
            exp_level = getattr(profile, 'experience_level', None) or 'Unknown'
            train_freq = getattr(profile, 'training_frequency', None)
            train_freq_str = f"{train_freq} days/week" if train_freq else 'Unknown'
            primary_goals = getattr(profile, 'primary_goals', None) or []
            goals_str = ', '.join(primary_goals) if primary_goals else 'Unknown'
            dislikes = profile.dislikes if hasattr(profile, 'dislikes') and profile.dislikes else []
            dislikes_str = ', '.join(dislikes) if dislikes else 'None'
            
            # Get injuries
            injuries = []
            if hasattr(profile, 'active_injuries') and profile.active_injuries:
                injuries = [i.injury_type if hasattr(i, 'injury_type') else i.get('body_part', 'unknown') for i in profile.active_injuries]
            elif hasattr(profile, 'injuries') and profile.injuries:
                injuries = [i.get('body_part', 'unknown') for i in profile.injuries]
            injuries_str = ', '.join(injuries) if injuries else 'None'
            
            # Get equipment
            equipment = getattr(profile, 'available_equipment', {})
            equipment_str = ', '.join([k for k, v in equipment.items() if v]) if isinstance(equipment, dict) else str(equipment)
            
            # Get preferences
            preferences = getattr(profile, 'preferences', None) or []
            preferences_str = ', '.join(preferences) if preferences else 'None'
            
            profile_context = f"""
Experience Level: {exp_level}
Training Frequency: {train_freq_str}
Primary Goals: {goals_str}
Dislikes: {dislikes_str}
Injuries/Limitations: {injuries_str}
Available Equipment: {equipment_str}
Preferences: {preferences_str}
"""
        
        # Format history
        history_context = "No previous conversations"
        if history:
            history_lines = [h.get('snippet_text', '') for h in history[-10:]]  # Last 10 messages
            history_context = "\n".join(history_lines)
        
        # Format available exercises (limit to 50 for context window)
        exercises_context = "Loading exercises..."
        if allowed_exercises:
            exercise_names = [ex.get('name', '') for ex in allowed_exercises[:50]]
            exercises_context = f"Available: {', '.join(exercise_names)}"
        
        prompt = f"""You are a professional fitness AI coach and workout programmer. Create personalized, safe, and effective workouts.

USER MESSAGE: "{message}"

USER PROFILE:
{profile_context}

RECENT CONVERSATION HISTORY (READ THIS CAREFULLY - DO NOT ASK FOR INFO ALREADY PROVIDED):
{history_context}

CRITICAL INSTRUCTIONS:
- READ THE CONVERSATION HISTORY ABOVE CAREFULLY
- DO NOT ask for information the user already provided in the conversation history
- If they told you their experience level, remember it
- If they told you their goals, remember them
- Use the conversation context to personalize your responses

YOUR TASK:
1. Understand what the user wants (workout plan, advice, information, etc.)

2. If they want a workout, follow this EXACT WORKFLOW:

   **STEP A: Check Profile Completeness**
   - If experience_level is Unknown → Ask: "What's your experience level (beginner/intermediate/advanced)?"
   - If training_frequency is Unknown → Ask: "How many days per week do you train?"
   - If primary_goals is Unknown → Ask: "What are your main fitness goals (build muscle, lose weight, get stronger, etc.)?"
   - If they haven't specified which workout → Ask: "What would you like to focus on (chest, back, legs, full body, etc.)?"
   
   **STEP B: Confirm Profile Before Generating**
   Once you have ALL required info (experience, goals, workout type), BEFORE generating the workout, use type "workout_confirmation":
   {{
     "type": "workout_confirmation",
     "message": "Perfect! Before I create your [workout_type] workout, let me confirm what I'll keep in mind:
     
     **Your Profile:**
     - Experience: [level]
     - Training Frequency: [X] days/week
     - Goals: [goals]
     - Dislikes: [exercises to avoid]
     - Injuries: [body parts to protect]
     - Equipment: [available equipment]
     - Preferences: [any special notes]
     
     I'll design a [workout_type] workout that:
     • Matches your [experience level] training level
     • Avoids [disliked exercises]
     • Protects your [injured areas] (if any)
     • Uses available equipment
     • Focuses on [primary goals]
     [• Incorporates [preferences] when possible]
     
     Does this look correct? Reply 'yes' or 'looks good' to generate the workout, or let me know what to adjust."
   }}
   
   **STEP C: Generate Workout (ONLY after user confirms or if they say "yes"/"looks good"/"correct")**
   If user confirms, generate the workout with a REASONING PARAGRAPH explaining your design decisions.

3. If profile info is missing, ask naturally
4. If just chatting, respond helpfully

CRITICAL RULES FOR WORKOUTS:
- DO NOT include exercises from their dislikes list
- DO modify exercises for injuries (e.g., knee injury → avoid jumping, deep squats)
- DO provide proper form cues in notes
- DO include warm-up if appropriate
- DO structure: 4-6 exercises, 3-4 sets each

RESPOND IN JSON FORMAT:

For profile questions:
{{
    "type": "profile_question",
    "message": "Your question to gather missing profile info",
    "profile_needs": ["experience_level"] (field you're asking about)
}}

For workout confirmation (before generating):
{{
    "type": "workout_confirmation",
    "message": "Your confirmation message showing what you'll consider (see STEP B format above)",
    "profile": {{
        "experience": "[beginner/intermediate/advanced]",
        "trainingFrequency": "[X days/week text]",
        "goals": "[Primary fitness goals]",
        "dislikes": "[Exercises to avoid, or 'None']",
        "injuries": "[Injuries/limitations, or 'None']",
        "equipment": "[Available equipment list]",
        "preferences": "[Special preferences/notes, or 'None']",
        "workoutType": "[The workout focus they requested]"
    }}
}}

For workout generation (after confirmation):
{{
    "type": "workout_plan",
    "message": "Here's your [focus] workout!
    
    **Design Reasoning:**
    I created this workout considering:
    • Your [experience level] experience - [explain exercise selection/intensity]
    • Avoiding [dislikes] - [what you excluded and why]
    • Protecting [injuries] - [modifications made for safety]
    • Using [equipment] - [how this shaped exercise choices]
    • Targeting [goals] - [how workout structure supports this]
    [• Your preference for [preferences] - [how you incorporated it]]
    
    Let me know if you'd like any adjustments!",
    "workout": {{
        "name": "Workout name (e.g., 'Upper Body Strength')",
        "focus": "primary muscle group",
        "duration_minutes": 45,
        "difficulty": "beginner|intermediate|advanced",
        "exercises": [
            {{
                "name": "Exercise name (e.g., 'Push-ups')",
                "sets": 3,
                "reps": "10-12" or "30 seconds",
                "rest_seconds": 60,
                "notes": "Form cues and tips",
                "muscle_groups": ["chest", "triceps"],
                "equipment": "none" or "dumbbells" etc.
            }}
        ]
    }}
}}

For conversational responses:
{{
    "type": "conversational",
    "message": "Your helpful response"
}}

EXAMPLE WORKOUT WITH REASONING:
{{
    "type": "workout_plan",
    "message": "Here's your chest workout!
    
    **Design Reasoning:**
    I created this workout considering:
    • Your advanced experience - included heavy compound movements and higher volume
    • Avoiding burpees - used traditional strength exercises instead
    • Protecting your knee - no jumping or deep squats, stable positions only
    • Using dumbbells and machines - structured around your available equipment
    • Targeting hypertrophy - 3-4 sets of 8-12 reps with controlled tempo
    • Your preference for hammer strength machines - included 2 machine exercises
    
    Let me know if you'd like any adjustments!",
    "workout": {{
        "name": "Chest & Triceps Power",
        "focus": "chest",
        "duration_minutes": 45,
        "difficulty": "intermediate",
        "exercises": [
            {{
                "name": "Push-ups",
                "sets": 3,
                "reps": "10-15",
                "rest_seconds": 60,
                "notes": "Keep core tight, full range of motion",
                "muscle_groups": ["chest", "triceps", "shoulders"],
                "equipment": "none"
            }},
            {{
                "name": "Dumbbell Bench Press",
                "sets": 4,
                "reps": "8-10",
                "rest_seconds": 90,
                "notes": "Control the weight, don't bounce off chest",
                "muscle_groups": ["chest", "triceps"],
                "equipment": "dumbbells"
            }}
        ]
    }}
}}

Be helpful and personalize based on their profile!
"""
        return prompt
    
    def _parse_ai_response(self, response_text: str) -> Dict:
        """
        Parse Gemini's JSON response
        """
        try:
            # Try to extract JSON from response
            response_text = response_text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith('```json'):
                response_text = response_text[7:]
            if response_text.startswith('```'):
                response_text = response_text[3:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            
            result = json.loads(response_text.strip())
            
            # Ensure it has required fields
            if 'type' not in result:
                result['type'] = 'conversational'
            if 'message' not in result:
                result['message'] = "I'm here to help with your fitness!"
            
            result['used_systems'] = ['gemini', 'ai_orchestration']
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}. Raw response: {response_text}")
            # Fallback: use the raw text as a conversational message
            return {
                'type': 'conversational',
                'message': response_text if response_text else "I'm here to help with your fitness!",
                'used_systems': ['gemini', 'fallback']
            }
        except Exception as e:
            logger.error(f"Response parsing error: {e}")
            return {
                'type': 'conversational',
                'message': "I'm here to help! What would you like to work on?",
                'error': str(e),
                'used_systems': ['fallback']
            }
    
    def _save_conversation_context(self, user_id: str, message: str, response: Dict):
        """Save conversation to semantic memory"""
        try:
            if self.semantic_memory:
                snippet = f"User: {message}\nAssistant: {response.get('message', '')}"
                self.semantic_memory.add_snippet(
                    user_id=user_id,
                    snippet_text=snippet,
                    metadata={'timestamp': 'now', 'type': response.get('type', 'unknown')}
                )
        except Exception as e:
            logger.error(f"Memory save error: {e}")
