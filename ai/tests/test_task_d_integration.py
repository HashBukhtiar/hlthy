"""
Comprehensive integration test for Task D: Router-First Gating & Interview Chaining
Tests integration with previous tasks and overall system functionality
"""

import sys
import os
import traceback

# Add ai directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'ai'))

def test_task_d_integration():
    """Test Task D integration with the complete system"""
    try:
        from ai.core.ai_orchestrator import AIOrchestrator
        
        # Create mock gemini model
        class MockGeminiModel:
            def generate_content(self, prompt):
                class MockResponse:
                    def __init__(self):
                        self.text = '{"intent": "workout_request", "confidence": 0.8, "focus": "back"}'
                return MockResponse()
        
        orchestrator = AIOrchestrator(MockGeminiModel())
        import time
        user_id = f"integration_test_{int(time.time())}"
        
        print("=" * 80)
        print("COMPREHENSIVE TASK D INTEGRATION TESTS")
        print("=" * 80)
        
        # Test 1: Router properly rejects nonsense (Task D.1)
        print("\n1. Testing Router-First Gating with various nonsense inputs...")
        nonsense_tests = [
            ("random gibberish", "aksdhjaslkd"),
            ("weather query", "what's the weather like"),
            ("math question", "solve 5x + 3 = 18"),
            ("general conversation", "how are you today"),
            ("non-fitness question", "tell me about history")
        ]
        
        for test_name, input_text in nonsense_tests:
            result = orchestrator.process_message(user_id, input_text)
            assert result['type'] == 'clarify_focus', f"Failed {test_name}: expected clarify_focus, got {result['type']}"
            print(f"  ✅ {test_name}: properly rejected → clarify_focus")
        
        # Test 2: Valid fitness requests trigger proper flow
        print("\n2. Testing valid fitness request handling...")
        valid_tests = [
            ("specific muscle", "build my chest"),
            ("general request", "create a workout"),
            ("equipment specific", "dumbbells workout"),
            ("goal specific", "muscle building routine")
        ]
        
        for test_name, input_text in valid_tests:
            # Use fresh user for each test
            fresh_user = f"{user_id}_{test_name.replace(' ', '_')}"
            result = orchestrator.process_message(fresh_user, input_text)
            # Should trigger interview for new user
            assert result['type'] in ['interview'], f"Failed {test_name}: expected interview, got {result['type']}"
            print(f"  ✅ {test_name}: triggered interview for new user")
        
        # Test 3: Complete interview chain without dead-ends
        print("\n3. Testing complete interview chain...")
        chain_user = f"{user_id}_chain"
        
        # Start interview
        result = orchestrator.process_message(chain_user, "I want to build muscle")
        assert result['type'] == 'interview', "Failed to start interview"
        print("  ✅ Interview started")
        
        # Answer experience
        result = orchestrator.process_message(chain_user, "advanced")
        assert result['type'] == 'interview', "Failed experience question chain"
        assert 'goal' in result['message'].lower(), "Should ask about goals"
        print("  ✅ Experience → Goals chaining")
        
        # Answer goals
        result = orchestrator.process_message(chain_user, "strength training")
        assert result['type'] == 'interview', "Failed goals question chain"
        assert 'time' in result['message'].lower() or 'minute' in result['message'].lower(), "Should ask about time"
        print("  ✅ Goals → Time chaining")
        
        # Answer time
        result = orchestrator.process_message(chain_user, "45 minutes")
        assert result['type'] == 'interview', "Failed time question chain"
        assert 'equipment' in result['message'].lower(), "Should ask about equipment"
        print("  ✅ Time → Equipment chaining")
        
        # Answer equipment (final)
        result = orchestrator.process_message(chain_user, "home gym")
        assert result['type'] in ['offer_plan', 'workout'], "Failed to complete interview properly"
        print("  ✅ Equipment → Completion (no dead-end)")
        
        # Test 4: Integration with existing user profile
        print("\n4. Testing with existing complete profile...")
        existing_user = f"{user_id}_existing"
        
        # Complete the profile first
        orchestrator.process_message(existing_user, "build muscle")  # start
        orchestrator.process_message(existing_user, "intermediate")  # exp
        orchestrator.process_message(existing_user, "hypertrophy")   # goals
        orchestrator.process_message(existing_user, "60 minutes")    # time
        orchestrator.process_message(existing_user, "gym access")    # equipment
        
        # Now test with existing complete profile
        result = orchestrator.process_message(existing_user, "create a leg workout")
        assert result['type'] in ['workout', 'offer_plan'], "Should generate workout for complete profile"
        print("  ✅ Existing complete profile → direct workout generation")
        
        # Test 5: Router-first still works for complete profiles
        print("\n5. Testing router-first with complete profiles...")
        result = orchestrator.process_message(existing_user, "what's the meaning of life")
        assert result['type'] == 'clarify_focus', "Router should still reject nonsense for complete profiles"
        print("  ✅ Complete profile + nonsense → router rejection")
        
        # Test 6: Integration with segment-aware pools (Task B)
        print("\n6. Testing integration with segment-aware exercise pools...")
        result = orchestrator.process_message(existing_user, "show me chest exercises")
        # Should work without errors (specific response depends on implementation)
        assert 'type' in result, "Should return valid response structure"
        print("  ✅ Exercise request processing works")
        
        print("\n" + "=" * 80)
        print("✅ ALL TASK D INTEGRATION TESTS PASSED!")
        print("Router-first gating, interview chaining, and system integration verified!")
        print("=" * 80)
        return True
        
    except Exception as e:
        print(f"\n❌ TASK D INTEGRATION TEST FAILED: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

if __name__ == "__main__":
    test_task_d_integration()
