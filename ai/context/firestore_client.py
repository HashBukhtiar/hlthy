"""
Shared Firestore AsyncClient singleton.
All context modules import from here to avoid multiple gRPC channels.
"""
from typing import Optional
from google.cloud import firestore

_db: Optional[firestore.AsyncClient] = None


def get_db() -> firestore.AsyncClient:
    global _db
    if _db is None:
        _db = firestore.AsyncClient()
    return _db
