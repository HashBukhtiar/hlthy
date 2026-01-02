#!/usr/bin/env python3
"""Simple test runner to identify failures without Unicode issues"""

import sys
import os

def run_focused_tests():
    """Run specific tests to identify failures"""
    
    results = {}
    
    print("FOCUSED TEST ANALYSIS")
    print("=" * 50)
    
    # Test 1: Exercise Database
    try:
        from core.exercise_database import ExerciseDatabase
        db = ExerciseDatabase()
        
        # Sub-test 1a: Count
        count = db.get_exercise_count()
        if count == 108:
            results["db_count"] = "PASS"
        else:
            results["db_count"] = f"FAIL - got {count}, expected 108"
            
        # Sub-test 1b: get_exercise method
        exercise = db.get_exercise("barbell_bench_press")
        if exercise and exercise.get('id') == 'barbell_bench_press':
            results["db_get_exercise"] = "PASS"
        else:
            results["db_get_exercise"] = "FAIL - exercise not found or invalid"
            
    except Exception as e:
        results["db_error"] = f"FAIL - {str(e)}"
    
    # Test 2: Flask Endpoints  
    try:
        from tests.vertex_testing import app
        
        with app.test_client() as client:
            # Test canonical exercises endpoint
            response = client.get('/api/exercises/canonical')
            if response.status_code == 200:
                data = response.get_json()
                if isinstance(data, dict) and 'exercises' in data and len(data['exercises']) > 0:
                    results["flask_canonical"] = "PASS"
                else:
                    results["flask_canonical"] = "FAIL - missing exercises key or empty"
            else:
                results["flask_canonical"] = f"FAIL - status {response.status_code}"
                
            # Test exercise validation endpoint
            test_data = {'exercise_ids': ['barbell_bench_press', 'invalid_exercise']}
            response = client.post('/api/exercises/validate', json=test_data)
            if response.status_code == 200:
                data = response.get_json()
                if data and 'validation_results' in data:
                    results["flask_validation"] = "PASS"
                else:
                    results["flask_validation"] = "FAIL - missing validation_results"
            else:
                results["flask_validation"] = f"FAIL - status {response.status_code}"
                
    except Exception as e:
        results["flask_error"] = f"FAIL - {str(e)}"
    
    # Test 3: Focus Integration
    try:
        from tests.vertex_testing import focus_integration
        
        if hasattr(focus_integration, 'handle_workout_request'):
            results["focus_methods"] = "PASS"
        else:
            results["focus_methods"] = "FAIL - missing handle_workout_request"
            
    except Exception as e:
        results["focus_error"] = f"FAIL - {str(e)}"
    
    # Print results
    print("\nTEST RESULTS:")
    print("-" * 30)
    
    passed = 0
    total = 0
    
    for test_name, result in results.items():
        total += 1
        if "PASS" in result:
            passed += 1
            print(f"{test_name}: {result}")
        else:
            print(f"{test_name}: {result}")
    
    print(f"\nSUMMARY: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
    
    return results

if __name__ == "__main__":
    run_focused_tests()
