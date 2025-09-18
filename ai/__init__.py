"""
AI Workout Planner - Production Module
Organized AI system for intelligent workout planning with segment awareness
"""

# Core system components
from .core.exercise_database import ExerciseDatabase
from .core.equipment_catalog import EquipmentCatalog  
from .core.exercise_alias_resolver import ExerciseAliasResolver
from .core.technique_library_complete import TechniqueLibrary
from .core.progression_tracker_complete import ProgressionTracker
from .core.focus_router_enhanced import route_focus_request, detect_focus, is_nonsense_or_unknown

# Integration system
from ai.integration.focus_integration_complete import FocusIntegrationSystem, InterviewSession

# Validation system
from ai.validators.comprehensive_validator import ComprehensiveFocusValidator

# Utilities
from ai.utils.user_profiles import UserProfileManager
from ai.utils.semantic_memory import SemanticMemorySystem
from ai.utils.rate_limiting import RateLimiter

# Configuration
from ai.config.load_env import load_env_file

__version__ = "2.0.0"
__author__ = "hlthy AI Team"

# Main classes for easy import
__all__ = [
    'ExerciseDatabase',
    'EquipmentCatalog', 
    'ExerciseAliasResolver',
    'TechniqueLibrary',
    'ProgressionTracker',
    'FocusIntegrationSystem',
    'InterviewSession',
    'ComprehensiveFocusValidator',
    'UserProfileManager',
    'SemanticMemorySystem',
    'RateLimiter',
    'route_focus_request',
    'detect_focus',
    'is_nonsense_or_unknown',
    'load_env_file'
]

# Quick access to main system
def create_ai_workout_system():
    """
    Create a fully configured AI workout planning system
    
    Returns:
        FocusIntegrationSystem: Ready-to-use AI workout planner
    """
    # Initialize core components
    exercise_db = ExerciseDatabase()
    equipment_catalog = EquipmentCatalog()
    alias_resolver = ExerciseAliasResolver()
    technique_library = TechniqueLibrary()
    progression_tracker = ProgressionTracker()
    validator = ComprehensiveFocusValidator(exercise_db)
    
    # Create integrated system
    ai_system = FocusIntegrationSystem(
        exercise_db=exercise_db,
        equipment_catalog=equipment_catalog,
        alias_resolver=alias_resolver,
        technique_library=technique_library,
        progression_tracker=progression_tracker,
        validator=validator
    )
    
    return ai_system

# System information
def get_system_info():
    """Get information about the AI workout planning system"""
    return {
        'version': __version__,
        'author': __author__,
        'capabilities': [
            'Intelligent nonsense rejection',
            'Segment-aware exercise selection', 
            'Branded equipment integration',
            'Fuzzy exercise name resolution',
            'Focus detection with confidence scoring',
            'Comprehensive technique guidance',
            'Multi-level workout validation',
            'Interview-driven consultation',
            'Progression tracking and analysis'
        ],
        'segments': ['warm_up', 'main_workout', 'cool_down'],
        'supported_equipment_brands': [
            'Life Fitness', 'Hammer Strength', 'Technogym', 
            'Cybex', 'Precor', 'Matrix', 'StairMaster'
        ]
    }
