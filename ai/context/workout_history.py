"""
Reads workout logs and exercise history from Firestore.
"""
from typing import Dict, List
from google.cloud import firestore

from models.schemas import RecentWorkout, ExerciseStats
from context.firestore_client import get_db


async def load_workout_history(uid: str, limit: int = 10) -> List[RecentWorkout]:
    """Load the user's most recent workout logs."""
    db = get_db()

    docs = await (
        db.collection("users").document(uid).collection("workout_logs")
        .order_by("completedAt", direction=firestore.Query.DESCENDING)
        .limit(limit)
        .get()
    )

    workouts = []
    for doc in docs:
        data = doc.to_dict() or {}
        exercises = []
        for ex in data.get("exercises", []):
            name = ex.get("exerciseName") or ex.get("name", "")
            if name:
                exercises.append(name)

        completed_at = data.get("completedAt")
        date_str = ""
        if completed_at:
            try:
                date_str = completed_at.strftime("%Y-%m-%d")
            except Exception:
                date_str = str(completed_at)

        workouts.append(RecentWorkout(
            date=date_str,
            name=data.get("workoutName", data.get("name", "Workout")),
            total_volume=data.get("totalVolume", 0),
            prs_hit=data.get("prsHit", 0),
            duration_minutes=data.get("durationMinutes", 0),
            mood=data.get("mood"),
            exercises=exercises,
        ))

    return workouts


async def load_exercise_stats(uid: str, limit: int = 15) -> Dict[str, ExerciseStats]:
    """Load exercise-specific performance history."""
    db = get_db()

    docs = await (
        db.collection("users").document(uid).collection("exercise_history")
        .order_by("lastPerformed", direction=firestore.Query.DESCENDING)
        .limit(limit)
        .get()
    )

    stats = {}
    for doc in docs:
        data = doc.to_dict() or {}
        exercise_name = data.get("exerciseName", doc.id)

        max_weight_data = data.get("maxWeight", {})
        max_reps_data = data.get("maxReps", {})

        stats[exercise_name] = ExerciseStats(
            pr_weight=max_weight_data.get("weight", 0) if isinstance(max_weight_data, dict) else 0,
            pr_reps=max_reps_data.get("reps", 0) if isinstance(max_reps_data, dict) else 0,
            pr_1rm=data.get("estimated1RM", 0),
            last_weight=data.get("lastWeight", 0),
            last_reps=data.get("lastReps", 0),
            total_sessions=data.get("timesPerformed", 0),
            trend=data.get("volumeTrend", "stable"),
        )

    return stats
