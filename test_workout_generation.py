"""
Quick test to see if AI generates structured workouts now
"""
import sys
import os
sys.path.insert(0, 'ai')

# Setup Gemini
import google.generativeai as genai
from core.ai_orchestrator import AIOrchestrator
from utils.user_profiles import UserProfileManager, UserProfile

# Configure Gemini (you'll need API key in environment)
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    print("❌ Set GEMINI_API_KEY environment variable first!")
    sys.exit(1)

genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.0-flash-exp')

# Create test user profile
profile_manager = UserProfileManager()
test_user_id = "test_workout_user"

# Create profile with constraints
profile = UserProfile(user_id=test_user_id)
profile.dislikes = ["burpees", "jumping jacks"]
profile.experience_level = "intermediate"
profile_manager.save_profile(profile)

print("=" * 70)
print("🏋️  TESTING AI WORKOUT GENERATION")
print("=" * 70)

print(f"\n👤 Test User Profile:")
print(f"   - Dislikes: {profile.dislikes}")
print(f"   - Experience: {profile.experience_level}")

# Initialize orchestrator
orchestrator = AIOrchestrator(gemini_model=model)

# Test workout request
test_message = "Give me a chest and triceps workout"
print(f"\n💬 User Message: \"{test_message}\"")
print(f"\n🤖 Processing...")

try:
    result = orchestrator.process_message(
        user_id=test_user_id,
        message=test_message,
        context_data={}
    )
    
    print(f"\n✅ RESPONSE RECEIVED:")
    print(f"\nType: {result.get('type')}")
    print(f"\nMessage: {result.get('message', '')[:200]}...")
    
    if result.get('type') == 'workout_plan' and 'workout' in result:
        workout = result['workout']
        print(f"\n🏋️  STRUCTURED WORKOUT GENERATED:")
        print(f"   Name: {workout.get('name')}")
        print(f"   Focus: {workout.get('focus')}")
        print(f"   Duration: {workout.get('duration_minutes')} minutes")
        print(f"   Difficulty: {workout.get('difficulty')}")
        print(f"   Exercises: {len(workout.get('exercises', []))}")
        
        print(f"\n📋 EXERCISES:")
        for i, ex in enumerate(workout.get('exercises', []), 1):
            print(f"\n   {i}. {ex.get('name')}")
            print(f"      Sets: {ex.get('sets')} x {ex.get('reps')} reps")
            print(f"      Rest: {ex.get('rest_seconds')}s")
            print(f"      Muscles: {', '.join(ex.get('muscle_groups', []))}")
            print(f"      Notes: {ex.get('notes', '')[:60]}...")
        
        # Check if it avoided dislikes
        exercise_names = [ex.get('name', '').lower() for ex in workout.get('exercises', [])]
        disliked_found = []
        for dislike in profile.dislikes:
            if any(dislike.lower() in name for name in exercise_names):
                disliked_found.append(dislike)
        
        if disliked_found:
            print(f"\n❌ WARNING: Found disliked exercises: {disliked_found}")
        else:
            print(f"\n✅ SUCCESS: Avoided all disliked exercises!")
        
    else:
        print(f"\n⚠️  No structured workout generated")
        print(f"   Response type: {result.get('type')}")
        print(f"   Full response: {result}")

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
