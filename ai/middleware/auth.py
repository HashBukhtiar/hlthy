"""
Firebase ID token verification middleware.
Extracts the authenticated user's UID from the Authorization header.
"""
import os
from typing import Optional

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from fastapi import Request, HTTPException

# Initialize Firebase Admin SDK (once)
if not firebase_admin._apps:
    service_account_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if service_account_path and os.path.exists(service_account_path):
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
    else:
        # On Cloud Run, uses default service account
        firebase_admin.initialize_app()


async def get_authenticated_uid(request: Request) -> str:
    """
    Extract and verify Firebase ID token from Authorization header.
    Returns the authenticated user's UID.
    Raises HTTPException 401 if token is missing or invalid.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = auth_header.split("Bearer ", 1)[1]

    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded["uid"]
    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid ID token")
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Expired ID token")
    except Exception:
        raise HTTPException(status_code=401, detail="Token verification failed")


def get_optional_uid(request: Request) -> Optional[str]:
    """
    Try to extract UID from Authorization header, return None if not present.
    Useful for endpoints that work with or without auth (e.g., health check).
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split("Bearer ", 1)[1]
    try:
        decoded = firebase_auth.verify_id_token(token)
        return decoded["uid"]
    except Exception:
        return None
