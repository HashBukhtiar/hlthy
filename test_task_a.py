#!/usr/bin/env python3
"""
Test A.2: Pattern Matching Validation
"""

import sys
import os
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from ai.core.exercise_database import CANONICAL_EXERCISES
from ai.core.focus_composer import _matches_pattern

def test_pattern_matching():
    """Test the _matches_pattern function with canonical movement patterns"""
    
    print("🧪 Testing Pattern Matching (Task A.2)")
    
    # Test 1: Single pattern match
    barbell_bench = "barbell_bench_press"
    if barbell_bench in CANONICAL_EXERCISES:
        result = _matches_pattern(barbell_bench, "horizontal_press")
        print(f"✓ Single pattern: {barbell_bench} matches 'horizontal_press' = {result}")
        assert result == True, "Barbell bench should match horizontal_press"
    
    # Test 2: OR pattern match (horizontal_press|incline_press)
    if barbell_bench in CANONICAL_EXERCISES:
        result = _matches_pattern(barbell_bench, "horizontal_press|incline_press")
        print(f"✓ OR pattern: {barbell_bench} matches 'horizontal_press|incline_press' = {result}")
        assert result == True, "Barbell bench should match horizontal_press|incline_press"
    
    # Test 3: Non-matching pattern
    if barbell_bench in CANONICAL_EXERCISES:
        result = _matches_pattern(barbell_bench, "vertical_pull|row")
        print(f"✓ Non-match: {barbell_bench} matches 'vertical_pull|row' = {result}")
        assert result == False, "Barbell bench should NOT match vertical_pull|row"
    
    # Test 4: Multiple exercises with different patterns
    test_cases = [
        ("pull_ups", "vertical_pull", True),
        ("pull_ups", "vertical_pull|horizontal_pull", True),
        ("pull_ups", "horizontal_press|incline_press", False),
        ("lateral_raise", "lateral_delt", True),
        ("leg_extension", "quad_iso", True),
        ("leg_curl_machine", "ham_iso", True),
    ]
    
    for exercise_id, pattern, expected in test_cases:
        if exercise_id in CANONICAL_EXERCISES:
            result = _matches_pattern(exercise_id, pattern)
            status = "✓" if result == expected else "❌"
            print(f"{status} {exercise_id} matches '{pattern}' = {result} (expected {expected})")
            if result != expected:
                print(f"   Exercise patterns: {CANONICAL_EXERCISES[exercise_id].movement_patterns}")
    
    print("\n✅ Pattern matching tests completed!")

def test_taxonomy_unification():
    """Test that all exercises have canonical movement patterns"""
    
    print("\n🧪 Testing Taxonomy Unification (Task A.1)")
    
    from ai.core.focus_rules import MOVEMENT_PATTERNS
    
    canonical_patterns = set(MOVEMENT_PATTERNS)
    
    issues = []
    
    for exercise_id, exercise in CANONICAL_EXERCISES.items():
        # Check that exercise has movement_patterns
        if not hasattr(exercise, 'movement_patterns'):
            issues.append(f"❌ {exercise_id}: missing movement_patterns field")
            continue
            
        # Check that all patterns are canonical
        for pattern in exercise.movement_patterns:
            if pattern not in canonical_patterns:
                issues.append(f"❌ {exercise_id}: non-canonical pattern '{pattern}'")
    
    if issues:
        print("Issues found:")
        for issue in issues[:10]:  # Show first 10
            print(issue)
        if len(issues) > 10:
            print(f"... and {len(issues) - 10} more issues")
    else:
        print("✅ All exercises have canonical movement patterns!")
    
    print(f"📊 Checked {len(CANONICAL_EXERCISES)} exercises")
    print(f"📊 Found {len(issues)} taxonomy issues")

if __name__ == "__main__":
    test_pattern_matching()
    test_taxonomy_unification()
