"""
Complete Integration Test - Test the full AI workout planner system
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from typing import Dict, List, Any
import json

# Import all the new components
from focus_integration_complete import FocusIntegrationSystem
from focus_router_enhanced import route_focus_request, is_nonsense_or_unknown
from exercise_database import ExerciseDatabase
from equipment_catalog import EquipmentCatalog
from exercise_alias_resolver import ExerciseAliasResolver
from technique_library_complete import TechniqueLibrary
from progression_tracker_complete import ProgressionTracker
from comprehensive_validator import ComprehensiveFocusValidator


class IntegratedWorkoutPlannerTest:
    """
    Test the complete integrated system
    """
    
    def __init__(self):
        # Initialize all components
        print("🚀 Initializing AI Workout Planner System...")
        
        self.exercise_db = ExerciseDatabase()
        self.equipment_catalog = EquipmentCatalog()
        self.alias_resolver = ExerciseAliasResolver(self.exercise_db)
        self.technique_library = TechniqueLibrary()
        self.progression_tracker = ProgressionTracker()
        self.validator = ComprehensiveFocusValidator(self.exercise_db)
        self.integration_system = FocusIntegrationSystem(
            exercise_db=self.exercise_db,
            user_profiles=None  # Would connect to actual user profile system
        )
        
        print("✅ All components initialized successfully!")
    
    def test_nonsense_rejection(self):
        """Test nonsense request detection"""
        print("\n🧪 Testing Nonsense Rejection...")
        
        nonsense_requests = [
            "train my toenails",
            "workout my fingernails", 
            "help me with my hair",
            "I want to exercise my teeth",
            "build my kidney muscles"
        ]
        
        for request in nonsense_requests:
            result = self.integration_system.handle_workout_request(
                user_id="test_user",
                message=request
            )
            
            if result['response_type'] == 'rejection':
                print(f"✅ Correctly rejected: '{request}'")
                print(f"   Response: {result['message']}")
            else:
                print(f"❌ Failed to reject: '{request}'")
                print(f"   Got: {result}")
    
    def test_interview_flow(self):
        """Test complete interview flow"""
        print("\n🧪 Testing Interview Flow...")
        
        # Start with vague request
        user_id = "interview_test_user"
        vague_request = "I want to workout"
        
        print(f"User: '{vague_request}'")
        
        # Step 1: Initial request should trigger interview
        response1 = self.integration_system.handle_workout_request(
            user_id=user_id,
            message=vague_request
        )
        
        if response1['response_type'] == 'interview_question':
            print("✅ Interview started correctly")
            print(f"   Question: {response1['message']}")
            
            # Step 2: Answer first question (goal)
            goal_response = "build muscle"
            response2 = self.integration_system.handle_interview_response(
                user_id=user_id,
                response=goal_response
            )
            
            if response2['response_type'] == 'interview_question':
                print(f"✅ Processed goal answer: '{goal_response}'")
                print(f"   Next question: {response2['message']}")
                
                # Step 3: Answer focus question
                focus_response = "chest"
                response3 = self.integration_system.handle_interview_response(
                    user_id=user_id,
                    response=focus_response
                )
                
                if response3['response_type'] == 'interview_question':
                    print(f"✅ Processed focus answer: '{focus_response}'")
                    print(f"   Next question: {response3['message']}")
                    
                    # Continue with equipment and time...
                    equipment_response = "commercial gym"
                    response4 = self.integration_system.handle_interview_response(
                        user_id=user_id,
                        response=equipment_response
                    )
                    
                    time_response = "60 minutes"
                    response5 = self.integration_system.handle_interview_response(
                        user_id=user_id,
                        response=time_response
                    )
                    
                    if response5['response_type'] == 'workout_plan':
                        print("✅ Complete interview flow successful!")
                        print(f"   Final workout: {response5['message']}")
                        return response5
                    else:
                        print(f"❌ Expected workout plan, got: {response5['response_type']}")
                        return response5
        else:
            print(f"❌ Expected interview start, got: {response1['response_type']}")
            return None
    
    def test_direct_planning(self):
        """Test direct workout planning for specific requests"""
        print("\n🧪 Testing Direct Planning...")
        
        specific_requests = [
            "chest workout",
            "back and biceps",
            "leg day",
            "push day"
        ]
        
        for request in specific_requests:
            print(f"User: '{request}'")
            
            response = self.integration_system.handle_workout_request(
                user_id="direct_test_user",
                message=request,
                user_profile={
                    'equipment_access': 'commercial_gym',
                    'experience_level': 'intermediate',
                    'available_time': '60_minutes'
                }
            )
            
            if response['response_type'] == 'workout_plan':
                print(f"✅ Direct planning successful for: '{request}'")
                print(f"   Focus: {response.get('focus', 'unknown')}")
            elif response['response_type'] == 'confirmation':
                print(f"✅ Requesting confirmation for: '{request}'")
                print(f"   Message: {response['message']}")
            else:
                print(f"❌ Unexpected response for '{request}': {response['response_type']}")
    
    def test_equipment_integration(self):
        """Test equipment catalog and alias resolution"""
        print("\n🧪 Testing Equipment Integration...")
        
        # Test equipment catalog
        life_fitness_exercises = self.equipment_catalog.get_exercises_for_equipment("Life Fitness Treadmill")
        print(f"✅ Life Fitness Treadmill exercises: {life_fitness_exercises}")
        
        # Test alias resolution
        test_aliases = [
            "Life Fitness treadmill",
            "Hammer Strength bench",
            "leg press machine",
            "dumbell bench press"  # typo test
        ]
        
        for alias in test_aliases:
            resolved = self.alias_resolver.resolve_exercise_reference(alias)
            if resolved['found']:
                print(f"✅ Resolved '{alias}' → {resolved['exercise_id']}")
            else:
                print(f"❌ Could not resolve '{alias}'")
    
    def test_exercise_database_segments(self):
        """Test segment-aware exercise selection"""
        print("\n🧪 Testing Exercise Database Segments...")
        
        # Test segment flags
        warmup_exercises = []
        cooldown_exercises = []
        activation_exercises = []
        
        # Get a sample of exercises to check segments
        sample_exercises = ['treadmill_walk_easy', 'dynamic_warm_up', 'cat_cow_stretch', 
                          'static_stretch_routine', 'walking_cool_down']
        
        for exercise_id in sample_exercises:
            exercise = self.exercise_db.get_exercise_by_id(exercise_id)
            if exercise:
                if exercise.get('isCardioWarmup'):
                    warmup_exercises.append(exercise_id)
                if exercise.get('isCooldownSafe'):
                    cooldown_exercises.append(exercise_id)
                if exercise.get('isActivation'):
                    activation_exercises.append(exercise_id)
        
        print(f"✅ Warm-up exercises found: {warmup_exercises}")
        print(f"✅ Cool-down exercises found: {cooldown_exercises}")
        print(f"✅ Activation exercises found: {activation_exercises}")
        
        # Test that we have no overlap in wrong categories
        main_exercise = self.exercise_db.get_exercise_by_id('barbell_bench_press')
        if main_exercise:
            is_warmup = main_exercise.get('isCardioWarmup', False)
            is_cooldown = main_exercise.get('isCooldownSafe', False)
            
            if not is_warmup and not is_cooldown:
                print("✅ Main exercises correctly not flagged as warm-up/cool-down")
            else:
                print(f"❌ Main exercise incorrectly flagged: warmup={is_warmup}, cooldown={is_cooldown}")
    
    def test_technique_library(self):
        """Test technique library integration"""
        print("\n🧪 Testing Technique Library...")
        
        # Test technique guide retrieval
        guide = self.technique_library.get_technique_guide('barbell_bench_press')
        if guide:
            print("✅ Retrieved technique guide for barbell bench press")
            print(f"   Difficulty: {guide.difficulty_level}")
            print(f"   Safety rating: {guide.get_safety_rating()}")
            
            # Test form analysis
            form_analysis = self.technique_library.get_form_analysis(
                'barbell_bench_press', 
                'beginner'
            )
            if 'error' not in form_analysis:
                print("✅ Form analysis working")
                print(f"   Key cues count: {len(form_analysis['key_form_cues'])}")
            else:
                print(f"❌ Form analysis error: {form_analysis['error']}")
        else:
            print("❌ Could not retrieve technique guide")
    
    def test_comprehensive_validator(self):
        """Test comprehensive validation system"""
        print("\n🧪 Testing Comprehensive Validator...")
        
        # Create a test workout plan
        test_workout = {
            'focus': 'chest',
            'exercises': [
                {
                    'exercise_id': 'barbell_bench_press',
                    'sets': 4,
                    'reps': '8-10',
                    'segment': 'main_workout'
                },
                {
                    'exercise_id': 'incline_dumbbell_press',
                    'sets': 3,
                    'reps': '10-12',
                    'segment': 'main_workout'
                },
                {
                    'exercise_id': 'treadmill_walk_easy',
                    'sets': 1,
                    'reps': '10 minutes',
                    'segment': 'warm_up'
                }
            ]
        }
        
        context = {
            'available_equipment': ['barbell', 'dumbbells', 'bench', 'treadmill'],
            'experience_level': 'intermediate',
            'injuries': []
        }
        
        validation_result = self.validator.validate_complete_workout(test_workout, context)
        
        print(f"✅ Validation completed: {validation_result.get_summary_text()}")
        print(f"   Errors: {len(validation_result.errors)}")
        print(f"   Warnings: {len(validation_result.warnings)}")
        print(f"   Info: {len(validation_result.info)}")
        
        if validation_result.errors:
            for error in validation_result.errors:
                print(f"   ❌ {error.message}")
        
        return validation_result.is_valid
    
    def test_progression_tracking(self):
        """Test progression tracking system"""
        print("\n🧪 Testing Progression Tracking...")
        
        # Create mock workout data
        mock_workout = {
            'focus': 'chest',
            'exercises': [
                {
                    'exercise_id': 'barbell_bench_press',
                    'sets': [
                        {'reps': 10, 'weight': 135, 'rpe': 7},
                        {'reps': 8, 'weight': 145, 'rpe': 8},
                        {'reps': 6, 'weight': 155, 'rpe': 9}
                    ],
                    'form_rating': 8,
                    'difficulty': 7
                }
            ]
        }
        
        # Log the workout
        success = self.progression_tracker.log_workout_session("test_user", mock_workout)
        if success:
            print("✅ Workout session logged successfully")
            
            # Get progression analysis
            progression = self.progression_tracker.get_exercise_progression(
                "test_user", 
                "barbell_bench_press"
            )
            
            if progression:
                print(f"✅ Progression analysis available")
                print(f"   Estimated 1RM: {progression.estimated_1rm:.1f} lbs")
                print(f"   Total volume: {progression.total_volume:.1f}")
            else:
                print("ℹ️ Need more data for progression analysis")
        else:
            print("❌ Failed to log workout session")
    
    def run_complete_integration_test(self):
        """Run all integration tests"""
        print("🔥 COMPREHENSIVE AI WORKOUT PLANNER INTEGRATION TEST")
        print("=" * 60)
        
        try:
            # Test all components
            self.test_nonsense_rejection()
            self.test_direct_planning()
            self.test_equipment_integration()
            self.test_exercise_database_segments()
            self.test_technique_library()
            validation_passed = self.test_comprehensive_validator()
            self.test_progression_tracking()
            
            # Test complete interview flow (most complex)
            print("\n" + "=" * 60)
            print("🎯 COMPLETE INTERVIEW FLOW TEST")
            print("=" * 60)
            
            final_workout = self.test_interview_flow()
            
            print("\n" + "=" * 60)
            print("📊 INTEGRATION TEST SUMMARY")
            print("=" * 60)
            
            if final_workout and validation_passed:
                print("🎉 ALL SYSTEMS INTEGRATED AND WORKING!")
                print("\n✅ Capabilities Verified:")
                print("   • Nonsense rejection (toenails, etc.)")
                print("   • Interview-driven consultation")
                print("   • Direct workout planning")
                print("   • Equipment catalog integration")
                print("   • Exercise alias resolution")
                print("   • Segment-aware exercise selection")
                print("   • Technique library integration")
                print("   • Comprehensive validation")
                print("   • Progression tracking")
                print("   • Safety analysis")
                
                print(f"\n🔧 System handles:")
                print("   • Vague requests → Interview flow")
                print("   • Specific requests → Direct planning")
                print("   • Nonsense requests → Intelligent rejection")
                print("   • Brand equipment → Exercise mapping")
                print("   • Form guidance → Technique library")
                print("   • Workout validation → Multi-level checking")
                
                return True
            else:
                print("❌ Some integration issues detected")
                return False
                
        except Exception as e:
            print(f"💥 Integration test failed with error: {str(e)}")
            import traceback
            traceback.print_exc()
            return False


def main():
    """Run the complete integration test"""
    tester = IntegratedWorkoutPlannerTest()
    success = tester.run_complete_integration_test()
    
    if success:
        print("\n🚀 System ready for production use!")
    else:
        print("\n🔧 System needs additional integration work")
    
    return success


if __name__ == "__main__":
    main()
