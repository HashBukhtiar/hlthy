#!/usr/bin/env python3
"""
Debug Exercise Filtering
"""
from focus_whitelist import build_focus_whitelist

print("🔍 Debug Exercise Filtering")
print("=" * 30)

test_context = {
    "user_id": "test_user",
    "experience_level": "intermediate", 
    "available_equipment": ["dumbbells", "barbell"],
    "preferences": {},
    "limitations": {},
    "goals": {}
}

test_focuses = ['chest', 'back', 'full_body', 'legs']

for focus in test_focuses:
    try:
        whitelist = build_focus_whitelist(test_context, focus)
        print(f"🎯 {focus}: {len(whitelist)} exercises")
        if len(whitelist) > 0:
            print(f"   Examples: {whitelist[:3]}")
        else:
            print("   No exercises found!")
    except Exception as e:
        print(f"❌ {focus}: Error - {e}")
        import traceback
        traceback.print_exc()
        
print("\nLet's also test with minimal context:")
minimal_context = {"user_id": "test_user"}

for focus in test_focuses:
    try:
        whitelist = build_focus_whitelist(minimal_context, focus)
        print(f"🎯 {focus} (minimal): {len(whitelist)} exercises")
    except Exception as e:
        print(f"❌ {focus} (minimal): Error - {e}")
