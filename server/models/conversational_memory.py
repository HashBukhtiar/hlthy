"""
Conversational Memory Data Models
Typed schemas for authoritative training profiles, injuries, memories, and session state
"""

from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any, Literal, Union
from datetime import datetime
from enum import Enum


# Type definitions for better type safety
ExperienceLevel = Literal["beginner", "intermediate", "advanced"]
Archetype = Literal["generalist", "powerlifter", "crossfitter", "athlete", "other"]
SexAtBirth = Literal["male", "female", "other", "null"]
LocationType = Literal["commercial_gym", "home", "mixed"]
SplitPreference = Literal["push_pull_legs", "upper_lower", "full_body", "custom", "null"]
CoachingTone = Literal["concise", "supportive", "technical"]
PrimaryGoal = Literal["hypertrophy_back", "strength_bench", "endurance_run", "fat_loss", "maintenance", "other"]
InjuryStatus = Literal["active", "improving", "resolved", "unknown"]
MemoryType = Literal["travel", "schedule_change", "gym_change", "bio_note"]
EventType = Literal["PROFILE_SET", "EQUIPMENT_ADDED", "INJURY_OPENED", "INJURY_UPDATED", "INJURY_RESOLVED", "GOAL_CHANGED"]
SessionState = Literal["IDLE", "CLARIFY_FOCUS", "PROFILE_GAPS", "OFFER_PLAN", "CONFIRM_PLAN", "DELIVER_PLAN", "FOLLOW_UP", "CHECK_IN"]


@dataclass
class Identity:
    """User identity and physical characteristics"""
    sex_at_birth: Optional[SexAtBirth] = None
    age_years: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    timezone: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "sex_at_birth": self.sex_at_birth,
            "age_years": self.age_years,
            "height_cm": self.height_cm,
            "weight_kg": self.weight_kg,
            "timezone": self.timezone
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Identity':
        return cls(
            sex_at_birth=data.get("sex_at_birth"),
            age_years=data.get("age_years"),
            height_cm=data.get("height_cm"),
            weight_kg=data.get("weight_kg"),
            timezone=data.get("timezone")
        )


@dataclass
class Environment:
    """Training environment and equipment"""
    location: Optional[LocationType] = None
    equipment_brands: List[str] = field(default_factory=list)
    equipment_ids: List[str] = field(default_factory=list)
    last_equipment_confirmed_at: Optional[str] = None  # ISO datetime string
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "location": self.location,
            "equipment_brands": self.equipment_brands,
            "equipment_ids": self.equipment_ids,
            "last_equipment_confirmed_at": self.last_equipment_confirmed_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Environment':
        return cls(
            location=data.get("location"),
            equipment_brands=data.get("equipment_brands", []),
            equipment_ids=data.get("equipment_ids", []),
            last_equipment_confirmed_at=data.get("last_equipment_confirmed_at")
        )


@dataclass
class Preferences:
    """Training preferences and style"""
    split_pref: Optional[SplitPreference] = None
    session_length_min: Optional[int] = None
    style_bias: List[str] = field(default_factory=list)
    dislikes: List[str] = field(default_factory=list)
    coaching_tone: Optional[CoachingTone] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "split_pref": self.split_pref,
            "session_length_min": self.session_length_min,
            "style_bias": self.style_bias,
            "dislikes": self.dislikes,
            "coaching_tone": self.coaching_tone
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Preferences':
        return cls(
            split_pref=data.get("split_pref"),
            session_length_min=data.get("session_length_min"),
            style_bias=data.get("style_bias", []),
            dislikes=data.get("dislikes", []),
            coaching_tone=data.get("coaching_tone")
        )


@dataclass
class Goals:
    """Training goals and targets"""
    primary: Optional[PrimaryGoal] = None
    secondary: Optional[str] = None
    target_date: Optional[str] = None  # ISO datetime string
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "primary": self.primary,
            "secondary": self.secondary,
            "target_date": self.target_date
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Goals':
        return cls(
            primary=data.get("primary"),
            secondary=data.get("secondary"),
            target_date=data.get("target_date")
        )


@dataclass
class Constraints:
    """Training constraints and limitations"""
    contraindicated_patterns: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "contraindicated_patterns": self.contraindicated_patterns
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Constraints':
        return cls(
            contraindicated_patterns=data.get("contraindicated_patterns", [])
        )


@dataclass
class Audit:
    """Profile audit and versioning"""
    last_interview_at: Optional[str] = None
    last_refreshed_at: Optional[str] = None
    last_used_by_planner_at: Optional[str] = None
    schema_version: int = 1
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "last_interview_at": self.last_interview_at,
            "last_refreshed_at": self.last_refreshed_at,
            "last_used_by_planner_at": self.last_used_by_planner_at,
            "schema_version": self.schema_version
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Audit':
        return cls(
            last_interview_at=data.get("last_interview_at"),
            last_refreshed_at=data.get("last_refreshed_at"),
            last_used_by_planner_at=data.get("last_used_by_planner_at"),
            schema_version=data.get("schema_version", 1)
        )


@dataclass
class Consent:
    """Privacy and consent settings"""
    remember_bio_notes: bool = False
    retention_days_injury: int = 540
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "remember_bio_notes": self.remember_bio_notes,
            "retention_days_injury": self.retention_days_injury
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Consent':
        return cls(
            remember_bio_notes=data.get("remember_bio_notes", False),
            retention_days_injury=data.get("retention_days_injury", 540)
        )


@dataclass
class TrainingProfile:
    """
    Authoritative training profile (users/{uid}/training_profile_v1)
    Single source of truth for user training information
    """
    version: int = 1
    identity: Identity = field(default_factory=Identity)
    experience_level: Optional[ExperienceLevel] = None
    archetype: Optional[Archetype] = None
    environment: Environment = field(default_factory=Environment)
    preferences: Preferences = field(default_factory=Preferences)
    goals: Goals = field(default_factory=Goals)
    constraints: Constraints = field(default_factory=Constraints)
    audit: Audit = field(default_factory=Audit)
    consent: Consent = field(default_factory=Consent)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "identity": self.identity.to_dict(),
            "experience_level": self.experience_level,
            "archetype": self.archetype,
            "environment": self.environment.to_dict(),
            "preferences": self.preferences.to_dict(),
            "goals": self.goals.to_dict(),
            "constraints": self.constraints.to_dict(),
            "audit": self.audit.to_dict(),
            "consent": self.consent.to_dict()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TrainingProfile':
        return cls(
            version=data.get("version", 1),
            identity=Identity.from_dict(data.get("identity", {})),
            experience_level=data.get("experience_level"),
            archetype=data.get("archetype"),
            environment=Environment.from_dict(data.get("environment", {})),
            preferences=Preferences.from_dict(data.get("preferences", {})),
            goals=Goals.from_dict(data.get("goals", {})),
            constraints=Constraints.from_dict(data.get("constraints", {})),
            audit=Audit.from_dict(data.get("audit", {})),
            consent=Consent.from_dict(data.get("consent", {}))
        )
    
    def get_snapshot_hash(self) -> str:
        """Generate hash for planner snapshot tracking"""
        import hashlib
        import json
        
        # Create deterministic hash from profile data
        profile_json = json.dumps(self.to_dict(), sort_keys=True, default=str)
        return hashlib.sha256(profile_json.encode()).hexdigest()[:16]


@dataclass
class Injury:
    """
    Injury timeline entry (users/{uid}/injuries/{injury_id})
    Append-only history with proactive check-ins
    """
    body_part: str
    onset: str  # ISO date string
    severity_1_to_5: int
    status: InjuryStatus
    contraindications: List[str] = field(default_factory=list)
    last_check_in: Optional[str] = None  # ISO date string
    next_check_in_due: Optional[str] = None  # ISO date string
    notes: str = ""
    confidence: float = 0.0
    source: Literal["chat", "workout", "profile"] = "chat"
    updated_at: Optional[str] = None  # ISO datetime string
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "body_part": self.body_part,
            "onset": self.onset,
            "severity_1_to_5": self.severity_1_to_5,
            "status": self.status,
            "contraindications": self.contraindications,
            "last_check_in": self.last_check_in,
            "next_check_in_due": self.next_check_in_due,
            "notes": self.notes,
            "confidence": self.confidence,
            "source": self.source,
            "updated_at": self.updated_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Injury':
        return cls(
            body_part=data["body_part"],
            onset=data["onset"],
            severity_1_to_5=data["severity_1_to_5"],
            status=data["status"],
            contraindications=data.get("contraindications", []),
            last_check_in=data.get("last_check_in"),
            next_check_in_due=data.get("next_check_in_due"),
            notes=data.get("notes", ""),
            confidence=data.get("confidence", 0.0),
            source=data.get("source", "chat"),
            updated_at=data.get("updated_at")
        )
    
    def calculate_next_check_in(self, now: datetime) -> str:
        """Calculate next check-in date based on injury status and severity"""
        from datetime import timedelta
        
        if self.status == "resolved":
            # No more check-ins needed
            return None
        elif self.status == "improving":
            # Extend to 14 days for improving injuries
            next_date = now + timedelta(days=14)
        elif self.status == "unknown" or self.severity_1_to_5 >= 4:
            # Frequent check-ins for severe or unclear injuries
            next_date = now + timedelta(days=3)
        else:
            # Standard check-in for active injuries
            next_date = now + timedelta(days=7)
        
        return next_date.isoformat()


@dataclass
class EpisodicMemory:
    """
    Episodic chat memory (users/{uid}/memories/{memory_id})
    Temporary context with TTL for conversation continuity
    """
    type: MemoryType
    claim: str
    confidence: float
    created_at: str  # ISO datetime string
    ttl_days: int
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "claim": self.claim,
            "confidence": self.confidence,
            "created_at": self.created_at,
            "ttl_days": self.ttl_days
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'EpisodicMemory':
        return cls(
            type=data["type"],
            claim=data["claim"],
            confidence=data["confidence"],
            created_at=data["created_at"],
            ttl_days=data["ttl_days"]
        )
    
    def is_expired(self, now: datetime) -> bool:
        """Check if memory has expired based on TTL"""
        from datetime import datetime, timedelta
        
        created = datetime.fromisoformat(self.created_at.replace('Z', '+00:00'))
        expiry = created + timedelta(days=self.ttl_days)
        return now >= expiry


@dataclass
class ProfileEvent:
    """
    Profile change event (users/{uid}/profile_events/{event_id})
    Audit log for undo/debugging capabilities
    """
    type: EventType
    patch: Dict[str, Any]
    source: Literal["chat", "interview", "system"]
    timestamp: str  # ISO datetime string
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "patch": self.patch,
            "source": self.source,
            "timestamp": self.timestamp
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ProfileEvent':
        return cls(
            type=data["type"],
            patch=data["patch"],
            source=data["source"],
            timestamp=data["timestamp"]
        )


@dataclass
class SessionKnown:
    """Known facts during conversation session"""
    focus: Optional[str] = None
    time_available_min: Optional[int] = None
    injury_flags: List[str] = field(default_factory=list)
    equipment_ids: List[str] = field(default_factory=list)
    brands_available: List[str] = field(default_factory=list)
    goal_hint: Optional[str] = None
    session_length_min: Optional[int] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "focus": self.focus,
            "time_available_min": self.time_available_min,
            "injury_flags": self.injury_flags,
            "equipment_ids": self.equipment_ids,
            "brands_available": self.brands_available,
            "goal_hint": self.goal_hint,
            "session_length_min": self.session_length_min
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SessionKnown':
        return cls(
            focus=data.get("focus"),
            time_available_min=data.get("time_available_min"),
            injury_flags=data.get("injury_flags", []),
            equipment_ids=data.get("equipment_ids", []),
            brands_available=data.get("brands_available", []),
            goal_hint=data.get("goal_hint"),
            session_length_min=data.get("session_length_min")
        )


@dataclass
class SessionState:
    """
    Session state for dialog engine (users/{uid}/session_state/current)
    Tracks conversation flow and pending questions
    """
    state: SessionState
    pending_question: Optional[Literal["time_available", "equipment", "injury_status", "goal", "session_length"]] = None
    known: SessionKnown = field(default_factory=SessionKnown)
    updated_at: str = ""  # ISO datetime string
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "state": self.state,
            "pending_question": self.pending_question,
            "known": self.known.to_dict(),
            "updated_at": self.updated_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SessionState':
        return cls(
            state=data["state"],
            pending_question=data.get("pending_question"),
            known=SessionKnown.from_dict(data.get("known", {})),
            updated_at=data.get("updated_at", "")
        )


# Utility functions for data model operations
def create_default_profile(uid: str) -> TrainingProfile:
    """Create a default training profile for new users"""
    now = datetime.utcnow().isoformat() + "Z"
    
    return TrainingProfile(
        audit=Audit(last_refreshed_at=now)
    )


def create_injury_from_text(body_part: str, severity: int, notes: str = "", 
                           source: str = "chat", confidence: float = 0.0) -> Injury:
    """Create injury record from extracted information"""
    now = datetime.utcnow()
    
    injury = Injury(
        body_part=body_part,
        onset=now.date().isoformat(),
        severity_1_to_5=severity,
        status="active",
        notes=notes,
        confidence=confidence,
        source=source,
        updated_at=now.isoformat() + "Z"
    )
    
    # Set next check-in
    injury.next_check_in_due = injury.calculate_next_check_in(now)
    
    return injury


def create_memory(memory_type: MemoryType, claim: str, confidence: float = 0.0, 
                 ttl_days: int = 14) -> EpisodicMemory:
    """Create episodic memory from conversation"""
    now = datetime.utcnow().isoformat() + "Z"
    
    return EpisodicMemory(
        type=memory_type,
        claim=claim,
        confidence=confidence,
        created_at=now,
        ttl_days=ttl_days
    )


def create_profile_event(event_type: EventType, patch: Dict[str, Any], 
                        source: str = "chat") -> ProfileEvent:
    """Create profile change event for audit log"""
    now = datetime.utcnow().isoformat() + "Z"
    
    return ProfileEvent(
        type=event_type,
        patch=patch,
        source=source,
        timestamp=now
    )