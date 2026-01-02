#!/usr/bin/env python3
"""
Script to add movement_patterns to all exercises in exercise_database.py
"""

import re
import sys
import os

# Add parent directory to path for imports
parent_dir = os.path.dirname(os.path.abspath(__file__))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

# Movement pattern mapping based on exercise names and muscle groups
EXERCISE_PATTERNS = {
    # Horizontal pressing
    "bench_press": {"horizontal_press"},
    "push_ups": {"horizontal_press"},
    "machine_chest_press": {"horizontal_press"},
    "pec_deck": {"fly"},
    "chest_fly": {"fly"},
    "cable_fly": {"fly"},
    "cable_crossover": {"fly"},
    "dips": {"horizontal_press"},
    
    # Incline pressing
    "incline": {"incline_press"},
    
    # Vertical pressing
    "overhead_press": {"vertical_press"},
    "shoulder_press": {"vertical_press"},
    "behind_neck_press": {"vertical_press"},
    
    # Vertical pulling
    "pull_ups": {"vertical_pull"},
    "pulldown": {"vertical_pull"},
    "pullover": {"pullover"},
    
    # Horizontal pulling/rowing
    "row": {"row", "horizontal_pull"},
    "face_pulls": {"horizontal_pull"},
    
    # Squatting
    "squat": {"squat"},
    
    # Leg press
    "leg_press": {"leg_press"},
    
    # Hinging
    "deadlift": {"hinge"},
    "hip_thrust": {"hinge"},
    "glute_bridge": {"hinge"},
    "kettlebell_swing": {"hinge"},
    
    # Lunging
    "lunge": {"lunge"},
    "split_squat": {"lunge"},
    
    # Isolation movements
    "leg_extension": {"quad_iso"},
    "leg_curl": {"ham_iso"},
    "lateral_raise": {"lateral_delt"},
    "front_raise": {"front_delt"},
    "reverse_fly": {"rear_delt"},
    "reverse_pec_deck": {"rear_delt"},
    "bicep_curls": {"biceps"},
    "hammer_curls": {"biceps"},
    "preacher_curl": {"biceps"},
    "cable_curls": {"biceps"},
    "tricep": {"triceps"},
    "calf": {"calf"},
    "hip_abduction": {"glute_iso"},
    "hip_adduction": {"glute_iso"},
    
    # Core
    "plank": {"core_anti_extension"},
    "dead_bug": {"core_anti_extension"},
    "hollow_hold": {"core_anti_extension"},
    "bird_dog": {"core_anti_extension"},
    "woodchop": {"core_rotation"},
    "crunch": {"core_flexion"},
    "sit_ups": {"core_flexion"},
}

def determine_movement_patterns(exercise_id, primary_muscles):
    """Determine movement patterns for an exercise based on ID and muscles"""
    patterns = set()
    
    # Check name patterns
    for pattern_key, pattern_set in EXERCISE_PATTERNS.items():
        if pattern_key in exercise_id.lower():
            patterns.update(pattern_set)
    
    # Additional logic based on muscle groups
    if "chest" in primary_muscles and "triceps" in primary_muscles:
        # Likely a pressing movement
        if "incline" in exercise_id:
            patterns.add("incline_press")
        elif "overhead" in exercise_id or "shoulder" in exercise_id:
            patterns.add("vertical_press")
        else:
            patterns.add("horizontal_press")
    
    if "lats" in primary_muscles or "upper_back" in primary_muscles:
        if "pull_up" in exercise_id or "pulldown" in exercise_id:
            patterns.add("vertical_pull")
        elif "row" in exercise_id:
            patterns.add("horizontal_pull")
    
    if "quads" in primary_muscles and "glutes" in primary_muscles:
        if "squat" in exercise_id:
            patterns.add("squat")
        elif "lunge" in exercise_id:
            patterns.add("lunge")
    
    # Fallback: if no patterns found, try to guess from muscles
    if not patterns:
        if "chest" in primary_muscles:
            patterns.add("horizontal_press")
        elif "lats" in primary_muscles:
            patterns.add("vertical_pull")
        elif "quads" in primary_muscles:
            patterns.add("squat")
        elif "hamstrings" in primary_muscles:
            patterns.add("hinge")
    
    return patterns if patterns else {"general"}

def add_movement_patterns_to_file():
    """Read exercise_database.py and add movement_patterns to each exercise"""
    
    file_path = "ai/core/exercise_database.py"
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Pattern to match ExerciseProfile definitions
    exercise_pattern = r'("[\w_]+"):\s*ExerciseProfile\(\s*exercise_id="([\w_]+)",\s*display_name="([^"]+)",\s*common_names=\[[^\]]*\],\s*risk_level=[^,]+,\s*primary_muscles=(\[[^\]]*\]),'
    
    def replace_exercise(match):
        exercise_key = match.group(1)
        exercise_id = match.group(2)
        display_name = match.group(3)
        primary_muscles_str = match.group(4)
        
        # Extract primary muscles
        primary_muscles = eval(primary_muscles_str)  # Safe since we control the input
        
        # Determine movement patterns
        patterns = determine_movement_patterns(exercise_id, primary_muscles)
        patterns_str = "{" + ", ".join(f'"{p}"' for p in sorted(patterns)) + "}"
        
        # Replace the match with updated version
        updated = match.group(0) + f'\n        movement_patterns={patterns_str},'
        return updated
    
    # Only replace exercises that don't already have movement_patterns
    # Look for exercises without movement_patterns field
    exercises_without_patterns = []
    
    # Find all exercise definitions
    matches = list(re.finditer(exercise_pattern, content))
    
    for match in matches:
        # Check if this exercise already has movement_patterns
        start_pos = match.end()
        # Look ahead to find the end of this exercise definition
        next_exercise_match = None
        for next_match in matches:
            if next_match.start() > start_pos:
                next_exercise_match = next_match
                break
        
        if next_exercise_match:
            exercise_def = content[start_pos:next_exercise_match.start()]
        else:
            # This is the last exercise, look for the end of the dictionary
            exercise_def = content[start_pos:content.find('}', start_pos)]
        
        if 'movement_patterns=' not in exercise_def:
            exercises_without_patterns.append(match)
    
    print(f"Found {len(exercises_without_patterns)} exercises without movement_patterns")
    
    # Process each exercise without patterns
    new_content = content
    offset = 0
    
    for match in exercises_without_patterns:
        exercise_id = match.group(2)
        primary_muscles_str = match.group(4)
        
        # Extract primary muscles
        primary_muscles = eval(primary_muscles_str)
        
        # Determine movement patterns
        patterns = determine_movement_patterns(exercise_id, primary_muscles)
        patterns_str = "{" + ", ".join(f'"{p}"' for p in sorted(patterns)) + "}"
        
        # Find the position to insert movement_patterns (after primary_muscles)
        insert_pos = match.end() + offset
        insert_text = f'\n        movement_patterns={patterns_str},'
        
        new_content = new_content[:insert_pos] + insert_text + new_content[insert_pos:]
        offset += len(insert_text)
        
        print(f"Added patterns {patterns} to {exercise_id}")
    
    # Write back to file
    with open(file_path, 'w') as f:
        f.write(new_content)
    
    print(f"✅ Updated {file_path} with movement patterns")

if __name__ == "__main__":
    add_movement_patterns_to_file()
