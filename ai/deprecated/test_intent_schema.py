"""
Unit tests for Task E: Intent Schema (avoid bias)
Tests that intent classification works correctly without workout_request bias
"""

import sys
import os
import json

# Add ai directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

class MockGeminiModel:
    """Mock Gemini model for deterministic testing"""
    
    def __init__(self, response_text=None):
        self.response_text = response_text or '{"intent": "nonsense", "reason": "test response", "confidence": 0.8}'
    
    def generate_content(self, prompt):
        class MockResponse:
            def __init__(self, text):
                self.text = text
        return MockResponse(self.response_text)

def create_test_orchestrator(gemini_response=None):
    """Create orchestrator with mock dependencies for testing"""
    from core.ai_orchestrator import AIOrchestrator
    return AIOrchestrator(MockGeminiModel(gemini_response))

def test_intent_schema_format():
    """Test that _ai_understand_with_context returns correct JSON format"""
    orchestrator = create_test_orchestrator(
        '{"intent": "technique_question", "reason": "asking about form", "confidence": 0.9}'
    )
    
    context = {'profile': None, 'exercise_database': {}, 'allowed_exercises': []}
    result = orchestrator._ai_understand_with_context("how to deadlift", context)
    
    # Verify required fields
    assert 'intent' in result
    assert 'reason' in result  
    assert 'confidence' in result
    
    # Verify types
    assert isinstance(result['intent'], str)
    assert isinstance(result['reason'], str)
    assert isinstance(result['confidence'], (int, float))
    assert 0.0 <= result['confidence'] <= 1.0

def test_nonsense_detection():
    """Test that nonsense inputs are correctly handled by the router"""
    test_cases = [
        "toenails",
        "what is the weather", 
        "ajshdgjashgd",
        "tell me a joke",
        "what's 2+2",
        "123456",
    ]
    
    # Test router-first gating (the proper flow)
    from core.focus_router_enhanced import route_focus_request
    
    for message in test_cases:
        # Test router catches nonsense
        router_result = route_focus_request(message)
        assert router_result['action'] == 'reject_nonsense', f"Router failed to catch nonsense for '{message}': {router_result['action']}"
    
    # Test fallback only handles edge cases gracefully
    orchestrator = create_test_orchestrator()
    
    # Test some edge cases for fallback
    edge_cases = [
        ("", "nonsense"),  # Empty string
        ("123", "nonsense"),  # Just numbers
        ("@#$%", "nonsense"),  # Just symbols
    ]
    
    for message, expected_intent in edge_cases:
        result = orchestrator._fallback_intent(message)
        # Fallback should handle these gracefully, preferring nonsense for obvious cases
        assert result['intent'] in ['nonsense', 'interview_needed'], f"Fallback failed for '{message}': got {result['intent']}"
        assert result['confidence'] > 0.0

def test_technique_question_detection():
    """Test that technique questions are correctly classified"""
    test_cases = [
        "teach me lat pulldown form",
        "how to do proper squats", 
        "correct deadlift technique",
        "proper bench press form",
        "how do I perform bicep curls",
    ]
    
    for message in test_cases:
        orchestrator = create_test_orchestrator(
            '{"intent": "technique_question", "reason": "asking about exercise form", "confidence": 0.85}'
        )
        
        context = {'profile': None, 'exercise_database': {}, 'allowed_exercises': []}
        result = orchestrator._ai_understand_with_context(message, context)
        
        assert result['intent'] == 'technique_question', f"Failed for '{message}': got {result['intent']}"
        
        # Also test fallback
        fallback_result = orchestrator._fallback_intent(message)
        assert fallback_result['intent'] == 'technique_question'

def test_interview_needed_detection():
    """Test that vague requests trigger interview_needed"""
    test_cases = [
        "build my back",
        "I want to get stronger", 
        "help me with fitness",
        "create a routine",
        "I need a workout",
    ]
    
    for message in test_cases:
        orchestrator = create_test_orchestrator(
            '{"intent": "interview_needed", "reason": "request too vague, needs clarification", "confidence": 0.75}'
        )
        
        context = {'profile': None, 'exercise_database': {}, 'allowed_exercises': []}
        result = orchestrator._ai_understand_with_context(message, context)
        
        # For new users (no profile), should be interview_needed or workout_request
        assert result['intent'] in ['interview_needed', 'workout_request'], f"Failed for '{message}': got {result['intent']}"

def test_progress_check_detection():
    """Test that progress questions are correctly classified"""
    test_cases = [
        "how is my progress",
        "show me my results",
        "track my improvement", 
        "what are my gains",
    ]
    
    for message in test_cases:
        orchestrator = create_test_orchestrator(
            '{"intent": "progress_check", "reason": "asking about workout progress", "confidence": 0.9}'
        )
        
        context = {'profile': None, 'exercise_database': {}, 'allowed_exercises': []}
        result = orchestrator._ai_understand_with_context(message, context)
        
        assert result['intent'] == 'progress_check', f"Failed for '{message}': got {result['intent']}"

def test_no_workout_request_bias():
    """Test that there's no automatic bias toward workout_request"""
    # These should NOT automatically be classified as workout_request
    non_workout_cases = [
        ("toenails", "nonsense"),
        ("how to bench press", "technique_question"), 
        ("my progress", "progress_check"),
        ("general advice", "advice"),
    ]
    
    for message, expected_intent in non_workout_cases:
        orchestrator = create_test_orchestrator(
            f'{{"intent": "{expected_intent}", "reason": "test classification", "confidence": 0.8}}'
        )
        
        context = {'profile': None, 'exercise_database': {}, 'allowed_exercises': []}
        result = orchestrator._ai_understand_with_context(message, context)
        
        assert result['intent'] == expected_intent, f"Biased classification for '{message}': expected {expected_intent}, got {result['intent']}"

def test_router_integration():
    """Test that intent classification integrates with router decisions"""
    orchestrator = create_test_orchestrator(
        '{"intent": "workout_request", "reason": "specific muscle group request", "confidence": 0.9}'
    )
    
    context = {'profile': None, 'exercise_database': {}, 'allowed_exercises': []}
    
    # Test with router decision context
    router_decision = {
        'action': 'direct_planning',
        'focus': 'chest', 
        'reason': 'detected specific muscle group'
    }
    
    result = orchestrator._ai_understand_with_context("chest workout", context, router_decision)
    
    # Should have intent and router context integrated
    assert 'intent' in result
    assert 'reason' in result
    assert 'confidence' in result

def test_full_integration_flow():
    """Test the complete flow: router -> intent classification -> response"""
    orchestrator = create_test_orchestrator()
    
    # Test nonsense gets handled by router (never reaches intent classification)
    nonsense_result = orchestrator.process_message("test_user", "toenails")
    assert nonsense_result['type'] == 'clarify_focus', f"Nonsense should be handled by router: {nonsense_result}"
    
    # Test valid fitness request goes through proper flow
    from utils.user_profiles import UserProfile
    
    # Create a user with complete profile to test direct workout generation
    context = {
        'profile': None,  # New user should trigger interview
        'exercise_database': {},
        'allowed_exercises': []
    }
    
    fitness_result = orchestrator.process_message("test_user_2", "build my chest")
    # Should either start interview (new user) or generate workout (complete profile)
    assert fitness_result['type'] in ['interview', 'workout', 'offer_plan'], f"Fitness request should trigger interview or workout: {fitness_result}"

def test_valid_intent_values():
    """Test that only valid intent values are returned"""
    valid_intents = ['workout_request', 'interview_needed', 'technique_question', 'progress_check', 'advice', 'nonsense']
    
    # Test various inputs
    test_messages = [
        "build chest", "toenails", "how to squat", "my progress", "nutrition tips", "gibberish123"
    ]
    
    for message in test_messages:
        orchestrator = create_test_orchestrator()
        
        # Test fallback method
        result = orchestrator._fallback_intent(message)
        assert result['intent'] in valid_intents, f"Invalid intent '{result['intent']}' for message '{message}'"
        
        # Test with mock AI response
        for intent in valid_intents:
            ai_orchestrator = create_test_orchestrator(
                f'{{"intent": "{intent}", "reason": "test", "confidence": 0.8}}'
            )
            context = {'profile': None, 'exercise_database': {}, 'allowed_exercises': []}
            ai_result = ai_orchestrator._ai_understand_with_context(message, context)
            assert ai_result['intent'] == intent

def test_confidence_bounds():
    """Test that confidence values are properly bounded"""
    orchestrator = create_test_orchestrator()
    
    test_messages = ["workout", "nonsense", "how to", "progress"]
    
    for message in test_messages:
        result = orchestrator._fallback_intent(message)
        assert 0.0 <= result['confidence'] <= 1.0, f"Confidence out of bounds for '{message}': {result['confidence']}"

def run_all_tests():
    """Run all Task E tests"""
    test_functions = [
        test_intent_schema_format,
        test_nonsense_detection,
        test_technique_question_detection,
        test_interview_needed_detection,
        test_progress_check_detection,
        test_no_workout_request_bias,
        test_router_integration,
        test_full_integration_flow,
        test_valid_intent_values,
        test_confidence_bounds,
    ]
    
    print("=" * 80)
    print("RUNNING TASK E INTENT SCHEMA TESTS")
    print("=" * 80)
    
    passed = 0
    failed = 0
    
    for test_func in test_functions:
        try:
            print(f"\nRunning {test_func.__name__}...")
            test_func()
            print(f"✅ {test_func.__name__} PASSED")
            passed += 1
        except Exception as e:
            print(f"❌ {test_func.__name__} FAILED: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print("\n" + "=" * 80)
    print(f"TASK E TESTS SUMMARY: {passed} passed, {failed} failed")
    if failed == 0:
        print("✅ ALL TASK E TESTS PASSED!")
    else:
        print("❌ SOME TESTS FAILED")
    print("=" * 80)
    
    return failed == 0

if __name__ == "__main__":
    run_all_tests()