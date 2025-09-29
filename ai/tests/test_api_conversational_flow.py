"""
Test the full API conversational memory flow
Simulates what happens when the React Native app sends a message
"""
import sys
import os

# Add parent directory to path
ai_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ai_dir)

def test_full_conversational_flow():
    """
    Test the complete flow: 
    message → profile_sync extraction → orchestrator → confirmation response
    """
    print("\n🧪 Testing Full API Conversational Memory Flow")
    print("=" * 60)
    
    try:
        from utils.profile_sync import ConfidenceBasedExtractor, EnhancedProfileSync
        from utils.user_profiles import EnhancedProfileManager
        from core.ai_orchestrator import AIOrchestrator
        from integration.intelligent_integration import IntelligentIntegration
        
        # Mock Gemini model
        class MockGeminiModel:
            def generate_content(self, prompt):
                class MockResponse:
                    text = "This is a test response."
                return MockResponse()
        
        # Initialize components (like vertex_testing.py does)
        gemini_model = MockGeminiModel()
        enhanced_profile_manager = EnhancedProfileManager()
        confidence_extractor = ConfidenceBasedExtractor()
        enhanced_profile_sync = EnhancedProfileSync(confidence_extractor, enhanced_profile_manager)
        intelligent_system = IntelligentIntegration(gemini_model)
        
        print("✅ All components initialized")
        
        # Test Case: User says "I hate burpees"
        print("\n📝 Test: User says 'I really hate burpees and can't stand overhead squats'")
        
        user_id = "test_user_123"
        user_message = "I really hate burpees and can't stand overhead squats"
        
        # Step 1: Extract claims (like vertex_testing.py does)
        print("\n   Step 1: Extracting claims from message...")
        conversation_result = enhanced_profile_sync.process_conversation_turn(
            user_id, 
            user_message, 
            ""  # Coach response will be filled after AI generates it
        )
        print(f"   Claims extracted: {conversation_result.get('claims_extracted')}")
        print(f"   Pending confirmations: {len(conversation_result.get('pending_confirmations', []))}")
        
        for i, claim in enumerate(conversation_result.get('pending_confirmations', []), 1):
            print(f"     Claim {i}: {claim.get('type')} - {claim.get('value')}")
        
        # Step 2: Pass to intelligent system (like vertex_testing.py does)
        print("\n   Step 2: Passing to intelligent system with context...")
        context_data = {}
        if conversation_result:
            context_data['conversational_memory'] = conversation_result
        
        result = intelligent_system.handle_request(user_id, user_message, context_data)
        
        # Step 3: Verify response
        print("\n   Step 3: Verifying AI response...")
        print(f"   Response type: {result.get('type')}")
        print(f"   Message: {result.get('message')}")
        
        # Assertions
        assert result.get('type') == 'confirmation_request', f"Expected confirmation_request, got {result.get('type')}"
        message_lower = result.get('message', '').lower()
        assert 'burpees' in message_lower or 'overhead squats' in message_lower, \
            "Confirmation should mention the exercises"
        assert result.get('requires_user_confirmation') == True, "Should require confirmation"
        
        print(f"   ✅ Correct response type and content")
        
        # Test Case 2: User says "My shoulder hurts"
        print("\n📝 Test: User says 'My shoulder has been bothering me'")
        
        user_id_2 = "test_user_456"  # Different user to avoid claim accumulation
        user_message = "My shoulder has been bothering me"
        
        conversation_result = enhanced_profile_sync.process_conversation_turn(
            user_id_2, 
            user_message, 
            ""
        )
        print(f"   Claims extracted: {conversation_result.get('claims_extracted')}")
        
        context_data = {'conversational_memory': conversation_result}
        result = intelligent_system.handle_request(user_id_2, user_message, context_data)
        
        print(f"   Response type: {result.get('type')}")
        print(f"   Message: {result.get('message')}")
        
        assert result.get('type') == 'confirmation_request', "Should request confirmation for injury"
        assert 'shoulder' in result.get('message', '').lower(), "Should mention shoulder"
        
        print(f"   ✅ Injury detection and confirmation working")
        
        # Test Case 3: Regular message without claims
        print("\n📝 Test: Regular message 'Hello, I need a workout'")
        
        user_id_3 = "test_user_789"  # Different user
        user_message = "Hello, I need a workout"
        
        conversation_result = enhanced_profile_sync.process_conversation_turn(
            user_id_3, 
            user_message, 
            ""
        )
        print(f"   Claims extracted: {conversation_result.get('claims_extracted')}")
        
        context_data = {'conversational_memory': conversation_result}
        result = intelligent_system.handle_request(user_id_3, user_message, context_data)
        
        print(f"   Response type: {result.get('type')}")
        print(f"   Message preview: {result.get('message', '')[:80]}...")
        
        # Should NOT be a confirmation request since no claims
        assert result.get('type') != 'confirmation_request', "Should not request confirmation for regular message"
        
        print(f"   ✅ Regular messages handled normally")
        
        print("\n" + "=" * 60)
        print("🎉 All full flow tests passed!")
        print("   Ready to deploy to production!")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_full_conversational_flow()
    sys.exit(0 if success else 1)
