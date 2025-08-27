"""
Focus Router - Enhanced router with nonsense detection and interview triggers
"""
import re
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from focus_rules import normalize_focus, BASE_FOCI


def is_nonsense_or_unknown(text: str) -> bool:
    """
    Detect if the request is nonsense or doesn't map to any workout concept
    
    Args:
        text: User input text
        
    Returns:
        True if the text appears to be nonsense or unrelated to fitness
    """
    if not text or len(text.strip()) < 2:
        return True
    
    normalized = text.lower().strip()
    
    # Known nonsense/unrelated terms
    nonsense_terms = {
        'toenails', 'fingernails', 'hair', 'teeth', 'ears', 'nose', 
        'eyebrows', 'eyelashes', 'tongue', 'lips', 'skin', 'nails',
        'weather', 'politics', 'movies', 'music', 'food', 'cooking',
        'sleeping', 'driving', 'reading', 'writing', 'painting',
        'kidney', 'liver', 'lung', 'brain', 'stomach', 'intestine',
        'spleen', 'pancreas', 'bladder', 'appendix'
    }
    
    # Check for exact nonsense matches
    for term in nonsense_terms:
        if term in normalized:
            return True
    
    # Check if it contains any fitness-related terms
    fitness_terms = {
        'workout', 'exercise', 'train', 'build', 'strength', 'muscle',
        'chest', 'back', 'shoulders', 'legs', 'arms', 'abs', 'core',
        'push', 'pull', 'squat', 'press', 'row', 'curl', 'fly',
        'cardio', 'hiit', 'circuit', 'superset', 'dropset',
        'hypertrophy', 'power', 'endurance', 'mobility', 'flexibility',
        'upper', 'lower', 'full body', 'split', 'bro split',
        'glutes', 'quads', 'hamstrings', 'calves', 'biceps', 'triceps',
        'delts', 'traps', 'lats', 'rhomboids', 'obliques', 'mass',
        'gains', 'pump', 'conditioning', 'athletic', 'performance'
    }
    
    has_fitness_term = any(term in normalized for term in fitness_terms)
    
    # If no fitness terms found, likely nonsense
    if not has_fitness_term:
        return True
    
    return False


def needs_interview(text: str, user_profile: Dict = None) -> bool:
    """
    Determine if we need to conduct an interview before planning
    
    Args:
        text: User input text
        user_profile: User profile data
        
    Returns:
        True if interview is needed
    """
    normalized = text.lower().strip()
    
    # Generic/vague requests that need clarification
    vague_patterns = [
        r'^build my \w+$',           # "build my back"
        r'^train \w+$',              # "train legs"
        r'^workout$',                # just "workout"
        r'^help me$',                # "help me"
        r'^make me strong$',         # "make me strong"
        r'^get me fit$',             # "get me fit"
        r'^i want to workout$',      # "i want to workout"
        r'^i need a workout$',       # "i need a workout"
        r'^give me a workout$',      # "give me a workout"
        r'^create a workout$',       # "create a workout"
        r'^help me get \w+$',        # "help me get stronger"
        r'^i want to build \w+$',    # "i want to build muscle"
        r'^i want to train$',        # "i want to train"
        r'^workout for today$',      # "workout for today"
        r'^gym time$',               # "gym time"
        r'^\w+ day$'                 # "leg day" (but still vague)
    ]
    
    is_vague = any(re.match(pattern, normalized) for pattern in vague_patterns)
    
    if not is_vague:
        return False
    
    # Check if profile has recent workout context (within last 7 days)
    if not user_profile:
        return True
    
    last_interview = user_profile.get('last_interview_date')
    if not last_interview:
        return True
    
    # Check if we have necessary information
    required_fields = ['workout_goal', 'available_time', 'equipment_access', 'experience_level']
    missing_info = any(field not in user_profile or not user_profile[field] for field in required_fields)
    
    if missing_info:
        return True
    
    # Check if last interview was more than 7 days ago
    try:
        last_date = datetime.fromisoformat(last_interview)
        if datetime.now() - last_date > timedelta(days=7):
            return True
    except:
        return True
    
    return False


def detect_focus(text: str) -> Dict[str, Any]:
    """
    Detect workout focus from user text with confidence scoring
    
    Args:
        text: User input text
        
    Returns:
        Dictionary with detected focus, confidence, and specificity scores
    """
    normalized = text.lower().strip()
    
    # Focus patterns with confidence weights
    focus_patterns = {
        'chest': {
            'patterns': ['chest', 'pecs', 'pectoral', 'bench', 'push up'],
            'confidence_base': 0.9,
            'specificity': 0.8
        },
        'back': {
            'patterns': ['back', 'lats', 'latissimus', 'rows', 'pull-up', 'pullup', 'pull up'],
            'confidence_base': 0.9,
            'specificity': 0.8
        },
        'shoulders': {
            'patterns': ['shoulder', 'delts', 'deltoid', 'overhead', 'shoulder press'],
            'confidence_base': 0.9,
            'specificity': 0.8
        },
        'arms': {
            'patterns': ['arms', 'biceps', 'triceps', 'curls', 'arm day'],
            'confidence_base': 0.8,
            'specificity': 0.7
        },
        'legs': {
            'patterns': ['legs', 'leg day', 'lower body', 'squat', 'deadlift'],
            'confidence_base': 0.8,
            'specificity': 0.7
        },
        'quads': {
            'patterns': ['quads', 'quadriceps', 'front leg', 'knee extension'],
            'confidence_base': 0.9,
            'specificity': 0.9
        },
        'hamstrings': {
            'patterns': ['hamstrings', 'hams', 'back leg', 'rdl', 'romanian deadlift'],
            'confidence_base': 0.9,
            'specificity': 0.9
        },
        'glutes': {
            'patterns': ['glutes', 'butt', 'hip thrust', 'bridge', 'glute day'],
            'confidence_base': 0.9,
            'specificity': 0.9
        },
        'calves': {
            'patterns': ['calves', 'calf', 'lower leg'],
            'confidence_base': 0.9,
            'specificity': 0.9
        },
        'core': {
            'patterns': ['core', 'abs', 'abdominal', 'planks', 'ab day'],
            'confidence_base': 0.8,
            'specificity': 0.8
        },
        'push': {
            'patterns': ['push day', 'pushing', 'push workout', 'push session'],
            'confidence_base': 0.9,
            'specificity': 0.8
        },
        'pull': {
            'patterns': ['pull day', 'pulling', 'pull workout', 'pull session'],
            'confidence_base': 0.9,
            'specificity': 0.8
        },
        'upper': {
            'patterns': ['upper body', 'upper', 'upper day'],
            'confidence_base': 0.8,
            'specificity': 0.7
        },
        'lower': {
            'patterns': ['lower body', 'lower', 'lower day'],
            'confidence_base': 0.8,
            'specificity': 0.7
        },
        'full_body': {
            'patterns': ['full body', 'fullbody', 'total body', 'whole body', 'full workout'],
            'confidence_base': 0.8,
            'specificity': 0.7
        }
    }
    
    # Check for combo patterns first
    combo_patterns = [
        ('back_biceps', ['back and biceps', 'back+biceps', 'back & biceps', 'back bicep']),
        ('chest_triceps', ['chest and triceps', 'chest+triceps', 'chest & triceps', 'chest tricep']),
        ('shoulders_triceps', ['shoulders and triceps', 'shoulders+triceps', 'shoulders & triceps']),
        ('glutes_hamstrings', ['glutes and hamstrings', 'glutes+hamstrings', 'glutes & hamstrings']),
        ('quads_calves', ['quads and calves', 'quads+calves', 'quads & calves'])
    ]
    
    for combo_focus, patterns in combo_patterns:
        for pattern in patterns:
            if pattern in normalized:
                return {
                    'detected': True,
                    'focus': combo_focus,
                    'detected_type': combo_focus,
                    'confidence': 0.9,
                    'specificity': 0.8,
                    'match_type': 'combo',
                    'matched_pattern': pattern
                }
    
    # Check for single focus
    detected_focuses = []
    for focus, config in focus_patterns.items():
        for pattern in config['patterns']:
            if pattern in normalized:
                # Calculate confidence based on specificity and context
                confidence = config['confidence_base']
                
                # Boost confidence for exact matches
                if pattern == normalized.strip():
                    confidence = min(1.0, confidence + 0.1)
                
                # Boost confidence for workout context words
                context_words = ['workout', 'training', 'session', 'day', 'exercise']
                if any(word in normalized for word in context_words):
                    confidence = min(1.0, confidence + 0.05)
                
                detected_focuses.append({
                    'focus': focus,
                    'confidence': confidence,
                    'specificity': config['specificity'],
                    'matched_pattern': pattern
                })
                break
    
    if not detected_focuses:
        return {
            'detected': False,
            'focus': None,
            'confidence': 0.0,
            'specificity': 0.0,
            'partial_intent': _extract_partial_intent(normalized)
        }
    
    # Return most specific/confident focus
    best_focus = max(detected_focuses, key=lambda x: (x['specificity'], x['confidence']))
    
    return {
        'detected': True,
        'focus': best_focus['focus'],
        'detected_type': best_focus['focus'],
        'confidence': best_focus['confidence'],
        'specificity': best_focus['specificity'],
        'match_type': 'single',
        'matched_pattern': best_focus['matched_pattern'],
        'alternatives': [f['focus'] for f in detected_focuses if f['focus'] != best_focus['focus']]
    }


def _extract_partial_intent(text: str) -> Dict[str, Any]:
    """Extract any partial workout intent from vague text"""
    intent = {'goals': [], 'muscle_hints': [], 'equipment_hints': []}
    
    # Goal keywords
    goal_keywords = {
        'strength': ['strong', 'strength', 'power', 'lift heavy'],
        'hypertrophy': ['build', 'mass', 'size', 'bigger', 'muscle'],
        'endurance': ['endurance', 'conditioning', 'stamina', 'cardio'],
        'general': ['fit', 'health', 'shape', 'tone']
    }
    
    for goal, keywords in goal_keywords.items():
        if any(keyword in text for keyword in keywords):
            intent['goals'].append(goal)
    
    # Muscle hints
    muscle_hints = ['upper', 'lower', 'body', 'muscle', 'arm', 'leg']
    for hint in muscle_hints:
        if hint in text:
            intent['muscle_hints'].append(hint)
    
    # Equipment hints
    equipment_hints = ['gym', 'dumbbell', 'barbell', 'machine', 'home', 'bodyweight']
    for hint in equipment_hints:
        if hint in text:
            intent['equipment_hints'].append(hint)
    
    return intent


def route_focus_request(text: str, user_profile: Dict = None) -> Dict[str, Any]:
    """
    Main routing function for focus-based workout requests
    
    Args:
        text: User input text
        user_profile: User profile data
        
    Returns:
        Routing decision with action type and parameters
    """
    # Check for nonsense first
    if is_nonsense_or_unknown(text):
        return {
            'action': 'reject_nonsense',
            'reason': 'Request contains nonsense or unrelated terms',
            'text': text,
            'suggestions': [
                'Try asking for specific muscle groups (chest, back, legs)',
                'Request training splits (push day, pull day, upper/lower)',
                'Ask for full body workouts',
                'Specify your fitness goals (strength, muscle building, endurance)'
            ]
        }
    
    # Detect focus
    focus_result = detect_focus(text)
    
    if not focus_result['detected']:
        # Check if interview needed for vague requests
        if needs_interview(text, user_profile):
            return {
                'action': 'start_interview',
                'reason': 'Request too vague, needs consultation',
                'text': text,
                'partial_intent': focus_result.get('partial_intent', {}),
                'suggested_questions': _generate_interview_questions(text, user_profile)
            }
        else:
            return {
                'action': 'clarify_focus',
                'reason': 'No clear workout focus detected',
                'text': text,
                'suggestions': [
                    'What muscle groups do you want to focus on?',
                    'Are you looking for upper body, lower body, or full body?',
                    'Do you prefer push/pull/legs split or something else?'
                ]
            }
    
    # Check if specific enough for direct planning
    if focus_result['confidence'] >= 0.8 and focus_result['specificity'] >= 0.7:
        return {
            'action': 'direct_planning',
            'focus': focus_result['focus'],
            'confidence': focus_result['confidence'],
            'specificity': focus_result['specificity'],
            'focus_details': focus_result,
            'reason': 'Clear focus detected with high confidence'
        }
    
    # Medium confidence - confirm or interview
    if focus_result['confidence'] >= 0.6:
        if needs_interview(text, user_profile):
            return {
                'action': 'confirm_and_interview',
                'focus': focus_result['focus'],
                'confidence': focus_result['confidence'],
                'reason': 'Focus detected but needs more context',
                'confirmation_text': f"I think you want a {focus_result['focus']} workout. Is that right?",
                'interview_backup': True
            }
        else:
            return {
                'action': 'confirm_focus',
                'focus': focus_result['focus'],
                'confidence': focus_result['confidence'],
                'reason': 'Focus detected but low confidence',
                'confirmation_text': f"Did you want a {focus_result['focus']} workout?"
            }
    
    # Low confidence - interview needed
    return {
        'action': 'start_interview',
        'reason': 'Low confidence in focus detection',
        'text': text,
        'possible_focus': focus_result.get('focus'),
        'suggested_questions': _generate_interview_questions(text, user_profile)
    }


def _generate_interview_questions(text: str, user_profile: Dict = None) -> List[Dict]:
    """Generate appropriate interview questions based on context"""
    questions = []
    
    # Always start with goal if not in profile
    if not user_profile or not user_profile.get('workout_goal'):
        questions.append({
            'type': 'goal',
            'text': "What's your main training goal?",
            'options': ['Build muscle (hypertrophy)', 'Get stronger', 'Improve endurance', 'General fitness'],
            'priority': 'high'
        })
    
    # Focus clarification
    focus_result = detect_focus(text)
    if focus_result.get('alternatives'):
        alt_text = ', '.join(focus_result['alternatives'])
        questions.append({
            'type': 'focus',
            'text': f"I detected multiple possible focuses: {alt_text}. Which would you prefer?",
            'options': focus_result['alternatives'],
            'priority': 'high'
        })
    elif not focus_result['detected']:
        questions.append({
            'type': 'focus',
            'text': "Which muscle groups would you like to focus on today?",
            'options': ['Upper body', 'Lower body', 'Full body', 'Chest', 'Back', 'Legs', 'Arms'],
            'priority': 'high'
        })
    
    # Equipment if not in profile
    if not user_profile or not user_profile.get('equipment_access'):
        questions.append({
            'type': 'equipment',
            'text': "What equipment do you have access to?",
            'options': ['Commercial gym', 'Home gym', 'Dumbbells only', 'Bodyweight only'],
            'priority': 'medium'
        })
    
    # Time if not in profile
    if not user_profile or not user_profile.get('available_time'):
        questions.append({
            'type': 'time',
            'text': "How much time do you have for this workout?",
            'options': ['30 minutes', '45 minutes', '60 minutes', '90+ minutes'],
            'priority': 'medium'
        })
    
    # Injuries if not recent
    if not user_profile or not user_profile.get('injury_check_date'):
        questions.append({
            'type': 'injuries',
            'text': "Any current injuries or areas to be careful with?",
            'options': ['No injuries', 'Shoulder', 'Lower back', 'Knee', 'Other'],
            'priority': 'high'
        })
    
    return sorted(questions, key=lambda x: {'high': 0, 'medium': 1, 'low': 2}[x['priority']])


def process_interview_response(question_type: str, response: str, context: Dict = None) -> Dict[str, Any]:
    """
    Process a response to an interview question
    
    Args:
        question_type: Type of question being answered
        response: User's response
        context: Additional context
        
    Returns:
        Processing result with validation and next steps
    """
    response_lower = response.lower().strip()
    
    if question_type == 'goal':
        goal_mapping = {
            'build': 'hypertrophy',
            'muscle': 'hypertrophy',
            'mass': 'hypertrophy',
            'size': 'hypertrophy',
            'hypertrophy': 'hypertrophy',
            'strength': 'strength',
            'strong': 'strength',
            'power': 'strength',
            'endurance': 'endurance',
            'cardio': 'endurance',
            'conditioning': 'endurance',
            'fitness': 'general',
            'health': 'general',
            'tone': 'general'
        }
        
        detected_goal = None
        for keyword, goal in goal_mapping.items():
            if keyword in response_lower:
                detected_goal = goal
                break
        
        return {
            'valid': detected_goal is not None,
            'parsed_value': detected_goal,
            'confidence': 0.9 if detected_goal else 0.0,
            'suggestions': list(goal_mapping.values()) if not detected_goal else []
        }
    
    elif question_type == 'focus':
        focus_result = detect_focus(response)
        return {
            'valid': focus_result['detected'],
            'parsed_value': focus_result.get('focus'),
            'confidence': focus_result.get('confidence', 0.0),
            'suggestions': focus_result.get('alternatives', [])
        }
    
    elif question_type == 'equipment':
        equipment_mapping = {
            'commercial': 'commercial_gym',
            'gym': 'commercial_gym',
            'full gym': 'commercial_gym',
            'home': 'home_gym',
            'home gym': 'home_gym',
            'dumbbells': 'dumbbells_only',
            'dumbbell': 'dumbbells_only',
            'db': 'dumbbells_only',
            'bodyweight': 'bodyweight_only',
            'no equipment': 'bodyweight_only'
        }
        
        detected_equipment = None
        for keyword, equipment in equipment_mapping.items():
            if keyword in response_lower:
                detected_equipment = equipment
                break
        
        return {
            'valid': detected_equipment is not None,
            'parsed_value': detected_equipment,
            'confidence': 0.9 if detected_equipment else 0.0,
            'suggestions': list(set(equipment_mapping.values())) if not detected_equipment else []
        }
    
    elif question_type == 'time':
        time_patterns = {
            '30': '30_minutes',
            '45': '45_minutes', 
            '60': '60_minutes',
            '90': '90_minutes',
            'hour': '60_minutes',
            'quick': '30_minutes',
            'short': '30_minutes',
            'long': '90_minutes'
        }
        
        detected_time = None
        for keyword, time_val in time_patterns.items():
            if keyword in response_lower:
                detected_time = time_val
                break
        
        return {
            'valid': detected_time is not None,
            'parsed_value': detected_time,
            'confidence': 0.8 if detected_time else 0.0,
            'suggestions': list(set(time_patterns.values())) if not detected_time else []
        }
    
    elif question_type == 'injuries':
        if 'no' in response_lower or 'none' in response_lower:
            return {
                'valid': True,
                'parsed_value': [],
                'confidence': 0.9
            }
        
        injury_mapping = {
            'shoulder': 'shoulder',
            'back': 'lower_back',
            'lower back': 'lower_back',
            'knee': 'knee',
            'elbow': 'elbow',
            'wrist': 'wrist',
            'hip': 'hip',
            'ankle': 'ankle'
        }
        
        detected_injuries = []
        for keyword, injury in injury_mapping.items():
            if keyword in response_lower:
                detected_injuries.append(injury)
        
        return {
            'valid': True,  # Always valid, even if no specific injuries detected
            'parsed_value': detected_injuries,
            'confidence': 0.8 if detected_injuries else 0.9,
            'suggestions': list(injury_mapping.values()) if not detected_injuries else []
        }
    
    # Default fallback
    return {
        'valid': False,
        'parsed_value': None,
        'confidence': 0.0,
        'error': f"Unknown question type: {question_type}"
    }
