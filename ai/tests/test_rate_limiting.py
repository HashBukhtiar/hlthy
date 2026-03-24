"""
Tests for the in-memory per-user rate limiter in routers/chat.py.
Tests _check_rate_limit directly without requiring FastAPI or Firebase.

The rate-limiting logic lives in routers/chat.py alongside the SSE endpoint.
To import it without triggering firebase_admin initialization or vertexai,
we stub the heavy dependencies at the sys.modules level before import.
These stubs are scoped to this module only — we use unique module keys so
they don't pollute the auth middleware module's import path.
"""
import sys
import os

# Add ai/ to path before any other imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import time
import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException

# ------------------------------------------------------------------
# Stub heavy deps BEFORE importing routers.chat.
# We only stub what chat.py actually imports at module level so that
# other test files importing middleware.auth still get the real module.
# ------------------------------------------------------------------

# sse_starlette is not installed — stub it
if "sse_starlette" not in sys.modules:
    sys.modules["sse_starlette"] = MagicMock()
if "sse_starlette.sse" not in sys.modules:
    sys.modules["sse_starlette.sse"] = MagicMock()

# middleware.auth — stub ONLY the symbol chat.py needs at import time.
# We cannot use setdefault for middleware itself because that would break
# test_auth_middleware.py which imports the real middleware.auth.
# Instead we import the real middleware.auth, patch nothing, and let
# chat.py import it normally. The only problem is firebase_admin init
# which runs at import time. We prevent that by ensuring firebase_admin
# is already stubbed before middleware.auth is imported.
if "firebase_admin" not in sys.modules:
    _firebase_admin_mock = MagicMock()
    _firebase_admin_mock._apps = {}  # empty dict so the "if not firebase_admin._apps" guard passes
    sys.modules["firebase_admin"] = _firebase_admin_mock
    sys.modules["firebase_admin.auth"] = MagicMock()
    sys.modules["firebase_admin.credentials"] = MagicMock()

# vertexai — stub so coach.py import doesn't fail
if "vertexai" not in sys.modules:
    sys.modules["vertexai"] = MagicMock()
if "vertexai.generative_models" not in sys.modules:
    sys.modules["vertexai.generative_models"] = MagicMock()

# google.cloud.firestore — stub so context imports don't fail
if "google" not in sys.modules:
    sys.modules["google"] = MagicMock()
if "google.cloud" not in sys.modules:
    sys.modules["google.cloud"] = MagicMock()
if "google.cloud.firestore" not in sys.modules:
    sys.modules["google.cloud.firestore"] = MagicMock()

# Now import the rate-limiting state and function from chat
from routers.chat import _check_rate_limit, _rate_limits, RATE_LIMIT, RATE_WINDOW


def _clear_limits():
    """Helper: reset rate limit state between tests."""
    _rate_limits.clear()


class TestCheckRateLimit:
    def setup_method(self):
        _clear_limits()

    def test_first_request_allowed(self):
        # Should not raise
        _check_rate_limit("user-1")

    def test_requests_up_to_limit_allowed(self):
        uid = "user-limit"
        for _ in range(RATE_LIMIT):
            _check_rate_limit(uid)
        # All RATE_LIMIT requests should be recorded
        assert len(_rate_limits[uid]) == RATE_LIMIT

    def test_request_exceeding_limit_raises_429(self):
        uid = "user-over"
        # Fill up to the limit
        for _ in range(RATE_LIMIT):
            _check_rate_limit(uid)
        # One more should raise
        with pytest.raises(HTTPException) as exc_info:
            _check_rate_limit(uid)
        assert exc_info.value.status_code == 429
        assert "Rate limit" in exc_info.value.detail

    def test_different_users_have_independent_limits(self):
        # Fill user-a to the limit
        for _ in range(RATE_LIMIT):
            _check_rate_limit("user-a")
        # user-b should still work fine
        _check_rate_limit("user-b")  # Should not raise

    def test_old_timestamps_are_pruned(self):
        uid = "user-prune"
        now = time.time()
        # Manually inject timestamps older than RATE_WINDOW
        old_time = now - RATE_WINDOW - 1  # 1 second beyond the window
        _rate_limits[uid] = [old_time] * RATE_LIMIT
        # All old timestamps should be pruned, so this request is allowed
        _check_rate_limit(uid)  # Should not raise

    def test_timestamp_recorded_after_allowed_request(self):
        uid = "user-record"
        before = time.time()
        _check_rate_limit(uid)
        after = time.time()
        assert len(_rate_limits[uid]) == 1
        assert before <= _rate_limits[uid][0] <= after

    def test_mixed_old_and_fresh_timestamps(self):
        uid = "user-mixed"
        now = time.time()
        old_time = now - RATE_WINDOW - 1
        # Fill with old timestamps plus RATE_LIMIT - 1 fresh ones
        _rate_limits[uid] = [old_time] * 5 + [now] * (RATE_LIMIT - 1)
        # Should allow one more (old ones get pruned, leaving RATE_LIMIT - 1 fresh)
        _check_rate_limit(uid)  # Should not raise
        assert len(_rate_limits[uid]) == RATE_LIMIT

    def test_rate_limit_constants(self):
        assert RATE_LIMIT == 20
        assert RATE_WINDOW == 60
