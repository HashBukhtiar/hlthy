"""
Health check endpoint.
"""
from fastapi import APIRouter
from models.schemas import HealthResponse

from core.config import MODEL_ID

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Detailed health check for Cloud Run and monitoring."""
    vertex_ok = True
    firestore_ok = True

    # Check Vertex AI model availability
    try:
        from vertexai.generative_models import GenerativeModel
        GenerativeModel(MODEL_ID)
    except Exception:
        vertex_ok = False

    # Check Firestore connectivity
    try:
        from context.firestore_client import get_db
        db = get_db()
        # Lightweight read to verify connectivity
        await db.collection("_health").document("check").get()
    except Exception:
        firestore_ok = False

    return HealthResponse(
        status="healthy" if (vertex_ok and firestore_ok) else "degraded",
        version="3.0",
        model=MODEL_ID,
        systems={
            "vertex_ai": vertex_ok,
            "firestore": firestore_ok,
        },
    )
