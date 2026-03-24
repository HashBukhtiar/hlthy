"""
Parses Gemini's response to extract structured data (workout plans, advice, etc.).
Uses Gemini's function calling for structured output rather than regex-parsing markdown.
"""
import json
import re
from typing import Dict, Any, Optional, Tuple


def parse_streamed_text(full_text: str) -> Tuple[str, Optional[Dict[str, Any]]]:
    """
    Parse the completed streamed text to extract any structured data blocks.

    Returns:
        (clean_text, structured_data) where structured_data is None if no
        structured block was found.
    """
    # Look for ```workout-json ... ``` blocks
    structured = None
    clean_text = full_text

    patterns = [
        (r"```workout-json\s*\n(.*?)```", "workout_plan"),
        (r"```schedule-json\s*\n(.*?)```", "schedule_plan"),
        (r"```technique-json\s*\n(.*?)```", "technique_advice"),
        (r"```json\s*\n(.*?)```", None),  # Generic JSON — type from content
    ]

    for pattern, forced_type in patterns:
        match = re.search(pattern, full_text, re.DOTALL)
        if match:
            json_str = match.group(1).strip()
            try:
                data = json.loads(json_str)
                response_type = forced_type or data.get("type", "unknown")
                structured = {"type": response_type, "data": data}
                # Remove the JSON block from the display text
                clean_text = full_text[:match.start()] + full_text[match.end():]
                clean_text = clean_text.strip()
                break
            except json.JSONDecodeError:
                continue

    return clean_text, structured


def extract_function_call_data(response_parts: list) -> Optional[Dict[str, Any]]:
    """
    Extract structured data from Gemini function call responses.
    Used when Gemini calls generate_workout, generate_schedule, etc.
    """
    for part in response_parts:
        if hasattr(part, "function_call"):
            fc = part.function_call
            fn_name = fc.name
            args = dict(fc.args) if fc.args else {}

            type_map = {
                "generate_workout": "workout_plan",
                "generate_technique_advice": "technique_advice",
                "generate_schedule": "schedule_plan",
                "generate_explanation": "explanation",
            }

            return {
                "type": type_map.get(fn_name, fn_name),
                "data": args,
            }

    return None


def extract_memory_updates(response_text: str) -> list[Dict[str, str]]:
    """
    Check if the AI's response suggests we should save any coach memories.
    Called after each response to update the user's profile.

    This is a lightweight heuristic — the real extraction happens via a
    separate Gemini call in coach.py.
    """
    memories = []

    # Patterns that suggest the user shared profile info
    injury_patterns = [
        r"(?:bad|injured|hurt|sore|torn|pain in|problem with)\s+(knee|shoulder|back|wrist|ankle|hip|elbow|neck)",
    ]
    for pattern in injury_patterns:
        match = re.search(pattern, response_text, re.IGNORECASE)
        if match:
            memories.append({
                "type": "injury",
                "content": f"User mentioned {match.group(0)}",
            })

    return memories
