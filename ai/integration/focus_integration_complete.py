"""
Focus Integration - Complete interview-driven workout planning system
"""
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import json

from core.focus_router_enhanced import route_focus_request, process_interview_response
from core.exercise_alias_resolver import ExerciseAliasResolver
from core.equipment_catalog import EquipmentCatalog
from core.trainer_brain import PersonalTrainerBrain


class InterviewSession:
    """Manages multi-step interview process"""
    
    def __init__(self, user_id: str, initial_request: str):
        self.user_id = user_id
        self.initial_request = initial_request
        self.questions_asked = []
        self.responses = {}
        self.current_question = None
        self.session_id = f"{user_id}_{datetime.now().isoformat()}"
        self.created_at = datetime.now()
        self.completed = False
        self.context_gathered = {}
        
    def add_response(self, question_type: str, response: str, parsed_value: Any):
        """Add a response to the interview session"""
        self.responses[question_type] = {
            'raw_response': response,
            'parsed_value': parsed_value,
            'timestamp': datetime.now()
        }
        
        # Update context
        self.context_gathered[question_type] = parsed_value
        
    def get_missing_info(self) -> List[str]:
        """Get list of required information still missing"""
        required = ['goal', 'focus', 'equipment', 'time']
        return [req for req in required if req not in self.responses]
        
    def has_complete_info(self) -> bool:
        """Check if we have all required information"""
        return len(self.get_missing_info()) == 0
        
    def build_workout_context(self) -> Dict[str, Any]:
        """Build context dictionary for workout planning"""
        context = {
            'user_id': self.user_id,
            'original_request': self.initial_request,
            'session_id': self.session_id,
            'interview_completed': self.completed,
            'created_at': self.created_at.isoformat()
        }
        
        for question_type, response_data in self.responses.items():
            context[question_type] = response_data['parsed_value']
            
        return context


class FocusIntegrationSystem:
    """
    Main integration system that coordinates interview, planning, and validation
    """
    
    def __init__(self, exercise_db=None, user_profiles=None):
        self.exercise_db = exercise_db
        self.user_profiles = user_profiles
        
        # Initialize alias resolver and equipment catalog
        self.alias_resolver = ExerciseAliasResolver()
        self.equipment_catalog = EquipmentCatalog()
        
        # Active interview sessions
        self.active_sessions = {}
        
    def handle_workout_request(self, user_id: str, message: str, 
                             user_profile: Dict = None) -> Dict[str, Any]:
        """
        Main entry point for handling workout requests
        
        Args:
            user_id: User identifier
            message: User's workout request
            user_profile: User profile data (optional)
            
        Returns:
            Response with action type and data
        """
        # Route the request
        routing_result = route_focus_request(message, user_profile)
        
        if routing_result['action'] == 'reject_nonsense':
            return {
                'response_type': 'rejection',
                'message': "I can't help with that request. I'm designed to help with workout planning.",
                'suggestions': routing_result['suggestions'],
                'reason': routing_result['reason']
            }
            
        elif routing_result['action'] == 'start_interview':
            # Start new interview session
            session = InterviewSession(user_id, message)
            self.active_sessions[user_id] = session
            
            # Get first question
            questions = routing_result['suggested_questions']
            if questions:
                first_question = questions[0]
                session.current_question = first_question
                session.questions_asked.append(first_question)
                
                return {
                    'response_type': 'interview_question',
                    'question': first_question,
                    'session_id': session.session_id,
                    'message': f"I'd like to understand your workout goals better. {first_question['text']}",
                    'context': "Starting workout consultation",
                    'partial_intent': routing_result.get('partial_intent', {})
                }
            else:
                return {
                    'response_type': 'error',
                    'message': "Unable to generate interview questions. Please be more specific about your workout goals."
                }
            
        elif routing_result['action'] == 'direct_planning':
            # We have enough info to plan directly
            return self._plan_workout_direct(
                user_id=user_id,
                focus=routing_result['focus'],
                user_profile=user_profile,
                confidence=routing_result['confidence'],
                focus_details=routing_result.get('focus_details', {})
            )
            
        elif routing_result['action'] == 'confirm_and_interview':
            # Ask for confirmation then start interview if needed
            return {
                'response_type': 'confirmation_with_interview',
                'message': routing_result['confirmation_text'],
                'focus': routing_result['focus'],
                'confidence': routing_result['confidence'],
                'backup_action': 'start_interview'
            }
            
        elif routing_result['action'] == 'confirm_focus':
            return {
                'response_type': 'confirmation',
                'message': routing_result['confirmation_text'],
                'focus': routing_result['focus'],
                'confidence': routing_result['confidence']
            }
            
        elif routing_result['action'] == 'clarify_focus':
            return {
                'response_type': 'clarification',
                'message': "I'm not sure what kind of workout you're looking for.",
                'suggestions': routing_result['suggestions']
            }
            
        # Default fallback
        return {
            'response_type': 'error',
            'message': "I couldn't understand your request. Could you be more specific?",
            'suggestions': [
                'Try specifying muscle groups (chest, back, legs)',
                'Mention your training goal (strength, muscle, endurance)',
                'Ask for a specific workout type (push day, full body, etc.)'
            ]
        }
    
    def handle_interview_response(self, user_id: str, response: str) -> Dict[str, Any]:
        """
        Handle response to an interview question
        
        Args:
            user_id: User identifier
            response: User's response to the question
            
        Returns:
            Next question or workout plan
        """
        session = self.active_sessions.get(user_id)
        if not session:
            return {
                'response_type': 'error',
                'message': "No active interview session found. Please start over with a new workout request."
            }
        
        current_question = session.current_question
        if not current_question:
            return {
                'response_type': 'error',
                'message': "No current question found. Please start over."
            }
        
        # Process the response
        processed = process_interview_response(
            question_type=current_question['type'],
            response=response,
            context={'session': session}
        )
        
        if not processed['valid']:
            # Invalid response, ask again or provide help
            suggestions = processed.get('suggestions', [])
            help_text = f" Try one of: {', '.join(suggestions)}" if suggestions else ""
            
            return {
                'response_type': 'clarification',
                'message': f"I didn't understand that response.{help_text} {current_question['text']}",
                'suggestions': suggestions,
                'question': current_question,
                'error_details': processed
            }
        
        # Valid response - store it
        session.add_response(
            question_type=current_question['type'],
            response=response,
            parsed_value=processed['parsed_value']
        )
        
        # Check if we need more information
        missing_info = session.get_missing_info()
        if missing_info and not session.has_complete_info():
            # Generate next question
            next_question = self._generate_next_question(session, missing_info)
            if next_question:
                session.current_question = next_question
                session.questions_asked.append(next_question)
                
                # Create encouraging progress message
                progress_msg = self._get_progress_message(session, processed['parsed_value'])
                
                return {
                    'response_type': 'interview_question',
                    'question': next_question,
                    'session_id': session.session_id,
                    'message': f"{progress_msg} {next_question['text']}",
                    'progress': {
                        'completed': len(session.responses),
                        'remaining': len(missing_info) - 1,  # -1 because we're asking the next one
                        'percentage': int((len(session.responses) / 4) * 100)  # Assuming 4 required questions
                    }
                }
        
        # We have all the info we need - plan the workout
        session.completed = True
        context = session.build_workout_context()
        
        return self._plan_workout_from_interview(user_id, session, context)
    
    def handle_confirmation(self, user_id: str, confirmed: bool, 
                          original_focus: str = None) -> Dict[str, Any]:
        """
        Handle user confirmation of detected focus
        
        Args:
            user_id: User identifier
            confirmed: Whether user confirmed the focus
            original_focus: The focus that was detected
            
        Returns:
            Workout plan or interview start
        """
        if confirmed and original_focus:
            # User confirmed - proceed with direct planning
            return self._plan_workout_direct(
                user_id=user_id,
                focus=original_focus,
                confidence=0.9  # High confidence since user confirmed
            )
        else:
            # User didn't confirm - start interview
            session = InterviewSession(user_id, f"workout request (focus clarification needed)")
            self.active_sessions[user_id] = session
            
            # Start with focus question since that's what we couldn't determine
            focus_question = {
                'type': 'focus',
                'text': "Which muscle groups would you like to focus on today?",
                'options': ['Upper body', 'Lower body', 'Full body', 'Chest', 'Back', 'Legs', 'Arms'],
                'priority': 'high'
            }
            
            session.current_question = focus_question
            session.questions_asked.append(focus_question)
            
            return {
                'response_type': 'interview_question',
                'question': focus_question,
                'session_id': session.session_id,
                'message': f"No problem! {focus_question['text']}",
                'context': "Focus clarification needed"
            }
    
    def _plan_workout_direct(self, user_id: str, focus: str, 
                           user_profile: Dict = None, confidence: float = 1.0,
                           focus_details: Dict = None) -> Dict[str, Any]:
        """Plan workout directly without interview"""
        try:
            # Build context from available information
            context = {
                'user_id': user_id,
                'focus': focus,
                'confidence': confidence,
                'planning_method': 'direct',
                'focus_details': focus_details or {}
            }
            
            # Add user profile info if available
            if user_profile:
                context.update({
                    'equipment_access': user_profile.get('equipment_access', 'commercial_gym'),
                    'experience_level': user_profile.get('experience_level', 'intermediate'),
                    'available_time': user_profile.get('available_time', '60_minutes'),
                    'injuries': user_profile.get('injuries', [])
                })
            
            # For now, return a structured placeholder that would integrate with focus_planner
            workout_structure = self._generate_workout_structure(focus, context)
            
            return {
                'response_type': 'workout_plan',
                'focus': focus,
                'confidence': confidence,
                'message': f"Here's your {focus.replace('_', ' ')} workout (planned with {confidence:.0%} confidence):",
                'workout': workout_structure,
                'context': context,
                'planning_notes': f"Generated directly from '{focus}' request",
                'suggestions': [
                    "Let me know if you'd like to modify any exercises",
                    "I can adjust the workout based on your equipment or time",
                    "Ask me about form tips for any exercise"
                ]
            }
        except Exception as e:
            return {
                'response_type': 'error',
                'message': f"Error generating workout: {str(e)}",
                'focus': focus,
                'debug_info': {
                    'user_id': user_id,
                    'confidence': confidence,
                    'error_type': type(e).__name__
                }
            }
    
    def _plan_workout_from_interview(self, user_id: str, session: InterviewSession, 
                                   context: Dict[str, Any]) -> Dict[str, Any]:
        """Plan workout using interview context"""
        try:
            focus = context.get('focus', 'full_body')
            goal = context.get('goal', 'general')
            equipment = context.get('equipment', 'commercial_gym')
            time_available = context.get('time', '60_minutes')
            injuries = context.get('injuries', [])
            
            # Enhanced context from interview
            enhanced_context = {
                **context,
                'planning_method': 'interview',
                'interview_session_id': session.session_id,
                'questions_asked': len(session.questions_asked),
                'response_quality': 'complete'
            }
            
            # Generate workout structure
            workout_structure = self._generate_workout_structure(focus, enhanced_context)
            
            # Create personalized message
            focus_name = focus.replace('_', ' ')
            goal_phrase = self._get_goal_phrase(goal)
            equipment_phrase = self._get_equipment_phrase(equipment)
            
            message = f"Perfect! Based on our conversation, here's your {focus_name} workout {goal_phrase} using {equipment_phrase}:"
            
            return {
                'response_type': 'workout_plan',
                'session_id': session.session_id,
                'message': message,
                'workout': workout_structure,
                'context': enhanced_context,
                'planning_notes': "Generated from complete interview responses",
                'interview_summary': {
                    'focus': focus_name,
                    'goal': goal,
                    'equipment': equipment,
                    'duration': time_available,
                    'injuries_considered': injuries
                },
                'suggestions': [
                    "I can explain any exercise or suggest modifications",
                    "Let me know if the workout feels too easy or challenging",
                    "Ask me about progression or alternative exercises"
                ]
            }
        except Exception as e:
            return {
                'response_type': 'error',
                'message': f"Error generating workout from interview: {str(e)}",
                'session_id': session.session_id,
                'debug_info': {
                    'context_keys': list(context.keys()),
                    'session_completed': session.completed,
                    'error_type': type(e).__name__
                }
            }
    
    def _generate_workout_structure(self, focus: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate basic workout structure (placeholder for full implementation)"""
        
        # This would be replaced with actual focus_planner integration
        base_structure = {
            'focus': focus,
            'goal': context.get('goal', 'general'),
            'equipment_type': context.get('equipment_access', 'commercial_gym'),
            'estimated_duration': context.get('available_time', '60_minutes'),
            'experience_level': context.get('experience_level', 'intermediate'),
            'exercises': [],  # Would be populated by focus_planner
            'warm_up': [],    # Would be populated with segment-specific warm-up
            'cool_down': [],  # Would be populated with segment-specific cool-down
            'notes': [],
            'safety_considerations': context.get('injuries', [])
        }
        
        # Add basic exercise placeholders based on focus
        if focus == 'chest':
            base_structure['exercises'] = [
                {'name': 'Barbell Bench Press', 'sets': 4, 'reps': '8-10', 'exercise_id': 'barbell_bench_press'},
                {'name': 'Incline Dumbbell Press', 'sets': 3, 'reps': '10-12', 'exercise_id': 'incline_dumbbell_press'},
                {'name': 'Chest Flyes', 'sets': 3, 'reps': '12-15', 'exercise_id': 'dumbbell_chest_fly'}
            ]
        elif focus == 'back':
            base_structure['exercises'] = [
                {'name': 'Pull-ups', 'sets': 4, 'reps': '6-10', 'exercise_id': 'pull_up'},
                {'name': 'Barbell Rows', 'sets': 4, 'reps': '8-10', 'exercise_id': 'barbell_bent_over_row'},
                {'name': 'Lat Pulldowns', 'sets': 3, 'reps': '10-12', 'exercise_id': 'lat_pulldown'}
            ]
        elif focus == 'pull':
            # Pull day workout - all pulling movements for back and biceps
            base_structure['exercises'] = [
                {'name': 'Pull-ups', 'sets': 4, 'reps': '6-10', 'exercise_id': 'pull_up'},
                {'name': 'Barbell Bent Over Rows', 'sets': 4, 'reps': '8-10', 'exercise_id': 'barbell_bent_over_row'},
                {'name': 'Lat Pulldowns', 'sets': 3, 'reps': '10-12', 'exercise_id': 'lat_pulldown'},
                {'name': 'Seated Cable Rows', 'sets': 3, 'reps': '10-12', 'exercise_id': 'seated_cable_row'},
                {'name': 'Dumbbell Rows', 'sets': 3, 'reps': '10-12', 'exercise_id': 'dumbbell_row'},
                {'name': 'Barbell Curls', 'sets': 3, 'reps': '10-12', 'exercise_id': 'barbell_curl'},
                {'name': 'Hammer Curls', 'sets': 3, 'reps': '12-15', 'exercise_id': 'hammer_curl'}
            ]
        elif focus == 'push':
            # Push day workout - all pushing movements for chest, shoulders, triceps
            base_structure['exercises'] = [
                {'name': 'Barbell Bench Press', 'sets': 4, 'reps': '8-10', 'exercise_id': 'barbell_bench_press'},
                {'name': 'Overhead Press', 'sets': 4, 'reps': '8-10', 'exercise_id': 'overhead_press'},
                {'name': 'Incline Dumbbell Press', 'sets': 3, 'reps': '10-12', 'exercise_id': 'incline_dumbbell_press'},
                {'name': 'Dips', 'sets': 3, 'reps': '8-12', 'exercise_id': 'dips'},
                {'name': 'Lateral Raises', 'sets': 3, 'reps': '12-15', 'exercise_id': 'lateral_raise'},
                {'name': 'Tricep Pushdowns', 'sets': 3, 'reps': '10-12', 'exercise_id': 'tricep_pushdown'},
                {'name': 'Close Grip Bench Press', 'sets': 3, 'reps': '10-12', 'exercise_id': 'close_grip_bench_press'}
            ]
        elif focus == 'legs':
            base_structure['exercises'] = [
                {'name': 'Barbell Squats', 'sets': 4, 'reps': '8-10', 'exercise_id': 'barbell_squat'},
                {'name': 'Romanian Deadlifts', 'sets': 3, 'reps': '8-10', 'exercise_id': 'romanian_deadlift'},
                {'name': 'Bulgarian Split Squats', 'sets': 3, 'reps': '10-12', 'exercise_id': 'bulgarian_split_squat'},
                {'name': 'Leg Curls', 'sets': 3, 'reps': '12-15', 'exercise_id': 'leg_curl'},
                {'name': 'Calf Raises', 'sets': 4, 'reps': '15-20', 'exercise_id': 'calf_raise'}
            ]
        elif focus == 'upper':
            # Upper body workout
            base_structure['exercises'] = [
                {'name': 'Pull-ups', 'sets': 3, 'reps': '6-10', 'exercise_id': 'pull_up'},
                {'name': 'Bench Press', 'sets': 3, 'reps': '8-10', 'exercise_id': 'barbell_bench_press'},
                {'name': 'Overhead Press', 'sets': 3, 'reps': '8-10', 'exercise_id': 'overhead_press'},
                {'name': 'Barbell Rows', 'sets': 3, 'reps': '8-10', 'exercise_id': 'barbell_bent_over_row'},
                {'name': 'Dips', 'sets': 3, 'reps': '8-12', 'exercise_id': 'dips'},
                {'name': 'Barbell Curls', 'sets': 3, 'reps': '10-12', 'exercise_id': 'barbell_curl'}
            ]
        else:
            # Generic full body or other focus
            base_structure['exercises'] = [
                {'name': 'Squats', 'sets': 3, 'reps': '10-12', 'exercise_id': 'barbell_squat'},
                {'name': 'Push-ups', 'sets': 3, 'reps': '10-15', 'exercise_id': 'push_up'},
                {'name': 'Rows', 'sets': 3, 'reps': '10-12', 'exercise_id': 'dumbbell_row'}
            ]
        
        # Add warm-up and cool-down placeholders
        base_structure['warm_up'] = [
            {'name': 'Light Cardio', 'duration': '5-10 minutes', 'exercise_id': 'treadmill_walk_easy'},
            {'name': 'Dynamic Stretching', 'duration': '5 minutes', 'exercise_id': 'dynamic_warm_up'}
        ]
        
        base_structure['cool_down'] = [
            {'name': 'Static Stretching', 'duration': '10 minutes', 'exercise_id': 'static_stretch_routine'},
            {'name': 'Light Walking', 'duration': '5 minutes', 'exercise_id': 'walking_cool_down'}
        ]
        
        return base_structure
    
    def _generate_next_question(self, session: InterviewSession, 
                              missing_info: List[str]) -> Optional[Dict[str, Any]]:
        """Generate the next appropriate question"""
        
        # Priority order for questions
        question_priority = ['goal', 'focus', 'equipment', 'time', 'injuries']
        
        for question_type in question_priority:
            if question_type in missing_info:
                return self._get_question_template(question_type, session)
        
        return None
    
    def _get_question_template(self, question_type: str, 
                             session: InterviewSession) -> Dict[str, Any]:
        """Get question template for specific type"""
        
        templates = {
            'goal': {
                'type': 'goal',
                'text': "What's your main training goal for this workout?",
                'options': ['Build muscle (hypertrophy)', 'Get stronger', 'Improve endurance', 'General fitness'],
                'priority': 'high'
            },
            'focus': {
                'type': 'focus', 
                'text': "Which muscle groups would you like to focus on?",
                'options': ['Upper body', 'Lower body', 'Full body', 'Chest', 'Back', 'Legs', 'Arms'],
                'priority': 'high'
            },
            'equipment': {
                'type': 'equipment',
                'text': "What equipment do you have access to?",
                'options': ['Commercial gym', 'Home gym', 'Dumbbells only', 'Bodyweight only'],
                'priority': 'medium'
            },
            'time': {
                'type': 'time',
                'text': "How much time do you have for this workout?",
                'options': ['30 minutes', '45 minutes', '60 minutes', '90+ minutes'],
                'priority': 'medium'
            },
            'injuries': {
                'type': 'injuries',
                'text': "Any current injuries or areas to be careful with?",
                'options': ['No injuries', 'Shoulder', 'Lower back', 'Knee', 'Other'],
                'priority': 'low'
            }
        }
        
        return templates.get(question_type)
    
    def _get_progress_message(self, session: InterviewSession, latest_response: Any) -> str:
        """Generate encouraging progress message"""
        responses_count = len(session.responses)
        
        messages = [
            "Great!",
            "Perfect!",
            "Excellent!",
            "Got it!",
            "Wonderful!"
        ]
        
        import random
        base_message = random.choice(messages)
        
        if responses_count == 1:
            return f"{base_message} That helps me understand your goals."
        elif responses_count == 2:
            return f"{base_message} I'm getting a clear picture of what you need."
        elif responses_count == 3:
            return f"{base_message} Almost there - just one more question."
        else:
            return f"{base_message}"
    
    def _get_goal_phrase(self, goal: str) -> str:
        """Convert goal to descriptive phrase"""
        goal_phrases = {
            'hypertrophy': 'for muscle building',
            'strength': 'for strength gains',
            'endurance': 'for endurance improvement',
            'general': 'for overall fitness'
        }
        return goal_phrases.get(goal, 'for your goals')
    
    def _get_equipment_phrase(self, equipment: str) -> str:
        """Convert equipment type to descriptive phrase"""
        equipment_phrases = {
            'commercial_gym': 'full gym equipment',
            'home_gym': 'your home gym setup',
            'dumbbells_only': 'just dumbbells',
            'bodyweight_only': 'bodyweight exercises only'
        }
        return equipment_phrases.get(equipment, 'available equipment')
    
    def get_session_status(self, user_id: str) -> Dict[str, Any]:
        """Get current interview session status"""
        session = self.active_sessions.get(user_id)
        if not session:
            return {'active': False}
        
        return {
            'active': True,
            'session_id': session.session_id,
            'completed': session.completed,
            'questions_asked': len(session.questions_asked),
            'responses_given': len(session.responses),
            'missing_info': session.get_missing_info(),
            'current_question': session.current_question,
            'context_gathered': session.context_gathered,
            'progress_percentage': int((len(session.responses) / 4) * 100)  # Assuming 4 required questions
        }
    
    def clear_session(self, user_id: str):
        """Clear active interview session"""
        if user_id in self.active_sessions:
            del self.active_sessions[user_id]
    
    def get_active_sessions_count(self) -> int:
        """Get count of currently active sessions"""
        return len(self.active_sessions)
    
    def cleanup_old_sessions(self, hours_old: int = 24):
        """Clean up sessions older than specified hours"""
        cutoff_time = datetime.now() - timedelta(hours=hours_old)
        
        sessions_to_remove = []
        for user_id, session in self.active_sessions.items():
            if session.created_at < cutoff_time:
                sessions_to_remove.append(user_id)
        
        for user_id in sessions_to_remove:
            del self.active_sessions[user_id]
        
        return len(sessions_to_remove)
