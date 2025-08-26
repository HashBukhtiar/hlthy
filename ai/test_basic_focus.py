#!/usr/bin/env python3
"""
Basic Focus Planner functionality test
"""

print("🎯 Testing Focus Planner Core Functionality")
print("=" * 50)

# Test 1: Focus Rules
try:
    from focus_rules import normalize_focus, parse_combo, BASE_FOCI
    print("✅ focus_rules imported successfully")
    
    # Test normalization
    test_focus = normalize_focus("Chest")
    print(f"   normalize_focus('Chest') = '{test_focus}'")
    
    # Test combo parsing  
    combo1 = parse_combo("back and biceps")
    combo2 = parse_combo("hamstrings-focused back day")
    print(f"   parse_combo('back and biceps') = {combo1}")
    print(f"   parse_combo('hamstrings-focused back day') = {combo2}")
    
    # Test base foci
    print(f"   Available base foci: {len(BASE_FOCI)} types")
    print(f"   Sample foci: {BASE_FOCI[:5]}")
    
except Exception as e:
    print(f"❌ focus_rules failed: {e}")

print()

# Test 2: Focus Composer
try:
    from focus_composer import get_slot_template_for_focus
    print("✅ focus_composer imported successfully")
    
    # Test slot template generation
    chest_template = get_slot_template_for_focus("chest")
    print(f"   chest template has {len(chest_template)} slots")
    print(f"   first slot pattern: {chest_template[0]['pattern']}")
    
except Exception as e:
    print(f"❌ focus_composer failed: {e}")

print()

# Test 3: Focus Rubrics
try:
    from focus_rubrics import get_rubric_for_focus
    print("✅ focus_rubrics imported successfully")
    
    # Test rubric generation
    chest_rubric = get_rubric_for_focus("chest")
    print(f"   chest rubric length: {len(chest_rubric)} characters")
    print(f"   contains exercise ID rule: {'allowedExercises_focus[]' in chest_rubric}")
    
except Exception as e:
    print(f"❌ focus_rubrics failed: {e}")

print()

# Test 4: Focus Rulesets
try:
    from focus_rulesets import FocusRuleset
    print("✅ focus_rulesets imported successfully")
    
    # Test ruleset creation
    ruleset = FocusRuleset("intermediate")
    limits = ruleset.get_exercise_limits("chest")
    print(f"   intermediate chest limits: {limits}")
    
except Exception as e:
    print(f"❌ focus_rulesets failed: {e}")

print()
print("🎯 Basic functionality test completed!")
