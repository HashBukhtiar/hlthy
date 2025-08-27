"""
Focus Integration - Integrates Focus Planner with the existing AI chat system
"""
import json
import time
from typing import Dict, List, Any, Optional, Tuple
from focus_router import (
    is_nonsense_or_unknown, needs_interview, detect_focus, 
    route_focus_request, process_interview_response
)
from exercise_database import CANONICAL_EXERCISES
from exercise_alias_resolver import ExerciseAliasResolver
from user_profiles import UserProfileManager


class FocusIntegration:
    """
    Integration layer between Focus Planner and AI chat system with interview flow.
    Handles focus detection, context building, and interactive consultation.
    """
    
    def __init__(self, user_profiles: UserProfileManager):
        """Initialize with required dependencies."""
        self.user_profiles = user_profiles
        self.alias_resolver = ExerciseAliasResolver()
        self.interview_sessions = {}  # Track ongoing interviews
    
    def process_workout_request(self, 
                               user_message: str, 
                               user_id: str, 
                               conversation_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process workout request with intelligent routing and interview flow.
        
        Args:
            user_message: User's message text
            user_id: User identifier
            conversation_context: Previous conversation context
            
        Returns:
            Response with workout plan, interview questions, or error handling
        """
        # Check for ongoing interview
        if user_id in self.interview_sessions:
            return self._handle_interview_response(user_message, user_id)
        
        # Route the request
        routing_result = self._route_request(user_message, user_id)
        
        if routing_result['type'] == 'nonsense':
            return self._handle_nonsense_request(user_message, routing_result)
        
        elif routing_result['type'] == 'interview_needed':
            return self._start_interview(user_message, user_id, routing_result)
        
        elif routing_result['type'] == 'direct_plan':
            return self._generate_direct_plan(user_message, user_id, routing_result)
        
        else:  # Error or unknown
            return self._handle_error(user_message, routing_result)
    
    def _route_request(self, user_message: str, user_id: str) -> Dict[str, Any]:
        """Route the user request through focus router logic."""
        # Check for nonsense first
        if is_nonsense_or_unknown(user_message):
            return {
                'type': 'nonsense',
                'reason': 'Request contains nonsense or unknown terms',
                'message': user_message
            }
        
        # Detect focus
        focus_result = detect_focus(user_message)
        
        if not focus_result['detected']:
            # Check if interview needed
            if needs_interview(user_message):
                return {
                    'type': 'interview_needed',
                    'reason': 'Request too vague, needs consultation',
                    'detected_intent': focus_result.get('partial_intent'),
                    'message': user_message
                }
            else:
                return {
                    'type': 'nonsense',
                    'reason': 'No clear workout intent detected',
                    'message': user_message
                }
        
        # Check if specific enough for direct planning
        if focus_result['confidence'] >= 0.8 and focus_result['specificity'] >= 0.7:
            return {
                'type': 'direct_plan',
                'focus': focus_result['focus'],
                'confidence': focus_result['confidence'],
                'details': focus_result,
                'message': user_message
            }
        else:
            return {
                'type': 'interview_needed',
                'reason': 'Request needs clarification for optimal planning',
                'detected_focus': focus_result.get('focus'),
                'confidence': focus_result.get('confidence', 0),
                'message': user_message
            }
    
    def _handle_nonsense_request(self, user_message: str, routing_result: Dict) -> Dict[str, Any]:
        """Handle nonsense or invalid requests with helpful guidance."""
        return {
            'type': 'error_response',
            'category': 'invalid_request',
            'message': self._generate_rejection_message(user_message),
            'suggestions': [
                "Try asking for a specific muscle group workout (e.g., 'chest workout', 'leg day')",
                "Request a training split (e.g., 'push day', 'pull workout', 'upper body')", 
                "Ask for a full body workout routine",
                "Specify your goals (e.g., 'strength training', 'muscle building')"
            ],
            'examples': [
                "Create a chest and triceps workout",
                "I need a leg day routine",
                "Help me with a full body workout",
                "Design a back and biceps session"
            ]
        }
    
    def _start_interview(self, user_message: str, user_id: str, routing_result: Dict) -> Dict[str, Any]:
        """Start interactive interview process for vague requests."""
        # Create interview session
        interview_data = {
            'original_request': user_message,
            'detected_focus': routing_result.get('detected_focus'),
            'confidence': routing_result.get('confidence', 0),
            'stage': 'goals',  # Start with goals clarification
            'responses': {},
            'started_at': self._get_timestamp()
        }
        
        self.interview_sessions[user_id] = interview_data
        
        # Generate first interview question
        first_question = self._generate_interview_question(interview_data, user_id)
        
        return {
            'type': 'interview_question',
            'stage': 'goals',
            'question': first_question,
            'context': f"I'd like to help you create the perfect workout! Based on your request '{user_message}', I have a few questions to design something optimal for you.",
            'options': self._get_goals_options(),
            'interview_id': user_id
        }
    
    def _handle_interview_response(self, user_message: str, user_id: str) -> Dict[str, Any]:
        """Handle responses during ongoing interview."""
        interview_data = self.interview_sessions[user_id]
        current_stage = interview_data['stage']
        
        # Process response for current stage
        interview_data['responses'][current_stage] = user_message
        
        # Determine next stage
        next_stage = self._get_next_interview_stage(interview_data)
        
        if next_stage == 'complete':
            # Interview complete, generate workout
            return self._complete_interview(user_id)
        else:
            # Continue interview
            interview_data['stage'] = next_stage
            next_question = self._generate_interview_question(interview_data, user_id)
            
            return {
                'type': 'interview_question',
                'stage': next_stage,
                'question': next_question,
                'context': "Thanks for that information! One more question:",
                'options': self._get_stage_options(next_stage),
                'interview_id': user_id
            }
    
    def _complete_interview(self, user_id: str) -> Dict[str, Any]:
        """Complete interview and generate workout plan."""
        interview_data = self.interview_sessions[user_id]
        
        # Build focus from interview responses
        focus_intent = self._build_focus_from_interview(interview_data)
        
        # Generate workout plan
        workout_result = self._generate_segment_aware_plan(focus_intent, user_id)
        
        # Clean up interview session
        del self.interview_sessions[user_id]
        
        return {
            'type': 'workout_plan',
            'plan': workout_result['plan'],
            'context': f"Perfect! Based on our conversation, I've created a {focus_intent['focus']} workout for you.",
            'interview_summary': self._summarize_interview(interview_data),
            'metadata': {
                'generated_from_interview': True,
                'focus': focus_intent['focus'],
                'timestamp': self._get_timestamp()
            }
        }
    
    def _generate_direct_plan(self, user_message: str, user_id: str, routing_result: Dict) -> Dict[str, Any]:
        """Generate workout plan directly without interview."""
        focus_intent = {
            'focus': routing_result['focus'],
            'detected_type': routing_result['focus'],
            'confidence': routing_result['confidence'],
            'specificity': routing_result['details'].get('specificity', 0.8),
            'user_context': {}
        }
        
        # Add any context from message
        focus_intent['user_context'] = self._extract_context_from_message(user_message)
        
        # Generate segment-aware workout
        workout_result = self._generate_segment_aware_plan(focus_intent, user_id)
        
        return {
            'type': 'workout_plan',
            'plan': workout_result['plan'],
            'context': f"Here's your {focus_intent['focus']} workout plan:",
            'metadata': {
                'generated_from_direct': True,
                'focus': focus_intent['focus'],
                'confidence': focus_intent['confidence'],
                'timestamp': self._get_timestamp()
            }
        }
    
    def _generate_segment_aware_plan(self, focus_intent: Dict, user_id: str) -> Dict[str, Any]:
        """Generate a complete segment-aware workout plan."""
        from focus_composer import compose_segment_aware_plan
        from focus_whitelist import build_focus_whitelist
        
        # Get user context
        user_profile = self.user_profiles.get_profile(user_id)
        user_context = {
            'equipment': user_profile.get('equipment', ['dumbbells', 'barbell', 'cables']),
            'experience': user_profile.get('experience_level', 'intermediate'),
            'injuries': user_profile.get('injuries', []),
            'dislikes': user_profile.get('disliked_exercises', [])
        }
        
        # Merge with focus intent context
        user_context.update(focus_intent.get('user_context', {}))
        
        # Build exercise whitelist
        whitelist = build_focus_whitelist(user_context, focus_intent['focus'])
        
        # Compose complete workout
        complete_plan = compose_segment_aware_plan(
            focus_intent=focus_intent,
            whitelist=whitelist,
            user_context=user_context
        )
        
        return {'plan': complete_plan, 'whitelist': whitelist}
    
    def _generate_interview_question(self, interview_data: Dict, user_id: str) -> str:
        """Generate appropriate interview question for current stage."""
        stage = interview_data['stage']
        
        questions = {
            'goals': "What's your main goal for this workout?",
            'focus': "Which muscle groups would you like to prioritize?",
            'equipment': "What equipment do you have access to?",
            'experience': "How would you describe your training experience?",
            'time': "How much time do you have for this workout?",
            'intensity': "What intensity level are you looking for?"
        }
        
        return questions.get(stage, "What additional details can you provide?")
    
    def _get_goals_options(self) -> List[str]:
        """Get goal options for first interview question."""
        return [
            "Build muscle/hypertrophy",
            "Increase strength",
            "General fitness",
            "Lose weight/tone up",
            "Athletic performance",
            "Rehabilitation/recovery"
        ]
    
    def _get_stage_options(self, stage: str) -> List[str]:
        """Get options for specific interview stage."""
        options_map = {
            'focus': [
                "Upper body", "Lower body", "Full body",
                "Chest", "Back", "Shoulders", "Arms", "Legs",
                "Push muscles", "Pull muscles", "Core"
            ],
            'equipment': [
                "Full gym", "Home gym with weights", "Dumbbells only",
                "Bodyweight only", "Resistance bands", "Limited equipment"
            ],
            'experience': [
                "Beginner (less than 6 months)",
                "Intermediate (6 months - 2 years)", 
                "Advanced (2+ years)",
                "Expert/competitive athlete"
            ],
            'time': [
                "15-30 minutes", "30-45 minutes", "45-60 minutes",
                "60-90 minutes", "90+ minutes", "Flexible"
            ],
            'intensity': [
                "Light/recovery", "Moderate", "Challenging",
                "Very intense", "Maximum effort", "Depends on exercise"
            ]
        }
        
        return options_map.get(stage, [])
    
    def _get_next_interview_stage(self, interview_data: Dict) -> str:
        """Determine next stage in interview flow."""
        current_stage = interview_data['stage']
        responses = interview_data['responses']
        
        stage_flow = ['goals', 'focus', 'equipment', 'experience', 'time']
        
        try:
            current_index = stage_flow.index(current_stage)
            if current_index + 1 < len(stage_flow):
                return stage_flow[current_index + 1]
            else:
                return 'complete'
        except ValueError:
            return 'complete'
    
    def _build_focus_from_interview(self, interview_data: Dict) -> Dict[str, Any]:
        """Build focus intent from interview responses."""
        responses = interview_data['responses']
        
        # Extract focus from responses
        focus_response = responses.get('focus', '').lower()
        goals_response = responses.get('goals', '').lower()
        
        # Map responses to focus types
        focus_mapping = {
            'upper body': 'upper',
            'lower body': 'lower', 
            'full body': 'full_body',
            'chest': 'chest',
            'back': 'back',
            'shoulders': 'shoulders',
            'arms': 'arms',
            'legs': 'legs',
            'push muscles': 'push',
            'pull muscles': 'pull',
            'core': 'core'
        }
        
        detected_focus = None
        for key, value in focus_mapping.items():
            if key in focus_response:
                detected_focus = value
                break
        
        # Fallback to original detected focus
        if not detected_focus:
            detected_focus = interview_data.get('detected_focus', 'full_body')
        
        # Build context from other responses
        user_context = {}
        
        # Equipment mapping
        equipment_response = responses.get('equipment', '').lower()
        if 'bodyweight' in equipment_response:
            user_context['equipment'] = ['bodyweight']
        elif 'dumbbells only' in equipment_response:
            user_context['equipment'] = ['dumbbells']
        elif 'home gym' in equipment_response:
            user_context['equipment'] = ['dumbbells', 'barbell', 'bench']
        else:
            user_context['equipment'] = ['dumbbells', 'barbell', 'cables', 'machines']
        
        # Experience mapping  
        exp_response = responses.get('experience', '').lower()
        if 'beginner' in exp_response:
            user_context['experience'] = 'beginner'
        elif 'advanced' in exp_response or 'expert' in exp_response:
            user_context['experience'] = 'advanced'
        else:
            user_context['experience'] = 'intermediate'
        
        return {
            'focus': detected_focus,
            'detected_type': detected_focus,
            'confidence': 0.9,  # High confidence from interview
            'specificity': 0.9,
            'user_context': user_context,
            'interview_based': True
        }
    
    def _summarize_interview(self, interview_data: Dict) -> str:
        """Create summary of interview responses."""
        responses = interview_data['responses']
        
        summary_parts = []
        
        if 'goals' in responses:
            summary_parts.append(f"Goal: {responses['goals']}")
        if 'focus' in responses:
            summary_parts.append(f"Focus: {responses['focus']}")
        if 'equipment' in responses:
            summary_parts.append(f"Equipment: {responses['equipment']}")
        if 'experience' in responses:
            summary_parts.append(f"Experience: {responses['experience']}")
        if 'time' in responses:
            summary_parts.append(f"Time: {responses['time']}")
        
        return " | ".join(summary_parts)
    
    def _extract_context_from_message(self, message: str) -> Dict[str, Any]:
        """Extract additional context from message."""
        message_lower = message.lower()
        context = {}
        
        # Equipment mentions
        equipment_keywords = {
            'dumbbells': ['dumbbell', 'db'],
            'barbell': ['barbell', 'bb'],
            'cables': ['cable', 'cables'],
            'machines': ['machine', 'machines'],
            'bodyweight': ['bodyweight', 'body weight', 'no equipment']
        }
        
        available_equipment = []
        for equipment, keywords in equipment_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                available_equipment.append(equipment)
        
        if available_equipment:
            context['available_equipment'] = available_equipment
        
        # Time constraints
        if any(word in message_lower for word in ['quick', 'short', 'fast', '15 min', '20 min', '30 min']):
            context['time_constraint'] = 'short'
        elif any(word in message_lower for word in ['long', 'extended', 'hour', '60 min', '90 min']):
            context['time_constraint'] = 'long'
        
        # Intensity preferences
        if any(word in message_lower for word in ['light', 'easy', 'beginner', 'gentle']):
            context['intensity_preference'] = 'low'
        elif any(word in message_lower for word in ['intense', 'hard', 'challenging', 'advanced']):
            context['intensity_preference'] = 'high'
        
        return context
    
    def _determine_ruleset(self, message: str, user_id: str) -> str:
        """Determine appropriate ruleset based on message and user."""
        message_lower = message.lower()
        
        # Check message for explicit indicators
        if any(word in message_lower for word in ['beginner', 'new', 'starting', 'first time']):
            return 'beginner'
        elif any(word in message_lower for word in ['advanced', 'experienced', 'intense', 'hardcore']):
            return 'advanced'
        elif any(word in message_lower for word in ['quick', 'short', 'fast', '15', '20', '30']):
            return 'time_efficient'
        elif any(word in message_lower for word in ['high volume', 'lots of', 'many sets']):
            return 'high_volume'
        
        # Default to intermediate
        return 'intermediate'
    
    def _build_enhanced_prompt(self, original_message: str, focus_result: Dict[str, Any]) -> str:
        """Build enhanced prompt with focus planning data."""
        components = focus_result['prompt_components']
        
        prompt = f"""Original request: "{original_message}"

{components['focus_instruction']}

{components['exercise_whitelist']}

{components['rubric']}

{components['constraints']}

{components['user_context']}

{components['validation_reminder']}

Please create a complete workout plan in JSON format with the following structure:
{{
    "focus": "{focus_result['focus']}",
    "exercises": [
        {{
            "exerciseId": "valid_id_from_list_above",
            "name": "Exercise Name",
            "sets": 3,
            "reps": "8-12",
            "notes": "Optional form cues or modifications"
        }}
    ],
    "warmup": "Suggested warm-up routine",
    "cooldown": "Suggested cool-down routine",
    "notes": "Additional workout notes"
}}"""
        
        return prompt
    
    def _parse_workout_plan_from_response(self, response: str) -> Optional[Dict[str, Any]]:
        """Parse workout plan JSON from AI response."""
        # Try to find JSON in response
        start_markers = ['{', '```json', '```']
        end_markers = ['}', '```']
        
        for start_marker in start_markers:
            start_idx = response.find(start_marker)
            if start_idx != -1:
                # Find corresponding end
                if start_marker == '{':
                    # Find matching closing brace
                    brace_count = 0
                    for i, char in enumerate(response[start_idx:]):
                        if char == '{':
                            brace_count += 1
                        elif char == '}':
                            brace_count -= 1
                            if brace_count == 0:
                                json_str = response[start_idx:start_idx + i + 1]
                                try:
                                    return json.loads(json_str)
                                except json.JSONDecodeError:
                                    continue
                else:
                    # Find end marker
                    for end_marker in end_markers:
                        end_idx = response.find(end_marker, start_idx + len(start_marker))
                        if end_idx != -1:
                            json_str = response[start_idx + len(start_marker):end_idx].strip()
                            if json_str.startswith('{'):
                                try:
                                    return json.loads(json_str)
                                except json.JSONDecodeError:
                                    continue
        
        return None
    
    def _build_retry_prompt_for_parsing(self, enhanced_request: Dict[str, Any]) -> str:
        """Build retry prompt for parsing failures."""
        return f"""The previous response could not be parsed as a valid workout plan. 
Please provide the workout plan in valid JSON format using this exact structure:

{{
    "focus": "{enhanced_request['focus_result']['focus']}",
    "exercises": [
        {{
            "exerciseId": "must_be_from_allowed_list",
            "name": "Exercise Name",
            "sets": 3,
            "reps": "8-12"
        }}
    ]
}}

Use ONLY exerciseIds from the previously provided allowed exercises list."""
    
    def _build_retry_prompt_with_corrections(self, enhanced_request: Dict[str, Any], suggestions: Dict[str, Any]) -> str:
        """Build retry prompt with specific corrections."""
        focus_result = enhanced_request['focus_result']
        
        prompt = f"""The workout plan had validation errors. Please create a corrected version:

VIOLATIONS FOUND:
{chr(10).join(f"- {violation}" for violation in suggestions['violations'])}

"""
        
        if suggestions['alternative_exercises']:
            prompt += "SUGGESTED EXERCISE SUBSTITUTIONS:\n"
            for alt in suggestions['alternative_exercises']:
                prompt += f"- Replace '{alt['invalid_exercise']}' with one of:\n"
                for substitute in alt['alternatives']:
                    prompt += f"  * {substitute['exercise_id']}: {substitute['name']}\n"
            prompt += "\n"
        
        prompt += f"""REMEMBER:
- Use ONLY exerciseIds from the original allowed exercises list
- Follow the {focus_result['focus']} focus requirements
- Stay within the specified exercise and set limits

Please provide the corrected workout plan in JSON format."""
        
        return prompt
    
    def _get_timestamp(self) -> str:
        """Get current timestamp."""
        from datetime import datetime
        return datetime.utcnow().isoformat() + "Z"
