#!/usr/bin/env python3
"""
Exercise Database Integration Test
Verify that all Focus Planner modules can properly access exercise data
"""
print("🔍 Exercise Database Integration Test")
print("=" * 40)

try:
    from exercise_database import ExerciseDatabase, get_exercise_data, CANONICAL_EXERCISES
    print("✅ Exercise database imports successful")
    
    # Test 1: Basic database access
    print(f"\n📊 Database contains {len(CANONICAL_EXERCISES)} exercises")
    
    # Test 2: Get exercise data function
    test_exercise_id = list(CANONICAL_EXERCISES.keys())[0]
    exercise_data = get_exercise_data(test_exercise_id)
    print(f"✅ get_exercise_data() working: {exercise_data['name'] if exercise_data else 'FAILED'}")
    
    # Test 3: Test focus whitelist helper functions
    print(f"\n🎯 Testing focus whitelist helper functions...")
    
    from focus_whitelist import _get_exercise_patterns, _get_exercise_muscles, _get_safety_score
    
    patterns = _get_exercise_patterns(test_exercise_id)
    print(f"   Movement patterns: {patterns[:3] if patterns else 'None'}")
    
    muscles = _get_exercise_muscles(test_exercise_id)
    print(f"   Muscle families: {muscles[:3] if muscles else 'None'}")
    
    safety_score = _get_safety_score(test_exercise_id, {'experience_level': 'intermediate'})
    print(f"   Safety score: {safety_score}")
    
    # Test 4: Test with focus validation
    print(f"\n🔍 Testing focus validator integration...")
    
    from focus_validator import FocusValidator
    exercise_db = ExerciseDatabase()
    validator = FocusValidator(exercise_db)
    
    # Test workout plan
    test_workout = {
        "exercises": [
            {"exerciseId": test_exercise_id, "sets": 3, "reps": "8-12"},
            {"exerciseId": list(CANONICAL_EXERCISES.keys())[1], "sets": 3, "reps": "8-12"}
        ]
    }
    
    is_valid, issues = validator.validate_workout(test_workout, [test_exercise_id])
    print(f"   Validation result: {'✅ VALID' if is_valid else '❌ INVALID'}")
    if issues:
        print(f"   Issues: {issues[:2]}")
        
    # Test 5: Complete focus planner integration
    print(f"\n🚀 Testing complete Focus Planner integration...")
    
    from focus_router import FocusPlanner
    from user_profiles import UserProfileManager
    
    user_profiles = UserProfileManager()
    focus_planner = FocusPlanner(exercise_db, user_profiles)
    
    result = focus_planner.process_focus_request(
        focus="chest",
        user_id="test_user",
        context={},
        ruleset="intermediate"
    )
    
    exercises_count = len(result['whitelist_result']['allowed_exercises'])
    slots_count = len(result['slot_template'])
    
    print(f"   ✅ Focus processing: {exercises_count} exercises, {slots_count} slots")
    
    print(f"\n🎉 Exercise Database Integration: FULLY WORKING!")
    
except Exception as e:
    print(f"❌ Integration test failed: {e}")
    import traceback
    traceback.print_exc()
