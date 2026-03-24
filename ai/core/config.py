"""
Shared configuration constants for the AI coach backend.
"""
import os

MODEL_ID = os.environ.get("AI_MODEL_ID", "gemini-2.5-flash-preview-05-20")
