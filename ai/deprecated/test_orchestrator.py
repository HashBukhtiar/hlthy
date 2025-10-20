#!/usr/bin/env python3
"""
Test AI Orchestrator with mock Gemini model
"""

# Test with a mock model to avoid API issues
class MockGeminiModel:
    def generate_content(self, prompt):
        class MockResponse:
            text = '{"intent": "workout_request", "confidence": 0.9, "response_type": "workout"}'
        return MockResponse()

from core.ai_orchestrator import AIOrchestrator

try:
    # Test with mock model
    mock_model = MockGeminiModel()
    ai = AIOrchestrator(mock_model)
    print('✅ AI Orchestrator initialized with mock model')
    
    response = ai.process_message('test_user_123', 'I need a leg workout')
    print('Response type:', type(response))
    print('Response keys:', list(response.keys()) if isinstance(response, dict) else 'Not a dict')
    if isinstance(response, dict):
        print('Response type field:', response.get('type'))
        print('Response message:', response.get('message', 'No message'))
    else:
        print('Response:', response)
    
except Exception as e:
    print(f'❌ Error: {e}')
    import traceback
    traceback.print_exc()
