#!/usr/bin/env python3
"""Test the interview system functionality"""

import sys
sys.path.append('.')
from integration.focus_integration_complete import FocusIntegrationSystem

# Test the interview system
system = FocusIntegrationSystem()
print('=== Testing Interview System ===')

# Test 1: Vague request should trigger interview
print('\n1. Testing vague request: "I want to workout"')
result = system.handle_workout_request('test_user', 'I want to workout')
print(f'Response type: {result["response_type"]}')
print(f'Message: {result["message"]}')
if 'question' in result:
    print(f'Question type: {result["question"]["type"]}')
    print(f'Question text: {result["question"]["text"]}')

# Test 2: Specific request should work directly  
print('\n2. Testing specific request: "chest workout"')
result2 = system.handle_workout_request('test_user2', 'chest workout')
print(f'Response type: {result2["response_type"]}')
print(f'Focus detected: {result2.get("focus", "none")}')
print(f'Confidence: {result2.get("confidence", "unknown")}')

# Test 3: Interview response if we have a session
if 'session_id' in result:
    print('\n3. Testing interview response: "build muscle"')
    response = system.handle_interview_response('test_user', 'build muscle')
    print(f'Response type: {response["response_type"]}')
    if 'question' in response:
        print(f'Next question type: {response["question"]["type"]}')
        print(f'Next question text: {response["question"]["text"]}')

# Test 4: Check session status
print('\n4. Testing session status')
status = system.get_session_status('test_user')
print(f'Session active: {status["active"]}')
if status["active"]:
    print(f'Questions asked: {status["questions_asked"]}')
    print(f'Responses given: {status["responses_given"]}')

print('\n=== Interview System Works! ===')
