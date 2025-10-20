"""
Test script for Task D: Router-First Gating & Interview Chaining
Tests the acceptance criteria from copilot_instructions_v2.md
"""

import sys
import os
import traceback

# Add ai directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'ai'))

def test_task_d():
    """Test Task D functionality"""
    try:
        from ai.core.ai_orchestrator import AIOrchestrator
        from ai.utils.user_profiles import UserProfileManager
        
        # Create mock gemini model
        class MockGeminiModel:
            def generate_content(self, prompt):
                class MockResponse:
                    def __init__(self):
                        self.text = '{"intent": "workout_request", "confidence": 0.8, "focus": "back"}'
                return MockResponse()
        
        # Initialize
        orchestrator = AIOrchestrator(MockGeminiModel())
        import time
        user_id = f"test_user_task_d_{int(time.time())}"  # Unique ID each time
        
        print("=" * 80)
        print("TESTING TASK D: ROUTER-FIRST GATING & INTERVIEW CHAINING")
        print("=" * 80)
        
        # Test D.1: Router-first gating with nonsense
        print("\n--- Test D.1: Router-first gating with nonsense ---")
        nonsense_inputs = [
            "ajshdgjashgd",
            "what is the weather",
            "tell me a joke",
            "what's 2+2"
        ]
        
        for nonsense in nonsense_inputs:
            print(f"\nInput: '{nonsense}'")
            result = orchestrator.process_message(user_id, nonsense)
            print(f"Type: {result.get('type')}")
            print(f"Message: {result.get('message', '')[:100]}...")
            
            # Should be clarify_focus, not planning
            assert result['type'] == 'clarify_focus', f"Expected clarify_focus, got {result['type']}"
            print("✅ Router correctly rejected nonsense")
        
        # Test D.2: Interview chaining flow
        print("\n--- Test D.2: Interview chaining flow ---")
        
        # Clear any existing profile
        profile_manager = UserProfileManager()
        try:
            profile_manager.delete_profile(user_id)
        except:
            pass
        
        # Start with valid fitness request that should trigger interview
        print(f"\nInput: 'build my back'")
        result = orchestrator.process_message(user_id, "build my back")
        print(f"Type: {result.get('type')}")
        print(f"Message: {result.get('message', '')}")
        
        # Should start interview for new user
        assert result['type'] in ['interview', 'start_interview'], f"Expected interview start, got {result['type']}"
        print("✅ Valid request triggered interview for new user")
        
        # Answer experience level
        print(f"\nInput: 'intermediate'")
        result = orchestrator.process_message(user_id, "intermediate")
        print(f"Type: {result.get('type')}")
        print(f"Message: {result.get('message', '')}")
        
        # Should continue to next question, not dead-end
        assert result['type'] in ['interview'], f"Expected continued interview, got {result['type']}"
        assert 'goals' in result.get('message', '').lower() or 'goal' in result.get('message', '').lower(), "Should ask about goals next"
        print("✅ Interview continued to goals question")
        
        # Answer goals
        print(f"\nInput: 'muscle building'")
        result = orchestrator.process_message(user_id, "muscle building")
        print(f"Type: {result.get('type')}")
        print(f"Message: {result.get('message', '')}")
        
        # Should continue to time question
        assert result['type'] in ['interview'], f"Expected continued interview, got {result['type']}"
        assert 'time' in result.get('message', '').lower() or 'minute' in result.get('message', '').lower(), "Should ask about time next"
        print("✅ Interview continued to time question")
        
        # Answer time
        print(f"\nInput: '60 minutes'")
        result = orchestrator.process_message(user_id, "60 minutes")
        print(f"Type: {result.get('type')}")
        print(f"Message: {result.get('message', '')}")
        
        # Should continue to equipment question
        assert result['type'] in ['interview'], f"Expected continued interview, got {result['type']}"
        assert 'equipment' in result.get('message', '').lower(), "Should ask about equipment next"
        print("✅ Interview continued to equipment question")
        
        # Answer equipment (final question)
        print(f"\nInput: 'commercial gym'")
        result = orchestrator.process_message(user_id, "commercial gym")
        print(f"Type: {result.get('type')}")
        print(f"Message: {result.get('message', '')}")
        
        # Should offer plan, not dead-end with "profile updated"
        assert result['type'] in ['offer_plan', 'workout'], f"Expected offer_plan or workout, got {result['type']}"
        assert 'workout' in result.get('message', '').lower() or 'plan' in result.get('message', '').lower(), "Should offer workout creation"
        print("✅ Interview completed with offer_plan (no dead-end)")
        
        print("\n" + "=" * 80)
        print("✅ TASK D TESTS PASSED - Router-first gating & interview chaining working!")
        print("=" * 80)
        return True
        
    except Exception as e:
        print(f"\n❌ TASK D TEST FAILED: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return False

if __name__ == "__main__":
    test_task_d()
