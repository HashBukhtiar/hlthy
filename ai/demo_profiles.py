"""
Demo script for HLTHY Coach User Profile System
Shows how to create profiles, manage injuries, and test the integration
"""

import requests
import json
import time
from datetime import datetime

# API base URL (adjust if needed)
BASE_URL = "http://127.0.0.1:5001"

def test_profile_creation():
    """Test creating a new user profile"""
    print("=== Testing Profile Creation ===")
    
    # Create a new profile
    profile_data = {
        "age": 28,
        "gender": "male",
        "experience_level": "intermediate",
        "primary_goal": "strength",
        "training_frequency": 4
    }
    
    response = requests.post(f"{BASE_URL}/api/profile", json=profile_data)
    
    if response.status_code == 201:
        result = response.json()
        user_id = result["user_id"]
        print(f"✅ Profile created successfully!")
        print(f"   User ID: {user_id}")
        return user_id
    else:
        print(f"❌ Failed to create profile: {response.text}")
        return None

def test_profile_retrieval(user_id):
    """Test getting a user profile"""
    print(f"\n=== Testing Profile Retrieval for {user_id} ===")
    
    response = requests.get(f"{BASE_URL}/api/profile/{user_id}")
    
    if response.status_code == 200:
        result = response.json()
        profile = result["profile"]
        print(f"✅ Profile retrieved successfully!")
        print(f"   Age: {profile.get('age')}")
        print(f"   Experience: {profile.get('experience_level')}")
        print(f"   Primary Goal: {profile.get('goals', {}).get('primary_goal')}")
        print(f"   Active Injuries: {len(profile.get('active_injuries', []))}")
        return profile
    else:
        print(f"❌ Failed to get profile: {response.text}")
        return None

def test_injury_management(user_id):
    """Test adding and managing injuries"""
    print(f"\n=== Testing Injury Management for {user_id} ===")
    
    # Add an elbow injury
    injury_data = {
        "injury_type": "elbow_pain",
        "severity": "moderate",
        "affected_area": "right_elbow",
        "notes": "Pain during overhead movements, started 3 days ago"
    }
    
    response = requests.post(f"{BASE_URL}/api/profile/{user_id}/injury", json=injury_data)
    
    if response.status_code == 201:
        print("✅ Injury added successfully!")
        
        # Get updated profile to see the injury
        profile_response = requests.get(f"{BASE_URL}/api/profile/{user_id}")
        if profile_response.status_code == 200:
            profile = profile_response.json()["profile"]
            active_injuries = profile.get("active_injuries", [])
            if active_injuries:
                injury = active_injuries[0]
                print(f"   Injury Type: {injury['injury_type']}")
                print(f"   Severity: {injury['severity']}")
                print(f"   Banned Exercises: {len(injury.get('banned_exercises', []))} exercises")
                return injury["injury_id"]
            else:
                print("❌ No active injuries found in profile")
                return None
    else:
        print(f"❌ Failed to add injury: {response.text}")
        return None

def test_injury_status_update(user_id, injury_id):
    """Test updating injury status"""
    print(f"\n=== Testing Injury Status Update ===")
    
    update_data = {
        "status": "recovering",
        "notes": "Feeling better, reduced pain during daily activities"
    }
    
    response = requests.put(f"{BASE_URL}/api/profile/{user_id}/injury/{injury_id}", json=update_data)
    
    if response.status_code == 200:
        print("✅ Injury status updated successfully!")
        
        # Verify the update
        profile_response = requests.get(f"{BASE_URL}/api/profile/{user_id}")
        if profile_response.status_code == 200:
            profile = profile_response.json()["profile"]
            active_injuries = profile.get("active_injuries", [])
            if active_injuries:
                injury = active_injuries[0]
                print(f"   New Status: {injury['status']}")
                print(f"   Notes: {injury.get('notes', 'No notes')}")
    else:
        print(f"❌ Failed to update injury status: {response.text}")

def test_chat_with_profile(user_id):
    """Test chat functionality using user profile"""
    print(f"\n=== Testing Chat with User Profile {user_id} ===")
    
    # Test with a workout request
    chat_data = {
        "user_id": user_id,
        "history": [
            {
                "role": "user",
                "text": "I need a upper body workout for today. Keep in mind I have some elbow pain."
            }
        ]
    }
    
    response = requests.post(f"{BASE_URL}/api/chat", json=chat_data)
    
    if response.status_code == 200:
        result = response.json()
        coach_response = result["text"]
        print("✅ Chat with profile successful!")
        print(f"   Coach Response Preview: {coach_response[:200]}...")
        
        # Check if response mentions safety considerations
        if "elbow" in coach_response.lower() or "avoid" in coach_response.lower():
            print("✅ Response includes injury-aware recommendations!")
        
        return coach_response
    else:
        print(f"❌ Chat failed: {response.text}")
        return None

def test_chat_without_profile():
    """Test chat functionality without user profile (fallback)"""
    print(f"\n=== Testing Chat without User Profile (Fallback) ===")
    
    chat_data = {
        "history": [
            {
                "role": "user", 
                "text": "I'm a beginner and want to start working out. I have knee pain though."
            }
        ]
    }
    
    response = requests.post(f"{BASE_URL}/api/chat", json=chat_data)
    
    if response.status_code == 200:
        result = response.json()
        coach_response = result["text"]
        print("✅ Chat without profile successful!")
        print(f"   Coach Response Preview: {coach_response[:200]}...")
        
        # Check if response infers beginner and knee considerations
        if "beginner" in coach_response.lower() and "knee" in coach_response.lower():
            print("✅ Response correctly infers context from conversation!")
        
        return coach_response
    else:
        print(f"❌ Chat failed: {response.text}")
        return None

def test_profile_listing():
    """Test listing all profiles"""
    print(f"\n=== Testing Profile Listing ===")
    
    response = requests.get(f"{BASE_URL}/api/profiles")
    
    if response.status_code == 200:
        result = response.json()
        profile_ids = result["profile_ids"]
        count = result["count"]
        print(f"✅ Profile listing successful!")
        print(f"   Total Profiles: {count}")
        print(f"   Profile IDs: {profile_ids}")
        return profile_ids
    else:
        print(f"❌ Failed to list profiles: {response.text}")
        return []

def main():
    """Run all profile system tests"""
    print("🏋️ HLTHY Coach Profile System Demo")
    print("=" * 50)
    
    # Test basic API health
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 200:
            print("✅ API is running and healthy!")
        else:
            print("❌ API health check failed")
            return
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API. Is the server running?")
        return
    
    # Run profile system tests
    user_id = test_profile_creation()
    if not user_id:
        print("❌ Cannot continue without valid user profile")
        return
    
    profile = test_profile_retrieval(user_id)
    if not profile:
        print("❌ Cannot continue without profile data")
        return
        
    injury_id = test_injury_management(user_id)
    if injury_id:
        test_injury_status_update(user_id, injury_id)
    
    # Test chat functionality
    test_chat_with_profile(user_id)
    test_chat_without_profile()
    
    # Test admin functionality
    test_profile_listing()
    
    print("\n" + "=" * 50)
    print("🎉 Profile System Demo Complete!")
    print(f"📝 Test profile created with ID: {user_id}")
    print("💡 Try testing the API endpoints manually or integrate with your frontend!")

if __name__ == "__main__":
    main()
