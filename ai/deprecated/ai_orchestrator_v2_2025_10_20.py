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
            
            # 1. Load user context
            user_context = self._load_user_context(user_id, message)
            profile = user_context.get('profile')
            
            # 2. CHECK FOR CONVERSATIONAL MEMORY CONFIRMATION FIRST
            conversational_memory = context_data.get('conversational_memory', {})
            if conversational_memory and conversational_memory.get('claims_extracted', 0) > 0:
                pending = conversational_memory.get('pending_confirmations', [])
                return self._handle_profile_confirmation(user_id, pending, message)
            
            # 3. Let AI understand and respond naturally
            return self._ai_orchestrate(user_id, message, user_context)
                
        except Exception as e:
            logger.error(f"Orchestrator error: {e}", exc_info=True)
            return {
                'type': 'error',
                'message': "I'm having trouble processing your request. Please try again.",
                'error': str(e)
            }
    
    def _load_user_context(self, user_id: str, message: str) -> Dict:
        """Load user profile and relevant conversation history"""
        try:
            # Load profile
            profile = self.profile_manager.load_profile(user_id) if self.profile_manager else None
            
            # Get relevant history from semantic memory
            history = []
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
    
    def _ai_orchestrate(self, user_id: str, message: str, user_context: Dict) -> Dict:
        """
        Let AI handle EVERYTHING - understanding, planning, responding
        NO hardcoded logic!
        """
        try:
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
        # Format profile context
        profile_context = "No profile yet"
        if profile:
            profile_context = f"""
Experience Level: {getattr(profile, 'experience_level', 'unknown')}
Goals: {getattr(profile.goals, 'primary_goal', 'unknown') if hasattr(profile, 'goals') and profile.goals else 'unknown'}
Dislikes: {', '.join(profile.dislikes) if profile.dislikes else 'none'}
Injuries: {', '.join([i.injury_type for i in (profile.active_injuries or [])]) if hasattr(profile, 'active_injuries') else 'none'}
Equipment: {getattr(profile, 'available_equipment', 'unknown')}
"""
        
        # Format history
        history_context = "No previous conversations"
        if history:
            history_context = "\n".join([h.get('snippet_text', '') for h in history[:3]])
        
        # Format available exercises (limit to 50 for context window)
        exercises_context = "Loading exercises..."
        if allowed_exercises:
            exercise_names = [ex.get('name', '') for ex in allowed_exercises[:50]]
            exercises_context = f"Available: {', '.join(exercise_names)}"
        
        prompt = f"""You are a professional fitness AI coach. Understand the user's message and respond appropriately.

USER MESSAGE: "{message}"

USER PROFILE:
{profile_context}

RECENT CONVERSATION:
{history_context}

AVAILABLE EXERCISES:
{exercises_context}

YOUR TASK:
1. Understand what the user wants (workout plan, information, profile update, etc.)
2. If they want a workout and you have enough profile info, create one
3. If profile info is missing, ask naturally for what you need
4. If they're just chatting, respond helpfully
5. If they mention dislikes/injuries/preferences, note them but don't be pushy

RESPOND IN JSON FORMAT:
{{
    "type": "workout_plan" | "conversational" | "profile_question",
    "message": "Your natural response to the user",
    "workout": {{"name": "...", "exercises": [...]}} (ONLY if type is workout_plan),
    "profile_needs": ["experience_level", "goals", etc.] (ONLY if you need profile info)
}}

Be conversational, helpful, and natural. Don't be robotic!
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
