"""
User Profile Management System for HLTHY Coach
Handles persistent user data, injury tracking, and profile management
"""

import json
import os
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from pathlib import Path

# Directory to store user profiles
PROFILES_DIR = Path("user_profiles")
PROFILES_DIR.mkdir(exist_ok=True)

@dataclass
class InjuryRecord:
    """Individual injury tracking record"""
    injury_id: str
    injury_type: str  # e.g., "elbow_pain", "shoulder_impingement"
    severity: str  # "mild", "moderate", "severe"
    affected_area: str  # "right_elbow", "left_shoulder", etc.
    onset_date: str  # ISO datetime
    status: str  # "active", "recovering", "resolved"
    notes: str = ""
    banned_exercises: List[str] = None
    caution_movements: List[str] = None
    recovery_timeline: Optional[str] = None  # estimated recovery date
    
    def __post_init__(self):
        if self.banned_exercises is None:
            self.banned_exercises = []
        if self.caution_movements is None:
            self.caution_movements = []

@dataclass
class FitnessGoals:
    """User's fitness goals and preferences"""
    primary_goal: str  # "strength", "muscle_building", "weight_loss", "endurance"
    secondary_goals: List[str]
    target_weight: Optional[float] = None
    target_body_fat: Optional[float] = None
    activity_level: str = "moderate"  # "sedentary", "light", "moderate", "active", "very_active"
    training_frequency: int = 3  # days per week
    session_duration: int = 60  # minutes
    preferred_training_style: str = "balanced"  # "powerlifting", "bodybuilding", "functional", "balanced"

@dataclass
class UserProfile:
    """Complete user profile with persistent data"""
    user_id: str
    created_at: str
    updated_at: str
    
    # Basic info
    age: Optional[int] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    experience_level: str = "beginner"  # "beginner", "intermediate", "advanced"
    
    # Goals and preferences
    goals: Optional[FitnessGoals] = None
    
    # Health and injury data
    active_injuries: List[InjuryRecord] = None
    injury_history: List[InjuryRecord] = None
    medical_conditions: List[str] = None
    medications: List[str] = None
    
    # Training preferences
    preferred_equipment: List[str] = None
    available_equipment: Dict[str, List[str]] = None
    disliked_exercises: List[str] = None
    preferred_rep_ranges: Dict[str, str] = None  # e.g., {"strength": "1-5", "hypertrophy": "8-12"}
    
    # Communication preferences
    preferred_tone: str = "motivational"  # "casual", "motivational", "technical", "friendly"
    reply_length: str = "standard"  # "brief", "standard", "detailed"
    exercise_name_style: str = "common"  # "common", "technical", "abbreviations"
    
    # Training data (for future use)
    workout_history: List[Dict] = None
    progress_metrics: Dict[str, Any] = None
    
    def __post_init__(self):
        # Initialize empty lists if None
        if self.active_injuries is None:
            self.active_injuries = []
        if self.injury_history is None:
            self.injury_history = []
        if self.medical_conditions is None:
            self.medical_conditions = []
        if self.medications is None:
            self.medications = []
        if self.preferred_equipment is None:
            self.preferred_equipment = ["dumbbells", "barbells", "machines"]
        if self.available_equipment is None:
            self.available_equipment = {
                "gym": ["barbells", "dumbbells", "machines", "cables", "racks"],
                "home": ["dumbbells", "resistance_bands", "bodyweight"],
                "current": "gym"
            }
        if self.disliked_exercises is None:
            self.disliked_exercises = []
        if self.preferred_rep_ranges is None:
            self.preferred_rep_ranges = {
                "strength": "1-5",
                "hypertrophy": "8-12", 
                "endurance": "15+"
            }
        if self.workout_history is None:
            self.workout_history = []
        if self.progress_metrics is None:
            self.progress_metrics = {}

class UserProfileManager:
    """Manages user profiles with persistent JSON storage"""
    
    def __init__(self, profiles_dir: str = "user_profiles"):
        self.profiles_dir = Path(profiles_dir)
        self.profiles_dir.mkdir(exist_ok=True)
        
    def _get_profile_path(self, user_id: str) -> Path:
        """Get the file path for a user's profile"""
        return self.profiles_dir / f"{user_id}.json"
        
    def create_user_profile(self, 
                          age: Optional[int] = None,
                          gender: Optional[str] = None,
                          experience_level: str = "beginner",
                          primary_goal: str = "muscle_building",
                          training_frequency: int = 3) -> UserProfile:
        """Create a new user profile with default values"""
        
        user_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        
        # Create default goals
        goals = FitnessGoals(
            primary_goal=primary_goal,
            secondary_goals=[],
            training_frequency=training_frequency,
            session_duration=60,
            preferred_training_style="balanced"
        )
        
        profile = UserProfile(
            user_id=user_id,
            created_at=now,
            updated_at=now,
            age=age,
            gender=gender,
            experience_level=experience_level,
            goals=goals
        )
        
        self.save_profile(profile)
        return profile
        
    def load_profile(self, user_id: str) -> Optional[UserProfile]:
        """Load user profile from disk"""
        profile_path = self._get_profile_path(user_id)
        
        if not profile_path.exists():
            return None
            
        try:
            with open(profile_path, 'r') as f:
                data = json.load(f)
            
            # Convert injury records back to dataclass objects
            if 'active_injuries' in data and data['active_injuries']:
                data['active_injuries'] = [
                    InjuryRecord(**injury) for injury in data['active_injuries']
                ]
            
            if 'injury_history' in data and data['injury_history']:
                data['injury_history'] = [
                    InjuryRecord(**injury) for injury in data['injury_history']
                ]
                
            # Convert goals back to dataclass
            if 'goals' in data and data['goals']:
                data['goals'] = FitnessGoals(**data['goals'])
            
            return UserProfile(**data)
            
        except Exception as e:
            print(f"Error loading profile {user_id}: {e}")
            return None
            
    def save_profile(self, profile: UserProfile) -> bool:
        """Save user profile to disk"""
        try:
            profile.updated_at = datetime.now().isoformat()
            profile_path = self._get_profile_path(profile.user_id)
            
            # Convert to dict for JSON serialization
            profile_dict = asdict(profile)
            
            with open(profile_path, 'w') as f:
                json.dump(profile_dict, f, indent=2, default=str)
                
            return True
            
        except Exception as e:
            print(f"Error saving profile {profile.user_id}: {e}")
            return False
            
    def update_profile(self, user_id: str, updates: Dict[str, Any]) -> Optional[UserProfile]:
        """Update specific fields in a user profile"""
        profile = self.load_profile(user_id)
        if not profile:
            return None
            
        # Update fields
        for key, value in updates.items():
            if hasattr(profile, key):
                setattr(profile, key, value)
                
        # Save updated profile
        if self.save_profile(profile):
            return profile
        return None
        
    def add_injury(self, user_id: str, injury_type: str, severity: str, 
                   affected_area: str, notes: str = "") -> bool:
        """Add a new injury to user's active injuries"""
        profile = self.load_profile(user_id)
        if not profile:
            return False
            
        injury = InjuryRecord(
            injury_id=str(uuid.uuid4()),
            injury_type=injury_type,
            severity=severity,
            affected_area=affected_area,
            onset_date=datetime.now().isoformat(),
            status="active",
            notes=notes
        )
        
        # Add injury-specific restrictions from safety knowledge
        try:
            from utils.exercise_safety import get_safety_context_for_injury
            safety_context = get_safety_context_for_injury(injury_type)
            injury.banned_exercises = safety_context["avoid"]
            injury.caution_movements = safety_context.get("modifications", [])
        except ImportError:
            try:
                from exercise_safety import get_safety_context_for_injury
                safety_context = get_safety_context_for_injury(injury_type)
                injury.banned_exercises = safety_context["avoid"]
                injury.caution_movements = safety_context.get("modifications", [])
            except ImportError:
                print("Warning: Exercise safety not available for injury restrictions")
                injury.banned_exercises = []
                injury.caution_movements = []
        
        profile.active_injuries.append(injury)
        return self.save_profile(profile)
        
    def update_injury_status(self, user_id: str, injury_id: str, 
                            new_status: str, notes: str = "") -> bool:
        """Update injury status (active -> recovering -> resolved)"""
        profile = self.load_profile(user_id)
        if not profile:
            return False
            
        # Find injury in active injuries
        injury_to_update = None
        for injury in profile.active_injuries:
            if injury.injury_id == injury_id:
                injury_to_update = injury
                break
                
        if not injury_to_update:
            return False
            
        # Update status
        injury_to_update.status = new_status
        if notes:
            injury_to_update.notes += f" | {datetime.now().strftime('%Y-%m-%d')}: {notes}"
            
        # Move to history if resolved
        if new_status == "resolved":
            profile.active_injuries.remove(injury_to_update)
            profile.injury_history.append(injury_to_update)
            
        return self.save_profile(profile)
        
    def get_user_context_for_ai(self, user_id: str) -> Dict[str, Any]:
        """Convert user profile to AI context format"""
        profile = self.load_profile(user_id)
        if not profile:
            # Return default context if no profile found
            return self._get_default_context()
            
        # Build profile summary
        experience_desc = {
            "beginner": "Beginner lifter focusing on learning proper form and building base strength",
            "intermediate": "Intermediate lifter with solid foundation looking to progress further", 
            "advanced": "Advanced lifter with extensive experience seeking optimized programming"
        }
        
        profile_summary = experience_desc.get(profile.experience_level, "Fitness enthusiast")
        
        if profile.goals and profile.goals.primary_goal:
            profile_summary += f". Primary goal: {profile.goals.primary_goal}"
            
        if profile.age:
            profile_summary += f". Age: {profile.age}"
            
        # Build health summary
        active_injury_types = [injury.injury_type for injury in profile.active_injuries]
        banned_exercises = []
        caution_movements = []
        
        for injury in profile.active_injuries:
            banned_exercises.extend(injury.banned_exercises)
            caution_movements.extend(injury.caution_movements)
            
        health_summary = {
            "activeInjuries": active_injury_types,
            "bannedExercises": list(set(banned_exercises)),  # Remove duplicates
            "cautionMovements": list(set(caution_movements)),
            "medicalConditions": profile.medical_conditions,
            "updatedAt": profile.updated_at
        }
        
        # Build preferences
        preference_memory = {
            "replyLength": profile.reply_length,
            "tone": profile.preferred_tone,
            "exerciseNameStyle": profile.exercise_name_style,
            "dislikedExercises": profile.disliked_exercises,
            "preferredEquipment": profile.preferred_equipment
        }
        
        return {
            "profileSummary": profile_summary,
            "healthSummary": health_summary,
            "preferenceMemory": preference_memory,
            "shortTermTurns": [],  # Will be populated by conversation
            "retrievedSnippets": [],  # Future: workout history, progress notes
            "equipmentAccess": profile.available_equipment,
            "requestMeta": {
                "route": "auto",
                "maxOutputTokens": 700,
                "safetyLevel": "conservative" if profile.experience_level == "beginner" else "standard"
            }
        }
        
    def _get_default_context(self):
        """Fallback default context if no user profile exists"""
        return {
            "profileSummary": "New user - no profile created yet. Using conservative defaults.",
            "healthSummary": {
                "activeInjuries": [],
                "bannedExercises": [],
                "cautionMovements": [],
                "medicalConditions": [],
                "updatedAt": datetime.now().isoformat()
            },
            "preferenceMemory": {
                "replyLength": "standard",
                "tone": "friendly",
                "exerciseNameStyle": "common",
                "dislikedExercises": [],
                "preferredEquipment": ["dumbbells", "barbells", "machines"]
            },
            "shortTermTurns": [],
            "retrievedSnippets": [],
            "equipmentAccess": {
                "gym": ["barbells", "dumbbells", "machines", "cables", "racks"],
                "home": ["dumbbells", "resistance_bands", "bodyweight"],
                "current": "gym"
            },
            "requestMeta": {
                "route": "auto",
                "maxOutputTokens": 700,
                "safetyLevel": "very_conservative"
            }
        }
        
    def list_all_profiles(self) -> List[str]:
        """List all user profile IDs"""
        profile_files = list(self.profiles_dir.glob("*.json"))
        return [f.stem for f in profile_files]
        
    def delete_profile(self, user_id: str) -> bool:
        """Delete a user profile"""
        profile_path = self._get_profile_path(user_id)
        if profile_path.exists():
            try:
                profile_path.unlink()
                return True
            except Exception as e:
                print(f"Error deleting profile {user_id}: {e}")
        return False

# Global profile manager instance
profile_manager = UserProfileManager()
