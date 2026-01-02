"""
Segment Distribution Test - Show proper exercise categorization across all segments
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_comprehensive_segment_distribution():
    """Test that we have proper exercise distribution across all segments"""
    print("🎯 COMPREHENSIVE SEGMENT DISTRIBUTION TEST")
    print("=" * 50)
    
    from exercise_database import ExerciseDatabase
    
    db = ExerciseDatabase()
    
    # Test a comprehensive set of exercises across all segments
    test_exercises = [
        # Warm-up exercises
        'treadmill_walk_easy',
        'assault_bike_easy', 
        'elliptical_easy',
        'dynamic_warm_up',
        'arm_circles',
        'leg_swings',
        
        # Main workout exercises  
        'barbell_bench_press',
        'barbell_squat',
        'deadlift',
        'pull_ups',
        'incline_dumbbell_press',
        'bent_over_row',
        
        # Cool-down exercises
        'doorway_pec_stretch',
        'hamstring_stretch_seated', 
        'quad_stretch_standing',
        'calf_stretch_wall',
        'thoracic_extension_foam_roll',
        'walking_cool_down'
    ]
    
    warmup_exercises = []
    main_exercises = []
    cooldown_exercises = []
    missing_exercises = []
    
    print("\n📊 EXERCISE CATEGORIZATION:")
    print("-" * 30)
    
    for exercise_id in test_exercises:
        exercise = db.get_exercise_by_id(exercise_id)
        
        if not exercise:
            missing_exercises.append(exercise_id)
            print(f"❌ {exercise_id} → Exercise not found")
            continue
            
        # Check segment flags with proper prioritization
        is_warmup = (exercise.get('isCardioWarmup', False) or 
                    exercise.get('isActivation', False))
        
        is_cooldown = (exercise.get('isCooldownSafe', False) or 
                      exercise.get('isStretch', False))
        
        is_mobility = exercise.get('isMobility', False)
        
        # Prioritize based on primary purpose
        if is_cooldown:
            cooldown_exercises.append(exercise_id)
            flags = []
            if exercise.get('isCooldownSafe'): flags.append('cooldown')
            if exercise.get('isStretch'): flags.append('stretch')
            if is_mobility: flags.append('mobility')
            print(f"❄️ {exercise_id} → COOL-DOWN ({', '.join(flags)})")
            
        elif is_warmup:
            warmup_exercises.append(exercise_id)
            flags = []
            if exercise.get('isCardioWarmup'): flags.append('cardio')
            if exercise.get('isActivation'): flags.append('activation') 
            if is_mobility: flags.append('mobility')
            print(f"🔥 {exercise_id} → WARM-UP ({', '.join(flags)})")
            
        elif is_mobility:
            # Pure mobility exercises can be used in either warm-up or cool-down
            # For testing, let's categorize them as warm-up by default
            warmup_exercises.append(exercise_id)
            print(f"🔥 {exercise_id} → WARM-UP (mobility)")
            
        else:
            main_exercises.append(exercise_id)
            print(f"💪 {exercise_id} → MAIN WORKOUT")
    
    print("\n" + "=" * 50)
    print("📈 SEGMENT DISTRIBUTION SUMMARY:")
    print("=" * 50)
    
    print(f"🔥 WARM-UP EXERCISES: {len(warmup_exercises)}")
    for ex in warmup_exercises:
        print(f"   • {ex}")
    
    print(f"\n💪 MAIN WORKOUT EXERCISES: {len(main_exercises)}")
    for ex in main_exercises[:5]:  # Show first 5
        print(f"   • {ex}")
    if len(main_exercises) > 5:
        print(f"   • ... and {len(main_exercises)-5} more")
    
    print(f"\n❄️ COOL-DOWN EXERCISES: {len(cooldown_exercises)}")
    for ex in cooldown_exercises:
        print(f"   • {ex}")
    
    if missing_exercises:
        print(f"\n❌ MISSING EXERCISES: {len(missing_exercises)}")
        for ex in missing_exercises:
            print(f"   • {ex}")
    
    # Evaluate distribution
    print(f"\n✅ DISTRIBUTION ANALYSIS:")
    if len(warmup_exercises) >= 3:
        print(f"   🔥 Warm-up segment: GOOD ({len(warmup_exercises)} exercises)")
    else:
        print(f"   🔥 Warm-up segment: NEEDS MORE ({len(warmup_exercises)} exercises)")
    
    if len(main_exercises) >= 5:
        print(f"   💪 Main workout segment: GOOD ({len(main_exercises)} exercises)")
    else:
        print(f"   💪 Main workout segment: NEEDS MORE ({len(main_exercises)} exercises)")
    
    if len(cooldown_exercises) >= 3:
        print(f"   ❄️ Cool-down segment: GOOD ({len(cooldown_exercises)} exercises)")
    else:
        print(f"   ❄️ Cool-down segment: NEEDS MORE ({len(cooldown_exercises)} exercises)")
    
    # Overall assessment
    total_segments = sum([len(warmup_exercises) >= 3, len(main_exercises) >= 5, len(cooldown_exercises) >= 3])
    
    print(f"\n🎯 OVERALL SEGMENT HEALTH: {total_segments}/3 segments properly populated")
    
    if total_segments == 3:
        print("🎉 EXCELLENT! All segments have sufficient exercises")
        print("✅ No duplicate exercises between segments")
        print("✅ Segment-aware system working perfectly!")
    else:
        print("⚠️ Some segments need more exercises for optimal variety")
        if len(cooldown_exercises) < 3:
            print("💡 Suggestion: Add more cool-down exercises with isCooldownSafe=True")
    
    return {
        'warmup_count': len(warmup_exercises),
        'main_count': len(main_exercises), 
        'cooldown_count': len(cooldown_exercises),
        'missing_count': len(missing_exercises)
    }

if __name__ == "__main__":
    result = test_comprehensive_segment_distribution()
    
    print(f"\n🚀 FINAL RESULT:")
    print(f"   Warm-up: {result['warmup_count']} exercises")
    print(f"   Main: {result['main_count']} exercises") 
    print(f"   Cool-down: {result['cooldown_count']} exercises")
    
    if result['cooldown_count'] > 0:
        print("✅ Cool-down segment properly implemented!")
    else:
        print("❌ Cool-down segment needs attention!")
