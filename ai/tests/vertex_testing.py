import vertexai
from vertexai.generative_models import GenerativeModel
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import sys
import re
import vertexai
from datetime import datetime
from google.oauth2 import service_account

# Load environment variables from .env file
try:
    # Add ai directory to path for config module
    import sys
    import os
    ai_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, ai_dir)
    
    from config.load_env import load_env_file
    load_env_file()
    print("✅ Environment configuration loaded")
except ImportError:
    print("Warning: Could not load load_env.py - using system environment variables only")

# Import exercise safety knowledge and canonical exercise database
try:
    from utils.exercise_safety import EXERCISE_SAFETY_GUIDELINES, get_safety_context_for_injury
    print("✅ Exercise safety guidelines loaded")
except ImportError:
    print("Warning: Exercise safety guidelines not available")
    EXERCISE_SAFETY_GUIDELINES = {}

# Import canonical exercise database
CANONICAL_DATABASE_AVAILABLE = False
try:
    from core.exercise_database import ExerciseDatabase
    canonical_db = ExerciseDatabase()
    CANONICAL_DATABASE_AVAILABLE = True
    print("✅ Canonical exercise database loaded from core module")
except ImportError:
    print("Warning: Canonical exercise database not available")
    canonical_db = None

# Import profile manager
PROFILE_MANAGER_AVAILABLE = False
try:
    from utils.user_profiles import UserProfileManager
    profile_manager = UserProfileManager()
    PROFILE_MANAGER_AVAILABLE = True
    print("✅ User profile system available")
except ImportError:
    print("Warning: User profile system not available")
    profile_manager = None

# Import technique library
TECHNIQUE_LIBRARY_AVAILABLE = False
try:
    from technique_library import TechniqueLibrary
    technique_lib = TechniqueLibrary()
    TECHNIQUE_LIBRARY_AVAILABLE = True
    print("✅ Technique library available")
except ImportError:
    print("Warning: Technique library not available")
    technique_lib = None

# Import progression tracker
PROGRESSION_TRACKER_AVAILABLE = False
try:
    from progression_tracker import ProgressionTracker
    progression_tracker = ProgressionTracker()
    PROGRESSION_TRACKER_AVAILABLE = True
    print("✅ Progression tracker available")
except ImportError:
    print("Warning: Progression tracker not available")
    progression_tracker = None

# Import semantic memory system
SEMANTIC_MEMORY_AVAILABLE = False
try:
    from utils.semantic_memory import SemanticMemorySystem
    semantic_memory = SemanticMemorySystem()
    SEMANTIC_MEMORY_AVAILABLE = True
    print("✅ Semantic memory system available")
except ImportError:
    print("Warning: Semantic memory system not available")
    semantic_memory = None

# Import profile sync system
try:
    from utils.profile_sync import ProfileSyncSystem
    profile_sync = ProfileSyncSystem()
    print("✅ Profile sync system available")
except ImportError:
    print("Warning: Profile sync system not available")
    profile_sync = None

# Import rate limiting
try:
    from utils.rate_limiting import RateLimiter
    rate_limiter = RateLimiter()
    print("✅ Rate limiting system available")
except ImportError:
    print("Warning: Rate limiting system not available")
    rate_limiter = None

# Import exercise whitelist cache
try:
    from utils.exercise_whitelist_cache import ExerciseWhitelistCache
    whitelist_cache = ExerciseWhitelistCache()
    print("✅ Exercise whitelist cache available")
except ImportError:
    print("Warning: Exercise whitelist cache not available")
    whitelist_cache = None

# Import observability dashboard
try:
    from utils.observability_dashboard import ObservabilityDashboard
    observability = ObservabilityDashboard()
    print("✅ Observability dashboard available")
except ImportError:
    print("Warning: Observability dashboard not available")
    observability = None

# Try to import the intelligent integration system
try:
    # Add the ai directory to path (parent of tests directory)
    ai_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    sys.path.insert(0, ai_dir)
    
    from integration.focus_integration_complete import FocusIntegrationSystem
    from core.exercise_database import ExerciseDatabase
    FOCUS_PLANNER_AVAILABLE = True
    ENHANCED_INTEGRATION = True
    
    # Initialize Enhanced Focus Planner system
    exercise_database = ExerciseDatabase()
    focus_integration = FocusIntegrationSystem(exercise_db=exercise_database, user_profiles=profile_manager)
    print("✅ Enhanced Focus Planner system available with interview flow")
except ImportError as e:
    print(f"❌ Focus Planner system not available: {e}")
    FOCUS_PLANNER_AVAILABLE = False
    ENHANCED_INTEGRATION = False
    focus_integration = None

# Create Flask app
app = Flask(__name__)
CORS(app)

# Initialize Vertex AI
try:
    service_account_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "hlthy-421200")
    
    if service_account_path and os.path.exists(service_account_path):
        credentials = service_account.Credentials.from_service_account_file(service_account_path)
        vertexai.init(project=project_id, location="us-central1", credentials=credentials)
    else:
        vertexai.init(project=project_id, location="us-central1")
    
    print(f"Vertex AI initialized successfully for project: {project_id}")
except Exception as e:
    print(f"Warning: Could not initialize Vertex AI: {e}")

# Initialize Generative Models
coach_model = None
router_model = None

try:
    # Try the newest model first
    coach_model = GenerativeModel("gemini-2.0-flash-exp")  # Main coach model
    router_model = GenerativeModel("gemini-2.0-flash-exp")  # Intent router
    print("Generative models initialized successfully with gemini-2.0-flash-exp")
except Exception as e:
    print(f"Failed to initialize with gemini-2.0-flash-exp, trying fallback: {e}")
    try:
        coach_model = GenerativeModel("gemini-1.5-pro")  # Main coach model
        router_model = GenerativeModel("gemini-1.5-pro")  # Intent router
        print("Generative models initialized successfully with gemini-1.5-pro")
    except Exception as e2:
        print(f"Failed to initialize with gemini-1.5-pro, trying basic fallback: {e2}")
        try:
            # Final fallback to basic model
            coach_model = GenerativeModel("gemini-pro")
            router_model = GenerativeModel("gemini-pro")
            print("Generative models initialized successfully with gemini-pro fallback")
        except Exception as e3:
            print(f"Error: Could not initialize any models: {e3}")
            coach_model = None
            router_model = None

# Initialize AI-powered intelligent system now that models are ready
INTELLIGENT_SYSTEM_AVAILABLE = False
intelligent_system = None
legacy_wrapper = None

if coach_model:
    try:
        from integration.intelligent_integration import IntelligentIntegration, LegacyCompatibilityWrapper
        intelligent_system = IntelligentIntegration(coach_model)
        legacy_wrapper = LegacyCompatibilityWrapper(coach_model)
        INTELLIGENT_SYSTEM_AVAILABLE = True
        print("✅ AI-powered intelligent system initialized with Gemini brain")
    except ImportError as e:
        print(f"Warning: AI intelligent system not available: {e}")
        INTELLIGENT_SYSTEM_AVAILABLE = False
else:
    print("Warning: No coach_model available, intelligent system disabled")

# Simple fallback function for basic responses
def get_simple_fallback_response(message: str) -> str:
    """Simple fallback when all systems are down"""
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
def health_check():
    return jsonify({"status": "HLTHY Coach API is running", "timestamp": datetime.now().isoformat()})

@app.route('/api/health', methods=['GET']) 
def detailed_health():
    return jsonify({"status": "healthy", "systems": {"profiles": PROFILE_MANAGER_AVAILABLE, "memory": SEMANTIC_MEMORY_AVAILABLE, "intelligent_system": INTELLIGENT_SYSTEM_AVAILABLE}})

# Profile Management Endpoints
@app.route('/api/profile', methods=['POST'])
def create_profile():
    try:
        if not PROFILE_MANAGER_AVAILABLE:
            return jsonify({"error": "Profile system not available"}), 500
            
        data = request.get_json()
        user_id = data.get('user_id')
        profile_data = data.get('profile', {})
        
        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400
            
        # Create or update profile
        success = profile_manager.create_or_update_profile(user_id, profile_data)
        
        if success:
            return jsonify({
                "success": True,
                "message": "Profile created/updated successfully",
                "user_id": user_id
            })
        else:
            return jsonify({"error": "Failed to create/update profile"}), 500
            
    except Exception as e:
        print(f"Error creating profile: {e}")
        return jsonify({"error": "Failed to create profile"}), 500

@app.route('/api/profile/<user_id>', methods=['GET'])
def get_profile(user_id):
    try:
        if not PROFILE_MANAGER_AVAILABLE:
            return jsonify({"error": "Profile system not available"}), 500
            
        profile = profile_manager.get_profile(user_id)
        
        if profile:
            return jsonify({
                "success": True,
                "profile": profile,
                "user_id": user_id
            })
        else:
            return jsonify({"error": "Profile not found"}), 404
            
    except Exception as e:
        print(f"Error retrieving profile: {e}")
        return jsonify({"error": "Failed to retrieve profile"}), 500

@app.route('/api/profile/<user_id>', methods=['PUT'])
def update_profile(user_id):
    try:
        if not PROFILE_MANAGER_AVAILABLE:
            return jsonify({"error": "Profile system not available"}), 500
            
        data = request.get_json()
        profile_updates = data.get('profile', {})
        
        success = profile_manager.update_profile(user_id, profile_updates)
        
        if success:
            updated_profile = profile_manager.get_profile(user_id)
            return jsonify({
                "success": True,
                "message": "Profile updated successfully",
                "profile": updated_profile
            })
        else:
            return jsonify({"error": "Failed to update profile"}), 500
            
    except Exception as e:
        print(f"Error updating profile: {e}")
        return jsonify({"error": "Failed to update profile"}), 500

# Memory System Endpoints
@app.route('/api/profile/<user_id>/memory', methods=['GET'])
def get_memory_snippets(user_id):
    try:
        if not SEMANTIC_MEMORY_AVAILABLE:
            return jsonify({"error": "Memory system not available"}), 500
            
        limit = request.args.get('limit', 10, type=int)
        snippets = semantic_memory.get_user_snippets(user_id, limit=limit)
        
        return jsonify({
            "success": True,
            "snippets": snippets,
            "count": len(snippets)
        })
        
    except Exception as e:
        print(f"Error retrieving memory: {e}")
        return jsonify({"error": "Failed to retrieve memory"}), 500

@app.route('/api/profile/<user_id>/memory/search', methods=['POST'])
def search_memory(user_id):
    try:
        if not SEMANTIC_MEMORY_AVAILABLE:
            return jsonify({"error": "Memory system not available"}), 500
            
        data = request.get_json()
        query = data.get('query', '')
        k = data.get('k', 5)
        
        if not query:
            return jsonify({"error": "Missing query parameter"}), 400
            
        results = semantic_memory.retrieve_relevant_snippets(user_id, query, k=k)
        
        return jsonify({
            "success": True,
            "results": results,
            "query": query,
            "count": len(results)
        })
        
    except Exception as e:
        print(f"Error searching memory: {e}")
        return jsonify({"error": "Failed to search memory"}), 500

# Main chat endpoint with AI intelligence
@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        print("=== RECEIVED /api/chat REQUEST ===")
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No JSON data received"}), 400
            
        # Extract required fields
        user_message = data.get('message')
        user_id = data.get('user_id', 'anonymous_user')
        conversation_history = data.get('conversation_history', [])
        
        if not user_message:
            return jsonify({"error": "Missing message field"}), 400
        
        print(f"Processing message: {user_message[:50]}...")
        
        # Use AI-powered intelligent system if available (PRIMARY)
        if INTELLIGENT_SYSTEM_AVAILABLE and intelligent_system:
            try:
                print("Using AI-powered intelligent system with Gemini brain")
                
                # Use the intelligent system that orchestrates all your systems
                result = intelligent_system.handle_request(user_id, user_message)
                
                print(f"Intelligent system result type: {result.get('type')}")
                
                # Transform result to API format
                api_response = {
                    "success": True,
                    "intelligent_system": True,
                    "response_type": result.get('type', 'unknown'),
                    "used_systems": result.get('used_systems', [])
                }
                
                if result.get('type') == 'workout':
                    api_response.update({
                        "response": result.get('message', 'Workout plan generated'),
                        "workout_plan": result.get('workout'),
                        "planning_notes": result.get('planning_notes', ''),
                        "confidence": result.get('confidence', 1.0),
                        "exercise_count": len(result.get('workout', {}).get('exercises', []))
                    })
                    
                elif result.get('type') == 'interview':
                    api_response.update({
                        "response": result.get('message', 'Let me ask you a question'),
                        "interview_mode": True,
                        "session_id": result.get('session_id'),
                        "question": result.get('question'),
                        "progress": result.get('progress', {})
                    })
                    
                elif result.get('type') == 'advice':
                    api_response.update({
                        "response": result.get('message', 'Here\'s some training advice'),
                        "advice_category": result.get('intent', 'general'),
                        "follow_up_suggestions": result.get('follow_up_suggestions', [])
                    })
                    
                elif result.get('type') == 'technique':
                    api_response.update({
                        "response": result.get('message', 'Here\'s technique information'),
                        "exercise": result.get('exercise'),
                        "technique": result.get('technique'),
                        "common_mistakes": result.get('common_mistakes', []),
                        "progressions": result.get('progressions', [])
                    })
                    
                elif result.get('type') == 'clarification':
                    api_response.update({
                        "response": result.get('message', 'Could you clarify your request?'),
                        "suggestions": result.get('suggestions', [])
                    })
                    
                else:
                    api_response.update({
                        "response": result.get('message', 'I processed your request'),
                        "suggestions": result.get('suggestions', [])
                    })
                
                return jsonify(api_response)
                
            except Exception as e:
                print(f"Intelligent system error: {e}")
                import traceback
                traceback.print_exc()
                # Fall through to legacy systems

        # Use enhanced focus integration if available (FALLBACK)
        if FOCUS_PLANNER_AVAILABLE and focus_integration:
            try:
                print("Using legacy focus integration system")
                
                # Get user profile from context or build basic one
                user_profile = {}
                if PROFILE_MANAGER_AVAILABLE and profile_manager:
                    user_profile = profile_manager.get_profile(user_id) or {}
                
                # Use the enhanced personal trainer system
                result = focus_integration.handle_workout_request(
                    user_id,
                    user_message,
                    user_profile
                )
                
                print(f"Legacy system result type: {result.get('response_type')}")
                
                # Transform result to API format
                api_response = {
                    "success": True,
                    "legacy_system": True,
                    "response_type": result.get('response_type', 'unknown')
                }
                
                if result.get('response_type') == 'workout_plan':
                    api_response.update({
                        "response": result.get('message', 'Workout plan generated'),
                        "workout_plan": result.get('workout'),
                        "planning_notes": result.get('planning_notes'),
                        "confidence": result.get('confidence', 1.0)
                    })
                elif result.get('response_type') == 'advice':
                    api_response.update({
                        "response": result.get('message', 'Here\'s some training advice'),
                        "advice_category": result.get('advice_category'),
                        "follow_up_suggestions": result.get('follow_up_suggestions', [])
                    })
                else:
                    api_response.update({
                        "response": result.get('message', 'I processed your request'),
                        "suggestions": result.get('suggestions', [])
                    })
                
                return jsonify(api_response)
                
            except Exception as e:
                print(f"Legacy system error: {e}")
                import traceback
                traceback.print_exc()
                # Fall through to simple fallback

        # Simple fallback when all systems fail
        fallback_response = get_simple_fallback_response(user_message)
        return jsonify({
            "success": True,
            "response": fallback_response,
            "fallback": True,
            "system_used": "simple_fallback"
        })
        
    except Exception as e:
        print(f"Chat endpoint error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

# Exercise Database Endpoints
@app.route('/api/exercises/validate', methods=['POST'])
def validate_exercises():
    try:
        if not CANONICAL_DATABASE_AVAILABLE:
            return jsonify({"error": "Exercise database not available"}), 500
        
        data = request.get_json()
        exercise_ids = data.get('exercise_ids', [])
        user_context = data.get('user_context', {})
        
        if not exercise_ids:
            return jsonify({"error": "No exercise IDs provided"}), 400
        
        validation_results = []
        for exercise_id in exercise_ids:
            is_valid = canonical_db.is_valid_exercise_id(exercise_id)
            exercise_info = canonical_db.get_exercise_by_id(exercise_id) if is_valid else None
            
            validation_results.append({
                "exercise_id": exercise_id,
                "is_valid": is_valid,
                "exercise_info": exercise_info
            })
        
        return jsonify({
            "success": True,
            "validation_results": validation_results,
            "total_checked": len(exercise_ids)
        })
        
    except Exception as e:
        print(f"Error validating exercises: {e}")
        return jsonify({"error": "Failed to validate exercises"}), 500

# Start the Flask application
if __name__ == "__main__":
    print("Starting HLTHY Coach Flask server...")
    print(f"Server configuration:")
    print(f"  Port: 5001")
    print(f"  Debug: True")
    print(f"  Profile Manager: {'✅ Available' if PROFILE_MANAGER_AVAILABLE else '❌ Not Available'}")
    print(f"  Memory System: {'✅ Available' if SEMANTIC_MEMORY_AVAILABLE else '❌ Not Available'}")
    print(f"  Intelligent System: {'✅ Available' if INTELLIGENT_SYSTEM_AVAILABLE else '❌ Not Available'}")
    
    debug = os.environ.get("FLASK_ENV") != "production"
    app.run(host="0.0.0.0", port=5001, debug=debug)
