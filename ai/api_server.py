"""
HLTHY AI Coach - Production API Server
Clean refactored version using ONLY current systems (no deprecated code)
"""
import vertexai
from vertexai.generative_models import GenerativeModel
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import sys
from datetime import datetime
from google.oauth2 import service_account

print("🚀 Starting HLTHY AI Coach API Server...")

# Add ai directory to path
ai_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ai_dir)

# =============================================================================
# ENVIRONMENT CONFIGURATION
# =============================================================================
try:
    from config.load_env import load_env_file
    load_env_file()
    print("✅ Environment configuration loaded")
except ImportError:
    print("⚠️  Using system environment variables only")

# =============================================================================
# CORE SYSTEMS INITIALIZATION
# =============================================================================

# AI Orchestrator (Main Brain)
try:
    from core.ai_orchestrator import AIOrchestrator
    AI_ORCHESTRATOR_AVAILABLE = True
    print("✅ AI Orchestrator loaded")
except ImportError as e:
    print(f"❌ AI Orchestrator not available: {e}")
    AI_ORCHESTRATOR_AVAILABLE = False
    AIOrchestrator = None

# User Profile Manager
try:
    from utils.user_profiles import UserProfileManager
    profile_manager = UserProfileManager()
    PROFILE_MANAGER_AVAILABLE = True
    print("✅ User Profile Manager loaded")
except ImportError as e:
    print(f"❌ Profile Manager not available: {e}")
    PROFILE_MANAGER_AVAILABLE = False
    profile_manager = None

# Semantic Memory System
try:
    from utils.semantic_memory import SemanticMemorySystem
    semantic_memory = SemanticMemorySystem()
    SEMANTIC_MEMORY_AVAILABLE = True
    print("✅ Semantic Memory System loaded")
except ImportError as e:
    print(f"❌ Semantic Memory not available: {e}")
    SEMANTIC_MEMORY_AVAILABLE = False
    semantic_memory = None

# AI Profile Extractor
try:
    from utils.ai_profile_extractor import GeminiProfileExtractor
    AI_EXTRACTOR_AVAILABLE = True
    print("✅ AI Profile Extractor loaded")
except ImportError as e:
    print(f"❌ AI Extractor not available: {e}")
    AI_EXTRACTOR_AVAILABLE = False
    GeminiProfileExtractor = None

# Observability Dashboard
try:
    from utils.observability_dashboard import ObservabilityDashboard
    observability = ObservabilityDashboard()
    OBSERVABILITY_AVAILABLE = True
    print("✅ Observability Dashboard loaded")
except ImportError as e:
    print(f"⚠️  Observability not available: {e}")
    OBSERVABILITY_AVAILABLE = False
    observability = None

# Rate Limiter
try:
    from utils.rate_limiting import RateLimiter
    rate_limiter = RateLimiter()
    RATE_LIMITER_AVAILABLE = True
    print("✅ Rate Limiter loaded")
except ImportError as e:
    print(f"⚠️  Rate Limiter not available: {e}")
    RATE_LIMITER_AVAILABLE = False
    rate_limiter = None

# =============================================================================
# FLASK APP SETUP
# =============================================================================
app = Flask(__name__)
CORS(app)

# =============================================================================
# VERTEX AI / GEMINI INITIALIZATION
# =============================================================================
try:
    service_account_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "hlthy-421200")
    
    if service_account_path and os.path.exists(service_account_path):
        credentials = service_account.Credentials.from_service_account_file(service_account_path)
        vertexai.init(project=project_id, location="us-central1", credentials=credentials)
    else:
        vertexai.init(project=project_id, location="us-central1")
    
    print(f"✅ Vertex AI initialized for project: {project_id}")
except Exception as e:
    print(f"❌ Vertex AI initialization failed: {e}")

# Initialize Gemini Models
gemini_model = None
try:
    # Use newest model
    gemini_model = GenerativeModel("gemini-2.0-flash-exp")
    print("✅ Gemini model initialized: gemini-2.0-flash-exp")
except Exception as e:
    print(f"⚠️  Failed to initialize gemini-2.0-flash-exp, trying fallback: {e}")
    try:
        gemini_model = GenerativeModel("gemini-1.5-flash")
        print("✅ Gemini model initialized: gemini-1.5-flash (fallback)")
    except Exception as e2:
        print(f"❌ Failed to initialize Gemini model: {e2}")
        gemini_model = None

# Initialize AI Orchestrator with Gemini
ai_orchestrator = None
if AI_ORCHESTRATOR_AVAILABLE and gemini_model:
    try:
        ai_orchestrator = AIOrchestrator(gemini_model=gemini_model)
        print("✅ AI Orchestrator initialized with Gemini")
    except Exception as e:
        print(f"❌ Failed to initialize AI Orchestrator: {e}")
        ai_orchestrator = None

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_simple_fallback_response(message: str) -> str:
    """Simple fallback when AI systems are unavailable"""
    message_lower = message.lower()
    
    if any(word in message_lower for word in ["workout", "exercise", "train"]):
        return "I'd love to help you with a workout! Let me know your experience level and what you'd like to focus on."
    elif any(word in message_lower for word in ["form", "technique", "how to"]):
        return "Great question about exercise technique! Proper form is crucial for safety and effectiveness."
    elif any(word in message_lower for word in ["diet", "nutrition", "eat"]):
        return "Nutrition is important for your fitness goals! Consider consulting with a nutritionist for personalized advice."
    else:
        return "I'm here to help with your fitness journey! Ask me about workouts, exercise techniques, or training advice."

# =============================================================================
# API ENDPOINTS
# =============================================================================

@app.route('/', methods=['GET'])
def root():
    """Root endpoint - health check"""
    return jsonify({
        "status": "HLTHY AI Coach API is running",
        "version": "2.0",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/health', methods=['GET'])
def health():
    """Detailed health check"""
    return jsonify({
        "status": "healthy",
        "systems": {
            "ai_orchestrator": ai_orchestrator is not None,
            "profile_manager": PROFILE_MANAGER_AVAILABLE,
            "semantic_memory": SEMANTIC_MEMORY_AVAILABLE,
            "ai_extractor": AI_EXTRACTOR_AVAILABLE,
            "gemini_model": gemini_model is not None
        },
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Main chat endpoint - processes user messages with AI
    
    Expected JSON:
    {
        "user_id": "uuid",
        "message": "I hate burpees"
    }
    
    Returns:
    {
        "success": true,
        "response": "Got it! So you're not a fan of burpees?...",
        "type": "conversational" | "workout_plan" | "confirmation_request",
        ...
    }
    """
    try:
        print("=== /api/chat REQUEST ===")
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
        
        user_id = data.get('user_id', 'anonymous_user')
        message = data.get('message', '')
        conversation_history = data.get('conversation_history', [])
        workout_preferences = data.get('workout_preferences')
        editing_workout = data.get('editing_workout')
        workout_history = data.get('workout_history')  # Recent workout logs and exercise performance
        
        if not message:
            return jsonify({"error": "Missing message field"}), 400
        
        print(f"User: {user_id[:8]}... | Message: {message[:50]}... | History: {len(conversation_history)} messages")
        if workout_preferences:
            print(f"  📋 Workout preferences: {workout_preferences}")
        if editing_workout:
            print(f"  ✏️  Editing workout: {editing_workout.get('name', 'Unknown')}")
        if workout_history:
            print(f"  📊 Workout history: {len(workout_history.get('recent_workouts', []))} recent workouts, {len(workout_history.get('exercise_history', {}))} exercises tracked")
        
        # Use AI Orchestrator if available
        if ai_orchestrator:
            try:
                # Pass conversation history and additional context
                context_data = {
                    'conversation_history': conversation_history
                }
                
                # Add workout preferences if provided
                if workout_preferences:
                    context_data['workout_preferences'] = workout_preferences
                
                # Add editing context if user is editing a workout
                if editing_workout:
                    context_data['editing_workout'] = editing_workout
                
                # Add workout history for progressive overload coaching
                if workout_history:
                    context_data['workout_history'] = workout_history
                
                result = ai_orchestrator.process_message(user_id, message, context_data)
                
                print(f"AI Response type: {result.get('type')}")
                
                # Transform to frontend-compatible API format
                api_response = {
                    "response": result.get('message', ''),
                    "type": result.get('type', 'conversational')
                }
                
                # Include workout if present (frontend expects 'workoutPlan')
                if result.get('workout'):
                    api_response['workoutPlan'] = result['workout']
                
                # Include profile data for workout_confirmation responses
                if result.get('profile'):
                    api_response['profile'] = result['profile']
                
                # Include pending confirmations if present (for conversational memory)
                if result.get('pending_confirmations'):
                    api_response['pending_confirmations'] = result['pending_confirmations']
                    api_response['requires_user_confirmation'] = True
                
                # Include profile needs if present
                if result.get('profile_needs'):
                    api_response['profile_needs'] = result['profile_needs']
                
                # Debug log for workout_confirmation
                if result.get('type') == 'workout_confirmation':
                    print(f"📋 Sending workout_confirmation with profile: {bool(result.get('profile'))}")
                
                return jsonify(api_response)
                
            except Exception as e:
                print(f"AI Orchestrator error: {e}")
                import traceback
                traceback.print_exc()
                # Fall through to fallback
        
        # Fallback response when AI is unavailable
        fallback_message = get_simple_fallback_response(message)
        return jsonify({
            "response": fallback_message,
            "type": "conversational"
        })
        
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@app.route('/api/profile/<user_id>', methods=['GET'])
def get_profile(user_id):
    """Get user profile"""
    try:
        if not PROFILE_MANAGER_AVAILABLE:
            return jsonify({"error": "Profile system not available"}), 503
        
        profile = profile_manager.load_profile(user_id)
        
        if not profile:
            return jsonify({"error": "Profile not found"}), 404
        
        # Convert profile to dict
        profile_dict = {
            "user_id": profile.user_id,
            "experience_level": profile.experience_level,
            "dislikes": profile.dislikes or [],
            "active_injuries": [
                {
                    "injury_type": inj.injury_type,
                    "severity": inj.severity,
                    "reported_at": inj.reported_at
                } for inj in (profile.active_injuries or [])
            ],
            "available_equipment": profile.available_equipment or {},
            "goals": profile.goals.__dict__ if hasattr(profile, 'goals') and profile.goals else {}
        }
        
        return jsonify({
            "success": True,
            "profile": profile_dict
        })
        
    except Exception as e:
        print(f"Get profile error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/profile/<user_id>', methods=['PUT'])
def update_profile(user_id):
    """Update user profile"""
    try:
        if not PROFILE_MANAGER_AVAILABLE:
            return jsonify({"error": "Profile system not available"}), 503
        
        data = request.get_json()
        updates = data.get('updates', {})
        
        # Load existing profile
        profile = profile_manager.load_profile(user_id)
        if not profile:
            return jsonify({"error": "Profile not found"}), 404
        
        # Update fields
        for key, value in updates.items():
            if hasattr(profile, key):
                setattr(profile, key, value)
        
        # Save
        profile_manager.save_profile(profile)
        
        return jsonify({
            "success": True,
            "message": "Profile updated successfully"
        })
        
    except Exception as e:
        print(f"Update profile error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/memory/<user_id>', methods=['GET'])
def get_memory(user_id):
    """Get conversation memory snippets"""
    try:
        if not SEMANTIC_MEMORY_AVAILABLE:
            return jsonify({"error": "Memory system not available"}), 503
        
        limit = request.args.get('limit', 10, type=int)
        snippets = semantic_memory.get_recent_snippets(user_id, limit=limit)
        
        return jsonify({
            "success": True,
            "snippets": snippets,
            "count": len(snippets)
        })
        
    except Exception as e:
        print(f"Get memory error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/memory/<user_id>/search', methods=['POST'])
def search_memory(user_id):
    """Search conversation memory"""
    try:
        if not SEMANTIC_MEMORY_AVAILABLE:
            return jsonify({"error": "Memory system not available"}), 503
        
        data = request.get_json()
        query = data.get('query', '')
        k = data.get('k', 5)
        
        if not query:
            return jsonify({"error": "Missing query"}), 400
        
        results = semantic_memory.retrieve_relevant_snippets(user_id, query, k=k)
        
        return jsonify({
            "success": True,
            "results": results,
            "count": len(results)
        })
        
    except Exception as e:
        print(f"Search memory error: {e}")
        return jsonify({"error": str(e)}), 500

# =============================================================================
# SERVER STARTUP
# =============================================================================

if __name__ == "__main__":
    print("\n" + "="*60)
    print("🏋️  HLTHY AI COACH - API SERVER")
    print("="*60)
    print(f"✅ AI Orchestrator: {'Available' if ai_orchestrator else 'Not Available'}")
    print(f"✅ Profile Manager: {'Available' if PROFILE_MANAGER_AVAILABLE else 'Not Available'}")
    print(f"✅ Semantic Memory: {'Available' if SEMANTIC_MEMORY_AVAILABLE else 'Not Available'}")
    print(f"✅ AI Extractor: {'Available' if AI_EXTRACTOR_AVAILABLE else 'Not Available'}")
    print(f"✅ Gemini Model: {'Available' if gemini_model else 'Not Available'}")
    print("="*60)
    print(f"🌐 Starting server on port 8080...")
    print("="*60 + "\n")
    
    debug = os.environ.get("FLASK_ENV") != "production"
    app.run(host="0.0.0.0", port=8080, debug=debug)
