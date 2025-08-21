#!/usr/bin/env python3
"""
Test script for the HLTHY Coach Intent Classification API

This script demonstrates the intent classification functionality that routes
user messages into the appropriate categories based on the copilot instructions v2.

Intent Categories:
- planner: asking for a workout today, a split, or exercise selection
- technique: asking about form, substitutions due to pain/injury/equipment, or fix-my-lift
- explain: asking for definitions or educational content
- schedule: asking about deloads, weekly layout, rest days, or adherence
- chit_chat: greetings or small talk

The system uses the existing router logic with fallback to keyword-based classification.
"""

import requests
import json
from datetime import datetime

# API endpoint
API_BASE = "http://localhost:5001"
CLASSIFY_ENDPOINT = f"{API_BASE}/api/classify-intent"

def classify_message(message):
    """Classify a message using the intent classification API"""
    try:
        response = requests.post(CLASSIFY_ENDPOINT, 
                               json={"message": message},
                               headers={"Content-Type": "application/json"},
                               timeout=10)
        
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"HTTP {response.status_code}: {response.text}"}
            
    except requests.exceptions.RequestException as e:
        return {"error": f"Request failed: {str(e)}"}

def test_intent_classification():
    """Run tests for different intent categories"""
    
    test_cases = [
        # Planner intents
        ("I need a workout for today", "planner"),
        ("Give me a leg routine", "planner"),
        ("What exercises should I do for chest?", "planner"),
        ("Help me design a push/pull split", "planner"),
        
        # Technique intents
        ("My shoulder hurts when I bench press", "technique"),
        ("How do I fix my squat form?", "technique"),
        ("What can I substitute for deadlifts?", "technique"),
        ("My knee hurts during lunges", "technique"),
        
        # Explain intents
        ("What is progressive overload?", "explain"),
        ("Explain the difference between hypertrophy and strength training", "explain"),
        ("What are compound exercises?", "explain"),
        ("Define RPE", "explain"),
        
        # Schedule intents
        ("When should I take a deload week?", "schedule"),
        ("How many rest days do I need?", "schedule"),
        ("What's the best training frequency?", "schedule"),
        ("Should I train 3 or 4 days per week?", "schedule"),
        
        # Chit-chat intents
        ("Hello!", "chit_chat"),
        ("Good morning!", "chit_chat"),
        ("Thank you so much!", "chit_chat"),
        ("Have a great day!", "chit_chat"),
    ]
    
    print("🏋️ HLTHY Coach Intent Classification Test")
    print("=" * 50)
    print(f"Testing {len(test_cases)} messages...")
    print()
    
    correct = 0
    total = len(test_cases)
    
    for message, expected in test_cases:
        result = classify_message(message)
        
        if "error" in result:
            print(f"❌ ERROR: {message}")
            print(f"   {result['error']}")
        else:
            actual = result.get("intent", "unknown")
            status = "✅" if actual == expected else "⚠️"
            correct += 1 if actual == expected else 0
            
            print(f"{status} {actual.upper()}: {message}")
            if actual != expected:
                print(f"   Expected: {expected}, Got: {actual}")
        print()
    
    accuracy = (correct / total) * 100
    print("=" * 50)
    print(f"Results: {correct}/{total} correct ({accuracy:.1f}% accuracy)")
    
    if accuracy >= 80:
        print("🎉 Great! Intent classification is working well!")
    elif accuracy >= 60:
        print("👍 Good! Most intents are classified correctly.")
    else:
        print("⚠️ Intent classification may need improvement.")

def test_api_health():
    """Test if the API is responsive"""
    try:
        health_response = requests.get(f"{API_BASE}/api/health", timeout=5)
        if health_response.status_code == 200:
            print("✅ API is healthy and responsive")
            return True
        else:
            print(f"❌ API health check failed: {health_response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to API: {e}")
        return False

if __name__ == "__main__":
    print("Starting HLTHY Coach Intent Classification Tests...")
    print()
    
    # Check API health first
    if test_api_health():
        print()
        test_intent_classification()
    else:
        print("Please make sure the HLTHY Coach container is running:")
        print("docker-compose up -d")
