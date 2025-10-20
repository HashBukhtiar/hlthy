"""
Backward Compatibility Wrapper for progression_tracker
Imports from the new enhanced progression_tracker_complete module
"""

# Import everything from the enhanced version
from core.progression_tracker_complete import *

# Create a global instance for legacy function compatibility
progression_tracker = ProgressionTracker()

# Maintain old function names for compatibility
def get_progression_suggestions(user_id: str, exercise_id: str):
    """Legacy function - use ProgressionTracker class instead"""
    progression = progression_tracker.get_exercise_progression(user_id, exercise_id)
    
    if not progression:
        return "No progression data available. Complete more workouts to get suggestions."
    
    suggestions = progression_tracker.get_progression_suggestions(user_id, exercise_id)
    return suggestions.get('message', 'Continue with current progression')

def record_workout_performance(user_id: str, workout_data: dict):
    """Legacy function - use ProgressionTracker class instead"""
    return progression_tracker.log_workout_session(user_id, workout_data)

def get_user_progression_summary(user_id: str):
    """Legacy function - use ProgressionTracker class instead"""
    return progression_tracker.get_progression_summary(user_id)
