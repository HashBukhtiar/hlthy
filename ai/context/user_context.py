"""
Reads user profile and coach memory from Firestore.
"""
import asyncio

from google.cloud import firestore

from models.schemas import AIProfile, CoachMemory, UserContext
from context.firestore_client import get_db


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

    # Parse user profile
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

    # Override with dedicated AI profile if it exists
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

    # Parse coach memories
    coach_memories = []
    for mem_doc in memories_snap:
        mem_data = mem_doc.to_dict() or {}
        coach_memories.append(CoachMemory(
            type=mem_data.get("type", "observation"),
            content=mem_data.get("content", ""),
            source=mem_data.get("source", "conversation"),
        ))

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

    # Reuse the same parsing logic
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

    coach_memories = []
    for mem_doc in memories_snap:
        mem_data = mem_doc.to_dict() or {}
        coach_memories.append(CoachMemory(
            type=mem_data.get("type", "observation"),
            content=mem_data.get("content", ""),
            source=mem_data.get("source", "conversation"),
        ))

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
