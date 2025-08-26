"""
Focus Integration - Integrates Focus Planner with the existing AI chat system
"""
import json
import time
from typing import Dict, List, Any, Optional, Tuple
from focus_router import FocusPlanner
from exercise_database import ExerciseDatabase
from user_profiles import UserProfileManager


class FocusIntegration:
    """
    Integration layer between Focus Planner and AI chat system.
    Handles focus detection, context building, and prompt enhancement.
    """
    
    def __init__(self, exercise_db: ExerciseDatabase, user_profiles: UserProfileManager):
        """Initialize with required dependencies."""
        self.focus_planner = FocusPlanner(exercise_db, user_profiles)
    
    def enhance_workout_request(self, 
                               user_message: str, 
                               user_id: str, 
                               conversation_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Analyze user message and enhance with Focus Planner if workout request detected.
        
        Args:
            user_message: User's message text
            user_id: User identifier
            conversation_context: Previous conversation context
            
        Returns:
            Enhanced request with focus planning data or original request
        """
        # Detect if this is a workout request
        workout_intent = self._detect_workout_intent(user_message)
        
        if not workout_intent['is_workout_request']:
            return {
                "original_message": user_message,
                "user_id": user_id,
                "enhanced": False,
                "workout_intent": workout_intent
            }
        
        # Extract focus from message
        detected_focus = self._extract_focus_from_message(user_message, conversation_context)
        
        if not detected_focus:
            # Workout request but no clear focus - return with suggestion
            return {
                "original_message": user_message,
                "user_id": user_id,
                "enhanced": False,
                "workout_intent": workout_intent,
                "suggestion": "Please specify a focus (e.g., chest, back, legs, full body) for a more targeted workout plan."
            }
        
        # Process with Focus Planner
        try:
            # Extract additional context from message
            additional_context = self._extract_context_from_message(user_message)
            
            # Determine appropriate ruleset
            ruleset = self._determine_ruleset(user_message, user_id)
            
            # Process focus request
            focus_result = self.focus_planner.process_focus_request(
                focus=detected_focus,
                user_id=user_id,
                context=additional_context,
                ruleset=ruleset
            )
            
            # Build enhanced prompt
            enhanced_prompt = self._build_enhanced_prompt(user_message, focus_result)
            
            return {
                "original_message": user_message,
                "user_id": user_id,
                "enhanced": True,
                "workout_intent": workout_intent,
                "focus_result": focus_result,
                "enhanced_prompt": enhanced_prompt,
                "metadata": {
                    "detected_focus": detected_focus,
                    "applied_ruleset": ruleset,
                    "enhancement_timestamp": self._get_timestamp()
                }
            }
            
        except Exception as e:
            # Log error but don't break the flow
            return {
                "original_message": user_message,
                "user_id": user_id,
                "enhanced": False,
                "workout_intent": workout_intent,
                "error": f"Focus enhancement failed: {str(e)}"
            }
    
    def validate_ai_response(self, 
                           ai_response: str, 
                           enhanced_request: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, Any]]:
        """
        Validate AI response against focus requirements if it was an enhanced request.
        
        Args:
            ai_response: AI's response text
            enhanced_request: Result from enhance_workout_request
            
        Returns:
            (is_valid, violations, validation_details)
        """
        if not enhanced_request.get('enhanced'):
            # Not an enhanced request, skip validation
            return True, [], {"skipped": True, "reason": "Not enhanced request"}
        
        # Parse workout plan from AI response
        workout_plan = self._parse_workout_plan_from_response(ai_response)
        
        if not workout_plan:
            return False, ["Could not parse workout plan from AI response"], {"parse_error": True}
        
        # Validate with Focus Planner
        focus_result = enhanced_request['focus_result']
        return self.focus_planner.validate_workout_plan(workout_plan, focus_result)
    
    def suggest_corrections(self, 
                          ai_response: str, 
                          enhanced_request: Dict[str, Any], 
                          violations: List[str]) -> Dict[str, Any]:
        """
        Suggest corrections for invalid AI response.
        
        Args:
            ai_response: Invalid AI response
            enhanced_request: Enhanced request data
            violations: List of validation violations
            
        Returns:
            Correction suggestions and alternative prompts
        """
        focus_result = enhanced_request['focus_result']
        workout_plan = self._parse_workout_plan_from_response(ai_response)
        
        suggestions = {
            "violations": violations,
            "correction_type": "focus_validation_failed",
            "suggested_fixes": [],
            "alternative_exercises": [],
            "retry_prompt": None
        }
        
        if not workout_plan:
            suggestions["retry_prompt"] = self._build_retry_prompt_for_parsing(enhanced_request)
            return suggestions
        
        # Analyze specific violations
        exercises = self.focus_planner.validator._extract_exercises_from_plan(workout_plan)
        allowed_exercises = focus_result['whitelist_result']['allowed_exercises']
        allowed_set = set(allowed_exercises)
        
        for exercise in exercises:
            exercise_id = exercise.get('exerciseId') or exercise.get('id')
            if exercise_id and exercise_id not in allowed_set:
                # Find substitutions
                substitutes = self.focus_planner.suggest_exercise_substitutions(exercise_id, focus_result)
                if substitutes:
                    suggestions["alternative_exercises"].append({
                        "invalid_exercise": exercise_id,
                        "alternatives": substitutes[:3]  # Top 3 suggestions
                    })
        
        # Build retry prompt
        suggestions["retry_prompt"] = self._build_retry_prompt_with_corrections(enhanced_request, suggestions)
        
        return suggestions
    
    def _detect_workout_intent(self, message: str) -> Dict[str, Any]:
        """Detect if message is requesting a workout."""
        message_lower = message.lower()
        
        # Workout request indicators
        workout_keywords = [
            'workout', 'exercise', 'training', 'routine', 'program',
            'gym', 'lift', 'sets', 'reps', 'muscle', 'strength'
        ]
        
        request_keywords = [
            'create', 'make', 'build', 'design', 'plan', 'give me',
            'show me', 'help me', 'want', 'need', 'looking for'
        ]
        
        has_workout = any(keyword in message_lower for keyword in workout_keywords)
        has_request = any(keyword in message_lower for keyword in request_keywords)
        
        confidence = 0.0
        if has_workout and has_request:
            confidence = 0.9
        elif has_workout:
            confidence = 0.6
        elif any(word in message_lower for word in ['train', 'exercise']):
            confidence = 0.4
        
        return {
            "is_workout_request": confidence > 0.5,
            "confidence": confidence,
            "detected_keywords": {
                "workout_terms": [kw for kw in workout_keywords if kw in message_lower],
                "request_terms": [kw for kw in request_keywords if kw in message_lower]
            }
        }
    
    def _extract_focus_from_message(self, message: str, context: Optional[Dict[str, Any]] = None) -> Optional[str]:
        """Extract focus from user message."""
        message_lower = message.lower()
        
        # Focus keywords mapping
        focus_patterns = {
            'chest': ['chest', 'pecs', 'pectoral', 'bench'],
            'back': ['back', 'lats', 'latissimus', 'rows', 'pull-up', 'pullup'],
            'shoulders': ['shoulder', 'delts', 'deltoid', 'overhead', 'press'],
            'arms': ['arms', 'biceps', 'triceps', 'curls'],
            'legs': ['legs', 'leg day', 'lower body', 'squat', 'deadlift'],
            'quads': ['quads', 'quadriceps', 'front leg', 'knee extension'],
            'hamstrings': ['hamstrings', 'hams', 'back leg', 'rdl'],
            'glutes': ['glutes', 'butt', 'hip thrust', 'bridge'],
            'calves': ['calves', 'calf'],
            'core': ['core', 'abs', 'abdominal', 'planks'],
            'push': ['push day', 'pushing', 'press'],
            'pull': ['pull day', 'pulling'],
            'upper': ['upper body', 'upper'],
            'lower': ['lower body', 'lower'],
            'full_body': ['full body', 'fullbody', 'total body', 'whole body']
        }
        
        # Check for combo patterns first
        combo_patterns = [
            'back and biceps', 'back+biceps', 'back & biceps',
            'chest and triceps', 'chest+triceps', 'chest & triceps',
            'shoulders and triceps', 'shoulders+triceps', 'shoulders & triceps',
            'glutes and hamstrings', 'glutes+hamstrings', 'glutes & hamstrings',
            'quads and calves', 'quads+calves', 'quads & calves'
        ]
        
        for pattern in combo_patterns:
            if pattern in message_lower:
                return pattern.replace(' and ', '+').replace(' & ', '+')
        
        # Check for single focus
        detected_focuses = []
        for focus, patterns in focus_patterns.items():
            if any(pattern in message_lower for pattern in patterns):
                detected_focuses.append(focus)
        
        # Return most specific focus if multiple detected
        if len(detected_focuses) == 1:
            return detected_focuses[0]
        elif len(detected_focuses) > 1:
            # Prefer more specific focuses
            priority = ['biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 
                       'chest', 'back', 'shoulders', 'arms', 'legs', 'push', 'pull', 
                       'upper', 'lower', 'full_body']
            for focus in priority:
                if focus in detected_focuses:
                    return focus
        
        return None
    
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
