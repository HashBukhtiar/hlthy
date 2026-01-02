"""
Backward Compatibility Wrapper for technique_library
Imports from the new enhanced technique_library_complete module
"""

# Import everything from the enhanced version
from core.technique_library_complete import *

# Maintain old function names for compatibility
def get_technique_cues_for_exercise(exercise_id: str, experience_level: str = "intermediate"):
    """Legacy function - use TechniqueLibrary class instead"""
    library = TechniqueLibrary()
    guide = library.get_technique_guide(exercise_id)
    
    if not guide:
        return []
    
    # Return combined setup and execution cues
    all_cues = guide.setup_cues + guide.execution_cues
    return [cue.description for cue in all_cues]

def get_substitutions_for_injury(exercise_id: str, injury_type: str):
    """Legacy function - use TechniqueLibrary class instead"""
    library = TechniqueLibrary()
    guide = library.get_technique_guide(exercise_id)
    
    if not guide:
        return []
    
    return guide.alternative_exercises

def get_compact_technique_response(exercise_id: str):
    """Legacy function - use TechniqueLibrary class instead"""
    library = TechniqueLibrary()
    guide = library.get_technique_guide(exercise_id)
    
    if not guide:
        return f"No technique guide available for {exercise_id}"
    
    return f"{guide.exercise_name}: {guide.difficulty_level} difficulty. Key cues: {', '.join([cue.description for cue in guide.get_priority_cues('critical')])}"
