"""
Tests for core/workout_analyzer.py — fallback behavior and sanitize usage.

We do NOT invoke Gemini. We test:
  1. The fallback WorkoutAnalysis returned when any exception is raised
     (covers the except branch without needing a live AI model).
  2. That the module uses sanitize from text_utils (not a local _sanitize).
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# ------------------------------------------------------------------
# Stub vertexai at the sys.modules level before importing the analyzer.
# The module imports GenerativeModel and GenerationConfig at import time;
# without this stub the entire module fails to load in the test environment
# (vertexai is a Google Cloud dependency not installed locally).
# ------------------------------------------------------------------
from unittest.mock import MagicMock

_vertexai_mock = MagicMock()
sys.modules.setdefault("vertexai", _vertexai_mock)
sys.modules.setdefault("vertexai.generative_models", _vertexai_mock.generative_models)

import pytest
from unittest.mock import patch, AsyncMock

from models.schemas import WorkoutLogPayload, WorkoutExercisePayload, UserContext, WorkoutAnalysis


class TestWorkoutAnalyzerFallback:
    """Test the except-branch fallback in analyze_workout."""

    @pytest.mark.anyio
    async def test_fallback_returned_on_gemini_failure(self):
        """When Gemini raises any exception, a generic WorkoutAnalysis is returned."""
        import core.workout_analyzer as analyzer_module

        workout = WorkoutLogPayload(
            workoutName="Push Day",
            totalVolume=12000,
            prsHit=0,
        )
        context = UserContext(uid="test-uid")

        with patch.object(
            analyzer_module,
            "GenerativeModel",
            side_effect=Exception("Vertex AI unavailable"),
        ):
            result = await analyzer_module.analyze_workout("test-uid", workout, context)

        assert isinstance(result, WorkoutAnalysis)
        assert result.sentiment == "positive"
        assert "Push Day" in result.insight
        assert "12,000" in result.insight
        assert result.highlights == ["Workout completed"]
        assert result.recommendations == []

    @pytest.mark.anyio
    async def test_fallback_mentions_prs_when_present(self):
        """Fallback message includes PR count when prsHit > 0."""
        import core.workout_analyzer as analyzer_module

        workout = WorkoutLogPayload(
            workoutName="Leg Day",
            totalVolume=20000,
            prsHit=2,
        )
        context = UserContext(uid="test-uid")

        with patch.object(
            analyzer_module,
            "GenerativeModel",
            side_effect=RuntimeError("timeout"),
        ):
            result = await analyzer_module.analyze_workout("test-uid", workout, context)

        assert "2 PRs" in result.insight

    @pytest.mark.anyio
    async def test_fallback_single_pr_grammatically_correct(self):
        """Fallback uses 'PR' (not 'PRs') for a single personal record."""
        import core.workout_analyzer as analyzer_module

        workout = WorkoutLogPayload(
            workoutName="Deadlift Day",
            totalVolume=5000,
            prsHit=1,
        )
        context = UserContext(uid="test-uid")

        with patch.object(
            analyzer_module,
            "GenerativeModel",
            side_effect=Exception("error"),
        ):
            result = await analyzer_module.analyze_workout("test-uid", workout, context)

        assert "1 PR" in result.insight
        assert "1 PRs" not in result.insight

    @pytest.mark.anyio
    async def test_fallback_no_prs_no_pr_text(self):
        """Fallback omits PR text entirely when prsHit is 0."""
        import core.workout_analyzer as analyzer_module

        workout = WorkoutLogPayload(workoutName="Cardio", totalVolume=0, prsHit=0)
        context = UserContext(uid="test-uid")

        with patch.object(
            analyzer_module,
            "GenerativeModel",
            side_effect=Exception("error"),
        ):
            result = await analyzer_module.analyze_workout("test-uid", workout, context)

        assert "PR" not in result.insight

    @pytest.mark.anyio
    async def test_fallback_workout_name_sanitized(self):
        """Workout name with newlines is sanitized in the fallback insight."""
        import core.workout_analyzer as analyzer_module

        workout = WorkoutLogPayload(
            workoutName="Push\nDay",
            totalVolume=1000,
            prsHit=0,
        )
        context = UserContext(uid="test-uid")

        with patch.object(
            analyzer_module,
            "GenerativeModel",
            side_effect=Exception("error"),
        ):
            result = await analyzer_module.analyze_workout("test-uid", workout, context)

        assert "\n" not in result.insight

    @pytest.mark.anyio
    async def test_timeout_exception_triggers_fallback(self):
        """asyncio.TimeoutError is caught by the broad except and returns fallback."""
        import asyncio
        import core.workout_analyzer as analyzer_module

        workout = WorkoutLogPayload(workoutName="Arms", totalVolume=3000, prsHit=0)
        context = UserContext(uid="test-uid")

        mock_model = AsyncMock()
        mock_model.generate_content_async.side_effect = asyncio.TimeoutError()

        with patch.object(analyzer_module, "GenerativeModel", return_value=mock_model):
            result = await analyzer_module.analyze_workout("test-uid", workout, context)

        assert isinstance(result, WorkoutAnalysis)
        assert result.sentiment == "positive"


class TestWorkoutAnalyzerUsesSanitize:
    """Verify the module imports sanitize from text_utils (no local _sanitize)."""

    def test_no_local_sanitize_function(self):
        """The analyzer module should not define its own _sanitize function."""
        import core.workout_analyzer as analyzer_module
        assert not hasattr(analyzer_module, "_sanitize"), (
            "core/workout_analyzer.py should use sanitize from text_utils, "
            "not define its own _sanitize function"
        )

    def test_imports_sanitize_from_text_utils(self):
        """The sanitize name in the analyzer module is the one from text_utils."""
        import core.workout_analyzer as analyzer_module
        import core.text_utils as text_utils_module
        assert analyzer_module.sanitize is text_utils_module.sanitize
