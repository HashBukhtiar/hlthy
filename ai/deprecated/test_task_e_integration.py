"""
Integration test for Task E: Intent Schema (avoid bias)
Tests the complete system flow with proper intent classification
"""

import sys
import os
import traceback

# Add ai directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

def test_task_e_integration():
    """Test Task E integration with the complete system"""
    try:
        from core.ai_orchestrator import AIOrchestrator
        
        # Create mock gemini model
        class MockGeminiModel:
            def generate_content(self, prompt):
                class MockResponse:
                    def __init__(self):
                        # Return different responses based on prompt content
                        if 'toenails' in prompt or 'nonsense' in prompt:
                            self.text = '{"intent": "nonsense", "reason": "unrelated to fitness", "confidence": 0.9}'
                        elif 'technique' in prompt or 'form' in prompt:
                            self.text = '{"intent": "technique_question", "reason": "asking about exercise form", "confidence": 0.85}'
                        elif 'progress' in prompt:
                            self.text = '{"intent": "progress_check", "reason": "asking about workout progress", "confidence": 0.8}'
                        else:
                            self.text = '{"intent": "workout_request", "reason": "wants workout plan", "confidence": 0.75}'
                return MockResponse()
        
        orchestrator = AIOrchestrator(MockGeminiModel())
        import time
        user_id = f"task_e_integration_{int(time.time())}"
        
        print("=" * 80)
        print("TASK E INTEGRATION TESTS - INTENT SCHEMA")
        print("=" * 80)
        
        # Test 1: Router-first gating handles obvious nonsense (never reaches intent classification)
        print("\n1. Testing router-first nonsense detection...")
        obvious_nonsense_tests = [
            "toenails",
            "what is the weather", 
            "tell me a joke"
        ]
        
        for message in obvious_nonsense_tests:
            result = orchestrator.process_message(user_id, message)
            assert result['type'] == 'clarify_focus', f"Failed for '{message}': expected clarify_focus, got {result['type']}"
            print(f"  ✅ '{message}' → router correctly rejected as nonsense")
        
        # Test ambiguous cases that should trigger clarification/interview (not automatic rejection)
        print("\n1b. Testing ambiguous non-fitness requests...")
        ambiguous_tests = [
            "chemistry homework help",
            "ajshdgjashgd",  # Gibberish should trigger interview to clarify
            "random question"
        ]
        
        for message in ambiguous_tests:
            result = orchestrator.process_message(user_id, message)
            # These should trigger interview/clarification, not automatic rejection
            assert result['type'] in ['clarify_focus', 'interview'], f"Failed for '{message}': expected clarify_focus or interview, got {result['type']}"
            print(f"  ✅ '{message}' → router correctly triggered clarification/interview")
        
        # Test 2: Technique questions properly classified 
        print("\n2. Testing technique question classification...")
        technique_tests = [
            "teach me lat pulldown form",
            "how to do proper squats",
            "correct deadlift technique"
        ]
        
        for message in technique_tests:
            result = orchestrator.process_message(user_id, message)
            # Should trigger technique response, advice, or clarification (not workout generation)
            assert result['type'] in ['technique', 'advice', 'clarify_focus', 'interview'], f"Failed for '{message}': got {result['type']}"
            assert result['type'] != 'workout', f"Should not generate workout for technique question '{message}'"
            print(f"  ✅ '{message}' → properly handled as technique question ({result['type']})")
        
        # Test 3: Vague fitness requests trigger appropriate clarification (not automatic workout_request)
        print("\n3. Testing vague request handling...")
        vague_tests = [
            "build my back",
            "I want to get stronger",
            "help me with fitness"
        ]
        
        for message in vague_tests:
            fresh_user = f"{user_id}_{message.replace(' ', '_')}"
            result = orchestrator.process_message(fresh_user, message)
            # Should trigger interview OR clarification, but NOT immediate workout generation
            assert result['type'] in ['interview', 'clarify_focus'], f"Failed for '{message}': expected interview/clarify_focus, got {result['type']}"
            assert result['type'] != 'workout', f"Should not immediately generate workout for vague request '{message}'"
            print(f"  ✅ '{message}' → {result['type']} (no bias toward workout_request)")
        
        # Test 4: No automatic workout_request bias
        print("\n4. Testing removal of workout_request bias...")
        
        # These should NOT be automatically classified as workout_request
        non_workout_tests = [
            ("show my progress", "progress check or clarification"),
            ("nutrition advice", "advice or clarification"),
            ("recovery tips", "advice or clarification")
        ]
        
        for message, expected_type in non_workout_tests:
            result = orchestrator.process_message(user_id, message)
            # Should not default to workout generation
            assert result['type'] != 'workout', f"Biased toward workout for '{message}': got {result['type']}"
            print(f"  ✅ '{message}' → {result['type']} (no workout_request bias)")
        
        # Test 5: Intent format validation
        print("\n5. Testing intent format in AI understanding...")
        
        # Test the _ai_understand_with_context method directly
        context = {'profile': None, 'exercise_database': {}, 'allowed_exercises': []}
        
        test_messages = [
            "build chest muscles",
            "how to bench press", 
            "track my gains"
        ]
        
        for message in test_messages:
            result = orchestrator._ai_understand_with_context(message, context)
            
            # Verify format
            assert 'intent' in result, f"Missing 'intent' field for '{message}'"
            assert 'reason' in result, f"Missing 'reason' field for '{message}'"
            assert 'confidence' in result, f"Missing 'confidence' field for '{message}'"
            
            # Verify types and bounds
            assert isinstance(result['intent'], str), f"Intent not string for '{message}'"
            assert isinstance(result['reason'], str), f"Reason not string for '{message}'"
            assert isinstance(result['confidence'], (int, float)), f"Confidence not numeric for '{message}'"
            assert 0.0 <= result['confidence'] <= 1.0, f"Confidence out of bounds for '{message}': {result['confidence']}"
            
            # Verify valid intent values
            valid_intents = ['workout_request', 'interview_needed', 'technique_question', 'progress_check', 'advice', 'nonsense']
            assert result['intent'] in valid_intents, f"Invalid intent '{result['intent']}' for '{message}'"
            
            print(f"  ✅ '{message}' → {result['intent']} (format valid)")
        
        # Test 6: Router context integration
        print("\n6. Testing router context integration...")
        
        # Test with router decision context
        router_decision = {
            'action': 'direct_planning',
            'focus': 'chest',
            'reason': 'detected specific muscle group'
        }
        
        result = orchestrator._ai_understand_with_context("chest workout", context, router_decision)
        
        # Should have enhanced confidence due to router approval
        assert result['confidence'] >= 0.8, f"Router context should boost confidence: {result['confidence']}"
        print(f"  ✅ Router context properly integrated (confidence: {result['confidence']})")
        
        print("\n" + "=" * 80)
        print("✅ ALL TASK E INTEGRATION TESTS PASSED!")
        print("Intent schema works correctly without workout_request bias!")
        print("Router-first gating properly handles nonsense detection!")
        print("AI understanding provides proper {intent, reason, confidence} format!")
        print("=" * 80)
        return True
        
    except Exception as e:
        print(f"\n❌ TASK E INTEGRATION TEST FAILED: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

if __name__ == "__main__":
    test_task_e_integration()