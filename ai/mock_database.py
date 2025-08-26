"""
Simplified mock functions for testing Focus Planner without full exercise database
"""

def get_exercises_by_filters(*args, **kwargs):
    """Mock function that returns sample exercise IDs"""
    return [
        'barbell_bench_press', 'dumbbell_bench_press', 'incline_dumbbell_press',
        'dumbbell_fly', 'push_ups', 'dumbbell_row', 'pull_ups', 'lat_pulldown',
        'goblet_squat', 'dumbbell_squat', 'romanian_deadlift', 'glute_bridge'
    ]

def get_exercise_data(*args, **kwargs):
    """Mock function that returns sample exercise data"""
    return {
        'name': 'Sample Exercise',
        'movement_patterns': ['horizontal_press'],
        'muscle_families': ['chest'],
        'equipment_required': ['dumbbells']
    }

# Mock ExerciseDatabase class for testing
class MockExerciseDatabase:
    """Simple mock exercise database for testing"""
    
    def get_exercise_by_id(self, exercise_id):
        return {
            'name': f'Mock {exercise_id.replace("_", " ").title()}',
            'movement_patterns': ['horizontal_press'],
            'muscle_families': ['chest'],
            'equipment_required': ['dumbbells']
        }
    
    def get_exercises_by_movement_patterns(self, patterns):
        return ['barbell_bench_press', 'dumbbell_bench_press', 'push_ups']
    
    def get_exercises_by_muscle_families(self, families):
        return ['dumbbell_fly', 'cable_crossover', 'chest_press']
    
    def filter_exercises_for_injuries(self, exercises, injuries):
        # Remove potentially problematic exercises for shoulder injuries
        if 'shoulder' in injuries:
            return [ex for ex in exercises if 'overhead' not in ex]
        return exercises

# Mock UserProfileManager for testing
class MockUserProfileManager:
    """Simple mock user profile manager for testing"""
    
    def get_user_profile(self, user_id):
        return {
            'experience_level': 'intermediate',
            'available_equipment': ['dumbbells', 'barbell'],
            'preferences': {},
            'limitations': {},
            'goals': ['muscle_building']
        }
