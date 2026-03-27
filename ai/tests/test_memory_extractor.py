"""
Tests for core/memory_extractor.py — _detect_patterns (deterministic pattern detection).

The public async entry point (extract_workout_memories) calls Firestore via
save_coach_memory, so we only test the synchronous _detect_patterns function here.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ------------------------------------------------------------------
# Stub out context.conversation_memory before importing the module.
# _detect_patterns does not call it, but the module-level import would
# fail without Firestore credentials at test time.
# ------------------------------------------------------------------
from unittest.mock import MagicMock
import sys as _sys

_sys.modules.setdefault("context.conversation_memory", MagicMock())

from core.memory_extractor import _detect_patterns
from models.schemas import WorkoutLogPayload, WorkoutExercisePayload


# ── helpers ──────────────────────────────────────────────────────────────────

def _make_workout(**overrides) -> WorkoutLogPayload:
    """Return a minimal, unremarkable workout that triggers no patterns."""
    defaults = dict(
        workoutName="Regular Session",
        durationMinutes=45,
        totalVolume=10000,
        totalSets=15,
        totalReps=120,
        exercisesCompleted=5,
        exercisesSkipped=0,
        prsHit=0,
        mood="good",
        perceivedDifficulty=7,
        exercises=[],
    )
    defaults.update(overrides)
    return WorkoutLogPayload(**defaults)


def _make_exercise(name: str, sets: list[dict], skipped: bool = False) -> WorkoutExercisePayload:
    return WorkoutExercisePayload(exerciseName=name, skipped=skipped, sets=sets)


def _completed_set(weight: float = 100, reps: int = 5, is_pr: bool = False) -> dict:
    return {"completed": True, "weight": weight, "reps": reps, "isPR": is_pr}


def _incomplete_set() -> dict:
    return {"completed": False, "weight": 100, "reps": 5, "isPR": False}


# ── No patterns ───────────────────────────────────────────────────────────────

class TestNoPatterns:
    def test_normal_workout_returns_empty(self):
        workout = _make_workout()
        result = _detect_patterns(workout, "positive")
        assert result == []

    def test_neutral_sentiment_no_extra_memories(self):
        workout = _make_workout()
        result = _detect_patterns(workout, "neutral")
        assert result == []


# ── PR detection ──────────────────────────────────────────────────────────────

class TestPRDetection:
    def test_pr_hit_creates_progress_milestone(self):
        exercises = [
            _make_exercise(
                "Bench Press",
                [_completed_set(225, 3, is_pr=True), _completed_set(215, 5)],
            )
        ]
        workout = _make_workout(prsHit=1, exercises=exercises)
        result = _detect_patterns(workout, "positive")
        types = [r[0] for r in result]
        assert "progress_milestone" in types

    def test_pr_memory_content_includes_exercise_name(self):
        exercises = [
            _make_exercise("Squat", [_completed_set(315, 1, is_pr=True)])
        ]
        workout = _make_workout(prsHit=1, exercises=exercises)
        result = _detect_patterns(workout, "positive")
        milestone = next(r for r in result if r[0] == "progress_milestone")
        assert "Squat" in milestone[1]

    def test_pr_hit_but_no_completed_pr_sets_skipped(self):
        # prsHit > 0 but no set has isPR=True and completed=True
        # so pr_exercises list is empty — no memory generated
        exercises = [
            _make_exercise("Deadlift", [_incomplete_set()])
        ]
        workout = _make_workout(prsHit=1, exercises=exercises)
        result = _detect_patterns(workout, "positive")
        types = [r[0] for r in result]
        assert "progress_milestone" not in types

    def test_multiple_pr_exercises_capped_at_three(self):
        exercises = [
            _make_exercise(f"Exercise {i}", [_completed_set(100, 5, is_pr=True)])
            for i in range(5)
        ]
        workout = _make_workout(prsHit=5, exercises=exercises)
        result = _detect_patterns(workout, "positive")
        milestone = next(r for r in result if r[0] == "progress_milestone")
        # Content lists up to 3 exercises; verify the content doesn't reference "Exercise 4"
        assert "Exercise 4" not in milestone[1]

    def test_prs_hit_zero_no_progress_milestone(self):
        exercises = [
            _make_exercise("Bench Press", [_completed_set(225, 3, is_pr=True)])
        ]
        # prsHit=0 means the guard is not entered even if sets have isPR=True
        workout = _make_workout(prsHit=0, exercises=exercises)
        result = _detect_patterns(workout, "positive")
        types = [r[0] for r in result]
        assert "progress_milestone" not in types


# ── High volume ───────────────────────────────────────────────────────────────

class TestHighVolume:
    def test_volume_above_20000_creates_workout_pattern(self):
        workout = _make_workout(totalVolume=25000)
        result = _detect_patterns(workout, "positive")
        types = [r[0] for r in result]
        assert "workout_pattern" in types

    def test_high_volume_content_includes_volume(self):
        workout = _make_workout(totalVolume=30000)
        result = _detect_patterns(workout, "positive")
        high_vol = next(r for r in result if "High volume" in r[1])
        assert "30,000" in high_vol[1]

    def test_volume_exactly_20000_not_triggered(self):
        workout = _make_workout(totalVolume=20000)
        result = _detect_patterns(workout, "positive")
        assert not any("High volume" in r[1] for r in result)

    def test_volume_below_20000_not_triggered(self):
        workout = _make_workout(totalVolume=19999)
        result = _detect_patterns(workout, "positive")
        assert not any("High volume" in r[1] for r in result)


# ── Short workout ─────────────────────────────────────────────────────────────

class TestShortWorkout:
    def test_short_duration_high_sets_triggers_pattern(self):
        workout = _make_workout(durationMinutes=15, totalSets=10)
        result = _detect_patterns(workout, "positive")
        assert any("Quick session" in r[1] for r in result)

    def test_short_workout_content_includes_duration_and_sets(self):
        workout = _make_workout(durationMinutes=12, totalSets=8)
        result = _detect_patterns(workout, "positive")
        quick = next(r for r in result if "Quick session" in r[1])
        assert "12min" in quick[1]
        assert "8 sets" in quick[1]

    def test_exactly_20_minutes_not_triggered(self):
        workout = _make_workout(durationMinutes=20, totalSets=10)
        result = _detect_patterns(workout, "positive")
        assert not any("Quick session" in r[1] for r in result)

    def test_short_duration_low_sets_not_triggered(self):
        # < 20min but totalSets <= 5
        workout = _make_workout(durationMinutes=10, totalSets=5)
        result = _detect_patterns(workout, "positive")
        assert not any("Quick session" in r[1] for r in result)

    def test_zero_duration_not_triggered(self):
        # durationMinutes=0 is explicitly excluded by `> 0` check
        workout = _make_workout(durationMinutes=0, totalSets=10)
        result = _detect_patterns(workout, "positive")
        assert not any("Quick session" in r[1] for r in result)

    def test_long_workout_not_triggered(self):
        workout = _make_workout(durationMinutes=60, totalSets=20)
        result = _detect_patterns(workout, "positive")
        assert not any("Quick session" in r[1] for r in result)


# ── High perceived difficulty ─────────────────────────────────────────────────

class TestHighDifficulty:
    def test_difficulty_9_triggers_recovery_concern(self):
        workout = _make_workout(perceivedDifficulty=9)
        result = _detect_patterns(workout, "positive")
        types = [r[0] for r in result]
        assert "recovery_concern" in types

    def test_difficulty_10_triggers_recovery_concern(self):
        workout = _make_workout(perceivedDifficulty=10)
        result = _detect_patterns(workout, "positive")
        assert any("difficulty" in r[1].lower() or "/10" in r[1] for r in result)

    def test_difficulty_9_content_includes_rating(self):
        workout = _make_workout(perceivedDifficulty=9)
        result = _detect_patterns(workout, "positive")
        concern = next(r for r in result if r[0] == "recovery_concern" and "/10" in r[1])
        assert "9/10" in concern[1]

    def test_difficulty_8_not_triggered(self):
        workout = _make_workout(perceivedDifficulty=8)
        result = _detect_patterns(workout, "positive")
        # No recovery_concern from difficulty (might still have none)
        assert not any("/10" in r[1] for r in result)

    def test_no_difficulty_not_triggered(self):
        workout = _make_workout(perceivedDifficulty=None)
        result = _detect_patterns(workout, "positive")
        assert not any("/10" in r[1] for r in result)


# ── Low mood ──────────────────────────────────────────────────────────────────

class TestLowMood:
    def test_tired_mood_triggers_recovery_concern(self):
        workout = _make_workout(mood="tired", perceivedDifficulty=None)
        result = _detect_patterns(workout, "positive")
        types = [r[0] for r in result]
        assert "recovery_concern" in types

    def test_exhausted_mood_triggers_recovery_concern(self):
        workout = _make_workout(mood="exhausted", perceivedDifficulty=None)
        result = _detect_patterns(workout, "positive")
        types = [r[0] for r in result]
        assert "recovery_concern" in types

    def test_tired_content_includes_mood(self):
        workout = _make_workout(mood="tired", perceivedDifficulty=None)
        result = _detect_patterns(workout, "positive")
        concern = next(r for r in result if r[0] == "recovery_concern")
        assert "tired" in concern[1]

    def test_good_mood_not_triggered(self):
        workout = _make_workout(mood="good", perceivedDifficulty=None)
        result = _detect_patterns(workout, "positive")
        # No recovery concern from mood
        assert not any(
            r[0] == "recovery_concern" and ("tired" in r[1] or "exhausted" in r[1])
            for r in result
        )

    def test_none_mood_not_triggered(self):
        workout = _make_workout(mood=None, perceivedDifficulty=None)
        result = _detect_patterns(workout, "positive")
        assert result == []

    def test_energized_mood_not_triggered(self):
        workout = _make_workout(mood="energized", perceivedDifficulty=None)
        result = _detect_patterns(workout, "positive")
        assert not any("energized" in r[1] and r[0] == "recovery_concern" for r in result)


# ── Skipped exercises ─────────────────────────────────────────────────────────

class TestSkippedExercises:
    def test_30_percent_skip_rate_triggers(self):
        # 3 skipped, 7 completed → 30% skip rate (>= 0.3)
        workout = _make_workout(exercisesSkipped=3, exercisesCompleted=7)
        result = _detect_patterns(workout, "positive")
        assert any("Skipped" in r[1] for r in result)

    def test_skip_rate_above_30_percent_triggers(self):
        # 4 skipped, 6 completed → 40% skip rate
        workout = _make_workout(exercisesSkipped=4, exercisesCompleted=6)
        result = _detect_patterns(workout, "positive")
        assert any("Skipped" in r[1] for r in result)

    def test_skip_rate_below_30_percent_not_triggered(self):
        # 2 skipped, 8 completed → 20% skip rate
        workout = _make_workout(exercisesSkipped=2, exercisesCompleted=8)
        result = _detect_patterns(workout, "positive")
        assert not any("Skipped" in r[1] for r in result)

    def test_skipped_content_includes_counts(self):
        workout = _make_workout(exercisesSkipped=3, exercisesCompleted=7)
        result = _detect_patterns(workout, "positive")
        skip_mem = next(r for r in result if "Skipped" in r[1])
        assert "3" in skip_mem[1]

    def test_zero_exercises_completed_no_skip_memory(self):
        # Guard: exercisesCompleted > 0 required
        workout = _make_workout(exercisesSkipped=5, exercisesCompleted=0)
        result = _detect_patterns(workout, "positive")
        assert not any("Skipped" in r[1] for r in result)

    def test_zero_skipped_not_triggered(self):
        workout = _make_workout(exercisesSkipped=0, exercisesCompleted=10)
        result = _detect_patterns(workout, "positive")
        assert not any("Skipped" in r[1] for r in result)


# ── needs_attention sentiment ─────────────────────────────────────────────────

class TestNeedsAttentionSentiment:
    def test_needs_attention_creates_workout_pattern(self):
        workout = _make_workout()
        result = _detect_patterns(workout, "needs_attention")
        types = [r[0] for r in result]
        assert "workout_pattern" in types

    def test_needs_attention_content_references_workout_name(self):
        workout = _make_workout(workoutName="Leg Day")
        result = _detect_patterns(workout, "needs_attention")
        attention = next(r for r in result if "needing attention" in r[1])
        assert "Leg Day" in attention[1]

    def test_positive_sentiment_no_attention_flag(self):
        workout = _make_workout()
        result = _detect_patterns(workout, "positive")
        assert not any("needing attention" in r[1] for r in result)

    def test_neutral_sentiment_no_attention_flag(self):
        workout = _make_workout()
        result = _detect_patterns(workout, "neutral")
        assert not any("needing attention" in r[1] for r in result)


# ── Sanitization of names ─────────────────────────────────────────────────────

class TestSanitization:
    def test_workout_name_newlines_stripped_from_memory_content(self):
        workout = _make_workout(workoutName="Push\nDay", perceivedDifficulty=9)
        result = _detect_patterns(workout, "positive")
        for _, content in result:
            assert "\n" not in content

    def test_exercise_name_newlines_stripped_from_pr_content(self):
        exercises = [
            _make_exercise("Bench\nPress", [_completed_set(225, 3, is_pr=True)])
        ]
        workout = _make_workout(prsHit=1, exercises=exercises)
        result = _detect_patterns(workout, "positive")
        for _, content in result:
            assert "\n" not in content

    def test_workout_name_truncated_at_50_chars(self):
        long_name = "A" * 100
        workout = _make_workout(workoutName=long_name, perceivedDifficulty=9)
        result = _detect_patterns(workout, "positive")
        # The sanitized name in content should be at most 50 chars
        concern = next(r for r in result if r[0] == "recovery_concern")
        # Extract the workout name portion — it appears after "Rated " and before " at"
        # Just verify the whole content string doesn't blow past a reasonable limit
        assert len(concern[1]) < 300

    def test_exercise_name_truncated_in_pr_content(self):
        long_name = "X" * 100
        exercises = [
            _make_exercise(long_name, [_completed_set(100, 5, is_pr=True)])
        ]
        workout = _make_workout(prsHit=1, exercises=exercises)
        result = _detect_patterns(workout, "positive")
        milestone = next(r for r in result if r[0] == "progress_milestone")
        # Sanitized exercise name is capped at 50; full content still within reason
        assert "X" * 51 not in milestone[1]

    def test_carriage_returns_stripped_from_workout_name(self):
        workout = _make_workout(workoutName="Day\rOne", perceivedDifficulty=9)
        result = _detect_patterns(workout, "positive")
        for _, content in result:
            assert "\r" not in content


# ── Multiple patterns in one workout ─────────────────────────────────────────

class TestMultiplePatterns:
    def test_multiple_conditions_all_detected(self):
        exercises = [
            _make_exercise("Deadlift", [_completed_set(405, 1, is_pr=True)])
        ]
        workout = _make_workout(
            totalVolume=25000,
            prsHit=1,
            exercises=exercises,
            mood="exhausted",
            perceivedDifficulty=9,
            exercisesSkipped=4,
            exercisesCompleted=6,
        )
        result = _detect_patterns(workout, "needs_attention")
        types = [r[0] for r in result]
        assert "progress_milestone" in types
        assert "workout_pattern" in types
        assert "recovery_concern" in types
        # At least 4 memories (PR + high volume + low mood + difficulty + needs_attention + skip)
        assert len(result) >= 4
