"""
Tests for the new Pydantic models added in Phase 2:
  - WorkoutExercisePayload
  - WorkoutLogPayload
  - AnalyzeWorkoutRequest
  - WeeklySummaryRequest
  - WorkoutAnalysis
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from pydantic import ValidationError
from models.schemas import (
    WorkoutExercisePayload,
    WorkoutLogPayload,
    AnalyzeWorkoutRequest,
    WeeklySummaryRequest,
    WorkoutAnalysis,
)


# ── WorkoutExercisePayload ────────────────────────────────────────────────────

class TestWorkoutExercisePayload:
    def test_defaults(self):
        ex = WorkoutExercisePayload()
        assert ex.exerciseName == ""
        assert ex.skipped is False
        assert ex.sets == []

    def test_full_exercise(self):
        ex = WorkoutExercisePayload(
            exerciseName="Bench Press",
            skipped=False,
            sets=[{"completed": True, "weight": 225, "reps": 3}],
        )
        assert ex.exerciseName == "Bench Press"
        assert len(ex.sets) == 1

    def test_exercise_name_max_length_accepted(self):
        ex = WorkoutExercisePayload(exerciseName="A" * 100)
        assert len(ex.exerciseName) == 100

    def test_exercise_name_too_long_rejected(self):
        with pytest.raises(ValidationError):
            WorkoutExercisePayload(exerciseName="A" * 101)

    def test_sets_capped_at_20(self):
        sets = [{"completed": True, "weight": 100, "reps": 5}] * 25
        ex = WorkoutExercisePayload(sets=sets)
        assert len(ex.sets) == 20

    def test_sets_exactly_20_not_truncated(self):
        sets = [{"completed": True}] * 20
        ex = WorkoutExercisePayload(sets=sets)
        assert len(ex.sets) == 20

    def test_sets_below_20_not_truncated(self):
        sets = [{"completed": True}] * 5
        ex = WorkoutExercisePayload(sets=sets)
        assert len(ex.sets) == 5

    def test_skipped_flag(self):
        ex = WorkoutExercisePayload(skipped=True)
        assert ex.skipped is True


# ── WorkoutLogPayload ─────────────────────────────────────────────────────────

class TestWorkoutLogPayload:
    def test_defaults(self):
        log = WorkoutLogPayload()
        assert log.workoutName == "Workout"
        assert log.durationMinutes == 0
        assert log.totalVolume == 0
        assert log.totalSets == 0
        assert log.totalReps == 0
        assert log.exercisesCompleted == 0
        assert log.exercisesSkipped == 0
        assert log.prsHit == 0
        assert log.mood is None
        assert log.perceivedDifficulty is None
        assert log.exercises == []

    def test_full_payload(self):
        log = WorkoutLogPayload(
            workoutName="Push Day",
            durationMinutes=60,
            totalVolume=15000.5,
            totalSets=20,
            totalReps=160,
            exercisesCompleted=5,
            exercisesSkipped=1,
            prsHit=2,
            mood="great",
            perceivedDifficulty=8,
            exercises=[WorkoutExercisePayload(exerciseName="Bench Press")],
        )
        assert log.workoutName == "Push Day"
        assert log.totalVolume == 15000.5
        assert log.prsHit == 2
        assert len(log.exercises) == 1

    def test_workout_name_max_length_accepted(self):
        log = WorkoutLogPayload(workoutName="A" * 100)
        assert len(log.workoutName) == 100

    def test_workout_name_too_long_rejected(self):
        with pytest.raises(ValidationError):
            WorkoutLogPayload(workoutName="A" * 101)

    def test_duration_max_accepted(self):
        log = WorkoutLogPayload(durationMinutes=600)
        assert log.durationMinutes == 600

    def test_duration_too_high_rejected(self):
        with pytest.raises(ValidationError):
            WorkoutLogPayload(durationMinutes=601)

    def test_duration_negative_rejected(self):
        with pytest.raises(ValidationError):
            WorkoutLogPayload(durationMinutes=-1)

    def test_total_volume_negative_rejected(self):
        with pytest.raises(ValidationError):
            WorkoutLogPayload(totalVolume=-0.1)

    def test_total_sets_max_accepted(self):
        log = WorkoutLogPayload(totalSets=500)
        assert log.totalSets == 500

    def test_total_sets_too_high_rejected(self):
        with pytest.raises(ValidationError):
            WorkoutLogPayload(totalSets=501)

    def test_total_reps_max_accepted(self):
        log = WorkoutLogPayload(totalReps=5000)
        assert log.totalReps == 5000

    def test_total_reps_too_high_rejected(self):
        with pytest.raises(ValidationError):
            WorkoutLogPayload(totalReps=5001)

    def test_exercises_completed_max_accepted(self):
        log = WorkoutLogPayload(exercisesCompleted=50)
        assert log.exercisesCompleted == 50

    def test_exercises_completed_too_high_rejected(self):
        with pytest.raises(ValidationError):
            WorkoutLogPayload(exercisesCompleted=51)

    def test_exercises_skipped_max_accepted(self):
        log = WorkoutLogPayload(exercisesSkipped=50)
        assert log.exercisesSkipped == 50

    def test_exercises_skipped_too_high_rejected(self):
        with pytest.raises(ValidationError):
            WorkoutLogPayload(exercisesSkipped=51)

    def test_prs_hit_max_accepted(self):
        log = WorkoutLogPayload(prsHit=50)
        assert log.prsHit == 50

    def test_prs_hit_too_high_rejected(self):
        with pytest.raises(ValidationError):
            WorkoutLogPayload(prsHit=51)

    def test_mood_max_length_accepted(self):
        log = WorkoutLogPayload(mood="A" * 20)
        assert len(log.mood) == 20

    def test_mood_too_long_rejected(self):
        with pytest.raises(ValidationError):
            WorkoutLogPayload(mood="A" * 21)

    def test_perceived_difficulty_min_accepted(self):
        log = WorkoutLogPayload(perceivedDifficulty=1)
        assert log.perceivedDifficulty == 1

    def test_perceived_difficulty_below_min_rejected(self):
        with pytest.raises(ValidationError):
            WorkoutLogPayload(perceivedDifficulty=0)

    def test_perceived_difficulty_max_accepted(self):
        log = WorkoutLogPayload(perceivedDifficulty=10)
        assert log.perceivedDifficulty == 10

    def test_perceived_difficulty_above_max_rejected(self):
        with pytest.raises(ValidationError):
            WorkoutLogPayload(perceivedDifficulty=11)

    def test_exercises_capped_at_20(self):
        exercises = [WorkoutExercisePayload(exerciseName=f"Ex {i}") for i in range(25)]
        log = WorkoutLogPayload(exercises=exercises)
        assert len(log.exercises) == 20

    def test_exercises_below_20_not_truncated(self):
        exercises = [WorkoutExercisePayload(exerciseName=f"Ex {i}") for i in range(5)]
        log = WorkoutLogPayload(exercises=exercises)
        assert len(log.exercises) == 5


# ── AnalyzeWorkoutRequest ─────────────────────────────────────────────────────

class TestAnalyzeWorkoutRequest:
    def test_valid_request(self):
        req = AnalyzeWorkoutRequest(
            uid="user-abc",
            workout_log=WorkoutLogPayload(workoutName="Push Day"),
        )
        assert req.uid == "user-abc"
        assert req.workout_log.workoutName == "Push Day"

    def test_missing_uid_rejected(self):
        with pytest.raises(ValidationError):
            AnalyzeWorkoutRequest(workout_log=WorkoutLogPayload())

    def test_empty_uid_rejected(self):
        with pytest.raises(ValidationError):
            AnalyzeWorkoutRequest(uid="", workout_log=WorkoutLogPayload())

    def test_uid_max_length_accepted(self):
        req = AnalyzeWorkoutRequest(uid="u" * 128, workout_log=WorkoutLogPayload())
        assert len(req.uid) == 128

    def test_uid_too_long_rejected(self):
        with pytest.raises(ValidationError):
            AnalyzeWorkoutRequest(uid="u" * 129, workout_log=WorkoutLogPayload())

    def test_missing_workout_log_rejected(self):
        with pytest.raises(ValidationError):
            AnalyzeWorkoutRequest(uid="user-123")

    def test_workout_log_is_workout_log_payload_type(self):
        req = AnalyzeWorkoutRequest(
            uid="user-123",
            workout_log=WorkoutLogPayload(durationMinutes=45),
        )
        assert isinstance(req.workout_log, WorkoutLogPayload)
        assert req.workout_log.durationMinutes == 45


# ── WeeklySummaryRequest ──────────────────────────────────────────────────────

class TestWeeklySummaryRequest:
    def test_valid_request(self):
        req = WeeklySummaryRequest(uid="user-xyz")
        assert req.uid == "user-xyz"

    def test_missing_uid_rejected(self):
        with pytest.raises(ValidationError):
            WeeklySummaryRequest()

    def test_empty_uid_rejected(self):
        with pytest.raises(ValidationError):
            WeeklySummaryRequest(uid="")

    def test_uid_max_length_accepted(self):
        req = WeeklySummaryRequest(uid="u" * 128)
        assert len(req.uid) == 128

    def test_uid_too_long_rejected(self):
        with pytest.raises(ValidationError):
            WeeklySummaryRequest(uid="u" * 129)


# ── WorkoutAnalysis ───────────────────────────────────────────────────────────

class TestWorkoutAnalysis:
    def test_defaults(self):
        analysis = WorkoutAnalysis(insight="Great session!")
        assert analysis.insight == "Great session!"
        assert analysis.highlights == []
        assert analysis.recommendations == []
        assert analysis.sentiment == "positive"

    def test_positive_sentiment(self):
        analysis = WorkoutAnalysis(insight="Great!", sentiment="positive")
        assert analysis.sentiment == "positive"

    def test_neutral_sentiment(self):
        analysis = WorkoutAnalysis(insight="OK workout.", sentiment="neutral")
        assert analysis.sentiment == "neutral"

    def test_needs_attention_sentiment(self):
        analysis = WorkoutAnalysis(insight="Rest up.", sentiment="needs_attention")
        assert analysis.sentiment == "needs_attention"

    def test_invalid_sentiment_rejected(self):
        with pytest.raises(ValidationError):
            WorkoutAnalysis(insight="Test", sentiment="bad_value")

    def test_full_analysis(self):
        analysis = WorkoutAnalysis(
            insight="You crushed it today! Volume was up 15% and you hit a new Bench PR.",
            highlights=["New Bench Press PR: 225lbs", "High volume session"],
            recommendations=["Add 5lbs to Squat next session", "Prioritize sleep tonight"],
            sentiment="positive",
        )
        assert len(analysis.highlights) == 2
        assert len(analysis.recommendations) == 2
        assert "PR" in analysis.insight

    def test_missing_insight_rejected(self):
        with pytest.raises(ValidationError):
            WorkoutAnalysis()

    def test_empty_lists_are_valid(self):
        analysis = WorkoutAnalysis(
            insight="Solid session.",
            highlights=[],
            recommendations=[],
        )
        assert analysis.highlights == []
        assert analysis.recommendations == []
