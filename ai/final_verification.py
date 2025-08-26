#!/usr/bin/env python3
"""
FINAL PRODUCTION VERIFICATION TEST
Complete end-to-end test of all Focus Planner functionality
"""
import json
import time
from datetime import datetime

print("🚀 FINAL PRODUCTION VERIFICATION TEST")
print("=" * 50)
print(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print()

# Test results tracking
test_results = {
    "total_tests": 0,
    "passed": 0,
    "failed": 0,
    "errors": []
}

def run_test(test_name, test_func):
    """Run a test and track results"""
    test_results["total_tests"] += 1
    try:
        print(f"🧪 {test_name}...")
        result = test_func()
        if result:
            print(f"   ✅ PASSED")
            test_results["passed"] += 1
        else:
            print(f"   ❌ FAILED")
            test_results["failed"] += 1
            test_results["errors"].append(f"{test_name}: Test function returned False")
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        test_results["failed"] += 1
        test_results["errors"].append(f"{test_name}: {str(e)}")

# TEST 1: Module Imports
def test_imports():
    """Test all Focus Planner modules can be imported"""
    from focus_rules import normalize_focus, parse_combo
    from focus_whitelist import build_focus_whitelist
    from focus_composer import get_slot_template_for_focus
    from focus_rubrics import get_rubric_for_focus
    from focus_validator import FocusValidator
    from focus_rulesets import FocusRuleset
    from focus_router import FocusPlanner
    from focus_integration import FocusIntegration
    from exercise_database import ExerciseDatabase
    return True

run_test("Module Imports", test_imports)

# TEST 2: Exercise Database Integration
def test_exercise_database():
    """Test exercise database functionality"""
    from exercise_database import ExerciseDatabase, get_exercise_data, CANONICAL_EXERCISES
    
    db = ExerciseDatabase()
    
    # Check database size
    exercises = db.get_all_exercises()
    if len(exercises) != len(CANONICAL_EXERCISES):
        return False
    
    # Test exercise data retrieval
    first_exercise_id = list(CANONICAL_EXERCISES.keys())[0]
    exercise_data = get_exercise_data(first_exercise_id)
    
    if not exercise_data or 'name' not in exercise_data:
        return False
        
    return True

run_test("Exercise Database Integration", test_exercise_database)

# TEST 3: Focus Rules and Normalization
def test_focus_rules():
    """Test focus rules and normalization"""
    from focus_rules import normalize_focus, parse_combo, BASE_FOCI
    
    # Test normalization
    if normalize_focus("CHEST") != "chest":
        return False
    
    if normalize_focus("Upper Body") != "upper":
        return False
    
    # Test combo parsing
    combo = parse_combo("back+biceps")
    if not combo or combo[0] != "back" or combo[1] != "biceps":
        return False
    
    # Check BASE_FOCI structure
    if not isinstance(BASE_FOCI, list) or len(BASE_FOCI) < 15:
        return False
        
    return True

run_test("Focus Rules and Normalization", test_focus_rules)

# TEST 4: Focus Whitelist Generation
def test_whitelist_generation():
    """Test focus whitelist generation"""
    from focus_whitelist import build_focus_whitelist
    
    user_context = {
        "user_id": "test_user",
        "experience_level": "intermediate"
    }
    
    # Test single focus
    chest_exercises = build_focus_whitelist(user_context, "chest")
    if not chest_exercises or len(chest_exercises) == 0:
        return False
    
    # Test combo focus
    back_biceps_exercises = build_focus_whitelist(user_context, "back+biceps")
    if not back_biceps_exercises or len(back_biceps_exercises) == 0:
        return False
    
    return True

run_test("Focus Whitelist Generation", test_whitelist_generation)

# TEST 5: Slot Template Generation
def test_slot_templates():
    """Test slot template generation"""
    from focus_composer import get_slot_template_for_focus
    
    # Test chest template
    chest_slots = get_slot_template_for_focus("chest")
    if not chest_slots or not isinstance(chest_slots, list):
        return False
    
    # Check slot structure
    if len(chest_slots) == 0:
        return False
        
    first_slot = chest_slots[0]
    if 'slot' not in first_slot or 'pattern' not in first_slot:
        return False
    
    return True

run_test("Slot Template Generation", test_slot_templates)

# TEST 6: Focus Planner Integration
def test_focus_planner():
    """Test complete Focus Planner integration"""
    from focus_router import FocusPlanner
    from exercise_database import ExerciseDatabase
    from user_profiles import UserProfileManager
    
    exercise_db = ExerciseDatabase()
    user_profiles = UserProfileManager()
    focus_planner = FocusPlanner(exercise_db, user_profiles)
    
    # Test focus processing
    result = focus_planner.process_focus_request(
        focus="chest",
        user_id="test_user",
        context={"equipment": ["dumbbells"]},
        ruleset="intermediate"
    )
    
    # Validate result structure
    if not result or 'focus' not in result:
        return False
    
    if 'whitelist_result' not in result or 'allowed_exercises' not in result['whitelist_result']:
        return False
    
    if len(result['whitelist_result']['allowed_exercises']) == 0:
        return False
    
    return True

run_test("Focus Planner Integration", test_focus_planner)

# TEST 7: AI Integration Layer
def test_ai_integration():
    """Test AI integration layer"""
    from focus_integration import FocusIntegration
    from exercise_database import ExerciseDatabase
    from user_profiles import UserProfileManager
    
    exercise_db = ExerciseDatabase()
    user_profiles = UserProfileManager()
    focus_integration = FocusIntegration(exercise_db, user_profiles)
    
    # Test intent detection
    result = focus_integration.enhance_workout_request(
        user_message="I need a chest workout",
        user_id="test_user"
    )
    
    # Should detect workout intent
    if not result.get('workout_intent', {}).get('is_workout_request'):
        return False
    
    # Should enhance the request
    if not result.get('enhanced'):
        return False
    
    # Should have focus result
    if 'focus_result' not in result:
        return False
    
    return True

run_test("AI Integration Layer", test_ai_integration)

# TEST 8: Performance Test
def test_performance():
    """Test system performance"""
    from focus_integration import FocusIntegration
    from exercise_database import ExerciseDatabase
    from user_profiles import UserProfileManager
    
    exercise_db = ExerciseDatabase()
    user_profiles = UserProfileManager()
    focus_integration = FocusIntegration(exercise_db, user_profiles)
    
    # Measure processing time
    start_time = time.time()
    
    result = focus_integration.enhance_workout_request(
        user_message="Give me a back and biceps workout",
        user_id="test_user"
    )
    
    processing_time = time.time() - start_time
    
    # Should process within reasonable time (< 2 seconds)
    if processing_time > 2.0:
        print(f"   ⚠️  Processing took {processing_time:.2f}s (expected < 2.0s)")
        return False
    
    print(f"   ⏱️  Processing time: {processing_time:.3f}s")
    return True

run_test("Performance Test", test_performance)

# Print final results
print("\n" + "="*50)
print("📊 FINAL TEST RESULTS")
print("="*50)

success_rate = (test_results["passed"] / test_results["total_tests"]) * 100 if test_results["total_tests"] > 0 else 0

print(f"Total Tests: {test_results['total_tests']}")
print(f"Passed: {test_results['passed']}")
print(f"Failed: {test_results['failed']}")
print(f"Success Rate: {success_rate:.1f}%")

if test_results["failed"] > 0:
    print(f"\n❌ ERRORS ENCOUNTERED:")
    for error in test_results["errors"]:
        print(f"   • {error}")

print(f"\n{'🎉 PRODUCTION READY!' if success_rate == 100 else '⚠️  NEEDS ATTENTION'}")

if success_rate == 100:
    print("✅ All tests passed - Focus Planner system is ready for production deployment")
else:
    print("❌ Some tests failed - Review errors before production deployment")

print(f"\nFocus Planner System Status: {'OPERATIONAL' if success_rate >= 90 else 'NEEDS FIXES'}")
