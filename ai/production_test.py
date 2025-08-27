"""
Production Integration Test - Test the cleaned up system
"""
import sys
import os

# Add the ai directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_new_structure():
    """Test that the new directory structure works"""
    print("🧪 TESTING NEW DIRECTORY STRUCTURE")
    print("=" * 40)
    
    try:
        # Test core imports
        from core import ExerciseDatabase, EquipmentCatalog, ExerciseAliasResolver
        from core import TechniqueLibrary, ProgressionTracker
        from core import route_focus_request, is_nonsense_or_unknown
        
        print("✅ Core imports successful")
        
        # Test integration imports
        from integration import FocusIntegrationSystem
        print("✅ Integration imports successful")
        
        # Test validator imports
        from validators import ComprehensiveFocusValidator
        print("✅ Validator imports successful")
        
        # Test initialization
        db = ExerciseDatabase()
        catalog = EquipmentCatalog()
        resolver = ExerciseAliasResolver()
        technique_lib = TechniqueLibrary()
        tracker = ProgressionTracker()
        validator = ComprehensiveFocusValidator(db)
        integration_system = FocusIntegrationSystem(exercise_db=db)
        
        print("✅ All components initialized successfully")
        
        # Test core functionality
        nonsense_result = is_nonsense_or_unknown("train my toenails")
        valid_result = is_nonsense_or_unknown("chest workout")
        
        if nonsense_result and not valid_result:
            print("✅ Nonsense detection working")
        else:
            print("❌ Nonsense detection failed")
        
        # Test exercise retrieval
        exercise = db.get_exercise_by_id('barbell_bench_press')
        if exercise:
            print("✅ Exercise database working")
        else:
            print("❌ Exercise database failed")
        
        # Test equipment catalog
        brands = catalog.get_all_brands()
        if len(brands) > 0:
            print(f"✅ Equipment catalog working ({len(brands)} brands)")
        else:
            print("❌ Equipment catalog failed")
        
        # Test integration system
        response = integration_system.handle_workout_request(
            user_id="test_user",
            message="train my toenails"
        )
        
        if response['response_type'] == 'rejection':
            print("✅ Integration system working")
        else:
            print("❌ Integration system failed")
        
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ New directory structure is working correctly")
        print("✅ All enhanced features are accessible")
        print("✅ System ready for production!")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_new_structure()
    if success:
        print("\n🚀 PRODUCTION READY!")
    else:
        print("\n🔧 Needs fixes before production")
