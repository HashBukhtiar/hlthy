"""
Internal API endpoints — called by Cloud Functions, not by clients.
POST /api/internal/analyze-workout — generate post-workout insight.
"""
import logging

from fastapi import APIRouter, Depends

from middleware.internal_auth import verify_internal_auth
from models.schemas import AnalyzeWorkoutRequest, WorkoutAnalysis, UserContext, AIProfile
from context.user_context import load_user_context_for_analysis
from core.workout_analyzer import analyze_workout

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/internal/analyze-workout",
    response_model=WorkoutAnalysis,
    dependencies=[Depends(verify_internal_auth)],
)
async def analyze_workout_endpoint(body: AnalyzeWorkoutRequest):
    """
    Generate a post-workout analysis for the given user and workout log.
    Called by Cloud Functions after a workout log is created.
    """
    uid = body.uid

    # Load user context (profile, exercise history, memories — skip conversation)
    ctx = await load_user_context_for_analysis(uid)

    # Generate analysis
    analysis = await analyze_workout(uid, body.workout_log, ctx)

    logger.info(f"Workout analysis generated for {uid[:8]}: {analysis.sentiment}")
    return analysis
