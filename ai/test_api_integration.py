#!/usr/bin/env python3
"""
Test Focus Planner API Integration
"""
import requests
import json
import time

print("🚀 Testing Focus Planner API Integration")
print("=" * 40)

# Test data
test_messages = [
    {"user_message": "I need a chest workout", "user_id": "test_user_1"},
    {"user_message": "Give me back and biceps routine", "user_id": "test_user_2"},
    {"user_message": "Create a full body workout", "user_id": "test_user_3"},
    {"user_message": "Hello, how are you?", "user_id": "test_user_4"}  # Non-workout message
]

# Check if API server is running
api_url = "http://localhost:8080/api/chat"

print("🔍 Testing Focus Planner API integration...")

for i, test_data in enumerate(test_messages, 1):
    print(f"\n📝 Test {i}: '{test_data['user_message']}'")
    
    try:
        response = requests.post(api_url, json=test_data, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            
            # Check if Focus Planner was invoked
            if result.get('focus_enhanced'):
                focus_result = result.get('focus_result', {})
                focus = focus_result.get('focus', 'Unknown')
                whitelist_count = len(focus_result.get('whitelist_result', {}).get('allowed_exercises', []))
                print(f"   ✅ Focus enhanced: {focus} ({whitelist_count} exercises)")
                print(f"   📊 Enhanced prompt length: {len(result.get('enhanced_prompt', ''))}")
            else:
                print(f"   ⚠️  Not focus enhanced (normal AI response)")
                print(f"   📨 Response preview: {result.get('response', '')[:100]}...")
                
        else:
            print(f"   ❌ API Error: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print(f"   ⚠️  API server not running - skipping API test")
        break
    except Exception as e:
        print(f"   ❌ Error: {e}")

print(f"\n💡 To start the API server, run:")
print(f"   python vertex_testing.py")
print(f"   Then test with: curl -X POST http://localhost:8080/api/chat -H 'Content-Type: application/json' -d '{{\"user_message\": \"I need a chest workout\", \"user_id\": \"test_user\"}}'")
