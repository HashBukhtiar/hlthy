"""
Intelligent Integration - AI brain orchestrating all your systems
"""
from typing import Dict, Any
import sys
import os

# Add parent directory to path for imports
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from core.ai_orchestrator import AIOrchestrator
from core.trainer_brain import PersonalTrainerBrain  # Your existing logic
from utils.rate_limiting import RateLimiter
from utils.observability_dashboard import ObservabilityDashboard


class IntelligentIntegration:
    """
    Uses AI to orchestrate all your sophisticated systems while keeping your existing logic
    """
    
    def __init__(self, gemini_model):
        self.orchestrator = AIOrchestrator(gemini_model)
        self.trainer_brain = PersonalTrainerBrain()  # Keep your existing logic
        self.rate_limiter = RateLimiter() if self._has_rate_limiter() else None
        self.observability = ObservabilityDashboard() if self._has_observability() else None
        
    def handle_request(self, user_id: str, message: str) -> Dict:
        """
        Intelligently handle requests using ALL your systems
        """
        
        try:
            # 1. Check rate limiting
            if self.rate_limiter and not self.rate_limiter.check_limit(user_id):
                return {
                    'type': 'error',
                    'message': 'Rate limit exceeded. Please wait a moment.'
                }
            
            # 2. Log to observability
            if self.observability:
                self.observability.log_request(user_id, message)
            
            # 3. First use your trainer brain for initial classification (fallback)
            fallback_intent = self.trainer_brain.analyze_message_intent(message)
            
            # 4. Then use AI orchestrator with all your systems
            result = self.orchestrator.process_message(user_id, message)
            
            # 5. If AI orchestrator fails, use trainer brain fallback
            if result.get('type') == 'error' and fallback_intent:
                result = self._handle_with_trainer_brain(user_id, message, fallback_intent)
            
            # 6. Log the result
            if self.observability:
                self.observability.log_response(user_id, result)
            
            return result
            
        except Exception as e:
            if self.observability:
                self.observability.log_error(f"IntelligentIntegration error: {e}")
            
            # Ultimate fallback
            return {
                'type': 'error',
                'message': 'I apologize, but I\'m having trouble processing your request. Please try again.',
                'error': str(e)
            }
    
    def _handle_with_trainer_brain(self, user_id: str, message: str, intent: Dict) -> Dict:
        """
        Fallback to your existing trainer brain logic
        """
        try:
            if intent['type'] == 'advice_request':
                advice = self.trainer_brain.generate_advice_response(intent, {})
                return {
                    'type': 'advice',
                    'message': advice,
                    'fallback': True,
                    'system_used': 'trainer_brain'
                }
            elif intent['type'] == 'workout_request':
                return {
                    'type': 'interview',
                    'message': "I'd love to create a workout for you! First, what's your training experience level?",
                    'fallback': True,
                    'system_used': 'trainer_brain'
                }
            elif intent['type'] == 'general_question':
                advice = self.trainer_brain.generate_frequency_advice({})
                return {
                    'type': 'advice',
                    'message': advice,
                    'fallback': True,
                    'system_used': 'trainer_brain'
                }
            else:
                return {
                    'type': 'clarification',
                    'message': "I'm here to help with your fitness journey. What would you like to know?",
                    'fallback': True,
                    'system_used': 'trainer_brain'
                }
                
        except Exception as e:
            return {
                'type': 'error',
                'message': "I'm having trouble understanding your request. Could you please rephrase?",
                'error': str(e)
            }
    
    def _has_rate_limiter(self) -> bool:
        """Check if rate limiter is available"""
        try:
            from ..utils.rate_limiting import RateLimiter
            return True
        except ImportError:
            return False
    
    def _has_observability(self) -> bool:
        """Check if observability dashboard is available"""
        try:
            from ..utils.observability_dashboard import ObservabilityDashboard
            return True
        except ImportError:
            return False


class LegacyCompatibilityWrapper:
    """
    Wrapper to maintain compatibility with existing API while using new system
    """
    
    def __init__(self, gemini_model):
        self.intelligent_integration = IntelligentIntegration(gemini_model)
    
    def handle_workout_request(self, user_id: str, message: str, user_profile: Dict = None) -> Dict:
        """
        Legacy API compatibility - maps old interface to new intelligent system
        """
        result = self.intelligent_integration.handle_request(user_id, message)
        
        # Map new response format to legacy format expected by API
        legacy_response = {
            'response_type': result.get('type', 'unknown'),
            'message': result.get('message', 'Response generated'),
        }
        
        # Add type-specific fields for backward compatibility
        if result.get('type') == 'workout':
            legacy_response.update({
                'workout': result.get('workout'),
                'planning_notes': f"Generated using systems: {', '.join(result.get('used_systems', []))}"
            })
        elif result.get('type') == 'advice':
            legacy_response.update({
                'advice_category': result.get('intent', 'general'),
                'follow_up_suggestions': [
                    "Would you like a workout plan?",
                    "Any other questions?",
                    "Need help with exercise form?"
                ]
            })
        elif result.get('type') == 'technique':
            legacy_response.update({
                'exercise': result.get('exercise'),
                'technique': result.get('technique'),
                'common_mistakes': result.get('common_mistakes', []),
                'progressions': result.get('progressions', [])
            })
        elif result.get('type') == 'error':
            legacy_response.update({
                'response_type': 'clarification',
                'suggestions': [
                    "Try asking for a specific workout",
                    "Ask about exercise technique",
                    "Request training advice"
                ]
            })
        
        return legacy_response
