#!/usr/bin/env python3
"""
Debug Exercise Database Integration
"""
from exercise_database import get_exercises_by_filters, ExerciseDatabase

print("🔍 Debug Exercise Database Integration")
print("=" * 40)

# Test 1: Direct ExerciseDatabase
print("📚 Testing ExerciseDatabase directly:")
exercise_db = ExerciseDatabase()
all_exercises = exercise_db.get_all_exercises()
print(f"   Total exercises: {len(all_exercises)}")

# Test 2: Test get_exercises_by_filters function directly
print("\n🔍 Testing get_exercises_by_filters function:")
try:
    test_filters = {
        "user_id": "test_user",
        "experience_level": "intermediate", 
        "available_equipment": ["dumbbells", "barbell"]
    }
    filtered_exercises = get_exercises_by_filters(test_filters)
    print(f"   With filters: {len(filtered_exercises)} exercises")
    if len(filtered_exercises) > 0:
        print(f"   Examples: {filtered_exercises[:3]}")
except Exception as e:
    print(f"   Error: {e}")
    import traceback
    traceback.print_exc()

# Test 3: Test with minimal filters
print("\n🔍 Testing with minimal filters:")
try:
    minimal_filters = {}
    filtered_exercises = get_exercises_by_filters(minimal_filters)
    print(f"   With no filters: {len(filtered_exercises)} exercises")
    if len(filtered_exercises) > 0:
        print(f"   Examples: {filtered_exercises[:3]}")
except Exception as e:
    print(f"   Error: {e}")
    import traceback
    traceback.print_exc()

# Test 4: Test if the function exists in exercise_database
print("\n🔍 Checking what functions are available in exercise_database:")
import exercise_database
functions = [attr for attr in dir(exercise_database) if not attr.startswith('_') and callable(getattr(exercise_database, attr))]
print(f"   Available functions: {functions}")
