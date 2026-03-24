"""
Chat streaming endpoint — POST /api/chat/stream
Accepts a message, streams back tokens via SSE, then sends structured data.
"""
import json
import time
import asyncio
from collections import defaultdict
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from middleware.auth import get_authenticated_uid
from models.schemas import ChatRequest
from core.coach import Coach

router = APIRouter()

# ── Per-user rate limiting (in-memory, resets per Cloud Run instance) ────────

_rate_limits: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 20  # requests per minute
RATE_WINDOW = 60  # seconds


def _check_rate_limit(uid: str) -> None:
    now = time.time()
    # Remove timestamps older than the window
    _rate_limits[uid] = [t for t in _rate_limits[uid] if now - t < RATE_WINDOW]
    if len(_rate_limits[uid]) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait a moment.")
    _rate_limits[uid].append(now)
    # Prune empty entries to prevent memory leak
    if not _rate_limits[uid]:
        del _rate_limits[uid]


# ── Coach singleton ─────────────────────────────────────────────────────────

_coach: Coach | None = None


def _get_coach() -> Coach:
    global _coach
    if _coach is None:
        _coach = Coach()
    return _coach


# ── SSE streaming endpoint ──────────────────────────────────────────────────


@router.post("/chat/stream")
async def chat_stream(
    body: ChatRequest,
    uid: str = Depends(get_authenticated_uid),
):
    """
    Stream AI coach response via Server-Sent Events.

    SSE event types:
      - token:      {"text": "partial text"}
      - structured: {"type": "workout_plan", "data": {...}}
      - done:       {"message_id": "..."}
      - error:      {"message": "..."}
    """
    _check_rate_limit(uid)

    coach = _get_coach()

    async def event_generator() -> AsyncGenerator[dict, None]:
        try:
            async for event in coach.stream_response(
                uid=uid,
                message=body.message,
                conversation_id=body.conversation_id,
            ):
                yield event
        except Exception:
            yield {
                "event": "error",
                "data": json.dumps({"message": "Coach is temporarily unavailable. Please try again."}),
            }

    return EventSourceResponse(event_generator())
