# Canonical Exercise Database with ID-based Safety Rules
# This replaces name-based matching with strict ID-level validation

from typing import Dict, List, Set, Tuple
from dataclasses import dataclass
from enum import Enum
from functools import lru_cache

class RiskLevel(Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    EXTREME = "extreme"

class InjuryType(Enum):
    SHOULDER = "shoulder"
    ELBOW = "elbow"
    LOWER_BACK = "lower_back"
    KNEE = "knee"
    HIP = "hip"
    NECK = "neck"
    WRIST = "wrist"
    ANKLE = "ankle"

class ExperienceLevel(Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"

@dataclass
class ExerciseProfile:
    """Canonical exercise definition with safety metadata"""
    exercise_id: str
    display_name: str
    common_names: List[str]  # Alternative names for reference
    risk_level: RiskLevel
    primary_muscles: List[str]
    equipment_required: List[str]
    injury_contraindications: Set[InjuryType]  # Injuries that ban this exercise
    injury_cautions: Set[InjuryType]  # Injuries requiring modification
    min_experience_level: ExperienceLevel
    safety_flags: Set[str]  # Additional safety considerations
    substitutions: List[str]  # Safer alternative exercise IDs
    # NEW SEGMENT FLAGS
    isCardioWarmup: bool = False
    isActivation: bool = False
    isMobility: bool = False
    isStretch: bool = False
    isCooldownSafe: bool = False

# Canonical Exercise Database - The single source of truth
CANONICAL_EXERCISES: Dict[str, ExerciseProfile] = {
    
    # CHEST EXERCISES
    "barbell_bench_press": ExerciseProfile(
        exercise_id="barbell_bench_press",
        display_name="Barbell Bench Press",
        common_names=["bench press", "barbell bench", "flat bench"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["chest", "triceps", "anterior_deltoids"],
        equipment_required=["barbell", "bench", "rack"],
        injury_contraindications={InjuryType.SHOULDER},
        injury_cautions={InjuryType.ELBOW, InjuryType.WRIST},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"requires_spotter", "heavy_load_potential"},
        substitutions=["dumbbell_bench_press", "push_ups"]
    ),
    
    "dumbbell_bench_press": ExerciseProfile(
        exercise_id="dumbbell_bench_press",
        display_name="Dumbbell Bench Press",
        common_names=["dumbbell bench", "db bench press"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["chest", "triceps", "anterior_deltoids"],
        equipment_required=["dumbbells", "bench"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.SHOULDER, InjuryType.ELBOW},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"safer_than_barbell"},
        substitutions=["push_ups", "chest_fly"]
    ),
    
    "incline_barbell_bench": ExerciseProfile(
        exercise_id="incline_barbell_bench",
        display_name="Incline Barbell Bench Press",
        common_names=["incline bench", "incline barbell press"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["upper_chest", "anterior_deltoids", "triceps"],
        equipment_required=["barbell", "incline_bench", "rack"],
        injury_contraindications={InjuryType.SHOULDER},
        injury_cautions={InjuryType.ELBOW},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"requires_spotter", "shoulder_stress"},
        substitutions=["incline_dumbbell_press", "push_ups_elevated"]
    ),
    
    "push_ups": ExerciseProfile(
        exercise_id="push_ups",
        display_name="Push-Ups",
        common_names=["pushups", "press ups"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["chest", "triceps", "anterior_deltoids"],
        equipment_required=["bodyweight"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.WRIST, InjuryType.ELBOW},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"bodyweight_safe", "scalable"},
        substitutions=["wall_push_ups", "knee_push_ups"]
    ),
    
    # HIGH-RISK CHEST EXERCISES
    "behind_neck_press": ExerciseProfile(
        exercise_id="behind_neck_press",
        display_name="Behind-the-Neck Press",
        common_names=["behind neck press", "btn press"],
        risk_level=RiskLevel.EXTREME,
        primary_muscles=["shoulders", "triceps"],
        equipment_required=["barbell", "rack"],
        injury_contraindications={InjuryType.SHOULDER, InjuryType.NECK},
        injury_cautions={InjuryType.ELBOW},
        min_experience_level=ExperienceLevel.ADVANCED,  # Even then, not recommended
        safety_flags={"cervical_spine_risk", "shoulder_impingement_risk", "not_recommended"},
        substitutions=["overhead_press", "dumbbell_shoulder_press"]
    ),
    
    # BACK EXERCISES
    "deadlift": ExerciseProfile(
        exercise_id="deadlift",
        display_name="Conventional Deadlift",
        common_names=["deadlift", "barbell deadlift"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["hamstrings", "glutes", "erector_spinae", "lats"],
        equipment_required=["barbell", "plates"],
        injury_contraindications={InjuryType.LOWER_BACK},
        injury_cautions={InjuryType.KNEE, InjuryType.HIP},
        min_experience_level=ExperienceLevel.INTERMEDIATE,
        safety_flags={"technical_lift", "requires_mobility", "progressive_loading"},
        substitutions=["rack_pull", "romanian_deadlift", "trap_bar_deadlift"]
    ),
    
    "pull_ups": ExerciseProfile(
        exercise_id="pull_ups",
        display_name="Pull-Ups",
        common_names=["pullups", "chin ups"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["lats", "rhomboids", "biceps"],
        equipment_required=["pull_up_bar"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.SHOULDER, InjuryType.ELBOW},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"bodyweight_safe", "strength_required"},
        substitutions=["lat_pulldown", "assisted_pull_ups", "inverted_rows"]
    ),
    
    "lat_pulldown": ExerciseProfile(
        exercise_id="lat_pulldown",
        display_name="Lat Pulldown",
        common_names=["pulldown", "lat pull down"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["lats", "rhomboids", "biceps"],
        equipment_required=["lat_machine", "cable"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.SHOULDER},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"machine_safe", "scalable_resistance"},
        substitutions=["pull_ups", "inverted_rows"]
    ),
    
    # HIGH-RISK BACK EXERCISES
    "upright_rows": ExerciseProfile(
        exercise_id="upright_rows",
        display_name="Upright Rows",
        common_names=["upright row", "barbell upright row"],
        risk_level=RiskLevel.HIGH,
        primary_muscles=["traps", "rear_delts"],
        equipment_required=["barbell"],
        injury_contraindications={InjuryType.SHOULDER},
        injury_cautions={InjuryType.ELBOW},
        min_experience_level=ExperienceLevel.ADVANCED,  # Not recommended even then
        safety_flags={"shoulder_impingement_risk", "avoid_for_most"},
        substitutions=["face_pulls", "reverse_fly", "shrugs"]
    ),
    
    "kipping_pull_ups": ExerciseProfile(
        exercise_id="kipping_pull_ups",
        display_name="Kipping Pull-Ups",
        common_names=["kipping pullups", "crossfit pullups"],
        risk_level=RiskLevel.HIGH,
        primary_muscles=["lats", "rhomboids", "biceps"],
        equipment_required=["pull_up_bar"],
        injury_contraindications={InjuryType.SHOULDER},
        injury_cautions={InjuryType.ELBOW},
        min_experience_level=ExperienceLevel.ADVANCED,
        safety_flags={"requires_strict_pullup_base", "high_injury_risk", "crossfit_specific"},
        substitutions=["pull_ups", "assisted_pull_ups", "lat_pulldown"]
    ),
    
    # SHOULDER EXERCISES
    "overhead_press": ExerciseProfile(
        exercise_id="overhead_press",
        display_name="Overhead Press",
        common_names=["military press", "standing press", "ohp"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["anterior_deltoids", "triceps"],
        equipment_required=["barbell", "rack"],
        injury_contraindications={InjuryType.SHOULDER},
        injury_cautions={InjuryType.LOWER_BACK, InjuryType.ELBOW},
        min_experience_level=ExperienceLevel.INTERMEDIATE,
        safety_flags={"overhead_movement", "requires_mobility"},
        substitutions=["dumbbell_shoulder_press", "seated_press"]
    ),
    
    "dumbbell_shoulder_press": ExerciseProfile(
        exercise_id="dumbbell_shoulder_press",
        display_name="Dumbbell Shoulder Press",
        common_names=["db shoulder press", "dumbbell press"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["anterior_deltoids", "triceps"],
        equipment_required=["dumbbells"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.SHOULDER, InjuryType.ELBOW},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"natural_movement_path", "unilateral_option"},
        substitutions=["seated_dumbbell_press", "push_ups"]
    ),
    
    # LEG EXERCISES
    "back_squat": ExerciseProfile(
        exercise_id="back_squat",
        display_name="Back Squat",
        common_names=["squat", "barbell squat", "back squat"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["quadriceps", "glutes", "hamstrings"],
        equipment_required=["barbell", "squat_rack"],
        injury_contraindications={InjuryType.LOWER_BACK, InjuryType.KNEE},
        injury_cautions={InjuryType.HIP},
        min_experience_level=ExperienceLevel.INTERMEDIATE,
        safety_flags={"technical_lift", "requires_mobility", "heavy_load_potential"},
        substitutions=["goblet_squat", "front_squat", "leg_press"]
    ),
    
    "goblet_squat": ExerciseProfile(
        exercise_id="goblet_squat",
        display_name="Goblet Squat",
        common_names=["goblet squat", "dumbbell squat"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["quadriceps", "glutes", "hamstrings"],
        equipment_required=["dumbbell"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.KNEE},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"beginner_friendly", "teaches_squat_pattern"},
        substitutions=["bodyweight_squat", "leg_press"]
    ),
    
    # HIGH-RISK LEG EXERCISES  
    "heavy_overhead_squat": ExerciseProfile(
        exercise_id="heavy_overhead_squat",
        display_name="Heavy Overhead Squat",
        common_names=["overhead squat", "ohs"],
        risk_level=RiskLevel.EXTREME,
        primary_muscles=["quadriceps", "glutes", "core", "shoulders"],
        equipment_required=["barbell"],
        injury_contraindications={InjuryType.SHOULDER, InjuryType.LOWER_BACK},
        injury_cautions={InjuryType.KNEE, InjuryType.HIP},
        min_experience_level=ExperienceLevel.ADVANCED,
        safety_flags={"requires_extensive_mobility", "technical_complexity", "avoid_for_most"},
        substitutions=["goblet_squat", "front_squat", "overhead_press_separate"]
    ),
    
    # ARM EXERCISES
    "close_grip_bench_press": ExerciseProfile(
        exercise_id="close_grip_bench_press",
        display_name="Close-Grip Bench Press",
        common_names=["close grip bench", "cgbp", "close-grip bench"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["triceps", "chest"],
        equipment_required=["barbell", "bench"],
        injury_contraindications={InjuryType.ELBOW},
        injury_cautions={InjuryType.SHOULDER, InjuryType.WRIST},
        min_experience_level=ExperienceLevel.INTERMEDIATE,
        safety_flags={"elbow_stress", "wrist_positioning_critical"},
        substitutions=["dips", "tricep_pushdown", "diamond_push_ups"]
    ),
    
    "tricep_extensions": ExerciseProfile(
        exercise_id="tricep_extensions",
        display_name="Tricep Extensions",
        common_names=["skull crushers", "lying tricep extension", "tricep extension"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["triceps"],
        equipment_required=["barbell", "bench"],
        injury_contraindications={InjuryType.ELBOW},
        injury_cautions={InjuryType.SHOULDER},
        min_experience_level=ExperienceLevel.INTERMEDIATE,
        safety_flags={"elbow_joint_stress", "careful_loading"},
        substitutions=["tricep_pushdown", "dips", "diamond_push_ups"]
    ),
    
    "hammer_curls": ExerciseProfile(
        exercise_id="hammer_curls",
        display_name="Hammer Curls",
        common_names=["hammer curl", "neutral grip curls"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["biceps", "brachialis", "forearms"],
        equipment_required=["dumbbells"],
        injury_contraindications=set(),
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"elbow_friendly", "neutral_grip_safe"},
        substitutions=["bicep_curls", "cable_curls"]
    ),
    
    # CORE EXERCISES
    "weighted_sit_ups": ExerciseProfile(
        exercise_id="weighted_sit_ups",
        display_name="Weighted Sit-Ups",
        common_names=["weighted situps", "loaded sit ups"],
        risk_level=RiskLevel.HIGH,
        primary_muscles=["rectus_abdominis"],
        equipment_required=["weight_plate", "mat"],
        injury_contraindications={InjuryType.LOWER_BACK, InjuryType.NECK},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.INTERMEDIATE,
        safety_flags={"spinal_flexion_under_load", "disc_compression_risk"},
        substitutions=["planks", "dead_bug", "hollow_holds"]
    ),
    
    "planks": ExerciseProfile(
        exercise_id="planks",
        display_name="Planks",
        common_names=["plank", "front plank"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["core", "transverse_abdominis"],
        equipment_required=["bodyweight"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.LOWER_BACK, InjuryType.SHOULDER},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"spine_neutral", "functional_core"},
        substitutions=["wall_sits", "dead_bug"]
    ),

    # ADDITIONAL COVERAGE (expanded set)
    # CHEST / PUSH
    "incline_dumbbell_press": ExerciseProfile(
        exercise_id="incline_dumbbell_press",
        display_name="Incline Dumbbell Press",
        common_names=["incline db press", "incline dumbbell bench"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["upper_chest", "anterior_deltoids", "triceps"],
        equipment_required=["dumbbells", "incline_bench"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.SHOULDER},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"safer_than_barbell"},
        substitutions=["push_ups_elevated", "dumbbell_bench_press"]
    ),
    "chest_fly": ExerciseProfile(
        exercise_id="chest_fly",
        display_name="Chest Fly",
        common_names=["db fly", "dumbbell fly"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["chest"],
        equipment_required=["dumbbells", "bench"],
        injury_contraindications={InjuryType.SHOULDER},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"use_light_loads"},
        substitutions=["cable_fly", "push_ups"]
    ),

    # BACK / PULL
    "romanian_deadlift": ExerciseProfile(
        exercise_id="romanian_deadlift",
        display_name="Romanian Deadlift",
        common_names=["RDL", "barbell RDL"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["hamstrings", "glutes", "erector_spinae"],
        equipment_required=["barbell"],
        injury_contraindications={InjuryType.LOWER_BACK},
        injury_cautions={InjuryType.KNEE, InjuryType.HIP},
        min_experience_level=ExperienceLevel.INTERMEDIATE,
        safety_flags={"hip_hinge_pattern", "controlled_range"},
        substitutions=["dumbbell_rdl", "glute_bridge"]
    ),
    "dumbbell_row": ExerciseProfile(
        exercise_id="dumbbell_row",
        display_name="Dumbbell Row",
        common_names=["one-arm db row", "db row"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["lats", "rhomboids", "biceps"],
        equipment_required=["dumbbell", "bench"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.LOWER_BACK},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"unilateral_control", "support_on_bench"},
        substitutions=["seated_cable_row", "inverted_rows"]
    ),
    "seated_cable_row": ExerciseProfile(
        exercise_id="seated_cable_row",
        display_name="Seated Cable Row",
        common_names=["cable row", "rowing machine (cable)"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["lats", "rhomboids", "rear_delts"],
        equipment_required=["cable", "machine"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.LOWER_BACK},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"machine_safe"},
        substitutions=["dumbbell_row", "inverted_rows"]
    ),

    # SHOULDERS
    "lateral_raise": ExerciseProfile(
        exercise_id="lateral_raise",
        display_name="Lateral Raise",
        common_names=["db lateral raises", "side raise"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["medial_deltoids"],
        equipment_required=["dumbbells"],
        injury_contraindications={InjuryType.SHOULDER},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"light_load_high_reps"},
        substitutions=["cable_lateral_raise", "machine_lateral_raise"]
    ),
    "face_pulls": ExerciseProfile(
        exercise_id="face_pulls",
        display_name="Face Pulls",
        common_names=["rope face pulls"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["rear_delts", "traps"],
        equipment_required=["cable"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.SHOULDER},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"shoulder_health_exercise"},
        substitutions=["reverse_fly", "band_face_pulls"]
    ),

    # LEGS
    "leg_press": ExerciseProfile(
        exercise_id="leg_press",
        display_name="Leg Press",
        common_names=["machine leg press"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["quadriceps", "glutes"],
        equipment_required=["machine"],
        injury_contraindications={InjuryType.KNEE},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"machine_guided"},
        substitutions=["goblet_squat", "split_squat"]
    ),
    "split_squat": ExerciseProfile(
        exercise_id="split_squat",
        display_name="Split Squat",
        common_names=["static lunge"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["quadriceps", "glutes"],
        equipment_required=["dumbbells"],
        injury_contraindications={InjuryType.KNEE},
        injury_cautions={InjuryType.HIP},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"unilateral_balance"},
        substitutions=["leg_press", "goblet_squat"]
    ),
    "romanian_deadlift_dumbbell": ExerciseProfile(
        exercise_id="romanian_deadlift_dumbbell",
        display_name="Dumbbell Romanian Deadlift",
        common_names=["db RDL", "dumbbell RDL"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["hamstrings", "glutes"],
        equipment_required=["dumbbells"],
        injury_contraindications={InjuryType.LOWER_BACK},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"hip_hinge_pattern"},
        substitutions=["glute_bridge", "hamstring_curl_machine"]
    ),

    # ARMS
    "bicep_curls": ExerciseProfile(
        exercise_id="bicep_curls",
        display_name="Bicep Curls",
        common_names=["db curls", "barbell curls"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["biceps"],
        equipment_required=["dumbbells"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.ELBOW, InjuryType.WRIST},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"controlled_tempo"},
        substitutions=["hammer_curls", "cable_curls"]
    ),
    "tricep_pushdown": ExerciseProfile(
        exercise_id="tricep_pushdown",
        display_name="Tricep Pushdown",
        common_names=["cable pushdowns"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["triceps"],
        equipment_required=["cable"],
        injury_contraindications={InjuryType.ELBOW},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"joint_friendly_when_light"},
        substitutions=["dips_assisted", "diamond_push_ups"]
    ),

    # CORE
    "dead_bug": ExerciseProfile(
        exercise_id="dead_bug",
        display_name="Dead Bug",
        common_names=["deadbug"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["core"],
        equipment_required=["bodyweight"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.LOWER_BACK},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"spine_neutral"},
        substitutions=["planks"]
    ),
    "hollow_hold": ExerciseProfile(
        exercise_id="hollow_hold",
        display_name="Hollow Hold",
        common_names=["hollow body hold"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["core"],
        equipment_required=["bodyweight"],
        injury_contraindications={InjuryType.LOWER_BACK},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.INTERMEDIATE,
        safety_flags={"core_control"},
        substitutions=["dead_bug", "planks"]
    ),

    # CHEST (machines/cables)
    "machine_chest_press": ExerciseProfile(
        exercise_id="machine_chest_press",
        display_name="Machine Chest Press",
        common_names=["chest press machine"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["chest", "triceps"],
        equipment_required=["machine"],
        injury_contraindications={InjuryType.SHOULDER},
        injury_cautions={InjuryType.ELBOW},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"machine_guided"},
        substitutions=["dumbbell_bench_press", "push_ups"]
    ),
    "cable_fly": ExerciseProfile(
        exercise_id="cable_fly",
        display_name="Cable Fly",
        common_names=["cable chest fly"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["chest"],
        equipment_required=["cable"],
        injury_contraindications={InjuryType.SHOULDER},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"use_light_loads"},
        substitutions=["chest_fly", "push_ups"]
    ),

    # BACK
    "barbell_row": ExerciseProfile(
        exercise_id="barbell_row",
        display_name="Barbell Row",
        common_names=["bent-over row", "bent over barbell row"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["lats", "rhomboids", "lower_back"],
        equipment_required=["barbell"],
        injury_contraindications={InjuryType.LOWER_BACK},
        injury_cautions={InjuryType.HIP},
        min_experience_level=ExperienceLevel.INTERMEDIATE,
        safety_flags={"hip_hinge_required"},
        substitutions=["seated_cable_row", "dumbbell_row"]
    ),
    "t_bar_row": ExerciseProfile(
        exercise_id="t_bar_row",
        display_name="T-Bar Row",
        common_names=["tbar row"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["lats", "rhomboids", "traps"],
        equipment_required=["machine"],
        injury_contraindications={InjuryType.LOWER_BACK},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.INTERMEDIATE,
        safety_flags={"spinal_loading"},
        substitutions=["seated_cable_row", "dumbbell_row"]
    ),

    # SHOULDERS
    "machine_shoulder_press": ExerciseProfile(
        exercise_id="machine_shoulder_press",
        display_name="Machine Shoulder Press",
        common_names=["shoulder press machine"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["anterior_deltoids", "triceps"],
        equipment_required=["machine"],
        injury_contraindications={InjuryType.SHOULDER},
        injury_cautions={InjuryType.ELBOW, InjuryType.LOWER_BACK},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"machine_guided"},
        substitutions=["dumbbell_shoulder_press", "seated_press"]
    ),
    "reverse_fly": ExerciseProfile(
        exercise_id="reverse_fly",
        display_name="Reverse Fly",
        common_names=["rear delt fly", "reverse pec deck"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["rear_delts", "traps"],
        equipment_required=["dumbbells"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.SHOULDER},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"posture_focus"},
        substitutions=["face_pulls", "reverse_pec_deck"]
    ),

    # LEGS
    "front_squat": ExerciseProfile(
        exercise_id="front_squat",
        display_name="Front Squat",
        common_names=["barbell front squat"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["quadriceps", "glutes", "core"],
        equipment_required=["barbell", "squat_rack"],
        injury_contraindications={InjuryType.KNEE, InjuryType.LOWER_BACK},
        injury_cautions={InjuryType.HIP},
        min_experience_level=ExperienceLevel.INTERMEDIATE,
        safety_flags={"upright_torso_required"},
        substitutions=["goblet_squat", "leg_press"]
    ),
    "hack_squat": ExerciseProfile(
        exercise_id="hack_squat",
        display_name="Hack Squat (Machine)",
        common_names=["hack squat machine"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["quadriceps", "glutes"],
        equipment_required=["machine"],
        injury_contraindications={InjuryType.KNEE},
        injury_cautions={InjuryType.LOWER_BACK},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"machine_guided"},
        substitutions=["leg_press", "split_squat"]
    ),
    "leg_extension": ExerciseProfile(
        exercise_id="leg_extension",
        display_name="Leg Extension",
        common_names=["quad extension"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["quadriceps"],
        equipment_required=["machine"],
        injury_contraindications={InjuryType.KNEE},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"isolation_movt"},
        substitutions=["split_squat", "goblet_squat"]
    ),
    "leg_curl_machine": ExerciseProfile(
        exercise_id="leg_curl_machine",
        display_name="Leg Curl (Machine)",
        common_names=["hamstring curl machine"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["hamstrings"],
        equipment_required=["machine"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.KNEE},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"isolation_movt"},
        substitutions=["romanian_deadlift_dumbbell", "glute_bridge"]
    ),
    "hip_thrust_barbell": ExerciseProfile(
        exercise_id="hip_thrust_barbell",
        display_name="Barbell Hip Thrust",
        common_names=["hip thrust"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["glutes", "hamstrings", "core"],
        equipment_required=["barbell", "bench"],
        injury_contraindications={InjuryType.LOWER_BACK},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"glute_focus"},
        substitutions=["glute_bridge", "romanian_deadlift_dumbbell"]
    ),
    "glute_bridge": ExerciseProfile(
        exercise_id="glute_bridge",
        display_name="Glute Bridge",
        common_names=["hip bridge"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["glutes", "hamstrings"],
        equipment_required=["bodyweight"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.LOWER_BACK},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"beginner_friendly"},
        substitutions=["hip_thrust_barbell", "romanian_deadlift_dumbbell"]
    ),
    "calf_raise_standing": ExerciseProfile(
        exercise_id="calf_raise_standing",
        display_name="Standing Calf Raise",
        common_names=["calf raises standing"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["calves"],
        equipment_required=["machine"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.ANKLE},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"isolation_movt"},
        substitutions=["calf_raise_seated"]
    ),
    "calf_raise_seated": ExerciseProfile(
        exercise_id="calf_raise_seated",
        display_name="Seated Calf Raise",
        common_names=["seated calf raises"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["calves"],
        equipment_required=["machine"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.ANKLE},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"isolation_movt"},
        substitutions=["calf_raise_standing"]
    ),

    # ARMS
    "preacher_curl": ExerciseProfile(
        exercise_id="preacher_curl",
        display_name="Preacher Curl",
        common_names=["ez bar preacher curl"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["biceps"],
        equipment_required=["machine", "ez_bar"],
        injury_contraindications={InjuryType.ELBOW, InjuryType.WRIST},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"controlled_range"},
        substitutions=["bicep_curls", "cable_curls"]
    ),
    "cable_curls": ExerciseProfile(
        exercise_id="cable_curls",
        display_name="Cable Curls",
        common_names=["cable bicep curls"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["biceps"],
        equipment_required=["cable"],
        injury_contraindications={InjuryType.WRIST, InjuryType.ELBOW},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"constant_tension"},
        substitutions=["bicep_curls", "hammer_curls"]
    ),
    "dips": ExerciseProfile(
        exercise_id="dips",
        display_name="Parallel Bar Dips",
        common_names=["dips bodyweight"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["triceps", "chest", "anterior_deltoids"],
        equipment_required=["dip_bars"],
        injury_contraindications={InjuryType.SHOULDER, InjuryType.ELBOW},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.INTERMEDIATE,
        safety_flags={"shoulder_extension_stress"},
        substitutions=["tricep_pushdown", "diamond_push_ups", "dips_assisted"]
    ),
    "dips_assisted": ExerciseProfile(
        exercise_id="dips_assisted",
        display_name="Assisted Dips",
        common_names=["assisted dips machine"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["triceps", "chest"],
        equipment_required=["machine"],
        injury_contraindications={InjuryType.SHOULDER, InjuryType.ELBOW},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"reduced_load"},
        substitutions=["tricep_pushdown", "diamond_push_ups"]
    ),

    # CORE
    "side_plank": ExerciseProfile(
        exercise_id="side_plank",
        display_name="Side Plank",
        common_names=["side plank hold"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["obliques", "core"],
        equipment_required=["bodyweight"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.SHOULDER},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"anti_lateral_flexion"},
        substitutions=["planks", "dead_bug"]
    ),
    "bird_dog": ExerciseProfile(
        exercise_id="bird_dog",
        display_name="Bird Dog",
        common_names=["bird-dog"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["core", "lower_back"],
        equipment_required=["bodyweight"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.LOWER_BACK},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"spine_neutral"},
        substitutions=["dead_bug", "planks"]
    ),
    "cable_woodchop": ExerciseProfile(
        exercise_id="cable_woodchop",
        display_name="Cable Woodchop",
        common_names=["woodchoppers"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["obliques", "core"],
        equipment_required=["cable"],
        injury_contraindications={InjuryType.LOWER_BACK},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.INTERMEDIATE,
        safety_flags={"rotation_control"},
        substitutions=["side_plank", "dead_bug"]
    ),

    # --- MACHINES (additional) ---
    "pec_deck": ExerciseProfile(
        exercise_id="pec_deck",
        display_name="Pec Deck",
        common_names=["pec deck fly", "machine fly"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["chest"],
        equipment_required=["machine"],
        injury_contraindications={InjuryType.SHOULDER},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"machine_guided", "use_light_loads"},
        substitutions=["cable_fly", "chest_fly"]
    ),
    "reverse_pec_deck": ExerciseProfile(
        exercise_id="reverse_pec_deck",
        display_name="Reverse Pec Deck",
        common_names=["rear delt machine"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["rear_delts", "traps"],
        equipment_required=["machine"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.SHOULDER},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"posture_focus", "machine_guided"},
        substitutions=["face_pulls", "reverse_fly"]
    ),
    "assisted_pull_ups": ExerciseProfile(
        exercise_id="assisted_pull_ups",
        display_name="Assisted Pull-Ups",
        common_names=["pull-up machine assisted"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["lats", "biceps", "rhomboids"],
        equipment_required=["machine"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.SHOULDER, InjuryType.ELBOW},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"reduced_load"},
        substitutions=["lat_pulldown", "inverted_rows"]
    ),
    "machine_row": ExerciseProfile(
        exercise_id="machine_row",
        display_name="Machine Row",
        common_names=["hammer strength row", "plate-loaded row"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["lats", "rhomboids", "traps"],
        equipment_required=["machine"],
        injury_contraindications={InjuryType.LOWER_BACK},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"machine_guided"},
        substitutions=["seated_cable_row", "dumbbell_row"]
    ),
    "lat_raise_machine": ExerciseProfile(
        exercise_id="lat_raise_machine",
        display_name="Lateral Raise Machine",
        common_names=["machine lateral raise"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["medial_deltoids"],
        equipment_required=["machine"],
        injury_contraindications={InjuryType.SHOULDER},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"machine_guided"},
        substitutions=["lateral_raise", "cable_lateral_raise"]
    ),

    # --- KETTLEBELL ---
    "kettlebell_swing": ExerciseProfile(
        exercise_id="kettlebell_swing",
        display_name="Kettlebell Swing",
        common_names=["kb swing"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["glutes", "hamstrings", "lower_back"],
        equipment_required=["kettlebell"],
        injury_contraindications={InjuryType.LOWER_BACK},
        injury_cautions={InjuryType.SHOULDER},
        min_experience_level=ExperienceLevel.INTERMEDIATE,
        safety_flags={"hip_hinge_dynamic", "power_movement"},
        substitutions=["romanian_deadlift_dumbbell", "glute_bridge"]
    ),
    "kettlebell_goblet_squat": ExerciseProfile(
        exercise_id="kettlebell_goblet_squat",
        display_name="Kettlebell Goblet Squat",
        common_names=["kb goblet squat"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["quadriceps", "glutes"],
        equipment_required=["kettlebell"],
        injury_contraindications={InjuryType.KNEE},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"beginner_friendly"},
        substitutions=["goblet_squat", "leg_press"]
    ),
    "kettlebell_deadlift": ExerciseProfile(
        exercise_id="kettlebell_deadlift",
        display_name="Kettlebell Deadlift",
        common_names=["kb deadlift"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["hamstrings", "glutes"],
        equipment_required=["kettlebell"],
        injury_contraindications={InjuryType.LOWER_BACK},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"hip_hinge_pattern"},
        substitutions=["romanian_deadlift_dumbbell", "glute_bridge"]
    ),
    "turkish_get_up": ExerciseProfile(
        exercise_id="turkish_get_up",
        display_name="Turkish Get-Up",
        common_names=["tgu"],
        risk_level=RiskLevel.HIGH,
        primary_muscles=["shoulders", "core", "hips"],
        equipment_required=["kettlebell"],
        injury_contraindications={InjuryType.SHOULDER, InjuryType.LOWER_BACK},
        injury_cautions={InjuryType.KNEE, InjuryType.HIP},
        min_experience_level=ExperienceLevel.ADVANCED,
        safety_flags={"complex_skill", "requires_mobility"},
        substitutions=["side_plank", "dead_bug"]
    ),

    # --- CABLE ISOLATION ---
    "cable_lateral_raise": ExerciseProfile(
        exercise_id="cable_lateral_raise",
        display_name="Cable Lateral Raise",
        common_names=["lateral raise cable"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["medial_deltoids"],
        equipment_required=["cable"],
        injury_contraindications={InjuryType.SHOULDER},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"light_load_high_reps"},
        substitutions=["lateral_raise", "lat_raise_machine"]
    ),
    "cable_overhead_tricep_extension": ExerciseProfile(
        exercise_id="cable_overhead_tricep_extension",
        display_name="Cable Overhead Tricep Extension",
        common_names=["overhead rope extension"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["triceps"],
        equipment_required=["cable"],
        injury_contraindications={InjuryType.ELBOW, InjuryType.SHOULDER},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.INTERMEDIATE,
        safety_flags={"elbow_joint_stress"},
        substitutions=["tricep_pushdown", "dips_assisted"]
    ),
    "cable_crunch": ExerciseProfile(
        exercise_id="cable_crunch",
        display_name="Cable Crunch",
        common_names=["rope crunches"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["rectus_abdominis"],
        equipment_required=["cable"],
        injury_contraindications={InjuryType.LOWER_BACK, InjuryType.NECK},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.INTERMEDIATE,
        safety_flags={"spinal_flexion_under_load"},
        substitutions=["planks", "dead_bug"]
    ),
    "cable_face_pulls": ExerciseProfile(
        exercise_id="cable_face_pulls",
        display_name="Cable Face Pulls",
        common_names=["rope face pulls cable"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["rear_delts", "traps"],
        equipment_required=["cable"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.SHOULDER},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"shoulder_health_exercise"},
        substitutions=["face_pulls", "reverse_pec_deck"]
    ),

    # --- MORE MACHINES & VARIANTS ---
    "machine_incline_chest_press": ExerciseProfile(
        exercise_id="machine_incline_chest_press",
        display_name="Machine Incline Chest Press",
        common_names=["incline chest press machine"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["upper_chest", "triceps", "anterior_deltoids"],
        equipment_required=["machine"],
        injury_contraindications={InjuryType.SHOULDER},
        injury_cautions={InjuryType.ELBOW},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"machine_guided"},
        substitutions=["incline_dumbbell_press", "machine_chest_press"]
    ),
    "smith_machine_bench_press": ExerciseProfile(
        exercise_id="smith_machine_bench_press",
        display_name="Smith Machine Bench Press",
        common_names=["smith bench"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["chest", "triceps"],
        equipment_required=["smith_machine"],
        injury_contraindications={InjuryType.SHOULDER},
        injury_cautions={InjuryType.WRIST},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"guided_bar_path"},
        substitutions=["machine_chest_press", "dumbbell_bench_press"]
    ),
    "smith_overhead_press": ExerciseProfile(
        exercise_id="smith_overhead_press",
        display_name="Smith Machine Overhead Press",
        common_names=["smith OHP"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["anterior_deltoids", "triceps"],
        equipment_required=["smith_machine"],
        injury_contraindications={InjuryType.SHOULDER, InjuryType.LOWER_BACK},
        injury_cautions={InjuryType.ELBOW},
        min_experience_level=ExperienceLevel.INTERMEDIATE,
        safety_flags={"overhead_movement", "guided_bar_path"},
        substitutions=["machine_shoulder_press", "dumbbell_shoulder_press"]
    ),
    "smith_machine_squat_feet_forward": ExerciseProfile(
        exercise_id="smith_machine_squat_feet_forward",
        display_name="Smith Machine Squat (Feet Forward)",
        common_names=["smith squat feet forward"],
        risk_level=RiskLevel.HIGH,
        primary_muscles=["quadriceps", "glutes"],
        equipment_required=["smith_machine"],
        injury_contraindications={InjuryType.LOWER_BACK, InjuryType.KNEE, InjuryType.HIP},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.ADVANCED,
        safety_flags={"unnatural_movement_path", "avoid_for_most"},
        substitutions=["goblet_squat", "leg_press"]
    ),
    "leg_press_45_degree": ExerciseProfile(
        exercise_id="leg_press_45_degree",
        display_name="45-Degree Leg Press",
        common_names=["sled leg press"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["quadriceps", "glutes"],
        equipment_required=["machine"],
        injury_contraindications={InjuryType.KNEE},
        injury_cautions={InjuryType.LOWER_BACK},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"machine_guided"},
        substitutions=["leg_press", "split_squat"]
    ),
    "hip_abduction_machine": ExerciseProfile(
        exercise_id="hip_abduction_machine",
        display_name="Hip Abduction (Machine)",
        common_names=["outer thigh machine"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["glute_medius", "glute_minimus"],
        equipment_required=["machine"],
        injury_contraindications={InjuryType.HIP},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"isolation_movt"},
        substitutions=["glute_bridge", "split_squat"]
    ),
    "hip_adduction_machine": ExerciseProfile(
        exercise_id="hip_adduction_machine",
        display_name="Hip Adduction (Machine)",
        common_names=["inner thigh machine"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["adductors"],
        equipment_required=["machine"],
        injury_contraindications={InjuryType.HIP},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"isolation_movt"},
        substitutions=["split_squat", "glute_bridge"]
    ),
    "machine_ab_crunch": ExerciseProfile(
        exercise_id="machine_ab_crunch",
        display_name="Machine Ab Crunch",
        common_names=["ab crunch machine"],
        risk_level=RiskLevel.MODERATE,
        primary_muscles=["rectus_abdominis"],
        equipment_required=["machine"],
        injury_contraindications={InjuryType.LOWER_BACK, InjuryType.NECK},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"spinal_flexion_under_load"},
        substitutions=["planks", "dead_bug"]
    ),
    "seated_leg_curl_machine": ExerciseProfile(
        exercise_id="seated_leg_curl_machine",
        display_name="Seated Leg Curl (Machine)",
        common_names=["seated hamstring curl"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["hamstrings"],
        equipment_required=["machine"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.KNEE},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"isolation_movt"},
        substitutions=["leg_curl_machine", "romanian_deadlift_dumbbell"]
    ),
    "lying_leg_curl_machine": ExerciseProfile(
        exercise_id="lying_leg_curl_machine",
        display_name="Lying Leg Curl (Machine)",
        common_names=["prone hamstring curl"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["hamstrings"],
        equipment_required=["machine"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.KNEE},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"isolation_movt"},
        substitutions=["leg_curl_machine", "romanian_deadlift_dumbbell"]
    ),
    "calf_press_leg_press_machine": ExerciseProfile(
        exercise_id="calf_press_leg_press_machine",
        display_name="Calf Press on Leg Press Machine",
        common_names=["calf press sled"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["calves"],
        equipment_required=["machine"],
        injury_contraindications=set(),
        injury_cautions={InjuryType.KNEE},
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"isolation_movt"},
        substitutions=["calf_raise_standing", "calf_raise_seated"]
    ),
    "chest_supported_row_machine": ExerciseProfile(
        exercise_id="chest_supported_row_machine",
        display_name="Chest-Supported Row (Machine)",
        common_names=["CSR machine"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["lats", "rhomboids", "rear_delts"],
        equipment_required=["machine"],
        injury_contraindications=set(),
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"reduces_lower_back_stress"},
        substitutions=["seated_cable_row", "dumbbell_row"]
    ),
    "cable_crossover": ExerciseProfile(
        exercise_id="cable_crossover",
        display_name="Cable Crossover",
        common_names=["high to low fly", "low to high fly"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["chest"],
        equipment_required=["cable"],
        injury_contraindications={InjuryType.SHOULDER},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"use_light_loads"},
        substitutions=["cable_fly", "pec_deck"]
    ),
    "straight_arm_pulldown": ExerciseProfile(
        exercise_id="straight_arm_pulldown",
        display_name="Straight-Arm Pulldown",
        common_names=["cable straight-arm pulldown"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["lats", "teres_major"],
        equipment_required=["cable"],
        injury_contraindications={InjuryType.SHOULDER},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"shoulder_friendly_when_light"},
        substitutions=["lat_pulldown", "face_pulls"]
    ),
    "preacher_curl_machine": ExerciseProfile(
        exercise_id="preacher_curl_machine",
        display_name="Preacher Curl (Machine)",
        common_names=["machine preacher curl"],
        risk_level=RiskLevel.LOW,
        primary_muscles=["biceps"],
        equipment_required=["machine"],
        injury_contraindications={InjuryType.ELBOW, InjuryType.WRIST},
        injury_cautions=set(),
        min_experience_level=ExperienceLevel.BEGINNER,
        safety_flags={"controlled_range"},
        substitutions=["bicep_curls", "cable_curls"]
    ),
}

# Injury-specific banned exercise sets (by ID only)
INJURY_BANNED_EXERCISES: Dict[InjuryType, Set[str]] = {
    InjuryType.SHOULDER: {
    "behind_neck_press", "upright_rows", "overhead_press",
    "incline_barbell_bench", "kipping_pull_ups", "heavy_overhead_squat",
    "dips", "machine_shoulder_press", "turkish_get_up", "smith_overhead_press"
    },
    InjuryType.ELBOW: {
    "behind_neck_press", "overhead_press", "close_grip_bench_press",
    "tricep_extensions", "upright_rows", "dips", "cable_overhead_tricep_extension", "preacher_curl_machine"
    },
    InjuryType.LOWER_BACK: {
    "deadlift", "back_squat", "weighted_sit_ups",
    "heavy_overhead_squat", "overhead_press", "barbell_row", "t_bar_row",
    "kettlebell_swing", "cable_crunch", "machine_ab_crunch", "smith_machine_squat_feet_forward"
    },
    InjuryType.KNEE: {
    "back_squat", "heavy_overhead_squat", "smith_machine_squat_feet_forward", "leg_press_45_degree"
    },
    InjuryType.NECK: {
        "behind_neck_press", "weighted_sit_ups"
    },
    InjuryType.ANKLE: {
        "calf_raise_standing", "calf_raise_seated", "calf_press_leg_press_machine"
    }
}

# Experience-level restrictions
BEGINNER_BANNED_EXERCISES: Set[str] = {
    "behind_neck_press", "upright_rows", "kipping_pull_ups", 
    "heavy_overhead_squat", "weighted_sit_ups"
}

INTERMEDIATE_CAUTION_EXERCISES: Set[str] = {
    "deadlift", "back_squat", "overhead_press", 
    "close_grip_bench_press", "tricep_extensions"
}

def get_exercise_by_id(exercise_id: str) -> ExerciseProfile:
    """Get canonical exercise by ID"""
    return CANONICAL_EXERCISES.get(exercise_id)

def is_exercise_allowed(exercise_id: str, user_context: dict) -> tuple[bool, List[str]]:
    """
    Check if exercise is allowed for user based on injuries and experience.
    Returns (is_allowed, list_of_violations)
    """
    exercise = get_exercise_by_id(exercise_id)
    if not exercise:
        return False, [f"Unknown exercise ID: {exercise_id}"]
    
    violations = []
    
    # Check experience level requirements
    user_experience = user_context.get('experience_level', 'beginner')
    if user_experience == 'beginner' and exercise_id in BEGINNER_BANNED_EXERCISES:
        violations.append(f"Exercise {exercise_id} not suitable for beginners")
    
    # Check injury contraindications
    active_injuries = user_context.get('active_injuries', [])
    for injury_str in active_injuries:
        try:
            injury_type = InjuryType(injury_str.lower())
            if exercise_id in INJURY_BANNED_EXERCISES.get(injury_type, set()):
                violations.append(f"Exercise {exercise_id} contraindicated for {injury_type.value} injury")
        except ValueError:
            # Unknown injury type, skip
            pass
    
    return len(violations) == 0, violations

def get_safe_substitutions(exercise_id: str, user_context: dict) -> List[str]:
    """Get safe exercise substitutions for a banned exercise"""
    exercise = get_exercise_by_id(exercise_id)
    if not exercise:
        return []
    
    safe_subs = []
    for sub_id in exercise.substitutions:
        is_safe, _ = is_exercise_allowed(sub_id, user_context)
        if is_safe:
            safe_subs.append(sub_id)
    
    return safe_subs

def validate_workout_plan_exercises(exercise_ids: List[str], user_context: dict) -> Dict[str, any]:
    """
    Validate entire workout plan against canonical database.
    Returns comprehensive validation results.
    """
    results = {
        "valid": True,
        "violations": [],
        "unknown_exercises": [],
        "substitution_suggestions": {},
        "risk_warnings": []
    }
    
    for exercise_id in exercise_ids:
        # Check if exercise exists in canonical database
        if exercise_id not in CANONICAL_EXERCISES:
            results["unknown_exercises"].append(exercise_id)
            results["valid"] = False
            continue
        
        # Check if exercise is allowed
        is_allowed, violations = is_exercise_allowed(exercise_id, user_context)
        if not is_allowed:
            results["violations"].extend(violations)
            results["valid"] = False
            
            # Suggest substitutions
            subs = get_safe_substitutions(exercise_id, user_context)
            if subs:
                results["substitution_suggestions"][exercise_id] = subs
        
        # Add risk warnings for allowed but risky exercises
        exercise = CANONICAL_EXERCISES[exercise_id]
        if exercise.risk_level in [RiskLevel.HIGH, RiskLevel.EXTREME]:
            results["risk_warnings"].append(f"{exercise_id}: {exercise.risk_level.value} risk exercise")
    
    return results

def get_all_allowed_exercises(user_context: dict) -> List[str]:
    """Get list of all exercise IDs allowed for this user"""
    allowed = []
    for exercise_id in CANONICAL_EXERCISES.keys():
        is_allowed, _ = is_exercise_allowed(exercise_id, user_context)
        if is_allowed:
            allowed.append(exercise_id)
    return allowed

# --------------- Cached variants for performance and prompting ---------------
def _context_key(user_context: dict) -> Tuple[str, Tuple[str, ...]]:
    exp = user_context.get('experience_level', 'beginner')
    injuries = tuple(sorted([str(i) for i in user_context.get('active_injuries', [])]))
    return (exp, injuries)

@lru_cache(maxsize=128)
def _get_allowed_cached(exp: str, injuries: Tuple[str, ...]) -> Tuple[str, ...]:
    ctx = {'experience_level': exp, 'active_injuries': list(injuries)}
    return tuple(get_all_allowed_exercises(ctx))

def get_all_allowed_exercises_cached(user_context: dict) -> List[str]:
    key = _context_key(user_context)
    return list(_get_allowed_cached(key[0], key[1]))

def clear_exercise_cache():
    _get_allowed_cached.cache_clear()

# Quick lookup maps for common name to ID conversion (for migration help)
NAME_TO_ID_MAP = {}
for exercise_id, exercise in CANONICAL_EXERCISES.items():
    NAME_TO_ID_MAP[exercise.display_name.lower()] = exercise_id
    for common_name in exercise.common_names:
        NAME_TO_ID_MAP[common_name.lower()] = exercise_id

def suggest_exercise_id_from_name(exercise_name: str) -> str:
    """Helper function to suggest canonical ID from natural language name"""
    return NAME_TO_ID_MAP.get(exercise_name.lower(), None)


# Focus Planner compatibility functions and wrapper class
def get_exercises_by_filters(filters=None, 
                           movement_patterns: List[str] = None, 
                           muscle_families: List[str] = None,
                           equipment: List[str] = None) -> List[str]:
    """Get exercise IDs matching the specified filters
    
    Args:
        filters: Dictionary with filter parameters (for dictionary-style calls)
        movement_patterns: List of movement patterns to match
        muscle_families: List of muscle families to match
        equipment: List of required equipment
    """
    # Handle dictionary-style call
    if isinstance(filters, dict):
        movement_patterns = filters.get('movement_patterns', movement_patterns)
        muscle_families = filters.get('muscle_families', muscle_families)
        equipment = filters.get('equipment', equipment)
    
    # If no filters at all, return all exercises
    if not any([movement_patterns, muscle_families, equipment]):
        return list(CANONICAL_EXERCISES.keys())
    
    matching_exercises = []
    
    for exercise_id, exercise in CANONICAL_EXERCISES.items():
        # Check movement patterns (using primary muscles as proxy)
        if movement_patterns:
            # Simple pattern matching - can be enhanced
            matches_pattern = any(
                pattern.lower() in exercise.display_name.lower() or
                any(pattern.lower() in muscle.lower() for muscle in exercise.primary_muscles)
                for pattern in movement_patterns
            )
            if not matches_pattern:
                continue
        
        # Check muscle families
        if muscle_families:
            matches_muscle = any(
                family.lower() in muscle.lower() or muscle.lower() in family.lower()
                for family in muscle_families
                for muscle in exercise.primary_muscles
            )
            if not matches_muscle:
                continue
        
        # Check equipment
        if equipment:
            matches_equipment = any(
                eq in exercise.equipment_required for eq in equipment
            )
            if not matches_equipment:
                continue
        
        matching_exercises.append(exercise_id)
    
    return matching_exercises


def get_exercise_data(exercise_id: str) -> Dict:
    """Get exercise data as dictionary for compatibility"""
    exercise = CANONICAL_EXERCISES.get(exercise_id)
    if not exercise:
        return None
    
    return {
        'id': exercise.exercise_id,
        'name': exercise.display_name,
        'movement_patterns': [exercise.display_name.lower()],  # Simplified
        'muscle_families': exercise.primary_muscles,
        'equipment': exercise.equipment_required,
        'risk_level': exercise.risk_level.value,
        'experience_level': exercise.min_experience_level.value
    }


class ExerciseDatabase:
    """Wrapper class for Focus Planner compatibility"""
    
    def __init__(self):
        self.exercises = CANONICAL_EXERCISES
    
    def get_exercise_by_id(self, exercise_id: str) -> Dict:
        """Get exercise by ID"""
        return get_exercise_data(exercise_id)
    
    def get_exercises_by_movement_patterns(self, patterns: List[str]) -> List[str]:
        """Get exercises matching movement patterns"""
        return get_exercises_by_filters(movement_patterns=patterns)
    
    def get_exercises_by_muscle_families(self, families: List[str]) -> List[str]:
        """Get exercises targeting muscle families"""
        return get_exercises_by_filters(muscle_families=families)
    
    def filter_exercises_for_injuries(self, exercise_ids: List[str], injuries: List[str]) -> List[str]:
        """Filter exercises safe for users with injuries"""
        safe_exercises = []
        
        for exercise_id in exercise_ids:
            exercise = CANONICAL_EXERCISES.get(exercise_id)
            if not exercise:
                continue
            
            # Check if exercise is contraindicated for any injury
            is_safe = True
            for injury in injuries:
                injury_type = injury.upper() if hasattr(InjuryType, injury.upper()) else None
                if injury_type and getattr(InjuryType, injury_type, None) in exercise.injury_contraindications:
                    is_safe = False
                    break
            
            if is_safe:
                safe_exercises.append(exercise_id)
        
        return safe_exercises
    
    def get_all_exercises(self) -> List[str]:
        """Get all exercise IDs"""
        return list(CANONICAL_EXERCISES.keys())
