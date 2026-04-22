"""
Pydantic models for API request/response validation.
"""
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator


# ── Request Models ──────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    """Request body for POST /api/chat/stream"""
    message: str = Field(..., min_length=1, max_length=5000)
    conversation_id: str = Field(..., min_length=1)


class WorkoutExercisePayload(BaseModel):
    """A single exercise within a workout log payload for analysis."""
    exerciseName: str = Field(default="", max_length=100)
    skipped: bool = False
    sets: List[Dict[str, Any]] = Field(default_factory=list)

    @field_validator("sets")
    @classmethod
    def limit_sets(cls, v: list) -> list:
        return v[:20]


class WorkoutLogPayload(BaseModel):
    """Validated workout log data for the analysis endpoint."""
    workoutName: str = Field(default="Workout", max_length=100)
    durationMinutes: int = Field(default=0, ge=0, le=600)
    totalVolume: float = Field(default=0, ge=0)
    totalSets: int = Field(default=0, ge=0, le=500)
    totalReps: int = Field(default=0, ge=0, le=5000)
    exercisesCompleted: int = Field(default=0, ge=0, le=50)
    exercisesSkipped: int = Field(default=0, ge=0, le=50)
    prsHit: int = Field(default=0, ge=0, le=50)
    mood: Optional[str] = Field(default=None, max_length=20)
    perceivedDifficulty: Optional[int] = Field(default=None, ge=1, le=10)
    exercises: List[WorkoutExercisePayload] = Field(default_factory=list)

    @field_validator("exercises")
    @classmethod
    def limit_exercises(cls, v: list) -> list:
        return v[:20]


class AnalyzeWorkoutRequest(BaseModel):
    """Request body for POST /api/internal/analyze-workout"""
    uid: str = Field(..., min_length=1, max_length=128)
    workout_log: WorkoutLogPayload = Field(...)


class WeeklySummaryRequest(BaseModel):
    """Request body for POST /api/internal/weekly-summary"""
    uid: str = Field(..., min_length=1, max_length=128)


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


class WorkoutAnalysis(BaseModel):
    """Shared response type for coach insight endpoints (workout analysis + weekly summary)."""
    insight: str
    highlights: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    sentiment: Literal["positive", "neutral", "needs_attention"] = "positive"


# ── Progress Chart ──────────────────────────────────────────────────────────


class ProgressChartPoint(BaseModel):
    """A single (x, y) point in a progress chart series."""
    date: str = Field(..., min_length=1, max_length=20)
    value: float


class ProgressChartSeries(BaseModel):
    """A named series in a progress chart (e.g., 'Bench Press')."""
    label: str = Field(..., min_length=1, max_length=80)
    color: Optional[str] = Field(
        default=None,
        pattern=r"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$",
        max_length=9,
    )
    points: List[ProgressChartPoint] = Field(default_factory=list)

    @field_validator("points")
    @classmethod
    def limit_points(cls, v: list) -> list:
        return v[:60]  # cap to 60 points per series


class ProgressChartData(BaseModel):
    """Structured payload for the progress_chart response type."""
    title: str = Field(..., min_length=1, max_length=100)
    metric: Literal["weight", "volume", "reps", "one_rep_max"] = "weight"
    unit: str = Field(default="lbs", max_length=10)
    series: List[ProgressChartSeries] = Field(..., min_length=1)
    x_axis_label: Optional[str] = Field(default=None, max_length=40)
    y_axis_label: Optional[str] = Field(default=None, max_length=40)
    summary: Optional[str] = Field(default=None, max_length=280)

    @field_validator("series")
    @classmethod
    def limit_series(cls, v: list) -> list:
        return v[:4]  # at most 4 series on one chart


# ── Volume Breakdown ────────────────────────────────────────────────────────


class VolumeBreakdownEntry(BaseModel):
    """A single muscle group / segment volume bar."""
    label: str = Field(..., min_length=1, max_length=40)
    value: float = Field(..., ge=0)
    color: Optional[str] = Field(
        default=None,
        pattern=r"^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$",
        max_length=9,
    )


class VolumeBreakdownData(BaseModel):
    """Structured payload for the volume_breakdown response type."""
    title: str = Field(..., min_length=1, max_length=100)
    unit: str = Field(default="lbs", max_length=10)
    total: Optional[float] = Field(default=None, ge=0)
    prior_total: Optional[float] = Field(default=None, ge=0)
    period_label: Optional[str] = Field(default=None, max_length=40)
    entries: List[VolumeBreakdownEntry] = Field(..., min_length=1)
    summary: Optional[str] = Field(default=None, max_length=280)

    @field_validator("entries")
    @classmethod
    def limit_entries(cls, v: list) -> list:
        return v[:10]


# ── Strength Curve ──────────────────────────────────────────────────────────


class StrengthCurvePoint(BaseModel):
    """One session entry in a strength curve."""
    date: str = Field(..., min_length=1, max_length=20)
    value: float
    is_pr: bool = False
    reps: Optional[int] = Field(default=None, ge=1, le=100)


class StrengthCurveData(BaseModel):
    """Structured payload for the strength_curve response type."""
    exercise_name: str = Field(..., min_length=1, max_length=80)
    metric: Literal["weight", "one_rep_max", "volume"] = "weight"
    unit: str = Field(default="lbs", max_length=10)
    points: List[StrengthCurvePoint] = Field(..., min_length=2)
    trend_label: Optional[str] = Field(default=None, max_length=40)
    projected_next: Optional[float] = Field(default=None, ge=0)
    summary: Optional[str] = Field(default=None, max_length=280)

    @field_validator("points")
    @classmethod
    def limit_points(cls, v: list) -> list:
        return v[:80]


# ── Muscle Balance (Radar) ──────────────────────────────────────────────────


class MuscleBalanceAxis(BaseModel):
    """One axis of the radar: a muscle group or movement pattern."""
    label: str = Field(..., min_length=1, max_length=40)
    user_value: float = Field(..., ge=0)
    target_value: float = Field(..., ge=0)
    flag: Optional[Literal["under", "over", "balanced"]] = None


class MuscleBalanceData(BaseModel):
    """Structured payload for the muscle_balance response type."""
    title: str = Field(..., min_length=1, max_length=100)
    period_label: Optional[str] = Field(default=None, max_length=40)
    unit: str = Field(default="sets", max_length=10)
    axes: List[MuscleBalanceAxis] = Field(..., min_length=3)
    summary: Optional[str] = Field(default=None, max_length=280)

    @field_validator("axes")
    @classmethod
    def limit_axes(cls, v: list) -> list:
        if len(v) < 3:
            raise ValueError("radar needs at least 3 axes")
        return v[:8]


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
