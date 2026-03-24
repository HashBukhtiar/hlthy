"""
Tests for Pydantic schema validation in models/schemas.py.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from pydantic import ValidationError
from models.schemas import (
    ChatRequest,
    AIProfile,
    RecentWorkout,
    ExerciseStats,
    CoachMemory,
    UserContext,
    HealthResponse,
    SSETokenEvent,
    SSEStructuredEvent,
    SSEDoneEvent,
    SSEErrorEvent,
)


class TestChatRequest:
    def test_valid_request(self):
        req = ChatRequest(message="How do I bench press?", conversation_id="conv-123")
        assert req.message == "How do I bench press?"
        assert req.conversation_id == "conv-123"

    def test_empty_message_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            ChatRequest(message="", conversation_id="conv-123")
        errors = exc_info.value.errors()
        assert any("message" in str(e) for e in errors)

    def test_message_too_long_rejected(self):
        with pytest.raises(ValidationError):
            ChatRequest(message="x" * 5001, conversation_id="conv-123")

    def test_message_at_max_length_accepted(self):
        req = ChatRequest(message="x" * 5000, conversation_id="conv-123")
        assert len(req.message) == 5000

    def test_empty_conversation_id_rejected(self):
        with pytest.raises(ValidationError):
            ChatRequest(message="Hello", conversation_id="")

    def test_missing_message_rejected(self):
        with pytest.raises(ValidationError):
            ChatRequest(conversation_id="conv-123")

    def test_missing_conversation_id_rejected(self):
        with pytest.raises(ValidationError):
            ChatRequest(message="Hello")


class TestAIProfile:
    def test_defaults_are_empty(self):
        profile = AIProfile()
        assert profile.experience_level is None
        assert profile.goals == []
        assert profile.training_frequency is None
        assert profile.injuries == []
        assert profile.equipment == []
        assert profile.dislikes == []
        assert profile.archetype is None

    def test_full_profile(self):
        profile = AIProfile(
            experience_level="advanced",
            goals=["strength", "hypertrophy"],
            training_frequency=5,
            injuries=["left shoulder"],
            equipment=["barbell", "rack"],
            dislikes=["cardio"],
            archetype="powerlifter",
        )
        assert profile.experience_level == "advanced"
        assert len(profile.goals) == 2
        assert profile.training_frequency == 5


class TestRecentWorkout:
    def test_defaults(self):
        w = RecentWorkout(date="2026-03-20", name="Leg Day")
        assert w.total_volume == 0
        assert w.prs_hit == 0
        assert w.duration_minutes == 0
        assert w.mood is None
        assert w.exercises == []

    def test_full_workout(self):
        w = RecentWorkout(
            date="2026-03-20",
            name="Push Day",
            total_volume=12500.5,
            prs_hit=3,
            duration_minutes=60,
            mood="great",
            exercises=["Bench Press", "OHP"],
        )
        assert w.total_volume == 12500.5
        assert w.prs_hit == 3


class TestExerciseStats:
    def test_defaults(self):
        stats = ExerciseStats()
        assert stats.pr_weight == 0
        assert stats.pr_reps == 0
        assert stats.pr_1rm == 0
        assert stats.last_weight == 0
        assert stats.last_reps == 0
        assert stats.total_sessions == 0
        assert stats.trend == "stable"

    def test_trend_values(self):
        for trend in ["improving", "declining", "stable", "new"]:
            stats = ExerciseStats(trend=trend)
            assert stats.trend == trend


class TestCoachMemory:
    def test_required_fields(self):
        mem = CoachMemory(type="injury", content="Bad left knee")
        assert mem.type == "injury"
        assert mem.content == "Bad left knee"
        assert mem.source == "conversation"  # default

    def test_custom_source(self):
        mem = CoachMemory(type="goal_change", content="Wants to cut weight", source="ai_extracted")
        assert mem.source == "ai_extracted"

    def test_missing_type_rejected(self):
        with pytest.raises(ValidationError):
            CoachMemory(content="Some content")

    def test_missing_content_rejected(self):
        with pytest.raises(ValidationError):
            CoachMemory(type="preference")


class TestUserContext:
    def test_minimal_context(self):
        ctx = UserContext(uid="user-123")
        assert ctx.uid == "user-123"
        assert ctx.display_name is None
        assert ctx.recent_workouts == []
        assert ctx.exercise_stats == {}
        assert ctx.recent_prs == []
        assert ctx.workout_streak == 0
        assert ctx.coach_memories == []
        assert ctx.conversation_history == []

    def test_missing_uid_rejected(self):
        with pytest.raises(ValidationError):
            UserContext()

    def test_profile_defaults_to_empty(self):
        ctx = UserContext(uid="user-abc")
        assert isinstance(ctx.profile, AIProfile)
        assert ctx.profile.goals == []


class TestSSEEventModels:
    def test_token_event(self):
        event = SSETokenEvent(text="Hello ")
        assert event.text == "Hello "

    def test_structured_event(self):
        event = SSEStructuredEvent(type="workout_plan", data={"name": "Push Day"})
        assert event.type == "workout_plan"
        assert event.data["name"] == "Push Day"

    def test_done_event_no_message_id(self):
        event = SSEDoneEvent()
        assert event.message_id is None

    def test_done_event_with_message_id(self):
        event = SSEDoneEvent(message_id="msg-42")
        assert event.message_id == "msg-42"

    def test_error_event(self):
        event = SSEErrorEvent(message="Something went wrong")
        assert event.message == "Something went wrong"


class TestHealthResponse:
    def test_valid(self):
        resp = HealthResponse(
            status="healthy",
            version="3.0",
            model="gemini-2.5-flash-preview-05-20",
            systems={"vertex_ai": True, "firestore": True},
        )
        assert resp.status == "healthy"
        assert resp.systems["vertex_ai"] is True
