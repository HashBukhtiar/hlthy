"""
Quick test of the new AI-powered intelligent system
"""
import sys
import os

# Add parent directory to path
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)

def test_intelligent_system():
    print("🧠 Testing AI-powered intelligent system...")
    
    try:
        # Test 1: Import check
        from integration.intelligent_integration import IntelligentIntegration, LegacyCompatibilityWrapper
        print("✅ Import successful")
        
        # Test 2: Mock model for testing
        class MockModel:
            def generate_content(self, prompt):
                class MockResponse:
                    text = '{"intent": "workout_request", "confidence": 0.9}'
                return MockResponse()
        
        mock_model = MockModel()
        
        # Test 3: Initialize system
        intelligent_system = IntelligentIntegration(mock_model)
        print("✅ System initialization successful")
        
        # Test 4: Test request handling
        result = intelligent_system.handle_request("test_user", "I need a leg workout")
        print(f"✅ Request handling successful: {result.get('type')}")
        
        # Test 5: Legacy wrapper
        wrapper = LegacyCompatibilityWrapper(mock_model)
        legacy_result = wrapper.handle_workout_request("test_user", "quad day please")
        print(f"✅ Legacy wrapper successful: {legacy_result.get('response_type')}")
        
        print("🎉 All tests passed! AI system is ready to orchestrate your existing systems.")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_intelligent_system()
