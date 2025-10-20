"""
Test orchestrator integration with conversational memory
"""
import sys
import os

# Add parent directory to path
ai_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ai_dir)

def test_orchestrator_with_conversational_memory():
    """
    Test that AI orchestrator properly handles conversational memory context
    """
    print("\n🧪 Testing AI Orchestrator + Conversational Memory Integration")
    print("=" * 60)
    
    try:
        from core.ai_orchestrator import AIOrchestrator
        from utils.profile_sync import ConfidenceBasedExtractor
        
        # Mock Gemini model for testing
        class MockGeminiModel:
            def generate_content(self, prompt):
                class MockResponse:
                    text = "This is a test response from the AI."
                return MockResponse()
        
        # Initialize orchestrator
        gemini_model = MockGeminiModel()
        orchestrator = AIOrchestrator(gemini_model)
        
        print("✅ Orchestrator initialized")
        
        # Test 1: Process message WITHOUT conversational memory context
        print("\n📝 Test 1: Message without conversational memory")
        result = orchestrator.process_message(
            user_id="test_user_123",
            message="Hello, I need a workout",
            context_data={}
        )
        print(f"   Result type: {result.get('type')}")
        print(f"   ✅ No crash when context_data is empty")
        
        # Test 2: Process message WITH conversational memory context (no claims)
        print("\n📝 Test 2: Message with empty conversational memory")
        result = orchestrator.process_message(
            user_id="test_user_123",
            message="Hello, I need a workout",
            context_data={
                'conversational_memory': {
                    'claims_extracted': 0,
                    'pending_confirmations': []
                }
            }
        )
        print(f"   Result type: {result.get('type')}")
        print(f"   ✅ Handles empty conversational memory correctly")
        
        # Test 3: Process message WITH extracted claims
        print("\n📝 Test 3: Message with extracted claims (exercise dislike)")
        result = orchestrator.process_message(
            user_id="test_user_123",
            message="I really hate burpees",
            context_data={
                'conversational_memory': {
                    'claims_extracted': 1,
                    'pending_confirmations': [
                        {
                            'type': 'exercise_dislike',
                            'value': ['burpees'],
                            'confidence': 'HIGH',
                            'needs_confirmation': True
                        }
                    ],
                    'claims_committed': 0
                }
            }
        )
        print(f"   Result type: {result.get('type')}")
        print(f"   Message: {result.get('message')}")
        
        # Verify it returns confirmation request
        assert result.get('type') == 'confirmation_request', f"Expected 'confirmation_request', got '{result.get('type')}'"
        assert 'burpees' in result.get('message', '').lower(), "Confirmation message should mention burpees"
        assert result.get('requires_user_confirmation') == True, "Should require user confirmation"
        print(f"   ✅ Correctly generated confirmation request for exercise dislike")
        
        # Test 4: Multiple claims
        print("\n📝 Test 4: Multiple claims (injury + equipment limitation)")
        result = orchestrator.process_message(
            user_id="test_user_123",
            message="My shoulder hurts and I don't have a barbell",
            context_data={
                'conversational_memory': {
                    'claims_extracted': 2,
                    'pending_confirmations': [
                        {
                            'type': 'injury',
                            'value': {'body_part': 'shoulder', 'severity': 'moderate'},
                            'confidence': 'HIGH',
                            'needs_confirmation': True
                        },
                        {
                            'type': 'equipment_limitation',
                            'value': 'barbell',
                            'confidence': 'HIGH',
                            'needs_confirmation': True
                        }
                    ],
                    'claims_committed': 0
                }
            }
        )
        print(f"   Result type: {result.get('type')}")
        print(f"   Message: {result.get('message')}")
        
        assert result.get('type') == 'confirmation_request', "Should return confirmation request"
        assert 'shoulder' in result.get('message', '').lower(), "Should mention shoulder"
        assert 'barbell' in result.get('message', '').lower(), "Should mention barbell"
        print(f"   ✅ Correctly handled multiple claims")
        
        # Test 5: Communication style preference
        print("\n📝 Test 5: Communication style preference")
        result = orchestrator.process_message(
            user_id="test_user_123",
            message="Keep it brief please",
            context_data={
                'conversational_memory': {
                    'claims_extracted': 1,
                    'pending_confirmations': [
                        {
                            'type': 'communication_style',
                            'value': {'style': 'concise'},
                            'confidence': 'HIGH',
                            'needs_confirmation': True
                        }
                    ],
                    'claims_committed': 0
                }
            }
        )
        print(f"   Result type: {result.get('type')}")
        print(f"   Message: {result.get('message')}")
        print(f"   ✅ Correctly handled communication style preference")
        
        print("\n" + "=" * 60)
        print("🎉 All orchestrator + conversational memory tests passed!")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_orchestrator_with_conversational_memory()
    sys.exit(0 if success else 1)
