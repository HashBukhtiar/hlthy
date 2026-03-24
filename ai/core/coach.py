"""
Coach — the AI orchestrator that connects context → prompt → Gemini → streaming response.
"""
import asyncio
import json
import logging
from typing import AsyncGenerator, Dict, Any, List

from vertexai.generative_models import GenerativeModel, GenerationConfig

from core.prompt_builder import build_system_prompt
from core.response_parser import parse_streamed_text
from context.user_context import load_user_context
from context.conversation_memory import save_coach_memory
from core.config import MODEL_ID

logger = logging.getLogger(__name__)


class Coach:
    """
    AI fitness coach powered by Gemini.
    Loads user context from Firestore, builds a personalized prompt,
    and streams the response via SSE events.
    """

    def __init__(self):
        # Model is created per-request with dynamic system_instruction
        self._base_model_id = MODEL_ID

    async def stream_response(
        self,
        uid: str,
        message: str,
        conversation_id: str,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream a coach response for the given user message.

        Yields SSE-formatted dicts:
          {"event": "token", "data": '{"text": "..."}'}
          {"event": "structured", "data": '{"type": "...", "data": {...}}'}
          {"event": "done", "data": '{}'}
        """
        # 1. Load full user context from Firestore
        ctx = await load_user_context(uid, conversation_id)

        # 2. Build system prompt and create model with system_instruction
        system_prompt = build_system_prompt(ctx)
        model = GenerativeModel(
            self._base_model_id,
            system_instruction=system_prompt,
        )

        # 3. Build multi-turn conversation content
        contents = _build_conversation_contents(ctx.conversation_history, message)

        # 4. Stream from Gemini
        full_text = ""

        try:
            response = await model.generate_content_async(
                contents,
                generation_config=GenerationConfig(
                    temperature=0.8,
                    top_p=0.95,
                    max_output_tokens=4096,
                ),
                stream=True,
            )

            async for chunk in response:
                if chunk.text:
                    full_text += chunk.text
                    yield {
                        "event": "token",
                        "data": json.dumps({"text": chunk.text}),
                    }

        except Exception as e:
            logger.error(f"Gemini streaming failed for user {uid[:8]}: {e}")
            yield {
                "event": "error",
                "data": json.dumps({"message": "Coach is temporarily unavailable. Please try again."}),
            }
            return

        # 5. Parse completed text for structured data
        clean_text, structured = parse_streamed_text(full_text)

        if structured:
            yield {
                "event": "structured",
                "data": json.dumps(structured),
            }

        # 6. Done — yield immediately, extract memories in background
        yield {
            "event": "done",
            "data": json.dumps({}),
        }

        # 7. Fire-and-forget memory extraction (non-blocking)
        asyncio.create_task(
            self._extract_and_save_memories(uid, message, full_text)
        )

    async def _extract_and_save_memories(
        self,
        uid: str,
        user_message: str,
        ai_response: str,
    ) -> None:
        """
        Use a lightweight Gemini call to extract profile info from the conversation.
        Saves any extracted memories to Firestore (with dedup).
        """
        extraction_prompt = f"""Analyze this conversation exchange and extract any fitness profile information the user shared.

User said: "{user_message}"
Coach responded: "{ai_response[:500]}"

If the user mentioned any of the following, return them as JSON:
- injuries or physical limitations
- fitness goals
- experience level (beginner/intermediate/advanced)
- available equipment
- exercises they dislike
- training frequency

Return ONLY a JSON array of objects with "type" and "content" fields.
If nothing was shared, return an empty array [].

Examples:
[{{"type": "injury", "content": "Bad left knee from basketball"}}]
[{{"type": "preference", "content": "Prefers training 4 days per week"}}]
[]"""

        try:
            model = GenerativeModel(self._base_model_id)
            result = await model.generate_content_async(
                extraction_prompt,
                generation_config=GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=512,
                ),
            )

            text = result.text.strip()
            # Clean markdown fences
            if text.startswith("```"):
                text = text.split("\n", 1)[-1]
            if text.endswith("```"):
                text = text.rsplit("```", 1)[0]
            text = text.strip()

            memories = json.loads(text)
            if isinstance(memories, list):
                for mem in memories:
                    if isinstance(mem, dict) and mem.get("content"):
                        await save_coach_memory(
                            uid=uid,
                            memory_type=mem.get("type", "observation"),
                            content=mem["content"],
                        )
        except Exception as e:
            logger.debug(f"Memory extraction failed for {uid[:8]}: {e}")


def _build_conversation_contents(
    history: List[Dict[str, str]],
    current_message: str,
) -> list:
    """
    Build multi-turn conversation content for Gemini.
    Passes history as proper alternating user/model entries.
    """
    contents = []

    for msg in history:
        role = msg.get("role", "user")
        text = msg.get("text", "")
        if not text:
            continue
        contents.append({
            "role": role,
            "parts": [{"text": text}],
        })

    # Add the current user message
    contents.append({
        "role": "user",
        "parts": [{"text": current_message}],
    })

    return contents
