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

    # Verify authorization: user must be a participant in the conversation
    conv_doc = await db.collection("conversations").document(conversation_id).get()
    if conv_doc.exists:
        conv_data = conv_doc.to_dict() or {}
        participants = conv_data.get("participants", [])
        # For AI conversations, the conversation ID contains the user's UID
        # For human DMs, check the participants array
        if participants and uid not in participants:
            if uid not in conversation_id:
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
) -> None:
    """
    Save a coach memory extracted from conversation.
    Checks for duplicates before saving.
    """
    db = get_db()

    # Check for duplicate memories (same type + similar content)
    existing = await (
        db.collection("users").document(uid)
        .collection("coach_memory")
        .where("type", "==", memory_type)
        .limit(50)
        .get()
    )

    content_lower = content.lower()
    for doc in existing:
        existing_content = (doc.to_dict() or {}).get("content", "").lower()
        # Skip if substantially similar content already exists
        if existing_content and (
            content_lower in existing_content
            or existing_content in content_lower
        ):
            return  # Duplicate — don't save

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
