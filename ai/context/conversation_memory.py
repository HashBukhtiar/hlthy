"""
Reads conversation history from Firestore and handles coach memory extraction.
"""
from typing import Optional, List, Dict
from google.cloud import firestore

_db: Optional[firestore.AsyncClient] = None


def _get_db() -> firestore.AsyncClient:
    global _db
    if _db is None:
        _db = firestore.AsyncClient()
    return _db


async def load_conversation_history(
    conversation_id: str,
    limit: int = 20,
) -> List[Dict[str, str]]:
    """
    Load the last N messages from a conversation.
    Returns list of {"role": "user"|"model", "text": "..."}.
    """
    db = _get_db()

    docs = await (
        db.collection("conversations").document(conversation_id)
        .collection("messages")
        .order_by("createdAt", direction=firestore.Query.DESCENDING)
        .limit(limit)
        .get()
    )

    messages = []
    for doc in reversed(docs):  # Reverse to get chronological order
        data = doc.to_dict() or {}
        text = data.get("text", "")
        if not text:
            continue

        is_ai = data.get("isAiResponse", False)
        role = "model" if is_ai else "user"
        messages.append({"role": role, "text": text})

    return messages


async def save_coach_memory(
    uid: str,
    memory_type: str,
    content: str,
    source: str = "ai_extracted",
) -> None:
    """Save a coach memory extracted from conversation."""
    db = _get_db()
    await (
        db.collection("users").document(uid)
        .collection("coach_memory")
        .add({
            "type": memory_type,
            "content": content,
            "source": source,
            "extracted_at": firestore.SERVER_TIMESTAMP,
        })
    )
