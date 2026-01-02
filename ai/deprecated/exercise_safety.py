"""
Exercise Safety Guidelines - Legacy safety system for backward compatibility
"""

EXERCISE_SAFETY_GUIDELINES = """
General Exercise Safety Guidelines:

1. Warm-up: Always perform 5-10 minutes of light cardio and dynamic stretching
2. Progressive overload: Increase weight/reps gradually (2.5-5% weekly)  
3. Proper form: Master bodyweight/light weight movements before adding load
4. Recovery: Allow 48-72 hours rest between training same muscle groups
5. Listen to body: Stop if sharp pain, dizziness, or unusual discomfort occurs

Injury-Specific Guidelines:
- Lower back: Avoid spine flexion under load, focus on neutral spine
- Shoulder: Avoid overhead movements if impingement, focus on scapular stability  
- Knee: Avoid deep knee flexion if pain, focus on hip mobility and glute strength
- Elbow: Avoid gripping-intensive exercises if tendonitis, focus on wrist mobility

High-Risk Exercises for Beginners:
- Behind-neck movements (press, pulldowns)
- Upright rows (shoulder impingement risk)
- Kipping pull-ups (shoulder/back injury risk)
- Heavy overhead squats (mobility requirements)
- Weighted spinal flexion (sit-ups with weight)

Equipment Safety:
- Check equipment for wear/damage before use
- Use safety bars/pins for heavy squats and bench press
- Have spotter for free weight exercises near failure
- Maintain equipment according to manufacturer specifications
"""

def get_safety_context_for_injury(injury_type: str) -> dict:
    """Get safety recommendations for specific injury types"""
    
    safety_recommendations = {
        "lower_back_pain": {
            "avoid": [
                "deadlifts", "bent_over_rows", "good_mornings", 
                "weighted_sit_ups", "leg_press_deep", "heavy_squats"
            ],
            "prefer": [
                "planks", "bird_dogs", "dead_bugs", "glute_bridges",
                "wall_sits", "bodyweight_squats", "supported_rows"
            ],
            "modifications": [
                "Keep neutral spine position",
                "Avoid spinal flexion under load",
                "Focus on core stabilization",
                "Use back support when possible"
            ]
        },
        
        "shoulder_pain": {
            "avoid": [
                "overhead_press", "behind_neck_press", "lateral_raises_above_shoulder",
                "upright_rows", "bench_press_wide_grip", "dips"
            ],
            "prefer": [
                "supported_rows", "chest_press_machine", "lat_pulldown_front",
                "cable_chest_fly", "external_rotations", "band_pull_aparts"
            ],
            "modifications": [
                "Keep arms below shoulder level",
                "Use neutral grip when possible",
                "Focus on scapular stability",
                "Avoid extreme ranges of motion"
            ]
        },
        
        "knee_pain": {
            "avoid": [
                "deep_squats", "lunges_deep", "leg_extensions", 
                "high_impact_jumping", "running_on_hard_surfaces"
            ],
            "prefer": [
                "partial_squats", "wall_sits", "glute_bridges",
                "hamstring_curls", "calf_raises", "swimming"
            ],
            "modifications": [
                "Limit knee flexion to pain-free range",
                "Focus on hip and ankle mobility",
                "Strengthen glutes and hamstrings",
                "Use low-impact alternatives"
            ]
        },
        
        "elbow_pain": {
            "avoid": [
                "heavy_curls", "tricep_dips", "overhead_extensions",
                "grip_intensive_exercises", "pull_ups_overhand"
            ],
            "prefer": [
                "hammer_curls_light", "cable_exercises", "machine_exercises",
                "neutral_grip_movements", "isometric_holds"
            ],
            "modifications": [
                "Use neutral or hammer grip",
                "Avoid full elbow extension under load", 
                "Focus on wrist and forearm mobility",
                "Use lighter weights with higher reps"
            ]
        },
        
        "wrist_pain": {
            "avoid": [
                "push_ups_flat_palm", "overhead_press", "heavy_gripping",
                "wrist_curls", "pull_ups_narrow_grip"
            ],
            "prefer": [
                "push_ups_on_fists", "neutral_grip_exercises", "machine_exercises",
                "cable_movements", "resistance_bands"
            ],
            "modifications": [
                "Use wrist wraps for support",
                "Maintain neutral wrist position",
                "Avoid excessive wrist extension/flexion",
                "Focus on forearm strengthening"
            ]
        }
    }
    
    # Normalize injury type
    injury_key = injury_type.lower().replace(" ", "_")
    
    return safety_recommendations.get(injury_key, {
        "avoid": [],
        "prefer": [],
        "modifications": ["Consult with healthcare professional for specific guidance"]
    })
