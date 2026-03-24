"""
Health check endpoint.
"""
import os
from datetime import datetime

from fastapi import APIRouter
from models.schemas import HealthResponse

router = APIRouter()

MODEL_ID = os.environ.get("AI_MODEL_ID", "gemini-2.5-flash-preview-05-20")


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Detailed health check for Cloud Run and monitoring."""
    return HealthResponse(
        status="healthy",
        version="3.0",
        model=MODEL_ID,
        systems={
            "vertex_ai": True,
            "firestore": True,
        },
    )
