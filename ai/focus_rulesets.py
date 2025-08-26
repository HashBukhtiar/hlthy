"""
Focus Rulesets - High-level ruleset applications for different workout contexts
"""
from typing import Dict, Optional, List
from focus_rules import normalize_focus, parse_combo


# Ruleset definitions for different contexts
RULESETS = {
    "beginner": {
        "description": "Conservative approach for beginners",
        "max_exercises": 6,
        "max_sets_per_exercise": 3,
        "prefer_compounds": True,
        "avoid_advanced_techniques": True,
        "recovery_emphasis": "high"
    },
    
    "intermediate": {
        "description": "Balanced approach for intermediate trainees",
        "max_exercises": 8,
        "max_sets_per_exercise": 4,
        "prefer_compounds": True,
        "avoid_advanced_techniques": False,
        "recovery_emphasis": "medium"
    },
    
    "advanced": {
        "description": "Intensive approach for advanced trainees",
        "max_exercises": 10,
        "max_sets_per_exercise": 5,
        "prefer_compounds": False,
        "avoid_advanced_techniques": False,
        "recovery_emphasis": "low"
    },
    
    "time_efficient": {
        "description": "Quick workouts with high efficiency",
        "max_exercises": 5,
        "max_sets_per_exercise": 4,
        "prefer_compounds": True,
        "avoid_advanced_techniques": True,
        "recovery_emphasis": "medium"
    },
    
    "high_volume": {
        "description": "Higher volume for experienced trainees",
        "max_exercises": 12,
        "max_sets_per_exercise": 6,
        "prefer_compounds": False,
        "avoid_advanced_techniques": False,
        "recovery_emphasis": "low"
    },
    
    "rehabilitation": {
        "description": "Conservative approach for injury recovery",
        "max_exercises": 4,
        "max_sets_per_exercise": 2,
        "prefer_compounds": False,
        "avoid_advanced_techniques": True,
        "recovery_emphasis": "very_high"
    }
}


# Focus-specific modifications to base rulesets
FOCUS_MODIFICATIONS = {
    "full_body": {
        "max_exercises": lambda base: max(6, min(base, 8)),  # Force 6-8 for full body
        "prefer_compounds": True,  # Always prefer compounds for full body
        "efficiency_priority": "high"
    },
    
    "arms": {
        "max_exercises": lambda base: min(base + 2, 10),  # Allow more exercises for arms
        "prefer_compounds": False,  # Arms work better with isolation
        "volume_density": "high"
    },
    
    "legs": {
        "max_sets_per_exercise": lambda base: min(base + 1, 5),  # Slightly higher sets for legs
        "recovery_emphasis": lambda current: "high" if current == "low" else current,  # Upgrade recovery
        "compound_priority": "very_high"
    },
    
    "core": {
        "max_exercises": lambda base: min(base, 6),  # Limit core exercises
        "max_sets_per_exercise": lambda base: min(base, 3),  # Lower sets for core
        "technique_focus": "very_high"
    },
    
    "calves": {
        "max_exercises": lambda base: min(base, 4),  # Limited calf exercises
        "volume_density": "very_high",  # High volume for calves
        "exercise_variety": "low"
    }
}


class FocusRuleset:
    """Manages ruleset application and focus-specific modifications."""
    
    def __init__(self, base_ruleset: str = "intermediate"):
        """
        Initialize with base ruleset.
        
        Args:
            base_ruleset: Base ruleset name from RULESETS
        """
        self.base_ruleset = base_ruleset
        self.rules = RULESETS.get(base_ruleset, RULESETS["intermediate"]).copy()
    
    def apply_focus_modifications(self, focus: str) -> Dict:
        """
        Apply focus-specific modifications to base ruleset.
        
        Args:
            focus: Focus type or combo
            
        Returns:
            Modified ruleset dictionary
        """
        modified_rules = self.rules.copy()
        
        # Handle combo focus
        combo = parse_combo(focus)
        if combo:
            focusA, focusB, weightA = combo
            # Apply modifications for both focuses, prioritizing focusA
            modified_rules = self._apply_single_focus_modifications(modified_rules, focusA)
            modified_rules = self._apply_single_focus_modifications(modified_rules, focusB, weight=0.3)
        else:
            normalized_focus = normalize_focus(focus)
            modified_rules = self._apply_single_focus_modifications(modified_rules, normalized_focus)
        
        return modified_rules
    
    def _apply_single_focus_modifications(self, rules: Dict, focus: str, weight: float = 1.0) -> Dict:
        """Apply modifications for a single focus."""
        if focus not in FOCUS_MODIFICATIONS:
            return rules
        
        modifications = FOCUS_MODIFICATIONS[focus]
        modified_rules = rules.copy()
        
        for key, value in modifications.items():
            if key in modified_rules:
                if callable(value):
                    # Apply function modification
                    current_value = modified_rules[key]
                    if isinstance(current_value, (int, float)):
                        modified_rules[key] = value(current_value)
                    else:
                        modified_rules[key] = value(current_value)
                else:
                    # Direct value replacement (with weight consideration for combos)
                    if weight < 1.0 and isinstance(value, str):
                        # For combo focuses, don't override certain string values
                        continue
                    modified_rules[key] = value
        
        return modified_rules
    
    def get_exercise_limits(self, focus: str) -> Dict[str, int]:
        """Get exercise count and set limits for focus."""
        rules = self.apply_focus_modifications(focus)
        
        return {
            "max_exercises": rules.get("max_exercises", 8),
            "max_sets_per_exercise": rules.get("max_sets_per_exercise", 4),
            "recommended_total_sets": self._calculate_recommended_sets(rules, focus)
        }
    
    def _calculate_recommended_sets(self, rules: Dict, focus: str) -> int:
        """Calculate recommended total sets based on focus and rules."""
        base_sets = rules.get("max_exercises", 8) * 3  # Conservative base
        
        # Focus-specific adjustments
        if focus in ["full_body"]:
            return min(base_sets, 20)  # Cap full body
        elif focus in ["arms", "biceps", "triceps"]:
            return min(base_sets + 6, 24)  # Allow more for arms
        elif focus in ["legs", "quads", "hamstrings", "glutes"]:
            return min(base_sets + 4, 22)  # Slightly more for legs
        elif focus in ["calves", "core"]:
            return min(base_sets - 2, 16)  # Less for smaller muscle groups
        
        return base_sets
    
    def get_exercise_selection_guidance(self, focus: str) -> Dict[str, any]:
        """Get exercise selection guidance for focus."""
        rules = self.apply_focus_modifications(focus)
        
        guidance = {
            "prefer_compounds": rules.get("prefer_compounds", True),
            "allow_advanced_techniques": not rules.get("avoid_advanced_techniques", False),
            "recovery_emphasis": rules.get("recovery_emphasis", "medium"),
            "exercise_variety": rules.get("exercise_variety", "medium"),
            "volume_density": rules.get("volume_density", "medium")
        }
        
        # Add focus-specific guidance
        if focus == "full_body":
            guidance["movement_priority"] = ["squat", "press", "pull", "hinge"]
            guidance["time_efficiency"] = "critical"
        elif focus in ["push", "pull"]:
            guidance["pattern_balance"] = "required"
        elif focus in ["chest", "back", "shoulders"]:
            guidance["angle_variety"] = "important"
        elif focus in ["legs", "quads", "hamstrings", "glutes"]:
            guidance["bilateral_focus"] = True
        
        return guidance
    
    @classmethod
    def get_available_rulesets(cls) -> List[str]:
        """Get list of available ruleset names."""
        return list(RULESETS.keys())
    
    @classmethod
    def get_ruleset_description(cls, ruleset: str) -> str:
        """Get description of a ruleset."""
        return RULESETS.get(ruleset, {}).get("description", "Unknown ruleset")
