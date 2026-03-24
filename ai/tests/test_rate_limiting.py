"""
Tests for the in-memory per-user rate limiter in routers/chat.py.
Tests _check_rate_limit directly without requiring FastAPI or Firebase.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import time
import pytest
from unittest.mock import patch, MagicMock

# Patch heavy dependencies before importing the chat module
import sys
sys.modules.setdefault("sse_starlette", MagicMock())
sys.modules.setdefault("sse_starlette.sse", MagicMock())
sys.modules.setdefault("middleware", MagicMock())
sys.modules.setdefault("middleware.auth", MagicMock())
sys.modules.setdefault("core", MagicMock())
sys.modules.setdefault("core.coach", MagicMock())

# Now import the private rate-limit state and function
# We import the module directly to get access to _rate_limits and _check_rate_limit
import importlib
import types

# Manually load only the rate limiting logic by importing the relevant names
# after stubbing out the heavy deps
from routers.chat import _check_rate_limit, _rate_limits, RATE_LIMIT, RATE_WINDOW
from fastapi import HTTPException


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
