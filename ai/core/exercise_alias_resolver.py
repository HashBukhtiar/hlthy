"""Exercise Alias Resolver - Maps user input to canonical exercise IDs with fuzzy matching"""

import difflib
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import json
import os

from .exercise_database import CANONICAL_EXERCISES
from .equipment_catalog import EQUIPMENT_CATALOG, get_canonical_exercises_for_brand

@dataclass
class AliasMatch:
    """Represents a potential match for an exercise name"""
    canonical_id: str
    display_name: str
    confidence: float
    match_type: str  # 'exact', 'alias', 'brand', 'fuzzy'

class ExerciseAliasResolver:
    def __init__(self):
        self.name_index = {}
        self.brand_index = {}
        self._build_indices()
        self.resolution_cache = {}
        self.user_confirmations = self._load_user_confirmations()
    
    def _build_indices(self):
        """Build search indices from database and equipment catalog"""
        # Index canonical exercises
        for exercise_id, exercise in CANONICAL_EXERCISES.items():
            # Index by ID
            self.name_index[exercise_id.lower()] = exercise_id
            
            # Index by display name
            self.name_index[exercise.display_name.lower()] = exercise_id
            
            # Index by common names
            for common_name in exercise.common_names:
                self.name_index[common_name.lower()] = exercise_id
        
        # Index brand equipment
        for equipment_key, mapping in EQUIPMENT_CATALOG.items():
            self.brand_index[mapping.brand_name.lower()] = equipment_key
            # Add variations without underscores
            clean_name = mapping.brand_name.lower().replace("_", " ")
            self.brand_index[clean_name] = equipment_key
    
    def resolve(self, exercise_name: str, context: Dict = None) -> Tuple[Optional[str], List[AliasMatch]]:
        """
        Resolve an exercise name to canonical ID
        
        Returns:
            Tuple of (canonical_id if confident, list of suggestions)
        """
        if not exercise_name:
            return None, []
        
        normalized = exercise_name.lower().strip()
        
        # Check user confirmations first
        if normalized in self.user_confirmations:
            return self.user_confirmations[normalized], []
        
        # Check resolution cache
        if normalized in self.resolution_cache:
            return self.resolution_cache[normalized]
        
        matches = []
        
        # 1. Exact match on canonical ID or name
        if normalized in self.name_index:
            canonical_id = self.name_index[normalized]
            match = AliasMatch(
                canonical_id=canonical_id,
                display_name=CANONICAL_EXERCISES[canonical_id].display_name,
                confidence=1.0,
                match_type='exact'
            )
            matches.append(match)
            self.resolution_cache[normalized] = (canonical_id, [match])
            return canonical_id, [match]
        
        # 2. Enhanced brand equipment matching with partial matches
        brand_match = self._find_brand_match(normalized)
        if brand_match:
            equipment_key, confidence = brand_match
            mapping = EQUIPMENT_CATALOG[equipment_key]
            for candidate_id in mapping.canonical_candidates[:3]:
                if candidate_id in CANONICAL_EXERCISES:
                    match = AliasMatch(
                        canonical_id=candidate_id,
                        display_name=CANONICAL_EXERCISES[candidate_id].display_name,
                        confidence=confidence,
                        match_type='brand'
                    )
                    matches.append(match)
        
        # If we have high-confidence brand matches, use them
        if matches and matches[0].confidence >= 0.9:
            self.resolution_cache[normalized] = (matches[0].canonical_id, matches)
            return matches[0].canonical_id, matches
        
        # 3. Fuzzy matching
        all_names = list(self.name_index.keys())
        close_matches = difflib.get_close_matches(normalized, all_names, n=5, cutoff=0.6)
        
        for close_match in close_matches:
            canonical_id = self.name_index[close_match]
            similarity = difflib.SequenceMatcher(None, normalized, close_match).ratio()
            
            # Check if already added from brand matching
            if not any(m.canonical_id == canonical_id for m in matches):
                match = AliasMatch(
                    canonical_id=canonical_id,
                    display_name=CANONICAL_EXERCISES[canonical_id].display_name,
                    confidence=similarity,
                    match_type='fuzzy'
                )
                matches.append(match)
        
        # Sort by confidence
        matches.sort(key=lambda x: x.confidence, reverse=True)
        
        # If top match has high confidence, return it
        if matches and matches[0].confidence >= 0.85:
            canonical_id = matches[0].canonical_id
            self.resolution_cache[normalized] = (canonical_id, matches[:3])
            return canonical_id, matches[:3]
        
        # Return top 3 suggestions for user confirmation
        self.resolution_cache[normalized] = (None, matches[:3])
        return None, matches[:3]
    
    def _find_brand_match(self, normalized_name: str) -> Optional[Tuple[str, float]]:
        """
        Find best brand equipment match with confidence score
        Returns (equipment_key, confidence) or None
        """
        # Direct lookup in brand index
        if normalized_name in self.brand_index:
            return self.brand_index[normalized_name], 1.0
        
        # Check for partial brand name matches
        for brand_key, equipment_key in self.brand_index.items():
            # Check if normalized_name contains brand keywords
            brand_words = brand_key.split()
            input_words = normalized_name.split()
            
            # Check for partial matches (e.g., "life fitness chest" -> "life_fitness_chest_press")
            if len(brand_words) >= 2:  # Multi-word brands
                brand_name = " ".join(brand_words[:2])  # First two words (e.g., "life fitness")
                if brand_name in normalized_name:
                    # Check if exercise type is mentioned
                    equipment_mapping = EQUIPMENT_CATALOG.get(equipment_key)
                    if equipment_mapping:
                        # Look for exercise-specific keywords
                        for pattern in equipment_mapping.movement_patterns:
                            if any(keyword in normalized_name for keyword in self._get_pattern_keywords(pattern)):
                                return equipment_key, 0.9
                        # If no specific pattern found but brand matched, return with lower confidence
                        return equipment_key, 0.7
            
            # Single word brand matches
            elif brand_key in normalized_name:
                return equipment_key, 0.8
        
        return None
    
    def _get_pattern_keywords(self, pattern: str) -> List[str]:
        """
        Get keywords associated with movement patterns for brand matching
        """
        pattern_keywords = {
            'horizontal_press': ['chest', 'press', 'bench'],
            'incline_press': ['incline', 'upper'],
            'vertical_press': ['shoulder', 'overhead', 'military'],
            'fly': ['fly', 'pec', 'deck'],
            'vertical_pull': ['pulldown', 'lat', 'pull'],
            'horizontal_pull': ['row', 'seated', 'cable'],
            'pullover': ['pullover'],
            'squat': ['squat', 'hack'],
            'leg_press': ['leg', 'press'],
            'hinge': ['deadlift', 'romanian'],
            'lunge': ['lunge', 'split'],
            'quad_iso': ['extension', 'quad'],
            'ham_iso': ['curl', 'hamstring'],
            'glute_iso': ['glute', 'hip'],
            'calf': ['calf', 'raise'],
            'lateral_delt': ['lateral', 'side'],
            'front_delt': ['front', 'anterior'],
            'rear_delt': ['rear', 'posterior'],
            'biceps': ['bicep', 'curl'],
            'triceps': ['tricep', 'dips'],
            'core_anti_extension': ['plank', 'dead', 'bug'],
            'core_rotation': ['russian', 'twist'],
            'core_anti_rotation': ['pallof', 'suitcase'],
            'core_flexion': ['crunch', 'sit']
        }
        return pattern_keywords.get(pattern, [])
    
    def resolve_brand_equipment_list(self, equipment_mentions: List[str]) -> Dict[str, str]:
        """
        Resolve a list of brand equipment mentions to canonical exercise IDs
        Useful for handling user responses like "We have Life Fitness Chest Press and Hammer Strength Low Row"
        
        Returns: Dict mapping original mention to canonical ID
        """
        resolved_equipment = {}
        
        for mention in equipment_mentions:
            canonical_id, matches = self.resolve(mention)
            if canonical_id:
                resolved_equipment[mention] = canonical_id
            elif matches:
                # Take the highest confidence match
                resolved_equipment[mention] = matches[0].canonical_id
        
        return resolved_equipment
    
    def extract_equipment_from_text(self, text: str) -> List[str]:
        """
        Extract potential equipment mentions from free-form text
        Looks for brand names followed by exercise types
        """
        equipment_mentions = []
        text_lower = text.lower()
        
        # Look for known brand patterns
        brand_patterns = [
            r'life fitness \w+(?:\s+\w+)?',
            r'hammer strength \w+(?:\s+\w+)?',
            r'technogym \w+(?:\s+\w+)?',
            r'precor \w+(?:\s+\w+)?',
            r'cybex \w+(?:\s+\w+)?',
            r'matrix \w+(?:\s+\w+)?',
            r'nautilus \w+(?:\s+\w+)?'
        ]
        
        import re
        for pattern in brand_patterns:
            matches = re.findall(pattern, text_lower)
            equipment_mentions.extend(matches)
        
        return equipment_mentions
    
    def confirm_resolution(self, exercise_name: str, canonical_id: str):
        """Store user confirmation of exercise mapping"""
        normalized = exercise_name.lower().strip()
        self.user_confirmations[normalized] = canonical_id
        self._save_user_confirmations()
        # Update cache
        if normalized in self.resolution_cache:
            del self.resolution_cache[normalized]
    
    def _load_user_confirmations(self) -> Dict[str, str]:
        """Load user-confirmed mappings from file"""
        filepath = "user_confirmations.json"
        if os.path.exists(filepath):
            try:
                with open(filepath, 'r') as f:
                    return json.load(f)
            except:
                pass
        return {}
    
    def _save_user_confirmations(self):
        """Save user-confirmed mappings to file"""
        filepath = "user_confirmations.json"
        try:
            with open(filepath, 'w') as f:
                json.dump(self.user_confirmations, f, indent=2)
        except:
            pass
    
    def get_equipment_suggestions_for_focus(self, focus: str) -> List[str]:
        """Get branded equipment suggestions for a workout focus"""
        suggestions = []
        
        # Map focus to movement patterns
        focus_patterns = {
            'chest': ['horizontal_press', 'incline_press', 'fly'],
            'back': ['horizontal_pull', 'vertical_pull', 'pullover'],
            'shoulders': ['vertical_press', 'lateral_delt'],
            'legs': ['squat', 'leg_press', 'quad_iso', 'ham_iso'],
            'push': ['horizontal_press', 'vertical_press'],
            'pull': ['horizontal_pull', 'vertical_pull'],
        }
        
        patterns = focus_patterns.get(focus.lower(), [])
        
        for pattern in patterns:
            for equipment_key, mapping in EQUIPMENT_CATALOG.items():
                if pattern in [p.lower() for p in mapping.movement_patterns]:
                    suggestions.append(mapping.brand_name)
        
        return list(set(suggestions))[:10]  # Return unique, limited list

# Global resolver instance
resolver = ExerciseAliasResolver()

def resolve_exercise_name(name: str, context: Dict = None) -> Tuple[Optional[str], List[Dict]]:
    """
    Global function to resolve exercise names
    
    Returns:
        Tuple of (canonical_id if confident, list of suggestion dicts)
    """
    canonical_id, matches = resolver.resolve(name, context)
    
    suggestions = []
    for match in matches:
        suggestions.append({
            'id': match.canonical_id,
            'name': match.display_name,
            'confidence': match.confidence,
            'type': match.match_type
        })
    
    return canonical_id, suggestions

def confirm_exercise_mapping(name: str, canonical_id: str):
    """Confirm a user's choice for exercise mapping"""
    resolver.confirm_resolution(name, canonical_id)

def get_equipment_for_workout(focus: str) -> List[str]:
    """Get equipment suggestions for a workout focus"""
    return resolver.get_equipment_suggestions_for_focus(focus)
