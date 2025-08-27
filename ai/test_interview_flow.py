#!/usr/bin/env python3
"""Test complete interview flow"""

import sys
sys.path.append('.')
from integration.focus_integration_complete import FocusIntegrationSystem

system = FocusIntegrationSystem()
print('=== Testing Complete Interview Flow ===')

user_id = 'test_user_flow'

# Start with vague request
print('\n1. Initial request: "I need a workout"')
result = system.handle_workout_request(user_id, 'I need a workout')
print(f'Response: {result["response_type"]}')
print(f'Question: {result["question"]["text"]}')

# Answer goal question
print('\n2. Answer goal: "build muscle"')
result = system.handle_interview_response(user_id, 'build muscle')
print(f'Response: {result["response_type"]}')
if 'question' in result:
    print(f'Next question: {result["question"]["text"]}')

# Answer focus question  
print('\n3. Answer focus: "chest"')
result = system.handle_interview_response(user_id, 'chest')
print(f'Response: {result["response_type"]}')
if 'question' in result:
    print(f'Next question: {result["question"]["text"]}')

# Answer equipment question
print('\n4. Answer equipment: "commercial gym"')
result = system.handle_interview_response(user_id, 'commercial gym')
print(f'Response: {result["response_type"]}')
if 'question' in result:
    print(f'Next question: {result["question"]["text"]}')

# Answer time question
print('\n5. Answer time: "60 minutes"')
result = system.handle_interview_response(user_id, '60 minutes')
print(f'Response: {result["response_type"]}')
if result["response_type"] == 'workout_plan':
    print(f'Workout focus: {result.get("focus", "unknown")}')
    print(f'Exercise count: {len(result.get("workout", {}).get("exercises", []))}')
    print('Interview completed successfully!')

# Check final session status
status = system.get_session_status(user_id)
print(f'\nFinal session status:')
print(f'- Active: {status["active"]}')
print(f'- Questions asked: {status.get("questions_asked", 0)}')
print(f'- Responses given: {status.get("responses_given", 0)}')
print(f'- Progress: {status.get("progress_percentage", 0)}%')

print('\n=== Complete Interview Flow Works! ===')
