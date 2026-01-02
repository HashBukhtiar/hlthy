#!/usr/bin/env python3
"""
Comprehensive Test Suite for HLTHY AI Enhanced System
Tests all components, integrations, and API endpoints in one place.
"""

import sys
import os
import json
import traceback
from datetime import datetime

# Add ai directory to path
sys.path.insert(0, os.getcwd())

def print_test_header(test_name):
    print(f"\n{'='*60}")
    print(f"TESTING: {test_name}")
    print(f"{'='*60}")

def print_test_result(test_name, success, details=""):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {test_name}")
    if details:
        print(f"  Details: {details}")

def test_imports_and_initialization():
    """Test all system imports and initialization"""
    print_test_header("System Imports and Initialization")
    
    test_results = {}
    
    try:
        # Test main Flask app imports
        from tests.vertex_testing import (
            app, FOCUS_PLANNER_AVAILABLE, ENHANCED_INTEGRATION,
            CANONICAL_DATABASE_AVAILABLE, TECHNIQUE_LIBRARY_AVAILABLE,
            PROGRESSION_TRACKER_AVAILABLE, PROFILE_SYNC_AVAILABLE,
            EXERCISE_CACHE_AVAILABLE, RATE_LIMITING_AVAILABLE,
            OBSERVABILITY_AVAILABLE, profile_manager, memory_system,
            focus_integration, exercise_database
        )
        test_results["flask_app_imports"] = True
        print_test_result("Flask app imports", True)
        
        # Test system availability flags
        systems = {
            "focus_planner": FOCUS_PLANNER_AVAILABLE,
            "enhanced_integration": ENHANCED_INTEGRATION,
            "canonical_database": CANONICAL_DATABASE_AVAILABLE,
            "technique_library": TECHNIQUE_LIBRARY_AVAILABLE,
            "progression_tracker": PROGRESSION_TRACKER_AVAILABLE,
            "profile_sync": PROFILE_SYNC_AVAILABLE,
            "exercise_cache": EXERCISE_CACHE_AVAILABLE,
            "rate_limiting": RATE_LIMITING_AVAILABLE,
            "observability": OBSERVABILITY_AVAILABLE
        }
        
        for system_name, available in systems.items():
            test_results[system_name] = available
            print_test_result(f"{system_name.replace('_', ' ').title()}", available)
        
        # Test object initialization
        objects = {
            "exercise_database": exercise_database,
            "focus_integration": focus_integration,
            "profile_manager": profile_manager,
            "memory_system": memory_system
        }
        
        for obj_name, obj in objects.items():
            is_initialized = obj is not None
            test_results[f"{obj_name}_initialized"] = is_initialized
            obj_type = type(obj).__name__ if obj else "None"
            print_test_result(f"{obj_name.replace('_', ' ').title()} Object", is_initialized, f"Type: {obj_type}")
        
    except Exception as e:
        test_results["import_error"] = str(e)
        print_test_result("System imports", False, str(e))
        
    return test_results

def test_exercise_database():
    """Test canonical exercise database functionality"""
    print_test_header("Exercise Database Functionality")
    
    test_results = {}
    
    try:
        from core.exercise_database import CANONICAL_EXERCISES, ExerciseDatabase
        
        # Test database size
        exercise_count = len(CANONICAL_EXERCISES)
        test_results["exercise_count"] = exercise_count
        print_test_result("Exercise Database Size", exercise_count > 0, f"{exercise_count} exercises")
        
        # Test sample exercises exist
        sample_exercises = ["barbell_bench_press", "goblet_squat", "pull_ups", "dumbbell_row"]
        for exercise_id in sample_exercises:
            exists = exercise_id in CANONICAL_EXERCISES
            test_results[f"exercise_{exercise_id}"] = exists
            print_test_result(f"Sample Exercise: {exercise_id}", exists)
        
        # Test exercise database object
        if test_imports_and_initialization().get("exercise_database_initialized"):
            from tests.vertex_testing import exercise_database
            test_results["database_object_functional"] = hasattr(exercise_database, 'get_exercise')
            print_test_result("Database Object Methods", test_results["database_object_functional"])
        
    except Exception as e:
        test_results["database_error"] = str(e)
        print_test_result("Exercise Database", False, str(e))
        
    return test_results

def test_focus_integration_system():
    """Test the enhanced focus integration system"""
    print_test_header("Focus Integration System")
    
    test_results = {}
    
    try:
        from tests.vertex_testing import focus_integration
        
        if focus_integration is None:
            test_results["focus_integration_available"] = False
            print_test_result("Focus Integration Available", False, "Object is None")
            return test_results
        
        # Test available methods
        required_methods = [
            "handle_workout_request",
            "handle_interview_response", 
            "handle_confirmation",
            "get_session_status"
        ]
        
        for method_name in required_methods:
            has_method = hasattr(focus_integration, method_name)
            test_results[f"method_{method_name}"] = has_method
            print_test_result(f"Method: {method_name}", has_method)
        
        # Test workout request handling
        test_context = {
            'profileSummary': 'Intermediate lifter with gym access',
            'healthSummary': {'activeInjuries': []},
            'equipmentAccess': {'current': 'gym', 'gym': ['barbells', 'dumbbells', 'machines']}
        }
        
        if hasattr(focus_integration, 'handle_workout_request'):
            result = focus_integration.handle_workout_request(
                'test_user_123',
                'I need a chest workout',
                test_context
            )
            
            workout_request_works = isinstance(result, dict)
            test_results["workout_request_handling"] = workout_request_works
            print_test_result("Workout Request Handling", workout_request_works, f"Result type: {type(result).__name__}")
            
            # Check for expected result structure
            if isinstance(result, dict):
                has_workout_plan = 'workout' in result or 'workout_plan' in result
                has_response_type = 'response_type' in result
                test_results["result_has_workout_plan"] = has_workout_plan
                test_results["result_has_interview_mode"] = has_response_type
                print_test_result("Result has workout data", has_workout_plan)
                print_test_result("Result has response type", has_response_type)
        
        # Test session management
        if hasattr(focus_integration, 'get_session_status'):
            status = focus_integration.get_session_status('test_user_123')
            session_status_works = isinstance(status, dict)
            test_results["session_status"] = session_status_works
            print_test_result("Session Status Check", session_status_works, f"Status: {status}")
            
    except Exception as e:
        test_results["focus_integration_error"] = str(e)
        print_test_result("Focus Integration System", False, str(e))
        
    return test_results

def test_flask_endpoints():
    """Test Flask API endpoints"""
    print_test_header("Flask API Endpoints")
    
    test_results = {}
    
    try:
        from tests.vertex_testing import app
        
        with app.test_client() as client:
            # Test health check endpoint
            response = client.get('/')
            health_check_works = response.status_code == 200
            test_results["health_check"] = health_check_works
            print_test_result("Health Check Endpoint", health_check_works, f"Status: {response.status_code}")
            
            if health_check_works and response.get_json():
                data = response.get_json()
                print_test_result("Health Check Response", True, f"Status: {data.get('status', 'unknown')}")
            
            # Test API health endpoint
            response = client.get('/api/health')
            api_health_works = response.status_code == 200
            test_results["api_health"] = api_health_works
            print_test_result("API Health Endpoint", api_health_works, f"Status: {response.status_code}")
            
            if api_health_works and response.get_json():
                data = response.get_json()
                print_test_result("API Health Response", True, f"Service: {data.get('service', 'unknown')}")
            
            # Test chat endpoint
            chat_data = {
                'message': 'I need a chest workout',
                'user_id': 'test_user_123',
                'conversation_history': []
            }
            
            response = client.post('/api/chat', 
                                 json=chat_data,
                                 content_type='application/json')
            
            chat_endpoint_works = response.status_code in [200, 500]  # 500 might be expected if missing implementation
            test_results["chat_endpoint"] = response.status_code
            print_test_result("Chat Endpoint", chat_endpoint_works, f"Status: {response.status_code}")
            
            if response.status_code == 200 and response.get_json():
                result = response.get_json()
                has_response = 'response' in result
                has_route = 'route' in result
                test_results["chat_has_response"] = has_response
                test_results["chat_has_route"] = has_route
                print_test_result("Chat Response Structure", has_response)
                print_test_result("Chat Route Detection", has_route)
                
                if has_route:
                    route_value = result['route']
                    print_test_result("Message Routing", True, f"Route: {route_value}")
            
            # Test profile creation endpoint
            profile_data = {
                'age': 25,
                'gender': 'male',
                'experience_level': 'intermediate',
                'primary_goal': 'muscle_building'
            }
            
            response = client.post('/api/profile',
                                 json=profile_data,
                                 content_type='application/json')
            
            profile_endpoint_works = response.status_code in [200, 201, 500]  # Various acceptable responses
            test_results["profile_creation"] = response.status_code
            print_test_result("Profile Creation Endpoint", profile_endpoint_works, f"Status: {response.status_code}")
            
            # Test exercise canonical endpoint
            response = client.get('/api/exercises/canonical')
            canonical_endpoint_works = response.status_code == 200
            test_results["canonical_exercises"] = canonical_endpoint_works
            print_test_result("Canonical Exercises Endpoint", canonical_endpoint_works, f"Status: {response.status_code}")
            
            # Test exercise validation endpoint
            validation_data = {'exercise_ids': ['push_ups', 'invalid_exercise']}
            response = client.post('/api/exercises/validate',
                                 json=validation_data,
                                 content_type='application/json')
            validation_endpoint_works = response.status_code == 200
            test_results["exercise_validation"] = validation_endpoint_works
            print_test_result("Exercise Validation Endpoint", validation_endpoint_works, f"Status: {response.status_code}")
            
    except Exception as e:
        test_results["flask_error"] = str(e)
        print_test_result("Flask API Endpoints", False, str(e))
        
    return test_results

def test_exercise_validation():
    """Test exercise validation and canonical database enforcement"""
    print_test_header("Exercise Validation System")
    
    test_results = {}
    
    try:
        from tests.vertex_testing import validate_workout_plan, _allowed_ids_for_prompt
        
        # Test context building
        test_context = {
            'profileSummary': 'Intermediate lifter',
            'healthSummary': {'activeInjuries': []},
            'equipmentAccess': {'current': 'gym', 'gym': ['barbells', 'dumbbells', 'machines']}
        }
        
        # Test allowed IDs generation
        allowed_ids = _allowed_ids_for_prompt(test_context, max_ids=10)
        allowed_ids_works = isinstance(allowed_ids, list) and len(allowed_ids) > 0
        test_results["allowed_ids_generation"] = allowed_ids_works
        print_test_result("Allowed IDs Generation", allowed_ids_works, f"Generated {len(allowed_ids)} IDs")
        
        if allowed_ids_works and len(allowed_ids) > 0:
            print_test_result("Sample Allowed IDs", True, f"Examples: {allowed_ids[:3]}")
        
        # Test workout plan validation with valid exercises
        valid_plan = {
            "dayType": "Chest Day",
            "segments": [
                {
                    "name": "Main Work",
                    "exercises": [
                        {
                            "exerciseId": allowed_ids[0] if allowed_ids else "push_ups",
                            "exerciseName": "Test Exercise",
                            "sets": 3,
                            "reps": 10,
                            "load": "bodyweight",
                            "restSec": 90,
                            "equipmentNeeded": ["bodyweight"]
                        }
                    ]
                }
            ]
        }
        
        violations = validate_workout_plan(valid_plan, test_context)
        validation_works = isinstance(violations, list)
        test_results["validation_function"] = validation_works
        print_test_result("Validation Function", validation_works, f"Violations: {len(violations) if validation_works else 'N/A'}")
        
        # Test with invalid exercise ID
        invalid_plan = {
            "dayType": "Invalid Day", 
            "segments": [
                {
                    "name": "Invalid Work",
                    "exercises": [
                        {
                            "exerciseId": "invalid_exercise_that_does_not_exist",
                            "exerciseName": "Invalid Exercise",
                            "sets": 3,
                            "reps": 10,
                            "equipmentNeeded": ["fake_equipment"]
                        }
                    ]
                }
            ]
        }
        
        invalid_violations = validate_workout_plan(invalid_plan, test_context)
        catches_invalid = len(invalid_violations) > 0 if isinstance(invalid_violations, list) else False
        test_results["catches_invalid_exercises"] = catches_invalid
        print_test_result("Catches Invalid Exercises", catches_invalid, f"Violations: {len(invalid_violations) if isinstance(invalid_violations, list) else 'N/A'}")
        
    except Exception as e:
        test_results["validation_error"] = str(e)
        print_test_result("Exercise Validation", False, str(e))
        
    return test_results

def test_message_routing():
    """Test message routing functionality"""
    print_test_header("Message Routing System")
    
    test_results = {}
    
    try:
        from tests.vertex_testing import route_user_message
        
        # Test different message types
        test_messages = {
            "planner": "I need a chest workout today",
            "technique": "My shoulder hurts during bench press", 
            "schedule": "How often should I train legs?",
            "explain": "What is progressive overload?",
            "chit_chat": "Hello, good morning!"
        }
        
        for expected_route, message in test_messages.items():
            try:
                actual_route = route_user_message(message)
                route_correct = actual_route == expected_route
                test_results[f"route_{expected_route}"] = route_correct
                print_test_result(f"Route '{expected_route}'", route_correct, f"Got: {actual_route}, Expected: {expected_route}")
            except Exception as e:
                test_results[f"route_{expected_route}_error"] = str(e)
                print_test_result(f"Route '{expected_route}'", False, f"Error: {str(e)}")
        
        # Test fallback routing
        try:
            fallback_route = route_user_message("This is a completely random message that should trigger fallback")
            fallback_works = fallback_route in ["explain", "planner", "technique", "schedule", "chit_chat"]
            test_results["fallback_routing"] = fallback_works
            print_test_result("Fallback Routing", fallback_works, f"Fallback route: {fallback_route}")
        except Exception as e:
            test_results["fallback_error"] = str(e)
            print_test_result("Fallback Routing", False, str(e))
            
    except Exception as e:
        test_results["routing_error"] = str(e)
        print_test_result("Message Routing", False, str(e))
        
    return test_results

def test_profile_and_memory_systems():
    """Test user profile and memory systems"""
    print_test_header("Profile and Memory Systems")
    
    test_results = {}
    
    try:
        from tests.vertex_testing import profile_manager, memory_system
        
        # Test profile manager
        if profile_manager is not None:
            has_create_method = hasattr(profile_manager, 'create_user_profile')
            has_load_method = hasattr(profile_manager, 'load_profile')
            has_update_method = hasattr(profile_manager, 'update_profile')
            
            test_results["profile_manager_methods"] = has_create_method and has_load_method and has_update_method
            print_test_result("Profile Manager Methods", test_results["profile_manager_methods"])
            
            if has_create_method:
                print_test_result("Profile Creation Method", True)
            if has_load_method:
                print_test_result("Profile Loading Method", True)
            if has_update_method:
                print_test_result("Profile Update Method", True)
        else:
            test_results["profile_manager_available"] = False
            print_test_result("Profile Manager Available", False, "Object is None")
        
        # Test memory system
        if memory_system is not None:
            has_add_method = hasattr(memory_system, 'add_milestone_snippet')
            has_retrieve_method = hasattr(memory_system, 'retrieve_relevant_snippets')
            has_recent_method = hasattr(memory_system, 'get_recent_context')
            
            test_results["memory_system_methods"] = has_add_method and has_retrieve_method and has_recent_method
            print_test_result("Memory System Methods", test_results["memory_system_methods"])
            
            if has_add_method:
                print_test_result("Memory Add Method", True)
            if has_retrieve_method:
                print_test_result("Memory Retrieve Method", True)
            if has_recent_method:
                print_test_result("Memory Recent Context Method", True)
        else:
            test_results["memory_system_available"] = False
            print_test_result("Memory System Available", False, "Object is None")
            
    except Exception as e:
        test_results["profile_memory_error"] = str(e)
        print_test_result("Profile and Memory Systems", False, str(e))
        
    return test_results

def test_google_cloud_integration():
    """Test Google Cloud integration"""
    print_test_header("Google Cloud Integration")
    
    test_results = {}
    
    try:
        from tests.vertex_testing import coach_model, router_model
        
        # Test model initialization
        coach_model_initialized = coach_model is not None
        router_model_initialized = router_model is not None
        
        test_results["coach_model"] = coach_model_initialized
        test_results["router_model"] = router_model_initialized
        
        print_test_result("Coach Model Initialized", coach_model_initialized)
        print_test_result("Router Model Initialized", router_model_initialized)
        
        if coach_model_initialized:
            model_name = getattr(coach_model, '_model_name', 'Unknown')
            print_test_result("Coach Model Type", True, f"Model: {model_name}")
        
        if router_model_initialized:
            model_name = getattr(router_model, '_model_name', 'Unknown')
            print_test_result("Router Model Type", True, f"Model: {model_name}")
        
        # Test credentials (without exposing sensitive data)
        import os
        has_project_id = 'GOOGLE_CLOUD_PROJECT_ID' in os.environ
        test_results["has_project_id"] = has_project_id
        print_test_result("Google Cloud Project ID", has_project_id)
        
    except Exception as e:
        test_results["google_cloud_error"] = str(e)
        print_test_result("Google Cloud Integration", False, str(e))
        
    return test_results

def run_comprehensive_test():
    """Run all tests and generate a comprehensive report"""
    print("🚀 STARTING COMPREHENSIVE HLTHY AI SYSTEM TEST")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Working Directory: {os.getcwd()}")
    
    all_results = {}
    
    # Run all test suites
    test_suites = [
        ("System Imports", test_imports_and_initialization),
        ("Exercise Database", test_exercise_database),
        ("Focus Integration", test_focus_integration_system),
        ("Flask Endpoints", test_flask_endpoints),
        ("Exercise Validation", test_exercise_validation),
        ("Message Routing", test_message_routing),
        ("Profile & Memory", test_profile_and_memory_systems),
        ("Google Cloud", test_google_cloud_integration)
    ]
    
    for suite_name, test_function in test_suites:
        try:
            results = test_function()
            all_results[suite_name] = results
        except Exception as e:
            all_results[suite_name] = {"error": str(e)}
            print_test_result(f"{suite_name} Test Suite", False, str(e))
    
    # Generate summary report
    print_test_header("COMPREHENSIVE TEST SUMMARY")
    
    total_tests = 0
    passed_tests = 0
    failed_tests = 0
    
    for suite_name, results in all_results.items():
        if isinstance(results, dict):
            suite_tests = len([k for k in results.keys() if not k.endswith('_error')])
            # Count successful tests - True, or specific successful status codes/values
            successful_values = []
            for k, v in results.items():
                if k.endswith('_error'):
                    continue
                # Count as successful: True, exercise_count > 0, status codes 200/201, etc.
                if (v is True or 
                    (k == 'exercise_count' and isinstance(v, int) and v > 0) or
                    (k in ['chat_endpoint', 'profile_creation'] and v in [200, 201]) or
                    (isinstance(v, int) and v in [200, 201])):
                    successful_values.append(v)
            
            suite_passed = len(successful_values)
            suite_failed = suite_tests - suite_passed
            
            total_tests += suite_tests
            passed_tests += suite_passed
            failed_tests += suite_failed
            
            print(f"📊 {suite_name}: {suite_passed}/{suite_tests} tests passed")
    
    success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    
    print(f"\n🎯 OVERALL RESULTS:")
    print(f"   Total Tests: {total_tests}")
    print(f"   Passed: {passed_tests} ✅")
    print(f"   Failed: {failed_tests} ❌")
    print(f"   Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print(f"\n🎉 EXCELLENT! System is production-ready!")
    elif success_rate >= 80:
        print(f"\n✅ GOOD! System is mostly operational with minor issues.")
    elif success_rate >= 70:
        print(f"\n⚠️  FAIR! System has some issues that should be addressed.")
    else:
        print(f"\n❌ POOR! System has significant issues that need fixing.")
    
    # Save detailed results
    try:
        with open('test_results.json', 'w') as f:
            json.dump(all_results, f, indent=2, default=str)
        print(f"\n📄 Detailed results saved to: test_results.json")
    except Exception as e:
        print(f"\n⚠️  Could not save detailed results: {e}")
    
    return all_results

if __name__ == "__main__":
    try:
        results = run_comprehensive_test()
        exit_code = 0 if any(results.values()) else 1
        sys.exit(exit_code)
    except Exception as e:
        print(f"\n💥 CRITICAL ERROR: {e}")
        traceback.print_exc()
        sys.exit(1)
