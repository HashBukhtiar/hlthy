"""
Pydantic models for API request/response validation.
"""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ── Request Models ──────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    """Request body for POST /api/chat/stream"""
    message: str = Field(..., min_length=1, max_length=5000)
    conversation_id: str = Field(..., min_length=1)


# ── Response Models ─────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    """Response for GET /api/health"""
    status: str
    version: str
    model: str
    systems: Dict[str, bool]


class SSETokenEvent(BaseModel):
    """SSE event: streamed text token"""
    text: str


class SSEStructuredEvent(BaseModel):
    """SSE event: structured data (workout plan, advice, etc.)"""
    type: str
    data: Dict[str, Any]


class SSEDoneEvent(BaseModel):
    """SSE event: stream complete"""
    message_id: Optional[str] = None


class SSEErrorEvent(BaseModel):
    """SSE event: error"""
    message: str


# ── Domain Models (used by context modules) ─────────────────────────────────


class AIProfile(BaseModel):
    """User's AI coach profile stored in Firestore"""
    experience_level: Optional[str] = None
    goals: List[str] = Field(default_factory=list)
    training_frequency: Optional[int] = None
    injuries: List[str] = Field(default_factory=list)
    equipment: List[str] = Field(default_factory=list)
    dislikes: List[str] = Field(default_factory=list)
    archetype: Optional[str] = None


class RecentWorkout(BaseModel):
    """Summary of a recent workout log"""
    date: str
    name: str
    total_volume: float = 0
    prs_hit: int = 0
    duration_minutes: int = 0
    mood: Optional[str] = None
    exercises: List[str] = Field(default_factory=list)


class ExerciseStats(BaseModel):
    """Performance stats for a single exercise"""
    pr_weight: float = 0
    pr_reps: int = 0
    pr_1rm: float = 0
    last_weight: float = 0
    last_reps: int = 0
    total_sessions: int = 0
    trend: str = "stable"  # improving | declining | stable | new


class CoachMemory(BaseModel):
    """A single coach memory entry"""
    type: str  # preference | injury | goal_change | life_event | observation
    content: str
    source: str = "conversation"  # conversation | workout_data | ai_extracted


class UserContext(BaseModel):
    """Complete user context assembled for the coach prompt"""
    uid: str
    display_name: Optional[str] = None
    profile: AIProfile = Field(default_factory=AIProfile)
    recent_workouts: List[RecentWorkout] = Field(default_factory=list)
    exercise_stats: Dict[str, ExerciseStats] = Field(default_factory=dict)
    recent_prs: List[str] = Field(default_factory=list)
    workout_streak: int = 0
    coach_memories: List[CoachMemory] = Field(default_factory=list)
    conversation_history: List[Dict[str, str]] = Field(default_factory=list)


# ── Exercise Database ───────────────────────────────────────────────────────


class Exercise(BaseModel):
    """Exercise from the canonical database"""
    id: str
    name: str
    primary_muscles: List[str] = Field(default_factory=list)
    secondary_muscles: List[str] = Field(default_factory=list)
    equipment: List[str] = Field(default_factory=list)
    category: str = "compound"
    movement_pattern: str = ""
    difficulty: str = "intermediate"
    form_cues: List[str] = Field(default_factory=list)
    common_mistakes: List[str] = Field(default_factory=list)
    substitutes: List[str] = Field(default_factory=list)
    rep_ranges: Dict[str, str] = Field(default_factory=dict)
