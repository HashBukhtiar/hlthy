import vertexai
from vertexai.generative_models import GenerativeModel
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime
from google.oauth2 import service_account

# Load environment variables from .env file
try:
    from load_env import load_env_file
    load_env_file()
except ImportError:
    print("Warning: Could not load load_env.py - using system environment variables only")

# Import exercise safety knowledge and user profiles
try:
    from exercise_safety import EXERCISE_SAFETY_GUIDELINES, get_safety_context_for_injury
except ImportError:
    EXERCISE_SAFETY_GUIDELINES = "Safety guidelines not loaded"
    def get_safety_context_for_injury(injury_type):
        return {"avoid": [], "prefer": [], "modifications": []}

try:
    from user_profiles import profile_manager, UserProfile, InjuryRecord, FitnessGoals
except ImportError:
    print("Warning: User profile system not available")
    profile_manager = None

try:
    from semantic_memory import memory_system
except ImportError:
    print("Warning: Semantic memory system not available")
    memory_system = None

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

def get_google_credentials():
    """Create Google Cloud credentials from environment variables or file."""
    # Try to get credentials from environment variables first
    if all(key in os.environ for key in ['GOOGLE_CLOUD_PROJECT_ID', 'GOOGLE_CLOUD_PRIVATE_KEY', 'GOOGLE_CLOUD_CLIENT_EMAIL']):
        credentials_info = {
            "type": "service_account",
            "project_id": os.environ['GOOGLE_CLOUD_PROJECT_ID'],
            "private_key_id": os.environ.get('GOOGLE_CLOUD_PRIVATE_KEY_ID', ''),
            "private_key": os.environ['GOOGLE_CLOUD_PRIVATE_KEY'].replace('\\n', '\n'),
            "client_email": os.environ['GOOGLE_CLOUD_CLIENT_EMAIL'],
            "client_id": os.environ.get('GOOGLE_CLOUD_CLIENT_ID', ''),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": os.environ.get('GOOGLE_CLOUD_CLIENT_X509_CERT_URL', ''),
            "universe_domain": "googleapis.com"
        }
        return service_account.Credentials.from_service_account_info(credentials_info)
    
    # Fallback to default credentials (service account file)
    try:
        from google.auth import default
        credentials, project = default()
        return credentials
    except Exception as e:
        print(f"Warning: Could not load Google Cloud credentials: {e}")
        return None

# Initialize Vertex AI
project_id = os.environ.get('GOOGLE_CLOUD_PROJECT_ID', 'hlthy-421200')
location = "us-central1"

# Get credentials and initialize Vertex AI
credentials = get_google_credentials()
if credentials:
    vertexai.init(project=project_id, location=location, credentials=credentials)
    print(f"Vertex AI initialized successfully for project: {project_id}")
else:
    print("Warning: Vertex AI not initialized - credentials not available")
    # Initialize without credentials for local testing
    try:
        vertexai.init(project=project_id, location=location)
        print(f"Vertex AI initialized with default credentials for project: {project_id}")
    except Exception as e:
        print(f"Error initializing Vertex AI: {e}")

# Initialize models
try:
    coach_model = GenerativeModel("gemini-2.0-flash-exp")  # Main coach model
    router_model = GenerativeModel("gemini-1.5-flash")     # Cheaper model for routing
    print("Generative models initialized successfully")
except Exception as e:
    print(f"Warning: Could not initialize models: {e}")
    coach_model = None
    router_model = None

# Router prompt
ROUTER_PROMPT = """You are a fitness coach intent classifier. Classify the user's intent into exactly one label:

- planner: User wants a workout for today, exercise selection, routine design, or split planning. Examples: "I need a leg workout", "give me chest exercises", "design a push/pull split", "what should I train today"

- technique: User asks about exercise form, has pain/injury concerns, needs exercise substitutions, or wants form corrections. Examples: "my shoulder hurts during bench", "how to fix my squat form", "substitute for deadlifts", "correct bench press technique"

- explain: User wants definitions, educational content, or theoretical knowledge about fitness concepts. Examples: "what is progressive overload", "explain hypertrophy", "define RPE", "how does muscle growth work"

- schedule: User asks about training frequency, rest days, deload timing, or program scheduling. Examples: "how often should I train", "when to deload", "how many rest days", "training frequency for beginners"

- chit_chat: Greetings, thanks, casual conversation, or social interaction. Examples: "hello", "thank you", "good morning", "have a great day"

IMPORTANT CLASSIFICATION RULES:
- If the message mentions specific exercises + pain/injury → technique
- If asking for workout recommendations or exercise selection → planner  
- If asking "what is", "define", "explain", "how does X work" → explain
- If asking about frequency, timing, rest, deload → schedule
- If greeting, thanking, or casual → chit_chat

Return JSON only: {"label":"planner"}

User message: """

# System prompt for HLTHY Coach with AI Exercise Knowledge
COACH_SYSTEM_PROMPT = """You are HLTHY Coach, a mobile fitness trainer with access to comprehensive exercise science knowledge. Goals: safe, specific, actionable programming using evidence-based exercise selection.

CRITICAL SAFETY RULES:
1) NEVER recommend exercises contraindicated for active injuries or conditions in healthSummary
2) Always prioritize joint-friendly, progressive overload principles  
3) Avoid high-risk exercises for beginners (behind-neck press, upright rows, loaded spinal flexion)
4) When in doubt, choose safer alternatives (goblet squat vs. back squat for beginners)
5) Respect equipment limitations - only suggest exercises possible with available equipment
6) Flag any exercise that might aggravate mentioned injuries/pain

HIGH-RISK EXERCISES TO AVOID FOR BEGINNERS:
- Behind-the-neck press/pulldowns (cervical spine risk)
- Upright rows (shoulder impingement) 
- Smith machine squats with feet forward (unnatural movement)
- Loaded spinal flexion (weighted sit-ups)
- Kipping pull-ups without proper base strength
- Heavy overhead squats (requires extensive mobility)

INJURY-SPECIFIC EXERCISE RESTRICTIONS:
- Shoulder pain: avoid overhead pressing, behind-neck movements, wide-grip bench
- Elbow pain: avoid overhead pressing, tricep extensions, close-grip movements  
- Lower back pain: avoid loaded spinal flexion, deadlifts from floor initially
- Knee pain: avoid deep squats, lunges initially, high-impact movements

EXERCISE SELECTION PRINCIPLES:
- Choose evidence-based exercises with proper biomechanics
- Prefer compound movements over isolation when appropriate
- Match exercise difficulty to user's experience level
- Consider injury history and current limitations
- Use extensive exercise science knowledge, but be conservative with risk

JSON SCHEMAS:

WorkoutPlan:
{
  "dayType": "string",
  "segments": [
    {
      "name": "string",
      "exercises": [
        {
          "exerciseId": "unique_identifier_like_barbell_squat",
          "exerciseName": "Human Readable Name", 
          "sets": 3,
          "reps": 8,
          "load": "@RPE8 or bodyweight or kg_amount",
          "restSec": 90,
          "notes": "form cue or safety reminder",
          "safetyRating": "low/medium/high risk",
          "equipmentNeeded": ["equipment", "list"]
        }
      ]
    }
  ],
  "safetyNotes": "injury considerations or modifications"
}

TechniqueAdvice:
{
  "issue": "specific problem like elbow_pain_during_bench",
  "riskAssessment": "description of injury risk",
  "avoidExercises": ["exercises to avoid"],
  "safeAlternatives": [
    {
      "exerciseId": "safer_exercise_id",
      "exerciseName": "Safer Exercise Name", 
      "reason": "why this is safer"
    }
  ],
  "techniqueCues": ["form cue 1", "form cue 2", "form cue 3"]
}

SchedulePlan:
{
  "daysPerWeek": 4,
  "split": [{"day":"Mon","focus":"Upper"}, {"day":"Tue","focus":"Lower"}],
  "deloadGuidelines": ["reduce volume by 40% every 4th week"]
}

Explanation: 
{
  "topic": "topic name",
  "keyPoints": ["evidence-based point 1", "practical point 2", "safety point 3"],
  "safetyConsiderations": ["safety consideration 1", "safety consideration 2"]
}

PROGRAMMING RULES:
1) Always output machine-readable JSON first, then short summary (≤120 words)
2) Obey preferenceMemory (replyLength, tone, exerciseNameStyle)
3) Never exceed safe weekly volumes, avoid heavy squat/deadlift on consecutive days
4) If information missing, ask clarifying question or make conservative assumption
5) Use user's preferred terms (RDL, bench, curls)
6) Include clear exercise identifiers for tracking

After JSON, provide motivational human summary matching user's preferred tone."""

# Default context for MVP with AI exercise knowledge
def get_default_context():
    return {
        "profileSummary": "Beginner to intermediate lifter looking to build strength and muscle. Has access to basic gym equipment including dumbbells, barbells, and machines. Trains 3-4 days per week.",
        "healthSummary": {
            "activeInjuries": [],
            "bannedExercises": [],
            "cautionMovements": [],
            "medicalConditions": [],
            "updatedAt": datetime.now().isoformat()
        },
        "preferenceMemory": {
            "replyLength": "standard",
            "tone": "motivational",
            "exerciseNameStyle": "common_abbreviations",
            "dislikedExercises": [],
            "preferredEquipment": ["dumbbells", "barbells", "machines", "bodyweight"]
        },
        "shortTermTurns": [],
        "retrievedSnippets": [],
        "equipmentAccess": {
            "gym": ["barbells", "dumbbells", "machines", "cables", "racks"],
            "home": ["dumbbells", "resistance_bands", "bodyweight"],
            "current": "gym"  # default assumption
        },
        "requestMeta": {
            "route": "auto",
            "maxOutputTokens": 700,
            "safetyLevel": "conservative"
        }
    }

def route_user_message(user_message):
    """Route user message to appropriate category with improved logic"""
    try:
        prompt = f"{ROUTER_PROMPT}\n\n{user_message}"
        response = router_model.generate_content(prompt)
        result = json.loads(response.text.strip())
        return result.get("label", "explain")
    except Exception as e:
        print(f"Router error: {e}")
        # Enhanced fallback routing logic
        message_lower = user_message.lower()
        
        # Technique patterns - check first for pain/injury
        if any(word in message_lower for word in ["hurt", "pain", "injury", "sore", "ache", "substitute", "can't do", "instead of"]):
            return "technique"
        if any(word in message_lower for word in ["form", "technique", "correct", "fix my", "how to do", "proper way"]):
            return "technique"
            
        # Planner patterns - workout requests
        if any(word in message_lower for word in ["workout", "routine", "exercises for", "train", "lift", "need a", "give me a", "design"]):
            return "planner"
        if any(word in message_lower for word in ["chest", "back", "legs", "arms", "shoulders", "push", "pull"]):
            return "planner"
            
        # Schedule patterns
        if any(word in message_lower for word in ["how often", "frequency", "times per week", "rest day", "deload", "schedule"]):
            return "schedule"
        if any(word in message_lower for word in ["should i train", "how many days", "when to"]):
            return "schedule"
            
        # Chit chat patterns
        if any(word in message_lower for word in ["hi", "hello", "hey", "good morning", "good afternoon", "thanks", "thank you"]):
            return "chit_chat"
        if any(word in message_lower for word in ["great", "awesome", "perfect", "bye", "goodbye", "see you"]):
            return "chit_chat"
            
        # Explain patterns - educational
        if any(word in message_lower for word in ["what is", "define", "explain", "how does", "why", "what are"]):
            return "explain"
        if any(word in message_lower for word in ["difference between", "mean by", "definition"]):
            return "explain"
            
        # Default fallback
        return "explain"

def build_route_template(route, context, user_message, conversation_history):
    """Build the appropriate template based on route with AI exercise knowledge"""
    
    # Convert conversation history to shortTermTurns format (last 6 turns)
    short_terms = []
    for msg in conversation_history[-6:]:
        role = "user" if msg.get("role") == "user" else "coach"
        short_terms.append({"role": role, "text": msg.get("text", "")})
    
    # Update context with conversation data
    context["shortTermTurns"] = short_terms
    
    # Format bulleted lists for templates
    bulleted_turns = "\n".join([f"- {turn['role']}: {turn['text']}" for turn in short_terms])
    bulleted_snippets = "\n".join([f"- {snippet['source']} ({snippet.get('date', 'unknown')}): {snippet['text']}" for snippet in context.get('retrievedSnippets', [])])
    
    # Build equipment context
    equipment_available = context.get('equipmentAccess', {}).get(context.get('equipmentAccess', {}).get('current', 'gym'), [])
    equipment_str = ", ".join(equipment_available) if equipment_available else "standard gym equipment"
    
    context_str = f"""CONTEXT:
profileSummary:
{context['profileSummary']}

healthSummary (CRITICAL - must respect these constraints):
{json.dumps(context['healthSummary'], indent=2)}

preferenceMemory:
{json.dumps(context['preferenceMemory'], indent=2)}

equipmentAccess: {equipment_str}

recentContext (short-term turns):
{bulleted_turns}

retrievedSnippets (long-term facts):
{bulleted_snippets}"""

    if route == "planner":
        template = f"""{context_str}

TASK: Draft a single-day workout plan using your comprehensive exercise science knowledge
SAFETY REQUIREMENTS:
- Absolutely AVOID exercises contraindicated for any conditions in healthSummary
- Choose evidence-based exercises with proper biomechanical principles
- Match exercise difficulty to user experience level
- Only suggest exercises possible with available equipment: {equipment_str}
- Include safety ratings for each exercise
- Prefer joint-friendly variations when possible

PROGRAMMING GUIDELINES:
- Use compound movements as the foundation
- 2-4 segments with 2-5 exercises each
- Progressive overload principles
- Appropriate rest periods for goals
- Clear exercise identifiers (e.g., barbell_back_squat, dumbbell_chest_press)

Return:
1) WorkoutPlan JSON with safety ratings and equipment requirements
2) Human summary (≤120 words, {context['preferenceMemory']['tone']} tone)

User message: {user_message}"""

    elif route == "technique":
        template = f"""{context_str}

TASK: Provide technique guidance and safe exercise alternatives
SAFETY ASSESSMENT:
- Analyze injury risk based on healthSummary
- Identify exercises to absolutely avoid
- Suggest safer alternatives with clear rationale
- Provide evidence-based technique cues
- Include warning signs to stop exercising

Use your extensive knowledge of biomechanics, anatomy, and injury prevention.

Return:
1) TechniqueAdvice JSON with risk assessment and safe alternatives
2) Human summary (≤100 words, prioritize safety)

User message: {user_message}"""

    elif route == "schedule":
        template = f"""{context_str}

TASK: Design a training schedule using periodization principles
CONSIDERATIONS:
- Recovery requirements based on training experience
- Appropriate training frequency and volume
- Built-in progression and deload protocols
- Injury prevention through proper programming

Return:
1) SchedulePlan JSON with evidence-based progression rules
2) Human summary (≤120 words)

User message: {user_message}"""

    else:  # explain or chit_chat
        template = f"""CONTEXT:
profileSummary: {context['profileSummary']}
preferenceMemory: {json.dumps(context['preferenceMemory'])}

TASK: Explain fitness concepts using evidence-based information
- Draw from exercise science, biomechanics, and physiology knowledge
- Include practical applications
- Mention common mistakes and safety considerations
- Keep information accurate and up-to-date

Return:
1) Explanation JSON with evidence-based key points
2) Human summary (≤100 words)

User message: {user_message}"""

    return template

def validate_workout_plan(plan_json, context):
    """Enhanced validator for AI-generated workout plans"""
    violations = []
    
    try:
        plan = json.loads(plan_json) if isinstance(plan_json, str) else plan_json
        banned_exercises = context.get('healthSummary', {}).get('bannedExercises', [])
        active_injuries = context.get('healthSummary', {}).get('activeInjuries', [])
        
        for segment in plan.get('segments', []):
            for exercise in segment.get('exercises', []):
                exercise_name = exercise.get('exerciseName', '').lower()
                exercise_id = exercise.get('exerciseId', '').lower()
                
                # Check for banned exercises (flexible matching)
                for banned in banned_exercises:
                    if banned.lower() in exercise_name or banned.lower() in exercise_id:
                        violations.append(f'Violation: "{exercise_name}" contains banned exercise "{banned}"')
                
                # Check safety rating exists
                if not exercise.get('safetyRating'):
                    violations.append(f'Missing safety rating for: {exercise_name}')
                
                # Check equipment requirements exist
                if not exercise.get('equipmentNeeded'):
                    violations.append(f'Missing equipment requirements for: {exercise_name}')
                
                # Flag high-risk exercises for beginners
                safety_rating = exercise.get('safetyRating', '')
                if safety_rating == 'high' and 'beginner' in context.get('profileSummary', '').lower():
                    violations.append(f'High-risk exercise for beginner: {exercise_name}')
        
        # Check for injury-specific violations
        if 'elbow' in ' '.join(active_injuries):
            for segment in plan.get('segments', []):
                for exercise in segment.get('exercises', []):
                    name = exercise.get('exerciseName', '').lower()
                    if any(term in name for term in ['overhead', 'press', 'extension', 'curl']):
                        violations.append(f'Potential elbow aggravator with active elbow injury: {name}')
    
    except Exception as e:
        violations.append(f'JSON parsing error: {str(e)}')
    
    return violations

# Health check endpoints
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "OK", "message": "HLTHY Coach AI service is running", "version": "v1-profiles"}), 200

@app.route('/api/health', methods=['GET']) 
def api_health():
    return jsonify({"status": "OK", "service": "HLTHY Coach API", "version": "v1-profiles"}), 200

# User Profile Management Endpoints
@app.route('/api/profile', methods=['POST'])
def create_profile():
    """Create a new user profile"""
    try:
        if not profile_manager:
            return jsonify({"error": "Profile system not available"}), 500
            
        data = request.get_json() or {}
        
        # Extract profile data with defaults
        age = data.get('age')
        gender = data.get('gender')
        experience_level = data.get('experience_level', 'beginner')
        primary_goal = data.get('primary_goal', 'muscle_building')
        training_frequency = data.get('training_frequency', 3)
        
        # Create profile
        profile = profile_manager.create_user_profile(
            age=age,
            gender=gender,
            experience_level=experience_level,
            primary_goal=primary_goal,
            training_frequency=training_frequency
        )
        
        return jsonify({
            "success": True,
            "user_id": profile.user_id,
            "message": "Profile created successfully"
        }), 201
        
    except Exception as e:
        print(f"Error creating profile: {e}")
        return jsonify({"error": "Failed to create profile"}), 500

@app.route('/api/profile/<user_id>', methods=['GET'])
def get_profile(user_id):
    """Get user profile by ID"""
    try:
        if not profile_manager:
            return jsonify({"error": "Profile system not available"}), 500
            
        profile = profile_manager.load_profile(user_id)
        if not profile:
            return jsonify({"error": "Profile not found"}), 404
            
        # Convert to dict for JSON response
        from dataclasses import asdict
        profile_dict = asdict(profile)
        
        return jsonify({
            "success": True,
            "profile": profile_dict
        })
        
    except Exception as e:
        print(f"Error getting profile: {e}")
        return jsonify({"error": "Failed to get profile"}), 500

@app.route('/api/profile/<user_id>', methods=['PUT'])
def update_profile(user_id):
    """Update user profile"""
    try:
        if not profile_manager:
            return jsonify({"error": "Profile system not available"}), 500
            
        data = request.get_json()
        if not data:
            return jsonify({"error": "No update data provided"}), 400
            
        updated_profile = profile_manager.update_profile(user_id, data)
        if not updated_profile:
            return jsonify({"error": "Profile not found or update failed"}), 404
            
        return jsonify({
            "success": True,
            "message": "Profile updated successfully"
        })
        
    except Exception as e:
        print(f"Error updating profile: {e}")
        return jsonify({"error": "Failed to update profile"}), 500

@app.route('/api/profile/<user_id>/injury', methods=['POST'])
def add_injury(user_id):
    """Add injury to user profile"""
    try:
        if not profile_manager:
            return jsonify({"error": "Profile system not available"}), 500
            
        data = request.get_json()
        if not data:
            return jsonify({"error": "No injury data provided"}), 400
            
        required_fields = ['injury_type', 'severity', 'affected_area']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        success = profile_manager.add_injury(
            user_id=user_id,
            injury_type=data['injury_type'],
            severity=data['severity'],
            affected_area=data['affected_area'],
            notes=data.get('notes', '')
        )
        
        if success:
            return jsonify({
                "success": True,
                "message": "Injury added successfully"
            }), 201
        else:
            return jsonify({"error": "Failed to add injury"}), 500
            
    except Exception as e:
        print(f"Error adding injury: {e}")
        return jsonify({"error": "Failed to add injury"}), 500

@app.route('/api/profile/<user_id>/injury/<injury_id>', methods=['PUT'])
def update_injury_status(user_id, injury_id):
    """Update injury status"""
    try:
        if not profile_manager:
            return jsonify({"error": "Profile system not available"}), 500
            
        data = request.get_json()
        if not data or 'status' not in data:
            return jsonify({"error": "Missing status field"}), 400
            
        success = profile_manager.update_injury_status(
            user_id=user_id,
            injury_id=injury_id,
            new_status=data['status'],
            notes=data.get('notes', '')
        )
        
        if success:
            return jsonify({
                "success": True,
                "message": "Injury status updated successfully"
            })
        else:
            return jsonify({"error": "Failed to update injury status"}), 404
            
    except Exception as e:
        print(f"Error updating injury status: {e}")
        return jsonify({"error": "Failed to update injury status"}), 500

@app.route('/api/profiles', methods=['GET'])
def list_profiles():
    """List all user profile IDs (admin endpoint)"""
    try:
        if not profile_manager:
            return jsonify({"error": "Profile system not available"}), 500
            
        profile_ids = profile_manager.list_all_profiles()
        return jsonify({
            "success": True,
            "profile_ids": profile_ids,
            "count": len(profile_ids)
        })
        
    except Exception as e:
        print(f"Error listing profiles: {e}")
        return jsonify({"error": "Failed to list profiles"}), 500

@app.route('/api/profile/<user_id>/milestone', methods=['POST'])
def add_milestone(user_id):
    """Add milestone or progress note to user's semantic memory"""
    try:
        if not memory_system:
            return jsonify({"error": "Memory system not available"}), 500
            
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"error": "Missing milestone text"}), 400
        
        milestone_text = data['text']
        milestone_type = data.get('type', 'progress')
        
        memory_system.add_milestone_snippet(user_id, milestone_text, milestone_type)
        
        return jsonify({
            "success": True,
            "message": "Milestone added to memory successfully"
        }), 201
        
    except Exception as e:
        print(f"Error adding milestone: {e}")
        return jsonify({"error": "Failed to add milestone"}), 500

@app.route('/api/profile/<user_id>/memory', methods=['GET'])
def get_user_memory(user_id):
    """Get user's recent memory snippets"""
    try:
        if not memory_system:
            return jsonify({"error": "Memory system not available"}), 500
        
        days = int(request.args.get('days', 7))
        recent_snippets = memory_system.get_recent_context(user_id, days=days)
        
        return jsonify({
            "success": True,
            "memory_snippets": recent_snippets,
            "days_requested": days
        })
        
    except Exception as e:
        print(f"Error getting memory: {e}")
        return jsonify({"error": "Failed to get memory"}), 500

@app.route('/api/profile/<user_id>/memory/search', methods=['POST'])
def search_user_memory(user_id):
    """Search user's semantic memory"""
    try:
        if not memory_system:
            return jsonify({"error": "Memory system not available"}), 500
        
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({"error": "Missing search query"}), 400
        
        query = data['query']
        k = data.get('k', 3)
        
        results = memory_system.retrieve_relevant_snippets(user_id, query, k=k)
        
        return jsonify({
            "success": True,
            "query": query,
            "results": results,
            "count": len(results)
        })
        
    except Exception as e:
        print(f"Error searching memory: {e}")
        return jsonify({"error": "Failed to search memory"}), 500

# Main chat endpoint with coaching functionality
@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        print("=== RECEIVED /api/chat REQUEST ===")
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
            
        # Extract user_id and conversation history
        user_id = data.get('user_id')  # Optional for MVP backward compatibility
        history = data.get('history', [])
        
        if not history:
            return jsonify({"error": "Missing conversation history"}), 400
        
        # Get the current user message (last message in history)
        current_message = None
        conversation_history = []
        
        for msg in history:
            role = msg.get('role', 'user')
            text = msg.get('text', '')
            
            if role == 'user':
                current_message = text
                conversation_history.append({"role": "user", "text": text})
            elif role in ['model', 'assistant', 'coach']:
                conversation_history.append({"role": "coach", "text": text})
        
        if not current_message:
            return jsonify({"error": "No user message found in history"}), 400
        
        print(f"Current message: {current_message}")
        print(f"User ID: {user_id}")
        print(f"Conversation history length: {len(conversation_history)}")
        
        # Get context - use real user profile if available, otherwise default/inferred
        if user_id and profile_manager:
            print(f"Loading context for user: {user_id}")
            context = profile_manager.get_user_context_for_ai(user_id)
            
            # Add semantic memory retrieval
            if memory_system:
                try:
                    # Get relevant snippets based on current message
                    relevant_snippets = memory_system.retrieve_relevant_snippets(user_id, current_message, k=3)
                    context["retrievedSnippets"] = relevant_snippets
                    print(f"Retrieved {len(relevant_snippets)} relevant memory snippets")
                except Exception as e:
                    print(f"Warning: Could not retrieve memory snippets: {e}")
                    context["retrievedSnippets"] = []
            
            # If no profile found, create one from conversation inference
            if not profile_manager.load_profile(user_id):
                print(f"No profile found for {user_id}, using inferred context")
                context = get_inferred_context_from_conversation(current_message, conversation_history)
        else:
            print("Using inferred context (no user_id or profile_manager)")
            context = get_inferred_context_from_conversation(current_message, conversation_history)
        
        # Route the message
        route = route_user_message(current_message)
        print(f"Routed to: {route}")
        
        # Build the appropriate template
        template = build_route_template(route, context, current_message, conversation_history)
        
        # Generate coach response
        full_prompt = f"{COACH_SYSTEM_PROMPT}\n\n{template}"
        
        print(f"Generating response with coach model...")
        response = coach_model.generate_content(full_prompt)
        response_text = response.text.strip()
        
        # Basic validation for workout plans
        if route == "planner" and "{" in response_text:
            try:
                # Extract JSON from response
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    plan_json = response_text[json_start:json_end]
                    violations = validate_workout_plan(plan_json, context)
                    
                    if violations:
                        print(f"Validation violations found: {violations}")
                        # Could implement validator correction here
            except Exception as e:
                print(f"Validation error: {e}")
        
        print(f"Coach response generated: {response_text[:200]}...")
        
        # Store conversation in semantic memory for future retrieval
        if user_id and memory_system:
            try:
                # Store user message
                memory_system.add_chat_snippet(user_id, current_message, role="user")
                
                # Store coach response (first 300 chars to avoid too much storage)
                coach_summary = response_text[:300] + "..." if len(response_text) > 300 else response_text
                memory_system.add_chat_snippet(user_id, coach_summary, role="coach")
                
                # If it's a workout plan, also store as structured workout data
                if route == "planner" and "{" in response_text:
                    try:
                        json_start = response_text.find('{')
                        json_end = response_text.rfind('}') + 1
                        if json_start >= 0 and json_end > json_start:
                            plan_json_str = response_text[json_start:json_end]
                            plan_data = json.loads(plan_json_str)
                            plan_data['date'] = datetime.now().isoformat()
                            memory_system.add_workout_snippet(user_id, plan_data)
                            print("Stored workout plan in semantic memory")
                    except Exception as e:
                        print(f"Could not store workout plan in memory: {e}")
                        
                print("Stored conversation in semantic memory")
            except Exception as e:
                print(f"Warning: Could not store in semantic memory: {e}")
        
        return jsonify({"text": response_text})
        
    except Exception as e:
        print(f"ERROR in /api/chat: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"text": "I'm having trouble right now. Please try again later."}), 500

def get_inferred_context_from_conversation(current_message, conversation_history):
    """Infer user context from conversation when no profile exists"""
    context = get_default_context()
    
    # Analyze current message and history for context clues
    all_text = current_message + " " + " ".join([msg.get("text", "") for msg in conversation_history])
    text_lower = all_text.lower()
    
    # Experience level inference
    if any(word in text_lower for word in ["beginner", "new", "starting", "never", "first time"]):
        context["profileSummary"] = "Beginner lifter just starting their fitness journey. Needs foundational movement patterns and conservative progression. Safety is the top priority."
        context["requestMeta"]["safetyLevel"] = "very_conservative"
        # Add beginner-specific banned exercises
        context["healthSummary"]["bannedExercises"].extend([
            "behind_neck_press", "upright_rows", "kipping_pullups", "heavy_overhead_squats"
        ])
    elif any(word in text_lower for word in ["intermediate", "experienced", "years", "advanced"]):
        context["profileSummary"] = "Experienced lifter with solid foundation looking to optimize training and continue progression."
        context["requestMeta"]["safetyLevel"] = "standard"
    
    # Injury detection and context
    injury_detected = None
    if any(word in text_lower for word in ["elbow", "hurt", "pain", "injury", "sore"]):
        if "elbow" in text_lower:
            injury_detected = "elbow_pain"
            safety_context = get_safety_context_for_injury("elbow_pain")
            context["healthSummary"]["activeInjuries"] = ["elbow_pain"] 
            context["healthSummary"]["bannedExercises"].extend(safety_context["avoid"])
            context["healthSummary"]["cautionMovements"] = ["overhead_movement", "elbow_flexion_under_load"]
        elif any(word in text_lower for word in ["shoulder", "rotator"]):
            injury_detected = "shoulder_pain"
            safety_context = get_safety_context_for_injury("shoulder_pain")
            context["healthSummary"]["activeInjuries"] = ["shoulder_pain"]
            context["healthSummary"]["bannedExercises"].extend(safety_context["avoid"])
        elif any(word in text_lower for word in ["back", "spine", "lumbar"]):
            injury_detected = "lower_back_pain"
            safety_context = get_safety_context_for_injury("lower_back_pain")
            context["healthSummary"]["activeInjuries"] = ["lower_back_pain"]
            context["healthSummary"]["bannedExercises"].extend(safety_context["avoid"])
        elif any(word in text_lower for word in ["knee"]):
            injury_detected = "knee_pain"
            safety_context = get_safety_context_for_injury("knee_pain")
            context["healthSummary"]["activeInjuries"] = ["knee_pain"]
            context["healthSummary"]["bannedExercises"].extend(safety_context["avoid"])
    
    # Equipment availability
    if any(word in text_lower for word in ["home", "no gym", "bodyweight", "apartment", "limited equipment"]):
        context["equipmentAccess"]["current"] = "home"
    elif any(word in text_lower for word in ["gym", "barbell", "rack", "machines"]):
        context["equipmentAccess"]["current"] = "gym"
    
    # Goal inference
    if any(word in text_lower for word in ["strength", "strong", "powerlifting", "max"]):
        context["profileSummary"] += " Focused on building strength and power."
    elif any(word in text_lower for word in ["muscle", "size", "bodybuilding", "hypertrophy"]):
        context["profileSummary"] += " Focused on building muscle mass."
    elif any(word in text_lower for word in ["weight loss", "fat loss", "lose weight", "cut"]):
        context["profileSummary"] += " Focused on weight/fat loss while preserving muscle."
    
    # Tone preferences
    if any(word in text_lower for word in ["technical", "detailed", "science", "explain"]):
        context["preferenceMemory"]["tone"] = "technical"
        context["preferenceMemory"]["replyLength"] = "detailed"
    elif any(word in text_lower for word in ["quick", "brief", "short"]):
        context["preferenceMemory"]["replyLength"] = "brief"
    
    return context

# Intent classification endpoint - reuses existing router logic
@app.route('/api/classify-intent', methods=['POST'])
def classify_intent():
    """
    Endpoint to classify user intent for routing purposes.
    Uses the same logic as the existing route_user_message function.
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
            
        message = data.get('message', '')
        if not message:
            return jsonify({"error": "Missing message"}), 400
        
        print(f"=== CLASSIFYING INTENT ===")
        print(f"Message: {message}")
        
        # Use the existing router logic from route_user_message
        intent_label = route_user_message(message)
        
        return jsonify({
            "intent": intent_label,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "status": "success"
        })
        
    except Exception as e:
        print(f"Error in classify_intent endpoint: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting HLTHY Coach Flask server...")
    port = int(os.environ.get("PORT", 5001))
    debug = os.environ.get("FLASK_ENV") != "production"
    
    print(f"Server configuration:")
    print(f"  Port: {port}")
    print(f"  Debug: {debug}")
    print(f"  Profile Manager: {'✅ Available' if profile_manager else '❌ Not Available'}")
    print(f"  Memory System: {'✅ Available' if memory_system else '❌ Not Available'}")
    
    app.run(host="0.0.0.0", port=port, debug=debug)