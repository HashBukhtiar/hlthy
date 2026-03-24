"""Tests for the coach prompt builder."""
import sys
import os

# Add ai directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.prompt_builder import build_system_prompt, _format_client_file
from models.schemas import (
    UserContext, AIProfile, RecentWorkout, ExerciseStats, CoachMemory,
)


def _make_context(**overrides) -> UserContext:
    defaults = {
        "uid": "test-user-123",
        "display_name": "TestUser",
        "profile": AIProfile(),
    }
    defaults.update(overrides)
    return UserContext(**defaults)


class TestFormatClientFile:
    def test_new_user_shows_welcome(self):
        ctx = _make_context(display_name="NewUser")
        result = _format_client_file(ctx)
        assert "NewUser" in result
        assert "New user" in result or "no profile data" in result.lower()

    def test_populated_profile(self):
        ctx = _make_context(
            display_name="JohnDoe",
            profile=AIProfile(
                experience_level="intermediate",
                goals=["build_muscle", "get_stronger"],
                training_frequency=4,
                injuries=["left_knee"],
                equipment=["barbell", "dumbbells"],
                dislikes=["burpees"],
                archetype="powerlifter",
            ),
            workout_streak=12,
        )
        result = _format_client_file(ctx)
        assert "JohnDoe" in result
        assert "intermediate" in result
        assert "build_muscle" in result
        assert "4 days/week" in result
        assert "left_knee" in result
        assert "barbell" in result
        assert "burpees" in result
        assert "powerlifter" in result
        assert "12 workouts" in result

    def test_recent_workouts_formatted(self):
        ctx = _make_context(
            recent_workouts=[
                RecentWorkout(
                    date="2026-03-20",
                    name="Push Day",
                    total_volume=15000,
                    prs_hit=2,
                    duration_minutes=55,
                    mood="energized",
                    exercises=["Bench Press", "OHP", "Tricep Pushdown"],
                ),
            ],
        )
        result = _format_client_file(ctx)
        assert "Push Day" in result
        assert "15,000" in result
        assert "2 PRs" in result
        assert "energized" in result
        assert "Bench Press" in result

    def test_exercise_stats_formatted(self):
        ctx = _make_context(
            exercise_stats={
                "Bench Press": ExerciseStats(
                    pr_weight=225, pr_reps=3, pr_1rm=240,
                    last_weight=215, last_reps=5,
                    total_sessions=24, trend="improving",
                ),
            },
        )
        result = _format_client_file(ctx)
        assert "225" in result
        assert "improving" in result or "↑" in result

    def test_recent_prs_formatted(self):
        ctx = _make_context(
            recent_prs=["Bench Press: 225 lbs", "Squat: 315 lbs"],
        )
        result = _format_client_file(ctx)
        assert "225 lbs" in result
        assert "315 lbs" in result


class TestBuildSystemPrompt:
    def test_contains_identity(self):
        ctx = _make_context()
        prompt = build_system_prompt(ctx)
        assert "Coach" in prompt
        assert "fitness trainer" in prompt

    def test_contains_response_instructions(self):
        ctx = _make_context()
        prompt = build_system_prompt(ctx)
        assert "RESPONSE INSTRUCTIONS" in prompt

    def test_contains_client_file(self):
        ctx = _make_context(display_name="Alice")
        prompt = build_system_prompt(ctx)
        assert "Alice" in prompt
        assert "CLIENT FILE" in prompt

    def test_contains_coach_memories(self):
        ctx = _make_context(
            coach_memories=[
                CoachMemory(type="injury", content="Bad left knee from basketball"),
            ],
        )
        prompt = build_system_prompt(ctx)
        assert "Bad left knee" in prompt
        assert "COACH MEMORIES" in prompt

    def test_conversation_history_not_in_system_prompt(self):
        """Conversation history is passed as multi-turn content, not in the system prompt."""
        ctx = _make_context(
            conversation_history=[
                {"role": "user", "text": "I want to build muscle"},
                {"role": "model", "text": "Great goal! Let's start with your experience."},
            ],
        )
        prompt = build_system_prompt(ctx)
        assert "CONVERSATION HISTORY" not in prompt
        assert "build muscle" not in prompt


class TestResponseParser:
    def test_parse_workout_json_block(self):
        from core.response_parser import parse_streamed_text

        text = """Here's your workout!

```workout-json
{"name": "Push Day", "exercises": [{"name": "Bench Press"}]}
```

Let me know if you want changes!"""

        clean, structured = parse_streamed_text(text)
        assert structured is not None
        assert structured["type"] == "workout_plan"
        assert structured["data"]["name"] == "Push Day"
        assert "workout-json" not in clean
        assert "Let me know" in clean

    def test_no_structured_data(self):
        from core.response_parser import parse_streamed_text

        text = "Just a regular coaching response with no structured data."
        clean, structured = parse_streamed_text(text)
        assert structured is None
        assert clean == text

    def test_malformed_json_ignored(self):
        from core.response_parser import parse_streamed_text

        text = """Here's your plan:

```json
{not valid json}
```"""
        clean, structured = parse_streamed_text(text)
        assert structured is None
