"""Equipment Catalog - Maps branded machine names to canonical exercise families and IDs"""

from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from .focus_rules import MOVEMENT_PATTERNS

@dataclass
class EquipmentMapping:
    """Maps branded equipment to canonical exercise patterns"""
    brand_name: str
    equipment_type: str
    movement_patterns: List[str]
    muscle_families: List[str]
    canonical_candidates: List[str]  # Ordered by preference

# Real branded equipment mappings
EQUIPMENT_CATALOG: Dict[str, EquipmentMapping] = {
    # LIFE FITNESS MACHINES
    "life_fitness_chest_press": EquipmentMapping(
        brand_name="Life Fitness Chest Press",
        equipment_type="machine",
        movement_patterns=["horizontal_press"],
        muscle_families=["chest", "triceps"],
        canonical_candidates=["machine_chest_press", "smith_machine_bench_press", "dumbbell_bench_press"]
    ),
    "life_fitness_incline_press": EquipmentMapping(
        brand_name="Life Fitness Incline Press",
        equipment_type="machine",
        movement_patterns=["incline_press"],
        muscle_families=["upper_chest", "anterior_deltoids"],
        canonical_candidates=["machine_incline_chest_press", "incline_dumbbell_press"]
    ),
    "life_fitness_lat_pulldown": EquipmentMapping(
        brand_name="Life Fitness Lat Pulldown",
        equipment_type="machine",
        movement_patterns=["vertical_pull"],
        muscle_families=["lats", "biceps"],
        canonical_candidates=["lat_pulldown", "assisted_pull_ups"]
    ),
    "life_fitness_seated_row": EquipmentMapping(
        brand_name="Life Fitness Seated Row",
        equipment_type="machine",
        movement_patterns=["horizontal_pull"],
        muscle_families=["lats", "rhomboids", "rear_delts"],
        canonical_candidates=["seated_cable_row", "machine_row"]
    ),
    "life_fitness_leg_press": EquipmentMapping(
        brand_name="Life Fitness Leg Press",
        equipment_type="machine",
        movement_patterns=["leg_press", "squat"],
        muscle_families=["quadriceps", "glutes"],
        canonical_candidates=["leg_press", "leg_press_45_degree"]
    ),
    "life_fitness_leg_extension": EquipmentMapping(
        brand_name="Life Fitness Leg Extension",
        equipment_type="machine",
        movement_patterns=["quad_iso"],
        muscle_families=["quadriceps"],
        canonical_candidates=["leg_extension"]
    ),
    "life_fitness_leg_curl": EquipmentMapping(
        brand_name="Life Fitness Leg Curl",
        equipment_type="machine",
        movement_patterns=["ham_iso"],
        muscle_families=["hamstrings"],
        canonical_candidates=["leg_curl_machine", "seated_leg_curl_machine", "lying_leg_curl_machine"]
    ),
    
    # HAMMER STRENGTH MACHINES
    "hammer_strength_chest_press": EquipmentMapping(
        brand_name="Hammer Strength Chest Press",
        equipment_type="plate_loaded",
        movement_patterns=["horizontal_press"],
        muscle_families=["chest", "triceps"],
        canonical_candidates=["machine_chest_press", "dumbbell_bench_press"]
    ),
    "hammer_strength_incline_press": EquipmentMapping(
        brand_name="Hammer Strength Incline Press",
        equipment_type="plate_loaded",
        movement_patterns=["incline_press"],
        muscle_families=["upper_chest", "anterior_deltoids"],
        canonical_candidates=["machine_incline_chest_press", "incline_barbell_bench", "incline_dumbbell_press"]
    ),
    "hammer_strength_decline_press": EquipmentMapping(
        brand_name="Hammer Strength Decline Press",
        equipment_type="plate_loaded",
        movement_patterns=["horizontal_press"],
        muscle_families=["lower_chest", "triceps"],
        canonical_candidates=["dips", "dips_assisted", "machine_chest_press"]
    ),
    "hammer_strength_low_row": EquipmentMapping(
        brand_name="Hammer Strength Low Row",
        equipment_type="plate_loaded",
        movement_patterns=["horizontal_pull"],
        muscle_families=["lats", "rhomboids", "upper_back"],
        canonical_candidates=["chest_supported_row_machine", "seated_cable_row", "machine_row"]
    ),
    "hammer_strength_high_row": EquipmentMapping(
        brand_name="Hammer Strength High Row",
        equipment_type="plate_loaded",
        movement_patterns=["horizontal_pull"],
        muscle_families=["upper_back", "rear_delts", "traps"],
        canonical_candidates=["machine_row", "seated_cable_row", "t_bar_row"]
    ),
    "hammer_strength_pulldown": EquipmentMapping(
        brand_name="Hammer Strength Pulldown",
        equipment_type="plate_loaded",
        movement_patterns=["vertical_pull"],
        muscle_families=["lats", "biceps"],
        canonical_candidates=["lat_pulldown", "pull_ups", "assisted_pull_ups"]
    ),
    "hammer_strength_shoulder_press": EquipmentMapping(
        brand_name="Hammer Strength Shoulder Press",
        equipment_type="plate_loaded",
        movement_patterns=["vertical_press"],
        muscle_families=["anterior_deltoids", "triceps"],
        canonical_candidates=["machine_shoulder_press", "dumbbell_shoulder_press"]
    ),
    "hammer_strength_v_squat": EquipmentMapping(
        brand_name="Hammer Strength V-Squat",
        equipment_type="plate_loaded",
        movement_patterns=["squat"],
        muscle_families=["quadriceps", "glutes"],
        canonical_candidates=["hack_squat", "leg_press", "front_squat"]
    ),
    
    # TECHNOGYM MACHINES
    "technogym_chest_press": EquipmentMapping(
        brand_name="Technogym Chest Press",
        equipment_type="machine",
        movement_patterns=["horizontal_press"],
        muscle_families=["chest", "triceps"],
        canonical_candidates=["machine_chest_press", "smith_machine_bench_press"]
    ),
    "technogym_pullover": EquipmentMapping(
        brand_name="Technogym Pullover",
        equipment_type="machine",
        movement_patterns=["pullover"],
        muscle_families=["lats", "chest"],
        canonical_candidates=["straight_arm_pulldown", "cable_crossover"]
    ),
    "technogym_lat_machine": EquipmentMapping(
        brand_name="Technogym Lat Machine",
        equipment_type="machine",
        movement_patterns=["vertical_pull"],
        muscle_families=["lats", "biceps"],
        canonical_candidates=["lat_pulldown", "assisted_pull_ups"]
    ),
    "technogym_low_row": EquipmentMapping(
        brand_name="Technogym Low Row",
        equipment_type="machine",
        movement_patterns=["horizontal_pull"],
        muscle_families=["lats", "rhomboids"],
        canonical_candidates=["seated_cable_row", "machine_row"]
    ),
    "technogym_leg_press": EquipmentMapping(
        brand_name="Technogym Leg Press",
        equipment_type="machine",
        movement_patterns=["leg_press"],
        muscle_families=["quadriceps", "glutes"],
        canonical_candidates=["leg_press", "leg_press_45_degree"]
    ),
    "technogym_leg_curl": EquipmentMapping(
        brand_name="Technogym Leg Curl",
        equipment_type="machine",
        movement_patterns=["ham_iso"],
        muscle_families=["hamstrings"],
        canonical_candidates=["leg_curl_machine", "lying_leg_curl_machine"]
    ),
    "technogym_leg_extension": EquipmentMapping(
        brand_name="Technogym Leg Extension",
        equipment_type="machine",
        movement_patterns=["quad_iso"],
        muscle_families=["quadriceps"],
        canonical_candidates=["leg_extension"]
    ),
    "technogym_shoulder_press": EquipmentMapping(
        brand_name="Technogym Shoulder Press",
        equipment_type="machine",
        movement_patterns=["vertical_press"],
        muscle_families=["anterior_deltoids", "triceps"],
        canonical_candidates=["machine_shoulder_press", "smith_overhead_press"]
    ),
    
    # PRECOR MACHINES
    "precor_chest_press": EquipmentMapping(
        brand_name="Precor Chest Press",
        equipment_type="machine",
        movement_patterns=["horizontal_press"],
        muscle_families=["chest", "triceps"],
        canonical_candidates=["machine_chest_press", "dumbbell_bench_press"]
    ),
    "precor_lat_pulldown": EquipmentMapping(
        brand_name="Precor Lat Pulldown",
        equipment_type="machine",
        movement_patterns=["vertical_pull"],
        muscle_families=["lats", "biceps"],
        canonical_candidates=["lat_pulldown", "assisted_pull_ups"]
    ),
    "precor_seated_row": EquipmentMapping(
        brand_name="Precor Seated Row",
        equipment_type="machine",
        movement_patterns=["horizontal_pull"],
        muscle_families=["lats", "rhomboids"],
        canonical_candidates=["seated_cable_row", "machine_row"]
    ),
    "precor_super_pullover": EquipmentMapping(
        brand_name="Precor Super Pullover",
        equipment_type="machine",
        movement_patterns=["pullover"],
        muscle_families=["lats"],
        canonical_candidates=["straight_arm_pulldown", "cable_crossover"]
    ),
    
    # CYBEX MACHINES
    "cybex_chest_press": EquipmentMapping(
        brand_name="Cybex Chest Press",
        equipment_type="machine",
        movement_patterns=["horizontal_press"],
        muscle_families=["chest", "triceps"],
        canonical_candidates=["machine_chest_press", "smith_machine_bench_press"]
    ),
    "cybex_fly": EquipmentMapping(
        brand_name="Cybex Fly",
        equipment_type="machine",
        movement_patterns=["fly"],
        muscle_families=["chest"],
        canonical_candidates=["pec_deck", "cable_fly", "chest_fly"]
    ),
    "cybex_row": EquipmentMapping(
        brand_name="Cybex Row",
        equipment_type="machine",
        movement_patterns=["horizontal_pull"],
        muscle_families=["lats", "rhomboids"],
        canonical_candidates=["machine_row", "seated_cable_row"]
    ),
    "cybex_leg_press": EquipmentMapping(
        brand_name="Cybex Leg Press",
        equipment_type="machine",
        movement_patterns=["leg_press"],
        muscle_families=["quadriceps", "glutes"],
        canonical_candidates=["leg_press", "leg_press_45_degree"]
    ),
    
    # MATRIX MACHINES
    "matrix_chest_press": EquipmentMapping(
        brand_name="Matrix Chest Press",
        equipment_type="machine",
        movement_patterns=["horizontal_press"],
        muscle_families=["chest", "triceps"],
        canonical_candidates=["machine_chest_press", "dumbbell_bench_press"]
    ),
    "matrix_diverging_lat_pulldown": EquipmentMapping(
        brand_name="Matrix Diverging Lat Pulldown",
        equipment_type="machine",
        movement_patterns=["vertical_pull"],
        muscle_families=["lats", "biceps"],
        canonical_candidates=["lat_pulldown", "pull_ups"]
    ),
    "matrix_seated_row": EquipmentMapping(
        brand_name="Matrix Seated Row",
        equipment_type="machine",
        movement_patterns=["horizontal_pull"],
        muscle_families=["lats", "rhomboids", "rear_delts"],
        canonical_candidates=["seated_cable_row", "machine_row"]
    ),
    
    # NAUTILUS MACHINES
    "nautilus_chest_press": EquipmentMapping(
        brand_name="Nautilus Chest Press",
        equipment_type="machine",
        movement_patterns=["horizontal_press"],
        muscle_families=["chest", "triceps"],
        canonical_candidates=["machine_chest_press", "smith_machine_bench_press"]
    ),
    "nautilus_pullover": EquipmentMapping(
        brand_name="Nautilus Pullover",
        equipment_type="machine",
        movement_patterns=["pullover"],
        muscle_families=["lats", "chest"],
        canonical_candidates=["straight_arm_pulldown", "cable_crossover"]
    ),
    "nautilus_compound_row": EquipmentMapping(
        brand_name="Nautilus Compound Row",
        equipment_type="machine",
        movement_patterns=["horizontal_pull"],
        muscle_families=["lats", "rhomboids", "biceps"],
        canonical_candidates=["machine_row", "seated_cable_row", "chest_supported_row_machine"]
    ),
}

# Common aliases and variations
BRAND_ALIASES: Dict[str, str] = {
    # Life Fitness variations
    "life fitness chest": "life_fitness_chest_press",
    "lf chest press": "life_fitness_chest_press",
    "life fitness row": "life_fitness_seated_row",
    "life fitness pulldown": "life_fitness_lat_pulldown",
    
    # Hammer Strength variations
    "hammer chest": "hammer_strength_chest_press",
    "hammer row": "hammer_strength_low_row",
    "hammer pulldown": "hammer_strength_pulldown",
    "hs chest press": "hammer_strength_chest_press",
    "hs low row": "hammer_strength_low_row",
    "hs high row": "hammer_strength_high_row",
    
    # Technogym variations
    "technogym chest": "technogym_chest_press",
    "tg chest press": "technogym_chest_press",
    "technogym row": "technogym_low_row",
    "technogym pullover": "technogym_pullover",
    
    # Generic references
    "plate loaded chest press": "hammer_strength_chest_press",
    "plate loaded row": "hammer_strength_low_row",
    "selectorized chest press": "life_fitness_chest_press",
}

def get_equipment_mapping(brand_name: str) -> Optional[EquipmentMapping]:
    """Get equipment mapping by brand name or alias"""
    # Normalize input
    normalized = brand_name.lower().replace("-", "_").replace(" ", "_")
    
    # Direct lookup
    if normalized in EQUIPMENT_CATALOG:
        return EQUIPMENT_CATALOG[normalized]
    
    # Check aliases
    for alias, catalog_key in BRAND_ALIASES.items():
        if alias.lower() in brand_name.lower():
            return EQUIPMENT_CATALOG.get(catalog_key)
    
    return None

def get_canonical_exercises_for_brand(brand_name: str) -> List[str]:
    """Get canonical exercise IDs for a branded machine"""
    mapping = get_equipment_mapping(brand_name)
    if mapping:
        return mapping.canonical_candidates
    return []

def get_all_brand_names() -> List[str]:
    """Get all recognized brand equipment names"""
    names = []
    for mapping in EQUIPMENT_CATALOG.values():
        names.append(mapping.brand_name)
    return sorted(names)

def get_brands_for_muscle_family(muscle_family: str) -> List[str]:
    """Get all brand machines that target a specific muscle family"""
    matching_brands = []
    for key, mapping in EQUIPMENT_CATALOG.items():
        if muscle_family.lower() in [m.lower() for m in mapping.muscle_families]:
            matching_brands.append(mapping.brand_name)
    return matching_brands

def get_brands_for_movement_pattern(movement_pattern: str) -> List[str]:
    """Get all brand machines for a specific movement pattern"""
    matching_brands = []
    for key, mapping in EQUIPMENT_CATALOG.items():
        if movement_pattern.lower() in [p.lower() for p in mapping.movement_patterns]:
            matching_brands.append(mapping.brand_name)
    return matching_brands

def resolve_to_canonical(exercise_name: str) -> Tuple[Optional[str], List[str]]:
    """
    Resolve any exercise name to canonical ID.
    Returns (preferred_id, alternatives).
    """
    # Check if it's a brand machine
    mapping = get_equipment_mapping(exercise_name)
    if mapping:
        return mapping.canonical_candidates[0], mapping.canonical_candidates[1:]
    
    return None, []


class EquipmentCatalog:
    """
    Main equipment catalog class for integration
    """
    
    def __init__(self):
        self.catalog = EQUIPMENT_CATALOG
    
    def get_equipment_mapping(self, brand_name: str) -> Optional[EquipmentMapping]:
        """Get equipment mapping by brand name"""
        return get_equipment_mapping(brand_name)
    
    def get_exercises_for_equipment(self, brand_name: str) -> List[str]:
        """Get canonical exercises for branded equipment"""
        return get_canonical_exercises_for_brand(brand_name)
    
    def get_all_brands(self) -> List[str]:
        """Get all available brand names"""
        return get_all_brand_names()
    
    def resolve_equipment(self, exercise_name: str) -> Tuple[Optional[str], List[str]]:
        """Resolve branded equipment to canonical exercises"""
        return resolve_to_canonical(exercise_name)
    
    def get_brands_by_muscle(self, muscle_family: str) -> List[str]:
        """Get brands that target specific muscle family"""
        return get_brands_for_muscle_family(muscle_family)
    
    def get_brands_by_movement(self, movement_pattern: str) -> List[str]:
        """Get brands for specific movement pattern"""
        return get_brands_for_movement_pattern(movement_pattern)
    
    def find_alternatives(self, exercise_id: str, available_equipment: List[str]) -> List[str]:
        """Find alternative exercises based on available equipment"""
        # This is a simplified implementation for validation compatibility
        # In a full implementation, this would use movement patterns and muscle groups
        alternatives = []
        
        # For now, return some basic alternatives based on common patterns
        basic_alternatives = {
            'barbell_bench_press': ['dumbbell_bench_press', 'machine_chest_press', 'push_ups'],
            'barbell_squat': ['dumbbell_squat', 'leg_press', 'bodyweight_squat'],
            'deadlift': ['dumbbell_deadlift', 'romanian_deadlift', 'sumo_deadlift'],
            'pull_ups': ['lat_pulldown', 'assisted_pull_ups', 'cable_rows']
        }
        
        return basic_alternatives.get(exercise_id, [])
