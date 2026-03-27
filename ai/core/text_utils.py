"""
Shared text utilities for AI core modules.
"""
import json
import re
from typing import Any


def sanitize(text: str, max_len: int = 100) -> str:
    """Strip newlines and limit length to prevent prompt injection."""
    return re.sub(r"[\n\r]+", " ", text)[:max_len]


def parse_gemini_json(text: str) -> dict[str, Any]:
    """Parse JSON from Gemini output, stripping markdown code fences if present."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
    if text.endswith("```"):
        text = text.rsplit("```", 1)[0]
    return json.loads(text.strip())
