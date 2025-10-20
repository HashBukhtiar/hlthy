"""
Test the specific "I'm an advanced lifter" scenario
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.trainer_brain import PersonalTrainerBrain
from integration.focus_integration_complete import FocusIntegrationSystem

def test_advanced_lifter_scenario():
    """Test the specific scenario from the user logs"""
    
    integration = FocusIntegrationSystem()
    
    print("🎯 TESTING 'I'm an advanced lifter' SCENARIO")
    print("=" * 60)
    
    # Test the exact message from user logs
    result = integration.handle_workout_request(
        user_id='wJoyJ6XI0ZPdhVV3xtd0evb2gCG3',
        message="I'm an advanced lifter",
        user_profile={}
    )
    
    print(f"Response Type: {result.get('response_type')}")
    print(f"Message: {result.get('message', '')}")
    
    if result.get('extracted_info'):
        print(f"Extracted Info: {result.get('extracted_info')}")
    
    if result.get('follow_up_suggestions'):
        print(f"Suggestions: {result.get('follow_up_suggestions')}")
    
    print("\n" + "=" * 60)
    
    # Test what should happen next when they ask for workout advice
    print("🎯 FOLLOW-UP: Advanced lifter asks for advice")
    
    # Simulate user profile with extracted info
    advanced_profile = {
        'experience_level': 'advanced'
    }
    
    result2 = integration.handle_workout_request(
        user_id='wJoyJ6XI0ZPdhVV3xtd0evb2gCG3',
        message="How do I break through plateaus?",
        user_profile=advanced_profile
    )
    
    print(f"Response Type: {result2.get('response_type')}")
    print(f"Message: {result2.get('message', '')[:200]}...")
    
    print("\n✅ SCENARIO TESTING COMPLETE!")

if __name__ == "__main__":
    test_advanced_lifter_scenario()
