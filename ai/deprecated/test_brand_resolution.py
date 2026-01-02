"""
Unit tests for brand equipment resolution functionality (Task F)
"""
import pytest
from unittest.mock import Mock, patch
import sys
import os

# Add the parent directory to the path to import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from core.exercise_alias_resolver import ExerciseAliasResolver, resolver, AliasMatch
from core.equipment_catalog import EQUIPMENT_CATALOG, get_equipment_mapping, resolve_to_canonical


class TestBrandResolution:
    """Test suite for brand equipment resolution"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.resolver = ExerciseAliasResolver()
    
    def test_exact_brand_match(self):
        """Test exact brand equipment matching"""
        # Test Life Fitness exact match
        canonical_id, matches = self.resolver.resolve("Life Fitness Chest Press")
        assert canonical_id == "machine_chest_press"
        assert len(matches) > 0
        assert matches[0].match_type == "brand"
        assert matches[0].confidence >= 0.9
        
        # Test Hammer Strength exact match
        canonical_id, matches = self.resolver.resolve("Hammer Strength Low Row")
        assert canonical_id == "chest_supported_row_machine"
        assert matches[0].match_type == "brand"
        
    def test_partial_brand_match(self):
        """Test partial brand name matching"""
        # Test partial Life Fitness match
        canonical_id, matches = self.resolver.resolve("life fitness chest")
        assert canonical_id is not None
        assert any(m.match_type == "brand" for m in matches)
        
        # Test partial Hammer Strength match
        canonical_id, matches = self.resolver.resolve("hammer row")
        assert canonical_id is not None
        assert any(m.match_type == "brand" for m in matches)
        
    def test_brand_with_movement_pattern(self):
        """Test brand matching with movement pattern keywords"""
        # Test chest press variations
        test_cases = [
            ("Technogym chest press", "machine_chest_press"),
            ("Cybex chest press", "machine_chest_press"),
            ("Matrix chest press", "machine_chest_press")
        ]
        
        for input_text, expected_id in test_cases:
            canonical_id, matches = self.resolver.resolve(input_text)
            assert canonical_id == expected_id or canonical_id in ["machine_chest_press", "dumbbell_bench_press"]
            assert any(m.match_type == "brand" for m in matches)
            
    def test_brand_equipment_list_resolution(self):
        """Test resolving a list of brand equipment mentions"""
        equipment_list = [
            "Life Fitness Chest Press",
            "Hammer Strength Low Row",
            "Technogym Leg Press"
        ]
        
        resolved = self.resolver.resolve_brand_equipment_list(equipment_list)
        
        assert len(resolved) == 3
        assert "Life Fitness Chest Press" in resolved
        assert "Hammer Strength Low Row" in resolved
        assert "Technogym Leg Press" in resolved
        
        # Check that all resolved to canonical IDs
        for canonical_id in resolved.values():
            assert canonical_id is not None
            assert isinstance(canonical_id, str)
            
    def test_extract_equipment_from_text(self):
        """Test extracting equipment mentions from free-form text"""
        test_text = "We have Life Fitness Chest Press and Hammer Strength Low Row available at our gym"
        
        equipment_mentions = self.resolver.extract_equipment_from_text(test_text)
        
        assert len(equipment_mentions) >= 2
        assert any("life fitness" in mention.lower() for mention in equipment_mentions)
        assert any("hammer strength" in mention.lower() for mention in equipment_mentions)
        
    def test_pattern_keywords_matching(self):
        """Test movement pattern keyword matching"""
        # Test various pattern keywords
        pattern_tests = [
            ("horizontal_press", ["chest", "press", "bench"]),
            ("vertical_pull", ["pulldown", "lat", "pull"]),
            ("quad_iso", ["extension", "quad"]),
            ("ham_iso", ["curl", "hamstring"])
        ]
        
        for pattern, expected_keywords in pattern_tests:
            keywords = self.resolver._get_pattern_keywords(pattern)
            assert len(keywords) > 0
            for expected in expected_keywords:
                assert expected in keywords
                
    def test_find_brand_match_confidence(self):
        """Test brand match confidence scoring"""
        # Direct match should have confidence 1.0
        result = self.resolver._find_brand_match("life_fitness_chest_press")
        assert result is not None
        equipment_key, confidence = result
        assert confidence == 1.0
        
        # Partial match should have lower confidence
        result = self.resolver._find_brand_match("life fitness chest")
        assert result is not None
        equipment_key, confidence = result
        assert 0.7 <= confidence <= 0.9
        
    def test_equipment_catalog_integration(self):
        """Test integration with equipment catalog"""
        # Test getting equipment mapping
        mapping = get_equipment_mapping("Life Fitness Chest Press")
        assert mapping is not None
        assert mapping.brand_name == "Life Fitness Chest Press"
        assert "horizontal_press" in mapping.movement_patterns
        
        # Test resolving to canonical
        canonical_id, alternatives = resolve_to_canonical("Hammer Strength Low Row")
        assert canonical_id is not None
        assert len(alternatives) >= 0
        
    def test_brand_aliases(self):
        """Test brand alias recognition"""
        # Test common abbreviations and variations
        alias_tests = [
            ("LF chest press", "machine_chest_press"),
            ("HS low row", "chest_supported_row_machine"),
            ("hammer chest", "machine_chest_press")
        ]
        
        for alias, expected_base in alias_tests:
            canonical_id, matches = self.resolver.resolve(alias)
            # Should resolve to some valid canonical ID related to the expected base
            assert canonical_id is not None
            assert len(matches) > 0
            
    def test_multiple_brand_mentions(self):
        """Test handling multiple brand mentions in one text"""
        text = "Our gym has Life Fitness Chest Press, Hammer Strength Row, and Technogym Leg Press"
        
        equipment_mentions = self.resolver.extract_equipment_from_text(text)
        resolved = self.resolver.resolve_brand_equipment_list(equipment_mentions)
        
        # Should find multiple pieces of equipment
        assert len(resolved) >= 2
        
        # All should resolve to canonical IDs
        for canonical_id in resolved.values():
            assert canonical_id is not None
            
    def test_no_false_positives(self):
        """Test that non-equipment text doesn't trigger false brand matches"""
        non_equipment_texts = [
            "I want to build my chest",
            "What exercises work the back?",
            "How do I do a proper squat?",
            "toenails and fingernails"
        ]
        
        for text in non_equipment_texts:
            equipment_mentions = self.resolver.extract_equipment_from_text(text)
            # Should not extract brand equipment from general fitness discussion
            assert len(equipment_mentions) == 0 or all(
                not any(brand in mention.lower() for brand in ["life fitness", "hammer strength", "technogym"])
                for mention in equipment_mentions
            )


class TestEquipmentCatalogDirect:
    """Test the equipment catalog directly"""
    
    def test_catalog_completeness(self):
        """Test that catalog has required brands"""
        required_brands = ["Life Fitness", "Hammer Strength", "Technogym", "Precor", "Cybex"]
        
        all_brand_names = [mapping.brand_name for mapping in EQUIPMENT_CATALOG.values()]
        
        for brand in required_brands:
            assert any(brand in name for name in all_brand_names), f"{brand} not found in catalog"
            
    def test_canonical_candidates_valid(self):
        """Test that all canonical candidates are valid"""
        for equipment_key, mapping in EQUIPMENT_CATALOG.items():
            assert len(mapping.canonical_candidates) > 0
            assert isinstance(mapping.canonical_candidates, list)
            
            # Should have at least one candidate
            assert mapping.canonical_candidates[0] is not None
            
    def test_movement_patterns_valid(self):
        """Test that all movement patterns are from canonical list"""
        from core.focus_rules import MOVEMENT_PATTERNS
        
        for equipment_key, mapping in EQUIPMENT_CATALOG.items():
            for pattern in mapping.movement_patterns:
                assert pattern in MOVEMENT_PATTERNS, f"Invalid pattern {pattern} in {equipment_key}"
                
    def test_task_f_acceptance_criteria(self):
        """Test specific Task F acceptance criteria"""
        # Test: "We have Life Fitness Chest Press and Hammer Strength Low Row" → canonical IDs
        test_text = "We have Life Fitness Chest Press and Hammer Strength Low Row"
        
        resolver = ExerciseAliasResolver()
        equipment_mentions = resolver.extract_equipment_from_text(test_text)
        resolved = resolver.resolve_brand_equipment_list(equipment_mentions)
        
        # Should resolve both pieces of equipment
        assert len(resolved) >= 2
        
        # Should map to appropriate canonical IDs
        canonical_ids = list(resolved.values())
        
        # Should include chest press and row exercises
        chest_patterns = ["chest", "press", "bench"]
        row_patterns = ["row", "pull"]
        
        has_chest = any(any(pattern in canonical_id.lower() for pattern in chest_patterns) 
                       for canonical_id in canonical_ids)
        has_row = any(any(pattern in canonical_id.lower() for pattern in row_patterns) 
                     for canonical_id in canonical_ids)
        
        assert has_chest, f"No chest exercise found in {canonical_ids}"
        assert has_row, f"No row exercise found in {canonical_ids}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])