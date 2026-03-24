"""
pytest configuration for the AI coach test suite.
Adds the ai/ directory to sys.path so modules like `core`, `models`,
`context`, etc. are importable without the `ai.` prefix.
"""
import sys
import os

# Insert the ai/ directory at the front of sys.path
ai_dir = os.path.dirname(os.path.abspath(__file__))
if ai_dir not in sys.path:
    sys.path.insert(0, ai_dir)
