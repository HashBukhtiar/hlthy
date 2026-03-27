"""
Reads conversation history from Firestore and handles coach memory saving.
"""
from typing import List, Dict

from google.cloud import firestore
from fastapi import HTTPException

from context.firestore_client import get_db


async def load_conversation_history(
    uid: str,
    conversation_id: str,
    limit: int = 20,
) -> List[Dict[str, str]]:
    """
    Load the last N messages from a conversation.
    Verifies the authenticated user is a participant before reading.
    Returns list of {"role": "user"|"model", "text": "..."}.
    """
    db = get_db()

    # Verify authorization: user must be a participant or owner of AI conversation
    conv_doc = await db.collection("conversations").document(conversation_id).get()
    if conv_doc.exists:
        conv_data = conv_doc.to_dict() or {}
        participants = conv_data.get("participants", [])
        # Check participants array first, then exact AI conversation ID match
        is_participant = uid in participants
        is_ai_owner = conversation_id == f"{uid}_ai_conversation"
        if not is_participant and not is_ai_owner:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to access this conversation",
            )

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
    expires_at: "datetime | None" = None,
) -> None:
    """
    Save a coach memory extracted from conversation or workout data.
    Checks for duplicates before saving.
    Optionally sets an expiration date — expired memories are filtered at read time.
    """
    from datetime import datetime, timezone

    db = get_db()

    # Check for duplicate memories (same type + similar content, most recent first)
    existing = await (
        db.collection("users").document(uid)
        .collection("coach_memory")
        .where("type", "==", memory_type)
        .order_by("extracted_at", direction=firestore.Query.DESCENDING)
        .limit(20)
        .get()
    )

    content_lower = content.lower()
    for doc in existing:
        doc_data = doc.to_dict() or {}
        existing_content = doc_data.get("content", "").lower()
        # Skip if substantially similar content already exists
        if existing_content and (
            content_lower in existing_content
            or existing_content in content_lower
        ):
            # If the existing memory has expired, update it instead of skipping
            existing_expires = doc_data.get("expires_at")
            if existing_expires and hasattr(existing_expires, "timestamp"):
                if datetime.fromtimestamp(existing_expires.timestamp(), tz=timezone.utc) < datetime.now(timezone.utc):
                    await doc.reference.update({
                        "content": content,
                        "source": source,
                        "extracted_at": firestore.SERVER_TIMESTAMP,
                        "expires_at": expires_at,
                    })
                    return
            return  # Duplicate and not expired — don't save

    # Per-user memory cap: prevent unbounded growth
    MAX_MEMORIES = 150
    all_memories = await (
        db.collection("users").document(uid)
        .collection("coach_memory")
        .order_by("extracted_at", direction=firestore.Query.ASCENDING)
        .get()
    )
    if len(all_memories) >= MAX_MEMORIES:
        # Evict oldest memories to make room
        to_delete = len(all_memories) - MAX_MEMORIES + 1
        for mem_doc in all_memories[:to_delete]:
            await mem_doc.reference.delete()

    memory_data: dict = {
        "type": memory_type,
        "content": content,
        "source": source,
        "extracted_at": firestore.SERVER_TIMESTAMP,
    }
    if expires_at is not None:
        memory_data["expires_at"] = expires_at

    await (
        db.collection("users").document(uid)
        .collection("coach_memory")
        .add(memory_data)
    )
