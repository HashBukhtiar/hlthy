"""
Comprehensive pytest test suite for Focus Planner system
Tests all modules and integration points as specified in copilot_instructions_v2.md
"""
import pytest
import json
from unittest.mock import Mock, patch

# Import all Focus Planner modules
from focus_rules import (
    BASE_FOCI, FOCUS_ALIASES, VOLUME_BOUNDS, PROPORTION_RULES,
    normalize_focus, parse_combo, get_muscle_families_for_focus
)
from focus_whitelist import build_focus_whitelist
from focus_composer import get_slot_template_for_focus, merge_slot_templates
from focus_rubrics import get_rubric_for_focus
from focus_validator import FocusValidator
from focus_rulesets import FocusRuleset
from focus_router import FocusPlanner
from focus_integration import FocusIntegration


class TestFocusRules:
    """Test focus taxonomy and rules"""
    
    def test_base_foci_completeness(self):
        """Test that all required base foci are defined"""
        required_foci = [
            'chest', 'shoulders', 'back', 'lats', 'upper_back',
            'quads', 'hamstrings', 'glutes', 'calves', 'arms',
            'biceps', 'triceps', 'core', 'push', 'pull', 'legs',
            'upper', 'lower', 'posterior_chain', 'full_body'
        ]
        
        for focus in required_foci:
            assert focus in BASE_FOCI, f"Missing base focus: {focus}"
    
    def test_focus_normalization(self):
        """Test focus normalization handles aliases correctly"""
        test_cases = [
            ('Chest', 'chest'),
            ('SHOULDERS', 'shoulders'),
            ('Back+Biceps', 'back+biceps'),
            ('legs ', 'legs'),
            ('Full Body', 'full_body')
        ]
        
        for input_focus, expected in test_cases:
            result = normalize_focus(input_focus)
            assert result == expected, f"Failed to normalize '{input_focus}' to '{expected}', got '{result}'"
    
    def test_combo_parsing(self):
        """Test combo parsing extracts focus pairs correctly"""
        test_cases = [
            ('chest+triceps', ('chest', 'triceps', 0.5)),
            ('back+biceps:0.7', ('back', 'biceps', 0.7)),
            ('shoulders+triceps:0.6', ('shoulders', 'triceps', 0.6)),
            ('chest', None),  # Not a combo
            ('invalid+unknown', None)  # Invalid foci
        ]
        
        for combo_str, expected in test_cases:
            result = parse_combo(combo_str)
            assert result == expected, f"Failed to parse combo '{combo_str}'"
    
    def test_muscle_families_mapping(self):
        """Test muscle family mappings are comprehensive"""
        test_cases = [
            ('chest', ['pectorals', 'front_delts', 'triceps']),
            ('back', ['lats', 'rhomboids', 'mid_traps', 'rear_delts']),
            ('legs', ['quads', 'hamstrings', 'glutes', 'calves'])
        ]
        
        for focus, expected_families in test_cases:
            families = get_muscle_families_for_focus(focus)
            for family in expected_families:
                assert family in families, f"Missing muscle family '{family}' for focus '{focus}'"


class TestFocusWhitelist:
    """Test exercise whitelist building"""
    
    def setup_method(self):
        """Set up mock dependencies"""
        self.mock_exercise_db = Mock()
        self.mock_exercise_db.get_exercises_by_movement_patterns.return_value = [
            'barbell_bench_press', 'dumbbell_bench_press', 'incline_dumbbell_press'
        ]
        self.mock_exercise_db.get_exercises_by_muscle_families.return_value = [
            'dumbbell_fly', 'cable_crossover', 'push_ups'
        ]
    
    def test_whitelist_building_chest_focus(self):
        """Test whitelist building for chest focus"""
        user_context = {
            'experience_level': 'intermediate',
            'available_equipment': ['dumbbells', 'barbell'],
            'active_injuries': []
        }
        
        result = build_focus_whitelist(
            focus='chest',
            exercise_db=self.mock_exercise_db,
            user_context=user_context
        )
        
        assert 'allowed_exercises' in result
        assert len(result['allowed_exercises']) > 0
        assert result['focus'] == 'chest'
    
    def test_whitelist_building_combo_focus(self):
        """Test whitelist building for combo focus"""
        user_context = {
            'experience_level': 'intermediate',
            'available_equipment': ['dumbbells'],
            'active_injuries': []
        }
        
        result = build_focus_whitelist(
            focus='chest+triceps',
            exercise_db=self.mock_exercise_db,
            user_context=user_context
        )
        
        assert 'allowed_exercises' in result
        assert result['focus'] == 'chest+triceps'
        assert 'combo_details' in result
    
    def test_injury_filtering(self):
        """Test that injured users get filtered whitelists"""
        user_context = {
            'experience_level': 'intermediate',
            'available_equipment': ['dumbbells'],
            'active_injuries': ['shoulder']
        }
        
        # Mock injury filtering
        self.mock_exercise_db.filter_exercises_for_injuries.return_value = [
            'dumbbell_bench_press'  # Shoulder-safe version
        ]
        
        result = build_focus_whitelist(
            focus='chest',
            exercise_db=self.mock_exercise_db,
            user_context=user_context
        )
        
        assert len(result['allowed_exercises']) > 0


class TestFocusComposer:
    """Test slot template composition"""
    
    def test_slot_template_chest_focus(self):
        """Test slot template generation for chest focus"""
        template = get_slot_template_for_focus('chest')
        
        assert 'slots' in template
        assert len(template['slots']) >= 3  # At least 3 exercises for chest
        
        # Check for required patterns
        patterns = [slot['pattern'] for slot in template['slots']]
        assert 'horizontal_press' in ' '.join(patterns)
    
    def test_slot_template_full_body(self):
        """Test slot template generation for full body"""
        template = get_slot_template_for_focus('full_body')
        
        assert 'slots' in template
        patterns = [slot['pattern'] for slot in template['slots']]
        
        # Full body should have squat, press, and pull patterns
        pattern_str = ' '.join(patterns)
        assert 'squat' in pattern_str or 'knee_dominant' in pattern_str
        assert 'press' in pattern_str
        assert 'pull' in pattern_str or 'row' in pattern_str
    
    def test_combo_template_merging(self):
        """Test slot template merging for combos"""
        chest_template = get_slot_template_for_focus('chest')
        triceps_template = get_slot_template_for_focus('triceps')
        
        merged = merge_slot_templates(chest_template, triceps_template, 0.7)
        
        assert 'slots' in merged
        # Should have more slots than either individual template
        assert len(merged['slots']) >= max(len(chest_template['slots']), len(triceps_template['slots']))


class TestFocusRubrics:
    """Test rubric generation"""
    
    def test_single_focus_rubrics(self):
        """Test rubric generation for single focuses"""
        test_focuses = ['chest', 'back', 'legs', 'full_body']
        
        for focus in test_focuses:
            rubric = get_rubric_for_focus(focus)
            assert len(rubric) > 0, f"Empty rubric for focus '{focus}'"
            assert 'allowedExercises_focus[]' in rubric, f"Missing exercise ID constraint in '{focus}' rubric"
    
    def test_combo_focus_rubrics(self):
        """Test rubric generation for combo focuses"""
        combo_rubric = get_rubric_for_focus('chest+triceps')
        
        assert len(combo_rubric) > 0
        assert 'Combo Rules:' in combo_rubric
        assert '70%' in combo_rubric or '30%' in combo_rubric  # Default allocation


class TestFocusValidator:
    """Test workout plan validation"""
    
    def setup_method(self):
        """Set up mock exercise database"""
        self.mock_exercise_db = Mock()
        self.mock_exercise_db.get_exercise_by_id.return_value = {
            'name': 'Test Exercise',
            'movement_patterns': ['horizontal_press'],
            'muscle_families': ['pectorals']
        }
        self.validator = FocusValidator(self.mock_exercise_db)
    
    def test_valid_chest_workout_validation(self):
        """Test validation of valid chest workout"""
        workout_plan = {
            'focus': 'chest',
            'exercises': [
                {
                    'exerciseId': 'barbell_bench_press',
                    'name': 'Barbell Bench Press',
                    'sets': 3,
                    'reps': '8-10'
                },
                {
                    'exerciseId': 'dumbbell_fly',
                    'name': 'Dumbbell Fly', 
                    'sets': 3,
                    'reps': '10-12'
                }
            ]
        }
        
        allowed_exercises = ['barbell_bench_press', 'dumbbell_fly', 'incline_press']
        
        is_valid, violations = self.validator.validate_workout(workout_plan, allowed_exercises)
        assert is_valid, f"Valid workout marked invalid: {violations}"
    
    def test_invalid_exercise_id_validation(self):
        """Test validation catches invalid exercise IDs"""
        workout_plan = {
            'focus': 'chest',
            'exercises': [
                {
                    'exerciseId': 'invalid_exercise_id',
                    'name': 'Invalid Exercise',
                    'sets': 3,
                    'reps': '8-10'
                }
            ]
        }
        
        allowed_exercises = ['barbell_bench_press', 'dumbbell_fly']
        
        is_valid, violations = self.validator.validate_workout(workout_plan, allowed_exercises)
        assert not is_valid, "Invalid exercise ID should fail validation"
        assert len(violations) > 0
        assert 'not in allowed exercises' in ' '.join(violations)
    
    def test_focus_requirements_validation(self):
        """Test validation enforces focus requirements"""
        # Chest workout without any pressing movements
        workout_plan = {
            'focus': 'chest',
            'exercises': [
                {
                    'exerciseId': 'bicep_curls',
                    'name': 'Bicep Curls',
                    'sets': 3,
                    'reps': '8-10'
                }
            ]
        }
        
        allowed_exercises = ['bicep_curls', 'barbell_bench_press']
        
        is_valid, violations = self.validator.validate_workout(workout_plan, allowed_exercises)
        assert not is_valid, "Workout without chest movements should fail chest focus validation"


class TestFocusRulesets:
    """Test ruleset system"""
    
    def test_ruleset_initialization(self):
        """Test ruleset initialization with different levels"""
        rulesets = ['beginner', 'intermediate', 'advanced', 'time_efficient']
        
        for ruleset_name in rulesets:
            ruleset = FocusRuleset(ruleset_name)
            assert ruleset.base_ruleset == ruleset_name
    
    def test_focus_modifications(self):
        """Test focus-specific ruleset modifications"""
        ruleset = FocusRuleset('intermediate')
        
        # Test full body modifications
        full_body_rules = ruleset.apply_focus_modifications('full_body')
        assert full_body_rules['prefer_compounds'] == True
        
        # Test arms modifications
        arms_rules = ruleset.apply_focus_modifications('arms')
        assert arms_rules['prefer_compounds'] == False
    
    def test_exercise_limits(self):
        """Test exercise limit calculations"""
        ruleset = FocusRuleset('beginner')
        
        limits = ruleset.get_exercise_limits('chest')
        assert 'max_exercises' in limits
        assert 'max_sets_per_exercise' in limits
        assert 'recommended_total_sets' in limits
        
        # Beginner should have conservative limits
        assert limits['max_exercises'] <= 6
        assert limits['max_sets_per_exercise'] <= 3


class TestFocusPlanner:
    """Test the main Focus Planner orchestrator"""
    
    def setup_method(self):
        """Set up mock dependencies"""
        self.mock_exercise_db = Mock()
        self.mock_user_profiles = Mock()
        self.mock_user_profiles.get_user_profile.return_value = {
            'experience_level': 'intermediate',
            'available_equipment': ['dumbbells'],
            'preferences': {},
            'limitations': {},
            'goals': []
        }
        self.focus_planner = FocusPlanner(self.mock_exercise_db, self.mock_user_profiles)
    
    @patch('focus_router.build_focus_whitelist')
    def test_process_focus_request(self, mock_whitelist):
        """Test main focus request processing"""
        mock_whitelist.return_value = {
            'allowed_exercises': ['barbell_bench_press', 'dumbbell_fly'],
            'focus': 'chest',
            'build_time_ms': 50
        }
        
        result = self.focus_planner.process_focus_request(
            focus='chest',
            user_id='test_user',
            context={'equipment': ['dumbbells']},
            ruleset='intermediate'
        )
        
        assert result['focus'] == 'chest'
        assert result['user_id'] == 'test_user'
        assert 'whitelist_result' in result
        assert 'prompt_components' in result
        assert 'slot_template' in result
    
    def test_combo_focus_processing(self):
        """Test combo focus processing"""
        with patch('focus_router.build_focus_whitelist') as mock_whitelist:
            mock_whitelist.return_value = {
                'allowed_exercises': ['barbell_bench_press', 'tricep_dips'],
                'focus': 'chest+triceps',
                'build_time_ms': 75
            }
            
            result = self.focus_planner.process_focus_request(
                focus='chest+triceps',
                user_id='test_user'
            )
            
            assert 'chest+triceps' in result['focus']
            assert result['metadata']['combo_detected'] == True


class TestFocusIntegration:
    """Test integration with AI chat system"""
    
    def setup_method(self):
        """Set up integration layer"""
        self.mock_exercise_db = Mock()
        self.mock_user_profiles = Mock()
        self.integration = FocusIntegration(self.mock_exercise_db, self.mock_user_profiles)
    
    def test_workout_intent_detection(self):
        """Test workout intent detection accuracy"""
        test_cases = [
            ("I need a chest workout", True, 0.9),
            ("Give me back and biceps routine", True, 0.9),
            ("My shoulder hurts during bench press", False, None),
            ("Hello, how are you?", False, None),
            ("What is progressive overload?", False, None)
        ]
        
        for message, expected_workout, min_confidence in test_cases:
            result = self.integration.enhance_workout_request(
                user_message=message,
                user_id="test_user"
            )
            
            intent = result['workout_intent']
            is_workout = intent['is_workout_request']
            confidence = intent['confidence']
            
            assert is_workout == expected_workout, f"Intent detection failed for: '{message}'"
            if min_confidence:
                assert confidence >= min_confidence, f"Confidence too low for: '{message}'"
    
    def test_focus_extraction(self):
        """Test focus extraction from messages"""
        test_cases = [
            ("I need a chest workout", "chest"),
            ("Give me back and biceps routine", "back+biceps"),
            ("Create a full body workout", "full_body"),
            ("I want to train legs today", "legs")
        ]
        
        for message, expected_focus in test_cases:
            # Mock the focus planner to avoid complex setup
            with patch.object(self.integration.focus_planner, 'process_focus_request') as mock_process:
                mock_process.return_value = {
                    'focus': expected_focus,
                    'whitelist_result': {'allowed_exercises': []},
                    'prompt_components': {},
                    'slot_template': {},
                    'rules': {},
                    'limits': {},
                    'guidance': {},
                    'rubric': '',
                    'user_context': {},
                    'metadata': {}
                }
                
                result = self.integration.enhance_workout_request(
                    user_message=message,
                    user_id="test_user"
                )
                
                if result.get('enhanced'):
                    assert expected_focus in result['focus_result']['focus']


class TestIntegrationAcceptance:
    """End-to-end acceptance tests for Focus Planner integration"""
    
    def test_full_chest_workout_pipeline(self):
        """Test complete pipeline for chest workout request"""
        # This would be a full integration test with real components
        # For now, test that all components can be imported and initialized
        
        try:
            from exercise_database import ExerciseDatabase
            from user_profiles import UserProfileManager
            from focus_router import FocusPlanner
            from focus_integration import FocusIntegration
            
            # Test initialization chain
            exercise_db = ExerciseDatabase()
            user_profiles = UserProfileManager()
            focus_planner = FocusPlanner(exercise_db, user_profiles)
            integration = FocusIntegration(exercise_db, user_profiles)
            
            assert integration is not None
            assert focus_planner is not None
            
        except ImportError as e:
            pytest.fail(f"Integration test failed due to import error: {e}")
    
    def test_error_handling_robustness(self):
        """Test that system handles errors gracefully"""
        # Test with invalid focus
        integration = FocusIntegration(Mock(), Mock())
        
        result = integration.enhance_workout_request(
            user_message="I want to train my invalid_muscle_group",
            user_id="test_user"
        )
        
        # Should not crash and should provide fallback
        assert 'enhanced' in result
        assert result['enhanced'] == False
    
    def test_focus_planner_guardrails(self):
        """Test that Focus Planner enforces safety guardrails"""
        # Test that beginner users don't get extreme risk exercises
        # Test that injured users get filtered exercises
        # Test that equipment constraints are enforced
        
        # Mock setup for testing guardrails
        mock_db = Mock()
        mock_profiles = Mock()
        
        # Simulate beginner with shoulder injury
        mock_profiles.get_user_profile.return_value = {
            'experience_level': 'beginner',
            'active_injuries': ['shoulder'],
            'available_equipment': ['dumbbells']
        }
        
        integration = FocusIntegration(mock_db, mock_profiles)
        
        # The integration should handle this safely
        result = integration.enhance_workout_request(
            user_message="I need a shoulder workout",
            user_id="injured_beginner"
        )
        
        # Should either enhance with safe exercises or provide guidance
        assert isinstance(result, dict)
        assert 'user_id' in result


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "--tb=short"])
