#!/usr/bin/env python3
"""
Debug Focus Processing Result Structure
"""
from focus_router import FocusPlanner
from exercise_database import ExerciseDatabase
from user_profiles import UserProfileManager

print("🔍 Debug Focus Processing Result Structure")
print("=" * 45)

try:
    exercise_db = ExerciseDatabase()
    user_profiles = UserProfileManager()
    focus_planner = FocusPlanner(exercise_db, user_profiles)
    
    result = focus_planner.process_focus_request(
        focus='chest',
        user_id="test_user",
        context={'equipment': ['dumbbells', 'barbell']},
        ruleset='intermediate'
    )
    
    print("📊 Result keys:", list(result.keys()))
    print("📊 Whitelist result type:", type(result.get('whitelist_result')))
    print("📊 Whitelist result keys:", list(result.get('whitelist_result', {}).keys()) if isinstance(result.get('whitelist_result'), dict) else "Not a dict")
    print("📊 Slot template type:", type(result.get('slot_template')))
    print("📊 Slot template keys:", list(result.get('slot_template', {}).keys()) if isinstance(result.get('slot_template'), dict) else "Not a dict")
    
    if result.get('slot_template'):
        print("📊 Slot template content:", result['slot_template'])
    
except Exception as e:
    import traceback
    print(f"❌ Error: {e}")
    traceback.print_exc()
