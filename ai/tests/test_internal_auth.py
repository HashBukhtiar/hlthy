"""
Tests for middleware/internal_auth.py — verify_internal_auth.

Tests the three cases:
  1. INTERNAL_API_SECRET is not configured (empty string) → 503
  2. Secret provided but doesn't match → 403
  3. Secret matches → passes without raising
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from unittest.mock import patch
from fastapi import HTTPException
from starlette.requests import Request


def _make_request(secret_header: str | None = None) -> Request:
    """Build a minimal Starlette Request with an optional X-Internal-Secret header."""
    scope: dict = {
        "type": "http",
        "method": "POST",
        "path": "/api/internal/analyze-workout",
        "headers": [],
        "query_string": b"",
    }
    if secret_header is not None:
        scope["headers"] = [(b"x-internal-secret", secret_header.encode())]
    return Request(scope)


class TestVerifyInternalAuth:
    @pytest.mark.anyio
    async def test_no_configured_secret_raises_503(self):
        """When INTERNAL_API_SECRET is empty, the endpoint is not operational."""
        import middleware.internal_auth as auth_module

        with patch.object(auth_module, "INTERNAL_SECRET", ""):
            request = _make_request("any-secret")
            with pytest.raises(HTTPException) as exc_info:
                await auth_module.verify_internal_auth(request)
            assert exc_info.value.status_code == 503
            assert "not configured" in exc_info.value.detail.lower()

    @pytest.mark.anyio
    async def test_wrong_secret_raises_403(self):
        """A request with the wrong secret is rejected with 403."""
        import middleware.internal_auth as auth_module

        with patch.object(auth_module, "INTERNAL_SECRET", "correct-secret"):
            request = _make_request("wrong-secret")
            with pytest.raises(HTTPException) as exc_info:
                await auth_module.verify_internal_auth(request)
            assert exc_info.value.status_code == 403
            assert exc_info.value.detail == "Unauthorized"

    @pytest.mark.anyio
    async def test_correct_secret_does_not_raise(self):
        """A request with the correct secret passes without raising."""
        import middleware.internal_auth as auth_module

        with patch.object(auth_module, "INTERNAL_SECRET", "my-secret-value"):
            request = _make_request("my-secret-value")
            # Should complete without raising
            result = await auth_module.verify_internal_auth(request)
            assert result is None

    @pytest.mark.anyio
    async def test_missing_header_raises_403(self):
        """A request with no X-Internal-Secret header is rejected with 403."""
        import middleware.internal_auth as auth_module

        with patch.object(auth_module, "INTERNAL_SECRET", "some-secret"):
            request = _make_request(None)
            with pytest.raises(HTTPException) as exc_info:
                await auth_module.verify_internal_auth(request)
            assert exc_info.value.status_code == 403

    @pytest.mark.anyio
    async def test_empty_header_value_raises_403(self):
        """An empty string in the header is treated as missing and rejected."""
        import middleware.internal_auth as auth_module

        with patch.object(auth_module, "INTERNAL_SECRET", "some-secret"):
            request = _make_request("")
            with pytest.raises(HTTPException) as exc_info:
                await auth_module.verify_internal_auth(request)
            assert exc_info.value.status_code == 403

    @pytest.mark.anyio
    async def test_comparison_is_constant_time(self):
        """hmac.compare_digest is used — verify we don't accidentally bypass it
        by calling with a substring of the real secret."""
        import middleware.internal_auth as auth_module

        full_secret = "super-secret-key-that-is-long"
        partial_secret = "super-secret-key"

        with patch.object(auth_module, "INTERNAL_SECRET", full_secret):
            request = _make_request(partial_secret)
            with pytest.raises(HTTPException) as exc_info:
                await auth_module.verify_internal_auth(request)
            assert exc_info.value.status_code == 403

    @pytest.mark.anyio
    async def test_secret_with_special_characters(self):
        """Secrets containing special characters are handled correctly."""
        import middleware.internal_auth as auth_module

        secret = "s3cr3t!@#$%^&*()_+-=[]{}|;':\",./<>?"
        with patch.object(auth_module, "INTERNAL_SECRET", secret):
            request = _make_request(secret)
            result = await auth_module.verify_internal_auth(request)
            assert result is None
