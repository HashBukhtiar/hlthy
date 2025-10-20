"""
Quick test of the enhanced personal trainer system
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.trainer_brain import PersonalTrainerBrain
from integration.focus_integration_complete import FocusIntegrationSystem

def test_personal_trainer():
    """Test the personal trainer brain functionality"""
    
    # Initialize system
    trainer = PersonalTrainerBrain()
    integration = FocusIntegrationSystem()
    
    print("🧠 TESTING PERSONAL TRAINER BRAIN")
    print("=" * 50)
    
    # Test message classification
    test_messages = [
        "How do I grow my back?",
        "Give me a back workout", 
        "How many times should I train a week?",
        "Send me a leg workout",
        "Quad day",
        "Hamstring and back workout",
        "I'm an advanced lifter",
        "I'm a beginner with dumbbells at home",
        "Yes",
        "I have bad knees"
    ]
    
    for message in test_messages:
        print(f"\n📝 Message: '{message}'")
        intent = trainer.analyze_message_intent(message)
        print(f"   Type: {intent['type']}")
        print(f"   Confidence: {intent['confidence']:.2f}")
        if 'focus' in intent:
            print(f"   Focus: {intent['focus']}")
        if 'advice_category' in intent:
            print(f"   Advice Category: {intent['advice_category']}")
    
    print("\n" + "=" * 50)
    print("🎯 TESTING INTEGRATION SYSTEM")
    print("=" * 50)
    
    # Test full integration
    test_scenarios = [
        {
            'message': 'How do I grow my back?',
            'user_profile': {},
            'expected_type': 'advice_request'
        },
        {
            'message': 'Give me a chest workout',
            'user_profile': {},
            'expected_type': 'workout_request'
        },
        {
            'message': 'How many times should I train per week?',
            'user_profile': {'experience_level': 'beginner'},
            'expected_type': 'general_question'
        }
    ]
    
    for scenario in test_scenarios:
        print(f"\n📋 Scenario: '{scenario['message']}'")
        result = integration.handle_workout_request(
            user_id='test_user',
            message=scenario['message'],
            user_profile=scenario['user_profile']
        )
        print(f"   Response Type: {result.get('response_type')}")
        print(f"   Message: {result.get('message', '')[:100]}...")
        
        if result.get('response_type') == 'interview_question':
            print(f"   Question: {result.get('question', {}).get('question', 'N/A')}")
    
    print("\n✅ TESTING COMPLETE!")

if __name__ == "__main__":
    test_personal_trainer()
