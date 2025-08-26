"""
Test script for Focus Planner Integration
"""
import sys
import os

# Add the ai directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from focus_integration import FocusIntegration
    from exercise_database import ExerciseDatabase
    from user_profiles import UserProfileManager
    
    print("✅ All Focus Planner imports successful!")
    
    # Test initialization
    exercise_db = ExerciseDatabase()
    user_profiles = UserProfileManager()
    focus_integration = FocusIntegration(exercise_db, user_profiles)
    
    print("✅ Focus Planner initialization successful!")
    
    # Test workout intent detection
    test_messages = [
        "I need a chest workout",
        "Give me back and biceps routine",
        "Create a full body workout", 
        "My shoulder hurts during bench press",
        "Hello, how are you?",
        "What is progressive overload?"
    ]
    
    print("\n🧪 Testing workout intent detection:")
    for msg in test_messages:
        result = focus_integration.enhance_workout_request(
            user_message=msg,
            user_id="test_user"
        )
        
        intent = result['workout_intent']
        enhanced = result.get('enhanced', False)
        
        print(f"Message: '{msg}'")
        print(f"  - Workout Intent: {intent['is_workout_request']} (confidence: {intent['confidence']:.2f})")
        print(f"  - Focus Enhanced: {enhanced}")
        if enhanced:
            print(f"  - Detected Focus: {result['focus_result']['focus']}")
        print()
    
    # Test focus enhancement with a clear workout request
    print("🎯 Testing focus enhancement with 'chest workout':")
    result = focus_integration.enhance_workout_request(
        user_message="I need a chest workout with dumbbells",
        user_id="test_user"
    )
    
    if result.get('enhanced'):
        focus_result = result['focus_result']
        print(f"✅ Focus: {focus_result['focus']}")
        print(f"✅ Allowed Exercises: {len(focus_result['whitelist_result']['allowed_exercises'])} exercises")
        print(f"✅ Enhanced Prompt Length: {len(result['enhanced_prompt'])} characters")
    else:
        print(f"⚠️  Enhancement failed: {result.get('suggestion', 'Unknown reason')}")
    
    print("\n🎉 Focus Planner integration test completed!")
    
except ImportError as e:
    print(f"❌ Import failed: {e}")
except Exception as e:
    print(f"❌ Test failed: {e}")
    import traceback
    traceback.print_exc()
