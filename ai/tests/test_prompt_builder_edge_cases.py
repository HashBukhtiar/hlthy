"""
Edge case tests for prompt_builder.py — truncation, long exercise lists, None values.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.prompt_builder import (
    build_system_prompt,
    _format_client_file,
    _format_coach_memories,
    _format_conversation_history,
)
from models.schemas import (
    UserContext, AIProfile, RecentWorkout, ExerciseStats, CoachMemory,
)


def _ctx(**overrides) -> UserContext:
    defaults = {"uid": "u1"}
    defaults.update(overrides)
    return UserContext(**defaults)


class TestFormatCoachMemories:
    def test_empty_memories_returns_empty_string(self):
        ctx = _ctx(coach_memories=[])
        result = _format_coach_memories(ctx)
        assert result == ""

    def test_single_memory_formatted(self):
        ctx = _ctx(
            coach_memories=[CoachMemory(type="injury", content="Bad left knee")]
        )
        result = _format_coach_memories(ctx)
        assert "COACH MEMORIES" in result
        assert "injury" in result
        assert "Bad left knee" in result

    def test_multiple_memories_all_present(self):
        ctx = _ctx(
            coach_memories=[
                CoachMemory(type="injury", content="Shoulder issue"),
                CoachMemory(type="preference", content="Prefers mornings"),
                CoachMemory(type="goal_change", content="Switched to cut"),
            ]
        )
        result = _format_coach_memories(ctx)
        assert "Shoulder issue" in result
        assert "Prefers mornings" in result
        assert "Switched to cut" in result


class TestFormatConversationHistory:
    def test_empty_history_shows_new_conversation(self):
        ctx = _ctx(conversation_history=[])
        result = _format_conversation_history(ctx)
        assert "New conversation" in result

    def test_user_role_displayed_as_client(self):
        ctx = _ctx(
            conversation_history=[{"role": "user", "text": "I want to bulk"}]
        )
        result = _format_conversation_history(ctx)
        assert "Client:" in result
        assert "I want to bulk" in result

    def test_model_role_displayed_as_coach(self):
        ctx = _ctx(
            conversation_history=[{"role": "model", "text": "Great goal!"}]
        )
        result = _format_conversation_history(ctx)
        assert "Coach:" in result
        assert "Great goal!" in result

    def test_long_message_truncated_to_300_chars(self):
        long_text = "A" * 400
        ctx = _ctx(
            conversation_history=[{"role": "user", "text": long_text}]
        )
        result = _format_conversation_history(ctx)
        # Truncated text should end with "..."
        assert "..." in result
        # The original 400-char text should not appear in full
        assert "A" * 400 not in result

    def test_short_message_not_truncated(self):
        text = "Short message under 300 chars."
        ctx = _ctx(
            conversation_history=[{"role": "user", "text": text}]
        )
        result = _format_conversation_history(ctx)
        assert text in result
        assert "..." not in result

    def test_message_exactly_300_chars_not_truncated(self):
        text = "B" * 300
        ctx = _ctx(
            conversation_history=[{"role": "user", "text": text}]
        )
        result = _format_conversation_history(ctx)
        assert "..." not in result


class TestFormatClientFileEdgeCases:
    def test_display_name_none_shows_new_client(self):
        ctx = _ctx(display_name=None)
        result = _format_client_file(ctx)
        assert "New Client" in result

    def test_workout_with_more_than_4_exercises_truncated(self):
        ctx = _ctx(
            recent_workouts=[
                RecentWorkout(
                    date="2026-03-01",
                    name="Full Body",
                    exercises=["Squat", "Bench", "Deadlift", "OHP", "Row", "Curl"],
                )
            ]
        )
        result = _format_client_file(ctx)
        # The first 4 are shown, +2 more referenced
        assert "+2 more" in result

    def test_workout_with_exactly_4_exercises_no_overflow(self):
        ctx = _ctx(
            recent_workouts=[
                RecentWorkout(
                    date="2026-03-01",
                    name="Full Body",
                    exercises=["Squat", "Bench", "Deadlift", "OHP"],
                )
            ]
        )
        result = _format_client_file(ctx)
        assert "more" not in result.split("Full Body")[1].split("\n")[0]

    def test_only_first_5_recent_workouts_shown(self):
        workouts = [
            RecentWorkout(date=f"2026-03-{i:02d}", name=f"Workout {i}")
            for i in range(1, 9)  # 8 workouts
        ]
        ctx = _ctx(recent_workouts=workouts)
        result = _format_client_file(ctx)
        assert "Workout 5" in result
        assert "Workout 6" not in result

    def test_only_first_5_recent_prs_shown(self):
        prs = [f"Exercise {i}: {i * 100} lbs" for i in range(1, 9)]  # 8 PRs
        ctx = _ctx(recent_prs=prs)
        result = _format_client_file(ctx)
        assert "Exercise 5" in result
        assert "Exercise 6" not in result

    def test_only_first_8_exercise_stats_shown(self):
        stats = {
            f"Exercise {i}": ExerciseStats(pr_weight=float(i * 10))
            for i in range(1, 12)  # 11 exercises
        }
        ctx = _ctx(exercise_stats=stats)
        result = _format_client_file(ctx)
        assert "Exercise 8" in result
        assert "Exercise 9" not in result

    def test_workout_with_no_prs_no_pr_text(self):
        ctx = _ctx(
            recent_workouts=[
                RecentWorkout(date="2026-03-01", name="Cardio", prs_hit=0)
            ]
        )
        result = _format_client_file(ctx)
        assert "PRs" not in result

    def test_workout_with_no_mood_no_mood_text(self):
        ctx = _ctx(
            recent_workouts=[
                RecentWorkout(date="2026-03-01", name="Cardio", mood=None)
            ]
        )
        result = _format_client_file(ctx)
        assert "felt" not in result

    def test_zero_streak_not_shown(self):
        ctx = _ctx(workout_streak=0)
        result = _format_client_file(ctx)
        assert "streak" not in result.lower()

    def test_positive_streak_shown(self):
        ctx = _ctx(workout_streak=7)
        result = _format_client_file(ctx)
        assert "7 workouts" in result

    def test_improving_trend_shows_up_arrow(self):
        ctx = _ctx(
            exercise_stats={
                "Bench Press": ExerciseStats(trend="improving")
            }
        )
        result = _format_client_file(ctx)
        assert "↑" in result

    def test_declining_trend_shows_down_arrow(self):
        ctx = _ctx(
            exercise_stats={
                "Squat": ExerciseStats(trend="declining")
            }
        )
        result = _format_client_file(ctx)
        assert "↓" in result

    def test_new_trend_shows_star(self):
        ctx = _ctx(
            exercise_stats={
                "New Exercise": ExerciseStats(trend="new")
            }
        )
        result = _format_client_file(ctx)
        assert "★" in result


class TestBuildSystemPromptStructure:
    def test_all_sections_present_with_full_context(self):
        ctx = _ctx(
            display_name="Alex",
            profile=AIProfile(experience_level="intermediate"),
            coach_memories=[CoachMemory(type="preference", content="Likes AM workouts")],
            conversation_history=[{"role": "user", "text": "Hey coach"}],
        )
        prompt = build_system_prompt(ctx)
        assert "CLIENT FILE" in prompt
        assert "COACH MEMORIES" in prompt
        assert "CONVERSATION HISTORY" in prompt
        assert "RESPONSE INSTRUCTIONS" in prompt

    def test_no_memories_section_omitted(self):
        ctx = _ctx(coach_memories=[])
        prompt = build_system_prompt(ctx)
        assert "COACH MEMORIES" not in prompt
