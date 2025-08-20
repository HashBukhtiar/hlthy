# Exercise Safety Guidelines for AI Coach
# This provides safety context for AI exercise recommendations

EXERCISE_SAFETY_GUIDELINES = """
CRITICAL SAFETY RULES FOR EXERCISE RECOMMENDATIONS:

HIGH-RISK EXERCISES (avoid for beginners, use caution for experienced):
- Behind-the-neck press/pulldowns (cervical spine risk)
- Upright rows (shoulder impingement)
- Smith machine squats with feet forward (unnatural movement)
- Loaded spinal flexion (sit-ups with weight)
- Kipping pull-ups (injury risk without proper base)
- Heavy overhead squats (requires extensive mobility)
- Jump squats with heavy weight (joint impact)

INJURY-SPECIFIC CONTRAINDICATIONS:

Shoulder injuries/pain:
- AVOID: overhead pressing, behind-neck movements, wide-grip bench
- PREFER: neutral grip exercises, supported variations, horizontal pulls

Elbow pain/tennis elbow:
- AVOID: overhead pressing, tricep extensions, close-grip movements
- PREFER: hammer curls, neutral grip, eccentric focus

Lower back pain:
- AVOID: loaded spinal flexion, deadlifts from floor initially, heavy overhead
- PREFER: hip hinge patterns, supported variations, core stability

Knee pain:
- AVOID: deep squats, lunges initially, high-impact plyometrics  
- PREFER: partial range of motion, wall sits, quad extensions

Hip pain:
- AVOID: deep hip flexion, heavy squats, aggressive stretching
- PREFER: glute activation, supported movements, gradual progression

BEGINNER SAFETY PRIORITIES:
1. Master bodyweight movements first
2. Learn hip hinge pattern before loaded deadlifts
3. Build base strength before advanced variations
4. Focus on form over weight progression
5. Always include warm-up and mobility work

EQUIPMENT-SPECIFIC SAFETY:
- Free weights: require spotters for heavy pressing
- Machines: generally safer for beginners, less stabilization required
- Bodyweight: master progressions before adding load
- Resistance bands: check for wear, secure anchor points

GENERAL SAFETY PRINCIPLES:
- Progressive overload (gradual increase in demand)
- Adequate recovery between sessions
- Pain vs. discomfort distinction
- Proper warm-up protocols
- Form before intensity
- Listen to body signals
"""

def get_safety_context_for_injury(injury_type):
    """Return specific safety guidelines for injury types"""
    injury_guidelines = {
        "elbow_pain": {
            "avoid": ["overhead_pressing", "tricep_extensions", "close_grip_exercises"],
            "prefer": ["hammer_curls", "neutral_grip", "eccentric_movements"],
            "modifications": ["reduce_range_of_motion", "lighter_weights", "slow_tempo"]
        },
        "shoulder_pain": {
            "avoid": ["overhead_pressing", "behind_neck_movements", "wide_grip_bench"],
            "prefer": ["horizontal_pulls", "supported_movements", "neutral_grip"],
            "modifications": ["limit_overhead", "focus_on_stability", "gradual_progression"]
        },
        "lower_back_pain": {
            "avoid": ["loaded_spinal_flexion", "deadlifts_from_floor", "heavy_overhead"],
            "prefer": ["hip_hinge_patterns", "supported_variations", "core_stability"],
            "modifications": ["partial_range", "lighter_loads", "controlled_tempo"]
        },
        "knee_pain": {
            "avoid": ["deep_squats", "jumping", "high_impact"],
            "prefer": ["partial_squats", "wall_sits", "quad_extensions"],
            "modifications": ["limited_depth", "supported_movements", "low_impact"]
        }
    }
    
    return injury_guidelines.get(injury_type, {
        "avoid": [],
        "prefer": [],
        "modifications": ["conservative_approach", "gradual_progression"]
    })

def assess_exercise_safety(exercise_name, user_profile):
    """Assess safety of specific exercise for user profile"""
    # This would be expanded with more sophisticated logic
    risk_factors = []
    
    if "beginner" in user_profile.get("experience", "").lower():
        if any(high_risk in exercise_name.lower() for high_risk in 
               ["behind-neck", "upright row", "kipping", "heavy overhead"]):
            risk_factors.append("high_risk_for_beginner")
    
    active_injuries = user_profile.get("injuries", [])
    for injury in active_injuries:
        if "elbow" in injury and any(term in exercise_name.lower() for term in ["press", "extension"]):
            risk_factors.append("contraindicated_for_elbow_injury")
    
    return {
        "risk_level": "high" if risk_factors else "low",
        "risk_factors": risk_factors,
        "safe": len(risk_factors) == 0
    }
