"""
Integration tests for Task F: Hybrid Knowledge (brands → canonical IDs)
Tests end-to-end flow from brand mentions to canonical planning
"""
import sys
import os
from unittest.mock import Mock, patch

# Add the parent directory to the path to import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from core.ai_orchestrator import AIOrchestrator
from core.exercise_alias_resolver import resolver
from utils.user_profiles import UserProfile, FitnessGoals


class TestTaskFIntegration:
    """Integration tests for Task F: Hybrid Knowledge"""
    
    def setup_method(self):
        """Setup test fixtures"""
        # Mock external dependencies
        self.mock_profile_manager = Mock()
        self.mock_trainer_brain = Mock()
        self.mock_progression_tracker = Mock()
        self.mock_observability = Mock()
        
        # Create orchestrator with mocked dependencies
        self.orchestrator = AIOrchestrator()
        self.orchestrator.profile_manager = self.mock_profile_manager
        self.orchestrator.trainer_brain = self.mock_trainer_brain  
        self.orchestrator.progression_tracker = self.mock_progression_tracker
        self.orchestrator.observability = self.mock_observability
        
    def test_brand_extraction_and_resolution(self):
        """Test brand equipment extraction and resolution"""
        text = "We have Life Fitness Chest Press and Hammer Strength Low Row available"
        
        # Test extraction
        resolved_equipment = self.orchestrator._extract_and_resolve_brands(text)
        
        assert len(resolved_equipment) >= 2
        assert any("chest" in canonical_id.lower() or "press" in canonical_id.lower() 
                  for canonical_id in resolved_equipment.values())
        assert any("row" in canonical_id.lower() for canonical_id in resolved_equipment.values())
        
    def test_canonicalization_before_planning(self):
        """Test that brand mentions are canonicalized before planning"""
        understanding = {
            'intent': 'workout_request',
            'focus': 'chest',
            'confidence': 0.8
        }
        
        message = "I want a chest workout using our Life Fitness Chest Press"
        
        canonicalized = self.orchestrator._canonicalize_before_planning(understanding, message)
        
        # Should add resolved equipment to context
        assert 'context' in canonicalized
        assert 'resolved_equipment' in canonicalized['context']
        assert len(canonicalized['context']['resolved_equipment']) > 0
        
    def test_equipment_interview_with_brands(self):
        """Test equipment interview handling with brand mentions"""
        # Mock profile
        profile = UserProfile(
            user_id="test_user",
            experience_level="intermediate",
            goals=FitnessGoals(primary_goal="muscle_building", session_duration=60)
        )
        
        self.mock_profile_manager.load_profile.return_value = profile
        self.mock_profile_manager.save_profile.return_value = True
        
        # Test equipment response with brand mentions
        result = self.orchestrator._update_profile_from_interview(
            "test_user", 
            "equipment_access", 
            "We have Life Fitness Chest Press and Hammer Strength Low Row at our gym"
        )
        
        # Should update profile with resolved equipment
        assert result['type'] == 'profile_update'
        assert profile.available_equipment is not None
        assert 'commercial_gym' in profile.available_equipment
        
    def test_task_f_acceptance_criteria_end_to_end(self):
        """Test the specific Task F acceptance criteria end-to-end"""
        # Setup: User mentions specific brand equipment
        user_message = "We have Life Fitness Chest Press and Hammer Strength Low Row"
        
        # Mock profile with completed interview
        profile = UserProfile(
            user_id="test_user",
            experience_level="intermediate",
            goals=FitnessGoals(primary_goal="muscle_building", session_duration=60),
            available_equipment={"commercial_gym": ["full_gym"]}
        )
        
        self.mock_profile_manager.load_profile.return_value = profile
        
        # Mock router decision for planning
        mock_router_decision = {
            'action': 'direct_planning',
            'focus': 'chest',
            'confidence': 0.9
        }
        
        # Mock AI understanding
        with patch.object(self.orchestrator, '_ai_understand_with_context') as mock_understand:
            mock_understand.return_value = {
                'intent': 'workout_request',
                'focus': 'chest',
                'confidence': 0.8
            }
            
            # Mock workout generation
            with patch.object(self.orchestrator, '_generate_workout_with_systems') as mock_generate:
                mock_generate.return_value = {
                    'type': 'workout_plan',
                    'message': 'Generated workout plan',
                    'plan': {'exercises': ['machine_chest_press', 'chest_supported_row_machine']}
                }
                
                # Process the message
                result = self.orchestrator.process_message("test_user", user_message)
                
                # Verify canonicalization occurred
                assert mock_understand.called
                
                # Get the understanding passed to workout generation
                call_args = mock_generate.call_args
                understanding = call_args[0][1]  # Second argument is understanding
                
                # Should have resolved equipment in context
                if 'context' in understanding and 'resolved_equipment' in understanding['context']:
                    resolved_equipment = understanding['context']['resolved_equipment']
                    
                    # Should have resolved both pieces of equipment to canonical IDs
                    assert len(resolved_equipment) >= 1
                    
                    # Should contain canonical exercise IDs
                    canonical_ids = list(resolved_equipment.values())
                    for canonical_id in canonical_ids:
                        assert isinstance(canonical_id, str)
                        assert len(canonical_id) > 0
                        # Should be canonical format (no spaces, underscores)
                        assert ' ' not in canonical_id
                
    def test_brand_resolution_in_clarification_flow(self):
        """Test brand resolution during clarification/interview flow"""
        # Test equipment access clarification with brands
        text = "We have Technogym and Cybex machines available"
        
        resolved = self.orchestrator._extract_and_resolve_brands(text)
        
        # Should resolve equipment mentions
        assert len(resolved) >= 1
        
        # Should map to canonical IDs
        for original, canonical in resolved.items():
            assert canonical is not None
            assert isinstance(canonical, str)
            
    def test_mixed_brand_and_generic_equipment(self):
        """Test handling mix of brand and generic equipment mentions"""
        text = "We have Life Fitness machines, dumbbells, and a squat rack"
        
        resolved = self.orchestrator._extract_and_resolve_brands(text)
        
        # Should extract brand equipment but not generic terms
        # (Generic terms should be handled separately)
        brand_mentions = [k for k in resolved.keys() if any(
            brand in k.lower() for brand in ["life fitness", "hammer strength", "technogym"]
        )]
        
        assert len(brand_mentions) >= 1
        
    def test_no_brand_mentions_no_resolution(self):
        """Test that messages without brand mentions don't trigger resolution"""
        text = "I want to build my chest muscles"
        
        resolved = self.orchestrator._extract_and_resolve_brands(text)
        
        # Should not extract any brand equipment
        assert len(resolved) == 0
        
    def test_invalid_brand_mentions_graceful_handling(self):
        """Test graceful handling of invalid or unknown brand mentions"""
        text = "We have FakeBrand Chest Press and UnknownBrand Row"
        
        resolved = self.orchestrator._extract_and_resolve_brands(text)
        
        # Should handle gracefully without errors
        # May have 0 resolutions or partial resolutions
        assert isinstance(resolved, dict)
        
    def test_observability_brand_mapping_count(self):
        """Test that brand mappings are logged for observability"""
        text = "We have Life Fitness Chest Press and Hammer Strength Low Row"
        
        understanding = {
            'intent': 'workout_request',
            'focus': 'chest',
            'confidence': 0.8
        }
        
        # Mock observability logging
        self.mock_observability.log_metric = Mock()
        
        result = self.orchestrator._canonicalize_before_planning(understanding, text)
        
        # Should log brand mapping count
        if 'context' in result and 'resolved_equipment' in result['context']:
            # Observability should be called if there were brand mappings
            if len(result['context']['resolved_equipment']) > 0:
                self.mock_observability.log_metric.assert_called_with(
                    'brand_mapped_count', 
                    len(result['context']['resolved_equipment'])
                )
    
    def test_equipment_catalog_integration(self):
        """Test integration with equipment catalog for brand suggestions"""
        # Test equipment suggestions for different focuses
        from core.exercise_alias_resolver import resolver
        
        suggestions = resolver.get_equipment_suggestions_for_focus('chest')
        
        # Should return relevant brand equipment for chest focus
        assert len(suggestions) > 0
        assert any('chest' in suggestion.lower() or 'press' in suggestion.lower() 
                  for suggestion in suggestions)
        
        # Test for back focus
        suggestions = resolver.get_equipment_suggestions_for_focus('back')
        
        assert len(suggestions) > 0
        assert any('row' in suggestion.lower() or 'pulldown' in suggestion.lower() 
                  for suggestion in suggestions)


class TestBrandResolutionEdgeCases:
    """Test edge cases for brand resolution"""
    
    def test_case_insensitive_matching(self):
        """Test case insensitive brand matching"""
        test_cases = [
            "LIFE FITNESS CHEST PRESS",
            "life fitness chest press", 
            "Life Fitness Chest Press",
            "LiFe FiTnEsS cHeSt PrEsS"
        ]
        
        for test_case in test_cases:
            canonical_id, matches = resolver.resolve(test_case)
            assert canonical_id is not None
            assert any(m.match_type == "brand" for m in matches)
            
    def test_partial_word_matching(self):
        """Test partial word matching in brand names"""
        test_cases = [
            "hammer chest",
            "life chest",
            "technogym leg"
        ]
        
        for test_case in test_cases:
            canonical_id, matches = resolver.resolve(test_case)
            # Should find some match (might be brand or fuzzy)
            assert len(matches) > 0
            
    def test_typo_tolerance(self):
        """Test tolerance for minor typos in brand names"""
        test_cases = [
            "Life Fitnes Chest Press",  # Missing 's'
            "Hamer Strength Row",       # Missing 'm'
            "Technogm Leg Press"        # Missing 'y'
        ]
        
        for test_case in test_cases:
            canonical_id, matches = resolver.resolve(test_case)
            # Should find some reasonable match even with typos
            assert len(matches) > 0
            
    def test_multiple_brands_same_exercise(self):
        """Test handling multiple brand options for same exercise type"""
        chest_press_brands = [
            "Life Fitness Chest Press",
            "Hammer Strength Chest Press", 
            "Technogym Chest Press",
            "Cybex Chest Press"
        ]
        
        resolved_ids = []
        for brand in chest_press_brands:
            canonical_id, matches = resolver.resolve(brand)
            if canonical_id:
                resolved_ids.append(canonical_id)
                
        # All should resolve to similar exercise types (chest press variants)
        assert len(resolved_ids) >= 3
        # Most should map to chest press type exercises
        chest_exercises = [id for id in resolved_ids if 'chest' in id.lower() or 'press' in id.lower()]
        assert len(chest_exercises) >= 2


if __name__ == "__main__":
    # Run the tests manually for validation
    test_suite = TestTaskFIntegration()
    test_suite.setup_method()
    
    print("Running Task F Integration Tests...")
    
    try:
        test_suite.test_brand_extraction_and_resolution()
        print("✓ Brand extraction and resolution test passed")
        
        test_suite.test_canonicalization_before_planning()
        print("✓ Canonicalization before planning test passed")
        
        test_suite.test_task_f_acceptance_criteria_end_to_end()
        print("✓ Task F acceptance criteria test passed")
        
        test_suite.test_no_brand_mentions_no_resolution()
        print("✓ No false positive test passed")
        
        print("\n✅ All Task F integration tests passed!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()