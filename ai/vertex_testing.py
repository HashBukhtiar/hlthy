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

# Import exercise safety knowledge and canonical exercise database
try:
    from exercise_safety import EXERCISE_SAFETY_GUIDELINES, get_safety_context_for_injury
except ImportError:
    EXERCISE_SAFETY_GUIDELINES = "Safety guidelines not loaded"
    def get_safety_context_for_injury(injury_type):
        return {"avoid": [], "prefer": [], "modifications": []}

try:
    from exercise_database import (
        CANONICAL_EXERCISES, validate_workout_plan_exercises,
        is_exercise_allowed, get_safe_substitutions,
        get_all_allowed_exercises, get_all_allowed_exercises_cached,
        suggest_exercise_id_from_name, InjuryType, ExperienceLevel,
        NAME_TO_ID_MAP, RiskLevel
    )
    CANONICAL_DATABASE_AVAILABLE = True
except ImportError:
    print("Warning: Canonical exercise database not available - falling back to legacy safety")
    CANONICAL_DATABASE_AVAILABLE = False

try:
    from user_profiles import profile_manager, UserProfile, InjuryRecord, FitnessGoals
except ImportError:
    print("Warning: User profile system not available")
    profile_manager = None

try:
    from technique_library import get_technique_cues_for_exercise, get_substitutions_for_injury, get_compact_technique_response
    TECHNIQUE_LIBRARY_AVAILABLE = True
except ImportError:
    print("Warning: Technique library not available")
    TECHNIQUE_LIBRARY_AVAILABLE = False

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

# System prompt for HLTHY Coach with Canonical Exercise Database
COACH_SYSTEM_PROMPT = """You are HLTHY Coach, a mobile fitness trainer with access to a canonical exercise database. Goals: safe, specific, actionable programming using evidence-based exercise selection.

CRITICAL EXERCISE DATABASE RULES:
1) ONLY use exercise IDs from the canonical database - no custom exercise names
2) Every exerciseId in your JSON must be a valid canonical ID (e.g., "barbell_bench_press", "goblet_squat")
3) You will receive allowedExercises: a shortlist of 10–30 canonical IDs; PICK ONLY from that list
4) The validation system will REJECT any unknown or disallowed exercise IDs
5) Use the provided substitution suggestions when exercises are contraindicated
6) Respect equipment limitations - only suggest exercises possible with available equipment

CANONICAL EXERCISE ID FORMAT:
- Use underscores, not spaces: "barbell_bench_press" not "barbell bench press"
- Be specific: "back_squat" not just "squat"  
- Follow the exact IDs in the database: "dumbbell_shoulder_press", "hammer_curls", "pull_ups"

SAFETY ENFORCEMENT:
- The system automatically validates all exercise IDs against user injuries and experience
- Contraindicated exercises will be flagged and must be replaced with suggested substitutions
- High-risk exercises for beginners are automatically filtered out
- All exercises include built-in safety ratings and injury contraindications

EXERCISE SELECTION PRINCIPLES:
- Choose from canonical database only - no variations or creative names
- Prefer compound movements with established safety profiles
- Match exercise difficulty to user's experience level via database constraints
- Use database substitution suggestions when primary choices are contraindicated
- Trust the database's injury contraindications and experience level requirements

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

# -------------------- Helpers: equipment + normalization + allowlist --------------------
def _normalize_equipment_tokens(equipment_list):
    """Normalize equipment tokens (singularize + map synonyms)."""
    if not equipment_list:
        return set()
    norm = set()
    syn = {
        "barbells": "barbell",
        "dumbbells": "dumbbells",
        "machines": "machine",
        "cables": "cable",
        "racks": "rack",
        "bands": "resistance_bands",
        "pullup_bar": "pull_up_bar",
        "pull-up bar": "pull_up_bar",
        "pull up bar": "pull_up_bar",
    }
    for item in equipment_list:
        t = (item or "").strip().lower()
        if t in syn:
            norm.add(syn[t])
        else:
            # crude singularization for common words
            if t.endswith("s") and t[:-1] in {"barbell", "machine", "cable", "rack", "bench"}:
                norm.add(t[:-1])
            else:
                norm.add(t)
    return norm

def _equipment_satisfies(requirements, available_norm: set) -> bool:
    """Check exercise_profile.equipment_required subset against available equipment.
    Any requirement containing 'machine' passes if 'machine' in available.
    'lat_machine' also passes if 'machine' present. 'bench' is assumed in gym context.
    """
    if not requirements:
        return True
    for req in requirements:
        r = (req or "").lower()
        if "machine" in r:
            if "machine" not in available_norm:
                return False
            continue
        if r == "lat_machine":
            if "machine" not in available_norm and "lat_machine" not in available_norm:
                return False
            continue
        if r == "bench":
            # allow if explicit bench or general gym context (rack often implies bench availability)
            if "bench" not in available_norm and "rack" not in available_norm:
                return False
            continue
        if r not in available_norm:
            return False
    return True

def _build_user_context(context: dict) -> dict:
    """Compose user_context for validators from AI context."""
    user_ctx = {
        'experience_level': 'beginner',
        'active_injuries': context.get('healthSummary', {}).get('activeInjuries', []),
        'equipment_available': []
    }
    profile_summary = context.get('profileSummary', '').lower()
    if 'advanced' in profile_summary:
        user_ctx['experience_level'] = 'advanced'
    elif 'intermediate' in profile_summary or 'experienced' in profile_summary:
        user_ctx['experience_level'] = 'intermediate'
    else:
        user_ctx['experience_level'] = 'beginner'

    current_key = context.get('equipmentAccess', {}).get('current', 'gym')
    equipment_available = context.get('equipmentAccess', {}).get(current_key, [])
    user_ctx['equipment_available'] = list(_normalize_equipment_tokens(equipment_available))
    # Imply bench in gym contexts
    if current_key == 'gym' and 'bench' not in user_ctx['equipment_available']:
        user_ctx['equipment_available'].append('bench')
    return user_ctx

def _get_risk_aware_allowed_ids(context: dict, max_ids: int = 25) -> tuple[list, list]:
    """Get allowed exercise IDs with risk-awareness. Returns (safe_ids, risky_ids_with_rationale_required)"""
    try:
        user_ctx = _build_user_context(context)
        base_allowed = get_all_allowed_exercises_cached({
            'experience_level': user_ctx['experience_level'], 
            'active_injuries': user_ctx['active_injuries']
        })
        equip = set(user_ctx.get('equipment_available', []))
        
        safe_ids = []
        risky_ids = []
        
        for ex_id in base_allowed:
            ex = CANONICAL_EXERCISES.get(ex_id)
            if not ex:
                continue
            if not _equipment_satisfies(ex.equipment_required, equip):
                continue
                
            # Categorize by risk level
            if ex.risk_level in [RiskLevel.HIGH, RiskLevel.EXTREME]:
                # Only include high-risk exercises for advanced users, and require rationale
                if user_ctx['experience_level'] == 'advanced':
                    risky_ids.append(ex_id)
            else:
                safe_ids.append(ex_id)
        
        # Prioritize safe exercises, add risky ones only if needed to reach minimum
        total_safe = len(safe_ids)
        if total_safe >= 10:
            # We have enough safe exercises
            return safe_ids[:max_ids], risky_ids[:5] if risky_ids else []
        else:
            # Add some risky exercises to reach minimum viable set
            combined = safe_ids + risky_ids[:max_ids - total_safe]
            return combined[:max_ids], risky_ids
            
    except Exception as e:
        print(f"Error building risk-aware allowed IDs: {e}")
        # Fallback to ultra-conservative safe exercises
        safe_fallback = ["push_ups", "goblet_squat", "dumbbell_row", "planks", "glute_bridge", 
                        "dumbbell_shoulder_press", "hammer_curls", "split_squat", "dead_bug", "lateral_raise"]
        return safe_fallback, []
def _allowed_ids_for_prompt(context: dict, max_ids: int = 25) -> list:
    """Wrapper for risk-aware allowed IDs that returns just the safe list for backward compatibility"""
    safe_ids, risky_ids = _get_risk_aware_allowed_ids(context, max_ids)
    # For now, return combined list but log risky ones
    if risky_ids:
        print(f"⚠️  Including {len(risky_ids)} high-risk exercises that require rationale: {risky_ids[:3]}")
    return safe_ids + risky_ids[:max_ids - len(safe_ids)]

def _normalize_text_to_ids(text: str) -> str:
    """Replace exercise mentions with canonical IDs for better retrieval. Case-insensitive.
    Uses NAME_TO_ID_MAP keys; prefers longer keys first to avoid partial overlaps.
    """
    try:
        if not text or not NAME_TO_ID_MAP:
            return text
        
        s = text.lower()  # Work with lowercase for matching
        original_text = text  # Keep original for case preservation
        
        # Sort keys by length desc to avoid partial overlaps (e.g., "bench" vs "bench press")
        keys = sorted(NAME_TO_ID_MAP.keys(), key=len, reverse=True)
        replacements = []
        
        for k in keys:
            if not k or len(k) < 3:
                continue
            ex_id = NAME_TO_ID_MAP[k]
            
            # Find all occurrences of this key in lowercase text
            import re
            # Use word boundaries to avoid partial matches
            pattern = r'\b' + re.escape(k) + r'\b'
            matches = list(re.finditer(pattern, s))
            
            for match in matches:
                start, end = match.span()
                # Store replacement info
                replacements.append((start, end, ex_id))
        
        # Sort replacements by position (reverse order to maintain indices)
        replacements.sort(key=lambda x: x[0], reverse=True)
        
        # Apply replacements to original text
        result = original_text
        for start, end, ex_id in replacements:
            result = result[:start] + ex_id + result[end:]
        
        # Additional common alias mapping
        common_aliases = {
            'bench': 'barbell_bench_press',
            'squat': 'goblet_squat',  # Default to safer variant
            'deadlift': 'romanian_deadlift_dumbbell',  # Default to safer variant
            'ohp': 'overhead_press',
            'pullup': 'pull_ups',
            'pullups': 'pull_ups',
            'chinup': 'pull_ups',
            'chinups': 'pull_ups'
        }
        
        for alias, canonical_id in common_aliases.items():
            if canonical_id in CANONICAL_EXERCISES:
                # Replace standalone words only
                import re
                pattern = r'\b' + re.escape(alias) + r'\b'
                result = re.sub(pattern, canonical_id, result, flags=re.IGNORECASE)
        
        return result
    except Exception as e:
        print(f"Error normalizing text to IDs: {e}")
        return text

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
    
    # Build equipment context and allowed whitelist for prompts
    equipment_available = context.get('equipmentAccess', {}).get(context.get('equipmentAccess', {}).get('current', 'gym'), [])
    equipment_str = ", ".join(equipment_available) if equipment_available else "standard gym equipment"
    allowed_ids_shortlist = []
    if CANONICAL_DATABASE_AVAILABLE:
        allowed_ids_shortlist = _allowed_ids_for_prompt(context, max_ids=25)
    allowed_ids_str = ", ".join(allowed_ids_shortlist)
    
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
        # Add canonical database context if available
        canonical_info = ""
        if CANONICAL_DATABASE_AVAILABLE:
            canonical_info = f"""
🔒 CANONICAL EXERCISE DATABASE (STRICT ENFORCEMENT):
allowedExercises: [{allowed_ids_str}]

⚠️  CRITICAL RULES - VIOLATIONS WILL BE REJECTED:
1. exerciseId MUST be exactly one of the allowedExercises IDs above
2. NO custom names, variations, or creative exercise IDs allowed
3. NO exercises outside the allowedExercises list - they will be BANNED
4. Use exact IDs: "barbell_bench_press" NOT "bench press" or "Bench Press"
5. System will auto-validate and reject any unknown/banned exercise IDs

✅ Valid example: "exerciseId": "goblet_squat"
❌ Invalid: "exerciseId": "Goblet Squats" or "goblet_squats" or "dumbbell squat"

The allowedExercises list above has been filtered for your injuries/experience/equipment."""
        
        template = f"""{context_str}

TASK: Draft a single-day workout plan using ONLY canonical exercise IDs from the allowed list
🎯 SAFETY REQUIREMENTS:
- Database automatically filters out contraindicated exercises for injuries and experience level  
- Choose equipment-appropriate exercises for: {equipment_str}
- System enforces ID compliance - unknown IDs will trigger plan rejection

💪 PROGRAMMING GUIDELINES:
- Use compound movements as the foundation  
- 2-4 segments with 2-5 exercises each
- Progressive overload principles
- Exercise identifiers MUST be canonical IDs (e.g., "back_squat", "dumbbell_bench_press")
{canonical_info}

🏗️ Return:
1) WorkoutPlan JSON with canonical exercise IDs only (from allowedExercises)
2) Human summary (≤120 words, {context['preferenceMemory']['tone']} tone)

User message: {user_message}"""

    elif route == "technique":
        safety_why = EXERCISE_SAFETY_GUIDELINES if isinstance(EXERCISE_SAFETY_GUIDELINES, str) else ""
        
        # Check for technique library availability and extract exercise mentions
        technique_context = ""
        if TECHNIQUE_LIBRARY_AVAILABLE and CANONICAL_DATABASE_AVAILABLE:
            # Extract potential exercise IDs from user message
            normalized_message = _normalize_text_to_ids(user_message)
            mentioned_exercises = []
            for exercise_id in CANONICAL_EXERCISES.keys():
                if exercise_id in normalized_message.lower():
                    mentioned_exercises.append(exercise_id)
            
            # Get technique guidance for mentioned exercises
            if mentioned_exercises:
                technique_responses = []
                active_injuries = context.get('healthSummary', {}).get('activeInjuries', [])
                
                for exercise_id in mentioned_exercises[:2]:  # Limit to 2 exercises to save tokens
                    tech_response = get_compact_technique_response(exercise_id, active_injuries)
                    technique_responses.append(tech_response)
                
                if technique_responses:
                    technique_context = "\n🎯 TECHNIQUE LIBRARY (for mentioned exercises):\n"
                    for resp in technique_responses:
                        technique_context += f"\n{resp['exercise_name']} ({resp['exercise_id']}):\n"
                        if resp['technique_cues']:
                            technique_context += f"Cues: {'; '.join(resp['technique_cues'][:3])}\n"
                        if resp['safe_substitutions']:
                            subs = [f"{s['substitute_name']} ({s['reason'][:50]}...)" for s in resp['safe_substitutions'][:2]]
                            technique_context += f"Substitutions: {'; '.join(subs)}\n"
                    technique_context += f"\n(Token cost: ~{sum(r['token_count'] for r in technique_responses)} tokens)"
        
        template = f"""{context_str}

TASK: Provide technique guidance and safe exercise alternatives using database-powered substitutions
🔍 SAFETY ASSESSMENT:
- Analyze injury risk based on healthSummary
- Use canonical database for precise substitution recommendations
- Provide evidence-based technique cues from technique library
- Include warning signs to stop exercising

ALLOWED EXERCISES SHORTLIST (for alternative suggestions):
allowedExercises: [{allowed_ids_str}]

{technique_context}

📚 REFERENCE SAFETY GUIDELINES (for explanations only, not for gatekeeping):
{safety_why}

🏗️ Return:
1) TechniqueAdvice JSON with risk assessment and database-powered safe alternatives
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
    """Enhanced validator using canonical exercise database with strict ID enforcement"""
    violations = []
    
    try:
        plan = json.loads(plan_json) if isinstance(plan_json, str) else plan_json
        
        if not CANONICAL_DATABASE_AVAILABLE:
            # Fallback to legacy validation if database not available
            return validate_workout_plan_legacy(plan, context)
        
        # Extract exercise IDs from plan
        exercise_ids = []
        for segment in plan.get('segments', []):
            for exercise in segment.get('exercises', []):
                exercise_id = exercise.get('exerciseId', '').strip()
                if exercise_id:
                    exercise_ids.append(exercise_id)
        
        # Build user context for validation
        user_context = _build_user_context(context)
        
        # Get the allowed exercise IDs that were provided in the prompt
        allowed_ids_shortlist = _allowed_ids_for_prompt(context, max_ids=25)
        
        # Validate using canonical database
        validation_results = validate_workout_plan_exercises(exercise_ids, user_context)
        
        # Add violations for exercises not in the allowed shortlist (prompt enforcement)
        for exercise_id in exercise_ids:
            if exercise_id not in allowed_ids_shortlist:
                violations.append(f'Exercise ID "{exercise_id}" not in allowed shortlist provided to model')
        
        if not validation_results['valid']:
            # Add database violations
            violations.extend(validation_results['violations'])
            
            # Add unknown exercise violations
            for unknown_id in validation_results['unknown_exercises']:
                violations.append(f'Unknown exercise ID: "{unknown_id}" - not in canonical database')
        
        # Add risk warnings as violations for stricter enforcement
        for warning in validation_results['risk_warnings']:
            if 'extreme' in warning.lower():
                violations.append(f'BANNED: {warning}')
            else:
                violations.append(f'Risk warning: {warning}')
        
        # Additional validation for missing required fields and equipment gating
        for segment in plan.get('segments', []):
            for exercise in segment.get('exercises', []):
                exercise_id = exercise.get('exerciseId', '')
                
                # Check required fields exist
                if not exercise.get('exerciseName'):
                    violations.append(f'Missing exerciseName for: {exercise_id}')
                if not exercise.get('equipmentNeeded'):
                    violations.append(f'Missing equipment requirements for: {exercise_id}')
                
                # Validate against canonical data if exercise exists
                if exercise_id in CANONICAL_EXERCISES:
                    canonical_exercise = CANONICAL_EXERCISES[exercise_id]
                    # Equipment gating with subset logic
                    user_ctx = _build_user_context(context)
                    available_norm = set(user_ctx.get('equipment_available', []))
                    if not _equipment_satisfies(canonical_exercise.equipment_required, available_norm):
                        violations.append(f'Exercise {exercise_id} requires equipment not available: {canonical_exercise.equipment_required} (available: {sorted(list(available_norm))})')
    
    except Exception as e:
        violations.append(f'Validation error: {str(e)}')
    
    return violations

def validate_workout_plan_legacy(plan, context):
    """Legacy validator for backward compatibility"""
    violations = []
    
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
            
            # Check equipment requirements exist
            if not exercise.get('equipmentNeeded'):
                violations.append(f'Missing equipment requirements for: {exercise_name}')
            
            # Flag high-risk exercises for beginners
            if 'beginner' in context.get('profileSummary', '').lower():
                high_risk_terms = ['behind-neck', 'upright row', 'kipping', 'overhead squat', 'weighted sit']
                if any(term in exercise_name for term in high_risk_terms):
                    violations.append(f'High-risk exercise for beginner: {exercise_name}')
    
    return violations

# --- Canonical enforcement helpers ---
def _get_user_context_from_ai_context(context: dict) -> dict:
    """Map AI context to user_context contract for canonical validator."""
    user_context = {
        'experience_level': 'beginner',
        'active_injuries': context.get('healthSummary', {}).get('activeInjuries', []),
    }
    profile_summary = context.get('profileSummary', '').lower()
    if 'advanced' in profile_summary:
        user_context['experience_level'] = 'advanced'
    elif 'intermediate' in profile_summary or 'experienced' in profile_summary:
        user_context['experience_level'] = 'intermediate'
    else:
        user_context['experience_level'] = 'beginner'
    return user_context

def enforce_canonical_on_plan(plan: dict, context: dict) -> tuple[dict, list]:
    """
    Enforce canonical ID rules on a WorkoutPlan dict:
    - Ensure every exerciseId is known; if unknown, try to infer from exerciseName.
    - Replace contraindicated exercises with safe substitutions.
    - Fill safetyRating and equipmentNeeded from canonical metadata.
    Returns (updated_plan, changes_log)
    """
    changes: list = []
    if not CANONICAL_DATABASE_AVAILABLE:
        return plan, changes

    user_context = _get_user_context_from_ai_context(context)

    # Iterate over exercises
    for segment in plan.get('segments', []) or []:
        for ex in segment.get('exercises', []) or []:
            ex_id = (ex.get('exerciseId') or '').strip()
            ex_name = (ex.get('exerciseName') or '').strip()

            # If ID unknown, try to map from name
            if not ex_id or ex_id not in CANONICAL_EXERCISES:
                if ex_name:
                    guessed = suggest_exercise_id_from_name(ex_name) if CANONICAL_DATABASE_AVAILABLE else None
                    if guessed and guessed in CANONICAL_EXERCISES:
                        ex['exerciseId'] = guessed
                        ex['exerciseName'] = CANONICAL_EXERCISES[guessed].display_name
                        changes.append(f"Mapped unknown exercise to canonical ID: '{ex_name or ex_id}' -> {guessed}")
                        ex_id = guessed

            # If still unknown, mark to remove later
            ex['_unknown_exercise'] = ex_id not in CANONICAL_EXERCISES

            # If known, ensure allowed; if not, try substitutions
            if not ex['_unknown_exercise']:
                allowed, violations = is_exercise_allowed(ex_id, user_context)
                if not allowed:
                    subs = get_safe_substitutions(ex_id, user_context)
                    if subs:
                        new_id = subs[0]
                        ex['exerciseId'] = new_id
                        ex['exerciseName'] = CANONICAL_EXERCISES[new_id].display_name
                        changes.append(f"Replaced banned exercise '{ex_id}' with safer '{new_id}'")
                        ex_id = new_id
                    else:
                        # Mark for removal if no safe subs
                        ex['_remove'] = True
                        changes.append(f"Removed '{ex_id}' (no safe substitutions available)")

            # Fill in canonical metadata when available
            if not ex.get('safetyRating') and not ex.get('_unknown_exercise') and ex_id in CANONICAL_EXERCISES:
                ex['safetyRating'] = CANONICAL_EXERCISES[ex_id].risk_level.value
            if (not ex.get('equipmentNeeded')) and not ex.get('_unknown_exercise') and ex_id in CANONICAL_EXERCISES:
                ex['equipmentNeeded'] = CANONICAL_EXERCISES[ex_id].equipment_required

    # Remove unknown or flagged exercises
    for segment in plan.get('segments', []) or []:
        cleaned = []
        for ex in segment.get('exercises', []) or []:
            if ex.get('_remove') or ex.get('_unknown_exercise'):
                # Skip it
                continue
            # Clean helper flags
            ex.pop('_remove', None)
            ex.pop('_unknown_exercise', None)
            cleaned.append(ex)
        segment['exercises'] = cleaned

    return plan, changes

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
        
        # Normalize the current message to canonical IDs for retrieval/validation
        normalized_message = current_message
        try:
            normalized_message = _normalize_text_to_ids(current_message) if CANONICAL_DATABASE_AVAILABLE else current_message
        except Exception:
            normalized_message = current_message

        # Get context - use real user profile if available, otherwise default/inferred
        if user_id and profile_manager:
            print(f"Loading context for user: {user_id}")
            context = profile_manager.get_user_context_for_ai(user_id)
            
            # Add semantic memory retrieval
            if memory_system:
                try:
                    # Get relevant snippets based on current message
                    relevant_snippets = memory_system.retrieve_relevant_snippets(user_id, normalized_message, k=3)
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

        # Generate coach response with appropriate model
        # Use cheaper model for explanations, stronger model for planning/technique
        if route in ["planner", "technique", "schedule"]:
            model_to_use = coach_model  # Strong model for complex tasks
            print(f"Using strong model (coach_model) for route: {route}")
        else:
            model_to_use = router_model  # Cheaper model for explanations
            print(f"Using cheap model (router_model) for route: {route}")

        full_prompt = f"{COACH_SYSTEM_PROMPT}\n\n{template}"

        # Log observability metrics
        input_tokens = len(full_prompt.split()) * 1.3  # Rough token estimate
        snippet_count = len(context.get('retrievedSnippets', []))
        
        print(f"🔍 Generating response - Route: {route}, Input tokens: ~{int(input_tokens)}, Snippets: {snippet_count}")
        
        start_time = datetime.now()
        response = model_to_use.generate_content(full_prompt)
        response_text = response.text.strip()
        generation_time = (datetime.now() - start_time).total_seconds()
        
        # Log response metrics
        output_tokens = len(response_text.split()) * 1.3
        print(f"📊 Response generated - Output tokens: ~{int(output_tokens)}, Time: {generation_time:.2f}s")

        # Basic validation and enforcement for workout plans (canonical IDs)
        if route == "planner" and "{" in response_text:
            try:
                # Extract JSON from response
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    plan_json = response_text[json_start:json_end]
                    violations = validate_workout_plan(plan_json, context)

                    # Try canonical enforcement/repair
                    try:
                        plan_obj = json.loads(plan_json)
                        repaired_plan, changes = enforce_canonical_on_plan(plan_obj, context)
                        if changes:
                            print(f"Applied canonical enforcement changes: {changes}")
                            # Re-validate after repair
                            recheck = validate_workout_plan(repaired_plan, context)
                            if recheck:
                                print(f"Post-repair remaining violations: {recheck}")
                            # Rebuild response_text by replacing the original JSON segment with repaired JSON
                            repaired_json_str = json.dumps(repaired_plan, separators=(",", ":"))
                            response_text = response_text[:json_start] + repaired_json_str + response_text[json_end:]
                            # Update plan_json reference for potential correction loop
                            plan_json = repaired_json_str
                    except Exception as enfe:
                        print(f"Canonical enforcement error: {enfe}")

                    if violations:
                        print(f"Validation violations found: {violations}")
                        # Build compact correction prompt with only violations and allowed IDs
                        try:
                            allowed_ids_shortlist = _allowed_ids_for_prompt(context, max_ids=25) if CANONICAL_DATABASE_AVAILABLE else []
                            
                            # Filter only the critical violations that need fixing
                            critical_violations = [v for v in violations if 
                                                 'Unknown exercise ID' in v or 
                                                 'not in allowed shortlist' in v or 
                                                 'contraindicated for' in v or
                                                 'BANNED:' in v or
                                                 'requires equipment not available' in v]
                            
                            if critical_violations:
                                correction_prompt = (
                                    "CRITICAL: Your WorkoutPlan JSON violated constraints and must be fixed.\n\n"
                                    "RULES:\n"
                                    f"- Use ONLY these exercise IDs: {allowed_ids_shortlist}\n"
                                    "- Replace any banned/unknown exercises with safe alternatives from the list\n"
                                    "- Keep existing sets/reps/load when possible\n"
                                    "- Output ONLY the corrected JSON (no explanatory text)\n\n"
                                    f"VIOLATIONS TO FIX:\n{chr(10).join(critical_violations)}\n\n"
                                    f"ORIGINAL JSON:\n{plan_json}"
                                )
                                
                                print("Sending correction prompt to fix violations...")
                                fix_resp = coach_model.generate_content(correction_prompt)
                                fix_text = fix_resp.text.strip()
                                fix_start = fix_text.find('{')
                                fix_end = fix_text.rfind('}') + 1
                                if fix_start >= 0 and fix_end > fix_start:
                                    fixed_json = fix_text[fix_start:fix_end]
                                    # Final validate
                                    fix_violations = validate_workout_plan(fixed_json, context)
                                    if not fix_violations:
                                        response_text = response_text[:json_start] + fixed_json + response_text[json_end:]
                                        print("✅ Correction loop successfully fixed all violations")
                                    else:
                                        print(f"⚠️  Correction loop still has violations: {fix_violations[:3]}")  # Show first 3
                        except Exception as corr_e:
                            print(f"Correction loop failed: {corr_e}")
            except Exception as e:
                print(f"Validation error: {e}")

        print(f"Coach response generated: {response_text[:200]}...")

        # Store conversation in semantic memory for future retrieval (with normalized IDs)
        if user_id and memory_system:
            try:
                # Store user message (normalized to canonical IDs for better retrieval)
                normalized_user_msg = _normalize_text_to_ids(current_message) if CANONICAL_DATABASE_AVAILABLE else current_message
                memory_system.add_chat_snippet(user_id, normalized_user_msg, role="user")

                # Store coach response (first 300 chars to avoid too much storage, also normalized)
                coach_summary = response_text[:300] + "..." if len(response_text) > 300 else response_text
                normalized_coach_summary = _normalize_text_to_ids(coach_summary) if CANONICAL_DATABASE_AVAILABLE else coach_summary
                memory_system.add_chat_snippet(user_id, normalized_coach_summary, role="coach")

                # If it's a workout plan, also store as structured workout data with canonical IDs
                if route == "planner" and "{" in response_text:
                    try:
                        json_start = response_text.find('{')
                        json_end = response_text.rfind('}') + 1
                        if json_start >= 0 and json_end > json_start:
                            plan_json_str = response_text[json_start:json_end]
                            plan_data = json.loads(plan_json_str)
                            plan_data['date'] = datetime.now().isoformat()
                            plan_data['route'] = route
                            plan_data['user_context'] = {
                                'experience_level': _build_user_context(context).get('experience_level'),
                                'active_injuries': _build_user_context(context).get('active_injuries', [])
                            }
                            memory_system.add_workout_snippet(user_id, plan_data)
                            print("✅ Stored workout plan with canonical IDs in semantic memory")
                    except Exception as e:
                        print(f"Could not store workout plan in memory: {e}")

                print("✅ Stored conversation with normalized IDs in semantic memory")
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
    
    # Injury detection and context with canonical database integration
    injury_detected = None
    if any(word in text_lower for word in ["elbow", "hurt", "pain", "injury", "sore"]):
        if "elbow" in text_lower:
            injury_detected = "elbow"
            context["healthSummary"]["activeInjuries"] = ["elbow"] 
            
            if CANONICAL_DATABASE_AVAILABLE:
                # Use canonical database for precise injury bans
                from exercise_database import INJURY_BANNED_EXERCISES, InjuryType
                banned_ids = INJURY_BANNED_EXERCISES.get(InjuryType.ELBOW, set())
                # Convert to display names for legacy compatibility
                banned_names = []
                for exercise_id in banned_ids:
                    if exercise_id in CANONICAL_EXERCISES:
                        banned_names.append(CANONICAL_EXERCISES[exercise_id].display_name.lower())
                context["healthSummary"]["bannedExercises"].extend(banned_names)
            else:
                # Legacy fallback
                safety_context = get_safety_context_for_injury("elbow_pain")
                context["healthSummary"]["bannedExercises"].extend(safety_context["avoid"])
            
            context["healthSummary"]["cautionMovements"] = ["overhead_movement", "elbow_flexion_under_load"]
            
        elif any(word in text_lower for word in ["shoulder", "rotator"]):
            injury_detected = "shoulder"
            context["healthSummary"]["activeInjuries"] = ["shoulder"]
            
            if CANONICAL_DATABASE_AVAILABLE:
                from exercise_database import INJURY_BANNED_EXERCISES, InjuryType
                banned_ids = INJURY_BANNED_EXERCISES.get(InjuryType.SHOULDER, set())
                banned_names = []
                for exercise_id in banned_ids:
                    if exercise_id in CANONICAL_EXERCISES:
                        banned_names.append(CANONICAL_EXERCISES[exercise_id].display_name.lower())
                context["healthSummary"]["bannedExercises"].extend(banned_names)
            else:
                safety_context = get_safety_context_for_injury("shoulder_pain")
                context["healthSummary"]["bannedExercises"].extend(safety_context["avoid"])
                
        elif any(word in text_lower for word in ["back", "spine", "lumbar"]):
            injury_detected = "lower_back"
            context["healthSummary"]["activeInjuries"] = ["lower_back"]
            
            if CANONICAL_DATABASE_AVAILABLE:
                from exercise_database import INJURY_BANNED_EXERCISES, InjuryType
                banned_ids = INJURY_BANNED_EXERCISES.get(InjuryType.LOWER_BACK, set())
                banned_names = []
                for exercise_id in banned_ids:
                    if exercise_id in CANONICAL_EXERCISES:
                        banned_names.append(CANONICAL_EXERCISES[exercise_id].display_name.lower())
                context["healthSummary"]["bannedExercises"].extend(banned_names)
            else:
                safety_context = get_safety_context_for_injury("lower_back_pain")
                context["healthSummary"]["bannedExercises"].extend(safety_context["avoid"])
                
        elif any(word in text_lower for word in ["knee"]):
            injury_detected = "knee"
            context["healthSummary"]["activeInjuries"] = ["knee"]
            
            if CANONICAL_DATABASE_AVAILABLE:
                from exercise_database import INJURY_BANNED_EXERCISES, InjuryType
                banned_ids = INJURY_BANNED_EXERCISES.get(InjuryType.KNEE, set())
                banned_names = []
                for exercise_id in banned_ids:
                    if exercise_id in CANONICAL_EXERCISES:
                        banned_names.append(CANONICAL_EXERCISES[exercise_id].display_name.lower())
                context["healthSummary"]["bannedExercises"].extend(banned_names)
            else:
                safety_context = get_safety_context_for_injury("knee_pain")
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

@app.route('/api/exercises/canonical', methods=['GET'])
def get_canonical_exercises():
    """Get information about canonical exercise database"""
    try:
        if not CANONICAL_DATABASE_AVAILABLE:
            return jsonify({"error": "Canonical exercise database not available"}), 500
        
        # Optional user context for filtering
        user_id = request.args.get('user_id')
        experience_level = request.args.get('experience', 'beginner')
        active_injuries = request.args.getlist('injuries')
        
        user_context = {
            'experience_level': experience_level,
            'active_injuries': active_injuries
        }
        
        # Get all exercises or filtered by user context
        if request.args.get('filter') == 'allowed':
            allowed_exercise_ids = get_all_allowed_exercises(user_context)
            exercises_info = {}
            for exercise_id in allowed_exercise_ids:
                exercise = CANONICAL_EXERCISES[exercise_id]
                exercises_info[exercise_id] = {
                    "display_name": exercise.display_name,
                    "risk_level": exercise.risk_level.value,
                    "equipment_required": exercise.equipment_required,
                    "primary_muscles": exercise.primary_muscles,
                    "min_experience": exercise.min_experience_level.value
                }
        else:
            # Return all exercises with their metadata
            exercises_info = {}
            for exercise_id, exercise in CANONICAL_EXERCISES.items():
                is_allowed, violations = is_exercise_allowed(exercise_id, user_context)
                exercises_info[exercise_id] = {
                    "display_name": exercise.display_name,
                    "common_names": exercise.common_names,
                    "risk_level": exercise.risk_level.value,
                    "equipment_required": exercise.equipment_required,
                    "primary_muscles": exercise.primary_muscles,
                    "min_experience": exercise.min_experience_level.value,
                    "injury_contraindications": [inj.value for inj in exercise.injury_contraindications],
                    "safety_flags": list(exercise.safety_flags),
                    "substitutions": exercise.substitutions,
                    "allowed_for_user": is_allowed,
                    "violations": violations if not is_allowed else []
                }
        
        return jsonify({
            "success": True,
            "total_exercises": len(CANONICAL_EXERCISES),
            "exercises": exercises_info,
            "user_context": user_context,
            "database_version": "v1.0"
        })
        
    except Exception as e:
        print(f"Error in get_canonical_exercises: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/exercises/validate', methods=['POST'])
def validate_exercise_list():
    """Validate a list of exercise IDs against canonical database"""
    try:
        if not CANONICAL_DATABASE_AVAILABLE:
            return jsonify({"error": "Canonical exercise database not available"}), 500
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
            
        exercise_ids = data.get('exercise_ids', [])
        if not exercise_ids:
            return jsonify({"error": "Missing exercise_ids"}), 400
        
        # Build user context
        user_context = {
            'experience_level': data.get('experience_level', 'beginner'),
            'active_injuries': data.get('active_injuries', [])
        }
        
        # Validate exercises
        validation_results = validate_workout_plan_exercises(exercise_ids, user_context)
        
        return jsonify({
            "success": True,
            "validation_results": validation_results,
            "user_context": user_context
        })
        
    except Exception as e:
        print(f"Error in validate_exercise_list: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/exercises/suggest', methods=['POST'])
def suggest_exercise_from_name():
    """Suggest canonical exercise ID from natural language name"""
    try:
        if not CANONICAL_DATABASE_AVAILABLE:
            return jsonify({"error": "Canonical exercise database not available"}), 500
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
            
        exercise_name = data.get('exercise_name', '')
        if not exercise_name:
            return jsonify({"error": "Missing exercise_name"}), 400
        
        suggested_id = suggest_exercise_id_from_name(exercise_name)
        
        if suggested_id:
            exercise = CANONICAL_EXERCISES[suggested_id]
            # Also check if it's allowed for the user context if provided
            user_context = {
                'experience_level': data.get('experience_level', 'beginner'),
                'active_injuries': data.get('active_injuries', [])
            }
            is_allowed, violations = is_exercise_allowed(suggested_id, user_context)
            
            return jsonify({
                "success": True,
                "suggested_id": suggested_id,
                "display_name": exercise.display_name,
                "risk_level": exercise.risk_level.value,
                "equipment_required": exercise.equipment_required,
                "is_allowed": is_allowed,
                "violations": violations if not is_allowed else []
            })
        else:
            return jsonify({
                "success": False,
                "message": "No canonical exercise found for that name",
                "suggestion": "Try using more specific terms or check the canonical database"
            })
        
    except Exception as e:
        print(f"Error in suggest_exercise_from_name: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/exercises/normalize-text', methods=['POST'])
def normalize_exercise_text():
    """Normalize text containing exercise mentions to canonical IDs"""
    try:
        if not CANONICAL_DATABASE_AVAILABLE:
            return jsonify({"error": "Canonical exercise database not available"}), 500
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
            
        text = data.get('text', '')
        if not text:
            return jsonify({"error": "Missing text"}), 400
        
        normalized_text = _normalize_text_to_ids(text)
        
        return jsonify({
            "success": True,
            "original_text": text,
            "normalized_text": normalized_text,
            "changes_made": normalized_text != text
        })
        
    except Exception as e:
        print(f"Error in normalize_exercise_text: {e}")
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