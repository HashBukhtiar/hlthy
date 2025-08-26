#!/usr/bin/env python3
"""
Debug Focus Rules Test Failure
"""
print("🔍 Debugging Focus Rules Test Failure")
print("=" * 40)

from focus_rules import normalize_focus, parse_combo, BASE_FOCI

print("Testing normalize_focus():")
print(f"  normalize_focus('CHEST') = '{normalize_focus('CHEST')}'")
print(f"  normalize_focus('Upper Body') = '{normalize_focus('Upper Body')}'")

print(f"\nTesting parse_combo():")
combo = parse_combo("back+biceps")
print(f"  parse_combo('back+biceps') = {combo}")

print(f"\nTesting BASE_FOCI structure:")
print(f"  Type: {type(BASE_FOCI)}")
print(f"  Length: {len(BASE_FOCI) if hasattr(BASE_FOCI, '__len__') else 'No length'}")
print(f"  First few items: {BASE_FOCI[:5] if isinstance(BASE_FOCI, list) else BASE_FOCI}")

# Test specific conditions that failed
print(f"\n🔍 Detailed failure analysis:")
print(f"  normalize_focus('CHEST') == 'chest': {normalize_focus('CHEST') == 'chest'}")
print(f"  normalize_focus('Upper Body') == 'upper': {normalize_focus('Upper Body') == 'upper'}")

combo_result = parse_combo("back+biceps")
if combo_result:
    print(f"  parse_combo result exists: True")
    print(f"  combo[0] == 'back': {combo_result[0] == 'back'}")
    print(f"  combo[1] == 'biceps': {combo_result[1] == 'biceps'}")
else:
    print(f"  parse_combo result exists: False")

print(f"  isinstance(BASE_FOCI, list): {isinstance(BASE_FOCI, list)}")
print(f"  len(BASE_FOCI) >= 15: {len(BASE_FOCI) >= 15 if hasattr(BASE_FOCI, '__len__') else 'Cannot check length'}")
