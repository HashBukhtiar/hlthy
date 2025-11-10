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
    """Individual injury tracking record with conversational memory enhancements"""
    injury_id: str
    injury_type: str  # e.g., "elbow_pain", "shoulder_impingement"
    severity: str  # "mild", "moderate", "severe"
    affected_area: str  # "right_elbow", "left_shoulder", etc.
    onset_date: str  # ISO datetime
    status: str  # "active", "recovering", "resolved"
    
    # Conversational memory enhancements
    severity_1_to_5: int = 3  # Numeric severity for consistency
    last_check_in: Optional[str] = None  # ISO date string
    next_check_in_due: Optional[str] = None  # ISO date string for proactive check-ins
    confidence: float = 0.0  # Extraction confidence
    source: str = "chat"  # "chat", "workout", "profile"
    
    notes: str = ""
    banned_exercises: List[str] = None
    caution_movements: List[str] = None
    recovery_timeline: Optional[str] = None  # estimated recovery date
    
    def __post_init__(self):
        if self.banned_exercises is None:
            self.banned_exercises = []
        if self.caution_movements is None:
            self.caution_movements = []
    
    def calculate_next_check_in(self, now: datetime) -> str:
        """Calculate next check-in date based on injury status and severity"""
        from datetime import timedelta
        
        if self.status == "resolved":
            return None
        elif self.status == "recovering":
            # Extend to 14 days for recovering injuries
            next_date = now + timedelta(days=14)
        elif self.status == "unknown" or self.severity_1_to_5 >= 4:
            # High severity or unknown status: check in 3-5 days
            next_date = now + timedelta(days=min(5, max(3, 6 - self.severity_1_to_5)))
        else:
            # Lower severity: check in 7-14 days
            next_date = now + timedelta(days=min(14, max(7, 10 - self.severity_1_to_5)))
        
        return next_date.date().isoformat()
    
    def get_days_since_last_check_in(self) -> int:
        """Calculate days since last check-in"""
        if not self.last_check_in:
            return 0
        
        from datetime import datetime
        last_check = datetime.fromisoformat(self.last_check_in)
        now = datetime.now()
        return (now.date() - last_check.date()).days


@dataclass
class EpisodicMemory:
    """Episodic chat memory with TTL for conversation continuity"""
    memory_id: str
    type: str  # "travel", "schedule_change", "gym_change", "bio_note"
    claim: str
    confidence: float
    created_at: str  # ISO datetime string
    ttl_days: int
    
    def is_expired(self, now: datetime) -> bool:
        """Check if memory has expired based on TTL"""
        from datetime import timedelta, timezone
        
        # Parse created_at to datetime object
        created_str = self.created_at.replace('Z', '+00:00') if self.created_at.endswith('Z') else self.created_at
        try:
            created = datetime.fromisoformat(created_str)
        except:
            created = datetime.fromisoformat(self.created_at.split('.')[0] + '+00:00')
        
        # Ensure now is timezone-aware for comparison
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
        
        expiry = created + timedelta(days=self.ttl_days)
        return now >= expiry


@dataclass
class SessionState:
    """Session state for conversational flow management"""
    state: str  # "IDLE", "CLARIFY_FOCUS", "PROFILE_GAPS", "OFFER_PLAN", etc.
    pending_question: Optional[str] = None  # "time_available", "equipment", etc.
    focus: Optional[str] = None
    time_available_min: Optional[int] = None
    injury_flags: List[str] = None
    equipment_ids: List[str] = None
    brands_available: List[str] = None
    goal_hint: Optional[str] = None
    session_length_min: Optional[int] = None
    updated_at: str = ""
    
    def __post_init__(self):
        if self.injury_flags is None:
            self.injury_flags = []
        if self.equipment_ids is None:
            self.equipment_ids = []
        if self.brands_available is None:
            self.brands_available = []


@dataclass
class ConversationalConsent:
    """Privacy and consent settings for conversational memory"""
    remember_bio_notes: bool = False
    retention_days_injury: int = 540
    data_sharing_consent: bool = False
    personalization_consent: bool = True

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
    """Complete user profile with persistent data and conversational memory"""
    user_id: str
    created_at: str
    updated_at: str
    
    # Conversational memory enhancements
    version: int = 1
    schema_version: int = 1
    last_interview_at: Optional[str] = None
    last_used_by_planner_at: Optional[str] = None
    
    # Basic info (enhanced with timezone)
    age: Optional[int] = None
    gender: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    timezone: Optional[str] = None
    experience_level: Optional[str] = None  # "beginner", "intermediate", "advanced"
    archetype: Optional[str] = None  # "generalist", "powerlifter", "crossfitter", etc.
    
    # NEW: Enhanced profile memory fields
    training_frequency: Optional[int] = None  # Days per week (1-7)
    primary_goals: Optional[List[str]] = None  # ["hypertrophy", "strength", "endurance", "weight_loss", "general_fitness"]
    preferences: Optional[List[str]] = None  # Free-form preference notes (e.g., "loves hammer strength machines")
    
    # Goals and preferences
    goals: Optional[FitnessGoals] = None
    
    # Health and injury data (enhanced)
    active_injuries: List[InjuryRecord] = None
    injury_history: List[InjuryRecord] = None
    medical_conditions: List[str] = None
    medications: List[str] = None
    
    # Training preferences (enhanced with brands)
    preferred_equipment: List[str] = None
    available_equipment: Dict[str, List[str]] = None
    equipment_brands: List[str] = None  # Brand preferences like "Life Fitness"
    last_equipment_confirmed_at: Optional[str] = None
    disliked_exercises: List[str] = None
    preferred_rep_ranges: Dict[str, str] = None
    coaching_tone: str = "supportive"  # "concise", "supportive", "technical"
    
    # Communication preferences
    preferred_tone: str = "motivational"  # DEPRECATED - use coaching_tone
    reply_length: str = "standard"  # "brief", "standard", "detailed"
    exercise_name_style: str = "common"  # "common", "technical", "abbreviations"
    
    # Workout structure preferences
    workout_preferences: Optional[Dict[str, bool]] = None
    
    # Conversational memory features
    episodic_memories: List[EpisodicMemory] = None
    session_state: Optional[SessionState] = None
    consent: Optional[ConversationalConsent] = None
    
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
        if self.equipment_brands is None:
            self.equipment_brands = []
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
        if self.episodic_memories is None:
            self.episodic_memories = []
        if self.session_state is None:
            self.session_state = SessionState(state="IDLE")
        if self.consent is None:
            self.consent = ConversationalConsent()
        
        # Initialize NEW fields
        if self.primary_goals is None:
            self.primary_goals = []
        if self.preferences is None:
            self.preferences = []
        if self.workout_preferences is None:
            self.workout_preferences = {
                "include_warmup": True,
                "include_cooldown": True,
                "include_cardio": False,
                "include_stretching": True
            }
    
    def get_snapshot_hash(self) -> str:
        """Generate hash for planner snapshot tracking"""
        import hashlib
        import json
        
        # Create snapshot excluding volatile session state and memories
        snapshot_data = {
            "user_id": self.user_id,
            "version": self.version,
            "age": self.age,
            "experience_level": self.experience_level,
            "archetype": self.archetype,
            "goals": asdict(self.goals) if self.goals else None,
            "active_injuries": [asdict(injury) for injury in self.active_injuries],
            "preferred_equipment": self.preferred_equipment,
            "equipment_brands": self.equipment_brands,
            "disliked_exercises": self.disliked_exercises,
            "coaching_tone": self.coaching_tone
        }
        
        # Create deterministic hash from profile data
        profile_json = json.dumps(snapshot_data, sort_keys=True, default=str)
        return hashlib.sha256(profile_json.encode()).hexdigest()[:16]
    
    def get_active_contraindications(self) -> List[str]:
        """Get all movement patterns contraindicated by active injuries"""
        contraindications = []
        for injury in self.active_injuries:
            if injury.status in ["active", "recovering"]:
                contraindications.extend(injury.banned_exercises)
        return list(set(contraindications))  # Remove duplicates
    
    def add_episodic_memory(self, memory_type: str, claim: str, confidence: float = 0.0, ttl_days: int = 14):
        """Add new episodic memory with TTL"""
        from datetime import datetime, timezone
        import uuid
        
        memory = EpisodicMemory(
            memory_id=str(uuid.uuid4()),
            type=memory_type,
            claim=claim,
            confidence=confidence,
            created_at=datetime.now(timezone.utc).isoformat(),
            ttl_days=ttl_days
        )
        self.episodic_memories.append(memory)
        self._cleanup_expired_memories()
    
    def _cleanup_expired_memories(self):
        """Remove expired episodic memories"""
        from datetime import datetime, timezone
        
        now = datetime.now(timezone.utc)
        self.episodic_memories = [
            memory for memory in self.episodic_memories
            if not memory.is_expired(now)
        ]
    
    def update_injury_check_in(self, injury_id: str, status: str, notes: str = ""):
        """Update injury status and schedule next check-in"""
        from datetime import datetime, timezone
        
        now = datetime.now(timezone.utc)
        
        for injury in self.active_injuries:
            if injury.injury_id == injury_id:
                injury.status = status
                injury.last_check_in = now.date().isoformat()
                injury.next_check_in_due = injury.calculate_next_check_in(now)
                if notes:
                    injury.notes = notes
                
                # Move resolved injuries to history
                if status == "resolved":
                    self.injury_history.append(injury)
                    self.active_injuries.remove(injury)
                break
    
    def get_injuries_needing_check_in(self) -> List[InjuryRecord]:
        """Get injuries that need a check-in based on schedule"""
        from datetime import datetime, timezone
        
        now = datetime.now(timezone.utc).date()
        
        return [
            injury for injury in self.active_injuries
            if injury.next_check_in_due and 
               datetime.fromisoformat(injury.next_check_in_due).date() <= now
        ]
    
    def mark_planner_usage(self):
        """Mark when profile was used by planner for snapshot tracking"""
        from datetime import datetime, timezone
        self.last_used_by_planner_at = datetime.now(timezone.utc).isoformat()
    
    def increment_version(self):
        """Increment profile version for change tracking"""
        self.version += 1
        from datetime import datetime, timezone
        self.updated_at = datetime.now(timezone.utc).isoformat()
    
    def get_profile_for_planner(self) -> Dict:
        """Get formatted profile data for planner with conversational context"""
        return {
            "user_id": self.user_id,
            "profile_hash": self.get_snapshot_hash(),
            "basic_info": {
                "age": self.age,
                "experience_level": self.experience_level,
                "archetype": self.archetype,
                "timezone": self.timezone
            },
            "goals": asdict(self.goals) if self.goals else None,
            "active_injuries": [asdict(injury) for injury in self.active_injuries],
            "equipment": {
                "preferred": self.preferred_equipment,
                "available": self.available_equipment,
                "brands": self.equipment_brands
            },
            "preferences": {
                "disliked_exercises": self.disliked_exercises,
                "coaching_tone": self.coaching_tone,
                "rep_ranges": self.preferred_rep_ranges
            },
            "conversation_context": {
                "recent_memories": [
                    asdict(memory) for memory in self.episodic_memories[-5:]  # Last 5 memories
                ],
                "injuries_needing_check_in": [
                    asdict(injury) for injury in self.get_injuries_needing_check_in()
                ],
                "session_state": asdict(self.session_state) if self.session_state else None,
                "consent": asdict(self.consent) if self.consent else None
            }
        }

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


class EnhancedProfileManager:
    """Enhanced profile manager with conversational memory and Firebase integration"""
    
    def __init__(self, firebase_db=None):
        self.db = firebase_db
        self._profile_cache = {}
        self._fallback_manager = profile_manager  # Use existing file-based manager as fallback
    
    def get_profile(self, user_id: str) -> Optional[UserProfile]:
        """Get user profile with conversational memory features"""
        if user_id in self._profile_cache:
            profile = self._profile_cache[user_id]
            # Clean up expired memories on retrieval
            profile._cleanup_expired_memories()
            return profile
            
        # Try Firebase first, then fallback to file system
        if self.db:
            try:
                doc = self.db.collection('user_profiles').document(user_id).get()
                if doc.exists:
                    data = doc.to_dict()
                    profile = self._deserialize_profile(data)
                    self._profile_cache[user_id] = profile
                    return profile
            except Exception as e:
                print(f"Firebase error, using fallback: {e}")
        
        # Fallback to existing file-based system
        profile = self._fallback_manager.load_profile(user_id)
        if profile:
            self._profile_cache[user_id] = profile
        return profile
    
    def save_profile(self, profile: UserProfile, increment_version: bool = True) -> bool:
        """Save profile with enhanced version tracking"""
        try:
            if increment_version:
                profile.increment_version()
            
            self._profile_cache[profile.user_id] = profile
            
            # Try Firebase first, then fallback to file system
            if self.db:
                try:
                    doc_data = self._serialize_profile(profile)
                    self.db.collection('user_profiles').document(profile.user_id).set(doc_data)
                    return True
                except Exception as e:
                    print(f"Firebase error, using fallback: {e}")
            
            # Fallback to existing file-based system
            return self._fallback_manager.save_profile(profile)
            
        except Exception as e:
            print(f"Error saving profile: {e}")
            return False
    
    def create_profile(self, user_id: str, **kwargs) -> UserProfile:
        """Create new profile with conversational memory features"""
        from datetime import datetime, timezone
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Create profile with enhanced defaults
        profile = UserProfile(
            user_id=user_id,
            created_at=now,
            updated_at=now,
            timezone=kwargs.get('timezone', 'UTC'),
            **kwargs
        )
        
        # Initialize conversational features
        profile.consent = ConversationalConsent()
        profile.session_state = SessionState(state="IDLE")
        
        self.save_profile(profile, increment_version=False)
        return profile
    
    def add_injury(self, user_id: str, injury_type: str, affected_area: str, 
                   severity: int, source: str = "user_reported", 
                   confidence: float = 1.0) -> bool:
        """Add injury with enhanced tracking and automatic check-in scheduling"""
        profile = self.get_profile(user_id)
        if not profile:
            return False
        
        from datetime import datetime, timezone
        import uuid
        
        now = datetime.now(timezone.utc)
        
        injury = InjuryRecord(
            injury_id=str(uuid.uuid4()),
            injury_type=injury_type,
            affected_area=affected_area,
            severity="moderate",  # Default string severity
            severity_1_to_5=severity,  # Numeric severity 
            source=source,
            confidence=confidence,
            onset_date=now.date().isoformat(),
            status="active",
            last_check_in=now.date().isoformat(),
            next_check_in_due=self._calculate_next_check_in_static(severity, now)
        )
        
        profile.active_injuries.append(injury)
        
        # Add to episodic memory
        profile.add_episodic_memory(
            memory_type="injury_reported",
            claim=f"User reported {injury_type} in {affected_area}, severity {severity}/10",
            confidence=confidence,
            ttl_days=30  # Injury memories last longer
        )
        
        return self.save_profile(profile)
    
    def _calculate_next_check_in_static(self, severity: int, current_time: datetime) -> str:
        """Calculate next check-in date based on severity"""
        from datetime import timedelta
        days_to_add = max(1, 10 - severity)  # Higher severity = more frequent check-ins
        next_check = current_time + timedelta(days=days_to_add)
        return next_check.date().isoformat()
    
    def schedule_injury_check_ins(self, user_id: str) -> List[Dict]:
        """Get scheduled injury check-ins for user"""
        profile = self.get_profile(user_id)
        if not profile:
            return []
        
        check_ins_needed = profile.get_injuries_needing_check_in()
        
        return [
            {
                "injury_id": injury.injury_id,
                "type": injury.injury_type,
                "affected_area": injury.affected_area,
                "severity": injury.severity_1_to_5,
                "days_since_last_check": injury.get_days_since_last_check_in(),
                "check_in_type": "scheduled" if injury.next_check_in_due else "overdue"
            }
            for injury in check_ins_needed
        ]
    
    def update_conversation_state(self, user_id: str, state: str, context: Dict = None):
        """Update user's conversation state for dialog flow management"""
        profile = self.get_profile(user_id)
        if not profile:
            return False
        
        if not profile.session_state:
            profile.session_state = SessionState(state=state)
        else:
            profile.session_state.state = state
            profile.session_state.context = context or {}
        
        from datetime import datetime, timezone
        profile.session_state.updated_at = datetime.now(timezone.utc).isoformat()
        
        return self.save_profile(profile)
    
    def add_episodic_memory(self, user_id: str, memory_type: str, claim: str, 
                           confidence: float = 0.0, ttl_days: int = 14) -> bool:
        """Add episodic memory to user profile"""
        profile = self.get_profile(user_id)
        if not profile:
            return False
        
        profile.add_episodic_memory(memory_type, claim, confidence, ttl_days)
        return self.save_profile(profile)
    
    def get_profile_for_planner(self, user_id: str) -> Optional[Dict]:
        """Get comprehensive profile data formatted for planner with conversation context"""
        profile = self.get_profile(user_id)
        if not profile:
            return None
        
        # Mark that planner accessed profile
        profile.mark_planner_usage()
        self.save_profile(profile)
        
        return profile.get_profile_for_planner()
    
    def needs_interview_refresh(self, user_id: str, days_threshold: int = 30) -> bool:
        """Check if user needs fresh interview based on last interview date"""
        profile = self.get_profile(user_id)
        if not profile or not profile.last_interview_at:
            return True
        
        from datetime import datetime, timezone
        
        last_interview = datetime.fromisoformat(profile.last_interview_at)
        now = datetime.now(timezone.utc)
        days_since_interview = (now - last_interview).days
        
        return days_since_interview >= days_threshold
    
    def mark_interview_completed(self, user_id: str):
        """Mark that user completed fresh interview"""
        profile = self.get_profile(user_id)
        if not profile:
            return False
        
        from datetime import datetime, timezone
        profile.last_interview_at = datetime.now(timezone.utc).isoformat()
        
        # Add memory about interview completion
        profile.add_episodic_memory(
            memory_type="interview_completed",
            claim="User completed comprehensive profile interview",
            confidence=1.0,
            ttl_days=60
        )
        
        return self.save_profile(profile)
    
    def _serialize_profile(self, profile: UserProfile) -> Dict:
        """Serialize profile for Firebase storage"""
        return asdict(profile)
    
    def _deserialize_profile(self, data: Dict) -> UserProfile:
        """Deserialize profile from Firebase data"""
        # Convert nested structures back to dataclasses
        if 'goals' in data and data['goals']:
            data['goals'] = FitnessGoals(**data['goals'])
        
        if 'active_injuries' in data and data['active_injuries']:
            data['active_injuries'] = [
                InjuryRecord(**injury) for injury in data['active_injuries']
            ]
        
        if 'injury_history' in data and data['injury_history']:
            data['injury_history'] = [
                InjuryRecord(**injury) for injury in data['injury_history']
            ]
        
        if 'episodic_memories' in data and data['episodic_memories']:
            data['episodic_memories'] = [
                EpisodicMemory(**memory) for memory in data['episodic_memories']
            ]
        
        if 'session_state' in data and data['session_state']:
            data['session_state'] = SessionState(**data['session_state'])
        
        if 'consent' in data and data['consent']:
            data['consent'] = ConversationalConsent(**data['consent'])
        
        return UserProfile(**data)


# Enhanced global manager instance
enhanced_profile_manager = EnhancedProfileManager()
