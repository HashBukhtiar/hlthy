import vertexai
from vertexai.generative_models import GenerativeModel
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime

# Import exercise safety knowledge
try:
    from exercise_safety import EXERCISE_SAFETY_GUIDELINES, get_safety_context_for_injury
except ImportError:
    EXERCISE_SAFETY_GUIDELINES = "Safety guidelines not loaded"
    def get_safety_context_for_injury(injury_type):
        return {"avoid": [], "prefer": [], "modifications": []}

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize Vertex AI
project_id = "hlthy-421200"
location = "us-central1"
vertexai.init(project=project_id, location=location)

# Initialize models
coach_model = GenerativeModel("gemini-2.0-flash-exp")  # Main coach model
router_model = GenerativeModel("gemini-1.5-flash")     # Cheaper model for routing

# Router prompt
ROUTER_PROMPT = """You classify the user's intent into exactly one label:
- planner: asking for a workout today, a split, or exercise selection.
- technique: asking about form, substitutions due to pain/injury/equipment, or fix-my-lift.
- explain: asking for definitions or educational content.
- schedule: asking about deloads, weekly layout, rest days, or adherence.
- chit_chat: greetings or small talk.

Return JSON only: {"label":"planner"}

Fallback: if confidence < 0.6 and the user mentions a workout, use `planner`; otherwise `explain`."""

# System prompt for HLTHY Coach with AI Exercise Knowledge
SAFETY_RULES = f"""
EXERCISE SAFETY GUIDELINES:
{EXERCISE_SAFETY_GUIDELINES}

SAFETY-FIRST RULES:
1) NEVER recommend exercises contraindicated for active injuries or conditions in healthSummary
2) Always prioritize joint-friendly, progressive overload principles
3) Avoid high-risk exercises for beginners (e.g., behind-neck press, upright rows, loaded spinal flexion)
4) When in doubt, choose safer alternatives (e.g., goblet squat vs. back squat for beginners)
5) Respect equipment limitations - only suggest exercises possible with available equipment
6) Flag any exercise that might aggravate mentioned injuries/pain
"""

COACH_SYSTEM_PROMPT = f"""You are HLTHY Coach, a mobile fitness trainer with access to comprehensive exercise science knowledge. Goals: safe, specific, actionable programming using evidence-based exercise selection.

{SAFETY_RULES}

EXERCISE SELECTION PRINCIPLES:
- Choose from well-established, evidence-based exercises with proper biomechanics
- Prefer compound movements over isolation when appropriate
- Match exercise difficulty to user's experience level
- Consider injury history and current limitations
- Use your extensive exercise science knowledge, but be conservative with risk

PROGRAMMING RULES:
1) Always output machine-readable JSON first (schema below), then a short user-friendly summary (≤120 words by default)
2) Obey preferenceMemory (replyLength, tone, exerciseNameStyle). Be concise unless user asks for detail
3) Never exceed safe weekly volumes, and avoid scheduling heavy squat/deadlift on consecutive days
4) If information is missing, ask one clarifying question or make a conservative assumption and state it
5) Use the user's words when possible (e.g., 'RDL', 'bench', 'curls')
6) When suggesting exercises, include clear, unique identifiers in exerciseId field

JSON output schemas:

WorkoutPlan
{{
  "dayType": "string",
  "segments": [
    {{
      "name": "string", 
      "exercises": [
        {{
          "exerciseId": "unique_id_like_barbell_squat",
          "exerciseName": "Human Readable Name",
          "sets": 3,
          "reps": 8,
          "load": "@RPE8",
          "restSec": 90,
          "notes": "safety cue",
          "safetyRating": "low",
          "equipmentNeeded": ["barbell"]
        }}
      ]
    }}
  ],
  "safetyNotes": "injury considerations"
}}

TechniqueAdvice
{{
  "issue": "injury or form issue",
  "riskAssessment": "injury risk description", 
  "avoidExercises": ["exercises to avoid"],
  "safeAlternatives": [
    {{
      "exerciseId": "safe_alternative",
      "exerciseName": "Safe Exercise",
      "reason": "why safer"
    }}
  ],
  "techniqueCues": ["form cue 1", "form cue 2"]
}}

SchedulePlan
{{
  "daysPerWeek": 4,
  "split": [{{"day":"Mon","focus":"Upper"}}, {{"day":"Tue","focus":"Lower"}}],
  "deloadGuidelines": ["reduce volume by 40% every 4th week"]
}}

Explanation
{{
  "topic": "topic name",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "safetyConsiderations": ["safety point 1", "safety point 2"]
}}

After the JSON, output a short human summary that matches preferenceMemory."""

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
    """Route user message to appropriate category"""
    try:
        prompt = f"{ROUTER_PROMPT}\n\nUser message: {user_message}"
        response = router_model.generate_content(prompt)
        result = json.loads(response.text.strip())
        return result.get("label", "explain")
    except Exception as e:
        print(f"Router error: {e}")
        # Fallback routing logic
        message_lower = user_message.lower()
        if any(word in message_lower for word in ["workout", "exercise", "train", "lift", "plan"]):
            return "planner"
        elif any(word in message_lower for word in ["form", "technique", "hurt", "pain", "substitute"]):
            return "technique"
        elif any(word in message_lower for word in ["schedule", "split", "week", "rest", "deload"]):
            return "schedule"
        else:
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
    return jsonify({"status": "OK", "message": "HLTHY Coach AI service is running", "version": "v1-coach"}), 200

@app.route('/api/health', methods=['GET']) 
def api_health():
    return jsonify({"status": "OK", "service": "HLTHY Coach API", "version": "v1-coach"}), 200

# Main chat endpoint with coaching functionality
@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        print("=== RECEIVED /api/chat REQUEST ===")
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
            
        # Extract conversation history and current message
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
        print(f"Conversation history length: {len(conversation_history)}")
        
        # Get context (for MVP, use default context with some injury examples)
        context = get_default_context()
        
        # Add dynamic context based on conversation patterns with safety guidelines
        injury_detected = None
        if any(word in current_message.lower() for word in ["elbow", "hurt", "pain", "injury"]):
            if "elbow" in current_message.lower():
                injury_detected = "elbow_pain"
                safety_context = get_safety_context_for_injury("elbow_pain")
                context["healthSummary"]["activeInjuries"] = ["elbow_pain_right"] 
                context["healthSummary"]["bannedExercises"] = safety_context["avoid"]
                context["healthSummary"]["cautionMovements"] = ["overhead_movement", "elbow_flexion_under_load"]
            elif any(word in current_message.lower() for word in ["shoulder", "rotator"]):
                injury_detected = "shoulder_pain"
                safety_context = get_safety_context_for_injury("shoulder_pain")
                context["healthSummary"]["activeInjuries"] = ["shoulder_pain"]
                context["healthSummary"]["bannedExercises"] = safety_context["avoid"]
            elif any(word in current_message.lower() for word in ["back", "spine", "lumbar"]):
                injury_detected = "lower_back_pain"
                safety_context = get_safety_context_for_injury("lower_back_pain")
                context["healthSummary"]["activeInjuries"] = ["lower_back_pain"]
                context["healthSummary"]["bannedExercises"] = safety_context["avoid"]
            elif any(word in current_message.lower() for word in ["knee"]):
                injury_detected = "knee_pain"
                safety_context = get_safety_context_for_injury("knee_pain")
                context["healthSummary"]["activeInjuries"] = ["knee_pain"]
                context["healthSummary"]["bannedExercises"] = safety_context["avoid"]
        
        if any(word in current_message.lower() for word in ["home", "no gym", "bodyweight", "apartment"]):
            context["equipmentAccess"]["current"] = "home"
        
        if any(word in current_message.lower() for word in ["beginner", "new", "starting", "never"]):
            context["profileSummary"] = "Beginner lifter just starting their fitness journey. Needs foundational movement patterns and conservative progression. Safety is the top priority."
            context["requestMeta"]["safetyLevel"] = "very_conservative"
            # Add beginner-specific banned exercises
            context["healthSummary"]["bannedExercises"].extend([
                "behind_neck_press", "upright_rows", "kipping_pullups", "heavy_overhead_squats"
            ])
        
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
        
        return jsonify({"text": response_text})
        
    except Exception as e:
        print(f"ERROR in /api/chat: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"text": "I'm having trouble right now. Please try again later."}), 500

if __name__ == '__main__':
    print("Starting HLTHY Coach Flask server...")
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)