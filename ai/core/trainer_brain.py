"""
Personal Trainer Brain - Core intelligence for conversational AI trainer
"""
import re
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta


class PersonalTrainerBrain:
    """
    Core intelligence that makes Hlthy AI act like a real personal trainer:
    - Classifies user intent (advice vs workout requests)
    - Maintains conversation state and user context
    - Decides when to interview vs when to provide workouts
    - Offers coaching advice and education
    """
    
    def __init__(self):
        self.required_info = {
            'experience_level': {
                'question': "What's your training experience level?",
                'options': ['Beginner (0-1 year)', 'Intermediate (1-3 years)', 'Advanced (3+ years)'],
                'priority': 'critical'
            },
            'goals': {
                'question': "What are your main fitness goals?",
                'options': ['Build muscle', 'Lose weight', 'Get stronger', 'Improve endurance', 'General fitness'],
                'priority': 'critical'
            },
            'injuries': {
                'question': "Any current injuries or areas I should be careful with?",
                'options': ['No injuries', 'Lower back', 'Shoulders', 'Knees', 'Other'],
                'priority': 'critical'
            },
            'equipment_access': {
                'question': "What equipment do you have access to?",
                'options': ['Full commercial gym', 'Home gym', 'Dumbbells only', 'Bodyweight only'],
                'priority': 'high'
            },
            'workout_split': {
                'question': "Are you following any specific workout split or routine?",
                'options': ['Push/Pull/Legs', 'Upper/Lower', 'Full body', 'Bro split', 'No specific routine'],
                'priority': 'medium'
            },
            'frequency': {
                'question': "How many days per week can you train?",
                'options': ['3 days', '4 days', '5 days', '6+ days'],
                'priority': 'high'
            },
            'time_available': {
                'question': "How much time do you have per workout?",
                'options': ['30 minutes', '45 minutes', '60 minutes', '90+ minutes'],
                'priority': 'high'
            }
        }
    
    def analyze_message_intent(self, message: str) -> Dict[str, Any]:
        """
        Classify user message intent to understand what they're really asking for
        
        Returns:
            {
                'type': 'advice_request' | 'workout_request' | 'general_question' | 'follow_up',
                'confidence': float,
                'focus': str (if workout request),
                'advice_category': str (if advice request)
            }
        """
        normalized = message.lower().strip()
        
        # Advice request patterns - user wants to learn/understand
        advice_patterns = [
            r'how do i',
            r'how can i',
            r'how to',
            r'what should i do to',
            r'best way to',
            r'tips for',
            r'advice on',
            r'help me understand',
            r'explain',
            r'why should i',
            r'what\'s the best',
            r'how important is',
            r'should i be doing'
        ]
        
        # General training question patterns
        general_question_patterns = [
            r'how many times should i train',
            r'how often should i',
            r'how much should i',
            r'what\'s a good frequency',
            r'is it okay to',
            r'can i train',
            r'rest day',
            r'recovery',
            r'should i take'
        ]
        
        # Workout request patterns - user wants a specific workout
        workout_patterns = [
            r'give me a',
            r'send me a',
            r'create a',
            r'plan a',
            r'workout for',
            r'routine for',
            r'exercises for',
            r'i need a',
            r'can you make',
            r'build me a'
        ]
        
        # Follow-up patterns - continuing a conversation
        follow_up_patterns = [
            r'^yes$',
            r'^no$',
            r'^maybe$',
            r'^okay$',
            r'^sure$',
            r'^that sounds good',
            r'^i agree',
            r'^i disagree',
            r'tell me more',
            r'what else',
            r'anything else'
        ]
        
        # Check for advice requests first (highest priority)
        for pattern in advice_patterns:
            if re.search(pattern, normalized):
                # Determine advice category
                advice_category = self._categorize_advice_request(normalized)
                return {
                    'type': 'advice_request',
                    'confidence': 0.9,
                    'advice_category': advice_category,
                    'original_message': message
                }
        
        # Check for general training questions
        for pattern in general_question_patterns:
            if re.search(pattern, normalized):
                return {
                    'type': 'general_question',
                    'confidence': 0.9,
                    'question_category': 'training_frequency',
                    'original_message': message
                }
        
        # Check for follow-up responses
        for pattern in follow_up_patterns:
            if re.search(pattern, normalized):
                return {
                    'type': 'follow_up',
                    'confidence': 0.8,
                    'original_message': message
                }
        
        # Check for workout requests
        for pattern in workout_patterns:
            if re.search(pattern, normalized):
                focus = self._extract_workout_focus(normalized)
                return {
                    'type': 'workout_request',
                    'confidence': 0.9,
                    'focus': focus,
                    'original_message': message
                }
        
        # If no explicit patterns, check if it contains muscle groups or workout terms
        workout_terms = ['workout', 'exercise', 'routine', 'training', 'session']
        muscle_groups = ['chest', 'back', 'legs', 'arms', 'shoulders', 'abs', 'core', 'push', 'pull', 'upper', 'lower', 'full body', 'quad', 'hamstring', 'glute', 'calf']
        
        has_workout_term = any(term in normalized for term in workout_terms)
        has_muscle_group = any(muscle in normalized for muscle in muscle_groups)
        
        if has_muscle_group and has_workout_term:
            focus = self._extract_workout_focus(normalized)
            return {
                'type': 'workout_request',
                'confidence': 0.7,
                'focus': focus,
                'original_message': message
            }
        elif has_muscle_group:
            # Just muscle group mentioned - likely advice request
            advice_category = self._categorize_advice_request(normalized)
            return {
                'type': 'advice_request',
                'confidence': 0.6,
                'advice_category': advice_category,
                'original_message': message
            }
        
        # Default to general question if nothing else matches
        return {
            'type': 'general_question',
            'confidence': 0.4,
            'question_category': 'unclear',
            'original_message': message
        }
    
    def _categorize_advice_request(self, message: str) -> str:
        """Categorize what kind of advice the user is seeking"""
        if any(term in message for term in ['grow', 'build', 'bigger', 'mass', 'size']):
            return 'muscle_building'
        elif any(term in message for term in ['strength', 'strong', 'lift', 'power']):
            return 'strength_training'
        elif any(term in message for term in ['lose', 'fat', 'cut', 'lean']):
            return 'fat_loss'
        elif any(term in message for term in ['injury', 'pain', 'hurt', 'rehab']):
            return 'injury_prevention'
        elif any(term in message for term in ['form', 'technique', 'proper']):
            return 'exercise_technique'
        else:
            return 'general_training'
    
    def _extract_workout_focus(self, message: str) -> Optional[str]:
        """Extract the main focus from a workout request"""
        focus_mapping = {
            'chest': ['chest', 'pecs', 'pectoral'],
            'back': ['back', 'lats', 'latissimus'],
            'shoulders': ['shoulder', 'delts', 'deltoid'],
            'arms': ['arms', 'biceps', 'triceps'],
            'legs': ['legs', 'leg'],
            'quads': ['quad', 'quadriceps'],
            'hamstrings': ['hamstring', 'hams'],
            'glutes': ['glute', 'butt'],
            'calves': ['calf', 'calves'],
            'core': ['core', 'abs', 'abdominal'],
            'push': ['push'],
            'pull': ['pull'],
            'upper': ['upper body', 'upper'],
            'lower': ['lower body', 'lower'],
            'full_body': ['full body', 'fullbody', 'total body']
        }
        
        for focus, keywords in focus_mapping.items():
            if any(keyword in message for keyword in keywords):
                return focus
        
        return None
    
    def get_missing_critical_info(self, user_profile: Dict[str, Any]) -> List[str]:
        """Determine what critical information is missing from user profile"""
        missing = []
        
        for info_key, info_config in self.required_info.items():
            if info_config['priority'] == 'critical':
                if not user_profile.get(info_key):
                    missing.append(info_key)
        
        return missing
    
    def should_interview(self, user_profile: Dict[str, Any], message_intent: Dict[str, Any]) -> bool:
        """
        Decide if we need to interview the user before providing workout/advice
        
        Args:
            user_profile: Current user profile data
            message_intent: Result from analyze_message_intent()
            
        Returns:
            True if interview is needed
        """
        # Always interview for workout requests if we're missing critical info
        if message_intent['type'] == 'workout_request':
            missing_critical = self.get_missing_critical_info(user_profile)
            return len(missing_critical) > 0
        
        # For advice requests, interview if it's about training and we don't know their context
        if message_intent['type'] == 'advice_request':
            advice_category = message_intent.get('advice_category', '')
            
            # Muscle building advice needs to know experience and goals
            if advice_category in ['muscle_building', 'strength_training']:
                if not user_profile.get('experience_level') or not user_profile.get('goals'):
                    return True
            
            # Injury-related advice needs to know their injury history
            if advice_category == 'injury_prevention':
                if not user_profile.get('injuries'):
                    return True
        
        return False
    
    def get_next_interview_question(self, user_profile: Dict[str, Any], conversation_history: List = None) -> Dict[str, Any]:
        """
        Get the next most important question to ask based on what we know
        
        Returns:
            {
                'question': str,
                'options': List[str],
                'question_type': str,
                'priority': str
            }
        """
        # Get missing info sorted by priority
        missing_info = []
        for info_key, info_config in self.required_info.items():
            if not user_profile.get(info_key):
                missing_info.append((info_key, info_config))
        
        # Sort by priority (critical first)
        priority_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
        missing_info.sort(key=lambda x: priority_order[x[1]['priority']])
        
        if not missing_info:
            return None
        
        # Return the highest priority missing info
        info_key, info_config = missing_info[0]
        return {
            'question': info_config['question'],
            'options': info_config['options'],
            'question_type': info_key,
            'priority': info_config['priority']
        }
    
    def generate_advice_response(self, message_intent: Dict[str, Any], user_profile: Dict[str, Any]) -> str:
        """Generate educational/coaching advice response"""
        advice_category = message_intent.get('advice_category', 'general_training')
        original_message = message_intent.get('original_message', '')
        
        if advice_category == 'muscle_building':
            return self._generate_muscle_building_advice(original_message, user_profile)
        elif advice_category == 'strength_training':
            return self._generate_strength_advice(original_message, user_profile)
        elif advice_category == 'fat_loss':
            return self._generate_fat_loss_advice(original_message, user_profile)
        elif advice_category == 'injury_prevention':
            return self._generate_injury_advice(original_message, user_profile)
        elif advice_category == 'exercise_technique':
            return self._generate_technique_advice(original_message, user_profile)
        else:
            return self._generate_general_advice(original_message, user_profile)
    
    def _generate_muscle_building_advice(self, message: str, profile: Dict) -> str:
        """Generate advice for muscle building questions"""
        base_advice = "Great question about building muscle! Here are the key principles:\n\n"
        
        advice_points = [
            "**Progressive Overload**: Gradually increase weight, reps, or sets over time",
            "**Consistency**: Train each muscle group 2-3 times per week",
            "**Nutrition**: Eat in a slight caloric surplus with adequate protein (0.8-1g per lb bodyweight)",
            "**Recovery**: Get 7-9 hours of sleep and allow rest days between intense sessions"
        ]
        
        # Personalize based on profile
        if profile.get('experience_level') == 'beginner':
            advice_points.insert(1, "**Focus on Form**: Master basic movements before adding weight")
        
        return base_advice + "\n".join(advice_points) + "\n\nWould you like me to create a specific workout plan for your goals?"
    
    def _generate_strength_advice(self, message: str, profile: Dict) -> str:
        """Generate advice for strength training questions"""
        return "For building strength, focus on:\n\n• **Heavy compound movements** (squats, deadlifts, bench press)\n• **Lower rep ranges** (3-6 reps)\n• **Longer rest periods** (3-5 minutes)\n• **Progressive overload** with weight increases\n\nWould you like a strength-focused workout plan?"
    
    def _generate_fat_loss_advice(self, message: str, profile: Dict) -> str:
        """Generate advice for fat loss questions"""
        return "Fat loss comes down to:\n\n• **Caloric deficit** (burn more than you consume)\n• **Strength training** to preserve muscle\n• **Cardio** for additional calorie burn\n• **Consistency** with both diet and exercise\n\nRemember: You can't spot-reduce fat from specific areas. Focus on overall body composition changes!"
    
    def _generate_injury_advice(self, message: str, profile: Dict) -> str:
        """Generate advice for injury prevention/management"""
        return "For injury prevention and management:\n\n• **Proper warm-up** before training\n• **Good form** over heavy weight\n• **Listen to your body** - pain is a warning\n• **Gradual progression** - don't rush\n• **Professional help** for persistent issues\n\n⚠️ **Important**: If you're experiencing pain, consult a healthcare professional before continuing training."
    
    def _generate_technique_advice(self, message: str, profile: Dict) -> str:
        """Generate advice for exercise technique questions"""
        return "Great that you're focusing on technique! Key principles:\n\n• **Quality over quantity** - perfect form first\n• **Start light** - master the movement pattern\n• **Control the weight** - slow negatives, explosive positives\n• **Full range of motion** when possible\n• **Mind-muscle connection** - focus on the target muscle\n\nWhich specific exercise would you like technique tips for?"
    
    def _generate_general_advice(self, message: str, profile: Dict) -> str:
        """Generate general training advice"""
        return "I'm here to help with your fitness journey! For the best advice, I'd love to learn more about:\n\n• Your training experience\n• Your specific goals\n• Any injuries or limitations\n• Your available equipment\n\nThis helps me give you personalized recommendations. What would you like to know about training?"
    
    def generate_frequency_advice(self, user_profile: Dict[str, Any]) -> str:
        """Generate advice about training frequency"""
        experience = user_profile.get('experience_level', '').lower()
        goals = user_profile.get('goals', '').lower()
        
        if 'beginner' in experience:
            return "As a beginner, I recommend **3-4 training days per week**:\n\n• Allows proper recovery between sessions\n• Gives you time to learn proper form\n• Prevents overtraining and burnout\n• Full body or upper/lower split works great\n\nFocus on consistency over intensity at first!"
        
        elif 'intermediate' in experience:
            return "For intermediate trainees, **4-5 days per week** is optimal:\n\n• Allows for more volume and specialization\n• Can handle push/pull/legs or upper/lower splits\n• Good balance of training stimulus and recovery\n• Can add cardio on off days if needed\n\nAdjust based on your recovery and life schedule!"
        
        elif 'advanced' in experience:
            return "Advanced trainees can handle **5-6 days per week**:\n\n• Higher training volume tolerance\n• Can do specialized splits (push/pull/legs twice)\n• May benefit from periodization\n• Listen to your body for deload weeks\n\nRemember: More isn't always better - quality over quantity!"
        
        else:
            return "Training frequency depends on several factors:\n\n**Beginners**: 3-4 days/week\n**Intermediate**: 4-5 days/week\n**Advanced**: 5-6 days/week\n\nFactors to consider:\n• Recovery ability\n• Life stress and schedule\n• Training intensity\n• Sleep quality\n\nTo give you a personalized recommendation, what's your training experience level?"
    
    def extract_info_from_response(self, response: str, question_type: str) -> Dict[str, Any]:
        """
        Extract information from user's response to interview questions
        Can extract multiple pieces of info from a single response
        """
        response_lower = response.lower().strip()
        extracted_info = {}
        
        # Experience level extraction
        if question_type == 'experience_level' or any(term in response_lower for term in ['beginner', 'intermediate', 'advanced', 'new', 'year']):
            if any(term in response_lower for term in ['beginner', 'new', 'start', '0', 'never']):
                extracted_info['experience_level'] = 'beginner'
            elif any(term in response_lower for term in ['intermediate', '1-3', '2 year', '3 year']):
                extracted_info['experience_level'] = 'intermediate'
            elif any(term in response_lower for term in ['advanced', '3+', '4 year', '5 year', 'expert']):
                extracted_info['experience_level'] = 'advanced'
        
        # Goals extraction
        if question_type == 'goals' or any(term in response_lower for term in ['build', 'lose', 'strength', 'endurance', 'muscle']):
            if any(term in response_lower for term in ['build', 'muscle', 'mass', 'size', 'bigger']):
                extracted_info['goals'] = 'build_muscle'
            elif any(term in response_lower for term in ['lose', 'weight', 'fat', 'cut', 'lean']):
                extracted_info['goals'] = 'lose_weight'
            elif any(term in response_lower for term in ['strength', 'strong', 'power', 'lift']):
                extracted_info['goals'] = 'get_stronger'
            elif any(term in response_lower for term in ['endurance', 'cardio', 'stamina', 'conditioning']):
                extracted_info['goals'] = 'improve_endurance'
            elif any(term in response_lower for term in ['fitness', 'health', 'general', 'overall']):
                extracted_info['goals'] = 'general_fitness'
        
        # Equipment extraction
        if question_type == 'equipment_access' or any(term in response_lower for term in ['gym', 'home', 'dumbbell', 'bodyweight']):
            if any(term in response_lower for term in ['commercial', 'full', 'gym', 'complete']):
                extracted_info['equipment_access'] = 'commercial_gym'
            elif any(term in response_lower for term in ['home gym', 'home']):
                extracted_info['equipment_access'] = 'home_gym'
            elif any(term in response_lower for term in ['dumbbell', 'db', 'weights']):
                extracted_info['equipment_access'] = 'dumbbells_only'
            elif any(term in response_lower for term in ['bodyweight', 'no equipment', 'nothing']):
                extracted_info['equipment_access'] = 'bodyweight_only'
        
        # Injury extraction
        if question_type == 'injuries' or any(term in response_lower for term in ['injury', 'pain', 'hurt', 'no']):
            if any(term in response_lower for term in ['no', 'none', 'nothing', 'healthy']):
                extracted_info['injuries'] = []
            else:
                injuries = []
                if any(term in response_lower for term in ['back', 'lower back']):
                    injuries.append('lower_back')
                if any(term in response_lower for term in ['shoulder']):
                    injuries.append('shoulder')
                if any(term in response_lower for term in ['knee']):
                    injuries.append('knee')
                if any(term in response_lower for term in ['elbow']):
                    injuries.append('elbow')
                extracted_info['injuries'] = injuries
        
        return extracted_info
