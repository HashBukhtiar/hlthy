#!/usr/bin/env python3
"""
Test Focus Planner integration with mock database
"""
print("🎯 Testing Focus Planner Integration")
print("=" * 50)

# Test 1: Integration Components
try:
    from mock_database import MockExerciseDatabase, MockUserProfileManager
    from focus_integration import FocusIntegration
    
    print("✅ Mock database and integration imported successfully")
    
    # Initialize components
    exercise_db = MockExerciseDatabase()
    user_profiles = MockUserProfileManager()
    integration = FocusIntegration(exercise_db, user_profiles)
    
    print("✅ Focus Planner integration initialized")
    
except Exception as e:
    print(f"❌ Integration initialization failed: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print()

# Test 2: Workout Intent Detection
try:
    test_messages = [
        "I need a chest workout",
        "Give me back and biceps routine", 
        "My shoulder hurts during bench press",
        "Hello, how are you?",
        "Create a full body workout"
    ]
    
    print("🎯 Testing Workout Intent Detection:")
    for message in test_messages:
        result = integration.enhance_workout_request(
            user_message=message,
            user_id="test_user"
        )
        
        intent = result['workout_intent']
        is_workout = intent['is_workout_request']
        confidence = intent['confidence']
        enhanced = result.get('enhanced', False)
        
        status = "🟢 WORKOUT" if is_workout else "🟡 OTHER"
        enhancement = "✨ ENHANCED" if enhanced else "⭐ BASIC"
        
        print(f"   {status} {enhancement} | '{message}' (conf: {confidence:.2f})")
    
except Exception as e:
    print(f"❌ Intent detection failed: {e}")
    import traceback
    traceback.print_exc()

print()

# Test 3: Focus Processing Pipeline
try:
    print("🎯 Testing Focus Processing Pipeline:")
    
    workout_requests = [
        ("I need a chest workout", "chest"),
        ("Give me a full body routine", "full_body"),
        ("I want back and biceps", "back+biceps")
    ]
    
    for message, expected_focus in workout_requests:
        result = integration.enhance_workout_request(
            user_message=message,
            user_id="test_user"
        )
        
        if result.get('enhanced'):
            focus = result['focus_result']['focus']
            whitelist_count = len(result['focus_result']['whitelist_result']['allowed_exercises'])
            print(f"   ✅ '{message}' -> {focus} ({whitelist_count} exercises)")
        else:
            print(f"   ⚠️  '{message}' -> Not enhanced ({result.get('suggestion', 'No reason')})")

except Exception as e:
    print(f"❌ Focus processing failed: {e}")
    import traceback
    traceback.print_exc()

print()
print("🎯 Focus Planner Integration Test Completed!")
print("=" * 50)
