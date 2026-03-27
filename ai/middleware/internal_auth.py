"""
Internal service-to-service authentication middleware.
Verifies requests from Cloud Functions via a shared secret.
"""
import os
import hmac
import logging

from fastapi import Request, HTTPException

logger = logging.getLogger(__name__)

INTERNAL_SECRET = os.environ.get("INTERNAL_API_SECRET", "")


async def verify_internal_auth(request: Request) -> None:
    """
    Verify that the request comes from an authorized internal service.
    Checks the X-Internal-Secret header against the configured secret.
    Raises HTTPException 403 if the secret is missing or doesn't match.
    """
    if not INTERNAL_SECRET:
        logger.error("INTERNAL_API_SECRET is not configured")
        raise HTTPException(status_code=503, detail="Internal auth not configured")

    secret = request.headers.get("X-Internal-Secret", "")
    if not secret or not hmac.compare_digest(secret, INTERNAL_SECRET):
        raise HTTPException(status_code=403, detail="Unauthorized")
