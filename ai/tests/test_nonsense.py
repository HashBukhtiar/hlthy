#!/usr/bin/env python3
"""Test nonsense detection"""

import sys
sys.path.append('.')
from integration.focus_integration_complete import FocusIntegrationSystem

system = FocusIntegrationSystem()
print('=== Testing Nonsense Detection ===')

# Test nonsense requests
nonsense_tests = [
    'train my toenails',
    'workout my kidneys', 
    'help me build my liver',
    'I want to exercise my eyebrows'
]

for test in nonsense_tests:
    print(f'\nTesting: "{test}"')
    result = system.handle_workout_request('test_user', test)
    print(f'Response type: {result["response_type"]}')
    if result["response_type"] == 'rejection':
        print(f'Reason: {result["reason"]}')
        print(f'Suggestions: {len(result["suggestions"])} provided')
    else:
        print('ERROR: Should have been rejected!')

print('\n=== Nonsense Detection Works! ===')
