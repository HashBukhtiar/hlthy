#!/usr/bin/env python3
"""
Debug Focus Detection
"""
from focus_integration import FocusIntegration
from exercise_database import ExerciseDatabase
from user_profiles import UserProfileManager

print("🔍 Debug Focus Detection")
print("=" * 30)

try:
    exercise_db = ExerciseDatabase()
    user_profiles = UserProfileManager()
    focus_integration = FocusIntegration(exercise_db, user_profiles)
    
    test_messages = [
        "I need a chest workout",
        "Give me back and biceps routine", 
        "Create a full body workout"
    ]
    
    for message in test_messages:
        print(f"\n📝 Testing: '{message}'")
        
        # Test focus extraction directly
        detected_focus = focus_integration._extract_focus_from_message(message)
        print(f"   🎯 Detected focus: {detected_focus}")
        
        # Test workout intent detection
        intent = focus_integration._detect_workout_intent(message)
        print(f"   💡 Workout intent: {intent['is_workout_request']} (conf: {intent['confidence']:.2f})")
        
        # Test focus processing directly
        try:
            if detected_focus:
                import traceback
                focus_result = focus_integration.focus_planner.process_focus_request(
                    focus=detected_focus,
                    user_id="test_user",
                    context={'equipment': ['dumbbells']},
                    ruleset='beginner'
                )
                print(f"   ⚙️  Focus processing: SUCCESS - {len(focus_result['whitelist_result']['allowed_exercises'])} exercises")
            else:
                print(f"   ⚙️  Focus processing: SKIPPED - no focus detected")
        except Exception as e:
            print(f"   ⚙️  Focus processing: FAILED - {e}")
            import traceback
            traceback.print_exc()
        
        # Test full enhancement
        try:
            result = focus_integration.enhance_workout_request(
                user_message=message,
                user_id="test_user"
            )
            
            print(f"   🚀 Enhanced: {result.get('enhanced', False)}")
            if result.get('enhanced'):
                print(f"   📊 Focus result: {result['focus_result']['focus']}")
            else:
                print(f"   ⚠️  Reason: {result.get('suggestion', 'Unknown')}")
        except Exception as e:
            print(f"   🚀 Enhancement FAILED: {e}")

except Exception as e:
    import traceback
    print(f"❌ Error: {e}")
    traceback.print_exc()
