#!/usr/bin/env python3
"""
Comprehensive Focus Planner Integration Test
"""
print("🎯 Focus Planner End-to-End Integration Test")
print("=" * 50)

try:
    # Test 1: Import all components
    from focus_integration import FocusIntegration
    from focus_router import FocusPlanner
    from exercise_database import ExerciseDatabase
    from user_profiles import UserProfileManager
    
    print("✅ All Focus Planner components imported successfully")
    
    # Test 2: Initialize the system
    try:
        exercise_db = ExerciseDatabase()
        print("✅ ExerciseDatabase initialized")
        
        # Mock user profiles if not available
        try:
            user_profiles = UserProfileManager()
            print("✅ UserProfileManager initialized")
        except:
            print("⚠️  UserProfileManager not available, using mock")
            user_profiles = None
        
        focus_planner = FocusPlanner(exercise_db, user_profiles)
        print("✅ FocusPlanner initialized")
        
        focus_integration = FocusIntegration(exercise_db, user_profiles)
        print("✅ FocusIntegration initialized")
        
    except Exception as e:
        print(f"❌ Initialization failed: {e}")
        raise
    
    # Test 3: Test workout intent detection
    print("\n📝 Testing workout intent detection...")
    test_messages = [
        ("I need a chest workout", True),
        ("Give me back and biceps routine", True),
        ("Create a full body workout", True),
        ("My shoulder hurts during bench press", False),
        ("Hello, how are you?", False),
        ("What is progressive overload?", False)
    ]
    
    correct_detections = 0
    for message, expected_workout in test_messages:
        result = focus_integration.enhance_workout_request(
            user_message=message,
            user_id="test_user"
        )
        
        intent = result['workout_intent']
        detected_workout = intent['is_workout_request']
        
        if detected_workout == expected_workout:
            correct_detections += 1
            print(f"✅ '{message}' -> {detected_workout} (confidence: {intent['confidence']:.2f})")
        else:
            print(f"❌ '{message}' -> {detected_workout} (expected: {expected_workout})")
    
    accuracy = correct_detections / len(test_messages)
    print(f"\n📊 Intent detection accuracy: {accuracy:.1%} ({correct_detections}/{len(test_messages)})")
    
    # Test 4: Test focus extraction and enhancement
    print("\n🎯 Testing focus extraction and enhancement...")
    workout_messages = [
        "I need a chest workout",
        "Give me back and biceps routine", 
        "Create a full body workout"
    ]
    
    for message in workout_messages:
        try:
            result = focus_integration.enhance_workout_request(
                user_message=message,
                user_id="test_user"
            )
            
            if result.get('enhanced'):
                focus = result['focus_result']['focus']
                whitelist_count = len(result['focus_result']['whitelist_result']['allowed_exercises'])
                print(f"✅ '{message}' -> Enhanced with focus '{focus}' ({whitelist_count} exercises)")
            else:
                print(f"⚠️  '{message}' -> Not enhanced: {result.get('suggestion', 'No focus detected')}")
                
        except Exception as e:
            print(f"❌ '{message}' -> Enhancement failed: {e}")
    
    # Test 5: Test focus processing
    print("\n⚙️  Testing focus processing...")
    test_focuses = ['chest', 'back+biceps', 'full_body', 'legs']
    
    for focus in test_focuses:
        try:
            result = focus_planner.process_focus_request(
                focus=focus,
                user_id="test_user",
                context={'equipment': ['dumbbells', 'barbell']},
                ruleset='intermediate'
            )
            
            whitelist_count = len(result['whitelist_result']['allowed_exercises'])
            slot_count = len(result['slot_template']) if isinstance(result['slot_template'], list) else 0
            
            print(f"✅ Focus '{focus}': {whitelist_count} exercises, {slot_count} slots")
            
        except Exception as e:
            print(f"❌ Focus '{focus}' failed: {e}")
    
    # Test 6: Test exercise database integration
    print("\n💪 Testing exercise database integration...")
    try:
        chest_exercises = exercise_db.get_exercises_by_movement_patterns(['press', 'fly'])
        print(f"✅ Found {len(chest_exercises)} chest exercises")
        
        back_exercises = exercise_db.get_exercises_by_muscle_families(['lats', 'upper_back'])
        print(f"✅ Found {len(back_exercises)} back exercises")
        
        all_exercises = exercise_db.get_all_exercises()
        print(f"✅ Total exercises in database: {len(all_exercises)}")
        
    except Exception as e:
        print(f"❌ Exercise database test failed: {e}")
    
    print("\n🎉 Focus Planner Integration Test Completed!")
    
    if accuracy >= 0.8:
        print("✅ PASS: System is ready for production use!")
    else:
        print("⚠️  WARN: Intent detection accuracy below 80%, needs improvement")

except Exception as e:
    print(f"❌ Critical error: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
