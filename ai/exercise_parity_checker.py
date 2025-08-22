"""
Exercise Database Parity Checker
Ensures mobile app exercises.ts matches canonical database IDs and safety data
"""

import json
import re
from typing import Dict, List, Tuple, Set
from pathlib import Path
from exercise_database import CANONICAL_EXERCISES, ExerciseProfile

class ExerciseParity:
    """Checks parity between mobile app and canonical database"""
    
    def __init__(self):
        self.app_exercises = self._load_app_exercises()
        self.canonical_exercises = CANONICAL_EXERCISES
        self.parity_report = {}
    
    def _load_app_exercises(self) -> Dict[str, Dict]:
        """Load exercises from mobile app's exercises.ts"""
        app_file = Path("../data/exercises.ts")
        
        if not app_file.exists():
            print(f"⚠️  App exercises file not found: {app_file}")
            return {}
        
        try:
            with open(app_file, 'r') as f:
                content = f.read()
            
            # Extract the exercises array using regex
            pattern = r'export const exercises: Exercise\[\] = \[(.*?)\];'
            match = re.search(pattern, content, re.DOTALL)
            
            if not match:
                print("⚠️  Could not parse exercises array from TypeScript file")
                return {}
            
            exercises_text = match.group(1)
            
            # Parse each exercise object (simplified parser)
            exercises = {}
            exercise_blocks = re.findall(r'\{(.*?)\}(?=,|\s*$)', exercises_text, re.DOTALL)
            
            for block in exercise_blocks:
                exercise = self._parse_exercise_block(block)
                if exercise and 'id' in exercise:
                    exercises[exercise['id']] = exercise
            
            print(f"📱 Loaded {len(exercises)} exercises from mobile app")
            return exercises
            
        except Exception as e:
            print(f"Error loading app exercises: {e}")
            return {}
    
    def _parse_exercise_block(self, block: str) -> Dict:
        """Parse a single exercise object from TypeScript"""
        exercise = {}
        
        # Extract key-value pairs
        patterns = {
            'id': r"id:\s*['\"]([^'\"]+)['\"]",
            'name': r"name:\s*['\"]([^'\"]+)['\"]",
            'category': r"category:\s*['\"]([^'\"]+)['\"]",
            'primaryMuscles': r"primaryMuscles:\s*\[([^\]]+)\]",
            'secondaryMuscles': r"secondaryMuscles:\s*\[([^\]]+)\]",
            'equipment': r"equipment:\s*\[([^\]]+)\]",
            'description': r"description:\s*['\"]([^'\"]*)['\"]",
            'metricType': r"metricType:\s*['\"]([^'\"]+)['\"]"
        }
        
        for key, pattern in patterns.items():
            match = re.search(pattern, block, re.DOTALL)
            if match:
                value = match.group(1)
                if key in ['primaryMuscles', 'secondaryMuscles', 'equipment']:
                    # Parse arrays
                    items = re.findall(r"['\"]([^'\"]+)['\"]", value)
                    exercise[key] = items
                else:
                    exercise[key] = value
        
        return exercise
    
    def check_id_consistency(self) -> Dict[str, List[str]]:
        """Check ID consistency between app and canonical database"""
        app_ids = set(self.app_exercises.keys())
        canonical_ids = set(self.canonical_exercises.keys())
        
        # String IDs in app vs proper exercise IDs in canonical
        canonical_names = {ex.display_name.lower().replace(' ', '_'): ex_id 
                          for ex_id, ex in self.canonical_exercises.items()}
        
        results = {
            "app_only": [],
            "canonical_only": [],
            "name_matches": [],
            "id_mismatches": [],
            "suggestions": []
        }
        
        # Exercises only in app
        for app_id in app_ids:
            if app_id not in canonical_ids:
                app_ex = self.app_exercises[app_id]
                app_name = app_ex.get('name', '').lower().replace(' ', '_')
                
                if app_name in canonical_names:
                    canonical_id = canonical_names[app_name]
                    results["name_matches"].append({
                        "app_id": app_id,
                        "app_name": app_ex.get('name'),
                        "canonical_id": canonical_id,
                        "canonical_name": self.canonical_exercises[canonical_id].display_name
                    })
                else:
                    results["app_only"].append({
                        "id": app_id,
                        "name": app_ex.get('name'),
                        "category": app_ex.get('category')
                    })
        
        # Exercises only in canonical
        canonical_names_reverse = {ex.display_name: ex_id for ex_id, ex in self.canonical_exercises.items()}
        for canonical_id, canonical_ex in self.canonical_exercises.items():
            if canonical_id not in app_ids:
                # Check if name exists in app
                matching_app = None
                for app_id, app_ex in self.app_exercises.items():
                    if app_ex.get('name', '').lower() == canonical_ex.display_name.lower():
                        matching_app = app_id
                        break
                
                if matching_app:
                    results["id_mismatches"].append({
                        "canonical_id": canonical_id,
                        "canonical_name": canonical_ex.display_name,
                        "app_id": matching_app,
                        "app_name": self.app_exercises[matching_app].get('name')
                    })
                else:
                    results["canonical_only"].append({
                        "id": canonical_id,
                        "name": canonical_ex.display_name,
                        "risk_level": canonical_ex.risk_level.value,
                        "equipment": canonical_ex.equipment_required
                    })
        
        return results
    
    def check_safety_coverage(self) -> Dict[str, any]:
        """Check which app exercises lack safety data"""
        results = {
            "covered": [],
            "missing_safety": [],
            "risk_analysis": {"low": 0, "moderate": 0, "high": 0, "extreme": 0}
        }
        
        for app_id, app_ex in self.app_exercises.items():
            app_name = app_ex.get('name', '')
            
            # Find matching canonical exercise
            canonical_match = None
            for canonical_id, canonical_ex in self.canonical_exercises.items():
                if (canonical_ex.display_name.lower() == app_name.lower() or 
                    canonical_id == app_id):
                    canonical_match = canonical_ex
                    break
            
            if canonical_match:
                results["covered"].append({
                    "app_id": app_id,
                    "name": app_name,
                    "risk_level": canonical_match.risk_level.value,
                    "contraindications": len(canonical_match.injury_contraindications)
                })
                results["risk_analysis"][canonical_match.risk_level.value] += 1
            else:
                results["missing_safety"].append({
                    "app_id": app_id,
                    "name": app_name,
                    "category": app_ex.get('category'),
                    "equipment": app_ex.get('equipment', [])
                })
        
        return results
    
    def generate_migration_suggestions(self) -> List[Dict[str, str]]:
        """Generate suggestions for migrating app to canonical IDs"""
        suggestions = []
        
        # Get consistency check
        consistency = self.check_id_consistency()
        
        # ID migration suggestions
        for match in consistency["name_matches"]:
            suggestions.append({
                "type": "ID_UPDATE",
                "action": f"Change app exercise ID '{match['app_id']}' to '{match['canonical_id']}'",
                "reason": f"Name matches canonical exercise '{match['canonical_name']}'",
                "priority": "HIGH"
            })
        
        for mismatch in consistency["id_mismatches"]:
            suggestions.append({
                "type": "ID_ALIGNMENT",
                "action": f"Update app exercise '{mismatch['app_id']}' to use canonical ID '{mismatch['canonical_id']}'",
                "reason": "Same exercise, different IDs",
                "priority": "HIGH"
            })
        
        # Safety data additions
        safety = self.check_safety_coverage()
        for missing in safety["missing_safety"]:
            suggestions.append({
                "type": "SAFETY_ADDITION",
                "action": f"Add '{missing['name']}' to canonical database with safety data",
                "reason": f"Exercise exists in app but lacks safety validation",
                "priority": "MEDIUM"
            })
        
        # Canonical exercises missing from app
        for missing in consistency["canonical_only"]:
            if missing["risk_level"] in ["low", "moderate"]:
                suggestions.append({
                    "type": "APP_ADDITION", 
                    "action": f"Add '{missing['name']}' (ID: {missing['id']}) to mobile app",
                    "reason": f"Safe exercise ({missing['risk_level']} risk) available in canonical DB",
                    "priority": "LOW"
                })
        
        return suggestions
    
    def run_full_parity_check(self) -> Dict[str, any]:
        """Run complete parity analysis"""
        print("🔍 Running exercise parity check...")
        
        consistency = self.check_id_consistency()
        safety = self.check_safety_coverage()
        suggestions = self.generate_migration_suggestions()
        
        # Summary statistics
        app_count = len(self.app_exercises)
        canonical_count = len(self.canonical_exercises)
        covered_count = len(safety["covered"])
        
        report = {
            "summary": {
                "app_exercises": app_count,
                "canonical_exercises": canonical_count,
                "safety_covered": covered_count,
                "coverage_rate": f"{(covered_count / max(1, app_count) * 100):.1f}%",
                "total_suggestions": len(suggestions)
            },
            "id_consistency": consistency,
            "safety_coverage": safety,
            "migration_suggestions": suggestions
        }
        
        self.parity_report = report
        return report
    
    def print_parity_summary(self):
        """Print human-readable parity summary"""
        if not self.parity_report:
            self.run_full_parity_check()
        
        report = self.parity_report
        summary = report["summary"]
        
        print(f"\n📊 EXERCISE PARITY SUMMARY")
        print(f"{'='*50}")
        print(f"App exercises: {summary['app_exercises']}")
        print(f"Canonical exercises: {summary['canonical_exercises']}")
        print(f"Safety coverage: {summary['safety_covered']}/{summary['app_exercises']} ({summary['coverage_rate']})")
        print(f"Migration suggestions: {summary['total_suggestions']}")
        
        # ID Issues
        consistency = report["id_consistency"]
        if consistency["name_matches"] or consistency["id_mismatches"]:
            print(f"\n⚠️  ID CONSISTENCY ISSUES:")
            for match in consistency["name_matches"][:3]:
                print(f"  • '{match['app_name']}' uses ID '{match['app_id']}' → should be '{match['canonical_id']}'")
            
            if len(consistency["name_matches"]) > 3:
                print(f"  ... and {len(consistency['name_matches']) - 3} more")
        
        # Safety Coverage  
        safety = report["safety_coverage"]
        if safety["missing_safety"]:
            print(f"\n🚨 MISSING SAFETY DATA:")
            for missing in safety["missing_safety"][:3]:
                print(f"  • '{missing['name']}' (ID: {missing['app_id']}) - no safety validation")
            
            if len(safety["missing_safety"]) > 3:
                print(f"  ... and {len(safety['missing_safety']) - 3} more")
        
        # Risk Distribution
        risk_dist = safety["risk_analysis"]
        print(f"\n📈 RISK DISTRIBUTION (covered exercises):")
        for risk, count in risk_dist.items():
            if count > 0:
                print(f"  • {risk.capitalize()}: {count} exercises")
        
        # Top Priority Suggestions
        high_priority = [s for s in report["migration_suggestions"] if s["priority"] == "HIGH"]
        if high_priority:
            print(f"\n🎯 HIGH PRIORITY ACTIONS:")
            for suggestion in high_priority[:3]:
                print(f"  • {suggestion['action']}")
            
            if len(high_priority) > 3:
                print(f"  ... and {len(high_priority) - 3} more")
        
        print(f"\n✅ Parity check complete")
    
    def generate_migration_file(self, output_path: str = "exercise_migration.json"):
        """Generate migration file for app developers"""
        if not self.parity_report:
            self.run_full_parity_check()
        
        # Create developer-friendly migration guide
        migration_data = {
            "migration_version": "1.0",
            "generated_at": "2024-01-20",
            "summary": self.parity_report["summary"],
            "id_updates": [
                {
                    "old_id": match["app_id"],
                    "new_id": match["canonical_id"], 
                    "exercise_name": match["app_name"],
                    "action": "UPDATE_ID"
                }
                for match in self.parity_report["id_consistency"]["name_matches"]
            ],
            "safety_additions": [
                {
                    "exercise_id": missing["app_id"],
                    "exercise_name": missing["name"],
                    "action": "ADD_TO_CANONICAL_DB",
                    "category": missing["category"]
                }
                for missing in self.parity_report["safety_coverage"]["missing_safety"]
            ],
            "validation_notes": [
                "All exercise IDs must match canonical database for safety validation",
                "New exercises require safety risk assessment before addition",
                "Consider injury contraindications when adding high-risk exercises",
                "Equipment requirements should match between app and canonical DB"
            ]
        }
        
        with open(output_path, 'w') as f:
            json.dump(migration_data, f, indent=2)
        
        print(f"💾 Migration file saved to: {output_path}")

# Usage functions
def check_app_parity():
    """Main function to check exercise parity"""
    checker = ExerciseParity()
    checker.run_full_parity_check()
    checker.print_parity_summary()
    checker.generate_migration_file()
    return checker

if __name__ == "__main__":
    check_app_parity()
