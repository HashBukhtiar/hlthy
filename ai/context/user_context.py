"""
Reads user profile and coach memory from Firestore.
"""
import asyncio
import logging
from datetime import datetime, timezone

from google.cloud import firestore

from models.schemas import AIProfile, CoachMemory, UserContext
from context.firestore_client import get_db

logger = logging.getLogger(__name__)


async def load_user_context(uid: str, conversation_id: str) -> UserContext:
    """
    Assemble full user context from Firestore for the coach prompt.
    Reads in parallel: user profile, AI profile, coach memories, conversation history.
    """
    from context.workout_history import load_workout_history, load_exercise_stats
    from context.conversation_memory import load_conversation_history

    db = get_db()

    # Read all sources in parallel
    (
        user_doc,
        ai_profile_doc,
        memories_snap,
        recent_workouts,
        exercise_stats,
        conversation,
    ) = await asyncio.gather(
        db.collection("users").document(uid).get(),
        db.collection("users").document(uid).collection("ai_profile").document("profile").get(),
        db.collection("users").document(uid).collection("coach_memory")
            .order_by("extracted_at", direction=firestore.Query.DESCENDING)
            .limit(20)
            .get(),
        load_workout_history(uid),
        load_exercise_stats(uid),
        load_conversation_history(uid, conversation_id),
    )

    display_name, profile, workout_streak, recent_prs = _parse_profile(user_doc, ai_profile_doc)
    coach_memories = _parse_memories(memories_snap)

    return UserContext(
        uid=uid,
        display_name=display_name,
        profile=profile,
        recent_workouts=recent_workouts,
        exercise_stats=exercise_stats,
        recent_prs=recent_prs,
        workout_streak=workout_streak,
        coach_memories=coach_memories,
        conversation_history=conversation,
    )


def _parse_profile(
    user_doc, ai_profile_doc,
) -> tuple:
    """
    Parse user profile from Firestore documents.
    Returns (display_name, profile, workout_streak, recent_prs).
    """
    display_name = None
    profile = AIProfile()
    workout_streak = 0
    recent_prs: list[str] = []

    if user_doc.exists:
        user_data = user_doc.to_dict() or {}
        display_name = user_data.get("username") or user_data.get("displayName")
        workout_streak = user_data.get("currentStreak", 0)

        profile = AIProfile(
            experience_level=user_data.get("experienceLevel"),
            goals=user_data.get("fitnessGoals", []),
            training_frequency=user_data.get("workoutFrequency"),
            archetype=user_data.get("archetype"),
        )

        latest_prs = user_data.get("latestPRs", {})
        for exercise_id, pr_data in latest_prs.items():
            if isinstance(pr_data, dict):
                recent_prs.append(
                    f"{pr_data.get('exerciseName', exercise_id)}: "
                    f"{pr_data.get('value', '?')} {pr_data.get('unit', 'lbs')}"
                )

    if ai_profile_doc.exists:
        ai_data = ai_profile_doc.to_dict() or {}
        profile = AIProfile(
            experience_level=ai_data.get("experience_level") or profile.experience_level,
            goals=ai_data.get("goals") or profile.goals,
            training_frequency=ai_data.get("training_frequency") or profile.training_frequency,
            injuries=ai_data.get("injuries", []),
            equipment=ai_data.get("equipment", []),
            dislikes=ai_data.get("dislikes", []),
            archetype=ai_data.get("archetype") or profile.archetype,
        )

    return display_name, profile, workout_streak, recent_prs


def _parse_memories(memories_snap: list) -> list[CoachMemory]:
    """Parse coach memory documents, filtering out expired ones and cleaning up."""
    now = datetime.now(timezone.utc)
    memories = []
    expired_refs = []

    for mem_doc in memories_snap:
        mem_data = mem_doc.to_dict() or {}

        # Check expiration
        expires_at = mem_data.get("expires_at")
        if expires_at and hasattr(expires_at, "timestamp"):
            if datetime.fromtimestamp(expires_at.timestamp(), tz=timezone.utc) < now:
                expired_refs.append(mem_doc.reference)
                continue

        memories.append(CoachMemory(
            type=mem_data.get("type", "observation"),
            content=mem_data.get("content", ""),
            source=mem_data.get("source", "conversation"),
        ))

    # Fire-and-forget cleanup of expired memories
    if expired_refs:
        asyncio.create_task(_delete_expired_memories(expired_refs))

    return memories


async def _delete_expired_memories(refs: list) -> None:
    """Delete expired memory documents from Firestore."""
    try:
        db = get_db()
        for i in range(0, len(refs), 400):
            batch = db.batch()
            for ref in refs[i:i + 400]:
                batch.delete(ref)
            await batch.commit()
        logger.debug(f"Cleaned up {len(refs)} expired memories")
    except Exception as e:
        logger.error(f"Failed to clean up expired memories: {type(e).__name__}")


async def load_user_context_for_analysis(uid: str) -> UserContext:
    """
    Load user context for post-workout analysis.
    Same as load_user_context but skips conversation history (not needed for analysis).
    Saves a Firestore read and avoids loading irrelevant data.
    """
    from context.workout_history import load_workout_history, load_exercise_stats

    db = get_db()

    (
        user_doc,
        ai_profile_doc,
        memories_snap,
        recent_workouts,
        exercise_stats,
    ) = await asyncio.gather(
        db.collection("users").document(uid).get(),
        db.collection("users").document(uid).collection("ai_profile").document("profile").get(),
        db.collection("users").document(uid).collection("coach_memory")
            .order_by("extracted_at", direction=firestore.Query.DESCENDING)
            .limit(20)
            .get(),
        load_workout_history(uid),
        load_exercise_stats(uid),
    )

    display_name, profile, workout_streak, recent_prs = _parse_profile(user_doc, ai_profile_doc)
    coach_memories = _parse_memories(memories_snap)

    return UserContext(
        uid=uid,
        display_name=display_name,
        profile=profile,
        recent_workouts=recent_workouts,
        exercise_stats=exercise_stats,
        recent_prs=recent_prs,
        workout_streak=workout_streak,
        coach_memories=coach_memories,
        conversation_history=[],
    )
