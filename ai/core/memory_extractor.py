"""
Extracts coach memories from workout data.
These are data-driven observations (not AI-generated) that feed into future prompts.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from context.conversation_memory import save_coach_memory
from core.text_utils import sanitize
from models.schemas import WorkoutLogPayload

logger = logging.getLogger(__name__)

# Memory expiration periods by type
EXPIRATION_DAYS = {
    "workout_pattern": 30,
    "progress_milestone": 90,
    "plateau_detected": 30,
    "recovery_concern": 14,
    "consistency": 14,
}


async def extract_workout_memories(
    uid: str,
    workout_data: WorkoutLogPayload,
    analysis_sentiment: str,
) -> None:
    """
    Extract data-driven observations from a completed workout.
    Saves them as coach memories with expiration dates.
    Best-effort — failures are logged and swallowed.
    """
    try:
        memories = _detect_patterns(workout_data, analysis_sentiment)
        for mem_type, content in memories:
            expires_days = EXPIRATION_DAYS.get(mem_type, 30)
            expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)
            await save_coach_memory(
                uid=uid,
                memory_type=mem_type,
                content=content,
                source="workout_data",
                expires_at=expires_at,
            )
    except Exception as e:
        logger.error(f"Memory extraction failed for {uid[:8]}: {type(e).__name__}")


def _detect_patterns(
    workout: WorkoutLogPayload,
    sentiment: str,
) -> list[tuple[str, str]]:
    """
    Analyze workout data for notable patterns.
    Returns list of (memory_type, content) tuples.
    """
    memories: list[tuple[str, str]] = []
    wname = sanitize(workout.workoutName, 50)

    # PR celebrations
    if workout.prsHit > 0:
        pr_exercises = []
        for ex in workout.exercises:
            if any(s.get("isPR") for s in ex.sets if s.get("completed")):
                pr_exercises.append(sanitize(ex.exerciseName, 50))
        if pr_exercises:
            exercises_str = ", ".join(pr_exercises[:3])
            memories.append((
                "progress_milestone",
                f"Hit PR(s) on {exercises_str} during {wname}",
            ))

    # High volume workout (threshold assumes lbs)
    if workout.totalVolume > 20000:
        memories.append((
            "workout_pattern",
            f"High volume session: {workout.totalVolume:,.0f} lbs in {wname}",
        ))

    # Short workout (might indicate rushing or time constraints)
    if workout.durationMinutes > 0 and workout.durationMinutes < 20 and workout.totalSets > 5:
        memories.append((
            "workout_pattern",
            f"Quick session ({workout.durationMinutes}min) with {workout.totalSets} sets — possible time constraints",
        ))

    # High perceived difficulty
    if workout.perceivedDifficulty and workout.perceivedDifficulty >= 9:
        memories.append((
            "recovery_concern",
            f"Rated {wname} at {workout.perceivedDifficulty}/10 difficulty — may need recovery",
        ))

    # Low mood after workout
    if workout.mood and workout.mood in ("tired", "exhausted"):
        memories.append((
            "recovery_concern",
            f"Felt {workout.mood} after {wname}",
        ))

    # Skipped exercises
    if workout.exercisesSkipped > 0 and workout.exercisesCompleted > 0:
        skip_rate = workout.exercisesSkipped / (workout.exercisesCompleted + workout.exercisesSkipped)
        if skip_rate >= 0.3:
            memories.append((
                "workout_pattern",
                f"Skipped {workout.exercisesSkipped} of {workout.exercisesCompleted + workout.exercisesSkipped} "
                f"exercises in {wname}",
            ))

    # Needs attention from AI analysis
    if sentiment == "needs_attention":
        memories.append((
            "workout_pattern",
            f"Coach flagged {wname} as needing attention",
        ))

    return memories
