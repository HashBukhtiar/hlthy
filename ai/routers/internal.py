"""
Internal API endpoints — called by Cloud Functions, not by clients.
POST /api/internal/analyze-workout — generate post-workout insight + extract memories.
POST /api/internal/weekly-summary — generate weekly training summary.
"""
import asyncio
import logging

from fastapi import APIRouter, Depends

from middleware.internal_auth import verify_internal_auth
from models.schemas import (
    AnalyzeWorkoutRequest,
    WeeklySummaryRequest,
    WorkoutAnalysis,
)
from context.user_context import load_user_context_for_analysis
from core.workout_analyzer import analyze_workout
from core.weekly_analyzer import analyze_week
from core.memory_extractor import extract_workout_memories

logger = logging.getLogger(__name__)

router = APIRouter()

# Track background tasks to prevent GC before completion
_background_tasks: set[asyncio.Task] = set()


@router.post(
    "/internal/analyze-workout",
    response_model=WorkoutAnalysis,
    dependencies=[Depends(verify_internal_auth)],
)
async def analyze_workout_endpoint(body: AnalyzeWorkoutRequest):
    """
    Generate a post-workout analysis for the given user and workout log.
    Also extracts data-driven memories from the workout (non-blocking).
    Called by Cloud Functions after a workout log is created.
    """
    uid = body.uid
    ctx = await load_user_context_for_analysis(uid)
    analysis = await analyze_workout(uid, body.workout_log, ctx)

    # Fire-and-forget: extract workout memories (non-blocking)
    task = asyncio.create_task(
        extract_workout_memories(uid, body.workout_log, analysis.sentiment)
    )
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)

    logger.info(f"Workout analysis generated for {uid[:8]}: {analysis.sentiment}")
    return analysis


@router.post(
    "/internal/weekly-summary",
    response_model=WorkoutAnalysis,
    dependencies=[Depends(verify_internal_auth)],
)
async def weekly_summary_endpoint(body: WeeklySummaryRequest):
    """
    Generate a weekly training summary for the given user.
    Called by the scheduled Cloud Function every Sunday evening.
    """
    uid = body.uid
    ctx = await load_user_context_for_analysis(uid)
    analysis = await analyze_week(uid, ctx)
    logger.info(f"Weekly summary generated for {uid[:8]}: {analysis.sentiment}")
    return analysis
